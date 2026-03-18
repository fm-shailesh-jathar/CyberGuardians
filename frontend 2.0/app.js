function initTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    const msg = document.createElement('div');
    msg.style.color = '#9ca3af';
    msg.style.fontSize = '12px';
    msg.style.paddingTop = '10px';
    msg.textContent = 'Chart library not loaded (Chart.js).';
    canvas.parentElement?.appendChild(msg);
    return;
  }

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Compliance %',
          data: [60, 65, 70, 72, 75, 77],
          borderColor: '#0ea5e9',
          pointBackgroundColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.12)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#667085' } } },
      scales: {
        x: { ticks: { color: '#667085' }, grid: { color: 'rgba(15, 23, 42, 0.08)' } },
        y: { ticks: { color: '#667085' }, grid: { color: 'rgba(15, 23, 42, 0.08)' } },
      },
    },
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeForSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function setStatus(text) {
  const el = document.getElementById('kbStatus');
  if (el) el.textContent = text || '';
}

function openModal(id) {
  const bg = document.getElementById(id);
  if (!bg) return;
  bg.classList.add('open');
  bg.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const bg = document.getElementById(id);
  if (!bg) return;
  bg.classList.remove('open');
  bg.setAttribute('aria-hidden', 'true');
}

function setView(view) {
  document.querySelectorAll('.view').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  document.querySelectorAll('.sidebar nav a[data-view]').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  if (view === 'dashboard') initTrendChart();
  if (view === 'chat') {
    const input = document.getElementById('chatInput');
    if (input instanceof HTMLTextAreaElement) input.focus();
    renderChat();
  }
  if (view === 'audit') {
    renderAudit();
  }
}

let kbEntries = [];

const CHAT_STORAGE_KEY = 'auditai_chat_v1';
const CHAT_SETTINGS_KEY = 'auditai_chat_settings_v1';
let chatHistory = [];
let chatThreshold = 0.8;
let chatRephrase = false;
let chatBusy = false;

const AUDIT_UPLOADS_KEY = 'auditai_audit_uploads_v1';
const AUDIT_SETTINGS_KEY = 'auditai_audit_settings_v1';
const AUDIT_CURRENT_KEY = 'auditai_audit_current_v1';
let auditUploads = [];
let auditThreshold = 0.7;
let auditFilter = 'all';
let auditCurrent = null; // in-memory current audit session

let apiBase = '';

const SIDEBAR_COLLAPSE_KEY = 'auditai_sidebar_collapsed_v1';
const SIDEBAR_GROUP_KEY_PREFIX = 'auditai_sidebar_group_v1_';

function joinApi(path) {
  if (!apiBase) return path;
  const base = apiBase.replace(/\/+$/, '');
  return `${base}${path}`;
}

function isSidebarCollapsed() {
  return document.body.classList.contains('sidebar-collapsed');
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', !!collapsed);
  try {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch {
    // ignore
  }
}

function toggleSidebarCollapsed() {
  setSidebarCollapsed(!isSidebarCollapsed());
}

function initSidebar() {
  try {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
    setSidebarCollapsed(saved);
  } catch {
    // ignore
  }

  const btn = document.getElementById('sidebarToggleBtn');
  btn?.addEventListener('click', toggleSidebarCollapsed);
}

function setSidebarGroupOpen(btn, open) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const groupId = btn.dataset && btn.dataset.group;
  const panelId = btn.getAttribute('aria-controls') || '';
  const panel = panelId ? document.getElementById(panelId) : btn.nextElementSibling;

  btn.classList.toggle('open', !!open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (panel instanceof HTMLElement) panel.classList.toggle('open', !!open);

  if (groupId) {
    try {
      localStorage.setItem(SIDEBAR_GROUP_KEY_PREFIX + groupId, open ? '1' : '0');
    } catch {
      // ignore
    }
  }
}

function initSidebarGroups() {
  document.querySelectorAll('.sidebar-section-toggle[data-group]').forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    const groupId = el.dataset.group || '';
    let open = true;
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUP_KEY_PREFIX + groupId);
      if (saved === '0') open = false;
      if (saved === '1') open = true;
    } catch {
      // ignore
    }

    setSidebarGroupOpen(el, open);

    el.addEventListener('click', () => {
      const next = !el.classList.contains('open');
      setSidebarGroupOpen(el, next);
    });
  });
}

function initSidebarIcons() {
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    if (!(a instanceof HTMLAnchorElement)) return;
    const label = (a.getAttribute('data-label') || a.textContent || '').trim();
    const icon = (a.getAttribute('data-icon') || '').trim();
    if (!label) return;

    a.setAttribute('title', label);
    a.innerHTML = `${icon ? `<span class="nav-icon">${escapeHtml(icon)}</span>` : ''}<span class="nav-label">${escapeHtml(label)}</span>`;

    // Keep non-functional items from jumping to top.
    if (!a.dataset.view) {
      a.addEventListener('click', (e) => e.preventDefault());
    }
  });
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function nowISO() {
  return new Date().toISOString();
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

async function probeHealth(base) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1200);
  try {
    const url = base ? `${base.replace(/\/+$/, '')}/api/health` : '/api/health';
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return !!data?.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function detectApiBase() {
  const params = new URLSearchParams(window.location.search || '');
  const forced = (params.get('api') || '').trim();
  const saved = (() => {
    try {
      return (localStorage.getItem('auditai_api_base') || '').trim();
    } catch {
      return '';
    }
  })();

  const candidates = [
    forced,
    saved,
    '',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:5500',
  ].filter((x, i, arr) => x !== null && x !== undefined && arr.indexOf(x) === i);

  for (const c of candidates) {
    if (c === '' && window.location.protocol === 'file:') continue;
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeHealth(c);
    if (ok) {
      apiBase = c;
      try {
        localStorage.setItem('auditai_api_base', apiBase);
      } catch {
        // ignore
      }
      return;
    }
  }

  apiBase = forced || saved || '';
}

function formatApiBaseForUI() {
  if (!apiBase) return '(same origin)';
  return apiBase;
}

async function refreshBackendChip() {
  const chip = document.getElementById('backendStatusChip');
  if (!chip) return;

  const ok = await probeHealth(apiBase);
  chip.classList.toggle('ok', ok);
  chip.classList.toggle('bad', !ok);
  chip.textContent = ok ? 'Backend: connected' : 'Backend: offline';
  chip.title = `Backend: ${ok ? 'connected' : 'offline'}\nAPI: ${formatApiBaseForUI()}\nClick to set API base.`;
}

function initBackendChip() {
  const chip = document.getElementById('backendStatusChip');
  if (!chip) return;

  chip.addEventListener('click', async () => {
    const hint =
      'Enter backend base URL (example: http://127.0.0.1:8000)\\nLeave empty to use same origin.';
    const next = prompt(hint, apiBase || '');
    if (next === null) return;
    apiBase = String(next || '').trim();
    try {
      localStorage.setItem('auditai_api_base', apiBase);
    } catch {
      // ignore
    }
    await refreshBackendChip();
    kbLoadFromBackend();
  });
}

function loadChatSettings() {
  try {
    const raw = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s?.threshold === 'number') chatThreshold = clamp01(s.threshold);
    if (typeof s?.rephrase === 'boolean') chatRephrase = s.rephrase;
  } catch {
    // ignore
  }
}

