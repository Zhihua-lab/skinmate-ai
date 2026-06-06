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
  Zap,
} from 'lucide-react';
import './styles.css';

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

const cases = [
  { title: '屏障修护方案', steps: 4, price: 198, periods: ['day', 'night'], seed: 'case-1' },
  { title: '敏感肌修护方案', steps: 5, price: 268, periods: ['day', 'night'], seed: 'case-2' },
  { title: '抗老紧致方案', steps: 6, price: 398, periods: ['night'], seed: 'case-3' },
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

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="status-icons">
        <span className="signal"><i></i><i></i><i></i><i></i></span>
        <span className="wifi">◜</span>
        <span className="battery"><i></i></span>
      </div>
    </div>
  );
}

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


function ResultActionBar({ onCard, onSave }) {
  return (
    <div className="result-action-bar">
      <button onClick={onCard}>
        <span><Share2 size={23} strokeWidth={2.6} /></span>
        <b>生成卡片</b>
      </button>
      <button onClick={onSave}>
        <span><Download size={23} strokeWidth={2.6} /></span>
        <b>保存方案</b>
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

function HomePage({ goPlan, goSkinTest }) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); goPlan(); }, 700);
  };
  return (
    <main className="page home-page">
      <StatusBar />
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
            placeholder="粘贴抖音视频链接"
          />
        </div>

        <button className={`primary-btn generate-btn ${loading ? 'is-loading' : ''}`} onClick={submit}>
          <span>{loading ? '正在整理' : '开始整理'}</span>
          {loading ? <Sparkles size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.6} />}
        </button>
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
          <article className="case-card" key={c.seed} onClick={goPlan}>
            <div className={`case-img ${c.seed}`} />
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

