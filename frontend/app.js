
// ── NAV ──
function nav(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'analytics') initCharts();
}

// ── ACCORDION ──
function toggleAcc(h) {
  h.classList.toggle('open');
  h.nextElementSibling.classList.toggle('open');
}

// ── INNER TABS ──
function switchInner(ns, id, btn) {
  const prefix = ns + '-';
  document.querySelectorAll('[id^="' + prefix + '"]').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(prefix + id);
  if (el) el.classList.add('active');
  btn.closest('.inner-tabs').querySelectorAll('.itab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── NOTIFICATIONS ──
function toggleNotif() {
  document.getElementById('notifPanel').classList.toggle('open');
}
function clearNotifs() {
  document.getElementById('notifPanel').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notifPanel') && !e.target.closest('.topbar-btn')) {
    document.getElementById('notifPanel').classList.remove('open');
  }
});

// ── MODALS ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── ANSWER EDITOR ──
function toggleEditor(id) {
  document.getElementById(id).classList.toggle('open');
}
function approveAnswer(btn) {
  const card = btn.closest('.rag-answer');
  card.style.borderColor = 'rgba(34,197,94,.3)';
  card.style.background = 'rgba(34,197,94,.04)';
  btn.textContent = '✓ Approved';
  btn.disabled = true;
}

// ── DOCS ──
const docs = [
  {name:'Acceptable Usage Policy',due:'30 Jun 2025',status:'complete',icon:'📄',ver:'v2.1'},
  {name:'Access Control Policy',due:'30 Jun 2025',status:'complete',icon:'🔑',ver:'v3.0'},
  {name:'Anti-Bribery & Corruption Policy',due:'30 Sep 2025',status:'complete',icon:'⚖',ver:'v1.4'},
  {name:'Anti-Virus Policy',due:'31 Jul 2025',status:'pending',icon:'🛡',ver:'v2.3'},
  {name:'Application List',due:'Quarterly',status:'inprogress',icon:'📋',ver:'Q2 2025'},
  {name:'Asset Management Policy',due:'30 Jun 2025',status:'complete',icon:'🖥',ver:'v2.0'},
  {name:'Backup Policy',due:'15 Jul 2025',status:'pending',icon:'💾',ver:'v1.8'},
  {name:'Business Impact Assessment',due:'30 Apr 2025',status:'overdue',icon:'📊',ver:'v2.2'},
  {name:'BYOD Policy',due:'31 Aug 2025',status:'complete',icon:'📱',ver:'v1.5'},
  {name:'Change Management Policy',due:'30 Jun 2025',status:'complete',icon:'🔄',ver:'v2.1'},
  {name:'Clean Desk Policy',due:'30 Sep 2025',status:'complete',icon:'🗂',ver:'v1.2'},
  {name:'Cloud Security Policy',due:'15 Jul 2025',status:'inprogress',icon:'☁',ver:'v2.0'},
  {name:'Computing Devices Hardening Policy',due:'31 Jul 2025',status:'pending',icon:'🖧',ver:'v1.7'},
  {name:'Cookie Policy',due:'30 Jun 2025',status:'complete',icon:'🍪',ver:'v1.3'},
  {name:'Cryptography & Key Management Policy',due:'15 Aug 2025',status:'pending',icon:'🔐',ver:'v1.6'},
  {name:'Cybersecurity Incident Management',due:'30 Jun 2025',status:'complete',icon:'🚨',ver:'v3.0'},
  {name:'Data Flow Diagram',due:'Quarterly',status:'inprogress',icon:'🔀',ver:'Q1 2025'},
  {name:'Data Management Policy',due:'30 Jun 2025',status:'complete',icon:'🗄',ver:'v2.4'},
  {name:'Data Transmission Policy',due:'30 Jul 2025',status:'pending',icon:'📡',ver:'v1.5'},
  {name:'Disaster Recovery Policy',due:'30 Jun 2025',status:'complete',icon:'♻',ver:'v3.1'},
  {name:'Human Resource Security Policy',due:'31 Aug 2025',status:'complete',icon:'👥',ver:'v2.0'},
  {name:'Incident Response Policy',due:'30 Jun 2025',status:'complete',icon:'🔥',ver:'v3.0'},
  {name:'Information Security Policy',due:'30 Jun 2025',status:'complete',icon:'🔒',ver:'v3.2'},
  {name:'Information Technology Policy',due:'30 Sep 2025',status:'complete',icon:'💻',ver:'v2.1'},
  {name:'Lender SaaS Data Management Policy',due:'15 Jul 2025',status:'inprogress',icon:'🏦',ver:'v1.2'},
  {name:'Logging & Monitoring Policy',due:'31 Jul 2025',status:'pending',icon:'📈',ver:'v1.4'},
  {name:'Media Handling & Disposal Policy',due:'30 Sep 2025',status:'complete',icon:'🗑',ver:'v1.6'},
  {name:'Network Diagram — Non-Prod',due:'Quarterly',status:'overdue',icon:'🌐',ver:'Q4 2024'},
  {name:'Network Diagram — Production',due:'Quarterly',status:'inprogress',icon:'🌐',ver:'Q1 2025'},
  {name:'Network Security Policy',due:'30 Jun 2025',status:'complete',icon:'🔌',ver:'v2.3'},
  {name:'Onboarding & Offboarding Policy',due:'31 Aug 2025',status:'complete',icon:'🤝',ver:'v2.0'},
  {name:'Organizational Chart',due:'Quarterly',status:'complete',icon:'🏢',ver:'Q2 2025'},
  {name:'Password Protection Policy',due:'30 Jun 2025',status:'complete',icon:'🔑',ver:'v2.5'},
  {name:'Patch Management Policy',due:'15 Jul 2025',status:'pending',icon:'🩹',ver:'v2.3'},
  {name:'Physical Security Policy',due:'30 Sep 2025',status:'complete',icon:'🏛',ver:'v1.8'},
  {name:'Risk Assessment',due:'Annual',status:'inprogress',icon:'⚠',ver:'FY25 Draft'},
  {name:'SaaS Change Management Policy',due:'30 Jun 2025',status:'complete',icon:'🔄',ver:'v1.3'},
  {name:'Scoping List of Facilities',due:'Annual',status:'overdue',icon:'📍',ver:'FY24'},
  {name:'Secure Coding Policy',due:'31 Jul 2025',status:'pending',icon:'💻',ver:'v1.9'},
  {name:'Software Development Lifecycle Policy',due:'30 Jun 2025',status:'complete',icon:'⚙',ver:'v2.2'},
  {name:'System Hardening Policy — Cloud',due:'31 Jul 2025',status:'inprogress',icon:'☁',ver:'v1.4'},
  {name:'Third Party Security Policy',due:'15 Jul 2025',status:'pending',icon:'🤝',ver:'v2.0'},
  {name:'VAPT Policy',due:'30 Jun 2025',status:'complete',icon:'🔍',ver:'v2.1'},
  {name:'Application Security Policy',due:'31 Aug 2025',status:'pending',icon:'📱',ver:'v1.0'},
];
const slabels = {complete:'Current',pending:'Review Due',overdue:'Overdue',inprogress:'In Review'};
const sbadge = {complete:'b-green',pending:'b-amber',overdue:'b-red',inprogress:'b-blue'};
let docFilter = 'all';

