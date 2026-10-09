from pathlib import Path

import cv2
import numpy as np

from app.services.preprocessing import load_document_as_bgr

DOCUMENT_CATEGORIES = [
    "Aadhaar Card",
    "PAN Card",
    "Cheque",
    "Bank Statement",
    "Passport",
    "Driving Licence",
    "Voter ID",
    "Salary Slip",
    "Loan Application",
    "Other / Unknown",
]

# Modular hook for a trained CNN / ViT — place weights at backend/models/weights/classifier.pt
CLASSIFIER_WEIGHTS = Path(__file__).resolve().parents[2] / "models" / "weights" / "classifier.pt"


class ClassificationResult:
    def __init__(self, category: str, confidence: float | None, source: str, note: str):
        self.category = category
        self.confidence = confidence
        self.source = source
        self.note = note


def _try_pytorch_classifier(img: np.ndarray) -> ClassificationResult | None:
    if not CLASSIFIER_WEIGHTS.is_file():
        return None
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        return None
    # Placeholder architecture hook — replace with your trained model definition.
    return ClassificationResult(
        category="Other / Unknown",
        confidence=None,
        source="pytorch_stub",
        note=(
            "Weight file present but no trained architecture is wired in this prototype. "
            "Integrate your CNN/ViT class mapping here."
        ),
    )


def _demo_heuristic_classifier(img: np.ndarray, ocr_text: str, hint: str | None) -> ClassificationResult:
    text = (ocr_text or "").upper()
    h, w = img.shape[:2]
    aspect = w / h if h else 1.0

    rules: list[tuple[str, float, callable]] = [
        ("Aadhaar Card", 0.55, lambda: "AADHAAR" in text or "UIDAI" in text or (1.4 < aspect < 1.7)),
        ("PAN Card", 0.55, lambda: "INCOME TAX" in text or "PERMANENT ACCOUNT" in text or "PAN" in text),
        ("Cheque", 0.5, lambda: "CHEQUE" in text or "PAY" in text and aspect > 2.0),
        ("Bank Statement", 0.5, lambda: "STATEMENT" in text or "ACCOUNT" in text and "BALANCE" in text),
        ("Passport", 0.5, lambda: "PASSPORT" in text or "REPUBLIC OF INDIA" in text),
        ("Driving Licence", 0.5, lambda: "DRIVING" in text or "LICENCE" in text or "LICENSE" in text),
        ("Voter ID", 0.5, lambda: "ELECTOR" in text or "VOTER" in text),
        ("Salary Slip", 0.5, lambda: "SALARY" in text or "PAYSLIP" in text or "NET PAY" in text),
        ("Loan Application", 0.5, lambda: "LOAN" in text and "APPLICATION" in text),
    ]

    for cat, conf, fn in rules:
        try:
            if fn():
                return ClassificationResult(
                    category=cat,
                    confidence=conf,
                    source="demo_heuristic",
                    note=(
                        "Demo/fallback classifier using OCR keywords and simple image geometry. "
                        "Not a trained neural network."
                    ),
                )
        except Exception:
            continue

    if hint and hint in DOCUMENT_CATEGORIES:
        return ClassificationResult(
            category=hint,
            confidence=0.45,
            source="user_hint_fallback",
            note="No strong heuristic match; using selected category as tentative label (low confidence).",
        )

    # Color/layout fallback
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    blue_ratio = np.mean(hsv[:, :, 0] > 90) / 255.0
    if aspect > 2.2:
        cat = "Cheque"
    elif blue_ratio > 0.02:
        cat = "Bank Statement"
    else:
        cat = "Other / Unknown"

    return ClassificationResult(
        category=cat,
        confidence=0.35 if cat != "Other / Unknown" else None,
        source="demo_heuristic",
        note="Demo/fallback classifier — train and load a CNN for production-grade classification.",
    )


def classify_document(path: Path, ocr_text: str = "", category_hint: str | None = None) -> ClassificationResult:
    img = load_document_as_bgr(path)
    pytorch = _try_pytorch_classifier(img)
    if pytorch and pytorch.source != "pytorch_stub":
        return pytorch
    return _demo_heuristic_classifier(img, ocr_text, category_hint)
