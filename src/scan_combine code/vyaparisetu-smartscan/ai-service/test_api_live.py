"""End-to-end API test"""
import requests
import json

r = requests.post(
    "http://localhost:8000/ocr",
    files={"file": ("invoice.png", open("invoice.png", "rb"), "image/png")}
)

print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))