function renderDocs() {
  const q = (document.getElementById('docSearch')||{}).value||'';
  const grid = document.getElementById('docGrid');
  if (!grid) return;
  const filtered = docs.filter(d => {
    const mf = docFilter === 'all' || d.status === docFilter;
    const ms = d.name.toLowerCase().includes(q.toLowerCase());
    return mf && ms;
  });
  grid.innerHTML = filtered.map(d => `
    <div class="doc-card">
      <div class="doc-icon">${d.icon}</div>
      <div class="doc-info">
        <div class="doc-name" title="${d.name}">${d.name}</div>
        <div class="doc-due">Due: ${d.due}</div>
        <div class="doc-version">${d.ver}</div>
      </div>
      <span class="badge ${sbadge[d.status]}">${slabels[d.status]}</span>
    </div>`).join('');
}
function filterDocs() { renderDocs(); }
function setDocFilter(f, btn) {
  docFilter = f;
  document.querySelectorAll('.filters .fb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDocs();
}
renderDocs();

// ── EXPORT ──
function exportPDF() { alert('Generating PDF report... (In production: Puppeteer/WeasyPrint generates branded PDF with cover page, compliance summary, and all Q&A pairs)'); }
function exportXLSX() { alert('Generating XLSX export... (In production: SheetJS creates multi-sheet workbook with all audit data, risk register, and trend charts)'); }
function simulateUpload() { openModal('uploadModal'); }

// ── AI Cybersecurity Audit Assistant (KB-only prototype) ──
const SA_STORAGE = {
  KB: 'sa_kb_v1',
  AUDITS: 'sa_audits_v1',
  CHAT: 'sa_chat_v1',
  SETTINGS: 'sa_settings_v1'
};

const SA_DEFAULT_THRESHOLD = 0.80;
const SA_AUDIT_AUTO_THRESHOLD = 0.70;
let saKbThreshold = SA_DEFAULT_THRESHOLD;
let saAuditResultFilter = 'all';
let saActiveAuditId = null;
let saAuditEditing = null; // { auditId, idx }
let saAuditModalFile = null;
let saKbIndex = null;
let saBackendOk = false;

function saLoadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saSaveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function saNowISO() { return new Date().toISOString(); }
function saId(prefix) { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }
function saClamp01(v) { return Math.max(0, Math.min(1, v)); }
function saFmtPct(v) { return `${Math.round(v * 100)}%`; }

async function saFetchJSON(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function saBackendHealth() {
  try {
    const r = await saFetchJSON('/api/health', { method: 'GET' });
    return !!r?.ok;
  } catch {
    return false;
  }
}

async function saSyncKBFromBackend() {
  if (!saBackendOk) return;
  try {
    const kb = await saFetchJSON('/api/kb/list', { method: 'GET' });
    if (Array.isArray(kb) && kb.length) {
      kbSetAll(kb);
    } else {
      saPushKBToBackend(kbGetAll());
    }
  } catch {
    // ignore (offline mode)
  }
}

function saPushKBToBackend(entries) {
  if (!saBackendOk) return;
  fetch('/api/kb/replace', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries)
  }).catch(() => {});
}

function saEscapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;');
}

function saLoadSettings() {
  const s = saLoadJSON(SA_STORAGE.SETTINGS, {});
  if (typeof s.kbThreshold === 'number') saKbThreshold = s.kbThreshold;
}
function saSaveSettings() {
  const s = saLoadJSON(SA_STORAGE.SETTINGS, {});
  s.kbThreshold = saKbThreshold;
  saSaveJSON(SA_STORAGE.SETTINGS, s);
}

function setKBThreshold(v) {
  saKbThreshold = saClamp01(v);
  const lbl = document.getElementById('kbThresholdLabel');
  if (lbl) lbl.textContent = saKbThreshold.toFixed(2);
  const slider = document.getElementById('kbThreshold');
  if (slider && Number(slider.value) !== saKbThreshold) slider.value = String(saKbThreshold);
  saSaveSettings();
}

function saDefaultKB() {
  return [
    { id: saId('kb'), question: 'Is multi-factor authentication enabled for privileged accounts?', answer: 'Yes. Multi-factor authentication is required for privileged accounts.', category: 'Access Control', createdAt: saNowISO() },
    { id: saId('kb'), question: 'Are firewall logs monitored?', answer: 'Yes. Firewall logs are monitored and integrated into SIEM for correlation and alerting.', category: 'Logging & Monitoring', createdAt: saNowISO() },
    { id: saId('kb'), question: 'Do you encrypt cardholder data at rest and in transit?', answer: 'Yes. Cardholder data is encrypted at rest using AES-256 and in transit using TLS 1.2+.', category: 'Encryption', createdAt: saNowISO() },
    { id: saId('kb'), question: 'Do you conduct vulnerability assessment and penetration testing (VAPT) regularly?', answer: 'Yes. Vulnerability scans are performed regularly and penetration tests are conducted at least annually and after major changes.', category: 'Vulnerability Management', createdAt: saNowISO() }
  ];
}

function kbGetAll() {
  const kb = saLoadJSON(SA_STORAGE.KB, null);
  if (Array.isArray(kb) && kb.length) return kb;
  const seeded = saDefaultKB();
  saSaveJSON(SA_STORAGE.KB, seeded);
  return seeded;
}
function kbSetAll(entries) {
  saSaveJSON(SA_STORAGE.KB, entries);
  saKbIndex = null;
  saPushKBToBackend(entries);
}

const SA_STOPWORDS = new Set([
  'a','an','the','and','or','to','of','in','on','for','with','is','are','do','does','did','we','you','your','our','be','been','being',
  'it','this','that','these','those','as','at','by','from','into','over','under','within','across','per','via','can','will','shall','should','may',
  'provide','please','details','describe','explain'
]);

const SA_EXPANSIONS = [
  [/\bmfa\b/g, 'multi factor authentication'],
  [/\b2fa\b/g, 'two factor authentication'],
  [/\bsiem\b/g, 'security information and event management'],
  [/\bvapt\b/g, 'vulnerability assessment and penetration testing'],
  [/\badmins?\b/g, 'administrator privileged'],
  [/\badministrators?\b/g, 'administrator privileged'],
  [/\bprivileged\b/g, 'administrator privileged'],
  [/\bcardholder\b/g, 'card holder'],
  [/\bfirewall logs\b/g, 'firewall log']
];

function saNormalizeForMatch(text) {
  let s = String(text ?? '').toLowerCase();
  for (const [re, rep] of SA_EXPANSIONS) s = s.replace(re, rep);
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s;
}

function saTokenize(text) {
  const norm = saNormalizeForMatch(text);
  if (!norm) return [];
  return norm.split(/\s+/).filter(t => t && !SA_STOPWORDS.has(t) && t.length > 1);
}

