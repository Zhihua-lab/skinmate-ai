import argparse
import base64
import io
import json
import os
from pathlib import Path

import requests
from PIL import Image
from dotenv import load_dotenv


load_dotenv()


DEFAULT_FRAMES = [
    ("extra_0000.jpg", "00:00"),
    ("f0003.jpg", "00:03"),
    ("extra_0006.jpg", "00:06"),
    ("f0010.jpg", "00:10"),
    ("extra_0012.jpg", "00:12"),
    ("f0018.jpg", "00:18"),
    ("extra_0024.jpg", "00:24"),
    ("f0028.jpg", "00:28"),
    ("extra_0036.jpg", "00:36"),
    ("f0040.jpg", "00:40"),
    ("extra_0048.jpg", "00:48"),
    ("f0052.jpg", "00:52"),
]


def encode_image(path: Path, max_edge: int = 1280) -> str:
    with Image.open(path) as image:
        image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=88)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def extract_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames-dir", default="frames_7597309249148046602")
    parser.add_argument("--video-id", default="7597309249148046602")
    parser.add_argument("--model", default="qwen3-vl-flash")
    parser.add_argument("--output-dir", default="model_outputs")
    args = parser.parse_args()

    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key or not api_key.strip():
        raise SystemExit("DASHSCOPE_API_KEY is not set")

    frames_dir = Path(args.frames_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    content = [
        {
            "type": "text",
            "text": (
                "你是短视频内容重构系统里的多模态视觉理解模块。"
                f"视频 ID 是 {args.video_id}。"
                "页面文案是：现在买菜，回家10分钟就能吃上。"
                "懒人一锅端「肥牛虾滑粉丝煲」#美食 #宵夜 #懒人快手菜。"
                "下面是同一条抖音美食视频按时间顺序采样的关键帧。"
                "请区分页面文案证据和视觉证据。"
                "画面里不能确认的食材必须写为 uncertain，不要为了贴合页面文案而强行确认。"
                "如果模型认为某个视觉判断可能误判，也要写进 evidence_gaps 或 model_uncertainties。"
                "返回严格 JSON，不要 Markdown。JSON 字段必须包含："
                "video_id, content_type, dish, page_evidence, frame_observations, visible_ingredients, "
                "visible_seasonings, inferred_steps, evidence_gaps, reconstruction_suggestions。"
                "另加 model_uncertainties 字段。"
                "frame_observations 每项包含 frame, time, visible_text, objects, action, confidence。"
            ),
        }
    ]

    used_frames = []
    for filename, timestamp in DEFAULT_FRAMES:
        path = frames_dir / filename
        if not path.exists():
            continue
        used_frames.append({"frame": filename, "time": timestamp})
        content.append({"type": "text", "text": f"Frame: {filename}, time: {timestamp}"})
        content.append({"type": "image_url", "image_url": {"url": encode_image(path)}})

    payload = {
        "model": args.model,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "temperature": 0.1,
    }

    response = requests.post(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=120,
    )

    raw_path = output_dir / f"{args.video_id}_{args.model}_raw.json"
    raw_payload = {
        "model": args.model,
        "video_id": args.video_id,
        "used_frames": used_frames,
        "status_code": response.status_code,
        "response_text": response.text,
    }
    raw_path.write_text(json.dumps(raw_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    response.raise_for_status()
    data = response.json()
    content_text = data["choices"][0]["message"]["content"]
    parsed_text = extract_json_text(content_text)
    parsed = json.loads(parsed_text)

    parsed_path = output_dir / f"{args.video_id}_{args.model}_parsed.json"
    parsed_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"raw={raw_path}")
    print(f"parsed={parsed_path}")
    print(f"frames={len(used_frames)}")
    print(f"model={args.model}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
