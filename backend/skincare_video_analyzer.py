import base64
import io
import json
import os
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, urlparse

import requests
from PIL import Image
import imageio.v3 as iio
from dotenv import load_dotenv


load_dotenv()

DEFAULT_PROVIDER = os.getenv("LLM_PROVIDER", "").strip().lower() or "dashscope"
DEFAULT_CHAT_URLS = {
    "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    "deepseek": "https://api.deepseek.com/chat/completions",
}
DEFAULT_MODEL_BY_PROVIDER = {
    "dashscope": "qwen3-vl-flash",
    "deepseek": "deepseek-v4-flash",
}
DEFAULT_MODEL = (
    os.getenv("LLM_MODEL")
    or os.getenv("DASHSCOPE_MODEL")
    or DEFAULT_MODEL_BY_PROVIDER.get(DEFAULT_PROVIDER, DEFAULT_MODEL_BY_PROVIDER["dashscope"])
)
DEFAULT_CDP_PROXY_URL = os.getenv("CDP_ENDPOINT", "http://localhost:3456")
DEFAULT_OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "skincare_outputs"))
REQUIRED_LIST_FIELDS = [
    "products",
    "recommend_reasons",
    "claimed_effects",
    "skin_types",
    "usage_context",
    "evidence",
    "uncertain_items",
    "missing_evidence",
    "quality_notes",
]


def sample_video_times(duration_seconds: float, interval_seconds: float = 2.0, max_frames: int = 30) -> list[float]:
    if duration_seconds <= 0:
        raise ValueError("duration_seconds must be greater than 0")
    if interval_seconds <= 0:
        raise ValueError("interval_seconds must be greater than 0")
    if max_frames <= 0:
        raise ValueError("max_frames must be greater than 0")

    dense_times = []
    current = 0.0
    while current < duration_seconds:
        dense_times.append(round(current, 3))
        current += interval_seconds
    if not dense_times or dense_times[-1] != round(duration_seconds, 3):
        dense_times.append(round(duration_seconds, 3))

    if len(dense_times) <= max_frames:
        return dense_times
    if max_frames == 1:
        return [0.0]

    step = (duration_seconds - 0.0) / (max_frames - 1)
    return [round(step * index, 3) for index in range(max_frames)]


def extract_video_id(source_url: str) -> str:
    parsed = urlparse(source_url)
    query = parse_qs(parsed.query)
    modal_id = query.get("modal_id", [""])[0]
    if modal_id.isdigit():
        return modal_id

    match = re.search(r"/video/(\d+)", parsed.path)
    if match:
        return match.group(1)

    numeric_chunks = re.findall(r"\d{12,}", source_url)
    if numeric_chunks:
        return numeric_chunks[0]

    raise ValueError(f"Cannot extract Douyin video id from URL: {source_url}")


def extract_douyin_url(text: str) -> str:
    pattern = re.compile(
        r"https?://(?:[\w-]+\.)?(?:douyin|iesdouyin)\.com/[^\s<>\"'，。；！？，;!)）\]】]+",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        raise ValueError("No Douyin URL found in input")
    trailing_punctuation = ".,;!?)]}\"'" + "\u3002\uff0c\uff1b\uff01\uff1f\uff09\uff3d\u3011"
    return match.group(0).rstrip(trailing_punctuation)

def get_llm_provider() -> str:
    provider = os.getenv("LLM_PROVIDER", "").strip().lower() or "dashscope"
    return provider


def get_llm_api_key() -> str:
    provider = get_llm_provider()
    api_key = os.getenv("LLM_API_KEY")
    if not api_key and provider == "dashscope":
        api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key or not api_key.strip():
        raise RuntimeError("LLM_API_KEY is not set")
    return api_key.strip()


def get_llm_chat_url() -> str:
    provider = get_llm_provider()
    return (
        os.getenv("LLM_BASE_URL")
        or DEFAULT_CHAT_URLS.get(provider)
        or DEFAULT_CHAT_URLS["dashscope"]
    )


def build_llm_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_llm_api_key()}",
        "Content-Type": "application/json",
    }