function saveChatSettings() {
  try {
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify({ threshold: chatThreshold, rephrase: chatRephrase }));
  } catch {
    // ignore
  }
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveChatHistory() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-200)));
  } catch {
    // ignore
  }
}

function setChatMeta(text) {
  const el = document.getElementById('chatMeta');
  if (el) el.textContent = text || '';
}

function setChatBusy(isBusy) {
  chatBusy = !!isBusy;
  const btn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  if (btn instanceof HTMLButtonElement) btn.disabled = chatBusy;
  if (input instanceof HTMLTextAreaElement) input.disabled = chatBusy;
}

function chatScrollToBottom() {
  const log = document.getElementById('chatLog');
  if (!log) return;
  log.scrollTop = log.scrollHeight;
}

function formatChatMetaFromResult(result) {
  const status = String(result?.status || 'Manual');
  const source = String(result?.source || 'manual');
  const conf = typeof result?.confidence === 'number' ? result.confidence : null;
  const srcQ = result?.sourceQuestion ? String(result.sourceQuestion) : '';
  const webError = result?.webError ? String(result.webError) : '';
  const confTxt = conf === null ? '' : ` Â· Confidence: ${conf.toFixed(2)}`;
  const srcTxt = srcQ ? ` Â· Match: ${srcQ}` : '';
  const webTxt = webError ? ` Â· Web: ${webError}` : '';
  return `Source: ${source} Â· Status: ${status}${confTxt}${srcTxt}${webTxt}`;
}

function renderChat() {
  const log = document.getElementById('chatLog');
  if (!log) return;

  if (!chatHistory.length) {
    log.innerHTML = `<div class="msg assistant">Ask a question to get started.</div>`;
    setChatMeta('No queries yet.');
    return;
  }

  log.innerHTML = chatHistory
    .map((m) => {
      const role = m?.role === 'user' ? 'user' : 'assistant';
      const text = escapeHtml(String(m?.text || ''));
      const meta = m?.meta ? escapeHtml(String(m.meta)) : '';
      const metaHtml = meta ? `<div class="msg-meta">${meta}</div>` : '';
      return `<div class="msg ${role}">${text}${metaHtml}</div>`;
    })
    .join('');

  const last = [...chatHistory].reverse().find((m) => m?.role === 'assistant' && m?.meta);
  setChatMeta(last?.meta || 'Ready.');
  chatScrollToBottom();
}

function chatAddMessage(role, text, meta) {
  chatHistory.push({ role, text, meta: meta || null, ts: nowISO() });
  chatHistory = chatHistory.slice(-200);
  saveChatHistory();
  renderChat();
}

async function chatSendCurrent() {
  const input = document.getElementById('chatInput');
  if (!(input instanceof HTMLTextAreaElement)) return;

  const question = (input.value || '').trim();
  if (!question) return;
  if (chatBusy) return;

  setChatBusy(true);
  input.value = '';

  chatAddMessage('user', question, null);

  const placeholderIdx = chatHistory.length;
  chatAddMessage('assistant', 'Thinking...', null);

  try {
    const res = await fetch(joinApi('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        threshold: chatThreshold,
        rephrase: chatRephrase,
        maxResponseMs: 10000,
      }),
    });

    const payload = await res.json().catch(() => null);
    const answer = (payload && typeof payload.answer === 'string' ? payload.answer : '') || '';
    const meta = payload ? formatChatMetaFromResult(payload) : `HTTP ${res.status}`;

    if (!res.ok || !answer) {
      const errTxt = payload && payload.error ? String(payload.error) : `HTTP ${res.status}`;
      chatHistory[placeholderIdx] = { role: 'assistant', text: `Error: ${errTxt}`, meta, ts: nowISO() };
    } else {
      chatHistory[placeholderIdx] = { role: 'assistant', text: answer, meta, ts: nowISO() };
    }

    saveChatHistory();
    renderChat();
  } catch {
    chatHistory[placeholderIdx] = {
      role: 'assistant',
      text: 'Error: backend not reachable. Start the backend and refresh.',
      meta: 'Backend offline.',
      ts: nowISO(),
    };
    saveChatHistory();
    renderChat();
  } finally {
    setChatBusy(false);
  }
}

function initChatUI() {
  loadChatSettings();
  chatHistory = loadChatHistory();

  const slider = document.getElementById('chatThreshold');
  const lbl = document.getElementById('chatThresholdLabel');
  const rephrase = document.getElementById('chatRephrase');

  if (slider instanceof HTMLInputElement) slider.value = chatThreshold.toFixed(2);
  if (lbl) lbl.textContent = chatThreshold.toFixed(2);
  if (rephrase instanceof HTMLInputElement) rephrase.checked = !!chatRephrase;

  slider?.addEventListener('input', () => {
    const v = slider instanceof HTMLInputElement ? Number(slider.value) : chatThreshold;
    chatThreshold = clamp01(v);
    if (lbl) lbl.textContent = chatThreshold.toFixed(2);
    saveChatSettings();
  });

  rephrase?.addEventListener('change', () => {
    if (!(rephrase instanceof HTMLInputElement)) return;
    chatRephrase = !!rephrase.checked;
    saveChatSettings();
  });

  document.getElementById('chatSendBtn')?.addEventListener('click', chatSendCurrent);

  const input = document.getElementById('chatInput');
  input?.addEventListener('keydown', (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatSendCurrent();
    }
  });

  document.getElementById('chatClearBtn')?.addEventListener('click', () => {
    if (!confirm('Clear chat history?')) return;
    chatHistory = [];
    saveChatHistory();
    renderChat();
  });

  document.getElementById('chatExportBtn')?.addEventListener('click', () => {
    downloadJson(`chat_history_${new Date().toISOString().slice(0, 10)}.json`, chatHistory);
  });

  renderChat();
}

function loadAuditSettings() {
  try {
    const raw = localStorage.getItem(AUDIT_SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s?.threshold === 'number') auditThreshold = clamp01(s.threshold);
    if (typeof s?.filter === 'string') auditFilter = String(s.filter || 'all');
  } catch {
    // ignore
  }
  if (auditThreshold < 0.5) auditThreshold = 0.7;
  if (!['all', 'auto', 'manual'].includes(auditFilter)) auditFilter = 'all';
}

function saveAuditSettings() {
  try {
    localStorage.setItem(AUDIT_SETTINGS_KEY, JSON.stringify({ threshold: auditThreshold, filter: auditFilter }));
  } catch {
    // ignore
  }
}

