import io
import os
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageOps


FACEPP_API_KEY_ENV = "FACEPP_API_KEY"
FACEPP_API_SECRET_ENV = "FACEPP_API_SECRET"
FACEPP_SKIN_ANALYZE_URL = "https://api-cn.faceplusplus.com/facepp/v1/skinanalyze"
DOTENV_PATH = Path(__file__).with_name(".env")
DEFAULT_FACEPP_API_KEY = "YtZVxYyA0WR0yK0PW6k5lG9pZxFQ_G_o"
DEFAULT_FACEPP_API_SECRET = "Xb9WzcLSO02McFZBK_5Iq2MZUVMsSXjd"


class FacePPError(RuntimeError):
    def __init__(self, error_message: str, *, status_code: int | None = None, payload: dict[str, Any] | None = None):
        super().__init__(error_message)
        self.error_message = error_message
        self.status_code = status_code
        self.payload = payload or {}

SKIN_TYPE_LABELS = {
    0: "未知",
    1: "油性皮肤",
    2: "干性皮肤",
    3: "中性皮肤",
    4: "混合性皮肤",
    "oily": "油性皮肤",
    "dry": "干性皮肤",
    "normal": "中性皮肤",
    "mixed": "混合性皮肤",
    "combination": "混合性皮肤",
}

STATE_LABELS = {
    "blackhead": "黑头",
    "acne": "痘痘",
    "mole": "痣",
    "spot": "斑点",
    "eye_pouch": "眼袋",
    "dark_circle": "黑眼圈",
    "forehead_wrinkle": "抬头纹",
    "crows_feet": "鱼尾纹",
    "eye_finelines": "眼部细纹",
    "glabella_wrinkle": "眉间纹",
    "nasolabial_fold": "法令纹",
    "forehead_pore": "前额毛孔",
    "left_cheek_pore": "左脸颊毛孔",
    "right_cheek_pore": "右脸颊毛孔",
    "chin_pore": "下巴毛孔",
}


def analyze_image(image_path: Path, *, session: requests.Session | None = None) -> dict[str, Any]:
    if not image_path.exists():
        raise FileNotFoundError(f"Image file does not exist: {image_path}")

    client = session or requests.Session()
    image_file = normalize_image_for_facepp(image_path)
    api_key, api_secret = _facepp_credentials()
    response = client.post(
        FACEPP_SKIN_ANALYZE_URL,
        data={"api_key": api_key, "api_secret": api_secret},
        files={"image_file": (image_path.with_suffix(".jpg").name, image_file, "image/jpeg")},
        timeout=30,
    )
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Face++ response is not a JSON object")
    if not response.ok or "error_message" in payload:
        raise FacePPError(
            str(payload.get("error_message") or payload.get("error") or f"HTTP_{response.status_code}"),
            status_code=getattr(response, "status_code", None),
            payload=payload,
        )
    return payload


def _facepp_credentials() -> tuple[str, str]:
    dotenv = _read_dotenv(DOTENV_PATH)
    api_key = os.environ.get(FACEPP_API_KEY_ENV) or dotenv.get(FACEPP_API_KEY_ENV) or DEFAULT_FACEPP_API_KEY
    api_secret = os.environ.get(FACEPP_API_SECRET_ENV) or dotenv.get(FACEPP_API_SECRET_ENV) or DEFAULT_FACEPP_API_SECRET
    if not api_key or not api_secret:
        raise RuntimeError(f"{FACEPP_API_KEY_ENV} and {FACEPP_API_SECRET_ENV} must be set")
    return api_key, api_secret


def _read_dotenv(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize_image_for_facepp(image_path: Path, *, max_edge: int = 1600) -> io.BytesIO:
    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        elif image.mode == "L":
            image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=92, optimize=True)
    buffer.seek(0)
    return buffer


def summarize_skin_result(raw: dict[str, Any]) -> dict[str, Any]:
    result = raw.get("result")
    if not isinstance(result, dict):
        result = {}

    return {
        "request_id": raw.get("request_id", ""),
        "skin_type": _skin_type_label(result.get("skin_type")),
        "face_rectangle": raw.get("face_rectangle") or {},
        "skin_states": [_state_item(key, result[key]) for key in STATE_LABELS if key in result],
        "raw": raw,
    }


def _skin_type_label(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("skin_type") or value.get("value") or value.get("type")
    return SKIN_TYPE_LABELS.get(value, str(value) if value not in (None, "") else "未知")


def _state_item(key: str, value: Any) -> dict[str, Any]:
    raw_value = _extract_value(value)
    return {
        "key": key,
        "name": STATE_LABELS[key],
        "status": _status_label(raw_value),
        "raw_value": raw_value,
    }


def _extract_value(value: Any) -> Any:
    if isinstance(value, dict):
        for key in ("value", "score", "level", "status"):
            if key in value:
                return value[key]
    return value


def _status_label(value: Any) -> str:
    if value is True:
        return "有"
    if value is False or value == 0:
        return "无"
    if value == 1:
        return "有"
    if value == 2:
        return "轻度/可见"
    if value == 3:
        return "明显"
    if value in (None, ""):
        return "未知"
    return str(value)
