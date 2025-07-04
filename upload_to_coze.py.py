import os
import asyncio
from playwright.async_api import async_playwright
# & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\cozedocuments"

async def upload_to_coze_via_cdp():
    base_folder = r"C:\cozedocuments"
    filename = input("Enter the PDF or PPTX file name (e.g. file.pdf): ")
    file_path = os.path.join(base_folder, filename)

    if not os.path.isfile(file_path):
        print("❌ File not found.")
        return

    async with async_playwright() as p:
        print("🔗 Connecting to your existing Chrome via CDP...")
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        context = browser.contexts[0]
        page = await context.new_page()

        print("🌐 Navigating to Coze AI...")
        await page.goto("https://www.coze.com/space/7509312123684798472/bot/7507066681052332050", wait_until="domcontentloaded")

        print("🔐 Waiting for + button beside 'Text'...")
        await page.wait_for_selector('button[data-testid="bot.editor.tool.data-set-text.add-button"]', timeout=60000)
        await page.click('button[data-testid="bot.editor.tool.data-set-text.add-button"]')

        print("➕ Clicking 'Create Knowledge'...")
        await page.wait_for_selector("text=Create Knowledge")
        await page.click("text=Create Knowledge")

        print("✏️ Waiting for knowledge name input field...")
        await page.wait_for_selector("input[placeholder='Enter the knowledge name']", timeout=20000)

        print("✍️ Typing knowledge title...")
        await page.fill("input[placeholder='Enter the knowledge name']", filename)

        print("📁 Uploading file...")
        await page.set_input_files("input[type='file']", file_path)

        print("✅ Waiting for 'Create and Import' button and clicking it...")
        await page.wait_for_selector("text=Create and Import", timeout=60000)
        await page.click("text=Create and Import")

        print("⏳ Waiting indefinitely for 'Next' button to become enabled...")
        while True:
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

        print("📜 Scrolling and clicking 'Next' again...")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)
        await page.click("text=Next")

        print("🧩 Waiting for segmented preview content to appear...")
        while True:
            try:
                preview_header = await page.query_selector('div.coz-fg-plus:text("Segmented preview")')
                if preview_header:
                    sibling_texts = await page.query_selector_all("div[class*='coz-'] >> text=*")
                    has_preview_content = False
                    for t in sibling_texts:
                        content = await t.inner_text()
                        if content.strip() and content.strip() != "Segmented preview":
                            has_preview_content = True
                            break
                    if has_preview_content:
                        break
            except:
                pass
            await page.wait_for_timeout(1000)

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)
        await page.click("text=Next")

        print("⚙️ Waiting for 'Processed completed' message for uploaded file...")
        data_testid = f"knowledge.create.unit.progress.success.icon.{filename}"
        while True:
            try:
                processed_div = await page.query_selector(f'div.LJ6KgtIQh0ycFSuK[data-testid="{data_testid}"]')
                if processed_div:
                    text = await processed_div.inner_text()
                    if text.strip().lower() == "processed completed":
                        break
            except:
                pass
            await page.wait_for_timeout(1000)

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)

        print("🔘 Clicking 'Confirm' button via data-testid...")
        await page.click('button[data-testid="knowledge.create.unit.confirm.btn"]')

        print(f"\n✅ Successfully imported and confirmed: {filename}")
        print("🕒 Leave this browser open. Close manually when done.")
        await page.wait_for_timeout(3600 * 1000)

if __name__ == "__main__":
    asyncio.run(upload_to_coze_via_cdp())
