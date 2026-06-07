import { buildPlanFromAnalysis } from './videoAnalysis';

const MORNING_TONES = ['blue', 'green', 'purple'];
const EVENING_TONES = ['orange', 'blue', 'green'];
const DEFAULT_SKIN_PROFILE = '混油肌，T 区出油偏高，两颊轻微缺水，偶尔敏感';
const DEFAULT_NEWBIE_PROFILE = `${DEFAULT_SKIN_PROFILE}，护肤新手`;

function makeStep(id, title, description, tone) {
  return {
    id,
    label: `Step ${id}`,
    title,
    description,
    product: '',
    price: null,
    volume: '',
    tone,
    benefits: [],
    ingredients: [],
    usage: '',
    sources: [],
  };
}

function buildSection(steps, insightsTitle, insights) {
  return { steps, insightsTitle, insights };
}

function buildOptimizedMorningSubtitle(skinResult) {
  if (!skinResult?.skinType) {
    return '基于视频内容 + 测肤结果，调整为更适合混油肌的早间护理';
  }
  return `基于视频内容 + 测肤结果，调整为更适合${skinResult.skinType}的早间护理`;
}

function buildOptimizedEveningSubtitle(skinResult) {
  if (!skinResult?.skinType) {
    return '基于视频内容 + 测肤结果，调整为更适合混油肌的夜间修护';
  }
  return `基于视频内容 + 测肤结果，调整为更适合${skinResult.skinType}的夜间修护`;
}

function makeExecutionStep(id, title, description, tags) {
  return {
    id,
    label: `Step ${id}`,
    title,
    description,
    tags,
  };
}

function buildNewbieOptimizedSubtitle(skinResult) {
  if (!skinResult?.skinType) {
    return '基于视频内容 + 测肤结果，为混油新手整理第一套护肤路线';
  }
  return `基于视频内容 + 测肤结果，为${skinResult.skinType}新手整理第一套护肤路线`;
}

function applySkinResultToKayn(plans, skinResult) {
  if (!skinResult) return plans;
  return {
    ...plans,
    optimized: {
      morning: { ...plans.optimized.morning, subtitle: buildOptimizedMorningSubtitle(skinResult) },
      evening: { ...plans.optimized.evening, subtitle: buildOptimizedEveningSubtitle(skinResult) },
    },
  };
}

