import React, { useMemo, useState } from 'react';
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
  Edit3,
  Home,
  Link2,
  PackageCheck,
  Send,
  Share2,
  Download,
  Sparkles,
  Star,
  Trophy,
  Upload,
  User,
  Volume2,
} from 'lucide-react';
import './styles.css';

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

function MascotHero() {
  return (
    <div className="mascot-hero" aria-label="护肤小助手形象">
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

function HomePage({ goPlan }) {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = () => {
    if (!link.trim()) {
      setLink('https://www.douyin.com/video/skin-care-demo');
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); goPlan(); }, 650);
  };
  return (
    <main className="page home-page">
      <StatusBar />
      <section className="hero-row">
        <div className="hero-text">
          <div className="brand-pill"><Sparkles size={14} /> 你的护肤小助手</div>
          <h1 className="brand-name">肤记<Sparkles className="brand-spark" size={22} strokeWidth={2.4} /></h1>
          <div className="brand-tagline">AI 护肤计划助手</div>
          <p>粘贴抖音视频链接<br />生成专属护肤方案</p>
        </div>
        <MascotHero />
      </section>

      <section className="card input-card">
        <h2>粘贴抖音视频链接</h2>
        <div className="input-wrap">
          <Link2 size={20} className="input-lead" />
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="粘贴抖音视频链接…" />
        </div>
        <button className={`primary-btn generate-btn ${loading ? 'is-loading' : ''}`} onClick={submit}>
          <Sparkles size={18} strokeWidth={2.2} />
          <span>{loading ? '正在生成方案' : '生成我的护肤方案'}</span>
        </button>
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
    </main>
  );
}

function PlanDetailPage({ goEdit, goHome }) {
  const [step, setStep] = useState(1);
  const [fav, setFav] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = text => {
    setToast(text);
    setTimeout(() => setToast(''), 1400);
  };
  const current = planSteps.find(s => s.id === step);
  const rows = [
    ['主要功效', current.benefits.join(' / ')],
    ['成分亮点', current.ingredients.join('、')],
    ['使用方法', current.usage],
  ];
  return (
    <main className="page plan-page">
      <StatusBar />
      <Header title="方案详情" onBack={goHome} />
      <div className="stepper">
        {[1, 2, 3, 4].map(i => <button key={i} onClick={() => setStep(i)} className={step === i ? 'active' : ''}>{i}</button>)}
      </div>

      <section className="card plan-card">
        <p className="purple-label">{current.label}</p>
        <h1>{current.title}</h1>
        <p className="desc">{current.description}</p>
        <div className="divider" />
        <div className="product-row">
          <ProductImage tone={current.tone} />
          <div>
            <h3>{current.product}</h3>
            <p><b>¥{current.price}</b> <span>/ {current.volume}</span></p>
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
        <div className="action-row">
          <button className={`ghost-btn ${fav ? 'favorited' : ''}`} onClick={() => setFav(!fav)}><Star size={24} />{fav ? '已收藏' : '收藏'}</button>
          <button className="primary-btn" onClick={goEdit}>修改方案</button>
        </div>
      </section>
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
  const marked = [1, 2, 3, 4, 5, 6, 16, 17, 18, 19];
  return (
    <main className="page checkin-page green-page">
      <StatusBar />
      <h1 className="big-title">今日打卡</h1>
      <p className="big-sub">坚持护肤，见证更好的自己 ✨</p>
      <section className="card check-summary">
        <div><h3>已坚持打卡</h3><strong>15 <span>天</span></strong><p>连续打卡 7 天</p></div>
        <button className="primary-btn" onClick={goRecord}>打卡记录</button>
      </section>
      <section className="card calendar-card">
        <div className="cal-head"><ChevronLeft /><h2>2024年6月</h2><ChevronRight /></div>
        <div className="weekdays">{'日一二三四五六'.split('').map(d => <span key={d}>{d}</span>)}</div>
        <div className="days">
          {Array.from({ length: 35 }, (_, idx) => idx).map(idx => {
            const day = idx === 0 ? '' : idx;
            const isToday = idx === 6;
            const isMarked = marked.includes(idx);
            return <button key={idx} onClick={idx ? goRecord : undefined} className={`${isMarked ? 'marked' : ''} ${isToday ? 'today' : ''}`}>{isToday ? '今' : day}</button>;
          })}
        </div>
      </section>
      <section className="card upload-card">
        <h3>今日状态</h3><p>上传今天的皮肤状态</p>
        <button><Upload size={20} /> 上传照片</button>
      </section>
      <section className="tip-card">
        <h3>💡 护肤小贴士</h3>
        <p>充足的睡眠和防晒，是皮肤变好的秘密哦～</p>
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
      <section className="ranking-hero">
        <div><h1>打卡排行榜</h1><p>看看谁是您护肤的王者</p></div>
        <div className="trophy-art"><Trophy size={88} /><Sparkles size={18} /></div>
      </section>
      <div className="rank-tabs">{['总榜', '同方案榜', '好友榜'].map(t => <button key={t} onClick={() => setRankTab(t)} className={rankTab === t ? 'active' : ''}>{t}</button>)}</div>
      <section className="card ranking-list">
        {rankingUsers.map(([name, days, seed], idx) => (
          <div className="rank-row" key={name}>
            <span className={`medal m${idx + 1}`}>{idx + 1}</span>
            <Avatar seed={seed} size={44} />
            <b>{name}</b>
            <p>坚持 <strong>{days}</strong> 天</p>
          </div>
        ))}
      </section>
      <section className="card mine-rank">
        <b>12</b><Avatar seed="me" size={48} /><h3>我自己</h3><p>坚持 <strong>15</strong> 天</p>
      </section>
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
  const currentTab = useMemo(() => {
    if (screen === 'checkin' || screen === 'record') return 'checkin';
    if (screen === 'ranking') return 'ranking';
    if (screen === 'profile') return 'profile';
    return 'home';
  }, [screen]);
  const setTab = tab => setScreen(tab);
  return (
    <div className="app-shell">
      <div className="phone">
        {screen === 'home' && <HomePage goPlan={() => setScreen('plan')} />}
        {screen === 'plan' && <PlanDetailPage goHome={() => setScreen('home')} goEdit={() => setScreen('edit')} />}
        {screen === 'edit' && <EditPlanPage goPlan={() => setScreen('plan')} />}
        {screen === 'checkin' && <CheckinPage goRecord={() => setScreen('record')} />}
        {screen === 'record' && <CheckinRecordPage goCheckin={() => setScreen('checkin')} goPlan={() => setScreen('plan')} />}
        {screen === 'ranking' && <RankingPage />}
        {screen === 'profile' && <ProfilePage />}
        {screen !== 'edit' && screen !== 'record' && <BottomNav tab={currentTab} setTab={setTab} />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
