import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Crown,
  Droplet,
  Edit3,
  GitMerge,
  Home,
  Layers,
  Link2,
  PackageCheck,
  Play,
  Plus,
  Quote,
  Send,
  Share2,
  Download,
  Sparkles,
  Star,
  Trophy,
  Upload,
  User,
  Volume2,
  X,
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

const consensusPoints = [
  '都强调「温和清洁」，避免过度去油破坏皮肤屏障',
  '洁面后第一时间补水，能明显提升后续成分吸收',
  '保湿锁水是每天必做的收尾步骤，不能省略',
];

const conflictPoints = [
  {
    topic: '精华使用频率',
    views: [
      ['油痘肌研究所', '建议每天使用烟酰胺精华改善暗沉'],
      ['皮肤科医生说', '敏感期应先修护屏障，减少功效型精华'],
    ],
    ai: 'AI 取舍：先低频建立耐受，敏感期暂停，皮肤稳定后再逐步增加到每天。',
  },
  {
    topic: '是否需要喷雾补水',
    views: [
      ['成分党 Lyla', '喷雾意义不大，不如直接用化妆水'],
      ['皮肤科医生说', '泛红、敏感时温泉喷雾能即时舒缓'],
    ],
    ai: 'AI 取舍：泛红或敏感时使用舒缓，状态稳定的日常可以省略。',
  },
];

