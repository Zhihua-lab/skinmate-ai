import crypto from "node:crypto";
import express from "express";
import puppeteer from "puppeteer";

const PORT = Number(process.env.PORT || 3456);
const HOST = process.env.HOST || "0.0.0.0";
const AUTH_TOKEN = process.env.CDP_PROXY_TOKEN || "";
const PAGE_TIMEOUT_MS = Number(process.env.CDP_PAGE_TIMEOUT_MS || 60000);
const HEADLESS_MODE = process.env.CDP_HEADLESS || "new";

const app = express();
app.use(express.text({ type: "*/*", limit: "512kb" }));

let browserPromise = null;
const targets = new Map();

function requireAuth(req, res, next) {
  if (!AUTH_TOKEN) {
    next();
    return;
  }
  const header = req.get("authorization") || "";
  if (header === `Bearer ${AUTH_TOKEN}`) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: HEADLESS_MODE,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
  }
  return browserPromise;
}

async function closeTarget(targetId) {
  const target = targets.get(targetId);
  if (!target) return false;
  targets.delete(targetId);
  await target.page.close().catch(() => {});
  return true;
}

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    active_targets: targets.size,
    auth_enabled: Boolean(AUTH_TOKEN)
  });
});

app.get("/targets", requireAuth, (_req, res) => {
  res.json({
    targets: [...targets.keys()]
  });
});

app.get("/new", requireAuth, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
    const cdpSession = await page.target().createCDPSession();
    await cdpSession.send("Runtime.enable");
    const targetId = crypto.randomUUID();
    targets.set(targetId, { page, cdpSession });
    res.json({ targetId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/eval", requireAuth, async (req, res) => {
  const targetId = String(req.query.target || "").trim();
  const script = String(req.body || "").trim();
  if (!targetId) {
    res.status(400).json({ error: "target is required" });
    return;
  }
  if (!script) {
    res.status(400).json({ error: "script body is required" });
    return;
  }

  const target = targets.get(targetId);
  if (!target) {
    res.status(404).json({ error: `Unknown target: ${targetId}` });
    return;
  }

  try {
    const result = await target.cdpSession.send("Runtime.evaluate", {
      expression: script,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.text || "Runtime.evaluate failed";
      const description = result.exceptionDetails.exception?.description || "";
      throw new Error(description ? `${text}: ${description}` : text);
    }
    res.json({ value: result.result?.value ?? null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/close", requireAuth, async (req, res) => {
  const targetId = String(req.query.target || "").trim();
  if (!targetId) {
    res.status(400).json({ error: "target is required" });
    return;
  }

  const closed = await closeTarget(targetId);
  if (!closed) {
    res.status(404).json({ error: `Unknown target: ${targetId}` });
    return;
  }
  res.json({ success: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

async function shutdown(signal) {
  for (const targetId of [...targets.keys()]) {
    await closeTarget(targetId);
  }
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    browserPromise = null;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
  process.stdout.write(`Received ${signal}, shutting down cdp-proxy\n`);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

app.listen(PORT, HOST, () => {
  process.stdout.write(`cdp-proxy listening on http://${HOST}:${PORT}\n`);
});
