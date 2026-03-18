import argparse
import json
import mimetypes
import os
import re
import socket
import time
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen
from urllib.parse import urlparse, unquote


def _load_dotenv(path: Path) -> None:
  try:
    if not path.exists() or not path.is_file():
      return
    for raw in path.read_text(encoding="utf-8").splitlines():
      line = raw.strip()
      if not line or line.startswith("#"):
        continue
      if "=" not in line:
        continue
      k, v = line.split("=", 1)
      k = k.strip()
      v = v.strip()
      if not k:
        continue
      if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1]
      os.environ[k] = v
  except Exception:
    return


ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend 2.0"
DATA_DIR = ROOT / "backend" / "data"
KB_PATH = DATA_DIR / "kb.json"
CHAT_LOGS_PATH = DATA_DIR / "chat_logs.jsonl"

_load_dotenv((ROOT / "backend" / ".env").resolve())

OLLAMA_URL = os.environ.get("SECUREAUDIT_OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("SECUREAUDIT_OLLAMA_MODEL", "llama3")
SECUREAUDIT_GENERAL_FALLBACK = os.environ.get("SECUREAUDIT_GENERAL_FALLBACK", "1").strip().lower() not in {"0", "false", "no", "off"}
SECUREAUDIT_SERPER_API_KEY = os.environ.get("SECUREAUDIT_SERPER_API_KEY", "").strip()
SECUREAUDIT_BING_API_KEY = os.environ.get("SECUREAUDIT_BING_API_KEY", "").strip()
SECUREAUDIT_GEMINI_API_KEY = os.environ.get("SECUREAUDIT_GEMINI_API_KEY", "").strip()
SECUREAUDIT_GEMINI_MODEL = os.environ.get("SECUREAUDIT_GEMINI_MODEL", "gemini-2.5-flash").strip()
SECUREAUDIT_GEMINI_TIMEOUT = float(os.environ.get("SECUREAUDIT_GEMINI_TIMEOUT", "8") or "8")
SECUREAUDIT_MAX_RESPONSE_MS = int(os.environ.get("SECUREAUDIT_MAX_RESPONSE_MS", "10000") or "10000")
SECUREAUDIT_WEB_PROVIDER = os.environ.get("SECUREAUDIT_WEB_PROVIDER", "").strip().lower() or (
  "gemini" if SECUREAUDIT_GEMINI_API_KEY else ("serper" if SECUREAUDIT_SERPER_API_KEY else "")
)
SECUREAUDIT_WEB_MAX_RESULTS = int(os.environ.get("SECUREAUDIT_WEB_MAX_RESULTS", "3") or "3")
SECUREAUDIT_WEB_TIMEOUT = float(os.environ.get("SECUREAUDIT_WEB_TIMEOUT", "8") or "8")
SECUREAUDIT_LLM_RERANK = os.environ.get("SECUREAUDIT_LLM_RERANK", "1").strip().lower() not in {"0", "false", "no", "off"}

_WEB_LAST_ERROR: str | None = None
_GEMINI_BACKOFF_UNTIL: float = 0.0
_GEMINI_BACKOFF_SECONDS: float = 20.0


def _read_json(path: Path, fallback):
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except Exception:
    return fallback


def _write_json(path: Path, value) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

def _append_jsonl(path: Path, value) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  line = json.dumps(value, ensure_ascii=False)
  with path.open("a", encoding="utf-8", newline="\n") as f:
    f.write(line + "\n")


def _json_response(handler: BaseHTTPRequestHandler, code: int, payload) -> None:
  data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
  handler.send_response(code)
  handler.send_header("Access-Control-Allow-Origin", "*")
  handler.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  handler.send_header("Access-Control-Allow-Headers", "Content-Type")
  handler.send_header("Content-Type", "application/json; charset=utf-8")
  handler.send_header("Content-Length", str(len(data)))
  handler.send_header("Cache-Control", "no-store")
  handler.end_headers()
  handler.wfile.write(data)


def _read_request_json(handler: BaseHTTPRequestHandler):
  try:
    length = int(handler.headers.get("Content-Length", "0"))
  except Exception:
    length = 0
  raw = handler.rfile.read(length) if length else b""
  if not raw:
    return None
  return json.loads(raw.decode("utf-8"))


def _safe_static_path(url_path: str) -> Path | None:
  raw = url_path.lstrip("/") or "index.html"
  if raw.startswith("api/"):
    return None

  # Be forgiving if the UI is opened with a folder prefix like:
  # /frontend%202.0/index.html or /frontend 2.0/index.html
  raw = unquote(raw)
  fe_name = FRONTEND_DIR.name
  if raw == fe_name or raw == f"{fe_name}/":
    raw = "index.html"
  elif raw.startswith(f"{fe_name}/"):
    raw = raw[len(fe_name) + 1 :]

  candidate = (FRONTEND_DIR / raw).resolve()
  try:
    candidate.relative_to(FRONTEND_DIR.resolve())
  except Exception:
    return None
  return candidate


def _http_post_json(url: str, payload: Any, timeout: float, headers: dict[str, str] | None = None):
  data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
  base_headers = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}
  if headers:
    base_headers.update(headers)
  req = Request(
    url,
    method="POST",
    data=data,
    headers=base_headers,
  )
  try:
    with urlopen(req, timeout=timeout) as res:
      status = getattr(res, "status", 200)
      body = res.read()
  except HTTPError as e:
    status = int(getattr(e, "code", 0) or 0)
    try:
      body = e.read()
    except Exception:
      body = b""
  except Exception:
    return 0, None

  if status != 200:
    return status, None
  try:
    return status, json.loads(body.decode("utf-8"))
  except Exception:
    return status, None


