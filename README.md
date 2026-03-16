# SecureAudit RAG v2 (HTML Prototype)

`secureaudit_v2.html` is a single-file, static HTML prototype for an “AI-Powered Security Audit Intelligence” dashboard. It demonstrates a multi-module security/compliance UI (audits, documents, analytics, training, RBAC) with mocked data and lightweight interactions.

## What’s inside

- **Dashboard**: audit overview cards, compliance progress by audit, recent activity, deadline alerts, and RAG status.
- **Analytics & Reporting**: Chart.js charts (trend, lender progress, document status, training completion), risk heatmap, and top risk register table.
- **Notifications & Alerts**: alert feed with escalation tier examples.
- **Lender Audits**: questionnaire-style Q&A cards with “RAG suggestion”, confidence, sources, approve/edit interactions, and an extraction pipeline mock.
- **PCI DSS**: PCI DSS v4.0 requirements overview with per-domain compliance/progress.
- **Training**: awareness + SDLC training completion tables and upcoming sessions.
- **Internal Assessment**: accordion sections for DR / BCP / Incident Management with document + test tracking.
- **Document Review**: searchable/filterable policy register rendered from an in-page `docs` array.
- **RAG Engine**: ingestion queue, canonical question bank (dedupe), and example engine configuration.
- **Audit Trail**: append-only/tamper-evident log mock (hashes, block numbers).
- **Users & Access Control (RBAC)**: roles, members, and security settings (SSO/MFA) mock.

## Run locally

No build step is required.

- Option 1: Double-click `secureaudit_v2.html`
- Option 2 (PowerShell): `Start-Process .\\secureaudit_v2.html`

Note: the page loads **Chart.js** and **Google Fonts** from CDNs. For fully-offline use, vendor those assets locally and update the `<script src=...>` / `<link href=...>` tags.

## Customize the mock data

All data is embedded in the HTML:

- **Documents**: edit the `docs` array in `secureaudit_v2.html` (search/filter is wired up via `renderDocs()`).
- **Charts**: update the datasets in `initCharts()` (Chart.js).
- **Heatmap**: update `domains`, `audits`, and `scores` in `buildHeatmap()`.
- **Button actions**: `exportPDF()`, `exportXLSX()`, and `simulateUpload()` are currently placeholders that show alerts.

## Notes / limitations

- This is a **UI prototype** (no backend, no real uploads, no persistence).
- Some buttons simulate actions via `alert()` only.
- If you see odd characters like `â€”`, the file was likely saved/viewed with a mismatched text encoding; re-saving as UTF-8 typically fixes it.

