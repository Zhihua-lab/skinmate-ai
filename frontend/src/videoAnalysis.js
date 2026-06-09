import { resolveAnalyzeEndpoint } from './apiEndpoints';

const STEP_TONES = ['blue', 'green', 'purple', 'orange'];

const CATEGORY_RULES = [
  { title: '洁面', keywords: ['洁面', '洗面', '清洁', 'cleanser'] },
  { title: '补水', keywords: ['水', '喷雾', '爽肤', '化妆水', 'toner', 'hydrat'] },
  { title: '精华', keywords: ['精华', 'serum', '安瓶', '原液'] },
  { title: '保湿', keywords: ['乳', '霜', '面霜', '保湿', '乳液', 'moistur'] },
  { title: '防晒', keywords: ['防晒', 'sunscreen', 'spf'] },
  { title: '面膜', keywords: ['面膜', 'mask'] },
];

function inferStepTitle(category = '', name = '') {
  const text = `${category} ${name}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) return rule.title;
  }
  return category || '护理';
}

function categorySortIndex(category = '', name = '') {
  const title = inferStepTitle(category, name);
  const index = CATEGORY_RULES.findIndex(rule => rule.title === title);
  return index === -1 ? 99 : index;
}

function formatTime(value) {
  if (value === undefined || value === null || value === '') return '00:00';
  if (typeof value === 'string' && value.includes(':')) return value;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return String(value);
}

function pickText(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.reason || item.effect || item.context || item.usage || item.text || '';
}

function matchesProduct(item, productName) {
  if (!item || !productName) return false;
  const refs = item.product_refs || item.products || [];
  if (Array.isArray(refs) && refs.some(ref => String(ref).includes(productName))) return true;
  return JSON.stringify(item).includes(productName);
}

function buildSources(product, evidenceList) {
  const evidenceById = Object.fromEntries((evidenceList || []).map(item => [item.id, item]));
  const refs = product.evidence_refs || [];
  const sources = refs.map((ref, index) => {
    const evidence = typeof ref === 'string' ? evidenceById[ref] : null;
    const times = product.appearance_times || [];
    return {
      v: 0,
      time: formatTime(times[index] ?? times[0]),
      quote: evidence?.observed_text || evidence?.visual_description || `视频中提及 ${product.name || '该产品'}`,
    };
  });

  if (sources.length) return sources;

  return (product.appearance_times || []).slice(0, 2).map(time => ({
    v: 0,
    time: formatTime(time),
    quote: `视频中 ${formatTime(time)} 出现该产品`,
  }));
}

export function buildPlanFromAnalysis(analysis) {
  const products = analysis?.products || [];
  const evidence = analysis?.evidence || [];
  const reasons = analysis?.recommend_reasons || [];
  const effects = analysis?.claimed_effects || [];
  const usage = analysis?.usage_context || [];

  if (!products.length) {
    throw new Error('未能从视频中识别到护肤产品，请换一个链接试试。');
  }

  const sortedProducts = [...products].sort(
    (a, b) => categorySortIndex(a.category, a.name) - categorySortIndex(b.category, b.name),
  );

  return sortedProducts.map((product, index) => {
    const title = inferStepTitle(product.category, product.name);
    const brand = product.brand || '';
    const name = product.name || '未识别产品';
    const productLabel = [brand, name].filter(Boolean).join(' ').trim() || name;

    const relatedReasons = reasons.filter(item => matchesProduct(item, name));
    const relatedEffects = effects.filter(item => matchesProduct(item, name));
    const relatedUsage = usage.filter(item => matchesProduct(item, name) || JSON.stringify(item).includes(title));

    const description = pickText(relatedReasons[0])
      || pickText(relatedEffects[0])
      || `来自视频的${title}步骤推荐。`;

    const benefits = relatedEffects.map(pickText).filter(Boolean).slice(0, 3);
    if (!benefits.length) benefits.push('按视频建议使用');

    const usageText = pickText(relatedUsage[0]) || '按视频建议的方法使用。';

    return {
      id: index + 1,
      label: `步骤 ${index + 1}`,
      title,
      description,
      product: productLabel,
      price: null,
      volume: '',
      tone: STEP_TONES[index % STEP_TONES.length],
      benefits,
      ingredients: [],
      usage: usageText,
      sources: buildSources(product, evidence),
    };
  });
}

export function extractDouyinUrl(text) {
  const match = String(text || '').match(/https?:\/\/(?:v\.)?douyin\.com\/[^\s，。；;!?！？)）]+/i);
  return match ? match[0].replace(/[.,，。;；!！?？]+$/, '') : null;
}

function formatApiError(data, status) {
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map(item => item?.msg || JSON.stringify(item)).join('；');
  }
  if (data?.error) return String(data.error);
  if (status === 503) return '解析服务未配置。请联系管理员设置后端地址。';
  if (status === 502) return '无法连接后端服务，请确认 Railway 后端已启动。';
  if (status === 500) return '后端解析出错，请检查 DASHSCOPE_API_KEY 和 CDP 服务是否已配置。';
  return `视频解析失败（HTTP ${status || '未知'}），请稍后重试`;
}

export async function analyzeVideoUrl(url) {
  const endpoint = resolveAnalyzeEndpoint(import.meta.env.VITE_API_BASE || '', import.meta.env.PROD);
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
  } catch (error) {
    if (error?.name === 'TypeError') {
      throw new Error('无法连接解析服务，请确认后端已部署并且网络正常。');
    }
    throw error;
  }

  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (raw.includes('<!doctype html') || raw.includes('<html')) {
        throw new Error('解析接口未接通（返回了网页而不是 API 数据）。请在 Netlify 配置 BACKEND_URL 环境变量。');
      }
      throw new Error(formatApiError({}, response.status));
    }
  }

  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }

  if (!data?.analysis) {
    throw new Error('后端未返回有效解析结果，请稍后重试。');
  }

  return data;
}
