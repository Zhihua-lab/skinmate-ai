import argparse
import json
import tempfile
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from facepp_skin import FacePPError, analyze_image, summarize_skin_result


INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Face++ 皮肤分析测试</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #20231f;
      --muted: #677067;
      --paper: #f5f2ea;
      --panel: #fffdf7;
      --line: #d7ddd5;
      --accent: #087969;
      --accent-2: #b75d38;
      --danger: #a43c35;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
      background:
        linear-gradient(90deg, rgba(32,35,31,.07) 1px, transparent 1px),
        linear-gradient(180deg, rgba(32,35,31,.05) 1px, transparent 1px),
        var(--paper);
      background-size: 28px 28px;
      color: var(--ink);
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 30px 0 42px;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 48px);
      line-height: 1;
      letter-spacing: 0;
    }
    .badge {
      border: 2px solid var(--ink);
      background: var(--panel);
      color: var(--accent);
      font-weight: 900;
      padding: 9px 12px;
      box-shadow: 4px 4px 0 rgba(32,35,31,.16);
      white-space: nowrap;
    }
    .grid {
      display: grid;
      grid-template-columns: 390px 1fr;
      gap: 18px;
      align-items: start;
    }
    section {
      border: 2px solid var(--ink);
      background: var(--panel);
      box-shadow: 7px 7px 0 rgba(32,35,31,.12);
    }
    .head {
      padding: 13px 15px;
      border-bottom: 2px solid var(--ink);
      background: #ece3d5;
      font-weight: 900;
    }
    .body { padding: 16px; }
    label {
      display: block;
      font-weight: 900;
      margin-bottom: 8px;
    }
    input[type=file] {
      width: 100%;
      border: 2px dashed var(--ink);
      background: #fff;
      padding: 14px;
      font: inherit;
    }
    button {
      width: 100%;
      min-height: 48px;
      margin-top: 14px;
      border: 2px solid var(--ink);
      background: var(--accent);
      color: #fff;
      font-size: 16px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--ink);
    }
    button:hover { transform: translate(1px, 1px); box-shadow: 3px 3px 0 var(--ink); }
    button:disabled { background: var(--muted); cursor: wait; box-shadow: none; transform: none; }
    .preview {
      margin-top: 16px;
      border: 2px solid var(--ink);
      background: #faf8f0;
      aspect-ratio: 4 / 3;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--muted);
      font-weight: 800;
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .status {
      margin-top: 12px;
      min-height: 24px;
      color: var(--muted);
      font-weight: 800;
      line-height: 1.45;
    }
    .status.error { color: var(--danger); }
    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric {
      border: 2px solid var(--ink);
      background: #fff;
      padding: 12px;
      min-height: 74px;
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 7px;
    }
    .metric strong {
      font-size: 20px;
      line-height: 1.15;
      word-break: break-word;
    }
    .states {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .state {
      border: 1px solid var(--line);
      background: #fff;
      padding: 9px 10px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
    }
    .state b { color: var(--accent-2); }
    pre {
      margin: 0;
      min-height: 330px;
      max-height: 520px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      border: 2px solid var(--ink);
      background: #171b18;
      color: #edf3ec;
      padding: 14px;
      font: 13px/1.55 Consolas, "Cascadia Mono", monospace;
    }
    @media (max-width: 880px) {
      header { flex-direction: column; align-items: start; }
      .grid { grid-template-columns: 1fr; }
      .states { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .summary, .states { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Face++ 皮肤分析测试</h1>
      <div class="badge">image -> /api/skin-analyze</div>
    </header>
    <div class="grid">
      <section>
        <div class="head">上传测试照片</div>
        <div class="body">
          <form id="testForm">
            <label for="imageInput">选择图片</label>
            <input id="imageInput" name="image" type="file" accept="image/*" required>
            <button id="submitButton" type="submit">调用 Face++</button>
          </form>
          <div id="preview" class="preview">等待选择图片</div>
          <div id="status" class="status"></div>
        </div>
      </section>
      <section>
        <div class="head">返回结果</div>
        <div class="body">
          <div class="summary">
            <div class="metric"><span>肤质类型</span><strong id="skinType">-</strong></div>
            <div class="metric"><span>Request ID</span><strong id="requestId">-</strong></div>
          </div>
          <div id="states" class="states"></div>
          <pre id="result">等待分析。</pre>
        </div>
      </section>
    </div>
  </main>
  <script>
    const form = document.getElementById('testForm');
    const input = document.getElementById('imageInput');
    const button = document.getElementById('submitButton');
    const preview = document.getElementById('preview');
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    const skinTypeEl = document.getElementById('skinType');
    const requestIdEl = document.getElementById('requestId');
    const statesEl = document.getElementById('states');

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) {
        preview.textContent = '等待选择图片';
        return;
      }
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = '测试图片预览';
      preview.appendChild(img);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = input.files[0];
      if (!file) return;
      const payload = new FormData();
      payload.append('image', file);
      button.disabled = true;
      statusEl.className = 'status';
      statusEl.textContent = '正在上传并调用 Face++...';
      try {
        const response = await fetch('/api/skin-analyze', { method: 'POST', body: payload });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '请求失败');
        renderResult(data);
        statusEl.textContent = '完成。';
      } catch (error) {
        statusEl.className = 'status error';
        statusEl.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    function renderResult(data) {
      skinTypeEl.textContent = data.skin_type || '-';
      requestIdEl.textContent = data.request_id || '-';
      statesEl.innerHTML = '';
      for (const item of data.skin_states || []) {
        const node = document.createElement('div');
        node.className = 'state';
        node.innerHTML = `<span>${item.name}</span><b>${item.status}</b>`;
        statesEl.appendChild(node);
      }
      resultEl.textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>
"""


@dataclass
class FacePPSkinBackend:
    index_html: str = INDEX_HTML

    def handle_skin_analyze(self, *, content_type: str, body: bytes) -> tuple[int, dict[str, str], bytes]:
        if "multipart/form-data" not in content_type:
            return json_response({"error": "multipart/form-data is required"}, status=400)

        upload = parse_image_upload(content_type, body)
        if upload is None:
            return json_response({"error": "image file is required"}, status=400)

        filename, image_bytes = upload
        suffix = Path(filename).suffix or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            tmp.write(image_bytes)

        try:
            summary = summarize_skin_result(analyze_image(tmp_path))
            return json_response(summary)
        except FacePPError as exc:
            return json_response(
                {
                    "error": f"Face++ error: {exc.error_message}",
                    "facepp_error": exc.error_message,
                    "facepp_payload": exc.payload,
                },
                status=exc.status_code or 502,
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    def handle_health(self) -> tuple[int, dict[str, str], bytes]:
        return json_response({"ok": True, "service": "facepp-skin"})

    def handle_index(self) -> tuple[int, dict[str, str], bytes]:
        return (
            200,
            {"Content-Type": "text/html; charset=utf-8"},
            self.index_html.encode("utf-8"),
        )


def parse_image_upload(content_type: str, body: bytes) -> tuple[str, bytes] | None:
    boundary = _extract_boundary(content_type)
    if not boundary:
        return None

    delimiter = ("--" + boundary).encode("utf-8")
    for part in body.split(delimiter):
        if b'name="image"' not in part or b"filename=" not in part:
            continue
        headers, separator, payload = part.partition(b"\r\n\r\n")
        if not separator:
            continue
        filename = _filename_from_headers(headers)
        payload = payload.rsplit(b"\r\n", 1)[0]
        if filename and payload:
            return filename, payload
    return None


def json_response(payload: dict[str, Any], *, status: int = 200) -> tuple[int, dict[str, str], bytes]:
    return (
        status,
        {"Content-Type": "application/json; charset=utf-8"},
        json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
    )


class FacePPSkinHandler(BaseHTTPRequestHandler):
    app = FacePPSkinBackend()

    def do_GET(self) -> None:
        if self.path in {"/", "/index.html"}:
            self._write_response(*self.app.handle_index())
            return
        if self.path != "/health":
            self.send_error(404)
            return
        self._write_response(*self.app.handle_health())

    def do_POST(self) -> None:
        if self.path != "/api/skin-analyze":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        content_type = self.headers.get("Content-Type", "")
        body = self.rfile.read(length)
        try:
            response = self.app.handle_skin_analyze(content_type=content_type, body=body)
        except Exception as exc:
            response = json_response({"error": str(exc)}, status=500)
        self._write_response(*response)

    def _write_response(self, status: int, headers: dict[str, str], body: bytes) -> None:
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def create_app() -> FacePPSkinBackend:
    return FacePPSkinBackend()


def _extract_boundary(content_type: str) -> str:
    marker = "boundary="
    if marker not in content_type:
        return ""
    return content_type.split(marker, 1)[1].split(";", 1)[0].strip().strip('"')


def _filename_from_headers(headers: bytes) -> str:
    for line in headers.splitlines():
        text = line.decode("utf-8", errors="ignore")
        if text.lower().startswith("content-disposition:") and 'filename="' in text:
            return text.split('filename="', 1)[1].split('"', 1)[0]
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Face++ skin analysis backend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8091)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), FacePPSkinHandler)
    print(f"Face++ skin backend: http://{args.host}:{args.port}")
    print("POST image multipart field 'image' to /api/skin-analyze")
    server.serve_forever()


if __name__ == "__main__":
    main()
