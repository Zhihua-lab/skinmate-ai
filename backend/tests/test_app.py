import json
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException


class AppTests(unittest.TestCase):
    @patch.dict("os.environ", {}, clear=True)
    def test_health_reports_missing_api_key(self):
        from app import health

        result = health()

        self.assertTrue(result["success"])
        self.assertFalse(result["api_key_configured"])

    @patch.dict("os.environ", {}, clear=True)
    def test_analyze_video_requires_api_key(self):
        from app import AnalyzeVideoRequest, analyze_video

        with (
            patch("app.get_llm_api_key", side_effect=RuntimeError("LLM_API_KEY is not set")),
            self.assertRaises(HTTPException) as context,
        ):
            analyze_video(AnalyzeVideoRequest(url="https://www.douyin.com/video/1234567890123456789"))

        self.assertEqual(context.exception.status_code, 500)
        self.assertEqual(context.exception.detail, "LLM_API_KEY is not set")

    @patch.dict("os.environ", {"PLAN_EDIT_LLM_API_KEY": "test-key"}, clear=True)
    @patch("app.requests.post")
    def test_revise_plan_returns_structured_payload(self, mock_post):
        from app import RevisePlanRequest, revise_plan

        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"assistant_reply":"已降低预算。","plan":['
                            '{"id":1,"label":"步骤 1","title":"洁面","description":"desc","product":"温和洁面",'
                            '"price":99,"volume":"100ml","tone":"blue","benefits":["温和"],'
                            '"ingredients":["氨基酸"],"usage":"早晚使用","sources":[]}'
                            ']}'
                        )
                    }
                }
            ]
        }
        mock_post.return_value = response

        result = revise_plan(
            RevisePlanRequest(
                plan=[{"id": 1, "label": "步骤 1", "title": "洁面"}],
                instruction="第一步太贵了，换平价一点",
            )
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["assistant_reply"], "已降低预算。")
        self.assertEqual(result["plan"][0]["product"], "温和洁面")


    @patch.dict(
        "os.environ",
        {
            "LLM_PROVIDER": "dashscope",
            "LLM_API_KEY": "video-key",
            "LLM_MODEL": "qwen3-vl-flash",
            "PLAN_EDIT_LLM_API_KEY": "deepseek-key",
        },
        clear=True,
    )
    @patch("app.requests.post")
    def test_revise_plan_uses_deepseek_config_separately_from_video_model(self, mock_post):
        from app import RevisePlanRequest, revise_plan

        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"assistant_reply":"ok","plan":['
                            '{"id":1,"label":"Step 1","title":"Cleanse","description":"desc","product":"gentle cleanser",'
                            '"price":99,"volume":"100ml","tone":"blue","benefits":["gentle"],'
                            '"ingredients":["amino acid"],"usage":"use morning and night","sources":[]}'
                            ']}'
                        )
                    }
                }
            ]
        }
        mock_post.return_value = response

        revise_plan(
            RevisePlanRequest(
                plan=[{"id": 1, "label": "Step 1", "title": "Cleanse"}],
                instruction="make it cheaper",
            )
        )

        url = mock_post.call_args.args[0]
        headers = mock_post.call_args.kwargs["headers"]
        payload = json.loads(mock_post.call_args.kwargs["data"].decode("utf-8"))

        self.assertEqual(url, "https://api.deepseek.com/chat/completions")
        self.assertEqual(headers["Authorization"], "Bearer deepseek-key")
        self.assertEqual(payload["model"], "deepseek-v4-flash")


if __name__ == "__main__":
    unittest.main()
