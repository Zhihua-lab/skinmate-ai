import argparse
import json
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from skincare_video_analyzer import (
    DEFAULT_CDP_PROXY_URL,
    DEFAULT_MODEL,
    DEFAULT_OUTPUT_DIR,
    analyze_frames,
    download_douyin_video_with_cdp,
    extract_douyin_url,
    extract_frames_from_video,
    extract_video_id,
)


INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>护肤视频识别测试台</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1d2522;
      --muted: #64706b;
      --line: #d8ded8;
      --paper: #f7f4ed;
      --panel: #fffdf7;
      --accent: #0f7b63;
      --accent-2: #c56b36;
      --danger: #a83f39;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
      background:
        linear-gradient(90deg, rgba(15,123,99,.08) 1px, transparent 1px),
        linear-gradient(180deg, rgba(15,123,99,.06) 1px, transparent 1px),
        var(--paper);
      background-size: 28px 28px;
      color: var(--ink);
    }
    main {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 34px 0 44px;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-end;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 54px);
      line-height: .96;
      letter-spacing: 0;
      max-width: 680px;
    }
    .stamp {
      border: 2px solid var(--ink);
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      transform: rotate(-2deg);
      background: var(--panel);
      white-space: nowrap;
    }
    .workspace {
      display: grid;
      grid-template-columns: 390px 1fr;
      gap: 18px;
      align-items: start;
    }
    section {
      background: var(--panel);
      border: 2px solid var(--ink);
      box-shadow: 7px 7px 0 rgba(29,37,34,.12);
    }
    .controls { padding: 18px; }
    label {
      display: block;
      font-weight: 800;
      margin: 0 0 8px;
    }
    input, textarea {
      width: 100%;
      border: 2px solid var(--ink);
      background: #fff;
      color: var(--ink);
      padding: 12px;
      font: inherit;
      outline: none;
    }
    input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(15,123,99,.18); }
    textarea { min-height: 86px; resize: vertical; }
    .row { margin-bottom: 15px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    button {
      width: 100%;
      border: 2px solid var(--ink);
      background: var(--accent);
      color: white;
      min-height: 48px;
      font-weight: 900;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--ink);
    }
    button:hover { transform: translate(1px, 1px); box-shadow: 3px 3px 0 var(--ink); }
    button:disabled {
      cursor: wait;
      background: var(--muted);
      transform: none;
      box-shadow: none;
    }
    .status {
      margin-top: 14px;
      min-height: 22px;
      color: var(--muted);
      font-weight: 700;
    }
    .status.error { color: var(--danger); }
    .result {
      min-height: 620px;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .result-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 16px;
      border-bottom: 2px solid var(--ink);
      align-items: center;
      background: #efe8dc;
    }
    .result-head strong { font-size: 18px; }
    .hint { color: var(--muted); font-size: 13px; }
    pre {
      margin: 0;
      padding: 16px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, "Cascadia Mono", monospace;
      font-size: 13px;
      line-height: 1.55;
    }
    .quick {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }
    @media (max-width: 880px) {
      header { align-items: flex-start; flex-direction: column; }
      .workspace { grid-template-columns: 1fr; }
      .result { min-height: 420px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>护肤视频识别测试台</h1>
      <div class="stamp">Douyin -> Frames -> Bailian JSON</div>
    </header>
    <div class="workspace">
      <section class="controls">
        <form id="analyzeForm">
          <div class="row">
            <label for="videoUrl">抖音视频链接或分享文案</label>
            <textarea id="videoUrl" name="url" placeholder="可以直接粘贴抖音复制出来的整段分享文案，系统会自动提取其中的 douyin.com 链接。" required></textarea>
          </div>
          <div class="row">
            <label for="pageText">补充页面文案</label>
            <textarea id="pageText" name="page_text" placeholder="可不填；如果你已经复制了标题/口播线索，可以放这里。"></textarea>
          </div>
          <div class="grid row">
            <div>
              <label for="maxFrames">最大帧数</label>
              <input id="maxFrames" name="max_frames" type="number" min="1" max="60" value="12">
            </div>
            <div>
              <label for="frameInterval">抽帧间隔</label>
              <input id="frameInterval" name="frame_interval" type="number" min="0.5" max="10" step="0.5" value="2">
            </div>
          </div>
          <button id="runButton" type="submit">开始识别</button>
          <div id="status" class="status"></div>
        </form>
        <div class="quick">
          建议先用 12 帧快速测试。确认能识别产品后，再把最大帧数调到 30 做完整检查。
        </div>
      </section>
      <section class="result">
        <div class="result-head">
          <strong>生成结果</strong>
          <span class="hint">products / reasons / effects / evidence</span>
        </div>
        <pre id="result">等待输入视频链接。</pre>
      </section>
    </div>
  </main>
  <script>
    const form = document.getElementById('analyzeForm');
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    const button = document.getElementById('runButton');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      statusEl.className = 'status';
      statusEl.textContent = '正在打开抖音页面、下载视频、抽帧并调用百炼。这个过程可能需要 20-90 秒。';
      resultEl.textContent = '';
      button.disabled = true;

      const payload = {
        url: document.getElementById('videoUrl').value.trim(),
        page_text: document.getElementById('pageText').value.trim(),
        max_frames: Number(document.getElementById('maxFrames').value || 12),
        frame_interval: Number(document.getElementById('frameInterval').value || 2)
      };

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '请求失败');
        resultEl.textContent = JSON.stringify(data, null, 2);
        statusEl.textContent = '完成。';
      } catch (error) {
        statusEl.className = 'status error';
        statusEl.textContent = error.message;
        resultEl.textContent = '';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
"""


def json_response(status: int, payload: dict[str, Any]) -> tuple[int, dict[str, str], bytes]:
    return (
        status,
        {"Content-Type": "application/json; charset=utf-8"},
        json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
    )


def run_url_analysis(
    *,
    url: str,
    page_text: str = "",
    output_dir: Path = DEFAULT_OUTPUT_DIR / "web_runs",
    frame_interval: float = 2.0,
    max_frames: int = 12,
) -> dict[str, Any]:
    url = extract_douyin_url(url)
    try:
        video_id = extract_video_id(url)
    except ValueError:
        video_id = "pending"
    video_path = output_dir / "videos" / f"{video_id}.mp4"
    downloaded_path, snapshot = download_douyin_video_with_cdp(url, output_path=video_path)
    resolved_url = str(snapshot.get("url") or url)
    resolved_video_id = extract_video_id(resolved_url)
    if video_id != resolved_video_id:
        final_video_path = output_dir / "videos" / f"{resolved_video_id}.mp4"
        final_video_path.parent.mkdir(parents=True, exist_ok=True)
        downloaded_path.replace(final_video_path)
        downloaded_path = final_video_path
    frames_dir = output_dir / f"{resolved_video_id}_frames"
    resolved_page_text = page_text or str(snapshot.get("text") or "")
    extract_frames_from_video(
        video_path=downloaded_path,
        output_dir=frames_dir,
        interval_seconds=frame_interval,
        max_frames=max_frames,
    )
    return analyze_frames(
        source_url=resolved_url,
        frames_dir=frames_dir,
        page_text=resolved_page_text,
        output_dir=output_dir,
        model=DEFAULT_MODEL,
    )


@dataclass
class SkincareWebApp:
    index_html: str = INDEX_HTML

    def handle_api_analyze(self, body: bytes) -> tuple[int, dict[str, str], bytes]:
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return json_response(400, {"error": "invalid JSON body"})

        url = str(payload.get("url") or "").strip()
        if not url:
            return json_response(400, {"error": "url is required"})

        page_text = str(payload.get("page_text") or "")
        frame_interval = float(payload.get("frame_interval") or 2.0)
        max_frames = int(payload.get("max_frames") or 12)

        try:
            result = run_url_analysis(
                url=url,
                page_text=page_text,
                frame_interval=frame_interval,
                max_frames=max_frames,
            )
        except Exception as exc:
            return json_response(500, {"error": str(exc)})
        return json_response(200, result)


def create_app() -> SkincareWebApp:
    return SkincareWebApp()


def make_handler(app: SkincareWebApp) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path in {"/", "/index.html"}:
                body = app.index_html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            self.send_error(404)

        def do_POST(self) -> None:
            if self.path != "/api/analyze":
                self.send_error(404)
                return
            length = int(self.headers.get("Content-Length") or "0")
            status, headers, body = app.handle_api_analyze(self.rfile.read(length))
            self.send_response(status)
            for key, value in headers.items():
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: Any) -> None:
            return

    return Handler


def serve(host: str = "127.0.0.1", port: int = 8787) -> None:
    app = create_app()
    server = ThreadingHTTPServer((host, port), make_handler(app))
    print(f"Serving skincare test UI at http://{host}:{port}")
    server.serve_forever()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the skincare video analyzer test UI.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    serve(args.host, args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
