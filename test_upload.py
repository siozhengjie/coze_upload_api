import requests

# ⛔️ Just for manual testing; in Coze plugin, filename will come from user input
filename = input("Enter the filename (exactly as in C:\\cozedocuments): ").strip()

url = "https://yourcozeapi.xyz/upload"

data = {
    "filename": filename
}

try:
    response = requests.post(url, json=data)
    response.raise_for_status()
    print("✅ Response:", response.status_code)
    print("📄 Result:", response.json())
except requests.exceptions.RequestException as e:
    print("❌ Upload failed:", e)
