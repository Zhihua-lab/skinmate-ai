import { resolveReviseEndpoint } from './apiEndpoints';

function formatApiError(data, status) {
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map(item => item?.msg || JSON.stringify(item)).join('；');
  }
  if (data?.error) return String(data.error);
  return `方案调整失败（HTTP ${status || '未知'}），请稍后重试`;
}

function normalizeStep(step, index) {
  return {
    id: Number(step?.id) || index + 1,
    label: String(step?.label || `步骤 ${index + 1}`),
    title: String(step?.title || `护理 ${index + 1}`),
    description: String(step?.description || ''),
    product: String(step?.product || '待补充'),
    price: Number.isFinite(Number(step?.price)) ? Number(step.price) : null,
    volume: String(step?.volume || ''),
    tone: String(step?.tone || ['blue', 'green', 'purple', 'orange'][index % 4]),
    benefits: Array.isArray(step?.benefits) ? step.benefits.map(String) : [],
    ingredients: Array.isArray(step?.ingredients) ? step.ingredients.map(String) : [],
    usage: String(step?.usage || ''),
    sources: Array.isArray(step?.sources)
      ? step.sources.map(source => ({
        v: Number(source?.v) || 0,
        time: String(source?.time || ''),
        quote: String(source?.quote || ''),
      }))
      : [],
  };
}

export async function revisePlan({ plan, instruction, chatHistory = [], planMeta = null }) {
  const endpoint = resolveReviseEndpoint(import.meta.env.VITE_API_BASE || '', import.meta.env.PROD);
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        instruction,
        chat_history: chatHistory,
        plan_meta: planMeta,
      }),
    });
  } catch (error) {
    if (error?.name === 'TypeError') {
      throw new Error('无法连接方案调整服务，请确认后端已启动并且网络正常。');
    }
    throw error;
  }

  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(formatApiError({}, response.status));
    }
  }

  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }

  if (!Array.isArray(data?.plan)) {
    throw new Error('后端没有返回有效的新方案。');
  }

  return {
    assistantReply: String(data?.assistant_reply || '已根据你的要求调整方案。'),
    plan: data.plan.map(normalizeStep),
  };
}
