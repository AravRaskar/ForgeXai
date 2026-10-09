import re
from pathlib import Path

import cv2

from app.core.config import get_settings
from app.services.preprocessing import load_document_as_bgr, preprocess_image

NOT_DETECTED = "Not detected"


class OCRStatus:
    def __init__(self, engine: str, available: bool, message: str):
        self.engine = engine
        self.available = available
        self.message = message


def get_ocr_status() -> OCRStatus:
    settings = get_settings()
    try:
        import pytesseract

        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
        pytesseract.get_tesseract_version()
        return OCRStatus("tesseract", True, "Tesseract OCR is available.")
    except Exception as exc:
        return OCRStatus("tesseract", False, f"Tesseract not available: {type(exc).__name__}")


def extract_text(path: Path) -> tuple[str, OCRStatus]:
    status = get_ocr_status()
    if not status.available:
        return "", status

    import pytesseract

    settings = get_settings()
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    img = load_document_as_bgr(path)
    processed = preprocess_image(img)
    rgb = cv2.cvtColor(processed, cv2.COLOR_BGR2RGB)
    text = pytesseract.image_to_string(rgb) or ""
    return text.strip(), status


def _first_match(patterns: list[str], text: str) -> str:
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1).strip()
    return NOT_DETECTED


def extract_fields(category: str, text: str) -> dict[str, str]:
    fields = {
        "name": NOT_DETECTED,
        "document_number": NOT_DETECTED,
        "account_number": NOT_DETECTED,
        "date": NOT_DETECTED,
        "amount": NOT_DETECTED,
        "payee_or_beneficiary": NOT_DETECTED,
    }
    if not text:
        return fields

    fields["document_number"] = _first_match(
        [
            r"\b([A-Z]{5}[0-9]{4}[A-Z])\b",  # PAN
            r"\b(\d{4}\s?\d{4}\s?\d{4})\b",  # Aadhaar-like
            r"\b([A-Z0-9]{8,12})\b",
        ],
        text,
    )
    fields["account_number"] = _first_match(
        [r"(?:A/C|ACCOUNT)\s*(?:NO\.?|NUMBER)?\s*[:\-]?\s*(\d{6,18})", r"\b(\d{9,18})\b"],
        text,
    )
    fields["date"] = _first_match(
        [r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", r"\b(\d{4}-\d{2}-\d{2})\b"],
        text,
    )
    fields["amount"] = _first_match(
        [r"(?:RS\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)", r"\bAMOUNT\s*[:\-]?\s*([\d,]+(?:\.\d{2})?)"],
        text,
    )
    fields["payee_or_beneficiary"] = _first_match(
        [r"PAY\s*(?:TO|EE)?\s*[:\-]?\s*([A-Za-z .]{3,40})", r"BENEFICIARY\s*[:\-]?\s*([A-Za-z .]{3,40})"],
        text,
    )
    fields["name"] = _first_match(
        [r"NAME\s*[:\-]?\s*([A-Za-z .]{3,40})", r"HOLDER\s*[:\-]?\s*([A-Za-z .]{3,40})"],
        text,
    )

    if category == "PAN Card":
        pan = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
        if pan:
            fields["document_number"] = pan.group(1)
    elif category == "Cheque":
        if fields["payee_or_beneficiary"] == NOT_DETECTED:
            fields["payee_or_beneficiary"] = _first_match([r"PAY\s*([A-Za-z .]{3,40})"], text)

    return fields
