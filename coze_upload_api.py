import os
import asyncio
import threading
from flask import Flask, request, jsonify
from playwright.async_api import async_playwright

app = Flask(__name__)

@app.route("/upload", methods=["POST"])
def trigger_upload():
    data = request.get_json()
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "Missing 'filename' in request body"}), 400

    def run_background():
        asyncio.run(upload_to_coze(filename))

    threading.Thread(target=run_background).start()
    return jsonify({"status": f"✅ Upload started for {filename}. Check Chrome window!"})


async def upload_to_coze(filename):
    base_folder = r"C:\cozedocuments"
    file_path = os.path.join(base_folder, filename)

    if not os.path.isfile(file_path):
        print(f"❌ File not found: {file_path}")
        return

    async with async_playwright() as p:
        try:
            print("🚀 Launching Chrome...")
            context = await p.chromium.launch_persistent_context(
                user_data_dir=base_folder,
                headless=False,
                executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                viewport=None,
                args=["--start-maximized", "--window-size=1920,1080"]
            )
            page = context.pages[0] if context.pages else await context.new_page()

            print("🌐 Navigating to Coze...")
            await page.goto("https://www.coze.com/space/7509312123684798472/bot/7507066681052332050", wait_until="domcontentloaded")

            print("🔐 Clicking '+ Text' button...")
            await page.wait_for_selector('button[data-testid="bot.editor.tool.data-set-text.add-button"]')
            await page.click('button[data-testid="bot.editor.tool.data-set-text.add-button"]')

            print("➕ Clicking 'Create Knowledge'...")
            await page.click("text=Create Knowledge")
            await page.wait_for_timeout(1500)

            print("✏️ Typing title...")
            await page.wait_for_selector("input[placeholder='Enter the knowledge name']")
            await page.fill("input[placeholder='Enter the knowledge name']", filename)

            print("✅ Clicking 'Create and Import'...")
            await page.wait_for_selector("text=Create and Import")
            await page.click("text=Create and Import")

            print("⏳ Waiting for 'Next' button to be enabled...")
            for _ in range(60):
                try:
                    next_button = await page.query_selector("text=Next")
                    if next_button:
                        is_disabled = await next_button.get_attribute("disabled")
                        if is_disabled is None:
                            await next_button.click()
                            print("▶️ Clicked 'Next'")
                            break
                except:
                    pass
                await page.wait_for_timeout(1000)

            print("📜 Scrolling and clicking 'Next' again...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.click("text=Next")

            print("🧩 Waiting for segmented preview content...")
            for _ in range(60):
                try:
                    preview_texts = await page.query_selector_all("div[class*='coz-'] >> text=*")
                    has_preview = any(
                        (await t.inner_text()).strip() != "Segmented preview"
                        for t in preview_texts
                    )
                    if has_preview:
                        print("🧠 Segmented preview detected.")
                        break
                except:
                    pass
                await page.wait_for_timeout(1000)

            print("📜 Scrolling and clicking 'Next' again...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.click("text=Next")

            print("⚙️ Waiting for 'Processed completed'...")
            for _ in range(60):
                try:
                    processed_divs = await page.query_selector_all('div[data-testid^="knowledge.create.unit.progress.success.icon"]')
                    for div in processed_divs:
                        text = await div.inner_text()
                        if "processed completed" in text.strip().lower():
                            print("✅ Processed completed.")
                            break
                    else:
                        await page.wait_for_timeout(1000)
                        continue
                    break
                except:
                    await page.wait_for_timeout(1000)

            print("🔘 Clicking 'Confirm'...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.click('button[data-testid="knowledge.create.unit.confirm.btn"]')

            print(f"🎉 Finished uploading {filename}")
            await context.close()

        except Exception as e:
            print(f"❌ Error during automation: {str(e)}")


if __name__ == "__main__":
    app.run(port=5001)