def query_ollama(prompt: str, timeout: float = 60.0):
  if not prompt:
    return None
  try:
    _, data = _http_post_json(
      OLLAMA_URL,
      {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
      timeout=timeout,
    )
    if not isinstance(data, dict):
      return None
    out = (data.get("response") or "").strip()
    return out or None
  except (URLError, TimeoutError, socket.timeout):
    return None
  except Exception:
    return None


def _ollama_is_available(timeout: float = 0.25) -> bool:
  def _check(host: str, port: int) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
      s.settimeout(timeout)
      s.connect((host, port))
      return True
    except Exception:
      return False
    finally:
      try:
        s.close()
      except Exception:
        pass

  try:
    u = urlparse(OLLAMA_URL)
    host = u.hostname or "localhost"
    port = int(u.port or (443 if u.scheme == "https" else 80))
  except Exception:
    host, port = "127.0.0.1", 11434

  if host in {"localhost", "127.0.0.1"}:
    return _check("127.0.0.1", port)
  return _check(host, port)


def _query_ollama_with_retry(prompt: str, timeout: float = 60.0, retries: int = 1):
  res = query_ollama(prompt, timeout=timeout)
  if res:
    return res
  for _ in range(max(0, retries)):
    res = query_ollama(prompt, timeout=timeout)
    if res:
      return res
  return None


def build_chat_prompt(user_query: str) -> str:
  return f"""
You are a cybersecurity audit assistant.

Guidelines:
- Be precise and professional
- Use audit/compliance language
- Avoid speculation
- Keep answers concise

User Question:
{user_query}
""".strip()


def _truncate(text: str, max_chars: int) -> str:
  s = (text or "").strip()
  if len(s) <= max_chars:
    return s
  return s[: max(0, max_chars - 1)].rstrip() + "…"


def build_kb_grounded_prompt(user_query: str, candidates: list[dict]) -> str:
  lines: list[str] = []
  lines.append("You are a cybersecurity audit assistant.")
  lines.append("")
  lines.append("Task:")
  lines.append("- Answer the user's question using ONLY the provided Knowledge Base (KB) excerpts.")
  lines.append("- If the KB does not contain enough information, respond exactly with: No answer found. Manual review required.")
  lines.append("")
  lines.append("Style:")
  lines.append("- Use formal, audit/compliance tone.")
  lines.append("- Be concise and specific.")
  lines.append("- Avoid speculation and do not invent controls, dates, tools, or evidence.")
  lines.append("")
  lines.append("User Question:")
  lines.append(user_query.strip())
  lines.append("")
  lines.append("Knowledge Base (most relevant first):")
  for i, c in enumerate(candidates[:5], start=1):
    q = _truncate(str(c.get("question") or ""), 420)
    a = _truncate(str(c.get("answer") or ""), 700)
    score = c.get("score")
    try:
      score_s = f"{float(score):.2f}"
    except Exception:
      score_s = "0.00"
    lines.append(f"{i}) [score={score_s}] Q: {q}")
    lines.append(f"   A: {a}")
  return "\n".join(lines).strip()


def build_rephrase_prompt(answer: str) -> str:
  return f"""
Rewrite the following answer in a formal cybersecurity audit tone:

{answer}
""".strip()


def build_normalize_prompt(question: str) -> str:
  return f"""
Convert this into a standardized cybersecurity audit question:

{question}
""".strip()


def build_general_prompt(user_query: str) -> str:
  return f"""
You are a cybersecurity audit assistant.

The user asked a question that is NOT covered by the provided Knowledge Base.
Provide a general informational answer based on widely known public knowledge.

Requirements:
- 15 to 20 words maximum
- Clear and neutral
- If the question is too broad, answer briefly and suggest refining the question
- Do NOT mention the Knowledge Base
- Do NOT claim you browsed the internet

User Question:
{user_query}
""".strip()

def build_web_answer_prompt(user_query: str, results: list[dict]) -> str:
  lines: list[str] = []
  lines.append("You are a cybersecurity audit assistant.")
  lines.append("")
  lines.append("The Knowledge Base does not cover the user's question.")
  lines.append("Use the following web search snippets to answer.")
  lines.append("")
  lines.append("Requirements:")
  lines.append("- 15 to 20 words maximum")
  lines.append("- Clear and neutral")
  lines.append("- Avoid speculation; do not invent details not present in snippets")
  lines.append("")
  lines.append("User Question:")
  lines.append(user_query.strip())
  lines.append("")
  lines.append("Web Snippets:")
  for i, r in enumerate(results[: max(1, SECUREAUDIT_WEB_MAX_RESULTS)], start=1):
    title = _truncate(str(r.get("title") or ""), 180)
    snippet = _truncate(str(r.get("snippet") or ""), 320)
    link = str(r.get("link") or "")
    lines.append(f"{i}) {title}")
    if snippet:
      lines.append(f"   {snippet}")
    if link:
      lines.append(f"   Source: {link}")
  return "\n".join(lines).strip()


def _limit_words(text: str, max_words: int = 20) -> str:
  s = (text or "").strip()
  if not s:
    return ""
  words = re.findall(r"\S+", s)
  if len(words) <= max_words:
    return s
  return " ".join(words[:max_words]).rstrip() + "…"


_AUX_VERBS = {"is", "are", "was", "were", "do", "does", "did", "can", "could", "should", "would", "will", "may", "might", "must", "have", "has", "had"}


def _looks_definitional_query(q: str) -> bool:
  s = (q or "").strip()
  if not s:
    return False
  low = s.lower().strip()
  if low.startswith(("what is ", "what's ", "define ", "meaning of ", "full form of ", "expand ")):
    return True
  if " stands for" in low or " stand for" in low:
    return True
  tokens = _tokenize(s)
  if not tokens:
    return False
  if len(tokens) <= 4 and (s.endswith("?") or len(s) <= 18):
    # Short acronym/term-like questions without auxiliary verbs are usually definitional.
    if not any(t in _AUX_VERBS for t in tokens):
      return True
  return False


def _looks_yes_no_answer(a: str) -> bool:
  s = (a or "").strip().lower()
  return s.startswith("yes") or s.startswith("no")


def _web_enabled() -> bool:
  if SECUREAUDIT_WEB_PROVIDER == "gemini":
    return bool(SECUREAUDIT_GEMINI_API_KEY)
  if SECUREAUDIT_WEB_PROVIDER == "serper":
    return bool(SECUREAUDIT_SERPER_API_KEY)
  if SECUREAUDIT_WEB_PROVIDER == "bing":
    return bool(SECUREAUDIT_BING_API_KEY)
  return False


def gemini_grounded_answer(query: str, timeout: float | None = None):
  q = (query or "").strip()
  if not q:
    return None
  if SECUREAUDIT_WEB_PROVIDER != "gemini" or not SECUREAUDIT_GEMINI_API_KEY:
    return None
  if timeout is None:
    timeout = SECUREAUDIT_GEMINI_TIMEOUT
  timeout = float(timeout)
  if timeout <= 0:
    return None

  prompt = f"""
Answer the question using Google Search grounding.

Requirements:
- 15 to 20 words maximum
- Clear and neutral
- One sentence

Question:
{q}
""".strip()

  url = f"https://generativelanguage.googleapis.com/v1beta/models/{SECUREAUDIT_GEMINI_MODEL}:generateContent"
  try:
    global _WEB_LAST_ERROR
    _WEB_LAST_ERROR = None
    global _GEMINI_BACKOFF_UNTIL
    if time.monotonic() < _GEMINI_BACKOFF_UNTIL:
      _WEB_LAST_ERROR = "gemini_backoff"
      return None
    status, data = _http_post_json(
      url,
      {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"google_search": {}}],
      },
      timeout=float(timeout),
      headers={"x-goog-api-key": SECUREAUDIT_GEMINI_API_KEY},
    )
    if status != 200 or not isinstance(data, dict):
      if status == 429:
        _GEMINI_BACKOFF_UNTIL = time.monotonic() + float(_GEMINI_BACKOFF_SECONDS)
      _WEB_LAST_ERROR = f"gemini_http_{status}"
      return None
    candidates = data.get("candidates") or []
    if not isinstance(candidates, list) or not candidates:
      _WEB_LAST_ERROR = "gemini_no_candidates"
      return None
    c0 = candidates[0] if isinstance(candidates[0], dict) else {}
    content = c0.get("content") or {}
    parts = (content.get("parts") or []) if isinstance(content, dict) else []
    text = ""
    if isinstance(parts, list) and parts:
      p0 = parts[0] if isinstance(parts[0], dict) else {}
      text = str(p0.get("text") or "").strip()
    text = _limit_words(text, 20)
    if not text:
      _WEB_LAST_ERROR = "gemini_empty_text"
      return None

    sources: list[dict] = []
    gm = c0.get("groundingMetadata") or {}
    chunks = gm.get("groundingChunks") if isinstance(gm, dict) else None
    if isinstance(chunks, list):
      for ch in chunks[:5]:
        if not isinstance(ch, dict):
          continue
        web = ch.get("web") if isinstance(ch.get("web"), dict) else None
        if not web:
          continue
        uri = web.get("uri")
        title = web.get("title")
        if uri or title:
          sources.append({"uri": uri, "title": title})

    return {"answer": text, "sources": sources}
  except Exception as e:
    try:
      msg = str(e)
    except Exception:
      msg = ""
    msg = _truncate(msg, 140) if msg else ""
    _WEB_LAST_ERROR = f"{type(e).__name__}" + (f": {msg}" if msg else "")
    return None


