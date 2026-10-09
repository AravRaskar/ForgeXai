from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.models.entities import Document
from app.services.file_storage import mask_value


def build_pdf_report(doc: Document) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 2 * cm
    lines = [
        "Bank Document Analysis Report (Academic Prototype)",
        f"Document ID: {doc.id}",
        f"File: {doc.original_filename}",
        f"Category: {doc.predicted_category or 'N/A'}",
        f"Classification source: {doc.classification_source or 'N/A'}",
        f"Forgery status: {doc.forgery_status or 'N/A'}",
        f"Review status: {doc.review_status}",
        "",
        "Disclaimer: Automated results are not proof of authenticity.",
    ]
    if doc.ocr_fields:
        lines.append("Extracted fields (masked):")
        for k, v in doc.ocr_fields.items():
            if k.startswith("_"):
                continue
            val = mask_value(str(v)) if isinstance(v, str) else str(v)
            lines.append(f"  - {k}: {val}")

    for line in lines:
        c.drawString(2 * cm, y, line[:110])
        y -= 0.6 * cm
        if y < 2 * cm:
            c.showPage()
            y = height - 2 * cm

    c.save()
    return buffer.getvalue()
