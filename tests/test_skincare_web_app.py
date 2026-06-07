import json
import tempfile
import unittest
from unittest.mock import patch


class SkincareWebAppTests(unittest.TestCase):
    def test_index_contains_url_form_and_result_area(self):
        from skincare_web_app import create_app

        app = create_app()

        self.assertIn('id="videoUrl"', app.index_html)
        self.assertIn('id="runButton"', app.index_html)
        self.assertIn('id="result"', app.index_html)

    def test_api_analyze_returns_analysis_json(self):
        from skincare_web_app import create_app

        app = create_app()
        payload = {"url": "https://www.douyin.com/video/1234567890123456789", "max_frames": 4}
        expected = {"video_id": "1234567890123456789", "products": []}

        with patch("skincare_web_app.run_url_analysis", return_value=expected):
            status, headers, body = app.handle_api_analyze(json.dumps(payload).encode("utf-8"))

        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(json.loads(body.decode("utf-8")), expected)

    def test_api_analyze_rejects_missing_url(self):
        from skincare_web_app import create_app

        app = create_app()

        status, headers, body = app.handle_api_analyze(json.dumps({}).encode("utf-8"))

        self.assertEqual(status, 400)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertIn("url is required", body.decode("utf-8"))

    def test_api_analyze_accepts_shared_copy_text(self):
        from skincare_web_app import create_app

        app = create_app()
        payload = {
            "url": (
                "2.56 :7pm ATL:/ o@Q.xF 06/10 适合大部分人的日常护肤教程~ "
                "https://v.douyin.com/rP_8KuKlp8k/ 复制此链接，打开Dou音搜索，直接观看视频！"
            ),
            "max_frames": 4,
        }
        expected = {"video_id": "1234567890123456789", "products": []}

        with patch("skincare_web_app.run_url_analysis", return_value=expected) as run_mock:
            status, headers, body = app.handle_api_analyze(json.dumps(payload).encode("utf-8"))

        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(json.loads(body.decode("utf-8")), expected)
        run_mock.assert_called_once()

    def test_run_url_analysis_accepts_short_link_after_browser_redirect(self):
        from pathlib import Path

        from skincare_web_app import run_url_analysis

        with tempfile.TemporaryDirectory() as tmp:
            output_dir = Path(tmp)
            downloaded = output_dir / "videos" / "pending.mp4"
            downloaded.parent.mkdir(parents=True, exist_ok=True)
            downloaded.write_bytes(b"mp4")
            snapshot = {
                "url": "https://www.douyin.com/video/1234567890123456789",
                "text": "护肤推荐",
            }
            expected = {"video_id": "1234567890123456789", "products": []}

            with (
                patch("skincare_web_app.download_douyin_video_with_cdp", return_value=(downloaded, snapshot)),
                patch("skincare_web_app.extract_frames_from_video", return_value=[Path("frame.jpg")]),
                patch("skincare_web_app.analyze_frames", return_value=expected) as analyze_mock,
            ):
                result = run_url_analysis(url="https://v.douyin.com/wkGmeNyRfdQ/", output_dir=output_dir)

            self.assertEqual(result, expected)
            analyze_mock.assert_called_once()
            self.assertEqual(
                analyze_mock.call_args.kwargs["source_url"],
                "https://www.douyin.com/video/1234567890123456789",
            )

    def test_run_url_analysis_extracts_url_from_shared_copy_text(self):
        from pathlib import Path

        from skincare_web_app import run_url_analysis

        shared_text = (
            "2.56 :7pm ATL:/ o@Q.xF 06/10 适合大部分人的日常护肤教程~ "
            "https://v.douyin.com/rP_8KuKlp8k/ 复制此链接，打开Dou音搜索，直接观看视频！"
        )

        with tempfile.TemporaryDirectory() as tmp:
            output_dir = Path(tmp)
            downloaded = output_dir / "videos" / "pending.mp4"
            downloaded.parent.mkdir(parents=True, exist_ok=True)
            downloaded.write_bytes(b"mp4")
            snapshot = {
                "url": "https://www.douyin.com/video/1234567890123456789",
                "text": "护肤推荐",
            }
            expected = {"video_id": "1234567890123456789", "products": []}

            with (
                patch("skincare_web_app.download_douyin_video_with_cdp", return_value=(downloaded, snapshot)) as download_mock,
                patch("skincare_web_app.extract_frames_from_video", return_value=[Path("frame.jpg")]),
                patch("skincare_web_app.analyze_frames", return_value=expected),
            ):
                result = run_url_analysis(url=shared_text, output_dir=output_dir)

            self.assertEqual(result, expected)
            self.assertEqual(download_mock.call_args.args[0], "https://v.douyin.com/rP_8KuKlp8k/")


if __name__ == "__main__":
    unittest.main()
