import argparse
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
DATA_DIR = ROOT / "backend" / "data"
KB_PATH = DATA_DIR / "kb.json"


def _read_json(path: Path, fallback):
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except Exception:
    return fallback


def _write_json(path: Path, value) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def _json_response(handler: BaseHTTPRequestHandler, code: int, payload) -> None:
  data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
  handler.send_response(code)
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
  candidate = (FRONTEND_DIR / raw).resolve()
  try:
    candidate.relative_to(FRONTEND_DIR.resolve())
  except Exception:
    return None
  return candidate


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
      _json_response(self, 200, {"ok": True})
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

  def do_PUT(self):
    u = urlparse(self.path)
    if u.path == "/api/kb/replace":
      body = _read_request_json(self)
      if not isinstance(body, list):
        _json_response(self, 400, {"error": "Expected JSON array"})
        return
      _write_json(KB_PATH, body)
      _json_response(self, 200, {"ok": True, "count": len(body)})
      return
    _json_response(self, 404, {"error": "Not found"})


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=5500)
  args = parser.parse_args()

  DATA_DIR.mkdir(parents=True, exist_ok=True)
  if not KB_PATH.exists():
    _write_json(KB_PATH, [])

  os.chdir(str(ROOT))
  httpd = ThreadingHTTPServer((args.host, args.port), Handler)
  print(f"Serving on http://{args.host}:{args.port} (frontend=/frontend, api=/api)")
  httpd.serve_forever()


if __name__ == "__main__":
  main()

