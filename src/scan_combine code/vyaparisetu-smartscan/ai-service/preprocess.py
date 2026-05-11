import cv2
import numpy as np

def deskew(image):
    """
    Detects the skew angle of the image and rotates it to straighten the text.

    IMPORTANT: Only corrects small skew angles (<=10 degrees).
    Larger detected angles usually mean the detection algorithm was confused
    by page borders or dense content -- in those cases we do NOT rotate.
    This prevents the common failure mode of rotating a straight invoice by 90 degrees.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_not(gray)

    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    angle = cv2.minAreaRect(coords)[-1]

    # Convert from OpenCV minAreaRect angle convention to actual skew angle
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    print(f"[PREPROCESS] Detected skew angle: {angle:.2f} deg")

    # Only correct small skew -- large angles indicate a detection error
    MAX_CORRECTION_ANGLE = 10.0
    if abs(angle) > MAX_CORRECTION_ANGLE:
        print(f"[PREPROCESS] Skipping deskew -- angle {angle:.2f} deg exceeds {MAX_CORRECTION_ANGLE} deg threshold")
        return image, 0.0

    print(f"[PREPROCESS] Applying deskew correction of {angle:.2f} deg")
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    return rotated, angle


def preprocess(img):
    """
    Preprocessing Pipeline for Production-Grade OCR.
    1. Upscaling (3x for higher detail)
    2. Noise removal (Gaussian Blur)
    3. Safe skew correction (<=10 deg only -- prevents accidental 90-deg flips)
    4. Adaptive thresholding for varied lighting
    """
    if img is None:
        return None

    # 1. Upscaling (3x)
    img = cv2.resize(img, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)

    # 2. Noise removal
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # 3. Safe skew correction
    img, angle = deskew(img)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # 4. Adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Save debug image
    cv2.imwrite("debug.jpg", thresh)

    processed = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    return processed