function saBuildIndex(entries) {
  const N = entries.length || 1;
  const docs = entries.map(e => saTokenize(e.question));
  const df = new Map();
  for (const tokens of docs) {
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const [t, d] of df.entries()) idf.set(t, Math.log((N + 1) / (d + 1)) + 1);

  const vectors = new Map();
  for (let i = 0; i < entries.length; i++) {
    const tokens = docs[i];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    let norm = 0;
    for (const [t, c] of tf.entries()) {
      const w = (1 + Math.log(c)) * (idf.get(t) || 0);
      if (!w) continue;
      vec.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    vectors.set(entries[i].id, { vec, norm, tokens: new Set(tokens) });
  }
  return { idf, vectors };
}

function saCosine(aVec, aNorm, bVec, bNorm) {
  let dot = 0;
  const [small, big] = aVec.size <= bVec.size ? [aVec, bVec] : [bVec, aVec];
  for (const [t, w] of small.entries()) {
    const bw = big.get(t);
    if (bw) dot += w * bw;
  }
  return dot / ((aNorm || 1) * (bNorm || 1));
}

function saVectorizeQuery(tokens, idf) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map();
  let norm = 0;
  for (const [t, c] of tf.entries()) {
    const w = (1 + Math.log(c)) * (idf.get(t) || 0);
    if (!w) continue;
    vec.set(t, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  return { vec, norm, tokens: new Set(tokens) };
}

function saBestKBMatch(question) {
  const entries = kbGetAll();
  if (!entries.length) return null;
  if (!saKbIndex) saKbIndex = saBuildIndex(entries);
  const qTokens = saTokenize(question);
  const qV = saVectorizeQuery(qTokens, saKbIndex.idf);
  let best = null;
  for (const e of entries) {
    const ev = saKbIndex.vectors.get(e.id);
    if (!ev) continue;
    const cos = saCosine(qV.vec, qV.norm, ev.vec, ev.norm);
    let overlap = 0;
    if (qV.tokens.size && ev.tokens.size) {
      let common = 0;
      for (const t of qV.tokens) if (ev.tokens.has(t)) common++;
      overlap = common / Math.max(qV.tokens.size, ev.tokens.size);
    }
    const score = saClamp01(0.85 * cos + 0.15 * overlap);
    if (!best || score > best.score) best = { entry: e, score };
  }
  return best;
}

// ── KB UI ──
function kbOpenNew() {
  document.getElementById('kbEntryId').value = '';
  document.getElementById('kbEntryCategory').value = '';
  document.getElementById('kbEntryQuestion').value = '';
  document.getElementById('kbEntryAnswer').value = '';
  document.getElementById('kbEntryStatus').textContent = 'Saved answers are used verbatim for Auto matches.';
}

function kbOpenEdit(id) {
  const entries = kbGetAll();
  const e = entries.find(x => x.id === id);
  if (!e) return;
  document.getElementById('kbEntryId').value = e.id;
  document.getElementById('kbEntryCategory').value = e.category || '';
  document.getElementById('kbEntryQuestion').value = e.question || '';
  document.getElementById('kbEntryAnswer').value = e.answer || '';
  document.getElementById('kbEntryStatus').textContent = `Editing entry: ${id}`;
  openModal('kbEntryModal');
}

function kbDelete(id) {
  const entries = kbGetAll();
  const e = entries.find(x => x.id === id);
  if (!e) return;
  if (!confirm('Delete this knowledge base entry?')) return;
  kbSetAll(entries.filter(x => x.id !== id));
  renderKB();
}

function kbDeleteFromModal() {
  const id = document.getElementById('kbEntryId').value;
  if (!id) { closeModal('kbEntryModal'); return; }
  kbDelete(id);
  closeModal('kbEntryModal');
}

function kbSaveFromModal() {
  const id = document.getElementById('kbEntryId').value || saId('kb');
  const category = document.getElementById('kbEntryCategory').value.trim();
  const question = document.getElementById('kbEntryQuestion').value.trim();
  const answer = document.getElementById('kbEntryAnswer').value.trim();

  if (!question || !answer) {
    document.getElementById('kbEntryStatus').textContent = 'Question and Answer are required.';
    return;
  }
  const entries = kbGetAll();
  const existingIdx = entries.findIndex(x => x.id === id);
  const next = { id, category: category || null, question, answer, createdAt: existingIdx === -1 ? saNowISO() : entries[existingIdx].createdAt };
  if (existingIdx === -1) entries.unshift(next);
  else entries[existingIdx] = next;
  kbSetAll(entries);
  renderKB();
  closeModal('kbEntryModal');
}

function kbExport() {
  const entries = kbGetAll();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `knowledge_base_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function saLoadScript(src) {
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
  return saLoadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
}
async function ensureMammoth() {
  if (window.mammoth) return true;
  return saLoadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
}

function saParseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '\"') {
        if (text[i + 1] === '\"') { cur += '\"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '\"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\\r') { /* ignore */ }
      else cur += c;
    }
  }
  row.push(cur);
  rows.push(row);
  return rows.map(r => r.map(x => String(x ?? '').trim()));
}

function saPickQuestionColumn(headerRow) {
  const hdr = headerRow.map(h => saNormalizeForMatch(h));
  const idx = hdr.findIndex(h => h === 'question' || h.includes('question'));
  return idx >= 0 ? idx : 0;
}

function saPickAnswerColumn(headerRow) {
  const hdr = headerRow.map(h => saNormalizeForMatch(h));
  const idx = hdr.findIndex(h =>
    h === 'answer' ||
    h.includes('answer') ||
    h === 'response' ||
    h.includes('response') ||
    h.includes('remarks') ||
    h.includes('comment')
  );
  return idx >= 0 ? idx : -1;
}

function saExtractQuestionsFromRows(rows) {
  const clean = rows.filter(r => r.some(c => String(c ?? '').trim()));
  if (!clean.length) return [];
  const qIdx = saPickQuestionColumn(clean[0]);
  const start = qIdx === 0 ? 0 : 1;
  const out = [];
  for (let i = start; i < clean.length; i++) {
    const v = (clean[i][qIdx] ?? '').toString().trim();
    if (!v) continue;
    out.push(v);
  }
  return [...new Set(out)];
}

function saAuditExtractFromRows(rows) {
  const isNonEmptyRow = (r) => Array.isArray(r) && r.some(c => String(c ?? '').trim());
  const nonEmptyIdx = [];
  for (let i = 0; i < rows.length; i++) if (isNonEmptyRow(rows[i])) nonEmptyIdx.push(i);
  if (!nonEmptyIdx.length) return { questions: [], rowMap: [], headerRowIndex: null, qIdx: 0, aIdx: -1, colCount: 0, canFill: false, canFillReason: 'Empty file.' };

  const colCount = Math.max(...nonEmptyIdx.map(i => (rows[i] || []).length));
  const hasHeader = saDetectHeaderRow(rows);
  const headerRowIndex = hasHeader ? nonEmptyIdx[0] : null;
  const headerRow = hasHeader ? (rows[headerRowIndex] || []) : null;

  const qIdx = headerRow ? saPickQuestionColumn(headerRow) : 0;
  const aIdx = headerRow ? saPickAnswerColumn(headerRow) : (colCount >= 2 ? 1 : -1);

  const dataIdx = hasHeader ? nonEmptyIdx.slice(1) : nonEmptyIdx.slice(0);
  const questions = [];
  const rowMap = [];
  for (const i of dataIdx) {
    const row = rows[i] || [];
    const q = String(row[qIdx] ?? '').trim();
    if (!q) continue;
    questions.push(q);
    rowMap.push(i);
  }

  let canFill = true;
  let canFillReason = '';
  if (aIdx < 0) { canFill = false; canFillReason = 'No Answer/Response column found.'; }
  if (!questions.length) { canFill = false; canFillReason = 'No questions found.'; }
  return { questions, rowMap, headerRowIndex, qIdx, aIdx, colCount, canFill, canFillReason };
}

async function extractAuditFromFile(file) {
  const name = (file?.name || '').toLowerCase();
  const ext = name.split('.').pop();

  if (ext === 'csv') {
    const text = await file.text();
    const rows = saParseCSV(text);
    const meta = saAuditExtractFromRows(rows);
    return { questions: meta.questions, original: { ext, rows, rowMap: meta.rowMap, headerRowIndex: meta.headerRowIndex, qIdx: meta.qIdx, aIdx: meta.aIdx, colCount: meta.colCount, canFill: meta.canFill, canFillReason: meta.canFillReason } };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const ok = await ensureXLSX();
    if (!ok) throw new Error('XLSX parsing requires the xlsx library (CDN). Upload CSV instead, or open with internet access.');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    const meta = saAuditExtractFromRows(rows);
    return { questions: meta.questions, original: { ext: 'xlsx', sheetName, rows, rowMap: meta.rowMap, headerRowIndex: meta.headerRowIndex, qIdx: meta.qIdx, aIdx: meta.aIdx, colCount: meta.colCount, canFill: meta.canFill, canFillReason: meta.canFillReason } };
  }

  // For DOCX/JSON, we can extract questions but cannot export "in-place" without changing structure.
  const questions = await extractQuestionsFromFile(file);
  return { questions, original: { ext, canFill: false, canFillReason: 'In-place export is supported only for CSV/XLSX uploads.' } };
}

function saAvgLen(cells) {
  const xs = cells.map(x => String(x ?? '').trim()).filter(Boolean);
  if (!xs.length) return 0;
  return xs.reduce((a, s) => a + s.length, 0) / xs.length;
}

function saDetectHeaderRow(rows) {
  const clean = rows.filter(r => r.some(c => String(c ?? '').trim()));
  if (clean.length < 2) return false;
  const r0 = clean[0].map(x => String(x ?? '').trim());
  const r1 = clean[1].map(x => String(x ?? '').trim());
  const h0 = r0.map(x => saNormalizeForMatch(x));

  const keywordHit = h0.some(x => x === 'question' || x.includes('question') || x === 'answer' || x.includes('answer') || x.includes('category'));
  if (keywordHit) return true;

  const r0NonEmpty = r0.filter(Boolean);
  const shortHeaderLike = r0NonEmpty.filter(x => x.length <= 28 && !/[?.:]/.test(x)).length;
  const a0 = saAvgLen(r0);
  const a1 = saAvgLen(r1);
  if (r0NonEmpty.length >= 2 && shortHeaderLike >= Math.min(2, r0NonEmpty.length) && a0 > 0 && a0 < 22 && a1 >= (a0 + 10)) return true;
  return false;
}

function saGuessKBColumnsFromData(rows, colCount) {
  const sample = rows.slice(0, 30);
  const questionPrefix = /^(do|does|did|is|are|what|how|when|where|why|provide|describe|explain|please)\b/i;
  const cols = [];
  for (let j = 0; j < colCount; j++) cols.push({ j, nonEmpty: 0, qmark: 0, qprefix: 0, totalLen: 0, uniq: new Set() });

  for (const r of sample) {
    for (let j = 0; j < colCount; j++) {
      const v = String(r[j] ?? '').trim();
      if (!v) continue;
      const c = cols[j];
      c.nonEmpty++;
      c.totalLen += v.length;
      c.uniq.add(v.slice(0, 120));
      if (v.includes('?')) c.qmark++;
      if (questionPrefix.test(v)) c.qprefix++;
    }
  }

  const avgLen = (c) => c.nonEmpty ? (c.totalLen / c.nonEmpty) : 0;
  const qScore = (c) => {
    if (!c.nonEmpty) return -1;
    const qm = c.qmark / c.nonEmpty;
    const qp = c.qprefix / c.nonEmpty;
    const al = avgLen(c);
    const lenBonus = (al >= 10 && al <= 220) ? 0.3 : 0;
    return (qm * 1.4 + qp * 0.9 + lenBonus) * (0.8 + Math.min(0.6, c.nonEmpty / 10));
  };
  const aScore = (c) => {
    if (!c.nonEmpty) return -1;
    const al = avgLen(c);
    const sentencey = /[.;:]/;
    const sent = [...c.uniq].filter(x => sentencey.test(x)).length / Math.max(1, c.uniq.size);
    return (Math.min(2.2, al / 70) + sent * 0.6) * (0.8 + Math.min(0.6, c.nonEmpty / 10));
  };

  const qIdx = cols.slice().sort((a, b) => qScore(b) - qScore(a))[0]?.j ?? 0;
  let aIdx = cols.filter(c => c.j !== qIdx).sort((a, b) => aScore(b) - aScore(a))[0]?.j;
  if (aIdx === undefined) aIdx = qIdx === 0 ? 1 : 0;

  const categoryCandidates = cols
    .filter(c => c.j !== qIdx && c.j !== aIdx && c.nonEmpty)
    .map(c => ({ j: c.j, al: avgLen(c), uniq: c.uniq.size, nonEmpty: c.nonEmpty }))
    .filter(c => c.al > 0 && c.al <= 32 && c.uniq <= Math.min(40, c.nonEmpty + 3))
    .sort((a, b) => a.al - b.al);
  const cIdx = categoryCandidates[0]?.j ?? -1;

  return { qIdx, aIdx, cIdx };
}

function saGuessKBImportSpec(rows) {
  const clean = rows.filter(r => r.some(c => String(c ?? '').trim()));
  if (!clean.length) throw new Error('Empty file.');
  const colCount = clean.reduce((m, r) => Math.max(m, r.length), 0);
  if (colCount < 2) throw new Error('Could not detect columns. Ensure at least 2 columns: Question and Answer.');

  const hasHeader = saDetectHeaderRow(clean);
  const startRow = hasHeader ? 1 : 0;
  const header = hasHeader ? clean[0].map(x => saNormalizeForMatch(String(x ?? ''))) : [];
  let qIdx = -1, aIdx = -1, cIdx = -1;

  if (hasHeader) {
    qIdx = header.findIndex(x => x === 'question' || x.includes('question'));
    aIdx = header.findIndex(x => x === 'answer' || x.includes('answer') || x.includes('response') || x.includes('remediation'));
    cIdx = header.findIndex(x => x.includes('category') || x.includes('domain') || x.includes('control'));
  }

  const guessed = saGuessKBColumnsFromData(clean.slice(startRow), colCount);
  if (qIdx < 0) qIdx = guessed.qIdx;
  if (aIdx < 0) aIdx = guessed.aIdx;
  if (cIdx < 0) cIdx = guessed.cIdx;

  if (qIdx === aIdx) aIdx = qIdx === 0 ? 1 : 0;
  return { qIdx, aIdx, cIdx, startRow };
}

function saGuessQuestionsFromText(text) {
  const lines = String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidates = [];
  const isQuestiony = (s) => /\?$/.test(s) || /^(do|does|is|are|what|how|when|where|why|provide|describe|explain|please)\b/i.test(s);
  for (const raw of lines) {
    const s = raw.replace(/^[-•\u2022\u25CF\u25AA\u25A0\s]+/, '').replace(/^\d+[\).\-\s]+/, '').trim();
    if (s.length < 8) continue;
    if (isQuestiony(s)) candidates.push(s);
  }
  if (candidates.length) return [...new Set(candidates)];
  const parts = String(text ?? '').split('?').map(p => p.trim()).filter(p => p.length > 12).map(p => p + '?');
  return [...new Set(parts.slice(0, 200))];
}

async function extractQuestionsFromFile(file) {
  const name = (file?.name || '').toLowerCase();
  const ext = name.split('.').pop();
  if (ext === 'csv') {
    const text = await file.text();
    return saExtractQuestionsFromRows(saParseCSV(text));
  }
  if (ext === 'json') {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      if (typeof data[0] === 'string') return [...new Set(data.map(s => String(s).trim()).filter(Boolean))];
      if (typeof data[0] === 'object' && data[0]) {
        return [...new Set(data.map(o => String(o.question || o.Question || '').trim()).filter(Boolean))];
      }
    }
    throw new Error('Unsupported JSON format for audit upload.');
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const ok = await ensureXLSX();
    if (!ok) throw new Error('XLSX parsing requires the xlsx library (CDN). Upload CSV instead, or open with internet access.');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    return saExtractQuestionsFromRows(rows);
  }
  if (ext === 'docx') {
    const ok = await ensureMammoth();
    if (!ok) throw new Error('DOCX parsing requires the mammoth library (CDN). Upload CSV/XLSX instead, or open with internet access.');
    const ab = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: ab });
    return saGuessQuestionsFromText(res.value || '');
  }
  throw new Error('Unsupported file type. Use CSV, XLSX, DOCX, or JSON.');
}

function auditGetAll() { return saLoadJSON(SA_STORAGE.AUDITS, []); }
function auditSetAll(audits) { saSaveJSON(SA_STORAGE.AUDITS, audits); }

function auditMakeResults(questions) {
  const out = [];
  for (const q of questions) {
    const best = saBestKBMatch(q);
    if (!best) {
      out.push({
        question: q,
        suggestedAnswer: '',
        confidence: 0,
        sourceQuestion: '',
        status: 'Manual'
      });
    } else if (best.score < SA_AUDIT_AUTO_THRESHOLD) {
      out.push({
        question: q,
        suggestedAnswer: best.entry.answer,
        confidence: best.score,
        sourceQuestion: best.entry.question,
        status: 'Manual'
      });
    } else {
      out.push({
        question: q,
        suggestedAnswer: best.entry.answer,
        confidence: best.score,
        sourceQuestion: best.entry.question,
        status: 'Auto'
      });
    }
  }
  return out;
}

async function handleAuditFileSelect(file) {
  if (!file) return;
  try {
    const parsed = await extractAuditFromFile(file);
    const questions = parsed.questions || [];
    if (!questions.length) throw new Error('No questions found in the uploaded file.');
    const audit = {
      id: saId('audit'),
      fileName: file.name,
      createdAt: saNowISO(),
      questions,
      results: auditMakeResults(questions),
      original: parsed.original || null,
      filledAt: null
    };
    const all = auditGetAll();
    all.unshift(audit);
    auditSetAll(all);
    saActiveAuditId = audit.id;
    renderAuditList();
    renderAuditResults();
    navTo('audit');
    const hint = document.getElementById('auditUploadHint');
    if (hint) hint.textContent = `Processed ${questions.length} questions from ${file.name}.`;
  } catch (e) {
    alert(e?.message || String(e));
  }
}

function auditModalSelectFile(file) {
  saAuditModalFile = file || null;
  const status = document.getElementById('auditModalStatus');
  if (status) status.textContent = saAuditModalFile ? `Selected: ${saAuditModalFile.name}` : 'No file selected.';
}

function processAuditFromModal() {
  if (!saAuditModalFile) {
    const status = document.getElementById('auditModalStatus');
    if (status) status.textContent = 'Select a file first.';
    return;
  }
  closeModal('uploadModal');
  const f = saAuditModalFile;
  saAuditModalFile = null;
  auditModalSelectFile(null);
  handleAuditFileSelect(f);
}

function triggerAuditPick() {
  const el = document.getElementById('auditUploadInput');
  if (el) el.click();
}

function setAuditResultFilter(f, btn) {
  saAuditResultFilter = f;
  document.querySelectorAll('#tab-audit .filters .fb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAuditResults();
}

function renderAuditList() {
  const list = document.getElementById('auditList');
  const count = document.getElementById('auditUploadCount');
  if (!list) return;
  const audits = auditGetAll();
  if (count) count.textContent = `${audits.length} file${audits.length === 1 ? '' : 's'}`;
  if (!audits.length) {
    list.innerHTML = '<div class=\"hint\">No uploads yet.</div>';
    return;
  }
  list.innerHTML = audits.slice(0, 12).map(a => {
    const auto = a.results?.filter(r => r.status === 'Auto').length || 0;
    const manual = a.results?.filter(r => r.status === 'Manual').length || 0;
    const active = a.id === saActiveAuditId;
    return `
      <div class="card-xs" style="cursor:pointer;border-color:${active ? 'rgba(59,130,246,.35)' : 'var(--border)'}" onclick="auditOpen('${a.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;font-weight:600">${saEscapeHtml(a.fileName)}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${active ? 'b-blue' : 'b-gray'}">${active ? 'Active' : 'Saved'}</span>
            <button class="mini-btn" onclick="auditDelete('${a.id}', event)">Delete</button>
          </div>
        </div>
        <div class="hint">${new Date(a.createdAt).toLocaleString()}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <span class="badge b-green">${auto} Auto</span>
          <span class="badge b-amber">${manual} Manual</span>
          <span class="badge b-gray">${a.questions?.length || 0} Qs</span>
        </div>
      </div>`;
  }).join('');
}

function auditOpen(id) {
  saActiveAuditId = id;
  renderAuditList();
  renderAuditResults();
}

function saToCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  return rows.map(r => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

function auditGetActive() {
  const audits = auditGetAll();
  const audit = audits.find(a => a.id === saActiveAuditId) || null;
  return { audits, audit };
}

function auditAllAnswered(audit) {
  const rs = audit?.results || [];
  if (!rs.length) return false;
  return rs.every(r => String(r?.suggestedAnswer || '').trim().length > 0);
}

function auditCanFillInPlace(audit) {
  return !!(audit?.original && audit.original.canFill);
}

function auditUpdateFillExportActions(audit) {
  const fillBtn = document.getElementById('auditFillBtn');
  const exportBtn = document.getElementById('auditExportBtn');
  if (!fillBtn || !exportBtn) return;

  if (!audit) {
    fillBtn.disabled = true;
    exportBtn.disabled = true;
    return;
  }

  const complete = auditAllAnswered(audit);
  const isEditing = !!saAuditEditing;
  const canFill = auditCanFillInPlace(audit);
  fillBtn.disabled = !canFill || !complete || isEditing;
  exportBtn.disabled = !canFill || !audit.filledAt || !complete || isEditing;
}

function auditBuildFilledOriginalRows(audit) {
  if (!audit?.original?.rows || !Array.isArray(audit.original.rowMap)) return null;
  const filled = audit.original.rows.map(r => Array.isArray(r) ? r.slice() : []);
  const aIdx = audit.original.aIdx;
  if (typeof aIdx !== 'number' || aIdx < 0) return null;

  const results = audit.results || [];
  for (let i = 0; i < results.length; i++) {
    const rowIndex = audit.original.rowMap[i];
    if (typeof rowIndex !== 'number' || rowIndex < 0 || rowIndex >= filled.length) continue;
    const row = filled[rowIndex];
    while (row.length <= aIdx) row.push('');
    row[aIdx] = results[i]?.suggestedAnswer ?? '';
  }
  return filled;
}

function auditFillAnswers() {
  const { audits, audit } = auditGetActive();
  if (!audit) return alert('Select an audit first.');
  if (saAuditEditing) return alert('Finish editing first, then click Fill answers.');
  if (!auditCanFillInPlace(audit)) {
    const reason = audit?.original?.canFillReason || 'This file type/shape cannot be filled in-place.';
    return alert(`Cannot fill this upload in-place. ${reason}`);
  }

  if (!auditAllAnswered(audit)) {
    const firstMissing = (audit.results || []).findIndex(r => !String(r?.suggestedAnswer || '').trim());
    alert('Some questions still need answers. Please review and fill all answers before filling the file.');
    if (firstMissing >= 0) {
      saAuditResultFilter = 'all';
      document.querySelectorAll('#tab-audit .filters .fb').forEach(b => b.classList.remove('active'));
      document.querySelector('#tab-audit .filters .fb')?.classList.add('active');
      auditEditStart(audit.id, firstMissing);
    }
    return;
  }

  audit.filledAt = saNowISO();
  auditSetAll(audits);
  const hint = document.getElementById('auditUploadHint');
  if (hint) hint.textContent = `Filled answers for ${audit.results.length} questions. Export is ready.`;
  renderAuditList();
  renderAuditResults();
}

async function auditExportFilled() {
  const { audit } = auditGetActive();
  if (!audit) return alert('Select an audit first.');
  if (!auditCanFillInPlace(audit)) {
    const reason = audit?.original?.canFillReason || 'This file type/shape cannot be exported in-place.';
    return alert(`Cannot export in-place. ${reason}`);
  }
  if (!audit.filledAt) return alert('Click Fill answers first.');
  if (!auditAllAnswered(audit)) return alert('Some answers are still missing.');
  if (saAuditEditing) return alert('Finish editing first, then export.');

  const filledRows = auditBuildFilledOriginalRows(audit);
  if (!filledRows) return alert('Unable to build filled file from the original upload.');

  const name = String(audit.fileName || 'audit').trim() || 'audit';
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[\\/:*?"<>|]+/g, '_');
  const origExt = (audit.original?.ext || '').toLowerCase();

  if (origExt === 'xlsx') {
    const ok = await ensureXLSX();
    if (ok) {
      const ws = XLSX.utils.aoa_to_sheet(filledRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, audit.original?.sheetName || 'Sheet1');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_filled.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      return;
    }
  }

  const csv = saToCSV(filledRows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${base}_filled.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function auditDelete(id, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  const audits = auditGetAll();
  const idx = audits.findIndex(a => a.id === id);
  if (idx < 0) return;
  const removed = audits.splice(idx, 1)[0];
  auditSetAll(audits);
  if (saActiveAuditId === id) saActiveAuditId = audits[0]?.id || null;
  renderAuditList();
  renderAuditResults();
  const hint = document.getElementById('auditUploadHint');
  if (hint && removed?.fileName) hint.textContent = `Deleted ${removed.fileName}.`;
}

function auditDeleteAll() {
  const audits = auditGetAll();
  if (!audits.length) {
    const hint = document.getElementById('auditUploadHint');
    if (hint) hint.textContent = 'No uploads to delete.';
    return;
  }
  if (!confirm(`Delete all uploaded files (${audits.length})?`)) return;
  auditSetAll([]);
  saActiveAuditId = null;
  renderAuditList();
  renderAuditResults();
  const hint = document.getElementById('auditUploadHint');
  if (hint) hint.textContent = `Deleted ${audits.length} file${audits.length === 1 ? '' : 's'}.`;
}

function renderAuditResults() {
  const tbl = document.querySelector('#auditResultsTable tbody');
  const label = document.getElementById('auditActiveLabel');
  if (!tbl || !label) return;

  const audits = auditGetAll();
  const audit = audits.find(a => a.id === saActiveAuditId);
  if (!audit) {
    label.textContent = 'No audit selected.';
    tbl.innerHTML = '';
    auditUpdateFillExportActions(null);
    return;
  }
  label.textContent = `Active audit: ${audit.fileName} · ${audit.results.length} questions`;
  auditUpdateFillExportActions(audit);
  const rows = audit.results
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => saAuditResultFilter === 'all' ? true : r.status.toLowerCase() === saAuditResultFilter);

  tbl.innerHTML = rows.map(({ r, idx }) => {
    const badge = r.status === 'Auto' ? 'b-green' : 'b-amber';
    const isEditing = saAuditEditing && saAuditEditing.auditId === audit.id && saAuditEditing.idx === idx;

    const answerCell = isEditing
      ? `<textarea id="auditEdit-${idx}" class="form-input" style="min-height:88px;resize:vertical">${saEscapeHtml(r.suggestedAnswer || '')}</textarea>
         <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
           <button class="act-btn primary" onclick="auditEditSave('${audit.id}', ${idx})">Save</button>
           <button class="act-btn" onclick="auditEditCancel()">Cancel</button>
         </div>
         <div class="hint" style="margin-top:8px">On save, your text is automatically rephrased for clearer grammar and wording.</div>`
      : (r.suggestedAnswer
        ? saEscapeHtml(r.suggestedAnswer).replaceAll('\n', '<br>')
        : '<span class="hint">Manual answer required.</span>');

    const statusCell = (r.status === 'Manual')
      ? `<span class="badge ${badge}">Manual</span>
         <button class="mini-btn" style="margin-left:8px" onclick="auditEditStart('${audit.id}', ${idx})">Edit</button>`
      : `<span class="badge ${badge}">${r.status}</span>`;

    return `<tr>
      <td style="color:var(--text2)">${saEscapeHtml(r.question)}</td>
      <td>${answerCell}</td>
      <td style="font-family:var(--mono);color:${r.confidence >= SA_AUDIT_AUTO_THRESHOLD ? 'var(--green3)' : 'var(--amber3)'}">${saFmtPct(r.confidence)}</td>
      <td style="color:var(--text2)">${saEscapeHtml(r.sourceQuestion || '')}</td>
      <td>${statusCell}</td>
    </tr>`;
  }).join('');
}

function auditEditStart(auditId, idx) {
  saAuditEditing = { auditId, idx };
  renderAuditResults();
  setTimeout(() => {
    const ta = document.getElementById(`auditEdit-${idx}`);
    if (ta) ta.focus();
  }, 0);
}

function auditEditCancel() {
  saAuditEditing = null;
  renderAuditResults();
}

function saRephraseForClarity(text) {
  let out = (text || '').trim();
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  if (out && !/[.!?]$/.test(out)) out += '.';
  return out;
}

function auditEditSave(auditId, idx) {
  const audits = auditGetAll();
  const audit = audits.find(a => a.id === auditId);
  if (!audit || !audit.results?.[idx]) return;
  const ta = document.getElementById(`auditEdit-${idx}`);
  const raw = ta ? ta.value : '';
  const polished = saRephraseForClarity(raw);
  audit.results[idx].suggestedAnswer = polished;
  audit.results[idx].status = 'Manual';
  audit.filledAt = null;
  auditSetAll(audits);
  saAuditEditing = null;
  renderAuditList();
  renderAuditResults();
}

function downloadAuditTemplate() {
  const csv = [
    'Question',
    'Is multi-factor authentication enabled for privileged accounts?',
    'Are firewall logs monitored?',
    'Do you encrypt cardholder data at rest and in transit?'
  ].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audit_questionnaire_template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// ── Chat ──
function chatGetAll() { return saLoadJSON(SA_STORAGE.CHAT, []); }
function chatSetAll(items) { saSaveJSON(SA_STORAGE.CHAT, items); }

function chatAppend(role, text, meta) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = saEscapeHtml(text).replaceAll('\\n', '<br>');
  if (meta) {
    const m = document.createElement('div');
    m.className = 'chat-meta';
    m.textContent = meta;
    bubble.appendChild(m);
  }
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function chatQuick(q) {
  const i = document.getElementById('chatInput');
  if (i) i.value = q;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  chatAppend('user', q);

  const best = saBestKBMatch(q);
  let answer, meta, last;
  if (!best || best.score < saKbThreshold) {
    answer = 'No answer found in knowledge base. Manual response required.';
    meta = best ? `Matched: ${best.entry.question} · Confidence: ${best.score.toFixed(2)}` : `Confidence: 0.00`;
    last = { question: q, answer, confidence: best ? best.score : 0, sourceQuestion: best ? best.entry.question : null, status: 'Manual', createdAt: saNowISO() };
  } else {
    answer = best.entry.answer;
    meta = `Matched: ${best.entry.question} · Confidence: ${best.score.toFixed(2)}`;
    last = { question: q, answer, confidence: best.score, sourceQuestion: best.entry.question, status: 'Auto', createdAt: saNowISO() };
  }
  chatAppend('bot', answer, meta);

  const box = document.getElementById('chatLastMatch');
  if (box) box.textContent = meta;

  const hist = chatGetAll();
  hist.push(last);
  chatSetAll(hist.slice(-300));
}

function chatClear() {
  if (!confirm('Clear chat history?')) return;
  chatSetAll([]);
  const log = document.getElementById('chatLog');
  if (log) log.innerHTML = '';
  const box = document.getElementById('chatLastMatch');
  if (box) box.textContent = 'No queries yet.';
}

function chatExport() {
  const hist = chatGetAll();
  const blob = new Blob([JSON.stringify(hist, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `chat_history_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function renderKB() {
  const tableBody = document.querySelector('#kbTable tbody');
  const filter = document.getElementById('kbCategoryFilter');
  const search = document.getElementById('kbSearch');
  const badge = document.getElementById('kbCountBadge');
  if (!tableBody || !filter || !search || !badge) return;

  const entries = kbGetAll();
  const q = saNormalizeForMatch(search.value || '');
  const category = filter.value || 'all';

  const cats = [...new Set(entries.map(e => e.category).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const prev = filter.value;
  filter.innerHTML = `<option value="all">All categories</option>` + cats.map(c => `<option value="${saEscapeHtml(c)}">${saEscapeHtml(c)}</option>`).join('');
  if (prev && cats.includes(prev)) filter.value = prev;

  const rows = entries.filter(e => {
    if (category !== 'all' && (e.category || '') !== category) return false;
    if (!q) return true;
    return saNormalizeForMatch(e.question).includes(q) || saNormalizeForMatch(e.answer).includes(q) || saNormalizeForMatch(e.category || '').includes(q);
  });

  badge.textContent = `${rows.length} entries`;
  tableBody.innerHTML = rows.map(e => {
    const cat = e.category || '—';
    return `<tr>
      <td style="color:var(--text2)">${saEscapeHtml(e.question)}</td>
      <td>${saEscapeHtml(e.answer)}</td>
      <td style="font-family:var(--mono);color:var(--text2)">${saEscapeHtml(cat)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="mini-btn primary" onclick="kbOpenEdit('${e.id}')">Edit</button>
          <button class="mini-btn danger" onclick="kbDelete('${e.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function kbImportFromFile(file) {
  if (!file) return;
  try {
    const name = (file.name || '').toLowerCase();
    const ext = name.split('.').pop();
    let imported = [];
    if (ext === 'json') {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('JSON must be an array of {question, answer, category}.');
      imported = data.map(o => ({
        id: saId('kb'),
        question: String(o.question || o.Question || '').trim(),
        answer: String(o.answer || o.Answer || '').trim(),
        category: String(o.category || o.Category || '').trim() || null,
        createdAt: saNowISO()
      })).filter(x => x.question && x.answer);
    } else if (ext === 'csv') {
      const rows = saParseCSV(await file.text());
      if (!rows.length) throw new Error('Empty CSV.');
      const { qIdx, aIdx, cIdx, startRow } = saGuessKBImportSpec(rows);
      for (let i = startRow; i < rows.length; i++) {
        const r = rows[i];
        const q = (r[qIdx] || '').trim();
        const a = (r[aIdx] || '').trim();
        const c = (cIdx >= 0 ? (r[cIdx] || '').trim() : '') || null;
        if (q && a) imported.push({ id: saId('kb'), question: q, answer: a, category: c, createdAt: saNowISO() });
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const ok = await ensureXLSX();
      if (!ok) throw new Error('XLSX import requires the xlsx library (CDN). Import JSON/CSV instead.');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      if (!rows.length) throw new Error('Empty XLSX.');
      const normRows = rows.map(r => (r || []).map(x => String(x ?? '').trim()));
      const { qIdx, aIdx, cIdx, startRow } = saGuessKBImportSpec(normRows);
      for (let i = startRow; i < normRows.length; i++) {
        const r = rows[i] || [];
        const q = String(r[qIdx] ?? '').trim();
        const a = String(r[aIdx] ?? '').trim();
        const c = (cIdx >= 0 ? String(r[cIdx] ?? '').trim() : '') || null;
        if (q && a) imported.push({ id: saId('kb'), question: q, answer: a, category: c, createdAt: saNowISO() });
      }
    } else {
      throw new Error('Unsupported KB import file type. Use JSON, CSV, or XLSX.');
    }

    if (!imported.length) throw new Error('No valid KB entries found to import.');
    const existing = kbGetAll();
    kbSetAll([...imported, ...existing]);
    renderKB();
    alert(`Imported ${imported.length} knowledge base entries.`);
  } catch (e) {
    alert(e?.message || String(e));
  }
}

function navTo(id) {
  const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick')?.includes(`nav('${id}'`));
  if (btn) nav(id, btn);
  else document.getElementById('tab-' + id)?.classList.add('active');
}

async function saInitAssistant() {
  saLoadSettings();
  setKBThreshold(saKbThreshold);
  saBackendOk = await saBackendHealth();
  await saSyncKBFromBackend();
  renderKB();
  renderAuditList();
  renderAuditResults();

  const hist = chatGetAll();
  const log = document.getElementById('chatLog');
  if (log && hist.length) {
    log.innerHTML = '';
    for (const it of hist.slice(-40)) {
      chatAppend('user', it.question);
      chatAppend('bot', it.answer, `Matched: ${it.sourceQuestion || '—'} · Confidence: ${(it.confidence || 0).toFixed(2)}`);
    }
    log.scrollTop = log.scrollHeight;
  }
}

// ── CHARTS ──
let chartsInit = false;
function initCharts() {
  if (chartsInit) return;
  chartsInit = true;
  const cOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b9dc3', font: { size: 11, family: "'Inter',sans-serif" }, boxWidth: 12, padding: 16 } }, tooltip: { backgroundColor: '#1a2540', titleColor: '#e2e8f5', bodyColor: '#8b9dc3', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 } }, scales: { x: { ticks: { color: '#4d5e80', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#4d5e80', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, min: 0, max: 100 } } };

  // Trend
  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun'],
      datasets: [
        { label: 'HDFC', data: [70,72,76,78,80,82], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'IDFC', data: [60,63,65,67,69,71], borderColor: '#14b8a6', backgroundColor: 'rgba(20,184,166,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Cashify', data: [80,82,84,86,88,90], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'PCI DSS', data: [65,68,70,72,75,78], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)', tension: 0.4, fill: true, pointRadius: 3 },
      ]
    },
    options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, ticks: { ...cOpts.scales.y.ticks, callback: v => v + '%' } } } }
  });

  // Lender bar
  new Chart(document.getElementById('lenderChart'), {
    type: 'bar',
    data: {
      labels: ['HDFC', 'IDFC', 'Cashify', 'ICICI'],
      datasets: [
        { label: 'Answered', data: [82, 53, 45, 0], backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
        { label: 'Pending', data: [12, 18, 5, 0], backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
        { label: 'Extracted', data: [0, 0, 0, 23], backgroundColor: 'rgba(167,139,250,0.7)', borderRadius: 4 },
      ]
    },
    options: { ...cOpts, scales: { x: { ...cOpts.scales.x, stacked: true }, y: { ...cOpts.scales.y, stacked: true, max: 120 } }, plugins: { ...cOpts.plugins } }
  });

  // Doc doughnut
  new Chart(document.getElementById('docChart'), {
    type: 'doughnut',
    data: {
      labels: ['Current (24)', 'Review Due (11)', 'In Review (6)', 'Overdue (3)'],
      datasets: [{ data: [24, 11, 6, 3], backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(245,158,11,0.7)', 'rgba(59,130,246,0.7)', 'rgba(239,68,68,0.7)'], borderWidth: 0, hoverOffset: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8b9dc3', font: { size: 11 }, boxWidth: 12, padding: 12 } }, tooltip: { backgroundColor: '#1a2540', titleColor: '#e2e8f5', bodyColor: '#8b9dc3' } }, cutout: '68%' }
  });

  // Training bar
  new Chart(document.getElementById('trainingChart'), {
    type: 'bar',
    data: {
      labels: ['Board','Engineering','Sales','Finance','HR'],
      datasets: [
        { label: 'Completed', data: [100, 65, 100, 18, 83], backgroundColor: 'rgba(20,184,166,0.7)', borderRadius: 4 },
        { label: 'Remaining', data: [0, 35, 0, 82, 17], backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 },
      ]
    },
    options: { ...cOpts, scales: { x: { ...cOpts.scales.x, stacked: true }, y: { ...cOpts.scales.y, stacked: true, max: 100, ticks: { ...cOpts.scales.y.ticks, callback: v => v + '%' } } } }
  });

  // Heatmap
  buildHeatmap();
}

function buildHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  const domains = ['Access Control','Encryption','Incident Resp.','Patch Mgmt','VAPT','BCP/DR','Logging','Phys. Security','SDLC','3rd Party'];
  const audits = ['HDFC','IDFC','Cashify','ICICI','PCI DSS'];
  const scores = [
    [85,72,90,60,78],[80,65,88,55,82],[90,75,92,68,85],
    [70,60,85,50,72],[65,55,80,45,65],[40,30,75,35,45],
    [75,60,82,52,60],[88,80,90,70,90],[78,68,85,60,75],[72,62,80,55,70]
  ];
  const getColor = v => v >= 80 ? 'rgba(34,197,94,0.7)' : v >= 65 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.65)';
  let html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:3px">';
  html += '<thead><tr><th style="text-align:left;font-size:10px;color:var(--text3);font-family:var(--mono);padding:4px 8px">Domain</th>' + audits.map(a => `<th style="font-size:10px;color:var(--text3);font-family:var(--mono);padding:4px 6px;text-align:center">${a}</th>`).join('') + '</tr></thead><tbody>';
  domains.forEach((d, i) => {
    html += `<tr><td style="font-size:11px;color:var(--text2);padding:4px 8px;white-space:nowrap">${d}</td>`;
    audits.forEach((a, j) => {
      const v = scores[i][j];
      html += `<td style="background:${getColor(v)};border-radius:4px;text-align:center;padding:6px 4px;font-size:10px;font-family:var(--mono);color:rgba(255,255,255,0.9);cursor:pointer" title="${d} — ${a}: ${v}%">${v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += '<div style="display:flex;gap:16px;margin-top:10px;font-size:10px;color:var(--text3)"><span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;background:rgba(34,197,94,0.7);border-radius:2px;display:inline-block"></span>≥80 Good</span><span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;background:rgba(245,158,11,0.6);border-radius:2px;display:inline-block"></span>65–79 Partial</span><span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;background:rgba(239,68,68,0.65);border-radius:2px;display:inline-block"></span>&lt;65 At Risk</span></div></div>';
  container.innerHTML = html;
}

// Date header
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.title = 'SecureAudit RAG v2 — ' + now.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
  saInitAssistant();
});