def web_search(query: str, max_results: int | None = None, timeout: float | None = None) -> list[dict]:
  q = (query or "").strip()
  if not q:
    return []
  if not _web_enabled():
    return []

  max_results = int(max_results or SECUREAUDIT_WEB_MAX_RESULTS)
  max_results = 1 if max_results < 1 else 5 if max_results > 5 else max_results
  timeout = float(timeout or SECUREAUDIT_WEB_TIMEOUT)

  try:
    global _WEB_LAST_ERROR
    _WEB_LAST_ERROR = None
    if SECUREAUDIT_WEB_PROVIDER == "serper":
      status, data = _http_post_json(
        "https://google.serper.dev/search",
        {"q": q, "num": max_results},
        timeout=timeout,
        headers={"X-API-KEY": SECUREAUDIT_SERPER_API_KEY},
      )
      if status != 200 or not isinstance(data, dict):
        _WEB_LAST_ERROR = f"serper_http_{status}"
        return []
      organic = data.get("organic")
      if not isinstance(organic, list):
        _WEB_LAST_ERROR = "serper_no_organic"
        return []
      out: list[dict] = []
      for it in organic[:max_results]:
        if not isinstance(it, dict):
          continue
        out.append({
          "title": it.get("title"),
          "snippet": it.get("snippet") or it.get("description"),
          "link": it.get("link"),
        })
      return out

    if SECUREAUDIT_WEB_PROVIDER == "bing":
      import urllib.parse

      url = "https://api.bing.microsoft.com/v7.0/search?q=" + urllib.parse.quote(q)
      req = Request(url, method="GET", headers={
        "Ocp-Apim-Subscription-Key": SECUREAUDIT_BING_API_KEY,
        "Accept": "application/json",
      })
      with urlopen(req, timeout=timeout) as res:
        status = getattr(res, "status", 200)
        body = res.read()
      if status != 200:
        _WEB_LAST_ERROR = f"bing_http_{status}"
        return []
      data = json.loads(body.decode("utf-8"))
      web_pages = (data or {}).get("webPages") or {}
      vals = web_pages.get("value") or []
      if not isinstance(vals, list):
        return []
      out: list[dict] = []
      for it in vals[:max_results]:
        if not isinstance(it, dict):
          continue
        out.append({
          "title": it.get("name"),
          "snippet": it.get("snippet"),
          "link": it.get("url"),
        })
      return out

    return []
  except Exception as e:
    try:
      msg = str(e)
    except Exception:
      msg = ""
    msg = _truncate(msg, 140) if msg else ""
    _WEB_LAST_ERROR = f"{type(e).__name__}" + (f": {msg}" if msg else "")
    return []


