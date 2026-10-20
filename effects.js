// Vaziyat (event) ta'sirlarining qat'iy chegaralari.
// AI faqat shu koeffitsientlarni taklif qiladi, raqamlarni esa engine hisoblaydi.
// Bu fayl ham brauzerda, ham /api serverless funksiyalarida ishlatiladi.

export const LIMITS = {
  meatPrice:  { min: 0.7, max: 1.6, def: 1 },   // go'sht narxi ko'paytiruvchisi
  flourPrice: { min: 0.7, max: 1.6, def: 1 },   // un narxi ko'paytiruvchisi
  demand:     { min: 0.5, max: 1.5, def: 1 },   // talab ko'paytiruvchisi
  capacity:   { min: 0.5, max: 1.2, def: 1 },   // ishlab chiqarish quvvati
  duration:   { min: 1, max: 6, def: 1 },       // ko'paytiruvchilar necha hafta amal qiladi
  reputation: { min: -20, max: 15, def: 0 },    // bir martalik o'zgarish (ball)
  morale:     { min: -25, max: 20, def: 0 },    // bir martalik o'zgarish (ball)
  cash:       { min: -15000000, max: 10000000, def: 0 }, // bir martalik pul (so'm)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function clampEffects(e = {}) {
  const out = {};
  for (const [k, lim] of Object.entries(LIMITS)) {
    const v = Number(e?.[k]);
    out[k] = Number.isFinite(v) ? clamp(v, lim.min, lim.max) : lim.def;
  }
  out.duration = Math.round(out.duration);
  out.cash = Math.round(out.cash / 10000) * 10000;
  return out;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function sanitizeEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const options = Array.isArray(ev.options) ? ev.options.slice(0, 3) : [];
  const clean = {
    title: str(ev.title, 120),
    description: str(ev.description, 700),
    base: clampEffects(ev.base),
    options: options
      .map((o) => ({ label: str(o?.label, 160), effects: clampEffects(o?.effects) }))
      .filter((o) => o.label),
  };
  if (!clean.title || !clean.description || clean.options.length < 2) return null;
  return clean;
}

export function hasMultiplier(e) {
  return ['meatPrice', 'flourPrice', 'demand', 'capacity'].some((k) => e[k] !== 1);
}