function loadAuditUploads() {
  try {
    const raw = localStorage.getItem(AUDIT_UPLOADS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveAuditUploads() {
  try {
    localStorage.setItem(AUDIT_UPLOADS_KEY, JSON.stringify(auditUploads.slice(-30)));
  } catch {
    // ignore
  }
}

function saveAuditCurrent() {
  try {
    if (!auditCurrent) {
      localStorage.removeItem(AUDIT_CURRENT_KEY);
      return;
    }
    const payload = {
      uploadId: auditCurrent.uploadId || null,
      name: auditCurrent.name || null,
      ext: auditCurrent.ext || null,
      ts: auditCurrent.ts || null,
      kind: auditCurrent.kind || null,
      // Persist results + edits so refresh doesn't clear the table.
      results: Array.isArray(auditCurrent.results) ? auditCurrent.results : [],
      // Note: We intentionally do NOT persist the full original workbook/aoa (can be large).
      // Export after refresh will fall back to a Question/Answer CSV if aoa is not present.
    };
    localStorage.setItem(AUDIT_CURRENT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadAuditCurrent() {
  try {
    const raw = localStorage.getItem(AUDIT_CURRENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    if (!Array.isArray(v.results) || !v.results.length) return null;
    const ext = v.ext || 'csv';
    const inferredKind = ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'tabular';
    return {
      uploadId: v.uploadId || null,
      name: v.name || 'audit',
      ext,
      kind: typeof v.kind === 'string' && v.kind ? v.kind : inferredKind,
      ts: v.ts || null,
      aoa: null,
      qIdx: 0,
      aIdx: -1,
      startRow: 0,
      results: v.results,
    };
  } catch {
    return null;
  }
}

function fmtLocalTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso || '');
  }
}

function setAuditStatus(text) {
  const el = document.getElementById('auditProcessStatus');
  if (el) el.textContent = text || '';
}

function setAuditSelectedFile(text) {
  const el = document.getElementById('auditSelectedFile');
  if (el) el.textContent = text || 'No file selected.';
}

function renderAuditUploads() {
  const wrap = document.getElementById('auditUploadsList');
  if (!wrap) return;
  if (!auditUploads.length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:12px">No uploads yet.</div>`;
    return;
  }
  wrap.innerHTML = auditUploads
    .slice()
    .reverse()
    .map((u) => {
      const id = escapeHtml(String(u?.id || ''));
      const name = escapeHtml(u?.name || 'file');
      const ts = escapeHtml(fmtLocalTime(u?.ts));
      const st = escapeHtml(u?.status || 'Processed');
      return `<div class="upload-item">
        <div>
          <div style="font-weight:700;font-size:13px">${name}</div>
          <div class="upload-meta">${ts}</div>
        </div>
        <div class="upload-actions">
          <div class="upload-meta" style="font-weight:700">${st}</div>
          <button class="upload-del" type="button" data-upload-del="${id}" title="Remove from recent uploads">Remove</button>
        </div>
      </div>`;
    })
    .join('');
}

function auditDownloadTemplate() {
  const csv = ['Question,Answer', '"Is multi-factor authentication enabled for privileged accounts?",""'].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit_template_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

function auditPickQuestionColumn(headerRow) {
  const hdr = (headerRow || []).map((h) => normalizeForSearch(h));
  const idx = hdr.findIndex((h) => h === 'question' || h.includes('question'));
  return idx >= 0 ? idx : 0;
}

function auditPickAnswerColumn(headerRow) {
  const hdr = (headerRow || []).map((h) => normalizeForSearch(h));
  const idx = hdr.findIndex((h) => h === 'answer' || h.includes('answer') || h === 'response' || h.includes('response'));
  return idx >= 0 ? idx : -1;
}

function auditTokenize(text) {
  const s = normalizeForSearch(text);
  if (!s) return [];
  const stop = new Set([
    'a','an','the','and','or','to','of','in','on','for','with','is','are','do','does','did','we','you','your','our','be','been','being',
    'it','this','that','these','those','as','at','by','from','into','over','under','within','across','per','via','can','will','shall','should','may',
    'provide','please','details','describe','explain',
  ]);
  return s.split(' ').filter((t) => t && !stop.has(t));
}

function auditSimilarity(q, candidate) {
  const a = new Set(auditTokenize(q));
  const b = new Set(auditTokenize(candidate));
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  const union = a.size + b.size - common;
  let j = union ? common / union : 0;
  const nq = normalizeForSearch(q);
  const nc = normalizeForSearch(candidate);
  if (nq && nc && (nq.includes(nc) || nc.includes(nq))) j = Math.max(j, 0.92);
  return clamp01(j);
}

function auditBestKBMatch(question) {
  let best = null;
  for (const e of kbEntries) {
    const q = String(e?.question || '').trim();
    if (!q) continue;
    const score = auditSimilarity(question, q);
    if (!best || score > best.score) best = { entry: e, score };
  }
  return best;
}

function auditRecomputeStatuses() {
  if (!auditCurrent || !Array.isArray(auditCurrent.results)) return;
  for (const r of auditCurrent.results) {
    const auto = !!r.hasKbAnswer && Number(r.confidence || 0) >= auditThreshold;
    r.status = auto ? 'Auto' : 'Manual';
    if (auto && !r.answer) r.answer = r.suggested || '';
  }
}

function auditLooksLikeQuestion(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (s.includes('?')) return true;
  if (/^q\s*\d+[\).\s:-]/i.test(s)) return true;
  if (/^\d+[\).\s:-]/.test(s)) return true;
  if (s.length >= 18 && /(provide|describe|explain|detail|how|what|which|who|where|when|whether)\b/i.test(s)) return true;
  return false;
}

function auditCellText(cell) {
  if (!cell) return '';
  const v = cell.w ?? cell.v;
  return String(v ?? '').trim();
}

function auditIsBoldCell(cell) {
  try {
    return !!cell?.s?.font?.bold;
  } catch {
    return false;
  }
}

function auditFindMergeTopLeft(ws, r, c) {
  const merges = ws && Array.isArray(ws['!merges']) ? ws['!merges'] : null;
  if (!merges || !merges.length) return { r, c };
  for (const m of merges) {
    if (!m || !m.s || !m.e) continue;
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) return { r: m.s.r, c: m.s.c };
  }
  return { r, c };
}

function auditDetectHeaderRow(ws, range) {
  const maxScan = Math.min(range.e.r, range.s.r + 40);
  for (let r = range.s.r; r <= maxScan; r++) {
    let questionCol = -1;
    let answerCol = -1;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = window.XLSX.utils.encode_cell({ r, c });
      const t = normalizeForSearch(auditCellText(ws[addr]));
      if (!t) continue;
      if (questionCol < 0 && (t === 'question' || t.includes('questionnaire') || t.includes('question'))) questionCol = c;
      if (
        answerCol < 0 &&
        (t === 'answer' || t.includes('answer') || t === 'response' || t.includes('response') || t.includes('remarks') || t.includes('comment'))
      )
        answerCol = c;
    }
    if (questionCol >= 0) return { headerRow: r, questionCol, answerCol };
  }
  return null;
}

function auditRowNonEmpty(ws, r, range) {
  const out = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = window.XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    const text = auditCellText(cell);
    if (text) out.push({ r, c, addr, cell, text });
  }
  return out;
}