def build_rerank_prompt(user_query: str, candidates: list[dict]) -> str:
  lines: list[str] = []
  lines.append("You are a cybersecurity audit assistant.")
  lines.append("")
  lines.append("Choose which Knowledge Base (KB) question best matches the user's question.")
  lines.append("Return ONLY valid JSON with keys: best_index (integer), confidence (0..1).")
  lines.append("If none match, set best_index to -1 and confidence to 0.")
  lines.append("")
  lines.append("User Question:")
  lines.append(user_query.strip())
  lines.append("")
  lines.append("KB Candidates:")
  for i, c in enumerate(candidates[:5]):
    q = _truncate(str(c.get("question") or ""), 260)
    lines.append(f"{i}) {q}")
  return "\n".join(lines).strip()


def llm_rerank(user_query: str, candidates: list[dict]):
  if not candidates:
    return None
  if not SECUREAUDIT_LLM_RERANK:
    return None
  if not _ollama_is_available():
    return None
  prompt = build_rerank_prompt(user_query, candidates)
  raw = _query_ollama_with_retry(prompt, timeout=6.0, retries=0)
  if not raw:
    return None
  try:
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
      return None
    obj = json.loads(raw[start:end + 1])
    if not isinstance(obj, dict):
      return None
    best_index = int(obj.get("best_index"))
    confidence = float(obj.get("confidence"))
    confidence = _clamp01(confidence)
    return {"best_index": best_index, "confidence": confidence}
  except Exception:
    return None


def normalize_question(question: str) -> str:
  normalized = _query_ollama_with_retry(build_normalize_prompt(question), timeout=3.0, retries=1)
  return normalized if normalized else question


def rephrase_answer(answer: str) -> str:
  improved = _query_ollama_with_retry(build_rephrase_prompt(answer), timeout=45.0, retries=1)
  return improved if improved else answer


_STOPWORDS = {
  "a", "an", "the", "and", "or", "to", "of", "in", "on", "for", "with", "is", "are", "do", "does", "did",
  "we", "you", "your", "our", "be", "been", "being", "it", "this", "that", "these", "those", "as", "at",
  "by", "from", "into", "over", "under", "within", "across", "per", "via", "can", "will", "shall", "should",
  "may", "provide", "please", "details", "describe", "explain",
}

_EXPANSIONS: list[tuple[re.Pattern[str], str]] = [
  (re.compile(r"\bmfa\b", re.I), "multi factor authentication"),
  (re.compile(r"\b2fa\b", re.I), "two factor authentication"),
  (re.compile(r"\bsiem\b", re.I), "security information and event management"),
  (re.compile(r"\bvapt\b", re.I), "vulnerability assessment and penetration testing"),
  (re.compile(r"\badmins?\b", re.I), "administrator privileged"),
  (re.compile(r"\badministrators?\b", re.I), "administrator privileged"),
  (re.compile(r"\bprivileged\b", re.I), "administrator privileged"),
  (re.compile(r"\bcardholder\b", re.I), "card holder"),
  (re.compile(r"\bfirewall logs\b", re.I), "firewall log"),
]


def _normalize_for_match(text: str) -> str:
  s = str(text or "").lower()
  for rx, rep in _EXPANSIONS:
    s = rx.sub(rep, s)
  s = unicodedata.normalize("NFKD", s)
  s = "".join(ch for ch in s if not unicodedata.combining(ch))
  s = re.sub(r"[^a-z0-9]+", " ", s).strip()
  return s


def _tokenize(text: str) -> list[str]:
  norm = _normalize_for_match(text)
  if not norm:
    return []
  out: list[str] = []
  def _stem(t: str) -> str:
    if len(t) > 3 and t.endswith("ies"):
      return t[:-3] + "y"
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
      return t[:-1]
    return t

  for t in norm.split():
    if len(t) <= 1:
      continue
    if t in _STOPWORDS:
      continue
    out.append(_stem(t))
  return out


