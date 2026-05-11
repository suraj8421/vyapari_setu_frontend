from paddleocr import PaddleOCR

# PRODUCTION FIX: ALWAYS use use_angle_cls=True
ocr = PaddleOCR(use_angle_cls=True, lang='en', structure=True)

print("Running OCR on invoice.jpg...")
result = ocr.ocr("invoice.png", cls=True)

print("RAW RESULT:")
print(result)