function auditIsSectionRow(ws, r, range) {
  const cells = auditRowNonEmpty(ws, r, range);
  if (cells.length !== 1) return null;
  const one = cells[0];
  const text = String(one.text || '').trim();
  if (!text || auditLooksLikeQuestion(text)) return null;
  const isMerged = (() => {
    const merges = ws && Array.isArray(ws['!merges']) ? ws['!merges'] : null;
    if (!merges) return false;
    for (const m of merges) {
      if (!m || !m.s || !m.e) continue;
      if (m.s.r === r && m.e.r === r && one.c >= m.s.c && one.c <= m.e.c && m.e.c - m.s.c >= 2) return true;
    }
    return false;
  })();
  const bold = auditIsBoldCell(one.cell);
  const upper = text.length >= 6 && text === text.toUpperCase() && /[A-Z]/.test(text);
  if (bold || isMerged || upper) return text;
  if (text.length <= 50) return text;
  return null;
}

function auditChooseAnswerCell(ws, range, r, questionCol, detectedAnswerCol) {
  let c = detectedAnswerCol >= 0 ? detectedAnswerCol : questionCol + 1;
  if (c < range.s.c) c = range.s.c;
  if (c > range.e.c + 1) c = range.e.c + 1;
  const tl = auditFindMergeTopLeft(ws, r, c);
  return window.XLSX.utils.encode_cell({ r: tl.r, c: tl.c });
}

function auditExtractXlsxResults(wb) {
  const results = [];
  let rid = 0;
  const sheetNames = Array.isArray(wb?.SheetNames) ? wb.SheetNames : [];
  for (const sheetName of sheetNames) {
    const ws = wb.Sheets && wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const range = window.XLSX.utils.decode_range(ws['!ref']);
    const hdr = auditDetectHeaderRow(ws, range);
    let section = null;

    if (hdr) {
      for (let r = hdr.headerRow + 1; r <= range.e.r; r++) {
        const sec = auditIsSectionRow(ws, r, range);
        if (sec) {
          section = sec;
          continue;
        }
        const qAddr = window.XLSX.utils.encode_cell({ r, c: hdr.questionCol });
        const q = auditCellText(ws[qAddr]);
        if (!q) continue;
        if (!auditLooksLikeQuestion(q) && String(q).length < 6) continue;
        const aAddr = auditChooseAnswerCell(ws, range, r, hdr.questionCol, hdr.answerCol);
        results.push({
          rowIndex: ++rid,
          sheet: sheetName,
          questionAddr: qAddr,
          answerAddr: aAddr,
          section: section || null,
          question: q,
        });
      }
      continue;
    }

    // Free-form detection (no explicit Question/Answer columns)
    for (let r = range.s.r; r <= range.e.r; r++) {
      const sec = auditIsSectionRow(ws, r, range);
      if (sec) {
        section = sec;
        continue;
      }

      const cells = auditRowNonEmpty(ws, r, range);
      if (!cells.length) continue;

      // Pick the first cell that looks like a question; otherwise, pick a long text cell.
      let qCell = cells.find((c) => auditLooksLikeQuestion(c.text));
      if (!qCell) qCell = cells.find((c) => String(c.text || '').trim().length >= 20);
      if (!qCell) continue;

      const q = String(qCell.text || '').trim();
      if (!q || q.length < 6) continue;
      const aAddr = auditChooseAnswerCell(ws, range, r, qCell.c, -1);

      results.push({
        rowIndex: ++rid,
        sheet: sheetName,
        questionAddr: qCell.addr,
        answerAddr: aAddr,
        section: section || null,
        question: q,
      });
    }
  }
  return results;
}

async function auditLoadWorkbookForCurrent() {
  if (!auditCurrent) return null;
  if (auditCurrent.wb) return auditCurrent.wb;
  if (!auditCurrent.uploadId) return null;
  const rec = await idbGetFile(auditCurrent.uploadId);
  if (!rec || !rec.data) return null;
  const ok = await ensureXLSX();
  if (!ok) return null;
  try {
    const wb = window.XLSX.read(rec.data, { type: 'array', cellStyles: true, cellNF: true, cellDates: true });
    auditCurrent.wb = wb;
    return wb;
  } catch {
    return null;
  }
}

function auditSetWsCellString(ws, addr, value) {
  if (!ws || !addr) return;
  const existing = ws[addr];
  if (existing) {
    existing.v = String(value ?? '');
    existing.t = 's';
    if (existing.w) delete existing.w;
    return;
  }
  ws[addr] = { t: 's', v: String(value ?? '') };
}

function auditExpandRef(ws, addr) {
  try {
    const ref = ws['!ref'];
    const r = window.XLSX.utils.decode_cell(addr);
    const cur = ref ? window.XLSX.utils.decode_range(ref) : { s: { r: r.r, c: r.c }, e: { r: r.r, c: r.c } };
    if (r.r < cur.s.r) cur.s.r = r.r;
    if (r.c < cur.s.c) cur.s.c = r.c;
    if (r.r > cur.e.r) cur.e.r = r.r;
    if (r.c > cur.e.c) cur.e.c = r.c;
    ws['!ref'] = window.XLSX.utils.encode_range(cur);
  } catch {
    // ignore
  }
}

function auditFillWorkbookAnswers(wb, results) {
  if (!wb || !Array.isArray(results)) return;
  for (const r of results) {
    if (!r || !r.answerAddr || !r.sheet) continue;
    const ws = wb.Sheets && wb.Sheets[r.sheet];
    if (!ws) continue;
    const addr = String(r.answerAddr);
    const value = r.answer || '';
    auditSetWsCellString(ws, addr, value);
    auditExpandRef(ws, addr);
  }
}

