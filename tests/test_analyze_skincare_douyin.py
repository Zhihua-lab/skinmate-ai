import io
import json
import unittest


class AnalyzeSkincareDouyinTests(unittest.TestCase):
    def test_write_json_result_uses_utf8_bytes(self):
        from analyze_skincare_douyin import write_json_result

        stream = io.BytesIO()

        write_json_result({"text": "𝓨护肤"}, stream=stream)

        self.assertEqual(json.loads(stream.getvalue().decode("utf-8")), {"text": "𝓨护肤"})


if __name__ == "__main__":
    unittest.main()