def _build_index(entries: list[dict]):
  import math

  n_docs = len(entries) or 1
  docs = [_tokenize((e or {}).get("question") or "") for e in entries]

  df: dict[str, int] = {}
  for tokens in docs:
    for t in set(tokens):
      df[t] = df.get(t, 0) + 1

  idf: dict[str, float] = {}
  for t, d in df.items():
    idf[t] = math.log((n_docs + 1) / (d + 1)) + 1.0

  vectors: dict[str, tuple[dict[str, float], float, set[str]]] = {}
  for i, e in enumerate(entries):
    tokens = docs[i]
    tf: dict[str, int] = {}
    for t in tokens:
      tf[t] = tf.get(t, 0) + 1
    vec: dict[str, float] = {}
    norm2 = 0.0
    for t, c in tf.items():
      w = (1.0 + math.log(c)) * idf.get(t, 0.0)
      if not w:
        continue
      vec[t] = w
      norm2 += w * w
    norm = math.sqrt(norm2) or 1.0
    entry_id = (e or {}).get("id") or str(i)
    vectors[entry_id] = (vec, norm, set(tokens))

  return {"idf": idf, "vectors": vectors}


def _cosine(a_vec: dict[str, float], a_norm: float, b_vec: dict[str, float], b_norm: float) -> float:
  dot = 0.0
  if len(a_vec) <= len(b_vec):
    small, big = a_vec, b_vec
  else:
    small, big = b_vec, a_vec
  for t, w in small.items():
    bw = big.get(t)
    if bw:
      dot += w * bw
  denom = (a_norm or 1.0) * (b_norm or 1.0)
  return dot / denom


def _vectorize_query(tokens: list[str], idf: dict[str, float]):
  import math

  tf: dict[str, int] = {}
  for t in tokens:
    tf[t] = tf.get(t, 0) + 1
  vec: dict[str, float] = {}
  norm2 = 0.0
  for t, c in tf.items():
    w = (1.0 + math.log(c)) * idf.get(t, 0.0)
    if not w:
      continue
    vec[t] = w
    norm2 += w * w
  norm = math.sqrt(norm2) or 1.0
  return {"vec": vec, "norm": norm, "tokens": set(tokens)}


def _clamp01(x: float) -> float:
  return 0.0 if x < 0 else 1.0 if x > 1 else x


_KB_CACHE = {"mtime": None, "entries": [], "index": None}


def _get_kb_entries_and_index():
  try:
    mtime = KB_PATH.stat().st_mtime
  except Exception:
    mtime = None

  if _KB_CACHE["mtime"] == mtime and _KB_CACHE["index"] is not None:
    return _KB_CACHE["entries"], _KB_CACHE["index"]

  entries = _read_json(KB_PATH, [])
  if not isinstance(entries, list):
    entries = []
  index = _build_index(entries) if entries else {"idf": {}, "vectors": {}}
  _KB_CACHE["mtime"] = mtime
  _KB_CACHE["entries"] = entries
  _KB_CACHE["index"] = index
  return entries, index


def best_kb_match(question: str):
  entries, index = _get_kb_entries_and_index()
  if not entries:
    return None

  q_tokens = _tokenize(question)
  qv = _vectorize_query(q_tokens, index["idf"])
  best = None
  for e in entries:
    entry_id = (e or {}).get("id")
    if not entry_id:
      continue
    ev = index["vectors"].get(entry_id)
    if not ev:
      continue
    e_vec, e_norm, e_tokens = ev
    cos = _cosine(qv["vec"], qv["norm"], e_vec, e_norm)
    overlap = 0.0
    if qv["tokens"] and e_tokens:
      common = sum(1 for t in qv["tokens"] if t in e_tokens)
      overlap = common / max(len(qv["tokens"]), len(e_tokens))
    score = _clamp01(0.85 * cos + 0.15 * overlap)
    if best is None or score > best["score"]:
      best = {"entry": e, "score": score}
  return best


def top_kb_matches(question: str, limit: int = 3) -> list[dict]:
  entries, index = _get_kb_entries_and_index()
  if not entries:
    return []
  limit = int(limit or 0)
  if limit <= 0:
    return []

  q_tokens = _tokenize(question)
  qv = _vectorize_query(q_tokens, index["idf"])

  scored: list[dict] = []
  for e in entries:
    entry_id = (e or {}).get("id")
    if not entry_id:
      continue
    ev = index["vectors"].get(entry_id)
    if not ev:
      continue
    e_vec, e_norm, e_tokens = ev
    cos = _cosine(qv["vec"], qv["norm"], e_vec, e_norm)
    overlap = 0.0
    if qv["tokens"] and e_tokens:
      common = sum(1 for t in qv["tokens"] if t in e_tokens)
      overlap = common / max(len(qv["tokens"]), len(e_tokens))
    score = _clamp01(0.85 * cos + 0.15 * overlap)
    scored.append({
      "id": entry_id,
      "question": (e or {}).get("question"),
      "answer": (e or {}).get("answer"),
      "category": (e or {}).get("category"),
      "score": score,
    })

  scored.sort(key=lambda x: x.get("score", 0.0), reverse=True)
  return scored[:limit]