const kaynPlans = {
  original: {
    morning: {
      title: '男生日常晨间护肤方案',
      subtitle: '来自柯野Kayn的视频整理 · 适合新手建立稳定晨间护肤习惯',
      ...buildSection(
        [
          makeStep(1, '早上清洁', '敏感肌或皮肤不油时，用 30-50℃ 清水洗脸即可；如果出油较多，可以选择氨基酸洗面奶。清洁时重点照顾鼻翼、嘴角和 T 区，揉搓 15-20 秒后冲净，避免过度清洁。', MORNING_TONES[0]),
          makeStep(2, '早上保湿', '擦干脸后 30 秒内涂水乳。男生早上用一套基础水乳即可，每次约 2 泵，均匀涂抹全脸，帮助维持皮肤水分。', MORNING_TONES[1]),
          makeStep(3, '早上防晒', '防晒是白天护肤重点。选择 SPF30+ 的防晒产品，用量要足，均匀推开到全脸和脖子，等待成膜后再出门。', MORNING_TONES[2]),
        ],
        '晨间重点',
        ['温和清洁即可，避免一早过度清洁。', '洗脸后 30 秒内完成基础保湿。', '白天重点是防晒，建议选择 SPF30+。', '防晒需涂到全脸和脖子，并等待成膜。'],
      ),
    },
    evening: {
      title: '男生日常夜间护肤方案',
      subtitle: '来自柯野Kayn的视频整理 · 适合新手建立稳定夜间修护习惯',
      ...buildSection(
        [
          makeStep(1, '卸妆与清洁', '如果白天化妆或涂了较厚防晒，可以先用卸妆油。干手干脸按压 2-3 泵，揉搓约 30 秒，再蘸水乳化 10-15 秒，最后用清水冲净；日常可再用温和洁面完成清洁。', EVENING_TONES[0]),
          makeStep(2, '每周集中护理', '每周可以安排 1-2 次补水面膜或泥膜。补水面膜敷完后建议清水洗净，泥膜避开眼周，停留约 15 分钟后先擦再洗，避免过度频繁使用。', EVENING_TONES[1]),
          makeStep(3, '夜间修护', '晚上涂水乳后，可以根据需求选择精华。皮肤偏干可用 B5 类补水精华，暗沉发黄可用抗氧精华，之后可加眼霜，最后用面霜锁住水分。', EVENING_TONES[2]),
        ],
        '夜间重点',
        ['晚上重点是清洁、保湿和修护。', '需要卸妆时，先乳化再冲洗更干净。', '面膜建议每周 1-2 次，不要过度频繁。', '水乳后可按需叠加精华与面霜，帮助修护。'],
      ),
    },
  },
  optimized: {
    morning: {
      title: '根据你肤况优化的晨间方案',
      subtitle: buildOptimizedMorningSubtitle(),
      ...buildSection(
        [
          makeStep(1, '分区温和清洁', '你的 T 区出油偏高，但两颊轻微缺水，所以早上不要全脸强清洁。建议 T 区用氨基酸洗面奶轻揉 15 秒，两颊轻轻带过，避免过度清洁。', MORNING_TONES[0]),
          makeStep(2, '清爽保湿', 'T 区薄涂清爽水乳，两颊可以多按压一层。这样既能缓解缺水，也不会让容易出油的位置负担太重。', MORNING_TONES[1]),
          makeStep(3, '清爽防晒', '选择 SPF30+、质地清爽的防晒。鼻翼、额头这类容易出油的位置少量多次推开，减少搓泥和油腻感。', MORNING_TONES[2]),
        ],
        '优化重点',
        ['控油不要靠强清洁，先保证屏障稳定。', '两颊缺水时，保湿比单纯控油更重要。', '防晒尽量选择清爽型，减少闷痘感。', '早间流程控制在 3 步，更容易坚持。'],
      ),
    },
    evening: {
      title: '根据你肤况优化的夜间方案',
      subtitle: buildOptimizedEveningSubtitle(),
      ...buildSection(
        [
          makeStep(1, '按需卸妆清洁', '如果当天只是在室内、没有厚涂防晒，可以不必每天用卸妆油。若使用防水防晒或化妆，再用卸妆油，日常以温和洁面为主，减少屏障负担。', EVENING_TONES[0]),
          makeStep(2, '局部分区护理', '如果 T 区明显出油，可以一周 1 次泥膜，只涂鼻翼、额头、下巴，不建议全脸厚敷。两颊更适合补水或舒缓护理，避免越控油越干。', EVENING_TONES[1]),
          makeStep(3, '修护优先', '晚上建议以水乳 + 修护精华为主。如果两颊干，可以选择 B5 或舒缓类精华；如果最近熬夜暗沉，再加入抗氧精华。不要一次叠太多产品。', EVENING_TONES[2]),
        ],
        '优化重点',
        ['泥膜建议局部用，不建议全脸频繁使用。', '两颊缺水时，补水和修护优先。', '晚上不要一次叠太多功效产品。', '先坚持 21 天，再根据打卡照片观察变化。'],
      ),
    },
  },
};

