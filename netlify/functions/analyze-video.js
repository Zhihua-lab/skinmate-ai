exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: 'Method not allowed' }),
    };
  }

  const backend = (process.env.BACKEND_URL || process.env.VITE_API_BASE || '').replace(/\/$/, '');
  if (!backend) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detail: '后端地址未配置。请在 Netlify 环境变量中设置 BACKEND_URL 为你的 Railway 后端地址。',
      }),
    };
  }

  try {
    const response = await fetch(`${backend}/analyze-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body,
    });
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detail: `无法连接后端服务（${backend}）：${error.message}`,
      }),
    };
  }
};
