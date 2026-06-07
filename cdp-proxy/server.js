import crypto from "node:crypto";
import express from "express";
import puppeteer from "puppeteer";

const PORT = Number(process.env.PORT || 3456);
const HOST = process.env.HOST || "0.0.0.0";
const AUTH_TOKEN = process.env.CDP_PROXY_TOKEN || "";
const PAGE_TIMEOUT_MS = Number(process.env.CDP_PAGE_TIMEOUT_MS || 60000);
const HEADLESS_MODE = process.env.CDP_HEADLESS || "new";
const EVAL_RETRY_COUNT = Number(process.env.CDP_EVAL_RETRY_COUNT || 5);
const EVAL_RETRY_DELAY_MS = Number(process.env.CDP_EVAL_RETRY_DELAY_MS || 750);
const NAVIGATION_WAIT_UNTIL = process.env.CDP_WAIT_UNTIL || "domcontentloaded";
const POST_GOTO_SETTLE_MS = Number(process.env.CDP_POST_GOTO_SETTLE_MS || 2500);
const DEFAULT_USER_AGENT =
  process.env.CDP_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientEvaluationError(message) {
  const text = message.toLowerCase();
  return (
    text.includes("context") ||
    text.includes("execution context") ||
    text.includes("cannot find context") ||
    text.includes("inspector error") ||
    text.includes("target closed")
  );
}

function isRecoverableNavigationError(message) {
  const text = message.toLowerCase();
  return (
    text.includes("timeout") ||
    text.includes("net::err") ||
    text.includes("navigation") ||
    text.includes("frame was detached") ||
    text.includes("target closed")
  );
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
    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.setViewport({ width: 1440, height: 900 });
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    const cdpSession = await page.target().createCDPSession();
    await cdpSession.send("Runtime.enable");
    const targetId = crypto.randomUUID();
    let navigationWarning = null;

    try {
      await page.goto(url, { waitUntil: NAVIGATION_WAIT_UNTIL, timeout: PAGE_TIMEOUT_MS });
      await page.waitForFunction(
        () => Boolean(document.body && document.documentElement),
        { timeout: 10000 }
      ).catch(() => {});
      if (POST_GOTO_SETTLE_MS > 0) {
        await sleep(POST_GOTO_SETTLE_MS);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isRecoverableNavigationError(message)) {
        throw error;
      }
      navigationWarning = message;
      console.warn("cdp-proxy /new navigation warning", {
        targetId,
        url,
        warning: message
      });
    }

    targets.set(targetId, { page, cdpSession });
    res.json({ targetId, warning: navigationWarning });
  } catch (error) {
    console.error("cdp-proxy /new failed", {
      url,
      error: error instanceof Error ? error.stack || error.message : String(error)
    });
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
    const looksLikeSnapshotRequest =
      script.includes("document.title") &&
      script.includes("querySelectorAll('video')") &&
      script.includes("document.documentElement.innerHTML");

    let lastError = null;
    for (let attempt = 1; attempt <= EVAL_RETRY_COUNT; attempt += 1) {
      try {
        if (looksLikeSnapshotRequest) {
          await target.page.waitForFunction(
            () => Boolean(document.body && document.documentElement),
            { timeout: 5000 }
          ).catch(() => {});
        }
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
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (attempt < EVAL_RETRY_COUNT && isTransientEvaluationError(message)) {
          await sleep(EVAL_RETRY_DELAY_MS);
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error("Runtime.evaluate failed");
  } catch (error) {
    console.error("cdp-proxy /eval failed", {
      targetId,
      scriptPreview: script.slice(0, 500),
      error: error instanceof Error ? error.stack || error.message : String(error)
    });
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
