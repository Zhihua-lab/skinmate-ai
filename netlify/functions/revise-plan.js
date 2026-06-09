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
        detail: 'Backend URL is not configured. Set BACKEND_URL in Netlify environment variables.',
      }),
    };
  }

  try {
    const response = await fetch(`${backend}/revise-plan`, {
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
        detail: `Failed to connect to backend (${backend}): ${error.message}`,
      }),
    };
  }
};
