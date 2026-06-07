import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Crown,
  Droplet,
  Droplets,
  Edit3,
  Flower2,
  GitMerge,
  HelpCircle,
  Home,
  Layers,
  Link2,
  Moon,
  MoreHorizontal,
  PackageCheck,
  Play,
  Plus,
  Quote,
  Camera,
  Heart,
  Check,
  Send,
  Settings,
  Bookmark,
  Share2,
  Smile,
  Sun,
  Download,
  Sparkles,
  Star,
  Upload,
  User,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { CHECKIN_BUCKET, supabase } from './lib/supabase';
import './styles.css';
import { resolvePlanForDemo } from './demoSkincarePlan';
import { revisePlan } from './planEditApi';
import { analyzeVideoUrl, extractDouyinUrl } from './videoAnalysis';

const LOCAL_CHECKIN_KEY = 'fuji-today-checkin';
const PENDING_DOUYIN_LINK_KEY = 'pendingDouyinLink';
const GENERATED_PLAN_KEY = 'currentGeneratedPlan';
const MOCK_PARSE_DURATION = 18000;

const parsingSteps = [
  '正在识别视频重点…',
  '正在提取护肤步骤…',
  '正在整理产品和使用顺序…',
  '正在匹配你的肤况建议…',
  '正在生成可执行方案…',
];

const SKIN_SCAN_PHASE_MS = 800;
const skinScanPhases = [
  '正在检测面部区域...',
  '正在校准光照环境...',
  '正在分析油脂与干燥状态...',
  '正在识别敏感与泛红特征...',
  '正在生成个性化问题...',
];
const skinScanTags = [
  '面部区域识别完成',
  '光照质量良好',
  'T区油脂偏高',
  '两颊轻微缺水',
];

const skinTips = [
  '小提示：新方案开始前，先别急着叠加太多功效产品。',
  '小提示：敏感不稳定时，先把步骤变简单，皮肤更容易适应。',
  '小提示：同一套方案建议坚持一段时间，再判断是否适合自己。',
  '小提示：每天在相似光线下拍照，更容易看出肤况变化。',
  '小提示：刷到的视频可以参考，但更重要的是适合自己的节奏。',
  '小提示：早晚步骤不用完全一样，晚间更适合认真修护。',
  '小提示：如果新产品上脸刺痛明显，建议先暂停观察。',
  '小提示：比起买更多产品，先把使用顺序理清楚更重要。',
  '小提示：肤况会随作息、季节变化，方案也可以随时调整。',
  '小提示：坚持记录 21 天，更容易发现真实变化。',
];

function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readLocalTodayCheckin() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_CHECKIN_KEY)) || null;
    if (!saved?.date) return null;
    const savedDate = new Date(saved.date);
    const today = new Date();
    return savedDate.toDateString() === today.toDateString() ? saved : null;
  } catch {
    return null;
  }
}

async function ensureSupabaseUser() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user) return sessionData.session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

