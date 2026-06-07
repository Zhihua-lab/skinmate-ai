import json
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image


TEST_API_KEY = "test-api-key"
TEST_API_SECRET = "test-api-secret"


def write_test_jpeg(path: Path) -> None:
    Image.new("RGB", (8, 8), (20, 40, 60)).save(path, format="JPEG")


class FacePPSkinTests(unittest.TestCase):
    def test_backend_index_html_contains_upload_controls(self):
        from app import create_app

        app = create_app()

        self.assertIn('id="imageInput"', app.index_html)
        self.assertIn('id="preview"', app.index_html)
        self.assertIn("/api/skin-analyze", app.index_html)

    def test_analyze_image_posts_credentials_and_file_to_facepp(self):
        from facepp_skin import (
            FACEPP_API_KEY_ENV,
            FACEPP_API_SECRET_ENV,
            FACEPP_SKIN_ANALYZE_URL,
            analyze_image,
        )

        response = Mock()
        response.json.return_value = {"request_id": "req-1", "result": {"skin_type": 1}}
        response.raise_for_status.return_value = None
        session = Mock()
        session.post.return_value = response

        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "face.jpg"
            write_test_jpeg(image_path)

            with patch.dict("os.environ", {FACEPP_API_KEY_ENV: TEST_API_KEY, FACEPP_API_SECRET_ENV: TEST_API_SECRET}):
                result = analyze_image(image_path, session=session)

        self.assertEqual(result["request_id"], "req-1")
        session.post.assert_called_once()
        self.assertEqual(session.post.call_args.args[0], FACEPP_SKIN_ANALYZE_URL)
        self.assertEqual(
            session.post.call_args.kwargs["data"],
            {"api_key": TEST_API_KEY, "api_secret": TEST_API_SECRET},
        )
        self.assertIn("image_file", session.post.call_args.kwargs["files"])
        self.assertEqual(session.post.call_args.kwargs["timeout"], 30)

    def test_analyze_image_preserves_facepp_error_message_from_400_response(self):
        from facepp_skin import FACEPP_API_KEY_ENV, FACEPP_API_SECRET_ENV, FacePPError, analyze_image

        response = Mock()
        response.status_code = 400
        response.ok = False
        response.json.return_value = {"error_message": "NO_FACE_FOUND", "request_id": "req-1"}
        session = Mock()
        session.post.return_value = response

        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "face.jpg"
            write_test_jpeg(image_path)

            with patch.dict("os.environ", {FACEPP_API_KEY_ENV: TEST_API_KEY, FACEPP_API_SECRET_ENV: TEST_API_SECRET}):
                with self.assertRaises(FacePPError) as context:
                    analyze_image(image_path, session=session)

        self.assertEqual(context.exception.error_message, "NO_FACE_FOUND")
        self.assertEqual(context.exception.status_code, 400)

    def test_analyze_image_reads_credentials_from_local_dotenv_when_env_is_missing(self):
        from facepp_skin import FACEPP_API_KEY_ENV, FACEPP_API_SECRET_ENV, analyze_image

        response = Mock()
        response.ok = True
        response.json.return_value = {"request_id": "req-1", "result": {"skin_type": 1}}
        session = Mock()
        session.post.return_value = response

        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "face.jpg"
            dotenv_path = Path(tmp) / ".env"
            write_test_jpeg(image_path)
            dotenv_path.write_text(
                f"{FACEPP_API_KEY_ENV}=dotenv-api-key\n{FACEPP_API_SECRET_ENV}=dotenv-api-secret\n",
                encoding="utf-8",
            )

            with patch("facepp_skin.DOTENV_PATH", dotenv_path, create=True):
                with patch.dict("os.environ", {}, clear=True):
                    analyze_image(image_path, session=session)

        self.assertEqual(
            session.post.call_args.kwargs["data"],
            {"api_key": "dotenv-api-key", "api_secret": "dotenv-api-secret"},
        )

    def test_analyze_image_uses_default_credentials_when_no_env_or_dotenv_is_set(self):
        from facepp_skin import DEFAULT_FACEPP_API_KEY, DEFAULT_FACEPP_API_SECRET, analyze_image

        response = Mock()
        response.ok = True
        response.json.return_value = {"request_id": "req-1", "result": {"skin_type": 1}}
        session = Mock()
        session.post.return_value = response

        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "face.jpg"
            write_test_jpeg(image_path)

            with patch("facepp_skin.DOTENV_PATH", Path(tmp) / ".env", create=True):
                with patch.dict("os.environ", {}, clear=True):
                    analyze_image(image_path, session=session)

        self.assertEqual(
            session.post.call_args.kwargs["data"],
            {"api_key": DEFAULT_FACEPP_API_KEY, "api_secret": DEFAULT_FACEPP_API_SECRET},
        )

    def test_analyze_image_reencodes_upload_to_jpeg_even_when_extension_is_jpg(self):
        from PIL import Image

        from facepp_skin import FACEPP_API_KEY_ENV, FACEPP_API_SECRET_ENV, analyze_image

        response = Mock()
        response.ok = True
        response.json.return_value = {"request_id": "req-1", "result": {"skin_type": 1}}
        session = Mock()
        session.post.return_value = response

        source = BytesIO()
        Image.new("RGBA", (8, 8), (20, 40, 60, 128)).save(source, format="PNG")

        with tempfile.TemporaryDirectory() as tmp:
            image_path = Path(tmp) / "misleading.jpg"
            image_path.write_bytes(source.getvalue())

            with patch.dict("os.environ", {FACEPP_API_KEY_ENV: TEST_API_KEY, FACEPP_API_SECRET_ENV: TEST_API_SECRET}):
                analyze_image(image_path, session=session)

        filename, file_obj, content_type = session.post.call_args.kwargs["files"]["image_file"]
        uploaded = file_obj.read()
        self.assertEqual(filename, "misleading.jpg")
        self.assertEqual(content_type, "image/jpeg")
        self.assertEqual(uploaded[:2], b"\xff\xd8")

    def test_summarize_result_translates_skin_type_and_boolean_flags(self):
        from facepp_skin import summarize_skin_result

        raw = {
            "request_id": "req-1",
            "face_rectangle": {"top": 10, "left": 20, "width": 200, "height": 220},
            "result": {
                "skin_type": 4,
                "acne": {"value": 1},
                "blackhead": {"value": 0},
                "dark_circle": {"value": 1},
                "forehead_pore": {"value": 2},
            },
        }

        summary = summarize_skin_result(raw)

        self.assertEqual(summary["request_id"], "req-1")
        self.assertEqual(summary["skin_type"], "混合性皮肤")
        self.assertEqual(summary["face_rectangle"]["width"], 200)
        self.assertIn({"key": "acne", "name": "痘痘", "status": "有", "raw_value": 1}, summary["skin_states"])
        self.assertIn({"key": "blackhead", "name": "黑头", "status": "无", "raw_value": 0}, summary["skin_states"])
        self.assertIn({"key": "forehead_pore", "name": "前额毛孔", "status": "轻度/可见", "raw_value": 2}, summary["skin_states"])

    def test_backend_handler_rejects_missing_multipart_file(self):
        from app import create_app

        app = create_app()

        status, headers, body = app.handle_skin_analyze(
            content_type="multipart/form-data; boundary=----x",
            body=b"------x--\r\n",
        )

        self.assertEqual(status, 400)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertIn("image file is required", json.loads(body.decode("utf-8"))["error"])

    def test_backend_handler_accepts_image_upload_and_returns_summary(self):
        from app import create_app

        app = create_app()
        boundary = "----skin-boundary"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="image"; filename="face.jpg"\r\n'
            "Content-Type: image/jpeg\r\n"
            "\r\n"
        ).encode("utf-8") + b"jpeg-bytes" + f"\r\n--{boundary}--\r\n".encode("utf-8")

        raw = {"request_id": "req-1", "result": {"skin_type": 1, "acne": {"value": 1}}}
        with patch("app.analyze_image", return_value=raw) as analyze_mock:
            status, headers, response_body = app.handle_skin_analyze(
                content_type=f"multipart/form-data; boundary={boundary}",
                body=body,
            )

        payload = json.loads(response_body.decode("utf-8"))
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(payload["skin_type"], "油性皮肤")
        self.assertEqual(payload["skin_states"][0]["name"], "痘痘")
        analyze_mock.assert_called_once()


    def test_backend_handler_returns_facepp_error_payload(self):
        from app import create_app
        from facepp_skin import FacePPError

        app = create_app()
        boundary = "----skin-boundary"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="image"; filename="face.jpg"\r\n'
            "Content-Type: image/jpeg\r\n"
            "\r\n"
        ).encode("utf-8") + b"jpeg-bytes" + f"\r\n--{boundary}--\r\n".encode("utf-8")

        error = FacePPError("NO_FACE_FOUND", status_code=400, payload={"error_message": "NO_FACE_FOUND"})
        with patch("app.analyze_image", side_effect=error):
            status, headers, response_body = app.handle_skin_analyze(
                content_type=f"multipart/form-data; boundary={boundary}",
                body=body,
            )

        payload = json.loads(response_body.decode("utf-8"))
        self.assertEqual(status, 400)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(payload["facepp_error"], "NO_FACE_FOUND")


if __name__ == "__main__":
    unittest.main()
