# SkinMate AI Backend

这是用于处理抖音护肤视频的 Python 后端，已整理到 `backend/` 目录下，便于和前端项目分离部署。

## Files

主要文件：

- [app.py](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/app.py)：FastAPI 入口
- [skincare_video_analyzer.py](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/skincare_video_analyzer.py)：核心分析逻辑
- [skincare_web_app.py](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/skincare_web_app.py)：原轻量 Web 调用层
- [analyze_skincare_douyin.py](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/analyze_skincare_douyin.py)：CLI 入口
- [requirements.txt](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/requirements.txt)：Python 依赖
- [Procfile](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/Procfile)：部署启动文件

## API

- `GET /health`
- `POST /analyze-video`

请求体示例：

```json
{
  "url": "https://www.douyin.com/video/1234567890123456789"
}
```

## Environment Variables

参考 [`.env.example`](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/.env.example)：

```env
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen3-vl-flash
OUTPUT_DIR=skincare_outputs
CDP_ENDPOINT=http://localhost:3456
```

## Local Run

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

## Deploy Run

如果在 Railway / Render 上部署，建议把服务根目录设置为 `backend/`，启动命令为：

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

## Deployment Steps

1. 将仓库推送到 GitHub。
2. 在 Railway 或 Render 中连接该仓库。
3. 将服务根目录设置为 `backend/`。
4. 配置以下环境变量：
   - `DASHSCOPE_API_KEY`
   - `DASHSCOPE_MODEL`
   - `OUTPUT_DIR`
   - `CDP_ENDPOINT`
5. 启动命令设置为：

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

6. 部署完成后测试：
   - `GET /health`
   - `POST /analyze-video`

## Deployment Risk

当前抖音链接解析依赖本地或外部可访问的 Chrome CDP 服务，默认使用 `CDP_ENDPOINT=http://localhost:3456`。

如果 Railway / Render 上没有可访问的 Chrome CDP 服务，抖音链接解析和视频下载可能失败。

在这种情况下：

- 直接解析抖音分享链接可能失败
- 本地视频文件分析或已有帧目录分析仍可作为 fallback 使用