function createMirroredImage(video, canvas) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createNormalImage(video, canvas) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function createSignedCheckinUrl(path) {
  if (!path) return '';
  const { data, error } = await supabase.storage.from(CHECKIN_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

async function fetchTodayCheckin() {
  const user = await ensureSupabaseUser();
  const todayKey = getTodayDateKey();
  const { data, error } = await supabase
    .from('checkins')
    .select('id, checkin_date, image_url, note, ai_advice')
    .eq('user_id', user.id)
    .eq('checkin_date', todayKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const photo = data.image_url ? await createSignedCheckinUrl(data.image_url) : '';
  return {
    id: data.id,
    photo,
    storagePath: data.image_url || '',
    note: data.note || '',
    date: `${data.checkin_date}T00:00:00.000Z`,
    aiAdvice: data.ai_advice || '',
  };
}

async function persistCheckin(record) {
  const user = await ensureSupabaseUser();
  const todayKey = getTodayDateKey(new Date(record.date));
  const storagePath = `${user.id}/${todayKey}.jpg`;
  const blob = record.photo.startsWith('data:') ? dataUrlToBlob(record.photo) : null;

  if (blob) {
    const { error: uploadError } = await supabase.storage.from(CHECKIN_BUCKET).upload(storagePath, blob, {
      cacheControl: '3600',
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });
    if (uploadError) throw uploadError;
  }

  const payload = {
    user_id: user.id,
    checkin_date: todayKey,
    image_url: storagePath,
    note: record.note,
    ai_advice: record.aiAdvice,
  };

  const { error: upsertError } = await supabase.from('checkins').upsert(payload, {
    onConflict: 'user_id,checkin_date',
  });
  if (upsertError) throw upsertError;

  const photo = await createSignedCheckinUrl(storagePath);
  return {
    ...record,
    photo,
    storagePath,
  };
}

async function deleteTodayCheckin() {
  const user = await ensureSupabaseUser();
  const todayKey = getTodayDateKey();
  const { data, error } = await supabase
    .from('checkins')
    .select('image_url')
    .eq('user_id', user.id)
    .eq('checkin_date', todayKey)
    .maybeSingle();

  if (error) throw error;

  if (data?.image_url) {
    const { error: storageError } = await supabase.storage.from(CHECKIN_BUCKET).remove([data.image_url]);
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await supabase
    .from('checkins')
    .delete()
    .eq('user_id', user.id)
    .eq('checkin_date', todayKey);

  if (deleteError) throw deleteError;
}

const sourceVideos = [
  { id: 'v1', author: '油痘肌研究所', handle: '@skin_lab', duration: '03:12', tips: 5, seed: 'rank-1' },
  { id: 'v2', author: '成分党 Lyla', handle: '@lyla_skin', duration: '05:48', tips: 7, seed: 'rank-2' },
  { id: 'v3', author: '皮肤科医生说', handle: '@derm_talk', duration: '04:30', tips: 6, seed: 'rank-3' },
];

const planSteps = [
  {
    id: 1,
    label: '步骤 1',
    title: '洁面',
    description: '温和清洁，去除污垢和多余油脂，为后续护肤打好基础。',
    product: '珂润润浸保湿洁颜泡沫',
    price: 128,
    volume: '150ml',
    tone: 'blue',
    benefits: ['温和清洁', '减少油脂堆积', '不紧绷'],
    ingredients: ['氨基酸表活', '神经酰胺', '弱酸性配方'],
    usage: '早晚各一次，取适量加水揉搓后轻柔按摩，再用清水洗净。',
    sources: [
      { v: 0, time: '00:42', quote: '油皮一定要用氨基酸洁面，早晚各一次就够，千万别过度清洁。' },
      { v: 2, time: '01:10', quote: '清洁过度会破坏屏障，弱酸性、低刺激是底线。' },
    ],
  },
  {
    id: 2,
    label: '步骤 2',
    title: '补水',
    description: '快速补充水分，缓解干燥泛红，让后续吸收更稳定。',
    product: '薇诺娜舒敏保湿喷雾',
    price: 158,
    volume: '120ml',
    tone: 'green',
    benefits: ['即时补水', '舒缓泛红', '提升服帖度'],
    ingredients: ['马齿苋提取物', '透明质酸钠', '温泉水'],
    usage: '洁面后距离面部 15cm 喷洒，轻拍吸收。',
    sources: [
      { v: 0, time: '01:50', quote: '洁面后立刻补水，趁皮肤微湿的时候吸收最好。' },
      { v: 2, time: '02:05', quote: '泛红敏感时期，用温泉水喷雾能即时舒缓。' },
    ],
  },
  {
    id: 3,
    label: '步骤 3',
    title: '精华',
    description: '针对暗沉与屏障问题做轻量修护，保持低刺激功效护理。',
    product: '修丽可植萃舒缓精华',
    price: 388,
    volume: '30ml',
    tone: 'purple',
    benefits: ['舒缓修护', '改善暗沉', '稳定肌肤'],
    ingredients: ['植物提取物', '烟酰胺', '泛醇'],
    usage: '晚间使用 2-3 滴，避开眼周，轻按至吸收。',
    sources: [
      { v: 0, time: '02:30', quote: '想改善暗沉可以加一支温和精华，但一定要避开高浓度刺激。' },
      { v: 1, time: '03:20', quote: '烟酰胺能改善暗沉，但要从低浓度开始建立耐受。' },
    ],
  },
  {
    id: 4,
    label: '步骤 4',
    title: '保湿',
    description: '锁住前序水分与功效成分，帮助皮肤形成稳定防护。',
    product: '理肤泉 B5 修复霜',
    price: 208,
    volume: '100ml',
    tone: 'orange',
    benefits: ['锁水保湿', '屏障修护', '减少干痒'],
    ingredients: ['泛醇 B5', '积雪草苷', '乳木果油'],
    usage: '护肤最后一步薄涂，干燥区域可局部加量。',
    sources: [
      { v: 0, time: '02:55', quote: '最后用面霜把水分锁住，油皮选清爽质地就好。' },
      { v: 1, time: '04:55', quote: '最后一步一定要锁水，B5 修复霜适合屏障受损的皮肤。' },
      { v: 2, time: '03:40', quote: '乳木果油这类成分对干痒很友好，干燥区域可以多涂一点。' },
    ],
  },
];

function readSavedGeneratedPlan() {
  try {
    const saved = localStorage.getItem(GENERATED_PLAN_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const cases = [
  { title: '屏障修护方案', steps: 4, price: 198, periods: ['day', 'night'], image: '/case-barrier-cream.png' },
  { title: '敏感肌修护方案', steps: 5, price: 268, periods: ['day', 'night'], image: '/case-sensitive-toner.png' },
  { title: '抗老紧致方案', steps: 6, price: 398, periods: ['night'], image: '/case-anti-aging-serum.png' },
];

const skinMetrics = [
  { key: 'oil', label: '油脂', value: 62, status: '偏高', Icon: Droplet },
  { key: 'dry', label: '干燥', value: 21, status: '偏低', Icon: Droplets },
  { key: 'sensitive', label: '敏感', value: 17, status: '健康', Icon: Flower2 },
];

const rankingUsers = [
  ['护肤小达人', 28, 'rank-1'],
  ['GlowUp女孩', 24, 'rank-2'],
  ['皮肤管理大师', 22, 'rank-3'],
  ['爱护肤的喵酱', 21, 'rank-4'],
  ['认真护肤的阿花', 20, 'rank-5'],
];

function BottomNav({ tab, setTab }) {
  const items = [
    ['home', '方案', ClipboardList],
    ['checkin', '打卡', CheckSquare],
    ['ranking', '排行榜', BarChart3],
    ['profile', '我的', User],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([key, label, Icon]) => (
        <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>
          <span className="nav-icon"><Icon size={24} /></span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}


function PlanActionBar({ onSave, onEdit, onCheckin, saved }) {
  return (
    <div className="plan-action-bar">
      <button className={`plan-secondary-action ${saved ? 'is-saved' : ''}`} onClick={onSave}>
        {saved ? <Check size={17} strokeWidth={2.8} /> : <Bookmark size={17} strokeWidth={2.2} />}
        <span>{saved ? '已保存' : '保存方案'}</span>
      </button>
      <button className="plan-primary-action" onClick={onEdit}>
        <Sparkles size={18} strokeWidth={2.4} />
        <span>AI 调整方案</span>
      </button>
      <button className="plan-secondary-action" onClick={onCheckin}>
        <CalendarCheck size={17} strokeWidth={2.2} />
        <span>开始打卡</span>
      </button>
    </div>
  );
}

function MascotHero({ className = '' }) {
  return (
    <div className={`mascot-hero ${className}`} aria-label="护肤小助手形象">
      <div className="mascot-glow"></div>
      <img src="/skincare-mascot.svg" alt="护肤小助手" />
    </div>
  );
}

function Avatar({ seed, size = 44 }) {
  return <div className={`avatar ${seed}`} style={{ width: size, height: size }} />;
}

function ProductImage({ tone }) {
  return (
    <div className={`product-img ${tone}`}>
      <div className="mini-tube"><span>AMINO<br />ACID</span></div>
    </div>
  );
}

function HomePage({ goPlan, goSkinTest, goParsing }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const text = draft.trim();
    if (!text) {
      setError('');
      console.log('Using default skincare plan');
      goPlan(null, { type: 'default' });
      return;
    }

    setError('');
    localStorage.setItem(PENDING_DOUYIN_LINK_KEY, text);
    goParsing();
  };
  return (
    <main className="page home-page">
      <section className="hero-row">
        <div className="hero-text">
          <div className="brand-pill"><Sparkles size={14} /> 你的护肤小助手</div>
          <div className="brand-block">
            <h1 className="brand-name">
              <img src="/brand-fuji.svg" alt="肤记" />
              <Sparkles className="brand-spark" size={16} strokeWidth={2.4} />
            </h1>
            <div className="brand-tagline">抖音护肤计划助手</div>
          </div>
          <p className="hero-headline">把抖音护肤视频<br />变成每日护理方案</p>
        </div>
        <div className="girl-hero" aria-label="护肤小助手形象">
          <img src="/skincare-girl.png" alt="护肤小助手" />
        </div>
      </section>

      <section className="card import-card">
        <div className="import-head">
          <span className="import-icon"><Link2 size={22} strokeWidth={2.2} /></span>
          <div>
            <h2>导入抖音护肤视频</h2>
            <p>提取步骤、产品与价格</p>
          </div>
        </div>

        <div className="input-wrap">
          <Link2 size={20} className="input-lead" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="粘贴抖音分享文案（需含 douyin.com 链接）"
          />
        </div>

        <button className="primary-btn generate-btn" onClick={submit}>
          <span>开始整理</span>
          <ChevronRight size={18} strokeWidth={2.6} />
        </button>
        {error && <p className="import-error">{error}</p>}
      </section>

      <section className="card skintest-cta" onClick={goSkinTest}>
        <span className="skintest-cta-icon"><Camera size={24} strokeWidth={2.2} /></span>
        <div className="skintest-cta-text">
          <h3>还没有链接？</h3>
          <p>拍照测肤，帮你找到合适的视频</p>
        </div>
        <button className="skintest-cta-btn" onClick={goSkinTest}>开始测肤 <ChevronRight size={15} strokeWidth={2.6} /></button>
      </section>

      <section className="section-title">
        <h2>精选案例</h2>
        <button>查看全部 <ChevronRight size={16} /></button>
      </section>
      <div className="case-grid">
        {cases.map(c => (
          <article className="case-card" key={c.title} onClick={goPlan}>
            <img className="case-img" src={c.image} alt="" />
            <h3>{c.title}</h3>
            <p className="case-meta">来自抖音视频 · {c.steps}步护理</p>
            <div className="case-foot">
              <span className="case-price">¥{c.price}</span>
              <span className="case-periods">
                {c.periods.includes('day') && <Sun size={13} strokeWidth={2.2} />}
                {c.periods.includes('night') && <Moon size={13} strokeWidth={2.2} />}
              </span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

const skinQuiz = [
  {
    title: '洁面后 1 小时，你的皮肤状态如何？',
    options: [
      ['A', '明显紧绷，甚至有起皮感', '洗完脸后不舒服，笑的时候脸发紧，秋冬容易脱皮', { dryScore: 3 }],
      ['B', '略微紧绷，但还能接受', '偶尔觉得干，两颊容易缺水', { combinationDryScore: 2, normalScore: 1 }],
      ['C', '基本舒适，没有明显感觉', '不干不油，状态比较稳定', { normalScore: 3 }],
      ['D', '开始有一点油光', '鼻头微微泛油，T 区有油感', { combinationOilyScore: 2 }],
      ['E', '全脸明显出油', '额头发亮，鼻子容易出油', { oilyScore: 3 }],
    ],
  },
  {
    title: '中午 12 点左右，你的皮肤状态通常是？',
    options: [
      ['A', '仍然比较干', '', { dryScore: 3 }],
      ['B', '鼻子和额头轻微出油', '', { normalScore: 2, combinationDryScore: 1 }],
      ['C', 'T 区明显出油，两颊正常', '', { combinationOilyScore: 3 }],
      ['D', 'T 区出油，两颊偏干', '', { combinationScore: 3 }],
      ['E', '全脸油光明显', '', { oilyScore: 3 }],
    ],
  },
  {
    title: '过去三个月，你长痘情况如何？',
    options: [
      ['A', '基本不长痘', '', { acneScore: 0 }],
      ['B', '偶尔冒出 1-2 颗', '', { acneScore: 1 }],
      ['C', '经常长闭口', '额头颗粒感，下巴闭口', { acneScore: 2 }],
      ['D', '经常长红肿痘', '', { acneScore: 3 }],
      ['E', '痘痘反复出现', '', { acneScore: 4 }],
    ],
  },
  {
    title: '是否经常出现以下情况？',
    hint: '使用新产品刺痛、脸颊泛红、换季容易过敏、发热发痒、红血丝明显',
    options: [
      ['A', '一个都没有', '', { sensitiveScore: 0 }],
      ['B', '偶尔出现 1 项', '', { sensitiveScore: 1 }],
      ['C', '经常出现 1-2 项', '', { sensitiveScore: 2 }],
      ['D', '经常出现 3 项以上', '', { sensitiveScore: 4 }],
      ['E', '几乎一直存在', '', { sensitiveScore: 5 }],
    ],
  },
];

const skinProfiles = {
  dryScore: { name: '干性皮肤', features: ['容易缺水', '容易起皮', '毛孔细小'], keywords: ['补水', '保湿', '修护'] },
  oilyScore: { name: '油性皮肤', features: ['毛孔粗大', '容易长痘', '容易脱妆'], keywords: ['控油', '清洁', '维稳'] },
  normalScore: { name: '中性皮肤', features: ['水油平衡', '状态稳定'], keywords: ['维持', '防晒'] },
  combinationDryScore: { name: '混干皮肤', features: ['两颊偏干', 'T 区正常'], keywords: ['补水', '修护'] },
  combinationOilyScore: { name: '混油皮肤', features: ['T 区出油明显', '两颊正常'], keywords: ['控油', '补水'] },
  combinationScore: { name: '混合性皮肤', features: ['T 区出油', '两颊偏干'], keywords: ['分区护理', '补水', '维稳'] },
};

function calculateSkinResult(answers) {
  const scores = {
    dryScore: 0, oilyScore: 0, normalScore: 0, combinationDryScore: 0,
    combinationOilyScore: 0, combinationScore: 0, acneScore: 0, sensitiveScore: 0, agingScore: 1,
  };
  answers.forEach((answer, index) => {
    const points = skinQuiz[index].options.find(option => option[0] === answer)?.[3] || {};
    Object.entries(points).forEach(([key, value]) => { scores[key] += value; });
  });
  const baseKeys = Object.keys(skinProfiles);
  const baseKey = baseKeys.reduce((best, key) => scores[key] > scores[best] ? key : best, baseKeys[0]);
  let skinType = skinProfiles[baseKey].name;
  if (baseKey === 'oilyScore' && scores.sensitiveScore >= 2) skinType = '油敏肌';
  else if (baseKey === 'dryScore' && scores.sensitiveScore >= 2) skinType = '干敏肌';
  else if (baseKey === 'oilyScore' && scores.combinationOilyScore >= scores.oilyScore - 1) skinType = '混合偏油肌';
  else if (baseKey === 'dryScore' && scores.combinationDryScore >= scores.dryScore - 1) skinType = '混合偏干肌';
  else if (baseKey === 'combinationOilyScore') skinType = '混合偏油肌';
  else if (baseKey === 'combinationDryScore') skinType = '混合偏干肌';
  if (scores.combinationScore + scores.combinationOilyScore + scores.combinationDryScore >= 3 && scores.sensitiveScore >= 2) {
    skinType = '混合偏敏肌';
  }
  const sensitiveLevel = scores.sensitiveScore <= 1 ? '较低' : scores.sensitiveScore === 2 ? '轻度' : scores.sensitiveScore <= 4 ? '中等' : '较高';
  const acneLevel = ['较低', '轻度', '中等', '较高'][scores.acneScore] || '较高';
  const keywords = [...skinProfiles[baseKey].keywords];
  if (scores.sensitiveScore >= 2) keywords.push('屏障修护', '温和低刺激');
  if (scores.acneScore >= 2) keywords.push('控油', '减少刺激', '清洁维稳');
  const oilValue = Math.min(100, 30 + (scores.oilyScore + scores.combinationOilyScore + scores.combinationScore) * 10);
  const dryValue = Math.min(100, 24 + (scores.dryScore + scores.combinationDryScore + scores.combinationScore) * 11);
  const sensitiveValue = Math.min(100, 18 + scores.sensitiveScore * 14);
  const priorities = [
    { key: 'barrier', title: '屏障修护方案', score: scores.sensitiveScore * 3 + scores.combinationScore, desc: '适合泛红、换季不稳、容易刺痛的人群，建议先减少刺激性功效产品，建立稳定基础护理。' },
    { key: 'acne', title: '清爽控痘方案', score: scores.acneScore * 3 + scores.oilyScore + scores.combinationOilyScore, desc: '适合油光和闭口较明显的状态，以温和清洁、轻薄保湿和稳定控油为主。' },
    { key: 'moisture', title: '基础保湿方案', score: scores.dryScore * 3 + scores.combinationDryScore, desc: '适合紧绷、缺水和容易起皮的状态，优先补水保湿并减少过度清洁。' },
    { key: 'aging', title: '抗老紧致方案', score: scores.agingScore * 3, desc: '适合希望提前管理细纹与松弛的人群，在稳定屏障基础上逐步加入抗老护理。' },
  ].sort((a, b) => b.score - a.score);
  const primaryRecommendation = priorities[0];
  const explanation = skinType === '混合偏敏肌'
    ? 'T 区容易出油，但两颊稳定性较弱，近期更适合温和修护型护理。'
    : `结合照片观察和日常状态，你近期更适合以${primaryRecommendation.title.replace('方案', '')}为主，逐步建立稳定的护理节奏。`;
  return {
    scores, baseKey, skinType, sensitiveLevel, acneLevel, features: skinProfiles[baseKey].features,
    keywords: [...new Set(keywords)], oilValue, dryValue, sensitiveValue, priorities, primaryRecommendation, explanation,
  };
}

function SkinFlowHeader({ title, onBack }) {
  return <Header title={title} onBack={onBack} />;
}

function SkinTestPage({ goHome, goCapture }) {
  return (
    <main className="page skin-flow-page skin-start-page">
      <SkinFlowHeader title="AI 智能测肤" onBack={goHome} />
      <section className="skin-intro-copy skin-animate-in">
        <span className="skin-kicker"><Sparkles size={14} /> 30 秒轻量测试</span>
        <h2>30秒了解你的肤质状态</h2>
        <p>我会结合面部照片和几个小问题，帮你判断当前肤质，并推荐更适合你的护理方案。</p>
      </section>
      <section className="skin-intro-visual skin-animate-in">
        <MascotHero className="skin-intro-mascot" />
        <span className="skin-intro-orbit o1"><Droplet size={16} /></span>
        <span className="skin-intro-orbit o2"><Sparkles size={16} /></span>
      </section>
      <div className="skin-intro-tags skin-animate-in">
        {[[Droplet, '肤质判断'], [Heart, '护理重点'], [ClipboardList, '方案推荐']].map(([Icon, label]) => (
          <span key={label}><Icon size={15} /> {label}</span>
        ))}
      </div>
      <footer className="skin-flow-footer">
        <button className="primary-btn skin-flow-main-btn" onClick={goCapture}><Camera size={18} /> 开始拍照测肤</button>
        <p className="skin-disclaimer">照片仅用于本次肤质分析，不会公开展示</p>
      </footer>
    </main>
  );
}

function SkinCapturePage({ goBack, goQuestions }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisImage, setAnalysisImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const [visibleTags, setVisibleTags] = useState(0);
  const goQuestionsRef = useRef(goQuestions);

  const stopCamera = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  async function startCamera() {
    const requestId = ++cameraRequestRef.current;
    stopCamera();
    try {
      setCameraError('');
      setCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      console.error(error);
      stopCamera();
      setCameraReady(false);
      setCameraError('无法打开摄像头，请检查浏览器权限，或使用从相册选择。');
    }
  }

  useEffect(() => {
    startCamera();

    return () => {
      cameraRequestRef.current += 1;
      stopCamera();
    };
  }, []);

  useEffect(() => () => {
    if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
  }, [capturedImage]);

  useEffect(() => {
    goQuestionsRef.current = goQuestions;
  }, [goQuestions]);

  useEffect(() => {
    if (!isAnalyzing) return undefined;

    setScanPhase(0);
    setVisibleTags(0);
    const timers = [];

    for (let i = 1; i < skinScanPhases.length; i += 1) {
      timers.push(window.setTimeout(() => setScanPhase(i), i * SKIN_SCAN_PHASE_MS));
    }

    skinScanTags.forEach((_, index) => {
      timers.push(window.setTimeout(
        () => setVisibleTags(current => Math.max(current, index + 1)),
        1000 + index * 850,
      ));
    });

    timers.push(window.setTimeout(() => {
      setIsAnalyzing(false);
      goQuestionsRef.current();
    }, skinScanPhases.length * SKIN_SCAN_PHASE_MS));

    return () => timers.forEach(clearTimeout);
  }, [isAnalyzing]);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady) return;

    const mirroredImage = createMirroredImage(video, canvas);
    const normalImage = createNormalImage(video, canvas);
    if (!mirroredImage || !normalImage) return;

    setCapturedImage(mirroredImage);
    setAnalysisImage(normalImage);
    cameraRequestRef.current += 1;
    stopCamera();
    setCameraReady(false);
  };

  const handleRetake = () => {
    setIsAnalyzing(false);
    setScanPhase(0);
    setVisibleTags(0);
    setCapturedImage(current => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return null;
    });
    setAnalysisImage(null);
    startCamera();
  };

  const handleFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    cameraRequestRef.current += 1;
    stopCamera();
    setCameraReady(false);
    setCameraError('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setCapturedImage(current => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
        return result;
      });
      setAnalysisImage(result);
    };
    reader.readAsDataURL(file);
  };

  const chooseFromGallery = () => {
    if (!galleryInputRef.current) return;
    galleryInputRef.current.value = '';
    galleryInputRef.current.click();
  };

  const handleAnalyze = () => {
    if (!capturedImage || isAnalyzing) return;
    setIsAnalyzing(true);
  };

  return (
    <main className="page skin-flow-page skin-capture-page">
      <SkinFlowHeader title="拍照测肤" onBack={goBack} />
      <section className="skin-capture-intro">
        <span className="skin-kicker"><Camera size={14} /> {isAnalyzing ? '照片识别中' : '正面自然光照片'}</span>
        <h2>{isAnalyzing ? '正在识别你的肤况' : capturedImage ? '照片已准备好' : '请将脸部放入取景框'}</h2>
        <p>{isAnalyzing ? '请保持页面打开，识别完成后将为你补充几个问题' : '保持正脸、光线充足、不要遮挡额头和脸颊'}</p>
      </section>

      <section className={`skin-capture-frame ${capturedImage ? 'has-preview' : ''} ${isAnalyzing ? 'is-scanning' : ''}`}>
        {capturedImage ? (
          <>
            <img src={capturedImage} alt="测肤照片预览" className="captured-photo" />
            {isAnalyzing && (
              <div className="skin-scan-overlay" aria-hidden="true">
                <div className="skin-scan-face-ring" />
                <div className="skin-scan-grid" />
                <span className="skin-scan-dot d1" />
                <span className="skin-scan-dot d2" />
                <span className="skin-scan-dot d3" />
                <span className="skin-scan-dot d4" />
                <div className="skin-scan-beam" />
              </div>
            )}
          </>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            {!cameraReady && (
              <div className="skin-capture-placeholder">
                <div className="skin-face-guide"><Camera size={30} strokeWidth={1.8} /></div>
                <b>{cameraError ? '摄像头暂不可用' : '正在打开前置摄像头'}</b>
                {!cameraError && <p>请允许浏览器使用摄像头</p>}
              </div>
            )}
          </>
        )}
      </section>
      {isAnalyzing && (
        <>
          <p className="skin-scan-phase">{skinScanPhases[scanPhase]}</p>
          <div className="skin-scan-tags">
            {skinScanTags.slice(0, visibleTags).map(tag => (
              <span className="skin-scan-tag" key={tag}>{tag}</span>
            ))}
          </div>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {cameraError && <p className="skin-camera-error">{cameraError}</p>}

      <div className="skin-capture-actions">
        {capturedImage && !isAnalyzing ? (
          <>
            <button onClick={handleRetake}><Camera size={19} /> 重拍</button>
            <button className="skin-capture-analyze-action" onClick={handleAnalyze}><Sparkles size={19} /> 拍照分析</button>
          </>
        ) : !capturedImage ? (
          <>
            <button disabled={!cameraReady} onClick={handleTakePhoto}><Camera size={19} /> 拍照</button>
            <button onClick={chooseFromGallery}><Upload size={19} /> 从相册选择</button>
          </>
        ) : null}
      </div>
      <input ref={galleryInputRef} className="checkin-file-input" type="file" accept="image/*" onChange={handleFile} />

      <p className="skin-disclaimer">照片不会公开，仅用于本次皮肤状态分析。</p>
    </main>
  );
}

function SkinQuizPage({ goBack, onComplete }) {
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const selected = answers[question];
  const choose = value => setAnswers(prev => {
    const next = [...prev];
    next[question] = value;
    return next;
  });
  const next = () => {
    if (!selected) return;
    if (question === skinQuiz.length - 1) onComplete(calculateSkinResult(answers));
    else setQuestion(question + 1);
  };
  const current = skinQuiz[question];
  return (
    <main className="page skin-flow-page skin-quiz-page">
      <SkinFlowHeader title="补充几个小问题" onBack={question === 0 ? goBack : () => setQuestion(question - 1)} />
      <p className="quiz-photo-hint">已根据照片初步识别结果，为你补充 4 个小问题</p>
      <div className="quiz-progress"><span>第 {question + 1} 题 / 4</span><i><b style={{ width: `${(question + 1) * 25}%` }} /></i></div>
      <section className="quiz-question skin-animate-in" key={question}>
        <span className="skin-kicker">帮助我更了解你的日常状态</span>
        <h2>{current.title}</h2>
        {current.hint && <p>{current.hint}</p>}
      </section>
      <section className="quiz-options skin-animate-in" key={`options-${question}`}>
        {current.options.map(([key, label, desc]) => (
          <button className={selected === key ? 'selected' : ''} key={key} onClick={() => choose(key)}>
            <span>{key}</span><div><b>{label}</b>{desc && <p>{desc}</p>}</div>{selected === key && <Check size={16} />}
          </button>
        ))}
      </section>
      <footer className="skin-question-footer">
        <button className="primary-btn skin-flow-main-btn" disabled={!selected} onClick={next}>
          {question === 3 ? '查看结果' : '下一步'} <ChevronRight size={17} />
        </button>
      </footer>
    </main>
  );
}

function ResultMetricCard({ label, value, text }) {
  return (
    <div className="result-metric-card">
      <div><span>{label}</span><b>{text}</b></div>
      <i><em style={{ width: `${value}%` }} /></i>
    </div>
  );
}

function SkinResultPage({ result, viewPlan, importVideo, restart }) {
  return (
    <main className="page skin-flow-page skin-result-page">
      <SkinFlowHeader title="测肤结果" onBack={restart} />
      <section className="skin-result-hero skin-animate-in">
        <span><Sparkles size={17} /> 照片观察 + 4 题综合分析</span>
        <p>你的肤质更接近</p>
        <h2>{result.skinType}</h2>
        <b>{result.explanation}</b>
      </section>
      <section className="result-overview skin-animate-in">
        <h3>皮肤状态概览</h3>
        <div className="result-metrics-grid">
          <ResultMetricCard label="出油情况" value={result.oilValue} text={result.oilValue > 60 ? '偏高' : '适中'} />
          <ResultMetricCard label="干燥情况" value={result.dryValue} text={result.dryValue > 60 ? '偏高' : '轻度'} />
          <ResultMetricCard label="敏感风险" value={result.sensitiveValue} text={result.sensitiveLevel} />
          <ResultMetricCard label="当前护理重点" value={82} text={result.primaryRecommendation.title.replace('方案', '')} />
        </div>
      </section>
      <section className="result-recommendation card skin-animate-in">
        <span className="skin-kicker"><Heart size={14} /> 推荐护理方向</span>
        <h3>建议优先：{result.primaryRecommendation.title}</h3>
        <p>{result.primaryRecommendation.desc}</p>
        <div>{result.priorities.map((item, index) => <span className={index === 0 ? 'active' : ''} key={item.key}>{item.title}</span>)}</div>
      </section>
      <footer className="skin-result-actions">
        <button className="primary-btn" onClick={viewPlan}>查看推荐方案 <ChevronRight size={17} /></button>
        <button className="skin-import-action" onClick={importVideo}><Link2 size={16} /> 导入抖音视频生成专属方案</button>
        <button className="skin-restart" onClick={restart}>重新测肤</button>
      </footer>
    </main>
  );
}

const recommendationSets = {
  oily: [
    ['油敏肌温和控油方案', ['控油', '舒缓', '修护'], 'T 区出油、偶尔泛红、闭口反复', 398],
    ['熬夜闭口修护方案', ['闭口', '维稳', '补水'], '下巴闭口、作息不规律、屏障不稳定', 268],
    ['温和清洁维稳方案', ['清洁', '控油', '低刺激'], '油光明显、容易闷痘、不适合猛药护肤', 198],
  ],
  dry: [
    ['干敏肌屏障修护方案', ['补水', '保湿', '修护'], '两颊干燥、起皮、换季不稳定', 298],
    ['秋冬高保湿护理方案', ['保湿', '滋润', '维稳'], '洁面后紧绷、干纹明显、容易起皮', 368],
    ['温和低刺激入门方案', ['敏感', '修护', '精简'], '新产品刺痛、泛红、屏障脆弱', 228],
  ],
  normal: [
    ['日常维稳基础方案', ['维持', '防晒', '保湿'], '状态稳定、想保持水油平衡', 198],
    ['轻抗氧提亮方案', ['提亮', '维稳', '防晒'], '暗沉、熬夜、想提升肤色状态', 268],
    ['简洁早晚护理方案', ['基础', '保湿', '防晒'], '护肤新手、步骤不想太复杂', 168],
  ],
};

function SkinRecommendationsPage({ result, goBack, goPlan }) {
  const group = result.baseKey === 'normalScore' ? 'normal' : ['dryScore', 'combinationDryScore'].includes(result.baseKey) ? 'dry' : 'oily';
  return (
    <main className="page skin-flow-page skin-reco-page">
      <SkinFlowHeader title="为你推荐" onBack={goBack} />
      <section className="reco-intro"><span>{result.skinType}</span><h2>更适合你的 3 套方案</h2><p>结合你的肤质、敏感等级与痘痘风险推荐</p></section>
      <section className="skin-reco-list">
        {recommendationSets[group].map(([title, tags, fit, price], index) => (
          <article className="card skin-reco-card" key={title} onClick={goPlan}>
            <div className={`reco-number n${index + 1}`}>{index + 1}</div>
            <div className="reco-card-copy"><h3>{title}</h3><div>{tags.map(t => <span key={t}>{t}</span>)}</div><p>适合：{fit}</p><b>¥{price} 起</b></div>
            <ChevronRight size={18} />
          </article>
        ))}
      </section>
    </main>
  );
}

function ParsingVideoPage({ sourceLink, skinResult, onComplete, onBack }) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [parseError, setParseError] = useState('');
  const videoRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!sourceLink) return undefined;

    let cancelled = false;
    let apiResult = null;
    let apiError = null;
    setParseError('');

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + Math.random() * 4);
      });
    }, 800);

    const stepDelay = 3500 + Math.floor(Math.random() * 1500);
    const stepTimer = setInterval(() => {
      setStepIndex(prev => (prev + 1) % parsingSteps.length);
    }, stepDelay);

    const apiPromise = analyzeVideoUrl(extractDouyinUrl(sourceLink) || sourceLink)
      .then(data => {
        apiResult = data;
        return data;
      })
      .catch(err => {
        apiError = err;
        return null;
      });

    const finish = (plan, meta) => {
      if (cancelled) return;
      setProgress(100);
      localStorage.setItem(GENERATED_PLAN_KEY, JSON.stringify({ plan, meta }));
      localStorage.removeItem(PENDING_DOUYIN_LINK_KEY);
      window.setTimeout(() => {
        if (!cancelled) onCompleteRef.current(plan, meta);
      }, 500);
    };

    const run = async () => {
      await new Promise(resolve => window.setTimeout(resolve, MOCK_PARSE_DURATION));
      if (cancelled) return;

      const resolved = resolvePlanForDemo(sourceLink, apiResult, skinResult, planSteps);
      finish(resolved.steps, resolved.meta);
      void apiError;
    };

    run();
    void apiPromise;

    return () => {
      cancelled = true;
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [sourceLink]);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % skinTips.length);
    }, 3000);

    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const play = () => video.play().catch(() => {});
    play();
    video.addEventListener('loadeddata', play);
    return () => video.removeEventListener('loadeddata', play);
  }, []);

  if (!sourceLink) {
    return (
      <main className="page parsing-page">
        <Header title="正在解析视频内容" onBack={onBack} />
        <section className="parsing-empty card">
          <p>未找到待解析的抖音链接，请返回首页重新粘贴。</p>
          <button className="primary-btn" onClick={onBack}>返回首页</button>
        </section>
      </main>
    );
  }

  return (
    <main className="page parsing-page">
      <Header title="正在解析视频内容" onBack={onBack} />
      <section className="parsing-intro skin-animate-in">
        <span className="skin-kicker"><Sparkles size={14} /> 视频解析中</span>
        <p>我正在把视频里的护肤经验，整理成你的专属方案</p>
      </section>

      <section className="parsing-card card skin-animate-in">
        <div className="parsing-video-wrap">
          <video
            ref={videoRef}
            src="/skin-analyzing.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="parsing-animation"
          />
        </div>
        <p className="parsing-step-text">{parsingSteps[stepIndex]}</p>
        <div className="parsing-tip-card" key={tipIndex}>
          <div className="tip-label"><Sparkles size={13} strokeWidth={2.2} /> 护肤小提示</div>
          <div className="tip-text">{skinTips[tipIndex].replace(/^小提示：/, '')}</div>
        </div>
        <div className="parsing-progress-track">
          <span className="parsing-progress-bar" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <span className="parsing-progress-label">{Math.round(Math.min(100, progress))}%</span>
        {parseError && <p className="import-error">{parseError}</p>}
      </section>

      <p className="parsing-footnote">视频内容较长时，解析可能需要几十秒，请保持页面打开</p>
    </main>
  );
}

