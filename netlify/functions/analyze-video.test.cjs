const assert = require('node:assert/strict');
const test = require('node:test');

const { handler } = require('./analyze-video.js');

test('falls back to demo analysis when backend url is missing', async () => {
  const previousBackendUrl = process.env.BACKEND_URL;
  const previousApiBase = process.env.VITE_API_BASE;
  delete process.env.BACKEND_URL;
  delete process.env.VITE_API_BASE;

  try {
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ url: 'https://www.douyin.com/video/1234567890123456789' }),
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.success, true);
    assert.equal(body.analysis.is_demo_fallback, true);
    assert.ok(Array.isArray(body.analysis.products));
    assert.ok(body.analysis.products.length > 0);
  } finally {
    if (previousBackendUrl === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previousBackendUrl;
    if (previousApiBase === undefined) delete process.env.VITE_API_BASE;
    else process.env.VITE_API_BASE = previousApiBase;
  }
});
