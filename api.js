// Brauzer tomoni: AI'ga so'rov, ishlamasa oflayn zaxira.
import { sanitizeEvent } from './shared/effects.js';
import { FALLBACK_EVENTS, localizeEvent } from './data/fallbackEvents.js';
import { makeRng, monthOf, preview, offlineAdvice, clampDecision } from './engine/engine.js';

async function post(url, body, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function context(state, decision) {
  const last = state.history.at(-1);
  const p = preview(state, decision);
  return {
    week: state.week,
    month: monthOf(state),
    cash: state.cash,
    reputation: state.reputation,
    morale: state.morale,
    bakers: state.staff.bakers,
    helpers: state.staff.helpers,
    ...decision,
    lastSold: last?.sold ?? 0,
    lastDemand: last?.demand ?? 0,
    lastProfit: last?.profit ?? 0,
    recent: state.history.map((h) => h.eventTitle).filter(Boolean),
    recentWeeks: state.history.slice(-4).map((h) => ({ sold: h.sold, demand: h.demand, profit: h.profit })),
    capacityPerDay: p.capacityPerDay,
    unitCost: p.unitCost,
    meatPrice: p.meatPrice,
  };
}

// Har haftada vaziyat bo'lavermaydi — ba'zan tinch hafta
export function isQuietWeek(state) {
  if (state.week === 1) return false;
  return makeRng(state.seed * 3 + state.week)() < 0.3;
}

export async function fetchEvent(state, decision, lang, usedIds = []) {
  try {
    const { event } = await post('/api/event', { lang, context: context(state, decision) });
    const clean = sanitizeEvent(event);
    if (clean) return { event: clean, source: 'ai' };
  } catch {
    /* zaxiraga o'tamiz */
  }
  const pool = FALLBACK_EVENTS.filter((e) => !usedIds.includes(e.id));
  const list = pool.length ? pool : FALLBACK_EVENTS;
  const pick = list[Math.floor(makeRng(state.seed + state.week * 31)() * list.length)];
  return { event: localizeEvent(pick, lang), source: 'offline' };
}

export async function fetchAdvice(state, decision, event, lang) {
  try {
    const safeEvent = event
      ? { title: event.title, description: event.description, options: event.options.map((o) => ({ label: o.label })) }
      : null;
    const out = await post('/api/advise', { lang, context: context(state, decision), event: safeEvent }, 30000);
    return { decision: clampDecision(out.decision), option: out.option ?? 0, reasoning: out.reasoning, source: 'ai' };
  } catch {
    const a = offlineAdvice(state, event);
    return { ...a, reasoning: null, source: 'offline' };
  }
}
