# Face++ Skin Analysis Backend

Small backend demo for uploading one face photo and calling Face++ Skin Analyze.

## Setup

```powershell
cd backend\facepp_skin_demo
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and fill in FACEPP_API_KEY / FACEPP_API_SECRET
python app.py --host 127.0.0.1 --port 8091
```

Open the test page:

```text
http://127.0.0.1:8091/
```

Health check:

```powershell
curl http://127.0.0.1:8091/health
```

API call:

```powershell
curl.exe -X POST http://127.0.0.1:8091/api/skin-analyze -F "image=@C:\path\to\face.jpg"
```

## Notes

- Multipart field name must be `image`.
- Uploaded images are normalized before calling Face++: EXIF orientation is applied, image mode is converted to RGB, the long edge is capped, and the file is re-encoded as JPEG.
- Face++ credentials are read from environment variables first, then from local `.env`. Do not commit real credentials.
