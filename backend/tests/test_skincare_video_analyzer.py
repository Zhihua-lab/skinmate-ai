import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import numpy as np


class SkincareVideoAnalyzerTests(unittest.TestCase):
    def test_extracts_video_id_from_modal_link(self):
        from skincare_video_analyzer import extract_video_id

        url = "https://www.douyin.com/search/%E6%8A%A4%E8%82%A4?modal_id=7597309249148046602&type=general"

        self.assertEqual(extract_video_id(url), "7597309249148046602")

    def test_extracts_video_id_from_video_path(self):
        from skincare_video_analyzer import extract_video_id

        url = "https://www.douyin.com/video/7618999660313719715"

        self.assertEqual(extract_video_id(url), "7618999660313719715")

    def test_extracts_douyin_url_from_shared_copy_text(self):
        from skincare_video_analyzer import extract_douyin_url

        text = (
            "2.56 :7pm ATL:/ o@Q.xF 06/10 适合大部分人的日常护肤教程~ "
            "https://v.douyin.com/rP_8KuKlp8k/ 复制此链接，打开Dou音搜索，直接观看视频！"
        )

        self.assertEqual(extract_douyin_url(text), "https://v.douyin.com/rP_8KuKlp8k/")

    def test_extracts_douyin_url_from_common_full_link_formats(self):
        from skincare_video_analyzer import extract_douyin_url

        cases = [
            "https://www.douyin.com/video/7618999660313719715",
            "https://www.douyin.com/search/%E6%8A%A4%E8%82%A4?modal_id=7597309249148046602&type=general",
            "https://m.douyin.com/share/video/7612231330385972514",
            "https://www.iesdouyin.com/share/video/7612231330385972514/?region=CN",
        ]

        for url in cases:
            with self.subTest(url=url):
                text = f"copy this link {url}\uff0copen Douyin"

                self.assertEqual(extract_douyin_url(text), url)
    def test_extracts_douyin_url_rejects_text_without_link(self):
        from skincare_video_analyzer import extract_douyin_url

        with self.assertRaises(ValueError):
            extract_douyin_url("只有文案，没有链接")

    def test_prompt_requires_skincare_output_fields(self):
        from skincare_video_analyzer import build_skincare_prompt

        prompt = build_skincare_prompt(
            video_id="1234567890123456789",
            source_url="https://www.douyin.com/video/1234567890123456789",
            page_text="护肤推荐视频",
        )

        for field in [
            "products",
            "recommend_reasons",
            "claimed_effects",
            "skin_types",
            "usage_context",
            "evidence",
            "uncertain_items",
        ]:
            self.assertIn(field, prompt)
        self.assertIn("护肤", prompt)
        self.assertIn("不要补全没有证据支持的信息", prompt)

    @patch.dict("os.environ", {"LLM_API_KEY": "test-key"}, clear=True)
    def test_llm_headers_use_env_api_key(self):
        from skincare_video_analyzer import build_llm_headers

        headers = build_llm_headers()

        self.assertEqual(headers["Authorization"], "Bearer test-key")
        self.assertEqual(headers["Content-Type"], "application/json")

    @patch.dict("os.environ", {}, clear=True)
    def test_llm_headers_require_api_key(self):
        from skincare_video_analyzer import build_llm_headers

        with self.assertRaises(RuntimeError):
            build_llm_headers()

    @patch.dict("os.environ", {"LLM_PROVIDER": "deepseek", "LLM_API_KEY": "k"}, clear=True)
    def test_deepseek_chat_url_defaults_correctly(self):
        from skincare_video_analyzer import get_llm_chat_url

        self.assertEqual(get_llm_chat_url(), "https://api.deepseek.com/chat/completions")

    @patch.dict("os.environ", {"LLM_PROVIDER": "deepseek", "LLM_API_KEY": "k"}, clear=True)
    def test_deepseek_provider_rejects_multimodal_frames(self):
        from skincare_video_analyzer import build_multimodal_payload

        with self.assertRaises(RuntimeError):
            build_multimodal_payload(
                video_id="1234567890123456789",
                source_url="https://www.douyin.com/video/1234567890123456789",
                frames=[],
                page_text="test",
            )

    @patch.dict("os.environ", {"DASHSCOPE_API_KEY": "legacy-key"}, clear=True)
    def test_dashscope_api_key_is_still_supported(self):
        from skincare_video_analyzer import get_llm_api_key

        self.assertEqual(get_llm_api_key(), "legacy-key")

    def test_normalize_analysis_result_fills_required_fields(self):
        from skincare_video_analyzer import normalize_analysis_result

        result = normalize_analysis_result(
            {"products": [{"name": "A 精华", "brand": "A"}], "quality_notes": "模型返回了字符串"},
            video_id="1234567890123456789",
            source_url="https://www.douyin.com/video/1234567890123456789",
        )

        self.assertEqual(result["video_id"], "1234567890123456789")
        self.assertEqual(result["source_url"], "https://www.douyin.com/video/1234567890123456789")
        self.assertEqual(result["products"], [{"name": "A 精华", "brand": "A"}])
        for field in [
            "recommend_reasons",
            "claimed_effects",
            "skin_types",
            "usage_context",
            "evidence",
            "uncertain_items",
        ]:
            self.assertIn(field, result)
            self.assertEqual(result[field], [])
        self.assertEqual(result["quality_notes"], ["模型返回了字符串"])

    def test_sample_video_times_caps_dense_sampling_evenly(self):
        from skincare_video_analyzer import sample_video_times

        times = sample_video_times(duration_seconds=64, interval_seconds=2, max_frames=5)

        self.assertEqual(times, [0.0, 16.0, 32.0, 48.0, 64.0])

    def test_sample_video_times_keeps_short_video_dense(self):
        from skincare_video_analyzer import sample_video_times

        times = sample_video_times(duration_seconds=7, interval_seconds=2, max_frames=30)

        self.assertEqual(times, [0.0, 2.0, 4.0, 6.0, 7.0])

    def test_extract_frames_from_video_writes_sampled_jpegs(self):
        from skincare_video_analyzer import extract_frames_from_video

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            video_path = tmp_path / "sample.mp4"
            frames_dir = tmp_path / "frames"
            video_path.write_bytes(b"fake-mp4")
            fake_frames = [
                np.full((64, 64, 3), fill_value=value, dtype=np.uint8)
                for value in (0, 80, 160)
            ]

            with (
                patch("skincare_video_analyzer.iio.immeta", return_value={"duration": 2, "fps": 1}),
                patch("skincare_video_analyzer.read_video_frame_with_fallback", side_effect=fake_frames),
            ):
                extracted = extract_frames_from_video(
                    video_path=video_path,
                    output_dir=frames_dir,
                    interval_seconds=1,
                    max_frames=3,
                )

            self.assertEqual(len(extracted), 3)
            self.assertTrue(all(path.exists() for path in extracted))
            self.assertEqual([path.suffix for path in extracted], [".jpg", ".jpg", ".jpg"])

    def test_read_video_frame_with_fallback_steps_back_from_bad_tail_index(self):
        from skincare_video_analyzer import read_video_frame_with_fallback

        expected = np.full((8, 8, 3), fill_value=128, dtype=np.uint8)

        with patch("skincare_video_analyzer.iio.imread", side_effect=[IndexError(100), expected]) as imread:
            frame = read_video_frame_with_fallback(Path("sample.mp4"), frame_index=100, step=25, max_attempts=2)

        self.assertTrue(np.array_equal(frame, expected))
        self.assertEqual(imread.call_args_list[0].kwargs["index"], 100)
        self.assertEqual(imread.call_args_list[1].kwargs["index"], 75)

    def test_extract_video_sources_from_snapshot_prefers_loaded_srcs(self):
        from skincare_video_analyzer import extract_video_sources_from_snapshot

        snapshot = {
            "videos": [
                {"src": "", "currentSrc": ""},
                {"src": "https://example.com/poster.jpg", "currentSrc": "https://v11.douyinvod.com/video.mp4"},
                {"src": "https://v11.douyinvod.com/video.mp4", "currentSrc": ""},
            ],
            "html": '<video src="https://ignored.example.com/not-used.mp4"></video>',
        }

        self.assertEqual(extract_video_sources_from_snapshot(snapshot), ["https://v11.douyinvod.com/video.mp4"])

    def test_pick_video_source_rejects_missing_video(self):
        from skincare_video_analyzer import pick_video_source

        with self.assertRaises(ValueError):
            pick_video_source([])

    def test_download_video_writes_streamed_bytes(self):
        from skincare_video_analyzer import download_video

        response = Mock()
        response.iter_content.return_value = [b"abc", b"", b"def"]
        response.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = MagicMock()
        session.get.return_value.__enter__.return_value = response

        with tempfile.TemporaryDirectory() as tmp:
            output_path = Path(tmp) / "video.mp4"

            result = download_video("https://v11.douyinvod.com/video.mp4", output_path, session=session)

            self.assertEqual(result, output_path)
            self.assertEqual(output_path.read_bytes(), b"abcdef")
            session.get.assert_called_once()

    def test_parse_cdp_eval_response_accepts_json_string_value(self):
        from skincare_video_analyzer import parse_cdp_eval_response

        payload = {"value": '{"text":"page copy","videos":[{"currentSrc":"https://v26.douyinvod.com/video.mp4"}]}'}

        result = parse_cdp_eval_response(payload)

        self.assertEqual(result["text"], "page copy")
        self.assertEqual(result["videos"][0]["currentSrc"], "https://v26.douyinvod.com/video.mp4")

    def test_fetch_douyin_snapshot_uses_cdp_proxy(self):
        from skincare_video_analyzer import fetch_douyin_snapshot_with_cdp

        new_response = Mock()
        new_response.json.return_value = {"targetId": "target-1"}
        new_response.raise_for_status.return_value = None
        eval_response = Mock()
        eval_response.json.return_value = {"value": '{"text":"copy","videos":[{"currentSrc":"https://v26.douyinvod.com/video.mp4"}]}'}
        eval_response.raise_for_status.return_value = None
        close_response = Mock()
        close_response.raise_for_status.return_value = None
        session = Mock()
        session.get.side_effect = [new_response, close_response]
        session.post.return_value = eval_response

        snapshot = fetch_douyin_snapshot_with_cdp(
            "https://www.douyin.com/video/1234567890123456789",
            session=session,
            attempts=1,
            wait_seconds=0,
        )

        self.assertEqual(snapshot["text"], "copy")
        self.assertEqual(snapshot["videos"][0]["currentSrc"], "https://v26.douyinvod.com/video.mp4")
        self.assertEqual(session.get.call_count, 2)
        session.post.assert_called_once()


    @patch.dict("os.environ", {"CDP_PROXY_TOKEN": "secret-token"})
    def test_fetch_douyin_snapshot_sends_cdp_proxy_auth_header(self):
        from skincare_video_analyzer import fetch_douyin_snapshot_with_cdp

        new_response = Mock()
        new_response.json.return_value = {"targetId": "target-1"}
        new_response.raise_for_status.return_value = None
        eval_response = Mock()
        eval_response.json.return_value = {"value": '{"text":"copy","videos":[{"currentSrc":"https://v26.douyinvod.com/video.mp4"}]}' }
        eval_response.raise_for_status.return_value = None
        close_response = Mock()
        close_response.raise_for_status.return_value = None
        session = Mock()
        session.get.side_effect = [new_response, close_response]
        session.post.return_value = eval_response

        fetch_douyin_snapshot_with_cdp(
            "https://www.douyin.com/video/1234567890123456789",
            session=session,
            attempts=1,
            wait_seconds=0,
        )

        expected_headers = {"Authorization": "Bearer secret-token"}
        self.assertEqual(session.get.call_args_list[0].kwargs["headers"], expected_headers)
        self.assertEqual(session.post.call_args.kwargs["headers"], expected_headers)
        self.assertEqual(session.get.call_args_list[1].kwargs["headers"], expected_headers)


if __name__ == "__main__":
    unittest.main()
