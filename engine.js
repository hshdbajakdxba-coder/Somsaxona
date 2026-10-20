// Deterministik iqtisodiy engine.
// Bir xil holat + bir xil qaror + bir xil hafta = har doim bir xil natija.
// Shu sababli "AI qarori bilan nima bo'lardi" ni aynan o'sha hafta uchun
// adolatli solishtirish mumkin.

import { SOMSA as B, DECISION_LIMITS as DL } from '../data/somsa.js';
import { clampEffects, hasMultiplier } from '../shared/effects.js';

const WEEKS_PER_MONTH = 4.345;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// mulberry32 — kichik, tez, seed'li tasodifiy son generatori
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultDecision() {
  return { price: B.ref.price, meatG: B.ref.meatG, marketing: 300000, wageMult: 1, hireBaker: 0, hireHelper: 0 };
}

export function clampDecision(d = {}) {
  const def = defaultDecision();
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const snap = (v, lim) => clamp(Math.round(v / lim.step) * lim.step, lim.min, lim.max);
  return {
    price: snap(num(d.price, def.price), DL.price),
    meatG: snap(num(d.meatG, def.meatG), DL.meatG),
    marketing: snap(num(d.marketing, def.marketing), DL.marketing),
    wageMult: Math.round(snap(num(d.wageMult, 1), DL.wageMult) * 100) / 100,
    hireBaker: clamp(Math.round(num(d.hireBaker, 0)), -1, 1),
    hireHelper: clamp(Math.round(num(d.hireHelper, 0)), -1, 1),
  };
}

export function newGame({ name = 'Somsaxona', seed, startMonth } = {}) {
  return {
    name: String(name).slice(0, 40),
    seed: seed ?? Math.floor(Math.random() * 1e9),
    startMonth: startMonth ?? new Date().getMonth(),
    week: 1,
    cash: B.startCash,
    reputation: B.start.reputation,
    morale: B.start.morale,
    staff: { bakers: B.start.bakers, helpers: B.start.helpers },
    market: { meat: B.inputs.meat, flour: B.inputs.flour },
    modifiers: [],
    history: [],
    status: 'playing',
  };
}

export function monthOf(state) {
  return (state.startMonth + Math.floor((state.week - 1) / WEEKS_PER_MONTH)) % 12;
}

function activeMods(modifiers) {
  return modifiers.reduce(
    (a, m) => ({
      meatPrice: a.meatPrice * m.meatPrice,
      flourPrice: a.flourPrice * m.flourPrice,
      demand: a.demand * m.demand,
      capacity: a.capacity * m.capacity,
    }),
    { meatPrice: 1, flourPrice: 1, demand: 1, capacity: 1 },
  );
}

export function unitCost(meatPrice, flourPrice, meatG) {
  const r = B.recipe;
  return (
    (meatG * meatPrice) / 1000 +
    (r.flourG * flourPrice) / 1000 +
    (r.onionG * B.inputs.onion) / 1000 +
    (r.fatG * B.inputs.fat) / 1000 +
    r.gasPerUnit +
    r.packPerUnit
  );
}

function dailyCapacity(bakers, helpers, morale, capMult) {
  const raw = bakers * B.roles.baker.capPerDay + Math.min(helpers, bakers * 2) * B.roles.helper.capPerDay;
  return raw * (0.8 + (0.4 * morale) / 100) * capMult;
}

// Qaror panelida "joriy tannarx" va quvvatni ko'rsatish uchun
export function preview(state, decision) {
  const d = clampDecision(decision);
  const mods = activeMods(state.modifiers);
  const bakers = clamp(state.staff.bakers + d.hireBaker, 1, 6);
  const helpers = clamp(state.staff.helpers + d.hireHelper, 0, 8);
  const cost = unitCost(state.market.meat * mods.meatPrice, state.market.flour * mods.flourPrice, d.meatG);
  return {
    unitCost: Math.round(cost),
    margin: Math.round(d.price - cost - d.price * B.taxRate),
    capacityPerDay: Math.round(dailyCapacity(bakers, helpers, state.morale, mods.capacity)),
    meatPrice: Math.round(state.market.meat * mods.meatPrice),
  };
}

