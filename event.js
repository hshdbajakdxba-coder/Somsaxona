// POST /api/event — biznesga mos, hayotiy vaziyat yaratadi.
// AI faqat matn va chegaralangan koeffitsientlarni qaytaradi; raqamlarni engine hisoblaydi.

import { callClaude, readBody, sendError, LANG_NAMES } from './_claude.js';
import { sanitizeEvent, LIMITS } from '../src/shared/effects.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SYSTEM = `You design weekly events for an educational business simulator. The player runs a small tandir somsa shop in Tashkent, Uzbekistan.

Events must be things that genuinely happen to such a shop: meat, flour or onion price swings at the bazaar, gas pressure drops or power cuts in winter, tax or sanitary inspections, a baker getting sick or asking for a raise, a competitor opening nearby, catering or wedding orders, customer complaints spreading in Telegram groups, delivery app offers, holidays (Navruz, Ramadan, Hayit), weather changes, rent increases, equipment breaking. Match the season and the shop's current situation. Do not repeat recent events.

Each event has "base" effects that happen regardless, and 2-3 options the player chooses from. Options must be real trade-offs: no option should be obviously best. Never reveal numbers or effects in the text; the player must reason like a real owner.

Effect fields (all optional, out-of-range values are clipped):
${Object.entries(LIMITS).map(([k, l]) => `- ${k}: ${l.min}..${l.max} (neutral ${l.def})`).join('\n')}
meatPrice, flourPrice, demand, capacity are multipliers active for "duration" weeks. reputation and morale are one-time point changes on a 0-100 scale. cash is a one-time amount in Uzbek so'm (negative = expense). Keep magnitudes realistic: weekly revenue is about 30-35 million so'm.

Respond with ONLY a JSON object:
{"title": "...", "description": "2-3 sentences", "base": {...}, "options": [{"label": "...", "effects": {...}}]}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { lang = 'uz', context = {} } = readBody(req);
    const language = LANG_NAMES[lang] || LANG_NAMES.uz;
    const prompt = `Shop state this week:
- Week ${Number(context.week) || 1} of 26, month: ${MONTHS[Number(context.month) % 12] || 'October'}
- Cash: ${Math.round(Number(context.cash) || 0)} so'm, reputation ${Math.round(Number(context.reputation) || 50)}/100, staff morale ${Math.round(Number(context.morale) || 60)}/100
- Staff: ${Number(context.bakers) || 2} bakers, ${Number(context.helpers) || 0} helpers
- Price per somsa: ${Number(context.price) || 10000} so'm, meat per somsa: ${Number(context.meatG) || 45} g
- Last week: sold ${Number(context.lastSold) || 0} of ${Number(context.lastDemand) || 0} demanded, profit ${Math.round(Number(context.lastProfit) || 0)} so'm
- Recent events (do not repeat): ${(Array.isArray(context.recent) ? context.recent : []).slice(-6).map((s) => String(s).slice(0, 80)).join('; ') || 'none'}

Write the title, description and option labels in ${language}.`;

    const raw = await callClaude({ system: SYSTEM, prompt });
    const event = sanitizeEvent(raw);
    if (!event) throw Object.assign(new Error('Invalid event from model'), { status: 502 });
    res.status(200).json({ event });
  } catch (err) {
    sendError(res, err);
  }
}