function renderAudit() {
  renderAuditUploads();

  const empty = document.getElementById('auditEmptyState');
  const wrap = document.getElementById('auditResultsWrap');
  const badge = document.getElementById('auditCountBadge');
  const tableBody = document.querySelector('#auditTable tbody');
  if (!empty || !wrap || !badge || !tableBody) return;

  if (!auditCurrent || !Array.isArray(auditCurrent.results) || !auditCurrent.results.length) {
    empty.style.display = 'block';
    wrap.style.display = 'none';
    badge.textContent = '0 rows';
    return;
  }

  auditRecomputeStatuses();

  const rows = auditCurrent.results.filter((r) => {
    if (auditFilter === 'auto') return r.status === 'Auto';
    if (auditFilter === 'manual') return r.status === 'Manual';
    return true;
  });

  empty.style.display = 'none';
  wrap.style.display = 'block';
  badge.textContent = `${rows.length} rows`;

  tableBody.innerHTML = rows
    .map((r) => {
      const conf = Number(r.confidence || 0);
      const confCls = conf >= 0.8 ? 'high' : conf >= 0.6 ? 'med' : 'low';
      const confTxt = conf.toFixed(2);
      const statusCls = r.status === 'Auto' ? 'auto' : 'manual';
      const sourceQ = r.sourceQuestion ? escapeHtml(r.sourceQuestion) : 'â€”';
      return `<tr>
        <td>${escapeHtml(r.question)}</td>
        <td>
          <textarea class="ans-edit" data-audit-row="${escapeHtml(String(r.rowIndex))}">${escapeHtml(r.answer || '')}</textarea>
          <div class="upload-meta" style="margin-top:6px">Suggested: ${escapeHtml(r.suggested || '')}</div>
        </td>
        <td><span class="conf ${confCls}">${confTxt}</span></td>
        <td>${sourceQ}</td>
        <td><span class="status-pill ${statusCls}">${escapeHtml(r.status)}</span></td>
      </tr>`;
    })
    .join('');
}

function auditApplyEditsFromTable() {
  if (!auditCurrent || !Array.isArray(auditCurrent.results)) return;
  document.querySelectorAll('textarea.ans-edit[data-audit-row]').forEach((el) => {
    if (!(el instanceof HTMLTextAreaElement)) return;
    const idx = Number(el.getAttribute('data-audit-row'));
    const rec = auditCurrent.results.find((r) => r.rowIndex === idx);
    if (rec) rec.answer = el.value;
  });
  saveAuditCurrent();
}

function auditFillAnswers() {
  if (!auditCurrent || !Array.isArray(auditCurrent.results)) return;
  for (const r of auditCurrent.results) r.answer = r.suggested || '';
  saveAuditCurrent();
  renderAudit();
}