const cases = [
  ['油皮痘肌的', '护肤搭配', '23.5w人看过', 'case-1'],
  ['敏感肌修复', '全攻略', '18.7w人看过', 'case-2'],
  ['抗老紧致', '护肤方案', '12.3w人看过', 'case-3'],
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

function HomePage({ goCompare, goPlan }) {
  const [draft, setDraft] = useState('');
  const [links, setLinks] = useState([]);
  const [multi, setMulti] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPref, setShowPref] = useState(false);
  const [pref, setPref] = useState('');
  const addLink = () => {
    if (links.length >= 3) return;
    const value = draft.trim() || `https://www.douyin.com/video/skincare-${links.length + 1}`;
    setLinks([...links, value]);
    setDraft('');
  };
  const removeLink = i => setLinks(links.filter((_, idx) => idx !== i));
  const submitSingle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); goPlan(); }, 700);
  };
  const startMerge = preference => {
    setShowPref(false);
    setLoading(true);
    setTimeout(() => { setLoading(false); goCompare(preference); }, 800);
  };
  const toggleMulti = () => {
    const next = !multi;
    setMulti(next);
    if (next && draft.trim() && links.length === 0) {
      setLinks([draft.trim()]);
      setDraft('');
    }
  };
  return (
    <main className="page home-page">
      <StatusBar />
      <section className="hero-row">
        <div className="hero-text">
          <div className="brand-pill"><Sparkles size={14} /> 你的护肤小助手</div>
          <h1 className="brand-name"><img src="/brand-fuji.svg" alt="肤记" /><Sparkles className="brand-spark" size={22} strokeWidth={2.4} /></h1>
          <div className="brand-tagline">抖音护肤计划助手</div>
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
            <p>{multi ? '添加多条同主题视频，AI 对照后合并' : '提取步骤、产品与价格，并标注时间轴'}</p>
          </div>
        </div>

        <button className={`mode-switch ${multi ? 'on' : ''}`} onClick={toggleMulti} type="button">
          <span className="ms-label"><Layers size={16} strokeWidth={2.2} /> 多个视频一起整理</span>
          <span className="ms-track"><span className="ms-thumb" /></span>
        </button>

        {multi && links.length > 0 && (
          <div className="link-list">
            {links.map((l, i) => (
              <div className="link-chip" key={i}>
                <span className="link-chip-icon"><Play size={12} fill="currentColor" strokeWidth={0} /></span>
                <span className="link-chip-text">{l}</span>
                <button onClick={() => removeLink(i)} aria-label="移除链接"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="input-wrap">
          <Link2 size={20} className="input-lead" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && multi && addLink()}
            placeholder={multi ? '粘贴视频链接后点 + 添加' : '粘贴抖音视频链接'}
          />
          {multi && <button className="add-link" onClick={addLink} disabled={links.length >= 3} aria-label="添加链接"><Plus size={20} strokeWidth={2.6} /></button>}
        </div>

        {multi ? (
          <button className={`primary-btn generate-btn ${loading ? 'is-loading' : ''}`} onClick={() => setShowPref(true)} disabled={links.length === 0 || loading}>
            <span>{loading ? '正在整理' : `对照 ${links.length || ''} 条视频整理`}</span>
            {loading ? <Sparkles size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.6} />}
          </button>
        ) : (
          <button className={`primary-btn generate-btn ${loading ? 'is-loading' : ''}`} onClick={submitSingle}>
            <span>{loading ? '正在整理' : '开始整理'}</span>
            {loading ? <Sparkles size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.6} />}
          </button>
        )}
      </section>

      <p className="case-tip">不知道链接？ 试试<span onClick={goPlan}>我们的案例</span><ChevronRight size={15} /></p>

      <section className="section-title">
        <h2>热门案例</h2>
        <button>查看全部 <ChevronRight size={16} /></button>
      </section>
      <div className="case-grid">
        {cases.map(([a, b, views, seed]) => (
          <article className="case-card" key={seed} onClick={goPlan}>
            <div className={`case-img ${seed}`} />
            <h3>{a}<br />{b}</h3>
            <p><span className="tiny-people">◉◉</span> {views}</p>
          </article>
        ))}
      </div>

      {showPref && (
        <div className="sheet-mask" onClick={() => setShowPref(false)}>
          <div className="pref-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>你有特别的偏好吗？</h3>
            <p>告诉 AI 你更看重哪条视频的哪个点，合并时会优先考虑。</p>
            <textarea
              value={pref}
              onChange={e => setPref(e.target.value)}
              placeholder="例如：更认同「皮肤科医生说」的屏障修护建议，精华可以先不用"
            />
            <button className="primary-btn pref-confirm" onClick={() => startMerge(pref.trim())}>
              <Sparkles size={18} strokeWidth={2.2} /> 按我的需求整理
            </button>
            <button className="pref-skip" onClick={() => startMerge('')}>没有需求，直接整理</button>
          </div>
        </div>
      )}
    </main>
  );
}

function ComparePage({ goHome, goPlan, preference }) {
  return (
    <main className="page compare-page">
      <StatusBar />
      <Header title="对照分析" onBack={goHome} />

      <section className="compare-intro">
        <span className="compare-intro-icon"><Layers size={22} strokeWidth={2.2} /></span>
        <div>
          <h2>已解析 {sourceVideos.length} 条视频</h2>
          <p>AI 提取每条视频的关键建议，对照共识与分歧后合并为一份方案</p>
        </div>
      </section>

      {preference && (
        <div className="pref-banner">
          <span className="pref-banner-icon"><Sparkles size={15} strokeWidth={2.2} /></span>
          <div>
            <b>已按你的需求整理</b>
            <p>{preference}</p>
          </div>
        </div>
      )}

      <div className="video-source-list">
        {sourceVideos.map(v => (
          <div className="video-source-card" key={v.id}>
            <span className={`vs-thumb ${v.seed}`}><Play size={16} fill="#fff" strokeWidth={0} /></span>
            <div className="vs-info">
              <b>{v.author}</b>
              <p>{v.handle} · {v.duration}</p>
            </div>
            <span className="vs-tips">提取 {v.tips} 条</span>
          </div>
        ))}
      </div>

      <section className="card consensus-card">
        <h3><span className="cmp-badge ok"><Check size={15} strokeWidth={3} /></span>多数共识 · {consensusPoints.length}</h3>
        <ul>
          {consensusPoints.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </section>

      <section className="card conflict-card">
        <h3><span className="cmp-badge warn"><AlertCircle size={15} strokeWidth={2.6} /></span>分歧与 AI 取舍 · {conflictPoints.length}</h3>
        {conflictPoints.map((c, i) => (
          <div className="conflict-item" key={i}>
            <h4>{c.topic}</h4>
            {c.views.map(([who, view], j) => (
              <div className="view-row" key={j}>
                <span className="who">{who}</span>
                <p>{view}</p>
              </div>
            ))}
            <div className="ai-verdict"><Sparkles size={14} strokeWidth={2.2} /><span>{c.ai}</span></div>
          </div>
        ))}
      </section>

      <button className="primary-btn merge-btn" onClick={goPlan}>
        <GitMerge size={18} strokeWidth={2.4} />
        <span>查看合并后的护肤方案</span>
      </button>
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

function EditPlanPage({ goPlan }) {
  const [messages, setMessages] = useState([
    ['user', '我想减少精华的使用，帮我调整一下方案'],
    ['ai', '好的，我为您调整了方案，减少精华步骤，增加基础保湿。已为您生成新的方案二。'],
  ]);
  const [input, setInput] = useState('');
  const send = (text = input) => {
    if (!text.trim()) return;
    setMessages([...messages, ['user', text], ['ai', '收到，我会继续帮你优化步骤、产品和预算，保持温和有效。']]);
    setInput('');
  };
  return (
    <main className="page edit-page">
      <StatusBar />
      <Header title="修改方案" onBack={goPlan} />
      <p className="sub-title">正在使用：方案一</p>
      <section className="chat-list">
        {messages.map(([role, text], idx) => (
          <div key={idx} className={`bubble ${role}`}>{text}</div>
        ))}
        <span className="time">10:30</span>
      </section>
      <section className="card updated-card">
        <h2>方案二（已更新）</h2>
        <p>已调整 2 个步骤</p>
        <h3>总价预估：¥756</h3>
        <button onClick={goPlan}>查看新方案</button>
      </section>
      <div className="chips">
        {['减少精华', '增加保湿', '更换洁面'].map(t => <button key={t} onClick={() => send(t)}>{t}</button>)}
      </div>
      <div className="chat-input">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="输入您的需求..." />
        <button onClick={() => send()}><Send size={20} /></button>
      </div>
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

function ProfilePage() {
  return (
    <main className="page profile-page">
      <StatusBar />
      <h1 className="big-title">我的</h1>
      <section className="card profile-card">
        <Avatar seed="me" size={64} />
        <div><h2>我自己</h2><p>坚持护肤 15 天 · 已收藏 3 套方案</p></div>
      </section>
      {['我的方案', '我的收藏', '打卡记录', '肤质档案', '设置'].map(item => <section key={item} className="card list-card">{item}<ChevronRight size={18} /></section>)}
    </main>
  );
}

function Header({ title, onBack }) {
  return <header className="header"><button onClick={onBack}><ArrowLeft size={27} /></button><h1>{title}</h1><span /></header>;
}

function App() {
  const [screen, setScreen] = useState('home');
  const [planSingle, setPlanSingle] = useState(true);
  const [preference, setPreference] = useState('');
  const currentTab = useMemo(() => {
    if (screen === 'checkin' || screen === 'record') return 'checkin';
    if (screen === 'ranking') return 'ranking';
    if (screen === 'profile') return 'profile';
    return 'home';
  }, [screen]);
  const setTab = tab => setScreen(tab);
  const goCompare = pref => { setPreference(pref || ''); setScreen('compare'); };
  const goPlanSingle = () => { setPlanSingle(true); setScreen('plan'); };
  const goPlanMerged = () => { setPlanSingle(false); setScreen('plan'); };
  return (
    <div className="app-shell">
      <div className="phone">
        {screen === 'home' && <HomePage goCompare={goCompare} goPlan={goPlanSingle} />}
        {screen === 'compare' && <ComparePage goHome={() => setScreen('home')} goPlan={goPlanMerged} preference={preference} />}
        {screen === 'plan' && <PlanDetailPage goHome={() => setScreen('home')} goEdit={() => setScreen('edit')} single={planSingle} />}
        {screen === 'edit' && <EditPlanPage goPlan={() => setScreen('plan')} />}
        {screen === 'checkin' && <CheckinPage goRecord={() => setScreen('record')} />}
        {screen === 'record' && <CheckinRecordPage goCheckin={() => setScreen('checkin')} goPlan={() => setScreen('plan')} />}
        {screen === 'ranking' && <RankingPage />}
        {screen === 'profile' && <ProfilePage />}
        {screen !== 'edit' && screen !== 'record' && screen !== 'compare' && <BottomNav tab={currentTab} setTab={setTab} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