def encode_image(path: Path, max_edge: int = 1280) -> str:
    with Image.open(path) as image:
        image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=88)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def discover_frames(frames_dir: Path) -> list[Path]:
    if not frames_dir.exists():
        raise FileNotFoundError(f"Frames directory does not exist: {frames_dir}")

    frames = sorted(
        path for path in frames_dir.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not frames:
        raise ValueError(f"No image frames found in: {frames_dir}")
    return frames


def extract_frames_from_video(
    *,
    video_path: Path,
    output_dir: Path,
    interval_seconds: float = 2.0,
    max_frames: int = 30,
) -> list[Path]:
    if not video_path.exists():
        raise FileNotFoundError(f"Video file does not exist: {video_path}")

    metadata = iio.immeta(video_path)
    duration = float(metadata.get("duration") or 0)
    fps = float(metadata.get("fps") or 0)
    if duration <= 0 or fps <= 0:
        raise ValueError(f"Cannot read duration/fps from video metadata: {video_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    times = sample_video_times(duration, interval_seconds=interval_seconds, max_frames=max_frames)
    extracted: list[Path] = []

    for index, seconds in enumerate(times):
        frame_index = max(0, min(int(round(seconds * fps)), int(max(duration * fps - 1, 0))))
        fallback_step = max(1, int(round(fps)))
        frame = read_video_frame_with_fallback(video_path, frame_index=frame_index, step=fallback_step)
        image = Image.fromarray(frame).convert("RGB")
        path = output_dir / f"frame_{index:03d}_{seconds:06.2f}s.jpg"
        image.save(path, format="JPEG", quality=90)
        extracted.append(path)

    return extracted


def read_video_frame_with_fallback(
    video_path: Path,
    *,
    frame_index: int,
    step: int,
    max_attempts: int = 5,
):
    current_index = max(0, frame_index)
    last_error: Exception | None = None
    for _ in range(max_attempts):
        try:
            return iio.imread(video_path, index=current_index)
        except IndexError as exc:
            last_error = exc
            if current_index == 0:
                break
            current_index = max(0, current_index - max(1, step))
    if last_error:
        raise last_error
    raise IndexError(frame_index)


def extract_video_sources_from_snapshot(snapshot: dict[str, Any]) -> list[str]:
    def is_video_like(source: str) -> bool:
        return "douyinvod" in source or ".mp4" in source or "mime_type=video_mp4" in source or "/video/" in source

    video_candidates: list[str] = []
    for video in snapshot.get("videos", []):
        if not isinstance(video, dict):
            continue
        for key in ("currentSrc", "src"):
            value = video.get(key)
            if isinstance(value, str) and value.startswith("http") and is_video_like(value):
                video_candidates.append(value)

    candidates = video_candidates
    html = snapshot.get("html")
    if not candidates and isinstance(html, str):
        candidates.extend(re.findall(r"https?://[^\"'<>\\\s]+\.mp4[^\"'<>\\\s]*", html))
        candidates.extend(re.findall(r"https?://[^\"'<>\\\s]+douyinvod[^\"'<>\\\s]+", html))

    unique_sources: list[str] = []
    seen: set[str] = set()
    for source in candidates:
        if source in seen:
            continue
        seen.add(source)
        unique_sources.append(source)
    return unique_sources


def pick_video_source(sources: list[str]) -> str:
    if not sources:
        raise ValueError("No video sources found in Douyin page snapshot")

    for source in sources:
        if "douyinvod" in source and ("mime_type=video_mp4" in source or ".mp4" in source or "/video/" in source):
            return source
    for source in sources:
        if ".mp4" in source or "mime_type=video_mp4" in source:
            return source
    return sources[0]


def download_video(source_url: str, output_path: Path, session: requests.Session | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    client = session or requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
        ),
        "Referer": "https://www.douyin.com/",
    }

    with client.get(source_url, headers=headers, stream=True, timeout=120) as response:
        response.raise_for_status()
        with output_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)

    return output_path


def parse_cdp_eval_response(payload: dict[str, Any]) -> dict[str, Any]:
    if "error" in payload:
        raise RuntimeError(f"CDP eval failed: {payload['error']}")

    value = payload.get("value")
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("CDP eval response did not contain a JSON object")


def fetch_douyin_snapshot_with_cdp(
    source_url: str,
    *,
    session: requests.Session | None = None,
    proxy_url: str = DEFAULT_CDP_PROXY_URL,
    attempts: int = 8,
    wait_seconds: float = 2.0,
) -> dict[str, Any]:
    client = session or requests.Session()
    target_id = ""
    new_response = client.get(f"{proxy_url}/new?url={quote(source_url, safe='')}", timeout=60)
    new_response.raise_for_status()
    target_id = str(new_response.json()["targetId"])

    script = (
        "JSON.stringify({"
        "title:document.title,"
        "url:location.href,"
        "text:document.body.innerText.slice(0,12000),"
        "videos:[...document.querySelectorAll('video')].map(v=>({"
        "src:v.src,"
        "currentSrc:v.currentSrc,"
        "duration:Number.isFinite(v.duration)?v.duration:null,"
        "paused:v.paused,"
        "readyState:v.readyState,"
        "videoWidth:v.videoWidth,"
        "videoHeight:v.videoHeight"
        "})),"
        "html:document.documentElement.innerHTML.slice(0,50000)"
        "})"
    )

    try:
        last_snapshot: dict[str, Any] | None = None
        for _ in range(attempts):
            if wait_seconds > 0:
                time.sleep(wait_seconds)
            eval_response = client.post(f"{proxy_url}/eval?target={target_id}", data=script, timeout=30)
            eval_response.raise_for_status()
            snapshot = parse_cdp_eval_response(eval_response.json())
            last_snapshot = snapshot
            if extract_video_sources_from_snapshot(snapshot):
                return snapshot
        if last_snapshot is not None:
            return last_snapshot
        raise RuntimeError("CDP did not return a Douyin page snapshot")
    finally:
        if target_id:
            close_response = client.get(f"{proxy_url}/close?target={target_id}", timeout=10)
            close_response.raise_for_status()


