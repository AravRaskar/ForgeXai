from pathlib import Path

import cv2
import numpy as np


def load_image_bgr(path: Path) -> np.ndarray:
    img = cv2.imread(str(path))
    if img is None:
        raise ValueError("Unable to read image with OpenCV.")
    return img


def pdf_first_page_to_bgr(pdf_path: Path) -> np.ndarray:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise ValueError("PDF support requires pymupdf.") from exc

    doc = fitz.open(pdf_path)
    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF has no pages.")
    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    doc.close()
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    return img


def load_document_as_bgr(path: Path) -> np.ndarray:
    if path.suffix.lower() == ".pdf":
        return pdf_first_page_to_bgr(path)
    return load_image_bgr(path)


def preprocess_image(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    gray = cv2.equalizeHist(gray)

    coords = np.column_stack(np.where(gray > 0))
    angle = 0.0
    if len(coords) > 0:
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
    if abs(angle) > 0.5:
        (h, w) = gray.shape[:2]
        center = (w // 2, h // 2)
        m = cv2.getRotationMatrix2D(center, angle, 1.0)
        gray = cv2.warpAffine(gray, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    max_dim = 1600
    h, w = gray.shape[:2]
    scale = min(1.0, max_dim / max(h, w))
    if scale < 1.0:
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
