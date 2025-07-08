import os
import asyncio
from flask import Flask, request, jsonify
from pathlib import Path
from playwright.async_api import async_playwright

app = Flask(__name__)

@app.route("/upload", methods=["POST"])
def trigger_upload():
    data = request.get_json()
    filename = data.get("filename")
    if not filename:
        return jsonify({"status": "❌ Missing 'filename' in request body"}), 400

    result = asyncio.run(upload_to_coze_via_cdp(filename))
    return jsonify({"status": result})


async def upload_to_coze_via_cdp(filename):
    base_folder = r"C:\cozedocuments"
    safe_filename = Path(filename).name
    file_path = os.path.join(base_folder, safe_filename)

    print("🧪 Looking for file:", file_path)
    print("📂 Folder contains:", os.listdir(base_folder))

    if not os.path.isfile(file_path):
        return f"❌ File not found: {file_path}"

    async with async_playwright() as p:
        try:
            print("🔗 Connecting to Chrome via CDP...")
            browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            page = await context.new_page()

            print("🌐 Navigating to Coze AI...")
            await page.goto("https://www.coze.com/space/7509312123684798472/bot/7507066681052332050", wait_until="domcontentloaded")

            print("🔐 Waiting for '+ Text' button...")
            await page.wait_for_selector('button[data-testid="bot.editor.tool.data-set-text.add-button"]')
            await page.click('button[data-testid="bot.editor.tool.data-set-text.add-button"]')

            print("➕ Clicking 'Create Knowledge'...")
            await page.click("text=Create Knowledge")

            print("✏️ Typing knowledge title...")
            await page.wait_for_selector("input[placeholder='Enter the knowledge name']")
            await page.fill("input[placeholder='Enter the knowledge name']", safe_filename)

            print("📁 Uploading file...")
            await page.set_input_files("input[type='file']", file_path)

            print("✅ Clicking 'Create and Import'...")
            await page.wait_for_selector("text=Create and Import")
            await page.click("text=Create and Import")

            print("⏳ Waiting for first 'Next' to be enabled...")
            for _ in range(60):
                try:
                    next_button = await page.query_selector("text=Next")
                    if next_button:
                        is_disabled = await next_button.get_attribute("disabled")
                        if is_disabled is None:
                            await next_button.click()
                            break
                except:
                    pass
                await page.wait_for_timeout(1000)

            print("📜 Waiting for second 'Next' after preview...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)

            for _ in range(50):
                try:
                    next_button = await page.query_selector("text=Next")
                    if next_button:
                        is_disabled = await next_button.get_attribute("disabled")
                        if is_disabled is None:
                            await next_button.click()
                            break
                except:
                    pass
                await page.wait_for_timeout(1000)

            print("🧩 Waiting for segmented preview content...")
            for _ in range(60):
                try:
                    preview_texts = await page.query_selector_all("div[class*='coz-'] >> text=*")
                    has_preview = any((await t.inner_text()).strip() != "Segmented preview" for t in preview_texts)
                    if has_preview:
                        break
                except:
                    pass
                await page.wait_for_timeout(1000)

            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.click("text=Next")

            print("⚙️ Waiting for 'Processed completed' message..." )
            for _ in range(60):
                try:
                    processed_divs = await page.query_selector_all('div[data-testid^="knowledge.create.unit.progress.success.icon"]')
                    for div in processed_divs:
                        text = await div.inner_text()
                        if "processed completed" in text.strip().lower():
                            break
                    else:
                        await page.wait_for_timeout(1000)
                        continue
                    break
                except:
                    await page.wait_for_timeout(1000)

            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)

            print("🔘 Clicking 'Confirm'...")
            await page.click('button[data-testid="knowledge.create.unit.confirm.btn"]')
            await page.click("text=Confirm")

            print("🔍 Verifying the file is listed in Knowledge tab...")
            for _ in range(30):  # wait up to 30 seconds
                await page.wait_for_timeout(1000)
                try:
                    titles = await page.query_selector_all("div[data-testid='bot.knowledge.unit.title']")
                    for title in titles:
                        text = await title.inner_text()
                        if safe_filename.lower() in text.lower():
                            return f"✅ Successfully imported and confirmed: {safe_filename}"
                except:
                    pass

            return f"❌ Upload finished but file not found in Knowledge list: {safe_filename}"

        except Exception as e:
            return f"❌ Error during automation: {str(e)}"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
