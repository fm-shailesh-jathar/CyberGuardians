# Flexmoney Audit AI v2 (Frontend + Backend)

This repo started as a single-file HTML prototype (`secureaudit_v2.html`). The current working app is a lightweight Python backend that serves `frontend 2.0/` and exposes a small `/api` for Knowledge Base + Chat.

## Run locally

PowerShell:

`python -u backend/server.py --host 127.0.0.1 --port 8000`

Open:

`http://127.0.0.1:8000/`

Notes:
- Port `5500` is often used by Live Server; `8000` is recommended.
- The UI loads Chart.js + Google Fonts from CDNs.
- XLSX/DOCX parsing loads SheetJS (`xlsx`) and `mammoth` from CDNs when needed.

## Project structure (current)

- `frontend 2.0/index.html` — UI shell (primary styling is inline here)
- `frontend 2.0/style.css` — extra styles (kept for extension)
- `frontend 2.0/app.js` — all frontend logic (Sidebar + KB + Chat + Audit Upload)
- `backend/server.py` — static server + API
- `backend/data/kb.json` — KB persistence
- `backend/data/chat_logs.jsonl` — optional chat archive (when called)
- `secureaudit_v2.html` — legacy single-file version (kept for reference)

## Features (current)

### Sidebar / Navigation
- Collapsible sidebar with smooth animation; state persisted in `localStorage`.
- Grouped dropdown sections (Overview / Audits / AI Engine) with persisted open/close state.
- Nav items render icons/labels from `data-icon` + `data-label` (no hardcoded icon markup needed per link).

### Knowledge Base (KB)
- CRUD: Add / Edit / Delete entries (Question, Answer, Category).
- Search + category filter.
- Import KB from JSON / CSV / XLSX; export KB to JSON.
- Saves to backend via `/api/kb/replace` and automatically retries `POST` if `PUT` is blocked (HTTP 405 environments).

### Audit Uploads (Security Questionnaire Automation)
- Upload questionnaires from CSV / XLSX / DOCX.
- Matches questions to KB using a lightweight similarity scorer.
- Results table: Question, Suggested Answer, Confidence, Source Question, Status.
- Auto-fill rule: confidence >= threshold (default `0.70`) marks items as Auto; others remain Manual.
- Manual fallback message: `No answer found in knowledge base. Manual response required.`

#### Lender Excel templates (IDFC / HDFC / ICICI / etc)
- XLSX parsing uses heuristics to detect:
  - section headers/subheadings
  - question rows
  - the correct “answer cell” location to fill on export
- Export Filled File for XLSX writes answers back into the original workbook (best-effort formatting preservation).
- Refresh-safe export: original XLSX bytes are persisted in browser IndexedDB and reloaded on export.
- Removing a file from Recent Uploads also removes its stored bytes; if it was the active file, the questions/results clear too.

### Chatbot
- KB-first answers (with a confidence threshold).
- Backend fallback can use Gemini for web-grounded answers (when configured).
- Chat history + settings persist in the browser (`localStorage`).

## Backend API (current)

- `GET /api/health` — health + feature flags (web provider, model, last error, latency budget)
- `GET /api/kb/list` — list KB entries
- `PUT /api/kb/replace` (or `POST /api/kb/replace`) — replace KB with JSON array
- `POST /api/chat` — chatbot response (KB-first; optional web grounding/fallback)
  - Body: `{ "question": "...", "threshold": 0.8, "rephrase": false, "maxResponseMs": 10000 }`
- `POST /api/chat/logs` — append chat history archive to `backend/data/chat_logs.jsonl`
- `POST /api/ollama` — raw prompt passthrough (only useful if Ollama is enabled/running)

## Configuration (`backend/.env`)

### Gemini (web grounding)
- `SECUREAUDIT_WEB_PROVIDER=gemini`
- `SECUREAUDIT_GEMINI_API_KEY=...`
- Optional:
  - `SECUREAUDIT_GEMINI_MODEL=gemini-2.5-flash`
  - `SECUREAUDIT_GEMINI_TIMEOUT=8`
  - `SECUREAUDIT_MAX_RESPONSE_MS=10000`

If Gemini returns `HTTP 429: Too Many Requests`, it typically means a quota/rate limit was exceeded (often shown as “RPD” = requests per day).

### Avoid Ollama completely (Gemini + KB only)
- Set `SECUREAUDIT_GENERAL_FALLBACK=0`
- Don’t run Ollama locally (the app won’t need it).

## Notes / limitations

- XLSX formatting preservation is best-effort (depends on SheetJS capabilities and the lender template); macros and some advanced Excel features may not round-trip.
- XLSX originals are stored in browser IndexedDB to support export after refresh; clearing site data removes stored originals.
- PDF parsing is not implemented yet.

## Version history (v1.x)

### v1.5.0 (2026-03-18)

Frontend 2.0 consolidation + audit template compatibility:
- Frontend now runs from `frontend 2.0/` and is served by `backend/server.py`.
- Sidebar: smooth collapse + grouped dropdown sections with persisted open/close state; dynamic icon/label rendering via `data-icon`/`data-label`.
- Knowledge Base: import/export support; backend save hardening (KB replace supports `PUT` and `POST`).
- Audit Uploads: lender XLSX parsing (sections/questions/answer-cell mapping) + export filled answers into the original workbook; refresh-safe export via IndexedDB persistence; per-file remove clears stored bytes and current results when applicable.

### v1.4.0 (2026-03-17)

Hybrid retrieval + UX hardening:
- KB match -> optional rerank -> web-grounded answer (Gemini) -> local fallback.
- Source labeling for chat answers (`kb` / `internet` / `general` / `manual`).
- Time budget controls (`SECUREAUDIT_MAX_RESPONSE_MS`) + per-request override in `/api/chat`.
- `.env` loading + gitignore for secrets.

### v1.3.0 (2026-03-17)

Hybrid assistant (KB + optional Ollama fallback):
- Backend Ollama integration + chat UI wired to `/api/chat`.

### v1.2.0 (2026-03-17)

UI navigation:
- Sidebar collapsible + section dropdowns with `localStorage` persistence.

### v1.1.0 (2026-03-17)

Audit Upload baseline:
- Recent Uploads list + per-file remove + clear all.
- Results table with inline editing, Fill Answers, and export.

### v1.0.0 (2026-03-16)

Prototype:
- Single-file `secureaudit_v2.html` dashboard + early KB matching.

