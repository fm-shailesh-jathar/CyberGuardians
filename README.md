# Flexmoney Audit AI v2 (Frontend + Backend)

This repo started as a single-file HTML prototype (`secureaudit_v2.html`). It now includes a split `frontend/` and `backend/` so the Knowledge Base can persist via a lightweight API server.

## Version history (v1.x)

Update this section on every change:
- Bump `v1.x.y` (minor = feature, patch = fix).
- Add what changed + how it works.

### v1.2.0 (2026-03-17)

UI navigation improvements:
- Renamed the top brand name to **Flexmoney Audit AI**.
- Sidebar is now collapsible.
- Sidebar sections (Overview/Audits/Compliance/AI Engine/Admin) are collapsible, with open/close state persisted in `localStorage`.

### v1.1.0 (2026-03-17)

Audit Upload (Flexmoney Security Dashboard Audit) improvements:
- Upload modal: removed the drag/drop “upload box”; file selection is via a simple “Choose file” control.
- Recent Uploads: per-file delete + “Clear all”, and the UI shows the uploaded file count.
- Results: Manual items are editable; low-confidence items still pre-fill answers but remain editable, and manual edits are rephrased for clearer wording on save.
- Fill + Export: after all questions have answers, you can “Fill answers” and then export a filled file.
  - CSV/XLSX uploads export in-place: the original grid is preserved and only the existing Answer/Response column is filled (no extra rows/columns are added).

## What I implemented (features)

### AI Cybersecurity Audit Assistant (KB-only)

- **Knowledge Base Manager**
  - Add / Edit / Delete entries (Question, Answer, Category)
  - Search + category filter
  - Import KB from **JSON / CSV / XLSX**
    - Auto-detects Question/Answer columns even if headers aren’t named exactly `Question` / `Answer`
  - Export KB to JSON

- **Audit Upload + Results**
  - Upload and process questionnaires from **CSV / XLSX / DOCX / JSON**
  - Extract questions and match to KB using a local similarity scorer
  - Results table: Question, Suggested Answer, Confidence, Source Question, Status
  - **Auto-fill rule:** confidence ≥ **70%** marks items as **Auto** and fills the KB answer; below that it marks **Manual**
  - Enforced KB-only policy message for low-confidence cases:
    - `No answer found in knowledge base. Manual response required.`

- **Chatbot Assistant**
  - Answers only from the Knowledge Base (no hallucination)
  - Shows matched KB question + confidence
  - Threshold slider (default **0.80**) for chat matching

### Similarity / “Semantic” matching (prototype)

- Implements a TF-IDF + overlap scorer with a few security-term expansions (e.g., MFA/2FA/SIEM/VAPT).
- This is a browser-friendly stand-in for embeddings (no OpenAI calls, no vector DB).

## Project structure

- `frontend/index.html` — UI shell
- `frontend/styles.css` — extracted styles
- `frontend/app.js` — extracted logic (KB/audit/chat + UI wiring)
- `backend/server.py` — Python server serving `frontend/` + KB API
- `backend/data/kb.json` — Knowledge Base persistence
- `secureaudit_v2.html` — legacy single-file version (kept for reference)

## Run locally (recommended)

The backend serves the frontend and provides `/api` endpoints.

Ubuntu / Linux:

```bash
cd /home/shailesh.jathar/Mydoc/cloudops/Flexathon/Flexathon-Cyber/CyberGuardians
python3 -u backend/server.py --host 127.0.0.1 --port 8000
```

Then open:

`http://127.0.0.1:8000/`

Notes:

- Port `5500` may already be in use (commonly by VS Code Live Server). Use `8000` or any free port.
- The UI loads **Chart.js** and **Google Fonts** from CDNs.
- XLSX/DOCX parsing uses CDN-loaded libraries (SheetJS `xlsx`, `mammoth`) when needed.

## Backend API (current)

- `GET /api/health` → `{ "ok": true }`
- `GET /api/kb/list` → `[]` (KB entries)
- `PUT /api/kb/replace` → replaces KB with the JSON array sent by the frontend

The frontend auto-syncs KB:

- On load: pulls KB from backend (if backend is reachable)
- On KB changes: pushes the updated KB back to the backend

## Notes / limitations

- Audit runs and chat history still persist in the browser (`localStorage`) in this version.
- PDF parsing is not implemented (future phase).
