Netlify redeploy trigger
# SkinMate AI

这个仓库现在按职责分成了更清晰的结构：

- [frontend](C:/Users/Kevin/Desktop/skincare-ai-backend/frontend/)：前端 Web App
- [backend](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/)：Python 视频解析后端
- [ai](C:/Users/Kevin/Desktop/skincare-ai-backend/ai/)：AI 模块说明
- [docs](C:/Users/Kevin/Desktop/skincare-ai-backend/docs/)：文档

## Structure

```text
skinmate-ai/
├─ frontend/   # 前端项目
├─ backend/    # FastAPI + 抖音护肤视频解析后端
├─ ai/         # AI 模块说明
├─ docs/       # 产品/技术文档
├─ photos/     # 设计素材
├─ scripts/    # 素材处理脚本
└─ README.md
```

## Frontend

前端开发：

```bash
cd frontend
npm install
npm run dev
```

## Backend

后端说明、环境变量、运行方式和部署方式见：

- [backend/README.md](C:/Users/Kevin/Desktop/skincare-ai-backend/backend/README.md)

后端本地开发：

```bash
cd backend
uvicorn app:app --reload
```