def download_douyin_video_with_cdp(
    source_url: str,
    *,
    output_path: Path,
    session: requests.Session | None = None,
    proxy_url: str = DEFAULT_CDP_PROXY_URL,
) -> tuple[Path, dict[str, Any]]:
    snapshot = fetch_douyin_snapshot_with_cdp(source_url, session=session, proxy_url=proxy_url)
    video_source = pick_video_source(extract_video_sources_from_snapshot(snapshot))
    video_path = download_video(video_source, output_path, session=session)
    return video_path, snapshot


def build_skincare_prompt(video_id: str, source_url: str, page_text: str = "") -> str:
    return (
        "你是护肤类短视频内容提取系统的多模态审核员。"
        f"视频 ID: {video_id}。来源链接: {source_url}。"
        f"页面可见文案: {page_text or '未提供'}。"
        "你的任务是从抖音护肤推荐视频中识别博主推荐的产品、推荐原因、产品作用、适用肤质和使用场景。"
        "必须严格区分事实证据和推断，不要补全没有证据支持的信息。"
        "如果产品名、品牌、功效或肤质只看得不完整，写入 uncertain_items，不要强行猜。"
        "每个 products、recommend_reasons、claimed_effects、skin_types、usage_context 条目都必须带 evidence_refs。"
        "evidence_refs 应引用 frame 文件名、时间、OCR 字幕、口播文本或页面文案。"
        "返回严格 JSON，不要 Markdown。JSON 顶层字段必须包含："
        "video_id, source_url, content_type, products, recommend_reasons, claimed_effects, skin_types, "
        "usage_context, evidence, uncertain_items, missing_evidence, quality_notes。"
        "products 每项字段包含 name, brand, category, appearance_times, evidence_refs, confidence。"
        "evidence 每项字段包含 id, source_type, source_ref, observed_text, visual_description, confidence。"
    )


def build_multimodal_payload(
    *,
    video_id: str,
    source_url: str,
    frames: list[Path],
    page_text: str = "",
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    provider = get_llm_provider()
    if provider == "deepseek":
        raise RuntimeError(
            "DeepSeek official chat API is currently text-only in the published docs and does not accept image_url frame input."
        )

    content: list[dict[str, Any]] = [{"type": "text", "text": build_skincare_prompt(video_id, source_url, page_text)}]

    for index, frame in enumerate(frames, start=1):
        content.append({"type": "text", "text": f"Frame {index}: {frame.name}"})
        content.append({"type": "image_url", "image_url": {"url": encode_image(frame)}})

    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.0,
    }


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


def normalize_analysis_result(result: dict[str, Any], *, video_id: str, source_url: str) -> dict[str, Any]:
    normalized = dict(result)
    normalized["video_id"] = str(normalized.get("video_id") or video_id)
    normalized["source_url"] = str(normalized.get("source_url") or source_url)
    normalized.setdefault("content_type", "skincare_recommendation")

    for field in REQUIRED_LIST_FIELDS:
        value = normalized.get(field)
        if isinstance(value, list):
            normalized[field] = value
        elif value:
            normalized[field] = [value]
        else:
            normalized[field] = []

    return normalized


def analyze_frames(
    *,
    source_url: str,
    frames_dir: Path,
    page_text: str = "",
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    video_id = extract_video_id(source_url)
    frames = discover_frames(frames_dir)
    payload = build_multimodal_payload(
        video_id=video_id,
        source_url=source_url,
        frames=frames,
        page_text=page_text,
        model=model,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    response = requests.post(
        get_llm_chat_url(),
        headers=build_llm_headers(),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=180,
    )

    raw_path = output_dir / f"{video_id}_{model}_raw.json"
    raw_path.write_text(
        json.dumps(
            {
                "video_id": video_id,
                "source_url": source_url,
                "frames": [frame.name for frame in frames],
                "status_code": response.status_code,
                "response_text": response.text,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    response.raise_for_status()
    data = response.json()
    content_text = data["choices"][0]["message"]["content"]
    parsed = json.loads(extract_json_text(content_text))
    normalized = normalize_analysis_result(parsed, video_id=video_id, source_url=source_url)

    parsed_path = output_dir / f"{video_id}_analysis.json"
    parsed_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return normalized
