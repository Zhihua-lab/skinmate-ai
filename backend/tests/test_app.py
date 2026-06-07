import unittest
from unittest.mock import patch

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

        with self.assertRaises(HTTPException) as context:
            analyze_video(AnalyzeVideoRequest(url="https://www.douyin.com/video/1234567890123456789"))

        self.assertEqual(context.exception.status_code, 500)
        self.assertEqual(context.exception.detail, "LLM_API_KEY is not set")