async function auditExportFilled() {
  if (!auditCurrent) return;
  auditApplyEditsFromTable();

  const ext = auditCurrent.ext;
  if (ext === 'xlsx' || ext === 'xls') {
    const ok = await ensureXLSX();
    if (!ok) {
      alert('XLSX export requires the xlsx library (CDN).');
      return;
    }
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // Prefer filling into the original workbook to preserve the lender template layout.
    const wb = await auditLoadWorkbookForCurrent();
    if (wb && auditCurrent.kind === 'xlsx' && Array.isArray(auditCurrent.results)) {
      auditFillWorkbookAnswers(wb, auditCurrent.results);
      const base = String(auditCurrent.name || 'audit').replace(/\.(xlsx|xls)$/i, '');
      const bookType = ext === 'xls' ? 'xls' : 'xlsx';
      const out = window.XLSX.write(wb, { bookType, type: 'array', cellStyles: true });
      const mime =
        bookType === 'xls'
          ? 'application/vnd.ms-excel'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([out], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `filled_${base}.${bookType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
      return;
    }
    // Fall back to AOA-based export if we can't load the original workbook.
  }

  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
    const aoa = auditCurrent.aoa ? auditCurrent.aoa.map((r) => (r ? [...r] : [])) : [];
    if (!aoa.length) {
      // No original structure available (e.g. after refresh) â€” fall back to CSV export.
      const escapeCsv = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      const csv = ['Question,Answer']
        .concat((auditCurrent.results || []).map((r) => `${escapeCsv(r.question)},${escapeCsv(r.answer || '')}`))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `filled_${auditCurrent.name || 'audit'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
      return;
    }

    const header = aoa[0] || [];
    let aIdx = auditCurrent.aIdx;
    if (aIdx < 0) {
      aIdx = header.length;
      header[aIdx] = 'Answer';
    }
    aoa[0] = header;

    for (const r of auditCurrent.results) {
      const row = aoa[r.rowIndex] || [];
      row[aIdx] = r.answer || '';
      aoa[r.rowIndex] = row;
    }

    if (ext === 'csv') {
      const escapeCsv = (v) => {
        const s = String(v ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
        return s;
      };
      const csv = aoa.map((row) => (row || []).map(escapeCsv).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `filled_${auditCurrent.name || 'audit'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
      return;
    }

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `filled_${auditCurrent.name || 'audit'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1200);
    return;
  }

  // DOCX: export CSV (Question, Answer)
  const escapeCsv = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = ['Question,Answer']
    .concat((auditCurrent.results || []).map((r) => `${escapeCsv(r.question)},${escapeCsv(r.answer || '')}`))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `filled_${auditCurrent.name || 'audit'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

async function auditProcessFile(file) {
  if (!file) return;
  setAuditSelectedFile(`${file.name} (${Math.round(file.size / 1024)} KB)`);
  setAuditStatus('Processing...');

  const name = String(file.name || 'audit');
  const ext = name.toLowerCase().split('.').pop();

  let aoa = [];
  try {
    if (ext === 'csv') {
      aoa = parseCSV(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      const ok = await ensureXLSX();
      if (!ok) throw new Error('XLSX requires the xlsx library (CDN).');
      const ab = await file.arrayBuffer();
      const wb = window.XLSX.read(ab, { type: 'array', cellStyles: true, cellNF: true, cellDates: true });

      // Try lender-template parsing first (sections + questions + answer cells).
      let extracted = [];
      try {
        extracted = auditExtractXlsxResults(wb) || [];
      } catch {
        extracted = [];
      }

      const results = [];
      if (extracted.length) {
        for (const x of extracted) {
          const q = String(x.question || '').trim();
          if (!q) continue;
          const best = auditBestKBMatch(q);
          const score = best ? Number(best.score || 0) : 0;
          const hasKbAnswer = !!(best && best.entry && best.entry.answer);
          const suggested = hasKbAnswer
            ? String(best.entry.answer)
            : 'No answer found in knowledge base. Manual response required.';
          const auto = hasKbAnswer && clamp01(score) >= auditThreshold;
          results.push({
            rowIndex: x.rowIndex,
            sheet: x.sheet,
            questionAddr: x.questionAddr,
            answerAddr: x.answerAddr,
            section: x.section || null,
            question: q,
            suggested,
            answer: auto ? suggested : '',
            confidence: clamp01(score),
            sourceQuestion: hasKbAnswer ? String(best.entry.question || '') : null,
            status: auto ? 'Auto' : 'Manual',
            hasKbAnswer,
          });
        }
      } else {
        // Fallback: treat first sheet like a table while still exporting into the original workbook.
        const firstName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstName];
        const table = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        const tableAoa = (table || []).map((r) => (r || []).map((c) => String(c ?? '').trim()));
        const header = tableAoa[0] || [];
        const qIdx = auditPickQuestionColumn(header);
        const aIdx = auditPickAnswerColumn(header);
        const headerLooksLikeText = header.some((h) => /[a-zA-Z]/.test(String(h || '')));
        const startRow = headerLooksLikeText ? 1 : 0;
        const answerCol = aIdx >= 0 ? aIdx : Math.max(0, qIdx + 1);
        let rid = 0;

        for (let i = startRow; i < tableAoa.length; i++) {
          const row = tableAoa[i] || [];
          const q = String(row[qIdx] ?? '').trim();
          if (!q) continue;
          const best = auditBestKBMatch(q);
          const score = best ? Number(best.score || 0) : 0;
          const hasKbAnswer = !!(best && best.entry && best.entry.answer);
          const suggested = hasKbAnswer
            ? String(best.entry.answer)
            : 'No answer found in knowledge base. Manual response required.';
          const auto = hasKbAnswer && clamp01(score) >= auditThreshold;
          results.push({
            rowIndex: ++rid,
            sheet: firstName,
            questionAddr: window.XLSX.utils.encode_cell({ r: i, c: qIdx }),
            answerAddr: window.XLSX.utils.encode_cell({ r: i, c: answerCol }),
            section: null,
            question: q,
            suggested,
            answer: auto ? suggested : '',
            confidence: clamp01(score),
            sourceQuestion: hasKbAnswer ? String(best.entry.question || '') : null,
            status: auto ? 'Auto' : 'Manual',
            hasKbAnswer,
          });
        }
      }

      const uploadId = `up_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      await idbPutFile(uploadId, name, ext, ab);

      auditCurrent = {
        uploadId,
        name,
        ext,
        kind: 'xlsx',
        ts: nowISO(),
        aoa: null,
        qIdx: 0,
        aIdx: -1,
        startRow: 0,
        results,
        wb, // in-memory only
      };

      auditUploads.push({ id: uploadId, name, ts: auditCurrent.ts, status: 'Processed' });
      auditUploads = auditUploads.slice(-30);
      saveAuditUploads();
      saveAuditCurrent();

      setAuditStatus(`Processed ${results.length} questions.`);
      renderAuditUploads();
      renderAudit();
      return;
    } else if (ext === 'docx') {
      const ok = await ensureMammoth();
      if (!ok) throw new Error('DOCX requires the mammoth library (CDN).');
      const ab = await file.arrayBuffer();
      const out = await window.mammoth.extractRawText({ arrayBuffer: ab });
      const text = String(out?.value || '').trim();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const qs = lines.filter((l) => l.endsWith('?') || /^q\d+\b/i.test(l) || /^\d+\./.test(l));
      const picked = qs.length ? qs : lines;
      aoa = [['Question'], ...picked.map((q) => [q])];
    } else {
      throw new Error('Unsupported file type. Use CSV, XLSX, or DOCX.');
    }

    const header = aoa[0] || [];
    const qIdx = auditPickQuestionColumn(header);
    const aIdx = auditPickAnswerColumn(header);
    const headerLooksLikeText = header.some((h) => /[a-zA-Z]/.test(String(h || '')));
    const startRow = headerLooksLikeText ? 1 : 0;

    const results = [];
    for (let i = startRow; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const q = String(row[qIdx] ?? '').trim();
      if (!q) continue;

      const best = auditBestKBMatch(q);
      const score = best ? Number(best.score || 0) : 0;
      const hasKbAnswer = !!(best && best.entry && best.entry.answer);
      const suggested = hasKbAnswer ? String(best.entry.answer) : 'No answer found in knowledge base. Manual response required.';
      const auto = hasKbAnswer && clamp01(score) >= auditThreshold;
      results.push({
        rowIndex: i,
        question: q,
        suggested,
        answer: auto ? suggested : '',
        confidence: clamp01(score),
        sourceQuestion: hasKbAnswer ? String(best.entry.question || '') : null,
        status: auto ? 'Auto' : 'Manual',
        hasKbAnswer,
      });
    }

    const uploadId = `up_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    auditCurrent = { uploadId, name, ext, kind: 'tabular', ts: nowISO(), aoa, qIdx, aIdx, startRow, results };
    auditUploads.push({ id: uploadId, name, ts: auditCurrent.ts, status: 'Processed' });
    auditUploads = auditUploads.slice(-30);
    saveAuditUploads();
    saveAuditCurrent();

    setAuditStatus(`Processed ${results.length} questions.`);
    renderAuditUploads();
    renderAudit();
  } catch (e) {
    setAuditStatus(e?.message || String(e));
    auditCurrent = null;
    saveAuditCurrent();
    renderAudit();
  }
}

function initAuditUI() {
  loadAuditSettings();
  auditUploads = loadAuditUploads();
  auditCurrent = loadAuditCurrent();
  if (auditCurrent?.name) setAuditSelectedFile(auditCurrent.name);
  renderAuditUploads();

  const templateBtn = document.getElementById('auditTemplateBtn');
  const pickBtn = document.getElementById('auditPickBtn');
  const fileInput = document.getElementById('auditFileInput');
  const clearBtn = document.getElementById('auditClearUploadsBtn');
  const slider = document.getElementById('auditThreshold');
  const lbl = document.getElementById('auditThresholdLabel');
  const filter = document.getElementById('auditFilter');

  templateBtn?.addEventListener('click', auditDownloadTemplate);
  pickBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    if (!(fileInput instanceof HTMLInputElement)) return;
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (f) auditProcessFile(f);
  });

  clearBtn?.addEventListener('click', () => {
    if (!confirm('Clear upload history?')) return;
    auditUploads = [];
    auditCurrent = null;
    saveAuditUploads();
    saveAuditCurrent();
    setAuditSelectedFile('No file selected.');
    setAuditStatus('');
    renderAuditUploads();
    renderAudit();
    idbClearFiles();
  });

  if (slider instanceof HTMLInputElement) slider.value = auditThreshold.toFixed(2);
  if (lbl) lbl.textContent = auditThreshold.toFixed(2);
  slider?.addEventListener('input', () => {
    const v = slider instanceof HTMLInputElement ? Number(slider.value) : auditThreshold;
    auditThreshold = clamp01(v);
    if (auditThreshold < 0.5) auditThreshold = 0.7;
    if (lbl) lbl.textContent = auditThreshold.toFixed(2);
    saveAuditSettings();
    renderAudit();
  });

  if (filter instanceof HTMLSelectElement) filter.value = auditFilter;
  filter?.addEventListener('change', () => {
    if (!(filter instanceof HTMLSelectElement)) return;
    auditFilter = filter.value || 'all';
    saveAuditSettings();
    renderAudit();
  });

  document.getElementById('auditFillBtn')?.addEventListener('click', auditFillAnswers);
  document.getElementById('auditExportBtn')?.addEventListener('click', auditExportFilled);

  document.getElementById('auditUploadsList')?.addEventListener('click', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const del = t.getAttribute('data-upload-del');
    if (!del) return;
    if (!confirm('Remove this file from Recent Uploads?')) return;
    auditUploads = auditUploads.filter((u) => String(u?.id || '') !== String(del));
    saveAuditUploads();
    renderAuditUploads();
    await idbDeleteFile(String(del));

    // If this is the current audit, clear questions/results too.
    if (auditCurrent && String(auditCurrent.uploadId || '') === String(del)) {
      auditCurrent = null;
      saveAuditCurrent();
      setAuditSelectedFile('No file selected.');
      setAuditStatus('');
      renderAudit();
    }
  });

  document.getElementById('auditTable')?.addEventListener('input', (e) => {
    const t = e.target;
    if (t instanceof HTMLTextAreaElement && t.classList.contains('ans-edit')) {
      auditApplyEditsFromTable();
    }
  });

  renderAudit();
}

async function kbLoadFromBackend() {
  setStatus('Loading...');
  try {
    const res = await fetch(joinApi('/api/kb/list'), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    kbEntries = Array.isArray(data) ? data : [];
    setStatus('');
  } catch (e) {
    setStatus(
      window.location.protocol === 'file:'
        ? 'Backend not reachable. Start backend and open via http://127.0.0.1:8000/'
        : 'Backend not reachable (KB).',
    );
    kbEntries = [];
  }
  renderKB();
}

async function kbSaveToBackend() {
  setStatus('Saving...');
  try {
    const url = joinApi('/api/kb/replace');
    const payload = JSON.stringify(kbEntries);

    let res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    // Some environments/proxies block PUT; backend also accepts POST.
    if (res.status === 405) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    }

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${msg ? `: ${msg}` : ''}`);
    }
    setStatus('Saved.');
    setTimeout(() => setStatus(''), 900);
    return true;
  } catch (e) {
    setStatus(`Save failed (backend). ${e?.message ? String(e.message) : ''}`.trim());
    return false;
  }
}

function kbExport() {
  const blob = new Blob([JSON.stringify(kbEntries, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `knowledge_base_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (ch === '\r') {
      // ignore
    } else {
      cur += ch;
    }
  }

  row.push(cur);
  rows.push(row);
  return rows.map((r) => r.map((c) => String(c ?? '').trim()));
}

function pickColumn(headerRow, candidates) {
  const hdr = headerRow.map((h) => normalizeForSearch(h));
  for (const name of candidates) {
    const idx = hdr.findIndex((h) => h === name || h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function guessKBImportSpec(rows) {
  const header = rows[0] || [];
  const qIdx = pickColumn(header, ['question']) >= 0 ? pickColumn(header, ['question']) : 0;
  const aIdx = (() => {
    const idx = pickColumn(header, ['answer', 'response', 'remarks', 'comment']);
    return idx >= 0 ? idx : Math.min(1, Math.max(0, header.length - 1));
  })();
  const cIdx = pickColumn(header, ['category', 'domain', 'section']);

  // If header row looks like real headers, start at row 1. Otherwise start at 0.
  const headerLooksLikeText = header.some((h) => /[a-zA-Z]/.test(String(h || '')));
  const startRow = headerLooksLikeText ? 1 : 0;
  return { qIdx, aIdx, cIdx, startRow };
}

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function ensureXLSX() {
  if (window.XLSX) return true;
  return loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
}

async function ensureMammoth() {
  if (window.mammoth) return true;
  return loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
}

// ---- IndexedDB: persist uploaded files across refresh (for XLSX export preservation)
function openFilesDb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('auditai_files_db_v1', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutFile(id, name, ext, data) {
  const db = await openFilesDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put({ id, name, ext, data });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbGetFile(id) {
  const db = await openFilesDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files', 'readonly');
      const req = tx.objectStore('files').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbDeleteFile(id) {
  const db = await openFilesDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbClearFiles() {
  const db = await openFilesDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function kbImportFromFile(file) {
  if (!file) return;
  setStatus('Importing...');

  try {
    const name = String(file.name || '').toLowerCase();
    const ext = name.split('.').pop();
    const imported = [];

    if (ext === 'json') {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('JSON must be an array of entries.');
      for (const o of data) {
        const question = String(o?.question ?? o?.Question ?? '').trim();
        const answer = String(o?.answer ?? o?.Answer ?? '').trim();
        const category = String(o?.category ?? o?.Category ?? '').trim() || null;
        if (!question || !answer) continue;
        imported.push({
          id: `kb_${Math.random().toString(16).slice(2)}_${Date.now()}`,
          question,
          answer,
          category,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (ext === 'csv') {
      const rows = parseCSV(await file.text());
      const clean = rows.filter((r) => r.some((c) => String(c ?? '').trim()));
      if (!clean.length) throw new Error('Empty CSV.');
      const { qIdx, aIdx, cIdx, startRow } = guessKBImportSpec(clean);
      for (let i = startRow; i < clean.length; i++) {
        const r = clean[i] || [];
        const question = String(r[qIdx] ?? '').trim();
        const answer = String(r[aIdx] ?? '').trim();
        const category = (cIdx >= 0 ? String(r[cIdx] ?? '').trim() : '') || null;
        if (!question || !answer) continue;
        imported.push({
          id: `kb_${Math.random().toString(16).slice(2)}_${Date.now()}`,
          question,
          answer,
          category,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const ok = await ensureXLSX();
      if (!ok) throw new Error('XLSX import needs the xlsx library (CDN). Use JSON/CSV if offline.');
      const ab = await file.arrayBuffer();
      const wb = window.XLSX.read(ab, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      const norm = (rows || []).map((r) => (r || []).map((c) => String(c ?? '').trim()));
      const clean = norm.filter((r) => r.some((c) => String(c ?? '').trim()));
      if (!clean.length) throw new Error('Empty XLSX.');
      const { qIdx, aIdx, cIdx, startRow } = guessKBImportSpec(clean);
      for (let i = startRow; i < clean.length; i++) {
        const r = clean[i] || [];
        const question = String(r[qIdx] ?? '').trim();
        const answer = String(r[aIdx] ?? '').trim();
        const category = (cIdx >= 0 ? String(r[cIdx] ?? '').trim() : '') || null;
        if (!question || !answer) continue;
        imported.push({
          id: `kb_${Math.random().toString(16).slice(2)}_${Date.now()}`,
          question,
          answer,
          category,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      throw new Error('Unsupported file type. Use JSON, CSV, or XLSX.');
    }

    if (!imported.length) throw new Error('No valid KB entries found.');

    kbEntries = [...imported, ...kbEntries];
    const saved = await kbSaveToBackend();
    if (!saved) return;

    setStatus(`Imported ${imported.length} entries.`);
    setTimeout(() => setStatus(''), 1200);
    renderKB();
  } catch (e) {
    setStatus('Import failed.');
    alert(e?.message || String(e));
  }
}

function kbOpenNew() {
  const idEl = document.getElementById('kbEntryId');
  const cEl = document.getElementById('kbEntryCategory');
  const qEl = document.getElementById('kbEntryQuestion');
  const aEl = document.getElementById('kbEntryAnswer');
  const sEl = document.getElementById('kbEntryStatus');
  if (!idEl || !cEl || !qEl || !aEl || !sEl) return;

  idEl.value = '';
  cEl.value = '';
  qEl.value = '';
  aEl.value = '';
  sEl.textContent = 'Saved answers are used verbatim.';
  document.getElementById('kbDeleteBtn')?.setAttribute('disabled', 'true');
  openModal('kbEntryModal');
}

function kbOpenEdit(id) {
  const entry = kbEntries.find((e) => e.id === id);
  if (!entry) return;

  const idEl = document.getElementById('kbEntryId');
  const cEl = document.getElementById('kbEntryCategory');
  const qEl = document.getElementById('kbEntryQuestion');
  const aEl = document.getElementById('kbEntryAnswer');
  const sEl = document.getElementById('kbEntryStatus');
  if (!idEl || !cEl || !qEl || !aEl || !sEl) return;

  idEl.value = entry.id || '';
  cEl.value = entry.category || '';
  qEl.value = entry.question || '';
  aEl.value = entry.answer || '';
  sEl.textContent = `Editing entry: ${entry.id}`;
  document.getElementById('kbDeleteBtn')?.removeAttribute('disabled');
  openModal('kbEntryModal');
}

async function kbDelete(id) {
  const entry = kbEntries.find((e) => e.id === id);
  if (!entry) return;
  if (!confirm('Delete this knowledge base entry?')) return;
  kbEntries = kbEntries.filter((e) => e.id !== id);
  await kbSaveToBackend();
  renderKB();
}

async function kbSaveFromModal() {
  const idEl = document.getElementById('kbEntryId');
  const cEl = document.getElementById('kbEntryCategory');
  const qEl = document.getElementById('kbEntryQuestion');
  const aEl = document.getElementById('kbEntryAnswer');
  const sEl = document.getElementById('kbEntryStatus');
  if (!idEl || !cEl || !qEl || !aEl || !sEl) return;

  const rawId = (idEl.value || '').trim();
  const id = rawId || `kb_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const category = (cEl.value || '').trim() || null;
  const question = (qEl.value || '').trim();
  const answer = (aEl.value || '').trim();

  if (!question || !answer) {
    sEl.textContent = 'Question and Answer are required.';
    return;
  }

  const idx = kbEntries.findIndex((e) => e.id === id);
  const createdAt = idx === -1 ? new Date().toISOString() : kbEntries[idx]?.createdAt;
  const next = { id, category, question, answer, createdAt };
  if (idx === -1) kbEntries.unshift(next);
  else kbEntries[idx] = next;

  const ok = await kbSaveToBackend();
  if (!ok) return;
  closeModal('kbEntryModal');
  renderKB();
}

async function kbDeleteFromModal() {
  const id = (document.getElementById('kbEntryId')?.value || '').trim();
  if (!id) {
    closeModal('kbEntryModal');
    return;
  }
  closeModal('kbEntryModal');
  await kbDelete(id);
}

function renderKB() {
  const tbody = document.querySelector('#kbTable tbody');
  const filter = document.getElementById('kbCategoryFilter');
  const search = document.getElementById('kbSearch');
  const badge = document.getElementById('kbCountBadge');
  if (!tbody || !filter || !search || !badge) return;

  const query = normalizeForSearch(search.value || '');
  const category = filter.value || 'all';

  const categories = [...new Set(kbEntries.map((e) => e.category).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
  const prev = filter.value;
  filter.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (prev && categories.includes(prev)) filter.value = prev;

  const rows = kbEntries.filter((e) => {
    if (category !== 'all' && String(e.category || '') !== category) return false;
    if (!query) return true;
    return (
      normalizeForSearch(e.question).includes(query) ||
      normalizeForSearch(e.answer).includes(query) ||
      normalizeForSearch(e.category || '').includes(query)
    );
  });

  badge.textContent = `${rows.length} entries`;

  tbody.innerHTML = rows
    .map((e) => {
      const cat = e.category || 'â€”';
      return `<tr>
        <td>${escapeHtml(e.question)}</td>
        <td>${escapeHtml(e.answer)}</td>
        <td style="color: var(--muted)">${escapeHtml(cat)}</td>
        <td>
          <div class="kb-actions-cell">
            <button class="mini-btn primary" type="button" data-kb-edit="${escapeHtml(e.id)}">Edit</button>
            <button class="mini-btn danger" type="button" data-kb-del="${escapeHtml(e.id)}">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join('');
}

function initKBUI() {
  document.getElementById('kbAddBtn')?.addEventListener('click', kbOpenNew);
  document.getElementById('kbRefreshBtn')?.addEventListener('click', kbLoadFromBackend);
  document.getElementById('kbExportBtn')?.addEventListener('click', kbExport);
  document.getElementById('kbImportBtn')?.addEventListener('click', () => document.getElementById('kbImportInput')?.click());
  document.getElementById('kbSaveBtn')?.addEventListener('click', kbSaveFromModal);
  document.getElementById('kbDeleteBtn')?.addEventListener('click', kbDeleteFromModal);
  document.getElementById('kbCancelBtn')?.addEventListener('click', () => closeModal('kbEntryModal'));
  document.getElementById('kbModalClose')?.addEventListener('click', () => closeModal('kbEntryModal'));

  document.getElementById('kbSearch')?.addEventListener('input', renderKB);
  document.getElementById('kbCategoryFilter')?.addEventListener('change', renderKB);
  document.getElementById('kbImportInput')?.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const f = input.files && input.files[0];
    input.value = '';
    if (f) kbImportFromFile(f);
  });

  const modalBg = document.getElementById('kbEntryModal');
  modalBg?.addEventListener('click', (e) => {
    if (e.target === modalBg) closeModal('kbEntryModal');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal('kbEntryModal');
  });

  document.getElementById('kbTable')?.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const editId = t.getAttribute('data-kb-edit');
    if (editId) {
      kbOpenEdit(editId);
      return;
    }
    const delId = t.getAttribute('data-kb-del');
    if (delId) {
      kbDelete(delId);
    }
  });
}

function initNav() {
  document.querySelectorAll('.sidebar nav a[data-view]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setView(a.dataset.view);
    });
  });
}

function initApp() {
  initSidebar();
  initSidebarGroups();
  initSidebarIcons();
  initNav();
  initAuditUI();
  initKBUI();
  initChatUI();
  initBackendChip();
  initTrendChart();
  detectApiBase().then(async () => {
    await refreshBackendChip();
    kbLoadFromBackend();
    setInterval(refreshBackendChip, 5000);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