def get_chatbot_response(user_query: str, threshold: float = 0.8, rephrase: bool = False, max_response_ms: int | None = None):
  start = time.monotonic()
  budget_ms = int(max_response_ms if max_response_ms is not None else SECUREAUDIT_MAX_RESPONSE_MS)
  budget_ms = 1000 if budget_ms < 1000 else 60000 if budget_ms > 60000 else budget_ms
  global _WEB_LAST_ERROR

  def remaining_s(reserve_ms: int = 0) -> float:
    elapsed_ms = (time.monotonic() - start) * 1000.0
    left_ms = budget_ms - elapsed_ms - float(reserve_ms)
    return left_ms / 1000.0

  raw_best = best_kb_match(user_query)
  ollama_available = _ollama_is_available()

  candidates = top_kb_matches(user_query, limit=5)
  top_score = float((candidates[0].get("score") if candidates else 0.0) or 0.0)
  is_definitional = _looks_definitional_query(user_query)
  rerank = None
  if (not is_definitional) and candidates and top_score < threshold and ollama_available:
    if remaining_s(300) > 0.8:
      rerank = llm_rerank(user_query, candidates)

  # Prefer LLaMA rerank confidence to avoid keyword-only false positives (e.g., "aws" matches the wrong AWS KB item).
  kb_relevance = float(rerank["confidence"]) if (rerank and "confidence" in rerank) else top_score
  if is_definitional:
    kb_relevance = 0.0
  if candidates:
    q_tokens = set(_tokenize(user_query))
    best_tokens = set(_tokenize(str(candidates[0].get("question") or "")))
    common = len(q_tokens & best_tokens)
    # Guardrail for short queries: a single shared token (e.g. just "aws") is often not enough.
    if len(q_tokens) >= 2 and common < 2:
      kb_relevance = min(kb_relevance, 0.20)
  # If the user is asking for a definition, don't answer with a yes/no compliance-style KB item.
  if is_definitional and candidates and _looks_yes_no_answer(str(candidates[0].get("answer") or "")):
    kb_relevance = 0.0

  # 1) High-confidence KB (deterministic)
  if raw_best and raw_best["score"] >= threshold and (raw_best["entry"] or {}).get("answer"):
    answer = raw_best["entry"]["answer"]
    return {
      "answer": rephrase_answer(answer) if (rephrase and ollama_available) else answer,
      "confidence": raw_best["score"],
      "sourceQuestion": raw_best["entry"].get("question"),
      "status": "Auto",
      "source": "kb",
      "kbRelated": True,
      "normalizedQuestion": None,
      "ollama": {"normalize": False, "rephrase": bool(rephrase), "generate": False},
    }

  # 1b) LLaMA-based KB retrieval (rerank candidates)
  if candidates and top_score < threshold:
    if rerank and rerank["best_index"] >= 0 and rerank["best_index"] < len(candidates) and rerank["confidence"] >= threshold:
      picked = candidates[rerank["best_index"]]
      answer = str(picked.get("answer") or "").strip()
      if answer:
        return {
          "answer": rephrase_answer(answer) if (rephrase and ollama_available) else answer,
          "confidence": float(rerank["confidence"]),
          "sourceQuestion": picked.get("question"),
          "status": "Auto",
          "source": "kb",
          "kbRelated": True,
          "normalizedQuestion": None,
          "ollama": {"normalize": False, "rephrase": bool(rephrase), "generate": True},
          "matchMethod": "llm_rerank",
        }

  # 2) No relevant KB match → Internet retrieval (if configured) → LLM answer
  if kb_relevance < 0.25:
    web_err = None
    if _web_enabled() and (ollama_available or SECUREAUDIT_WEB_PROVIDER == "gemini"):
      if SECUREAUDIT_WEB_PROVIDER == "gemini":
        # Try Gemini even on tighter budgets by shrinking its timeout.
        left = remaining_s(0)
        if left > 1.2:
          g_timeout = min(SECUREAUDIT_GEMINI_TIMEOUT, max(0.6, left - 0.4))
          g = gemini_grounded_answer(user_query, timeout=g_timeout)
        else:
          _WEB_LAST_ERROR = "gemini_skipped_budget"
          g = None
        if g and g.get("answer"):
          return {
            "answer": g["answer"],
            "confidence": 0.0,
            "sourceQuestion": None,
            "status": "AI",
            "source": "internet",
            "kbRelated": False,
            "normalizedQuestion": None,
            "ollama": {"normalize": False, "rephrase": False, "generate": False},
            "web": {"provider": "gemini", "sources": g.get("sources") or []},
            "note": "External web answer (not from Knowledge Base).",
          }
        web_err = _WEB_LAST_ERROR
      else:
        results = web_search(user_query, max_results=SECUREAUDIT_WEB_MAX_RESULTS, timeout=SECUREAUDIT_WEB_TIMEOUT)
        if results:
          prompt = build_web_answer_prompt(user_query, results)
          response = _query_ollama_with_retry(prompt, timeout=25.0, retries=0)
          response = _limit_words(response or "", 20)
          if response:
            return {
              "answer": response,
              "confidence": 0.0,
              "sourceQuestion": None,
              "status": "AI",
              "source": "internet",
              "kbRelated": False,
              "normalizedQuestion": None,
              "ollama": {"normalize": False, "rephrase": False, "generate": True},
              "web": {"provider": SECUREAUDIT_WEB_PROVIDER, "results": results[:SECUREAUDIT_WEB_MAX_RESULTS]},
              "note": "External web answer (not from Knowledge Base).",
            }
        web_err = _WEB_LAST_ERROR

    if SECUREAUDIT_GENERAL_FALLBACK and ollama_available:
      prompt = build_general_prompt(user_query)
      response = _query_ollama_with_retry(prompt, timeout=max(1.0, min(6.0, remaining_s(300))), retries=0)
      response = _limit_words(response or "", 20)
      if response:
        return {
          "answer": response,
          "confidence": 0.0,
          "sourceQuestion": None,
          "status": "AI",
          "source": "general",
          "kbRelated": False,
          "normalizedQuestion": None,
          "ollama": {"normalize": False, "rephrase": False, "generate": True},
          "note": "General informational answer (not from Knowledge Base)." + (f" Web search failed: {web_err}" if web_err else ""),
          "webError": web_err,
        }

    payload = {
      "answer": "No answer found. Manual review required.",
      "confidence": kb_relevance,
      "sourceQuestion": None,
      "status": "Manual",
      "source": "manual",
      "kbRelated": False,
      "normalizedQuestion": None,
      "ollama": {"normalize": False, "rephrase": False, "generate": False},
      "webError": web_err,
    }
    if SECUREAUDIT_WEB_PROVIDER == "gemini" and web_err:
      payload["error"] = f"Gemini unavailable: {web_err}"
    return payload

  # 3) Low/medium KB relevance but below threshold
  if not ollama_available:
    return {
      "answer": "No answer found in knowledge base. Manual response required.",
      "confidence": kb_relevance,
      "sourceQuestion": candidates[0].get("question") if candidates and kb_relevance >= 0.25 else None,
      "status": "Manual",
      "source": "manual",
      "kbRelated": False,
      "normalizedQuestion": None,
      "ollama": {"normalize": False, "rephrase": False, "generate": False},
      "error": "AI service unavailable",
    }

  prompt = build_kb_grounded_prompt(user_query, candidates[:3])
  response = _query_ollama_with_retry(prompt, timeout=max(1.0, min(8.0, remaining_s(400))), retries=0)
  if response and "No answer found. Manual review required." not in response:
    return {
      "answer": response,
      "confidence": top_score,
      "sourceQuestion": candidates[0].get("question") if candidates else None,
      "status": "AI",
      "source": "kb",
      "kbRelated": True,
      "normalizedQuestion": None,
      "ollama": {"normalize": False, "rephrase": False, "generate": True},
      "matchMethod": "kb_grounded",
    }

  # If KB grounding failed, allow definitional queries to fall back to internet/general.
  if is_definitional:
    web_err = None
    if _web_enabled() and (ollama_available or SECUREAUDIT_WEB_PROVIDER == "gemini"):
      if SECUREAUDIT_WEB_PROVIDER == "gemini":
        left = remaining_s(0)
        if left > 1.2:
          g_timeout = min(SECUREAUDIT_GEMINI_TIMEOUT, max(0.6, left - 0.4))
          g = gemini_grounded_answer(user_query, timeout=g_timeout)
        else:
          _WEB_LAST_ERROR = "gemini_skipped_budget"
          g = None
        if g and g.get("answer"):
          return {
            "answer": g["answer"],
            "confidence": 0.0,
            "sourceQuestion": None,
            "status": "AI",
            "source": "internet",
            "kbRelated": False,
            "normalizedQuestion": None,
            "ollama": {"normalize": False, "rephrase": False, "generate": False},
            "web": {"provider": "gemini", "sources": g.get("sources") or []},
            "note": "External web answer (not from Knowledge Base).",
          }
        web_err = _WEB_LAST_ERROR
      else:
        results = web_search(user_query, max_results=SECUREAUDIT_WEB_MAX_RESULTS, timeout=SECUREAUDIT_WEB_TIMEOUT)
        if results and ollama_available:
          prompt = build_web_answer_prompt(user_query, results)
          out = _query_ollama_with_retry(prompt, timeout=25.0, retries=0)
          out = _limit_words(out or "", 20)
          if out:
            return {
              "answer": out,
              "confidence": 0.0,
              "sourceQuestion": None,
              "status": "AI",
              "source": "internet",
              "kbRelated": False,
              "normalizedQuestion": None,
              "ollama": {"normalize": False, "rephrase": False, "generate": True},
              "web": {"provider": SECUREAUDIT_WEB_PROVIDER, "results": results[:SECUREAUDIT_WEB_MAX_RESULTS]},
              "note": "External web answer (not from Knowledge Base).",
            }
        web_err = _WEB_LAST_ERROR

    if SECUREAUDIT_GENERAL_FALLBACK and ollama_available:
      prompt = build_general_prompt(user_query)
      out = _query_ollama_with_retry(prompt, timeout=max(1.0, min(6.0, remaining_s(300))), retries=0)
      out = _limit_words(out or "", 20)
      if out:
        return {
          "answer": out,
          "confidence": 0.0,
          "sourceQuestion": None,
          "status": "AI",
          "source": "general",
          "kbRelated": False,
          "normalizedQuestion": None,
          "ollama": {"normalize": False, "rephrase": False, "generate": True},
          "note": "General informational answer (not from Knowledge Base)." + (f" Web search failed: {web_err}" if web_err else ""),
          "webError": web_err,
        }

  return {
    "answer": "No answer found in knowledge base. Manual response required.",
    "confidence": kb_relevance,
    "sourceQuestion": candidates[0].get("question") if candidates and kb_relevance >= 0.25 else None,
    "status": "Manual",
    "source": "manual",
    "kbRelated": False,
    "normalizedQuestion": None,
    "ollama": {"normalize": False, "rephrase": False, "generate": True},
  }


