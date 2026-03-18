🔧 UI Refactor Instructions (Strict Non-Functional Change)
1. Objective

Redesign the frontend UI (colors, themes, layout, spacing, typography) without modifying any business logic, APIs, or functional behavior.

2. Constraints (MANDATORY)

DO NOT modify:

app.js logic (KB, audit, chatbot, similarity scoring)

API endpoints (/api/kb/*, /api/health)

Event handlers or function names

Data structures or DOM IDs used in JS

ONLY modify:

styles.css

HTML structure (non-functional wrappers, class names, layout containers)

Ensure:

All existing features work identically

No regression in chatbot, KB, audit upload, or navigation

3. Theme System Refactor
3.1 Replace Static CSS Variables

Refactor :root into a scalable theme system:

:root {
  --color-bg-primary: #0b0f1a;
  --color-bg-secondary: #121a2b;
  --color-surface: #1c2740;

  --color-text-primary: #e6edf3;
  --color-text-secondary: #9fb0d0;

  --color-accent: #4f8cff;
  --color-accent-soft: rgba(79,140,255,0.1);

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;

  --border-radius: 10px;
}
3.2 Add Theme Modes

Implement:

[data-theme="dark"] { ... }
[data-theme="light"] { ... }
[data-theme="cyber"] { ... }

Dark → default (current improved)

Light → white + soft gray UI

Cyber → neon blue/green (security dashboard feel)

3.3 Theme Switcher (UI Only)

Add toggle in topbar

Store preference in localStorage

Apply via:

document.documentElement.setAttribute("data-theme", savedTheme);
4. Layout Modernization
4.1 Convert Layout to Grid

Replace:

.layout { display:flex }

With:

.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
}
4.2 Sidebar Upgrade

Add:

Collapsible sidebar

Icon-only mode

Keep same navigation functions (nav())

4.3 Card System Redesign

Unify all cards:

.card {
  background: var(--color-surface);
  border-radius: var(--border-radius);
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}
5. Component-Level Enhancements
5.1 Buttons

Standardize:

Primary

Secondary

Danger

.btn-primary {
  background: var(--color-accent);
  color: white;
}
5.2 Tables

Add:

Sticky header

Row hover highlight

Better spacing

5.3 Chat UI

Enhance:

Rounded chat bubbles

Better spacing

Differentiate AI vs user clearly

5.4 Progress Bars

Add gradient + animation

Keep same width logic (DO NOT change JS)

6. Typography

Keep fonts but improve hierarchy:

.page-title { font-size: 22px; font-weight: 700; }
.page-sub { font-size: 13px; opacity: 0.7; }

Increase readability (line-height, spacing)

7. Responsiveness

Add breakpoints:

@media (max-width: 1024px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}

Ensure:

Dashboard works on tablet

Cards stack vertically

8. Micro-Interactions

Add subtle UX polish:

Hover states

Smooth transitions

Loading shimmer (optional UI only)

Button click feedback

9. File-Level Changes
Modify:

frontend/styles.css → full redesign

frontend/index.html → layout structure only

Do NOT modify:

frontend/app.js

backend/server.py

10. Validation Checklist

Before completion:

 Chatbot responses unchanged

 KB CRUD works

 Audit upload works

 Navigation works

 No console errors

 Theme switch persists

 UI responsive

11. Expected Outcome

Modern SaaS-grade UI

Cleaner color system

Better UX without logic changes

Fully backward compatible frontend