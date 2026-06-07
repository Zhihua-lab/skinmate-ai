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

export async function analyzeVideoUrl(url) {
  const apiBase = import.meta.env.VITE_API_BASE || '';
  const response = await fetch(`${apiBase}/analyze-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || data.error || '视频解析失败，请稍后重试');
  }

  return data;
}
