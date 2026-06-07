# SkinMate CDP Proxy

This service provides the HTTP CDP proxy endpoints expected by the Python backend:

- `GET /health`
- `GET /targets`
- `GET /new?url=...`
- `POST /eval?target=...`
- `GET /close?target=...`

## Environment Variables

- `PORT`: listen port, default `3456`
- `CDP_PROXY_TOKEN`: optional bearer token for proxy auth
- `CDP_PAGE_TIMEOUT_MS`: page navigation timeout, default `60000`
- `CDP_HEADLESS`: Puppeteer headless mode, default `new`

## Local Run

```bash
cd cdp-proxy
npm install
npm start
```

Quick checks:

```bash
curl http://localhost:3456/health
curl "http://localhost:3456/new?url=https://example.com"
```

## Railway Deploy

Create a second Railway service from this repository and set the Root Directory to `cdp-proxy/`.

After deploy, update the backend Railway service variable:

```text
CDP_ENDPOINT=https://your-cdp-proxy-domain
```
