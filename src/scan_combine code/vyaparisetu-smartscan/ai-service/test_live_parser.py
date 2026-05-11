"""Test parser against the actual live OCR output saved from debug_live_ocr.py"""
import json
import logging
logging.basicConfig(level=logging.INFO, format="%(message)s")

from parser import parse_invoice

with open("debug_live_ocr.json") as f:
    live_data = json.load(f)

print(f"Testing with {len(live_data)} live OCR entries\n")
result = parse_invoice(live_data)

print("\n=== FINAL RESULT ===")
print(json.dumps(result, indent=2))
