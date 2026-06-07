import argparse
import json
import sys
from pathlib import Path
from typing import BinaryIO

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


def write_json_result(result: dict, stream: BinaryIO | None = None) -> None:
    target = stream or sys.stdout.buffer
    data = json.dumps(result, ensure_ascii=False, indent=2).encode("utf-8")
    target.write(data)
    target.write(b"\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze skincare recommendation content from Douyin video frames.")
    parser.add_argument("--url", required=True, help="Douyin video URL, including modal_id or /video/<id>.")
    parser.add_argument("--frames-dir", help="Directory containing sampled video frames.")
    parser.add_argument("--video-file", help="Local mp4 file. The script will sample frames before analysis.")
    parser.add_argument("--download-dir", help="Directory for mp4 files downloaded from Douyin when --video-file is omitted.")
    parser.add_argument("--frame-output-dir", help="Directory for frames sampled from --video-file.")
    parser.add_argument("--frame-interval", type=float, default=2.0, help="Seconds between dense sampled frames.")
    parser.add_argument("--max-frames", type=int, default=30, help="Maximum frames sent to the multimodal model.")
    parser.add_argument("--page-text", default="", help="Optional visible page copy or title from Douyin.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for raw and parsed model outputs.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="DashScope multimodal model name.")
    parser.add_argument("--cdp-proxy-url", default=DEFAULT_CDP_PROXY_URL, help="web-access CDP proxy URL.")
    args = parser.parse_args()
    source_url = extract_douyin_url(args.url)

    try:
        video_id = extract_video_id(source_url)
    except ValueError:
        video_id = "pending"
    page_text = args.page_text
    frames_dir = Path(args.frames_dir) if args.frames_dir else None
    if frames_dir is None:
        video_file = Path(args.video_file) if args.video_file else None
        if video_file is None:
            download_dir = Path(args.download_dir) if args.download_dir else Path(args.output_dir) / "videos"
            video_file = download_dir / f"{video_id}.mp4"
            _, snapshot = download_douyin_video_with_cdp(
                source_url,
                output_path=video_file,
                proxy_url=args.cdp_proxy_url,
            )
            resolved_url = str(snapshot.get("url") or source_url)
            resolved_video_id = extract_video_id(resolved_url)
            if video_id != resolved_video_id:
                final_video_file = download_dir / f"{resolved_video_id}.mp4"
                final_video_file.parent.mkdir(parents=True, exist_ok=True)
                video_file.replace(final_video_file)
                video_file = final_video_file
                video_id = resolved_video_id
                source_url = resolved_url
            if not page_text:
                page_text = str(snapshot.get("text") or "")

        frames_dir = Path(args.frame_output_dir) if args.frame_output_dir else Path(args.output_dir) / f"{video_id}_frames"
        extract_frames_from_video(
            video_path=video_file,
            output_dir=frames_dir,
            interval_seconds=args.frame_interval,
            max_frames=args.max_frames,
        )

    result = analyze_frames(
        source_url=source_url,
        frames_dir=frames_dir,
        page_text=page_text,
        output_dir=Path(args.output_dir),
        model=args.model,
    )
    write_json_result(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
