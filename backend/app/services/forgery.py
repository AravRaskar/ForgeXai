import json
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

FORGERY_WEIGHTS = Path(__file__).resolve().parents[2] / "models" / "weights" / "forgery_cnn.pt"


def _read_metadata(path: Path) -> dict:
    meta: dict = {"filename": path.name, "format": path.suffix.lower()}
    try:
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            import piexif

            img = Image.open(path)
            meta["size"] = list(img.size)
            meta["mode"] = img.mode
            try:
                exif_raw = img.info.get("exif")
                if exif_raw:
                    exif_dict = piexif.load(exif_raw)
                    meta["exif_present"] = True
                    software = exif_dict.get("0th", {}).get(piexif.ImageIFD.Software)
                    if software:
                        meta["software"] = software.decode(errors="ignore") if isinstance(software, bytes) else str(software)
                else:
                    meta["exif_present"] = False
            except Exception:
                meta["exif_present"] = False
        elif path.suffix.lower() == ".pdf":
            meta["note"] = "Metadata analysis limited to PDF container; raster checks use first page render."
    except Exception as exc:
        meta["error"] = type(exc).__name__
    return meta


def error_level_analysis(path: Path, out_path: Path) -> dict:
    if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        return {"available": False, "reason": "ELA requires JPEG or PNG source image."}

    original = Image.open(path).convert("RGB")
    buffer = BytesIO()
    original.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")

    diff = Image.fromarray(
        np.abs(np.array(original, dtype=np.int16) - np.array(recompressed, dtype=np.int16)).astype(np.uint8)
    )
    diff_arr = np.array(diff)
    score = float(np.mean(diff_arr))
    std = float(np.std(diff_arr))
    diff_enhanced = np.clip(diff_arr * 4, 0, 255).astype(np.uint8)
    Image.fromarray(diff_enhanced).save(out_path, format="PNG")

    return {
        "available": True,
        "mean_difference": round(score, 3),
        "std_difference": round(std, 3),
        "interpretation": (
            "ELA highlights recompression differences; elevated regions may warrant review but are not proof of forgery."
        ),
    }


def opencv_artifact_analysis(img_bgr: np.ndarray) -> dict:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.mean(edges > 0))
    anomalies: list[str] = []
    if lap_var < 50:
        anomalies.append("Low sharpness — possible blur or heavy compression.")
    if edge_density > 0.25:
        anomalies.append("High edge density — possible splicing or sharp overlays.")
    return {
        "laplacian_variance": round(lap_var, 2),
        "edge_density": round(edge_density, 4),
        "anomalies": anomalies,
    }


def _try_cnn_forgery(img_bgr: np.ndarray) -> dict | None:
    if not FORGERY_WEIGHTS.is_file():
        return {
            "available": False,
            "source": "cnn_module",
            "message": "No trained forgery CNN weights found (forgery_cnn.pt).",
        }
    return {
        "available": False,
        "source": "cnn_module",
        "message": "Weights file present; integrate PyTorch model inference in services/forgery.py.",
    }


def analyze_forgery(path: Path, img_bgr: np.ndarray, ela_output: Path) -> dict:
    metadata = _read_metadata(path)
    ela = error_level_analysis(path, ela_output)
    cv_analysis = opencv_artifact_analysis(img_bgr)
    cnn = _try_cnn_forgery(img_bgr)

    anomalies = list(cv_analysis.get("anomalies", []))
    if metadata.get("exif_present") is False and path.suffix.lower() in {".jpg", ".jpeg"}:
        anomalies.append("Missing EXIF block — common for scans; not conclusive.")
    if ela.get("available") and ela.get("std_difference", 0) > 25:
        anomalies.append("ELA shows uneven error levels — manual review recommended.")

    if len(anomalies) >= 2:
        status = "suspicious"
        recommendation = "Multiple heuristic indicators — escalate for manual verification."
    elif len(anomalies) == 1:
        status = "manual_review"
        recommendation = "Inconclusive automated checks — manual review required."
    else:
        status = "no_suspicious"
        recommendation = (
            "No suspicious indicators from ELA/metadata/heuristics. "
            "This does NOT prove authenticity — use institutional verification."
        )

    return {
        "status": status,
        "metadata": metadata,
        "ela": ela,
        "opencv": cv_analysis,
        "cnn": cnn,
        "anomalies": anomalies,
        "explanation": (
            "Automated forgery analysis combines ELA, metadata, and OpenCV heuristics. "
            "Results are indicative only for this academic prototype."
        ),
        "recommendation": recommendation,
        "suspicious_region_visualization": {
            "available": ela.get("available", False),
            "type": "ela_heatmap",
            "note": "ELA difference map serves as indicative visualization; not localized CNN heatmap.",
        },
    }
