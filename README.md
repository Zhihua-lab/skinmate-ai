# SkinMate AI

这是 `SkinMate AI` 的代码仓库，目前同时包含：

- `frontend/`：前端 Web App
- 当前根目录下的 Python 视频解析后端
- `ai/`、`backend/`、`docs/`：后续模块说明与占位目录

## Repository Structure

```text
skinmate-ai/
├─ frontend/                # 前端 Web App
├─ ai/                      # AI 模块说明
├─ backend/                 # 后端模块说明
├─ docs/                    # 文档
├─ photos/                  # 设计素材
├─ scripts/                 # 素材处理脚本
├─ app.py                   # FastAPI 入口
├─ skincare_video_analyzer.py
├─ skincare_web_app.py
├─ analyze_skincare_douyin.py
├─ requirements.txt
├─ Procfile
└─ README.md
```

## Frontend

前端代码位于 `frontend/`，保留原有项目结构与资源文件。

本地开发：

```bash
cd frontend
npm install
npm run dev
```

## Python Backend

当前 Python 后端用于处理抖音护肤视频，提供 FastAPI 接口。

### API

- `GET /health`
- `POST /analyze-video`

请求体示例：

```json
{
  "url": "https://www.douyin.com/video/1234567890123456789"
}
```

返回结构示例：

```json
{
  "success": true,
  "video_id": "1234567890123456789",
  "markdown": "# Video Analysis\n...",
  "analysis": {}
}
```

### Environment Variables

参考 [`.env.example`](C:/Users/Kevin/Desktop/skincare-ai-backend/.env.example)：

```env
DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen3-vl-flash
OUTPUT_DIR=skincare_outputs
CDP_ENDPOINT=http://localhost:3456
```

### Local Run

```bash
uvicorn app:app --reload
```

### Deploy Run

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

## Deployment Risk

当前抖音链接解析依赖本地或外部可访问的 Chrome CDP 服务，默认使用 `CDP_ENDPOINT=http://localhost:3456`。

在 Railway / Render 上，如果没有额外提供可访问的 Chrome CDP 服务，抖音页面打开、重定向解析和视频下载流程可能失败。

在这种情况下：

- 直接解析抖音分享链接可能失败
- 但本地视频文件分析或已有帧目录分析仍然可以作为 fallback 使用

## Final Deployment Steps

1. 推送项目到 GitHub。
2. 在 Railway 或 Render 中创建新的 Web Service，并连接 GitHub 仓库。
3. 在平台中配置以下环境变量：
   - `DASHSCOPE_API_KEY`
   - `DASHSCOPE_MODEL`
   - `OUTPUT_DIR`
   - `CDP_ENDPOINT`
4. 启动命令设置为：

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

5. 等待平台完成部署。
6. 部署完成后测试以下接口：
   - `GET /health`
   - `POST /analyze-video`

示例请求：

```bash
curl -X POST "https://your-service-url/analyze-video" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://www.douyin.com/video/1234567890123456789\"}"
```
