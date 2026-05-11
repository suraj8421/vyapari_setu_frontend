import requests
import cv2

# Step 4: Verify image loading
img = cv2.imread("invoice.png")
print("Image loaded:", img is not None)
if img is not None:
    print("Image shape:", img.shape)

url = "http://127.0.0.1:5001/ocr"

# Step 2: Update test_api.py to use invoice.png
files = {"file": open("invoice.png", "rb")}

response = requests.post(url, files=files)

print("API Response:")
print(response.json())
