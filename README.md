# AI-Powered Document Classification and Forgery Detection for Banking Documents

Full-stack academic prototype: React (Vite) + FastAPI + SQLite + OpenCV + Tesseract OCR + ELA/metadata forgery heuristics.

**Disclaimer:** This is a college demonstration system. It is **not** production banking software. Automated results are indicative only and do not prove document authenticity.

## Features

- Staff login (JWT) with demo credentials
- Dashboard with live DB metrics and Recharts
- Document upload (drag/drop), classification, OCR, forgery analysis
- Results, management, review workflow, audit logs, PDF report download
- Modular hooks for PyTorch CNN weights (`classifier.pt`, `forgery_cnn.pt`)

## Demo login

| Field | Value |
|--------|--------|
| Email | `staff@bankdemo.local` |
| Password | `demo1234` |

## Prerequisites (Windows)

- Node.js 18+
- Python 3.11+
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (recommended for OCR)

## Setup

### 1. Environment

```powershell
cd C:\Users\hulge\IVC
copy .env.example backend\.env
```

Edit `backend\.env` if needed (e.g. `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe`).

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Database file is created automatically at `backend\data\bankdocs.db` on first startup.

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — API is proxied to http://127.0.0.1:8000.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health, OCR, model availability |
| POST | `/api/auth/login` | Staff login |
| POST | `/api/documents/upload` | Upload document |
| POST | `/api/documents/{id}/analyze` | Run analysis (`?sync=true` for inline) |
| GET | `/api/documents` | List with filters |
| GET | `/api/documents/{id}` | Details (`?reveal=true` for unmasked OCR) |
| PATCH | `/api/documents/{id}/review` | Approve / reject / manual review |
| GET | `/api/documents/{id}/report` | PDF report |
| GET | `/api/dashboard/stats` | Dashboard metrics |
| GET | `/api/audit-logs` | Audit trail |

## Trained models (optional)

- Classification: `backend/models/weights/classifier.pt` — wire your CNN/ViT in `app/services/classification.py`
- Forgery CNN: `backend/models/weights/forgery_cnn.pt` — wire inference in `app/services/forgery.py`

Without weights, the app uses **clearly labelled demo/heuristic** classification and ELA/metadata/OpenCV forgery checks.

## Security notes (prototype)

- Uploads stored under `backend/uploads/` (not served publicly; access via authenticated API)
- Passwords hashed with bcrypt; JWT for sessions
- Sensitive OCR fields masked in UI by default
- Do not commit `.env`, uploads, or `*.db`

## License

Academic project — adjust as required by your institution.
