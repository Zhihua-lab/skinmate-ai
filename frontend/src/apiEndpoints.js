function normalizeBase(apiBase = '') {
  return String(apiBase || '').trim().replace(/\/$/, '');
}

export function resolveAnalyzeEndpoint(apiBase = '', isProd = false) {
  const base = normalizeBase(apiBase);
  if (base) return `${base}/analyze-video`;
  return isProd ? '/.netlify/functions/analyze-video' : '/api/analyze-video';
}

export function resolveReviseEndpoint(apiBase = '', isProd = false) {
  const base = normalizeBase(apiBase);
  if (base) return `${base}/revise-plan`;
  return isProd ? '/.netlify/functions/revise-plan' : '/api/revise-plan';
}