class Handler(BaseHTTPRequestHandler):
  server_version = "SecureAuditBackend/0.1"

  def log_message(self, fmt, *args):
    # Keep logs minimal
    return super().log_message(fmt, *args)

  def do_OPTIONS(self):
    self.send_response(204)
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()

  def _send_static(self, path: Path) -> None:
    if not path.exists() or not path.is_file():
      self.send_response(404)
      self.send_header("Content-Type", "text/plain; charset=utf-8")
      self.end_headers()
      self.wfile.write(b"Not Found")
      return

    ctype, _ = mimetypes.guess_type(str(path))
    if not ctype:
      ctype = "application/octet-stream"
    data = path.read_bytes()
    self.send_response(200)
    self.send_header("Content-Type", f"{ctype}; charset=utf-8" if ctype.startswith("text/") else ctype)
    self.send_header("Content-Length", str(len(data)))
    self.send_header("Cache-Control", "no-store")
    self.end_headers()
    self.wfile.write(data)

  def do_GET(self):
    u = urlparse(self.path)
    if u.path == "/api/health":
      _json_response(self, 200, {
        "ok": True,
        "ollama": {"available": _ollama_is_available(), "model": OLLAMA_MODEL},
        "web": {
          "enabled": _web_enabled(),
          "provider": SECUREAUDIT_WEB_PROVIDER or None,
          "serperKeyPresent": bool(SECUREAUDIT_SERPER_API_KEY),
          "bingKeyPresent": bool(SECUREAUDIT_BING_API_KEY),
          "geminiKeyPresent": bool(SECUREAUDIT_GEMINI_API_KEY),
          "geminiModel": SECUREAUDIT_GEMINI_MODEL if SECUREAUDIT_GEMINI_API_KEY else None,
          "geminiTimeout": SECUREAUDIT_GEMINI_TIMEOUT if SECUREAUDIT_GEMINI_API_KEY else None,
          "maxResponseMs": SECUREAUDIT_MAX_RESPONSE_MS,
          "lastError": _WEB_LAST_ERROR,
        },
      })
      return
    if u.path == "/api/kb/list":
      kb = _read_json(KB_PATH, [])
      if not isinstance(kb, list):
        kb = []
      _json_response(self, 200, kb)
      return

    static_path = _safe_static_path(u.path)
    if static_path is None:
      _json_response(self, 404, {"error": "Not found"})
      return
    self._send_static(static_path)

  def do_POST(self):
    u = urlparse(self.path)
    if u.path == "/api/kb/replace":
      body = _read_request_json(self)
      if not isinstance(body, list):
        _json_response(self, 400, {"error": "Expected JSON array"})
        return
      _write_json(KB_PATH, body)
      _KB_CACHE["mtime"] = None
      _KB_CACHE["index"] = None
      _json_response(self, 200, {"ok": True, "count": len(body)})
      return
    if u.path == "/api/ollama":
      body = _read_request_json(self) or {}
      prompt = (body.get("prompt") or "").strip() if isinstance(body, dict) else ""
      if not prompt:
        _json_response(self, 400, {"error": "Expected JSON with non-empty 'prompt'"})
        return
      response = _query_ollama_with_retry(prompt, timeout=60.0, retries=1)
      if not response:
        _json_response(self, 503, {"ok": False, "response": "AI service unavailable"})
        return
      _json_response(self, 200, {"ok": True, "response": response})
      return

    if u.path == "/api/chat/logs":
      body = _read_request_json(self) or {}
      if not isinstance(body, dict):
        _json_response(self, 400, {"error": "Expected JSON object"})
        return
      history = body.get("history")
      if not isinstance(history, list):
        _json_response(self, 400, {"error": "Expected 'history' array"})
        return
      # Avoid writing huge payloads.
      history = history[-300:]
      entry = {
        "ts": time.time(),
        "event": body.get("event") or "chat_archive",
        "count": len(history),
        "history": history,
      }
      try:
        _append_jsonl(CHAT_LOGS_PATH, entry)
      except Exception:
        _json_response(self, 500, {"error": "Failed to write logs"})
        return
      _json_response(self, 200, {"ok": True, "count": len(history)})
      return

    if u.path == "/api/chat":
      body = _read_request_json(self) or {}
      if not isinstance(body, dict):
        _json_response(self, 400, {"error": "Expected JSON object"})
        return
      question = (body.get("question") or "").strip()
      if not question:
        _json_response(self, 400, {"error": "Expected non-empty 'question'"})
        return
      threshold = body.get("threshold", 0.8)
      try:
        threshold = float(threshold)
      except Exception:
        threshold = 0.8
      threshold = 0.0 if threshold < 0 else 1.0 if threshold > 1 else threshold
      rephrase = bool(body.get("rephrase", False))
      max_ms = body.get("maxResponseMs", None)
      try:
        max_ms = int(max_ms) if max_ms is not None else None
      except Exception:
        max_ms = None
      result = get_chatbot_response(question, threshold=threshold, rephrase=rephrase, max_response_ms=max_ms)
      code = 200 if result.get("status") != "Manual" or not result.get("error") else 503
      _json_response(self, code, {"ok": code == 200, **result})
      return

    _json_response(self, 404, {"error": "Not found"})

  def do_PUT(self):
    u = urlparse(self.path)
    if u.path == "/api/kb/replace":
      body = _read_request_json(self)
      if not isinstance(body, list):
        _json_response(self, 400, {"error": "Expected JSON array"})
        return
      _write_json(KB_PATH, body)
      _KB_CACHE["mtime"] = None
      _KB_CACHE["index"] = None
      _json_response(self, 200, {"ok": True, "count": len(body)})
      return
    _json_response(self, 404, {"error": "Not found"})


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=5500)
  args = parser.parse_args()

  if not FRONTEND_DIR.exists() or not FRONTEND_DIR.is_dir():
    raise SystemExit(f"Frontend directory not found: {FRONTEND_DIR}")

  DATA_DIR.mkdir(parents=True, exist_ok=True)
  if not KB_PATH.exists():
    _write_json(KB_PATH, [])

  os.chdir(str(ROOT))
  try:
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
  except OSError as e:
    winerror = getattr(e, "winerror", None)
    if winerror == 10048:
      raise SystemExit(
        f"Port already in use: {args.host}:{args.port}. Stop the existing process or choose another port."
      ) from e
    raise
  print(f"Serving on http://{args.host}:{args.port} (frontend={FRONTEND_DIR.name}, api=/api)")
  httpd.serve_forever()


if __name__ == "__main__":
  main()
