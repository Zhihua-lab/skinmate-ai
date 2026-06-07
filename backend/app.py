import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from skincare_web_app import run_url_analysis

app = FastAPI(title="Skincare AI Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeVideoRequest(BaseModel):
    url: str


def build_markdown_summary(result: dict[str, Any]) -> str:
    products = result.get("products") or []
    reasons = result.get("recommend_reasons") or []
    effects = result.get("claimed_effects") or []

    lines = [
        f"# Video Analysis",
        f"",
        f"- Video ID: {result.get('video_id', '')}",
        f"- Source URL: {result.get('source_url', '')}",
        f"",
        "## Products",
    ]

    if products:
        for item in products:
            name = item.get("name") or "Unknown"
            brand = item.get("brand") or "Unknown"
            category = item.get("category") or "Unknown"
            lines.append(f"- {brand} / {name} ({category})")
    else:
        lines.append("- None")

    lines.append("")
    lines.append("## Recommend Reasons")
    if reasons:
        for item in reasons:
            if isinstance(item, dict):
                lines.append(f"- {item.get('reason') or json_safe(item)}")
            else:
                lines.append(f"- {item}")
    else:
        lines.append("- None")

    lines.append("")
    lines.append("## Claimed Effects")
    if effects:
        for item in effects:
            if isinstance(item, dict):
                lines.append(f"- {item.get('effect') or json_safe(item)}")
            else:
                lines.append(f"- {item}")
    else:
        lines.append("- None")

    return "\n".join(lines)


def json_safe(value: Any) -> str:
    if isinstance(value, dict):
        parts = [f"{key}: {item}" for key, item in value.items() if item not in ("", None, [], {})]
        return ", ".join(parts) if parts else "N/A"
    return str(value)


@app.get("/health")
def health() -> dict[str, Any]:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    api_key_configured = bool(api_key and api_key.strip())
    return {
        "success": True,
        "status": "ok",
        "api_key_configured": api_key_configured,
    }


@app.post("/analyze-video")
def analyze_video(payload: AnalyzeVideoRequest) -> dict[str, Any]:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY is not set")

    output_dir = Path(os.getenv("OUTPUT_DIR", "skincare_outputs")) / "web_runs"

    try:
        result = run_url_analysis(url=payload.url, output_dir=output_dir)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "success": True,
        "video_id": result.get("video_id", ""),
        "markdown": build_markdown_summary(result),
        "analysis": result,
    }
