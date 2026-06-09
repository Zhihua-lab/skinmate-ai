import json
import os
import sys
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

if "pytest" not in sys.modules:
    load_dotenv()

from skincare_video_analyzer import get_llm_api_key
from skincare_web_app import run_url_analysis

PLAN_EDIT_LLM_DEFAULT_URL = "https://api.deepseek.com/chat/completions"
PLAN_EDIT_LLM_DEFAULT_MODEL = "deepseek-v4-flash"

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


class RevisePlanRequest(BaseModel):
    plan: list[dict[str, Any]]
    instruction: str
    chat_history: list[dict[str, str]] | None = None
    plan_meta: dict[str, Any] | None = None


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


def get_plan_edit_llm_api_key() -> str:
    api_key = os.getenv("PLAN_EDIT_LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or os.getenv("LLM_API_KEY")
    if not api_key or not api_key.strip():
        raise RuntimeError("PLAN_EDIT_LLM_API_KEY is not set")
    return api_key.strip()


def get_plan_edit_llm_chat_url() -> str:
    return os.getenv("PLAN_EDIT_LLM_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or PLAN_EDIT_LLM_DEFAULT_URL


def build_plan_edit_llm_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_plan_edit_llm_api_key()}",
        "Content-Type": "application/json",
    }


def build_revise_plan_prompt(
    *,
    plan: list[dict[str, Any]],
    instruction: str,
    chat_history: list[dict[str, str]] | None = None,
    plan_meta: dict[str, Any] | None = None,
) -> str:
    return (
        "你是一名护肤方案调整助手。"
        "用户已经有一份现成的护肤方案，你需要根据用户的新要求微调方案，而不是重新做问卷。"
        "请优先沿用原方案中的步骤结构，只在必要时增删步骤。"
        "如果用户提到预算高、太刺激、步骤太多、想更保湿、想更温和、想换产品，你要给出具体调整。"
        "输出必须是严格 JSON，不要 Markdown，不要额外解释。"
        '顶层字段必须是 {"assistant_reply": string, "plan": Step[]}。'
        "每个 Step 必须包含这些字段：id, label, title, description, product, price, volume, tone, benefits, ingredients, usage, sources。"
        "benefits、ingredients、sources 必须是数组。sources 每项必须包含 v, time, quote。"
        f"当前方案：{json.dumps(plan, ensure_ascii=False)}"
        f"方案元信息：{json.dumps(plan_meta or {}, ensure_ascii=False)}"
        f"历史对话：{json.dumps(chat_history or [], ensure_ascii=False)}"
        f"用户这次的修改要求：{instruction}"
    )


def request_revised_plan(
    *,
    plan: list[dict[str, Any]],
    instruction: str,
    chat_history: list[dict[str, str]] | None = None,
    plan_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "model": os.getenv("PLAN_EDIT_LLM_MODEL") or os.getenv("DEEPSEEK_MODEL") or PLAN_EDIT_LLM_DEFAULT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": build_revise_plan_prompt(
                    plan=plan,
                    instruction=instruction,
                    chat_history=chat_history,
                    plan_meta=plan_meta,
                ),
            }
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    response = requests.post(
        get_plan_edit_llm_chat_url(),
        headers=build_plan_edit_llm_headers(),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    if not isinstance(parsed, dict) or not isinstance(parsed.get("plan"), list):
        raise ValueError("LLM did not return a valid revised plan payload")
    return parsed


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        get_llm_api_key()
        api_key_configured = True
    except RuntimeError:
        api_key_configured = False
    return {
        "success": True,
        "status": "ok",
        "api_key_configured": api_key_configured,
    }


@app.post("/analyze-video")
def analyze_video(payload: AnalyzeVideoRequest) -> dict[str, Any]:
    try:
        get_llm_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

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


@app.post("/revise-plan")
def revise_plan(payload: RevisePlanRequest) -> dict[str, Any]:
    try:
        get_plan_edit_llm_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not payload.plan:
        raise HTTPException(status_code=400, detail="plan is required")
    if not payload.instruction.strip():
        raise HTTPException(status_code=400, detail="instruction is required")

    try:
        result = request_revised_plan(
            plan=payload.plan,
            instruction=payload.instruction.strip(),
            chat_history=payload.chat_history,
            plan_meta=payload.plan_meta,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "success": True,
        "assistant_reply": str(result.get("assistant_reply") or ""),
        "plan": result["plan"],
    }
