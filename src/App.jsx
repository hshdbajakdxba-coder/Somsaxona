import { useEffect, useMemo, useRef, useState } from 'react';
import { newGame, simulateWeek, defaultDecision, preview, CONFIG } from './engine/engine.js';
import { DECISION_LIMITS as DL } from './data/somsa.js';
import { fetchEvent, fetchAdvice, isQuietWeek } from './api.js';
import { LANGS, makeT, fmt } from './i18n.js';

const STORE_KEY = 'biznes-sim-v1';

// Joriy vaziyatni tanlangan tilda qaytaradi (eski saqlangan o'yinlar uchun .event ham qo'llab-quvvatlanadi)
const eventIn = (current, lang) => current?.events?.[lang] || current?.events?.uz || current?.event || null;
const textIn = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.uz || '' : v || '');

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}
function save(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* storage yo'q — muammo emas */ }
}

export default function App() {
  const saved = useMemo(load, []);
  const [lang, setLang] = useState(saved?.lang || 'uz');
  const [game, setGame] = useState(saved?.game || null);
  const [current, setCurrent] = useState(saved?.current || null); // { event, source } | { quiet: true }
  const [option, setOption] = useState(saved?.option ?? 0);
  const [decision, setDecision] = useState(saved?.decision || defaultDecision());
  const [report, setReport] = useState(saved?.report || null);
  const [advice, setAdvice] = useState(saved?.advice || null);
  const [usedIds, setUsedIds] = useState(saved?.usedIds || []);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const t = makeT(lang);

  useEffect(() => {
    save({ lang, game, current, option, decision, report, advice, usedIds });
  }, [lang, game, current, option, decision, report, advice, usedIds]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  async function loadEvent(state, dec, used) {
    if (isQuietWeek(state)) { setCurrent({ quiet: true }); setOption(0); return; }
    setLoadingEvent(true);
    setCurrent(null);
    const res = await fetchEvent(state, dec, lang, used);
    setCurrent(res);
    setOption(0);
    const id = eventIn(res, 'uz')?.id;
    if (id) setUsedIds((u) => [...u, id].slice(-6));
    setLoadingEvent(false);
  }

  function start(name) {
    const g = newGame({ name });
    const d = defaultDecision();
    setGame(g); setDecision(d); setReport(null); setAdvice(null); setUsedIds([]);
    loadEvent(g, d, []);
  }

  function reset() {
    if (game?.status === 'playing' && !window.confirm(t('confirmNew'))) return;
    setGame(null); setCurrent(null); setReport(null); setAdvice(null);
  }

  async function endWeek() {
    const pre = game;
    const ev = eventIn(current, lang);
    const { state: next, report: rep } = simulateWeek(pre, decision, ev, option);
    setGame(next);
    setReport({ ...rep, eventOptionCount: ev?.options.length || 0 });
    const nextDecision = { ...decision, hireBaker: 0, hireHelper: 0 };
    setDecision(nextDecision);

    setAdvice({ status: 'loading', week: pre.week });
    fetchAdvice(pre, decision, ev, lang).then((a) => {
      const cf = simulateWeek(pre, a.decision, ev, a.option).report;
      setAdvice({
        status: 'done', week: pre.week, source: a.source, reasoning: a.reasoning,
        decision: a.decision, option: a.option,
        optionLabel: current?.events ? Object.fromEntries(Object.entries(current.events).map(([l, e]) => [l, e.options[a.option]?.label])) : ev?.options[a.option]?.label || null,
        cf: { profit: cf.profit, repDelta: cf.repDelta, moraleDelta: cf.moraleDelta, sold: cf.sold },
        mine: { profit: rep.profit, repDelta: rep.repDelta, moraleDelta: rep.moraleDelta, sold: rep.sold },
      });
    });

    if (next.status === 'playing') loadEvent(next, nextDecision, usedIds);
    else setCurrent(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>◐</span>
          <span>{t('appTitle')}</span>
        </div>
        <div className="topbar-right">
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          {game && <button className="ghost" onClick={reset}>{t('newGame')}</button>}
        </div>
      </header>

      {!game && <StartScreen t={t} onStart={start} />}
      {game && game.status !== 'playing' && <GameOver t={t} game={game} onRestart={reset} />}
      {game && (
        <main className="layout">
          <section className="col">
            <Kpis t={t} game={game} />
            {game.status === 'playing' && (
              <>
                <EventCard t={t} lang={lang} current={current} loading={loadingEvent} option={option} setOption={setOption} />
                <DecisionPanel t={t} game={game} decision={decision} setDecision={setDecision}
                  onEnd={endWeek} disabled={loadingEvent || !current} />
              </>
            )}
          </section>
          <section className="col">
            <AdvisorCard t={t} lang={lang} advice={advice} />
            <ReportCard t={t} report={report} />
            <CashChart t={t} history={game.history} />
          </section>
        </main>
      )}
      <footer className="foot">{t('assumptions')}</footer>
    </div>
  );
}

function StartScreen({ t, onStart }) {
  const [name, setName] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <main className="start">
      <div className="start-card">
        <div className="tandir" aria-hidden>
          <span /><span /><span />
        </div>
        <h1>{t('appTitle')}</h1>
        <p className="lead">{t('tagline')}</p>
        <form onSubmit={(e) => { e.preventDefault(); onStart(name.trim() || t('defaultName')); }}>
          <label htmlFor="shop">{t('shopName')}</label>
          <input id="shop" ref={ref} value={name} maxLength={40} placeholder={t('defaultName')}
            onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="primary">{t('start')}</button>
        </form>
        <p className="muted small">{t('startFacts')}</p>
        <p className="muted small">{t('comingSoon')}</p>
      </div>
    </main>
  );
}

function Kpis({ t, game }) {
  const last = game.history.at(-1);
  const prev = game.history.at(-2);
  const week = Math.min(game.week, CONFIG.totalWeeks);
  return (
    <div className="card kpis">
      <div className="kpi-head">
        <h2>{game.name}</h2>
        <span className="pill">{t('week')} {week} / {CONFIG.totalWeeks}</span>
      </div>
      <div className="kpi-grid">
        <Kpi label={t('cash')} value={`${fmt(game.cash)}`} unit={t('som')}
          tone={game.cash < 0 ? 'bad' : null}
          delta={last ? last.profit : null} />
        <Kpi label={t('reputation')} value={Math.round(game.reputation)} unit="/100" meter={game.reputation}
          delta={last && prev ? last.reputation - prev.reputation : null} small />
        <Kpi label={t('morale')} value={Math.round(game.morale)} unit="/100" meter={game.morale}
          tone={game.morale < 35 ? 'bad' : null} small />
        <Kpi label={t('staff')} value={`${game.staff.bakers} + ${game.staff.helpers}`}
          unit={`${t('bakers')} + ${t('helpers')}`} />
      </div>
      {game.modifiers.length > 0 && (
        <div className="mods">
          <span className="muted small">{t('activeEffects')}:</span>
          {game.modifiers.map((m, i) => (
            <span key={i} className="chip">{m.source} · {m.weeksLeft} {t('weeksLeft')}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, unit, delta, meter, tone, small }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value} <span className="kpi-unit">{unit}</span></div>
      {meter != null && <div className="meter"><i style={{ width: `${Math.max(2, meter)}%` }} /></div>}
      {delta != null && delta !== 0 && (
        <div className={`delta ${delta > 0 ? 'up' : 'down'}`}>
          {delta > 0 ? '+' : '−'}{small ? Math.abs(Math.round(delta)) : fmt(Math.abs(delta))}
        </div>
      )}
    </div>
  );
}

function EventCard({ t, lang, current, loading, option, setOption }) {
  if (loading || !current) {
    return <div className="card event loading"><div className="spinner" />{t('loadingEvent')}</div>;
  }
  if (current.quiet) {
    return (
      <div className="card event quiet">
        <div className="eyebrow">{t('situation')}</div>
        <h3>{t('quietWeek')}</h3>
        <p className="muted">{t('quietText')}</p>
      </div>
    );
  }
  const ev = eventIn(current, lang);
  return (
    <div className="card event">
      <div className="event-top">
        <div className="eyebrow">{t('situation')}</div>
        <span className={`badge ${current.source}`}>{current.source === 'ai' ? t('aiBadge') : t('offlineBadge')}</span>
      </div>
      <h3>{ev.title}</h3>
      <p>{ev.description}</p>
      <div className="eyebrow">{t('chooseOption')}</div>
      <div className="options" role="radiogroup">
        {ev.options.map((o, i) => (
          <button key={i} role="radio" aria-checked={option === i}
            className={`option ${option === i ? 'on' : ''}`} onClick={() => setOption(i)}>
            <span className="dot" />{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DecisionPanel({ t, game, decision, setDecision, onEnd, disabled }) {
  const p = preview(game, decision);
  const set = (k) => (v) => setDecision((d) => ({ ...d, [k]: v }));
  const bakersAfter = game.staff.bakers + decision.hireBaker;
  const helpersAfter = game.staff.helpers + decision.hireHelper;
  return (
    <div className="card">
      <h3>{t('decisions')}</h3>
      <Slider label={t('price')} value={decision.price} lim={DL.price} onChange={set('price')}
        display={`${fmt(decision.price)} ${t('som')}`} />
      <Slider label={t('meatG')} value={decision.meatG} lim={DL.meatG} onChange={set('meatG')}
        display={`${decision.meatG} g`} />
      <Slider label={t('marketing')} value={decision.marketing} lim={DL.marketing} onChange={set('marketing')}
        display={`${fmt(decision.marketing)} ${t('som')}`} />
      <Slider label={t('wageMult')} value={decision.wageMult} lim={DL.wageMult} onChange={set('wageMult')}
        display={`${Math.round(decision.wageMult * 100)}%`} />

      <div className="staff-row">
        <Stepper label={t('bakers')} base={game.staff.bakers} value={decision.hireBaker}
          min={bakersAfter <= 1 ? 0 : -1} max={bakersAfter >= 6 ? 0 : 1} onChange={set('hireBaker')} t={t} />
        <Stepper label={t('helpers')} base={game.staff.helpers} value={decision.hireHelper}
          min={helpersAfter <= 0 ? 0 : -1} max={helpersAfter >= 8 ? 0 : 1} onChange={set('hireHelper')} t={t} />
      </div>

      <div className="preview">
        <div><span>{t('meatPrice')}</span><b>{fmt(p.meatPrice)} {t('som')}/kg</b></div>
        <div><span>{t('unitCost')}</span><b>{fmt(p.unitCost)} {t('som')}</b></div>
        <div><span>{t('margin')}</span><b className={p.margin < 0 ? 'neg' : ''}>{fmt(p.margin)} {t('som')}</b></div>
        <div><span>{t('capacity')}</span><b>{fmt(p.capacityPerDay)} {t('pcs')} {t('perDay')}</b></div>
      </div>

      <button className="primary wide" onClick={onEnd} disabled={disabled}>{t('endWeek')} →</button>
    </div>
  );
}

function Slider({ label, value, lim, onChange, display }) {
  return (
    <label className="slider">
      <div className="slider-top"><span>{label}</span><b>{display}</b></div>
      <input type="range" min={lim.min} max={lim.max} step={lim.step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Stepper({ label, base, value, min, max, onChange, t }) {
  return (
    <div className="stepper">
      <span className="muted small">{label}</span>
      <div className="stepper-ctl">
        <button aria-label={t('fire')} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <b>{base + value}</b>
        <button aria-label={t('hire')} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
      {value !== 0 && <span className={`small ${value > 0 ? 'up' : 'down'}`}>{value > 0 ? t('hire') : t('fire')}</span>}
    </div>
  );
}

function ReportCard({ t, report }) {
  if (!report) return <div className="card"><h3>{t('lastWeek')}</h3><p className="muted">{t('noReport')}</p></div>;
  const rows = [
    ['revenue', report.revenue, 1],
    ['cogs', report.cogs, -1],
    ['wages', report.wages, -1],
    ['rent', report.rent, -1],
    ['utilities', report.utilities, -1],
    ['marketing', report.marketing, -1],
    ['tax', report.tax, -1],
    ['eventCash', report.eventCash, Math.sign(report.eventCash) || 1],
    ['staffOneOff', report.staffOneOff, -1],
  ].filter(([, v]) => v !== 0);
  return (
    <div className="card">
      <div className="kpi-head">
        <h3>{t('lastWeek')}</h3>
        <span className="pill">{t('week')} {report.week}</span>
      </div>
      <div className="sales">
        <span>{t('sold')} <b>{fmt(report.sold)}</b> / {t('demand')} {fmt(report.demand)} {t('pcs')}</span>
        <div className="bar"><i style={{ width: `${Math.min(100, (report.sold / Math.max(1, report.demand)) * 100)}%` }} /></div>
      </div>
      <table className="pl">
        <tbody>
          {rows.map(([k, v, sign]) => (
            <tr key={k}>
              <td>{t(k === 'marketing' ? 'marketing' : k)}</td>
              <td className={sign < 0 ? 'neg' : ''}>{sign < 0 ? '−' : '+'}{fmt(Math.abs(v))}</td>
            </tr>
          ))}
          <tr className="total">
            <td>{t('profit')}</td>
            <td className={report.profit < 0 ? 'neg' : 'pos'}>{report.profit < 0 ? '−' : '+'}{fmt(Math.abs(report.profit))} {t('som')}</td>
          </tr>
        </tbody>
      </table>
      {report.log.length > 0 && (
        <ul className="log">
          {report.log.map((l, i) => (
            <li key={i}>
              {l.type === 'event' && <>{l.title}. <span className="muted">{t('logChoice')}: {l.choice}</span></>}
              {l.type === 'shortage' && t('logShortage', { n: fmt(l.lost) })}
              {l.type === 'quit' && t('logQuit')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdvisorCard({ t, lang, advice }) {
  if (!advice) return null;
  if (advice.status === 'loading') {
    return <div className="card advisor loading"><div className="spinner" />{t('advisorLoading')}</div>;
  }
  const { mine, cf, decision: d } = advice;
  const diff = mine.profit - cf.profit;
  return (
    <div className="card advisor">
      <div className="kpi-head">
        <h3>{t('advisor')}</h3>
        <span className="pill">{t('week')} {advice.week}</span>
      </div>
      <div className="vs">
        <div className="vs-col">
          <div className="eyebrow">{t('you')}</div>
          <div className={`vs-num ${mine.profit < 0 ? 'neg' : ''}`}>{fmt(mine.profit)}</div>
          <div className="muted small">{t('reputation')} {signed(mine.repDelta)} · {t('morale')} {signed(mine.moraleDelta)}</div>
        </div>
        <div className="vs-col">
          <div className="eyebrow">{t('ai')}</div>
          <div className={`vs-num ${cf.profit < 0 ? 'neg' : ''}`}>{fmt(cf.profit)}</div>
          <div className="muted small">{t('reputation')} {signed(cf.repDelta)} · {t('morale')} {signed(cf.moraleDelta)}</div>
        </div>
      </div>
      <p className={`verdict ${diff >= 0 ? 'up' : 'down'}`}>{diff >= 0 ? t('verdictBetter') : t('verdictWorse')}</p>
      <div className="chips">
        <span className="chip">{t('price')}: {fmt(d.price)}</span>
        <span className="chip">{t('meatG')}: {d.meatG} g</span>
        <span className="chip">{t('marketing')}: {fmt(d.marketing)}</span>
        <span className="chip">{t('wageMult')}: {Math.round(d.wageMult * 100)}%</span>
        {d.hireBaker !== 0 && <span className="chip">{t('bakers')} {signed(d.hireBaker)}</span>}
        {d.hireHelper !== 0 && <span className="chip">{t('helpers')} {signed(d.hireHelper)}</span>}
        {advice.optionLabel && <span className="chip">{t('option')}: {textIn(advice.optionLabel, lang)}</span>}
      </div>
      {textIn(advice.reasoning, lang) ? <p className="reasoning">{textIn(advice.reasoning, lang)}</p> : <p className="muted small">{t('advisorOffline')}</p>}
      <p className="muted small">{t('verdictNote')}</p>
    </div>
  );
}

const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n * 10) / 10)}`;

function CashChart({ t, history }) {
  if (history.length < 2) return null;
  const W = 600, H = 180, P = 8;
  const vals = [CONFIG.startCash, ...history.map((h) => h.cash)];
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const pad = Math.max(1, (maxV - minV) * 0.15);
  const lo = minV - pad, hi = maxV + pad;
  const x = (i) => P + (i / (vals.length - 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <div className="card">
      <div className="kpi-head"><h3>{t('cashChart')}</h3><span className="muted small">{fmt(minV)} – {fmt(maxV)} {t('som')}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={t('cashChart')}>
        {lo < 0 && hi > 0 && <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} className="zero" />}
        <polyline points={`${x(0)},${H - P} ${pts} ${x(vals.length - 1)},${H - P}`} className="area" />
        <polyline points={pts} className="line" />
        <circle cx={x(vals.length - 1)} cy={y(vals.at(-1))} r="4" className="dot" />
      </svg>
    </div>
  );
}

function GameOver({ t, game, onRestart }) {
  const total = game.history.reduce((a, h) => a + h.profit, 0);
  return (
    <div className="overlay">
      <div className="card over">
        <h2>{game.status === 'bankrupt' ? t('gameOverBankrupt') : t('gameOverDone')}</h2>
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">{t('totalProfit')}</div><div className={`kpi-value ${total < 0 ? 'neg' : ''}`}>{fmt(total)}</div></div>
          <div className="kpi"><div className="kpi-label">{t('finalCash')}</div><div className="kpi-value">{fmt(game.cash)}</div></div>
          <div className="kpi"><div className="kpi-label">{t('reputation')}</div><div className="kpi-value">{Math.round(game.reputation)}</div></div>
          <div className="kpi"><div className="kpi-label">{t('week')}</div><div className="kpi-value">{game.history.length}</div></div>
        </div>
        <button className="primary wide" onClick={onRestart}>{t('playAgain')}</button>
      </div>
    </div>
  );
}
