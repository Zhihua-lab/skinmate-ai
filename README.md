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

## Railway Deploy

Railway 鐨勬瀯寤哄鏋滄槸浠撳簱鏍圭洰褰曞紑濮嬶紝鐜板湪涔熷彲浠ョ洿鎺ラ儴缃层€?

- 鏍圭洰褰?`requirements.txt` 浼氬紩鐢?`backend/requirements.txt`
- 鏍圭洰褰?`Procfile` 浼氳嚜鍔ㄨ繘鍏?`backend/` 鍚姩 FastAPI

涔熷氨鏄锛屼綘鍙互缁х画鎶?Railway 鐨?Root Directory 璁句负 `backend/`锛屼篃鍙互涓嶈锛屼袱绉嶉兘鑳藉伐浣溿€?