const newbieOriginalPlan = {
  title: '高考后第一套护肤品入门方案',
  subtitle: '来自一颗猪精🐽的视频整理 · 帮你按顺序搭好第一套基础护肤',
  executionSteps: [
    makeExecutionStep(1, '先判断肤质', '晚上只用清水洗脸，第二天观察脸部出油情况。先判断自己是油皮、干皮、混油还是敏感肌，再决定买什么产品，避免一开始就盲目种草。', ['入门第一步']),
    makeExecutionStep(2, '搭建基础三件套', '第一套护肤优先考虑「洁面 + 保湿 + 防晒」。洁面选择温和不紧绷的产品；水乳不用强行成套买，水做好补水，乳液或面霜负责保湿锁水即可。', ['洁面', '保湿', '防晒']),
    makeExecutionStep(3, '有痘痘闭口再局部处理', '爆痘时可以点涂祛痘产品，闭口或泛红不稳定时可以局部用 B5 类修护产品。如果频繁长小痘、闭口，再考虑低频使用含酸洁面，不建议新手一上来猛刷酸。', ['点涂', '局部修护', '低频刷酸']),
    makeExecutionStep(4, '避开新手雷区', '不要频繁使用撕拉鼻贴、去角质凝胶、水杨酸棉片，也不要乱敷自制面膜。新手护肤先做减法，先把皮肤稳定下来，比一次买很多功效产品更重要。', ['少折腾', '先稳定']),
  ],
  productGroups: [
    {
      title: '洁面',
      items: [
        { name: 'beplain 绿豆洁面', note: '偏油皮' },
        { name: '紫苏洁面', note: '偏干皮' },
      ],
    },
    {
      title: '保湿水乳',
      items: [
        { name: 'AHC 玻尿酸水', note: '平价补水' },
        { name: '雅诗兰黛樱花水', note: '高保湿、提亮细腻' },
        { name: 'ipsa 乳液 / 奥尔滨渗透乳', note: '按肤质选择' },
      ],
    },
    {
      title: '修护与精华',
      items: [
        { name: '理肤泉 B5 霜', note: '局部修护' },
        { name: '米加 B5 精华', note: '维稳修护' },
        { name: '可丽金胶原次抛', note: '抗初老、弹润' },
      ],
    },
    {
      title: '面霜',
      items: [
        { name: '珀莱雅源力霜', note: '屏障修护' },
        { name: '雅诗兰黛胶原霜', note: '丰盈弹润' },
      ],
    },
  ],
  avoidTitle: '新手先别碰',
  avoidItems: [
    { name: '撕拉鼻贴', reason: '容易拉扯毛孔' },
    { name: '去角质凝胶', reason: '频繁用容易敏感' },
    { name: '水杨酸棉片', reason: '新手容易刷过头' },
    { name: '自制面膜', reason: '效果不稳定，可能刺激' },
  ],
};

function buildNewbieOptimizedPlan(skinResult) {
  return {
    title: '根据你肤况优化的新手护肤方案',
    subtitle: buildNewbieOptimizedSubtitle(skinResult),
    skinProfile: skinResult
      ? `${skinResult.skinType}，${skinResult.explanation}`
      : DEFAULT_NEWBIE_PROFILE,
    executionSteps: [
      makeExecutionStep(1, '先稳住清洁', '你是混油肌，T 区容易出油，但两颊有点缺水。早上可以清水或温和洁面，晚上再认真清洁。洁面重点放在 T 区，两颊轻轻带过，不要全脸强清洁。', ['混油肌', '温和清洁']),
      makeExecutionStep(2, '轻保湿，不厚涂', '水乳不需要成套买，先选清爽保湿型。T 区薄涂，两颊可以多按压一层。这样既能缓解缺水，也不会让容易出油的位置负担太重。', ['T区薄涂', '两颊加强']),
      makeExecutionStep(3, '有问题再局部处理', '偶尔爆痘时只点涂痘痘，不要全脸上酸。两颊泛红或不稳定时，优先用 B5 类产品局部修护。闭口多时，再考虑低频含酸洁面。', ['点涂', '修护优先']),
      makeExecutionStep(4, '先买刚需，别一次囤太多', '你的第一套护肤优先级是：温和洁面、基础保湿、清爽防晒、修护面霜。精华和抗老产品可以等皮肤稳定 2-4 周后再加，不要一开始叠太多。', ['先基础', '后功效']),
    ],
    purchaseOrder: [
      { priority: '第一优先级', items: '温和洁面、清爽保湿、防晒' },
      { priority: '第二优先级', items: '修护面霜、B5 类修护产品' },
      { priority: '第三优先级', items: '精华、抗初老产品、功效型产品' },
    ],
    avoidTitle: '你需要避开的雷区',
    avoidPitfalls: [
      '不要全脸强清洁',
      '不要频繁刷酸',
      '不要频繁去角质',
      '不要一次叠加很多功效产品',
    ],
  };
}

