OBJECTIVE

Refactor the UI styling system to support custom themes (colors, background, accents, typography) without modifying layout, DOM structure, or JS functionality.

🧩 STEP 1: Introduce Design Tokens (CSS Variables)
Modify styles.css

At the very top, define a theme system using CSS variables:

:root {
  /* Base */
  --bg-primary: #0b1220;
  --bg-secondary: #111827;
  --card-bg: #1f2937;

  /* Text */
  --text-primary: #e5e7eb;
  --text-secondary: #9ca3af;

  /* Accent Colors */
  --accent-primary: #6366f1;
  --accent-success: #22c55e;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;

  /* Borders */
  --border-color: #374151;

  /* Hover */
  --hover-bg: #1f2937;
}
🎨 STEP 2: Replace Hardcoded Colors
Codex Task:

Replace ALL direct color values in styles.css with variables.

Example replacements:
background-color: #0b1220;
→ background-color: var(--bg-primary);

color: #e5e7eb;
→ color: var(--text-primary);

border-color: #374151;
→ border-color: var(--border-color);

⚠️ Do NOT change spacing, flex/grid, or layout rules.

🌗 STEP 3: Add Multiple Themes

Append new themes:

[data-theme="light"] {
  --bg-primary: #f9fafb;
  --bg-secondary: #ffffff;
  --card-bg: #ffffff;

  --text-primary: #111827;
  --text-secondary: #6b7280;

  --accent-primary: #4f46e5;
  --accent-success: #16a34a;
  --accent-warning: #d97706;
  --accent-danger: #dc2626;

  --border-color: #e5e7eb;
  --hover-bg: #f3f4f6;
}

[data-theme="cyberpunk"] {
  --bg-primary: #050816;
  --bg-secondary: #0f172a;
  --card-bg: #111827;

  --text-primary: #00f5ff;
  --text-secondary: #94a3b8;

  --accent-primary: #ff00ff;
  --accent-success: #00ff9f;
  --accent-warning: #ffcc00;
  --accent-danger: #ff3366;

  --border-color: #1e293b;
  --hover-bg: #020617;
}
⚙️ STEP 4: Theme Switch Logic (app.js)
Add:
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function loadTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  setTheme(saved);
}

loadTheme();
🔘 STEP 5: Hook to Existing UI Toggle

Your UI already has a "Dark" button (top-right).

Modify its click handler:
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");

  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
});
🎯 STEP 6: Optional – Advanced Theme Selector

Add dropdown (if needed):

<select onchange="setTheme(this.value)">
  <option value="dark">Dark</option>
  <option value="light">Light</option>
  <option value="cyberpunk">Cyberpunk</option>
</select>
✨ STEP 7: Enhance Visual Depth (No Layout Change)

Codex should:

Add subtle UI polish:
.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  background: var(--hover-bg);
}
📊 STEP 8: Color Mapping for Dashboard Elements

Ensure semantic mapping:

Element	Variable
Active Audits	--accent-primary
Compliance	--accent-success
Pending	--accent-warning
Critical	--accent-danger
🚫 CONSTRAINTS (IMPORTANT)

Codex MUST:

❌ NOT modify HTML structure

❌ NOT change JS logic (except theme switch)

❌ NOT alter layout (grid/flex/spacing)

❌ NOT rename classes

Codex SHOULD:

✅ Only refactor colors → variables

✅ Add theme system

✅ Keep UI behavior identical

🚀 RESULT

After implementation, your UI will support:

Instant theme switching

Scalable design system

Cleaner maintainability

Future branding flexibility