function PlanDetailPage({ goEdit, goHome, goCheckin, steps = planSteps, planMeta = null, single = false }) {
  const planType = planMeta?.type || 'default';
  const isGuidePlan = planType === 'guide';
  const isRoutinePlan = planType === 'routine';
  const isStructuredPlan = isGuidePlan || isRoutinePlan;
  const defaultSection = planMeta?.defaultSection || 'morning';
  const [planVersion, setPlanVersion] = useState('original');
  const [planSection, setPlanSection] = useState(defaultSection);
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [collapsedSources, setCollapsedSources] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const scrollerRef = useRef(null);
  const activeVersionBundle = isStructuredPlan
    ? (planVersion === 'optimized' ? planMeta.optimizedPlan : planMeta.originalPlan)
    : null;
  const hasRoutineSplit = isRoutinePlan
    && Boolean(activeVersionBundle?.morning && activeVersionBundle?.evening);
  const activeBundle = isGuidePlan
    ? activeVersionBundle
    : hasRoutineSplit
      ? activeVersionBundle?.[planSection]
      : null;
  const displaySteps = isGuidePlan
    ? activeBundle?.executionSteps || []
    : activeBundle?.steps || steps;
  const pricedSteps = displaySteps.filter(item => item.price != null);
  const totalPrice = pricedSteps.reduce((sum, item) => sum + item.price, 0);
  const hasPrice = !isStructuredPlan && pricedSteps.length > 0;

  const resetPlanScroller = () => {
    setStep(1);
    setCollapsedSources([]);
    if (scrollerRef.current) scrollerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const switchPlanVersion = version => {
    setPlanVersion(version);
    if (isRoutinePlan) setPlanSection(defaultSection);
    resetPlanScroller();
  };

  const switchPlanSection = section => {
    setPlanSection(section);
    resetPlanScroller();
  };
  const showToast = text => {
    setToast(text);
    setTimeout(() => setToast(''), 1400);
  };
  const scrollToStep = i => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[i - 1];
    if (child) el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    setStep(i);
  };
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let idx = 0;
    let best = Infinity;
    [...el.children].forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < best) { best = dist; idx = i; }
    });
    if (idx + 1 !== step) setStep(idx + 1);
  };
  return (
    <main className={`page plan-page ${isGuidePlan ? 'guide-plan-page' : ''}`}>
      <Header
        title="方案详情"
        onBack={goHome}
        action={(
          <button className="header-more" onClick={() => setShowMore(!showMore)} aria-label="更多操作">
            <MoreHorizontal size={24} strokeWidth={2.2} />
          </button>
        )}
      />
      {showMore && (
        <div className="plan-more-menu">
          <button onClick={() => { setShowMore(false); showToast('正在生成分享卡片'); }}>
            <Share2 size={17} strokeWidth={2.2} />
            生成分享卡片
          </button>
        </div>
      )}
      <div className="plan-source-tag">
        {isStructuredPlan
          ? <><Play size={13} fill="currentColor" strokeWidth={0} /> 来自 {planMeta.author} 的视频整理</>
          : planMeta?.videoId
            ? <><Play size={13} fill="currentColor" strokeWidth={0} /> 来自抖音视频解析 · 已标注时间轴</>
            : single
              ? <><Play size={13} fill="currentColor" strokeWidth={0} /> 来自 {sourceVideos[0].author} 的视频 · 已标注时间轴</>
              : <><GitMerge size={14} strokeWidth={2.4} /> 由 {sourceVideos.length} 条视频对照合并 · 可溯源</>}
      </div>
      {isStructuredPlan && (
        <div className="plan-version-switch" role="tablist" aria-label="方案版本">
          <button
            type="button"
            role="tab"
            aria-selected={planVersion === 'original'}
            className={planVersion === 'original' ? 'active' : ''}
            onClick={() => switchPlanVersion('original')}
          >
            原视频方案
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={planVersion === 'optimized'}
            className={planVersion === 'optimized' ? 'active' : ''}
            onClick={() => switchPlanVersion('optimized')}
          >
            为我优化
          </button>
        </div>
      )}
      {isRoutinePlan && hasRoutineSplit && (
        <div className="plan-routine-switch" role="tablist" aria-label="护理时段">
          <button
            type="button"
            role="tab"
            aria-selected={planSection === 'morning'}
            className={planSection === 'morning' ? 'active' : ''}
            onClick={() => switchPlanSection('morning')}
          >
            <Sun size={15} strokeWidth={2.2} /> 早间护理
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={planSection === 'evening'}
            className={planSection === 'evening' ? 'active' : ''}
            onClick={() => switchPlanSection('evening')}
          >
            <Moon size={15} strokeWidth={2.2} /> 晚间护理
          </button>
        </div>
      )}
      {activeBundle?.title && (
        <section className="plan-bundle-intro">
          <h2>{activeBundle.title}</h2>
          <p>{activeBundle.subtitle}</p>
          {isGuidePlan && activeBundle.skinProfile && (
            <span className="guide-skin-profile">{activeBundle.skinProfile}</span>
          )}
        </section>
      )}
      {isGuidePlan ? (
        <>
          <div className="guide-execution-list">
            {displaySteps.map(stepItem => (
              <article className="card guide-step-card" key={`${planVersion}-${stepItem.id}`}>
                <span className="guide-step-label">{stepItem.label}</span>
                <h3>{stepItem.title}</h3>
                <p>{stepItem.description}</p>
                {stepItem.tags?.length > 0 && (
                  <div className="guide-step-tags">
                    {stepItem.tags.map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>
          {activeBundle?.productGroups?.length > 0 && (
            <section className="card guide-products-card">
              <h3>视频提到的产品</h3>
              {activeBundle.productGroups.map(group => (
                <div className="guide-product-group" key={group.title}>
                  <b>{group.title}</b>
                  <ul>
                    {group.items.map(item => (
                      <li key={item.name}>
                        <span>{item.name}</span>
                        <em>{item.note}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {activeBundle?.purchaseOrder?.length > 0 && (
            <section className="card guide-purchase-card">
              <h3>更适合你的购买顺序</h3>
              {activeBundle.purchaseOrder.map(item => (
                <div className="guide-purchase-row" key={item.priority}>
                  <b>{item.priority}</b>
                  <p>{item.items}</p>
                </div>
              ))}
            </section>
          )}
          {(activeBundle?.avoidItems?.length > 0 || activeBundle?.avoidPitfalls?.length > 0) && (
            <section className="guide-avoid-card">
              <h3>{activeBundle.avoidTitle}</h3>
              {activeBundle.avoidItems?.length > 0 ? (
                <div className="guide-avoid-tags">
                  {activeBundle.avoidItems.map(item => (
                    <span key={item.name}>{item.name}：{item.reason}</span>
                  ))}
                </div>
              ) : (
                <ul className="guide-avoid-list">
                  {activeBundle.avoidPitfalls.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          )}
        </>
      ) : (
        <>
      <div className="stepper">
        {displaySteps.map((s, i) => (
          <button
            key={`${planVersion}-${planSection}-${s.id}`}
            onClick={() => scrollToStep(i + 1)}
            className={step === i + 1 ? 'active' : ''}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="step-scroller" ref={scrollerRef} onScroll={handleScroll}>
        {displaySteps.map(s => {
          const rows = [
            ['主要功效', s.benefits.join(' / ')],
            ['成分亮点', s.ingredients.join('、')],
            ['使用方法', s.usage],
          ].filter(([, content]) => content);
          const sources = single ? s.sources.filter(src => src.v === 0) : s.sources;
          const showProduct = Boolean(s.product);
          return (
            <section className={`card plan-card step-slide ${isStructuredPlan ? 'demo-step-card' : ''}`} key={`${planVersion}-${planSection}-${s.id}`}>
              <p className="purple-label">{s.label}</p>
              <h1>{s.title}</h1>
              <p className="desc">{s.description}</p>
              {showProduct && (
                <>
                  <div className="divider" />
                  <div className="product-row">
                    <ProductImage tone={s.tone} />
                    <div className="product-copy">
                      <h3>{s.product}</h3>
                      <p>
                        {s.price != null ? <><b>¥{s.price}</b> <span>/ {s.volume}</span></> : <b>价格待查</b>}
                      </p>
                    </div>
                    <button className="replace-product" onClick={() => showToast(`正在为步骤 ${s.id} 推荐替换产品`)}>
                      更换此产品 <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </>
              )}
              {rows.length > 0 && (
                <div className="info-list">
                  {rows.map(([title, content]) => (
                    <div className="info-item" key={title}>
                      <h4>{title}</h4>
                      <p>{content}</p>
                    </div>
                  ))}
                </div>
              )}
              {sources.length > 0 && (
                <div className="source-block">
                  <button
                    className="source-toggle"
                    onClick={() => setCollapsedSources(prev => (
                      prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                    ))}
                  >
                    <span><Quote size={14} strokeWidth={2.4} /> {single ? '视频时间轴' : '内容溯源'} · {sources.length} 处</span>
                    <ChevronDown size={18} className={!collapsedSources.includes(s.id) ? 'rot' : ''} />
                  </button>
                  {!collapsedSources.includes(s.id) && (
                    <div className="source-timeline">
                      {sources.map((src, i) => (
                        <div className="tl-item" key={i}>
                          <span className="tl-time">{src.time}</span>
                          <span className="tl-node" />
                          <div className="tl-body">
                            {!single && <span className="tl-author">{sourceVideos[src.v].author}</span>}
                            <p>“{src.quote}”</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="swipe-hint">左右滑动查看 {displaySteps.length} 个步骤</div>
      {activeBundle?.insights?.length > 0 && (
        <section className="card plan-insights-card">
          <h3>{activeBundle.insightsTitle}</h3>
          <ul>
            {activeBundle.insights.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}
        </>
      )}
      {isStructuredPlan && (
        <button className="plan-ai-entry" onClick={goEdit}>
          <Sparkles size={16} strokeWidth={2.2} />
          没有同款产品？问问肤记小助手
        </button>
      )}
      {hasPrice && (
        <section className="card total-card">
          <span>总价预估：<b>¥{totalPrice}</b></span>
          <button onClick={() => setShowPriceDetails(!showPriceDetails)}>
            {showPriceDetails ? '收起明细' : '展开明细'}
            {showPriceDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </section>
      )}
      {showPriceDetails && hasPrice && (
        <section className="price-details">
          {displaySteps.filter(s => s.price != null).map(s => <div key={s.id}><span>{s.title}</span><b>¥{s.price}</b></div>)}
        </section>
      )}
      <PlanActionBar
        saved={saved}
        onSave={() => { setSaved(true); setShowSavedDialog(true); }}
        onEdit={goEdit}
        onCheckin={goCheckin}
      />
      {showSavedDialog && (
        <div className="plan-dialog-mask" onClick={() => setShowSavedDialog(false)}>
          <section className="plan-saved-dialog" onClick={e => e.stopPropagation()}>
            <span className="saved-dialog-icon"><Check size={24} strokeWidth={2.8} /></span>
            <h2>已保存到我的方案</h2>
            <p>之后可以在「我的方案」中继续查看和调整。</p>
            <button className="primary-btn" onClick={goCheckin}>开始打卡</button>
            <button className="dialog-share" onClick={() => { setShowSavedDialog(false); showToast('正在生成分享卡片'); }}>
              <Share2 size={17} /> 生成分享卡片
            </button>
          </section>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

const editQuickChips = [
  ['减少精华', Layers],
  ['增加保湿', Droplets],
  ['更换洁面', PackageCheck],
  ['更温和一些', Flower2],
];

let editMsgId = 0;
const nextEditMsgId = () => ++editMsgId;

const editInitialMessages = [
  {
    id: nextEditMsgId(),
    type: 'ai',
    text: '你好！我是肤记小助手，告诉我你想怎么调整当前方案吧～',
    time: '10:28',
  },
];

const editAdjustKeywords = ['精华', '保湿', '洁面', '温和', '减少', '增加', '更换', '调整'];

function isAdjustRequest(text) {
  return editAdjustKeywords.some(kw => text.includes(kw));
}

function EditPlanPage({ goPlan, currentPlan = planSteps, currentPlanMeta = null, onPlanUpdated }) {
  const [messages, setMessages] = useState(editInitialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatRef = useRef(null);
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  };
  useEffect(scrollToBottom, [messages]);
  const send = (text = input) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const trimmed = text.trim();
    const isAdjust = isAdjustRequest(trimmed);
    const userMsg = { id: nextEditMsgId(), type: 'user', text: trimmed, time };
    const aiMsg = {
      id: nextEditMsgId(),
      type: 'ai',
      text: isAdjust
        ? '好的，已为你调整：精华改为每周 3 次使用，保湿步骤升级加强，洁面替换为更温和的氨基酸泡沫。新方案已生成 👇'
        : '收到～你可以告诉我具体想调整哪一步，比如减少精华、加强保湿或更换洁面。',
      time,
    };
    setMessages(prev => {
      const next = [...prev, userMsg, aiMsg];
      if (isAdjust) {
        next.push({ id: nextEditMsgId(), type: 'plan', steps: 2, price: 756 });
      }
      return next;
    });
    setInput('');
  };
  const sendReal = async (text = input) => {
    if (!text.trim() || isSending) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const trimmed = text.trim();
    const userMsg = { id: nextEditMsgId(), type: 'user', text: trimmed, time };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const chatHistory = messages.map(message => ({
        role: message.type === 'user' ? 'user' : 'assistant',
        text: message.text || '',
      }));
      const result = await revisePlan({
        plan: currentPlan,
        instruction: trimmed,
        chatHistory,
        planMeta: currentPlanMeta,
      });
      const price = result.plan.reduce((sum, step) => (
        Number.isFinite(Number(step.price)) ? sum + Number(step.price) : sum
      ), 0);
      setMessages(prev => [
        ...prev,
        { id: nextEditMsgId(), type: 'ai', text: result.assistantReply, time },
        { id: nextEditMsgId(), type: 'plan', steps: result.plan.length, price, nextPlan: result.plan },
      ]);
      onPlanUpdated?.(result.plan);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: nextEditMsgId(),
          type: 'ai',
          text: error?.message || '调整失败了，请稍后重试。',
          time,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };
  return (
    <main className="page edit-page">
      <Header title="修改方案" onBack={goPlan} />

      <div className="edit-assistant">
        <div className="edit-assistant-avatar">
          <img src="/skincare-mascot.svg" alt="肤记小助手" />
        </div>
        <div className="edit-assistant-text">
          <p className="edit-assistant-name">
            <span className="edit-online-dot" />
            肤记小助手在线
          </p>
          <p className="edit-assistant-hint">正在帮你微调方案</p>
        </div>
      </div>

      <section className="edit-chat" ref={chatRef}>
        {messages.map(msg => {
          if (msg.type === 'plan') {
            return (
              <div className="edit-plan-card" key={msg.id}>
                <span className="edit-plan-icon"><ClipboardList size={22} strokeWidth={2.2} /></span>
                <div className="edit-plan-body">
                  <b>方案二（已更新）</b>
                  <p>已调整 {msg.steps} 个步骤</p>
                  <em>总价预估：¥{msg.price}</em>
                </div>
                <button className="edit-plan-btn" onClick={() => goPlan(msg.nextPlan || currentPlan, currentPlanMeta)}>
                  查看新方案 <ChevronRight size={15} strokeWidth={2.6} />
                </button>
              </div>
            );
          }
          if (msg.type === 'user') {
            return (
              <div className="edit-msg user" key={msg.id}>
                <div className="edit-msg-content">
                  <p>{msg.text}</p>
                  <span className="edit-msg-meta">
                    {msg.time}
                    <Check size={13} strokeWidth={2.8} />
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div className="edit-msg ai" key={msg.id}>
              <div className="edit-msg-avatar">
                <img src="/skincare-mascot.svg" alt="" />
              </div>
              <div className="edit-msg-content">
                <p>{msg.text}</p>
                <span className="edit-msg-meta">{msg.time}</span>
              </div>
            </div>
          );
        })}
      </section>

      <footer className="edit-footer">
        <div className="edit-chips">
          {editQuickChips.map(([label, Icon]) => (
            <button key={label} onClick={() => sendReal(label)} disabled={isSending}>
              <Icon size={14} strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </div>
        <div className="edit-input-bar">
          <Smile size={22} strokeWidth={1.8} className="edit-input-emoji" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendReal()}
            disabled={isSending}
            placeholder="告诉肤记你想怎么调整..."
          />
          <button className="edit-send-btn" onClick={() => sendReal()} aria-label="send" disabled={isSending}>
            <Send size={18} strokeWidth={2.4} />
          </button>
        </div>
      </footer>
    </main>
  );
}

function CheckinPage({ goRecord, record, onSave, onReset }) {
  const fileInputRef = useRef(null);
  const calendarSwipeRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [preview, setPreview] = useState(record?.photo || '');
  const [photoData, setPhotoData] = useState(record?.photo || '');
  const [note, setNote] = useState(record?.note || '');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const todayDate = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const today = todayDate.getDate();
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const isCurrentMonth = visibleYear === todayDate.getFullYear() && visibleMonthIndex === todayDate.getMonth();
  const daysInMonth = new Date(visibleYear, visibleMonthIndex + 1, 0).getDate();
  const leadingDays = new Date(visibleYear, visibleMonthIndex, 1).getDay();
  const marked = [3, 7, 16, 19];
  const isComplete = Boolean(record);
  const streak = isComplete ? 8 : 7;
  const totalDays = isComplete ? 22 : 21;
  const aiAdvice = '今天的皮肤状态已记录。建议继续保持温和清洁和基础保湿，避免频繁更换护肤品，坚持观察 21 天变化。';

  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    setPreview(record?.photo || '');
    setPhotoData(record?.photo || '');
    setNote(record?.note || '');
  }, [record]);

  const stopCheckinCamera = () => {
    if (!cameraStreamRef.current) return;
    cameraStreamRef.current.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
  };

  const closeCheckinCamera = () => {
    cameraRequestRef.current += 1;
    stopCheckinCamera();
    setCameraReady(false);
    setCameraOpen(false);
  };

  const openCheckinCamera = async () => {
    const requestId = ++cameraRequestRef.current;
    setSheetOpen(false);
    setCameraOpen(true);
    setCameraReady(false);
    setCameraError('');
    stopCheckinCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API is not available');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      console.error(error);
      stopCheckinCamera();
      setCameraError('无法打开摄像头，请检查浏览器摄像头权限。');
    }
  };

  useEffect(() => () => {
    cameraRequestRef.current += 1;
    stopCheckinCamera();
  }, []);

  const takeCheckinPhoto = () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || !cameraReady || !video.videoWidth || !video.videoHeight) return;

    const mirroredImage = createMirroredImage(video, canvas);
    if (!mirroredImage) return;
    setPreview(mirroredImage);
    setPhotoData(mirroredImage);
    closeCheckinCamera();
  };

  const choosePhoto = () => {
    const input = fileInputRef.current;
    if (!input) return;
    input.value = '';
    setSheetOpen(false);
    input.click();
  };

  const handleFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(current => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return objectUrl;
    });
    const reader = new FileReader();
    reader.onload = () => setPhotoData(reader.result);
    reader.readAsDataURL(file);
  };

  const saveCheckin = () => {
    if (!photoData) return;
    setSaving(true);
    setSaveError('');
    Promise.resolve(onSave({
      photo: photoData,
      note: note.trim(),
      date: todayDate.toISOString(),
      aiAdvice,
    }))
      .catch(error => {
        console.error(error);
        setSaveError('保存失败，已保留本地内容，请稍后重试。');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const changeMonth = offset => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleCalendarPointerDown = event => {
    calendarSwipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleCalendarPointerUp = event => {
    const start = calendarSwipeRef.current;
    calendarSwipeRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    changeMonth(deltaX < 0 ? 1 : -1);
  };

  const reupload = () => {
    setPreview(record?.photo || '');
    setPhotoData(record?.photo || '');
    setNote('');
    onReset();
    setSheetOpen(true);
  };

  return (
    <main className="page checkin-page green-page">
      <div className="checkin-hero">
        <div className="hero-text">
          <div className="brand-pill"><CalendarCheck size={14} /> 每日护肤打卡</div>
          <h1 className="big-title">今日打卡</h1>
          <p className="big-sub">坚持护肤<br />见证更好的自己 ✨</p>
        </div>
        <MascotHero className="sm" />
      </div>

      <section className="card upload-card">
        {isComplete ? (
          <div className="checkin-success">
            <span className="success-check"><Check size={25} strokeWidth={2.8} /></span>
            <div className="success-copy"><h3>今日已打卡</h3><p>已记录今天的皮肤状态</p></div>
            <img src={record.photo} alt="今日皮肤状态缩略图" />
          </div>
        ) : (
          <>
            <h3>今日状态</h3>
            <p>上传今天的皮肤状态，记录每一天的变化</p>
            {preview ? (
              <>
                <div className="checkin-preview">
                  <img src={preview} alt="今日皮肤照片预览" />
                  <button onClick={() => setSheetOpen(true)}>重新上传</button>
                  <span>今日皮肤照片</span>
                </div>
                <label className="checkin-note">
                  <b>今日备注</b>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="记录一下今天的皮肤状态，比如出油、泛红、长痘、干燥等" />
                </label>
                {saveError && <p className="checkin-save-error">{saveError}</p>}
                <button className="primary-btn save-checkin" disabled={!photoData || saving} onClick={saveCheckin}>
                  {saving ? '保存中...' : '保存今日打卡'}
                </button>
              </>
            ) : (
              <button className="upload-zone" onClick={() => setSheetOpen(true)}>
                <span className="upload-icon"><Upload size={22} strokeWidth={2.2} /></span>
                <b>上传照片</b>
                <em>点击拍照或从相册选择</em>
              </button>
            )}
          </>
        )}
        {isComplete && (
          <>
            <div className="checkin-ai-advice"><b><Sparkles size={15} /> AI 今日建议</b><p>{record.aiAdvice}</p></div>
            <div className="success-actions">
              <button onClick={reupload}>重新上传</button>
              <button className="primary-btn" onClick={goRecord}>查看记录</button>
            </div>
          </>
        )}
        <input ref={fileInputRef} className="checkin-file-input" type="file" accept="image/*" onChange={handleFile} />
      </section>

      <section className="card check-summary">
        <div className="summary-text">
          <h3>坚持护肤</h3>
          <strong>{totalDays} <span>天</span></strong>
          <p>已连续记录 {streak} 天</p>
        </div>
        <button className="record-btn" onClick={goRecord}>查看记录 <ChevronRight size={16} /></button>
      </section>

      <section
        className="card calendar-card"
        onPointerDown={handleCalendarPointerDown}
        onPointerUp={handleCalendarPointerUp}
        onPointerCancel={() => { calendarSwipeRef.current = null; }}
      >
        <div className="cal-head">
          <button onClick={() => changeMonth(-1)} aria-label="上个月"><ChevronLeft /></button>
          <h2>{visibleYear}年{visibleMonthIndex + 1}月</h2>
          <button onClick={() => changeMonth(1)} aria-label="下个月"><ChevronRight /></button>
        </div>
        <div className="weekdays">{'日一二三四五六'.split('').map(d => <span key={d}>{d}</span>)}</div>
        <div className="days">
          {Array.from({ length: leadingDays }, (_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={isCurrentMonth && isComplete && d === today ? goRecord : undefined}
              className={`${isCurrentMonth && (marked.includes(d) || (isComplete && d === today)) ? 'marked' : ''} ${isCurrentMonth && d === today ? 'today' : ''}`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="tip-card">
        <h3><Droplet size={16} fill="#f7a8bd" strokeWidth={0} /> 今日提醒</h3>
        <p>最近状态不错，继续保持补水与防晒习惯。</p>
      </section>
      {sheetOpen && (
        <div className="sheet-mask" onClick={() => setSheetOpen(false)}>
          <section className="checkin-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>上传今日皮肤状态</h3>
            <button onClick={openCheckinCamera}><Camera size={19} /> 拍照上传</button>
            <button onClick={() => choosePhoto()}><Upload size={19} /> 从相册选择</button>
            <button className="sheet-cancel" onClick={() => setSheetOpen(false)}>取消</button>
          </section>
        </div>
      )}
      {cameraOpen && (
        <div className="checkin-camera-mask">
          <section className="checkin-camera-card">
            <div className="checkin-camera-head">
              <h3>拍摄今日皮肤状态</h3>
              <button onClick={closeCheckinCamera} aria-label="关闭拍照"><X size={20} /></button>
            </div>
            <div className="checkin-camera-view">
              <video ref={cameraVideoRef} autoPlay playsInline muted />
              {!cameraReady && (
                <div className="checkin-camera-placeholder">
                  <Camera size={34} strokeWidth={1.8} />
                  <b>{cameraError ? '摄像头暂不可用' : '正在打开摄像头'}</b>
                  <p>{cameraError || '请允许浏览器使用摄像头'}</p>
                </div>
              )}
            </div>
            <canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
            <button className="checkin-shutter" disabled={!cameraReady} onClick={takeCheckinPhoto} aria-label="拍照">
              <span />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function CheckinRecordPage({ goCheckin, goPlan, record }) {
  const date = record ? new Date(record.date) : new Date();
  const displayDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return (
    <main className="page record-page">
      <Header title="打卡记录" onBack={goCheckin} />
      <div className="date-switch"><ChevronLeft /><h2>{displayDate}</h2><ChevronRight /></div>
      <section className="card record-card">
        {record?.photo ? <img className="record-photo uploaded" src={record.photo} alt="打卡照片" /> : <div className="record-photo" />}
        <div className="record-plan"><b>方案一</b><button onClick={goPlan}>查看方案 <ChevronRight size={18} /></button></div>
        <div className="divider" />
        <div className="note-row">
          <div><h3>当日备注</h3><p>{record?.note || '今天皮肤状态不错，继续坚持！早睡早起 + 防晒。'}</p></div>
          <Edit3 size={22} />
        </div>
        <div className="divider" />
        <div className="note-row">
          <div><h3><b>AI</b> 建议</h3><p>{record?.aiAdvice || '皮肤状态良好！建议保持当前护肤流程，注意补水和防晒哦～'}</p></div>
          <Volume2 size={22} />
        </div>
      </section>
    </main>
  );
}

function RankingPage() {
  const [rankTab, setRankTab] = useState('总榜');
  return (
    <main className="page ranking-page warm-page">
      <section className="ranking-hero">
        <div className="hero-text">
          <h1>打卡排行榜</h1>
          <p>看看谁是您护肤的王者</p>
        </div>
        <div className="trophy-img"><img src="/trophy.png" alt="奖杯" /></div>
      </section>
      <div className="rank-tabs">{['总榜', '同方案榜', '好友榜'].map(t => <button key={t} onClick={() => setRankTab(t)} className={rankTab === t ? 'active' : ''}>{t}</button>)}</div>
      <section className="card ranking-list">
        {rankingUsers.map(([name, days, seed], idx) => (
          <div className="rank-row" key={name}>
            <span className={`medal m${idx + 1} ${idx < 3 ? 'top' : ''}`}>
              {idx === 0 && <Crown className="crown" size={14} fill="#f6b73c" strokeWidth={0} />}
              {idx + 1}
            </span>
            <Avatar seed={seed} size={48} />
            <b>{name}</b>
            <p>坚持 <strong>{days}</strong> 天</p>
          </div>
        ))}
      </section>
      <p className="my-rank-label">我的排名</p>
      <section className="card my-rank-card">
        <span className="medal">12</span>
        <Avatar seed="me" size={48} />
        <b>我自己 <em className="me-tag">我</em></b>
        <p>坚持 <strong>15</strong> 天</p>
      </section>
      <p className="rank-footer">坚持护肤，遇见更好的自己 ♥</p>
    </main>
  );
}

function ProfilePage({ goPlan, goRecord }) {
  const stats = [
    ['15', '坚持天数'],
    ['5', '我的方案'],
    ['3', '已收藏'],
  ];
  const menu = [
    ['我的方案', '已生成 5 套护肤方案', ClipboardList, goPlan],
    ['我的收藏', '收藏了 3 套方案', Bookmark, goPlan],
    ['打卡记录', '连续打卡 15 天', CalendarCheck, goRecord],
    ['肤质档案', '混油肌 · 上次更新 6/5', Droplet, null],
    ['设置', '通知、隐私与账号', Settings, null],
  ];
  return (
    <main className="page profile-page warm-page">
      <section className="profile-hero">
        <div className="profile-id">
          <div className="profile-avatar-wrap">
            <Avatar seed="me" size={68} />
            <span className="profile-edit"><Edit3 size={12} strokeWidth={2.4} /></span>
          </div>
          <div className="profile-id-text">
            <h1>我自己 <em className="vip-tag"><Crown size={11} fill="#fff" strokeWidth={0} /> VIP</em></h1>
            <p>护肤第 <b>15</b> 天，状态稳步变好</p>
          </div>
        </div>
        <MascotHero className="profile-mascot" />
      </section>

      <section className="profile-stats">
        {stats.map(([num, label]) => (
          <div key={label}><strong>{num}</strong><span>{label}</span></div>
        ))}
      </section>

      <section className="profile-menu">
        {menu.map(([title, desc, Icon, onClick]) => (
          <button className="menu-row" key={title} onClick={onClick || undefined}>
            <span className="menu-icon"><Icon size={19} strokeWidth={2.2} /></span>
            <div className="menu-text"><b>{title}</b><p>{desc}</p></div>
            <ChevronRight size={18} className="menu-arrow" />
          </button>
        ))}
      </section>

      <p className="rank-footer">坚持护肤，遇见更好的自己 ♥</p>
    </main>
  );
}

function Header({ title, onBack, action }) {
  return <header className="header"><button onClick={onBack}><ArrowLeft size={27} /></button><h1>{title}</h1>{action || <span />}</header>;
}

const appRouteByScreen = {
  home: '/',
  parsing: '/parsing',
  plan: '/plan-detail',
  skintest: '/skin-test/intro',
  'skin-capture': '/skin-test/camera',
  'skin-quiz': '/skin-test/questions',
  'skin-result': '/skin-test/result',
};

const appScreenByRoute = Object.fromEntries(
  Object.entries(appRouteByScreen).map(([screen, route]) => [route, screen]),
);

function App() {
  const [screen, setScreen] = useState(() => appScreenByRoute[window.location.pathname] || 'home');
  const [pendingDouyinLink, setPendingDouyinLink] = useState(() => localStorage.getItem(PENDING_DOUYIN_LINK_KEY) || '');
  const [activePlan, setActivePlan] = useState(null);
  const [planMeta, setPlanMeta] = useState(null);
  const [skinResult, setSkinResult] = useState(() => window.location.pathname === '/skin-test/result'
    ? calculateSkinResult(['D', 'C', 'B', 'C'])
    : null);
  const [checkinRecord, setCheckinRecord] = useState(() => readLocalTodayCheckin());

  useEffect(() => {
    let alive = true;

    fetchTodayCheckin()
      .then(record => {
        if (!alive || !record) return;
        setCheckinRecord(record);
        localStorage.setItem(LOCAL_CHECKIN_KEY, JSON.stringify(record));
      })
      .catch(error => {
        console.warn('Failed to load remote checkin, using local cache instead.', error);
      });

    return () => {
      alive = false;
    };
  }, []);

  const saveCheckin = async record => {
    let nextRecord = record;
    try {
      nextRecord = await persistCheckin(record);
    } catch (error) {
      console.warn('Failed to persist checkin to Supabase, keeping local cache.', error);
    }

    setCheckinRecord(nextRecord);
    localStorage.setItem(LOCAL_CHECKIN_KEY, JSON.stringify(nextRecord));
    return nextRecord;
  };
  const resetCheckin = async () => {
    setCheckinRecord(null);
    localStorage.removeItem(LOCAL_CHECKIN_KEY);
    try {
      await deleteTodayCheckin();
    } catch (error) {
      console.warn('Failed to delete remote checkin.', error);
    }
  };
  useEffect(() => {
    const nextPath = appRouteByScreen[screen] || '/';
    if (window.location.pathname !== nextPath) window.history.pushState({ screen }, '', nextPath);
  }, [screen]);
  useEffect(() => {
    const onPopState = () => setScreen(appScreenByRoute[window.location.pathname] || 'home');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const currentTab = useMemo(() => {
    if (screen === 'checkin' || screen === 'record') return 'checkin';
    if (screen === 'ranking') return 'ranking';
    if (screen === 'profile') return 'profile';
    return 'home';
  }, [screen]);
  const setTab = tab => setScreen(tab);
  const goPlan = (plan = null, meta = null) => {
    if (meta?.type === 'default') {
      setActivePlan(null);
      setPlanMeta({ type: 'default' });
      localStorage.removeItem(GENERATED_PLAN_KEY);
      setScreen('plan');
      return;
    }
    if (plan) {
      setActivePlan(plan);
      setPlanMeta(meta);
      localStorage.setItem(GENERATED_PLAN_KEY, JSON.stringify({ plan, meta }));
    } else {
      const saved = readSavedGeneratedPlan();
      setActivePlan(saved?.plan || null);
      setPlanMeta(saved?.meta || null);
    }
    setScreen('plan');
  };
  const goParsing = () => {
    const link = localStorage.getItem(PENDING_DOUYIN_LINK_KEY) || '';
    setPendingDouyinLink(link);
    setScreen('parsing');
  };
  const cancelParsing = () => {
    localStorage.removeItem(PENDING_DOUYIN_LINK_KEY);
    setPendingDouyinLink('');
    setScreen('home');
  };
  const savedGeneratedPlan = readSavedGeneratedPlan();
  return (
    <div className="app-shell">
      <div className={`phone ${screen === 'home' ? 'home-phone' : ''}`}>
        {screen === 'home' && <HomePage goPlan={goPlan} goSkinTest={() => setScreen('skintest')} goParsing={goParsing} />}
        {screen === 'parsing' && (
          <ParsingVideoPage
            sourceLink={pendingDouyinLink || localStorage.getItem(PENDING_DOUYIN_LINK_KEY) || ''}
            skinResult={skinResult}
            onBack={cancelParsing}
            onComplete={(plan, meta) => goPlan(plan, meta)}
          />
        )}
        {screen === 'skintest' && <SkinTestPage goHome={() => setScreen('home')} goCapture={() => setScreen('skin-capture')} />}
        {screen === 'skin-capture' && <SkinCapturePage goBack={() => setScreen('skintest')} goQuestions={() => setScreen('skin-quiz')} />}
        {screen === 'skin-quiz' && <SkinQuizPage goBack={() => setScreen('skin-capture')} onComplete={result => { setSkinResult(result); setScreen('skin-result'); }} />}
        {screen === 'skin-result' && skinResult && <SkinResultPage result={skinResult} viewPlan={goPlan} importVideo={() => setScreen('home')} restart={() => setScreen('skintest')} />}
        {screen === 'skin-recommendations' && skinResult && <SkinRecommendationsPage result={skinResult} goBack={() => setScreen('skin-result')} goPlan={goPlan} />}
        {screen === 'plan' && (
          <PlanDetailPage
            steps={activePlan || savedGeneratedPlan?.plan || planSteps}
            planMeta={planMeta || savedGeneratedPlan?.meta}
            goHome={() => setScreen('home')}
            goEdit={() => setScreen('edit')}
            goCheckin={() => setScreen('checkin')}
            single
          />
        )}
        {screen === 'edit' && (
          <EditPlanPage
            goPlan={goPlan}
            currentPlan={activePlan || savedGeneratedPlan?.plan || planSteps}
            currentPlanMeta={planMeta || savedGeneratedPlan?.meta}
            onPlanUpdated={plan => setActivePlan(plan)}
          />
        )}
        {screen === 'checkin' && <CheckinPage record={checkinRecord} onSave={saveCheckin} onReset={resetCheckin} goRecord={() => setScreen('record')} />}
        {screen === 'record' && <CheckinRecordPage record={checkinRecord} goCheckin={() => setScreen('checkin')} goPlan={() => setScreen('plan')} />}
        {screen === 'ranking' && <RankingPage />}
        {screen === 'profile' && <ProfilePage goPlan={goPlan} goRecord={() => setScreen('record')} />}
        {!['edit', 'record', 'parsing', 'plan', 'skintest', 'skin-capture', 'skin-quiz', 'skin-result', 'skin-recommendations'].includes(screen) && <BottomNav tab={currentTab} setTab={setTab} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