function SkinTestPage({ goHome, goPlan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [toast, setToast] = useState('');
  const showToast = text => {
    setToast(text);
    setTimeout(() => setToast(''), 1600);
  };
  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };
  const startCamera = async facing => {
    stopStream();
    setCameraReady(false);
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前浏览器不支持摄像头');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraReady(true);
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? '请允许浏览器使用摄像头权限'
        : err.name === 'NotFoundError'
          ? '未检测到可用摄像头'
          : err.message || '无法打开摄像头';
      setCameraError(msg);
      showToast(msg);
    }
  };
  useEffect(() => {
    startCamera(facingMode);
    return stopStream;
  }, [facingMode]);
  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    showToast('已切换摄像头');
  };
  return (
    <main className="page skintest-page">
      <StatusBar />
      <header className="skintest-header">
        <button className="st-logo" onClick={goHome}>肤记<Sparkles size={11} className="brand-spark-sm" /></button>
        <h1>拍照测肤</h1>
        <button className="st-help" onClick={() => showToast('请将脸部移入圆框，保持光线充足')}>
          <HelpCircle size={15} strokeWidth={2.2} /> 测肤说明
        </button>
      </header>

      <section className="camera-card">
        <button
          className={`cam-ctrl ${flash ? 'on' : ''}`}
          onClick={() => {
            setFlash(!flash);
            showToast('网页端暂不支持闪光灯');
          }}
        >
          <Zap size={18} strokeWidth={2.2} fill={flash ? 'currentColor' : 'none'} />
          <em>闪光灯</em>
        </button>
        <div className="cam-status"><i />{cameraReady ? '实时分析中' : '准备中'}</div>
        <button className="cam-ctrl" onClick={toggleCamera}>
          <Camera size={18} strokeWidth={2.2} />
          <em>切换摄像头</em>
        </button>

        <div className="cam-feed">
          <video
            ref={videoRef}
            className={`cam-video ${facingMode === 'user' ? 'mirror' : ''} ${cameraReady ? 'ready' : ''}`}
            playsInline
            muted
            autoPlay
          />
          {!cameraReady && !cameraError && <div className="cam-overlay cam-loading">正在启动摄像头…</div>}
          {cameraError && (
            <div className="cam-overlay cam-error">
              <p>{cameraError}</p>
              <button type="button" onClick={() => startCamera(facingMode)}>重试</button>
            </div>
          )}
          <div className="face-frame" />
          <span className="cam-hint">
            {cameraReady ? '请将脸部移入圆框' : cameraError ? '请检查权限后重试' : '正在请求摄像头权限'}
          </span>
        </div>

        <div className="metrics-card">
          {skinMetrics.map(m => (
            <div className="metric" key={m.key}>
              <span className="metric-head"><m.Icon size={15} strokeWidth={2.2} />{m.label}</span>
              <strong className="metric-value">{m.value}<small>%</small></strong>
              <span className="metric-bar"><i style={{ width: `${m.value}%` }} /></span>
              <em className="metric-status">{m.status}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="card judge-card">
        <span className="judge-icon"><Smile size={24} strokeWidth={2.2} /></span>
        <div className="judge-text">
          <b>当前判断：混油肌</b>
          <p>T区油脂分泌较旺盛，两颊轻微缺水</p>
        </div>
        <button className="judge-detail" onClick={() => showToast('混油肌：T区偏油、两颊偏干，护理需分区')}>
          查看详情 <ChevronRight size={14} strokeWidth={2.6} />
        </button>
      </section>

      <p className="reco-note"><Heart size={14} fill="#f6a6bc" strokeWidth={0} /> 确认后为你推荐合适的抖音护肤视频</p>

      <button className="primary-btn confirm-skin" onClick={goPlan}>确认结果，推荐视频</button>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function PlanDetailPage({ goEdit, goHome, single = false }) {
  const [step, setStep] = useState(1);
  const [fav, setFav] = useState(false);
  const [toast, setToast] = useState('');
  const [openSrc, setOpenSrc] = useState(single ? 1 : null);
  const scrollerRef = useRef(null);
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
    <main className="page plan-page">
      <StatusBar />
      <Header title="方案详情" onBack={goHome} />
      <div className="plan-source-tag">
        {single
          ? <><Play size={13} fill="currentColor" strokeWidth={0} /> 来自 {sourceVideos[0].author} 的视频 · 已标注时间轴</>
          : <><GitMerge size={14} strokeWidth={2.4} /> 由 {sourceVideos.length} 条视频对照合并 · 可溯源</>}
      </div>
      <div className="stepper">
        {planSteps.map((s, i) => <button key={s.id} onClick={() => scrollToStep(i + 1)} className={step === i + 1 ? 'active' : ''}>{i + 1}</button>)}
      </div>

      <div className="step-scroller" ref={scrollerRef} onScroll={handleScroll}>
        {planSteps.map(s => {
          const rows = [
            ['主要功效', s.benefits.join(' / ')],
            ['成分亮点', s.ingredients.join('、')],
            ['使用方法', s.usage],
          ];
          const sources = single ? s.sources.filter(src => src.v === 0) : s.sources;
          return (
            <section className="card plan-card step-slide" key={s.id}>
              <p className="purple-label">{s.label}</p>
              <h1>{s.title}</h1>
              <p className="desc">{s.description}</p>
              <div className="divider" />
              <div className="product-row">
                <ProductImage tone={s.tone} />
                <div>
                  <h3>{s.product}</h3>
                  <p><b>¥{s.price}</b> <span>/ {s.volume}</span></p>
                </div>
              </div>
              <div className="info-list">
                {rows.map(([title, content]) => (
                  <div className="info-item" key={title}>
                    <h4>{title}</h4>
                    <p>{content}</p>
                  </div>
                ))}
              </div>
              {sources.length > 0 && (
                <div className="source-block">
                  <button className="source-toggle" onClick={() => setOpenSrc(openSrc === s.id ? null : s.id)}>
                    <span><Quote size={14} strokeWidth={2.4} /> {single ? '视频时间轴' : '内容溯源'} · {sources.length} 处</span>
                    <ChevronDown size={18} className={openSrc === s.id ? 'rot' : ''} />
                  </button>
                  {openSrc === s.id && (
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
              <div className="action-row">
                <button className={`ghost-btn ${fav ? 'favorited' : ''}`} onClick={() => setFav(!fav)}><Star size={24} />{fav ? '已收藏' : '收藏'}</button>
                <button className="primary-btn" onClick={goEdit}>修改方案</button>
              </div>
            </section>
          );
        })}
      </div>
      <div className="swipe-hint">← 左右滑动查看 {planSteps.length} 个步骤 →</div>
      <section className="card total-card">
        <span>总价预估：<b>¥882</b></span>
        <button>收起明细 <ChevronUp size={18} /></button>
      </section>
      <ResultActionBar onCard={() => showToast('正在生成分享卡片')} onSave={() => showToast('方案已保存')} />
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

function EditPlanPage({ goPlan }) {
  const [messages, setMessages] = useState(editInitialMessages);
  const [input, setInput] = useState('');
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
  return (
    <main className="page edit-page">
      <StatusBar />
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
                <button className="edit-plan-btn" onClick={goPlan}>
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
            <button key={label} onClick={() => send(label)}>
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
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="告诉肤记你想怎么调整..."
          />
          <button className="edit-send-btn" onClick={() => send()} aria-label="发送">
            <Send size={18} strokeWidth={2.4} />
          </button>
        </div>
      </footer>
    </main>
  );
}

function CheckinPage({ goRecord }) {
  const marked = [3, 7, 16, 19];
  const today = 17;
  return (
    <main className="page checkin-page green-page">
      <StatusBar />
      <div className="checkin-hero">
        <div className="hero-text">
          <div className="brand-pill"><CalendarCheck size={14} /> 每日护肤打卡</div>
          <h1 className="big-title">今日打卡</h1>
          <p className="big-sub">坚持护肤<br />见证更好的自己 ✨</p>
        </div>
        <MascotHero className="sm" />
      </div>

      <section className="card upload-card">
        <h3>今日状态</h3>
        <p>上传今天的皮肤状态，记录每一天的变化</p>
        <button className="upload-zone">
          <span className="upload-icon"><Upload size={22} strokeWidth={2.2} /></span>
          <b>上传照片</b>
          <em>点击拍照或从相册选择</em>
        </button>
      </section>

      <section className="card check-summary">
        <div className="summary-text">
          <h3>坚持护肤</h3>
          <strong>15 <span>天</span></strong>
          <p>已连续记录 7 天</p>
        </div>
        <button className="record-btn" onClick={goRecord}>查看记录 <ChevronRight size={16} /></button>
      </section>

      <section className="card calendar-card">
        <div className="cal-head"><ChevronLeft /><h2>2024年6月</h2><ChevronRight /></div>
        <div className="weekdays">{'日一二三四五六'.split('').map(d => <span key={d}>{d}</span>)}</div>
        <div className="days">
          {Array.from({ length: 6 }, (_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
            <button key={d} onClick={goRecord} className={`${marked.includes(d) ? 'marked' : ''} ${d === today ? 'today' : ''}`}>{d}</button>
          ))}
        </div>
      </section>

      <section className="tip-card">
        <h3><Droplet size={16} fill="#f7a8bd" strokeWidth={0} /> 今日提醒</h3>
        <p>最近状态不错，继续保持补水与防晒习惯。</p>
      </section>
    </main>
  );
}

function CheckinRecordPage({ goCheckin, goPlan }) {
  return (
    <main className="page record-page">
      <StatusBar />
      <Header title="打卡记录" onBack={goCheckin} />
      <div className="date-switch"><ChevronLeft /><h2>2024年6月5日</h2><ChevronRight /></div>
      <section className="card record-card">
        <div className="record-photo" />
        <div className="record-plan"><b>方案一</b><button onClick={goPlan}>查看方案 <ChevronRight size={18} /></button></div>
        <div className="divider" />
        <div className="note-row">
          <div><h3>当日备注</h3><p>今天皮肤状态不错，继续坚持！<br />早睡早起 + 防晒。</p></div>
          <Edit3 size={22} />
        </div>
        <div className="divider" />
        <div className="note-row">
          <div><h3><b>AI</b> 建议</h3><p>皮肤状态良好！建议保持当前护肤流程，注意补水和防晒哦～</p></div>
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
      <StatusBar />
      <header className="brand-header">肤记<Sparkles size={12} className="brand-spark-sm" /></header>
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
      <StatusBar />
      <header className="brand-header">肤记<Sparkles size={12} className="brand-spark-sm" /></header>

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

function Header({ title, onBack }) {
  return <header className="header"><button onClick={onBack}><ArrowLeft size={27} /></button><h1>{title}</h1><span /></header>;
}

function App() {
  const [screen, setScreen] = useState('home');
  const currentTab = useMemo(() => {
    if (screen === 'checkin' || screen === 'record') return 'checkin';
    if (screen === 'ranking') return 'ranking';
    if (screen === 'profile') return 'profile';
    return 'home';
  }, [screen]);
  const setTab = tab => setScreen(tab);
  const goPlan = () => setScreen('plan');
  return (
    <div className="app-shell">
      <div className="phone">
        {screen === 'home' && <HomePage goPlan={goPlan} goSkinTest={() => setScreen('skintest')} />}
        {screen === 'skintest' && <SkinTestPage goHome={() => setScreen('home')} goPlan={goPlan} />}
        {screen === 'plan' && <PlanDetailPage goHome={() => setScreen('home')} goEdit={() => setScreen('edit')} single />}
        {screen === 'edit' && <EditPlanPage goPlan={() => setScreen('plan')} />}
        {screen === 'checkin' && <CheckinPage goRecord={() => setScreen('record')} />}
        {screen === 'record' && <CheckinRecordPage goCheckin={() => setScreen('checkin')} goPlan={() => setScreen('plan')} />}
        {screen === 'ranking' && <RankingPage />}
        {screen === 'profile' && <ProfilePage goPlan={goPlan} goRecord={() => setScreen('record')} />}
        {screen !== 'edit' && screen !== 'record' && <BottomNav tab={currentTab} setTab={setTab} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