export function detectFallbackPlan(inputText) {
  const text = inputText || '';

  if (
    text.includes('8Q5VfYwc4lM')
    || text.includes('一颗猪精')
    || text.includes('高考后第一套护肤品')
  ) {
    return 'newbieProducts';
  }

  if (
    text.includes('柯野')
    || text.includes('Kayn')
    || text.includes('男生日常护肤')
  ) {
    return 'kayn';
  }

  return 'kayn';
}

export function isValidVideoAnalysis(analysis) {
  return Boolean(analysis?.products?.length);
}

function buildKaynPlanPackage(skinResult, sourceLink) {
  const originalPlan = applySkinResultToKayn(kaynPlans, skinResult).original;
  const optimizedPlan = applySkinResultToKayn(kaynPlans, skinResult).optimized;

  return {
    steps: originalPlan.morning.steps,
    meta: {
      type: 'routine',
      author: '柯野Kayn',
      videoTheme: '男生日常护肤教程',
      sourceUrl: sourceLink,
      videoId: 'demo-kayn-skincare',
      single: true,
      defaultSection: 'morning',
      originalPlan,
      optimizedPlan,
      skinProfile: skinResult
        ? `${skinResult.skinType}，${skinResult.explanation}`
        : DEFAULT_SKIN_PROFILE,
    },
  };
}

function buildNewbieProductsPlanPackage(skinResult, sourceLink) {
  const originalPlan = newbieOriginalPlan;
  const optimizedPlan = buildNewbieOptimizedPlan(skinResult);

  return {
    steps: originalPlan.executionSteps,
    meta: {
      type: 'guide',
      author: '一颗猪精🐽',
      videoTheme: '高考后第一套护肤品',
      sourceUrl: sourceLink,
      videoId: 'demo-newbie-products',
      single: true,
      originalPlan,
      optimizedPlan,
      skinProfile: skinResult
        ? `${skinResult.skinType}，${skinResult.explanation}`
        : DEFAULT_NEWBIE_PROFILE,
    },
  };
}

export function resolvePlanForDemo(inputText, apiResult, skinResult, defaultSteps) {
  const text = (inputText || '').trim();

  if (!text) {
    console.log('Using default skincare plan');
    return {
      steps: defaultSteps,
      meta: { type: 'default' },
    };
  }

  if (apiResult?.analysis && isValidVideoAnalysis(apiResult.analysis)) {
    try {
      console.log('Using API parsed plan');
      const steps = buildPlanFromAnalysis(apiResult.analysis);
      return {
        steps,
        meta: {
          type: 'api',
          sourceUrl: apiResult.analysis?.source_url || text,
          videoId: apiResult.video_id || apiResult.analysis?.video_id || '',
          author: apiResult.analysis?.author || '',
          single: true,
        },
      };
    } catch {
      // fall through to demo fallback
    }
  }

  const fallbackPlanId = detectFallbackPlan(text);

  if (fallbackPlanId === 'newbieProducts') {
    console.log('Using fallback newbie skincare product plan');
    return buildNewbieProductsPlanPackage(skinResult, text);
  }

  console.log('Using fallback Kayn skincare plan');
  return buildKaynPlanPackage(skinResult, text);
}