// Bitta haftani simulyatsiya qiladi. Kirish holatini o'zgartirmaydi.
export function simulateWeek(state, decision, event = null, optionIndex = 0) {
  const rng = makeRng(state.seed + state.week * 7919);
  const d = clampDecision(decision);
  const s = structuredClone(state);
  const log = [];

  // 1) Ishchilar
  const oldBakers = s.staff.bakers;
  const oldHelpers = s.staff.helpers;
  let bakers = clamp(oldBakers + d.hireBaker, 1, 6);
  const helpers = clamp(oldHelpers + d.hireHelper, 0, 8);
  const wageWeek = (role) => (B.roles[role].wageMonthly * d.wageMult) / WEEKS_PER_MONTH;
  let staffOneOff = 0;
  if (bakers > oldBakers) staffOneOff += (bakers - oldBakers) * B.hireCost;
  if (helpers > oldHelpers) staffOneOff += (helpers - oldHelpers) * B.hireCost;
  if (bakers < oldBakers) { staffOneOff += (oldBakers - bakers) * wageWeek('baker') * B.severanceWeeks; s.morale -= 6; }
  if (helpers < oldHelpers) { staffOneOff += (oldHelpers - helpers) * wageWeek('helper') * B.severanceWeeks; s.morale -= 4; }

  // 2) Vaziyat ta'sirlari
  let eventCash = 0;
  let repShock = 0;
  if (event) {
    const chosen = event.options?.[optionIndex]?.effects;
    for (const raw of [event.base, chosen]) {
      if (!raw) continue;
      const e = clampEffects(raw);
      eventCash += e.cash;
      repShock += e.reputation;
      s.morale += e.morale;
      if (hasMultiplier(e)) {
        s.modifiers.push({
          meatPrice: e.meatPrice, flourPrice: e.flourPrice, demand: e.demand, capacity: e.capacity,
          weeksLeft: e.duration, source: event.title,
        });
      }
    }
    log.push({ type: 'event', title: event.title, choice: event.options?.[optionIndex]?.label ?? '' });
  }
  s.morale = clamp(s.morale, 0, 100);

  // 3) Bozor o'zgarishi (sekin inflyatsiya + shovqin)
  s.market.meat *= 1 + (rng() - 0.42) * 0.012;
  s.market.flour *= 1 + (rng() - 0.45) * 0.01;

  const mods = activeMods(s.modifiers);
  const meatPrice = s.market.meat * mods.meatPrice;
  const flourPrice = s.market.flour * mods.flourPrice;
  const cost = unitCost(meatPrice, flourPrice, d.meatG);

  // 4) Talab va sotuv (7 kun)
  const capDay = dailyCapacity(bakers, helpers, s.morale, mods.capacity);
  const season = B.season[monthOf(s)];
  // Narx bozordagidan qanchalik uzoq bo'lsa, mijozlar shuncha sezgir bo'ladi
  const rel = d.price / B.ref.price;
  const elasticity = B.elasticity + 3 * Math.max(0, rel - 1);
  const priceF = Math.pow(rel, -elasticity);
  const repF = 0.3 + (1.4 * clamp(s.reputation + repShock, 0, 100)) / 100;
  const qualF = Math.pow(clamp(d.meatG / B.ref.meatG, 0.4, 1.8), 0.8);
  const mktF = 1 + 0.12 * Math.log1p(d.marketing / 300000);
  let demand = 0;
  let sold = 0;
  for (let day = 0; day < 7; day++) {
    const weekend = day >= 5 ? 1.15 : 1;
    const dd = B.ref.dailyDemand * priceF * repF * qualF * mktF * season * mods.demand * weekend * (0.9 + 0.2 * rng());
    demand += dd;
    sold += Math.min(dd, capDay);
  }
  demand = Math.round(demand);
  sold = Math.round(sold);

  // 5) Moliya
  const revenue = sold * d.price;
  const cogs = sold * cost;
  const wages = bakers * wageWeek('baker') + helpers * wageWeek('helper');
  const rent = B.rentMonthly / WEEKS_PER_MONTH;
  const utilities = B.utilitiesMonthly / WEEKS_PER_MONTH;
  const tax = revenue * B.taxRate;
  const operating = revenue - cogs - wages - rent - utilities - d.marketing - tax;
  const profit = operating + eventCash - staffOneOff;
  s.cash += profit;

  // 6) Obro' va kayfiyat
  const shortage = demand > 0 ? 1 - sold / demand : 0;
  const repBefore = state.reputation;
  const repTarget = 55 + 90 * (d.meatG / B.ref.meatG - 1) - 60 * Math.max(0, d.price / B.ref.price - 1) - 40 * shortage;
  s.reputation = clamp(s.reputation + repShock + 0.25 * (repTarget - (s.reputation + repShock)), 0, 100);
  if (shortage > 0.08) log.push({ type: 'shortage', lost: demand - sold });

  const utilization = sold / (capDay * 7);
  const moraleBefore = state.morale;
  const moraleTarget = 60 + 90 * (d.wageMult - 1) - 60 * Math.max(0, utilization - 0.9);
  s.morale = clamp(s.morale + 0.3 * (moraleTarget - s.morale), 0, 100);

  // Kayfiyat past bo'lsa somsapaz ketib qolishi mumkin (rng har doim chaqiriladi —
  // shunda solishtirma simulyatsiyada tasodif ketma-ketligi bir xil qoladi)
  const quitRoll = rng();
  if (s.morale < 35 && bakers > 1 && quitRoll < (35 - s.morale) / 60) {
    bakers -= 1;
    s.morale = clamp(s.morale + 5, 0, 100);
    log.push({ type: 'quit' });
  }
  s.staff = { bakers, helpers };

  // 7) Ko'paytiruvchilar muddatini kamaytirish
  s.modifiers = s.modifiers
    .map((m) => ({ ...m, weeksLeft: m.weeksLeft - 1 }))
    .filter((m) => m.weeksLeft > 0);

  const report = {
    week: state.week,
    decision: d,
    revenue: Math.round(revenue),
    cogs: Math.round(cogs),
    wages: Math.round(wages),
    rent: Math.round(rent),
    utilities: Math.round(utilities),
    marketing: d.marketing,
    tax: Math.round(tax),
    eventCash: Math.round(eventCash),
    staffOneOff: Math.round(staffOneOff),
    profit: Math.round(profit),
    sold,
    demand,
    capacity: Math.round(capDay * 7),
    unitCost: Math.round(cost),
    meatPrice: Math.round(meatPrice),
    repDelta: Math.round((s.reputation - repBefore) * 10) / 10,
    moraleDelta: Math.round((s.morale - moraleBefore) * 10) / 10,
    reputation: Math.round(s.reputation),
    morale: Math.round(s.morale),
    cash: Math.round(s.cash),
    log,
  };

  s.history.push({
    week: state.week, cash: report.cash, profit: report.profit, revenue: report.revenue,
    sold, demand, reputation: report.reputation, morale: report.morale,
    eventTitle: event?.title ?? null,
  });
  s.week += 1;
  if (s.cash < B.bankruptLimit) s.status = 'bankrupt';
  else if (s.week > B.totalWeeks) s.status = 'finished';

  return { state: s, report };
}

// Oflayn maslahatchi: AI ishlamasa, nomzod qarorlarni engine'da sinab,
// foyda + obro' + kayfiyatni hisobga olgan holda eng yaxshisini tanlaydi.
export function offlineAdvice(state, event) {
  const nOpts = event?.options?.length || 1;
  let best = null;
  for (const price of [9000, 10000, 11000, 12000, 13000])
    for (const meatG of [40, 45, 50, 55])
      for (const marketing of [0, 300000, 800000])
        for (const wageMult of [1, 1.1])
          for (const hireBaker of [0, 1])
            for (let option = 0; option < nOpts; option++) {
              const dec = { price, meatG, marketing, wageMult, hireBaker, hireHelper: 0 };
              const { report } = simulateWeek(state, dec, event, option);
              // obro' kelajakdagi talabni belgilaydi — shuning uchun uni pulga aylantirib baholaymiz
              const score = report.profit + 450000 * report.repDelta + 120000 * report.moraleDelta;
              if (!best || score > best.score) best = { score, decision: dec, option };
            }
  return { decision: best.decision, option: best.option };
}

export const CONFIG = B;
