"""Debug script: check what ocr.py actually returns for invoice.png"""
import cv2
import json
from ocr import run_ocr
from preprocess import preprocess

img = cv2.imread("invoice.png")
processed = preprocess(img)
ocr_raw = run_ocr(processed)

print(f"Total OCR entries: {len(ocr_raw)}")
print(f"Type of first entry: {type(ocr_raw[0])}")

if isinstance(ocr_raw[0], dict):
    print(f"Keys: {list(ocr_raw[0].keys())}")
    has_box = "box" in ocr_raw[0] and ocr_raw[0]["box"] is not None
    print(f"Has box: {has_box}")

print("\n=== All entries (text + box status) ===")
for i, item in enumerate(ocr_raw):
    if isinstance(item, dict):
        has_box = "box" in item and item["box"] is not None
        print(f"[{i:02d}] box={has_box}  text={item.get('text', '')}")
    else:
        print(f"[{i:02d}] RAW TYPE={type(item)}  value={str(item)[:100]}")

# Save full output for analysis
with open("debug_live_ocr.json", "w") as f:
    json.dump(ocr_raw, f, indent=2, default=str)
print("\nSaved full output to debug_live_ocr.json")
