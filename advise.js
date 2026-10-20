// POST /api/advise — AI shu hafta o'zi qanday qaror qilgan bo'lardi.
// AI'ga variantlarning yashirin ta'sirlari ko'rsatilmaydi — o'yinchi bilan teng sharoitda qaror qiladi.
// Keyin brauzer bu qarorni o'sha engine'da, o'sha tasodif bilan sinab, natijalarni solishtiradi.

import { callClaude, readBody, sendError, LANG_NAMES } from './_claude.js';

const SYSTEM = `You are an experienced owner of several tandir somsa shops in Tashkent. A beginner asks what you would do this week in their shop.

Think about unit economics (cost per somsa vs price), capacity vs demand, reputation (it drives future demand), staff morale (low morale cuts output and makes bakers quit), and cash safety. Short-term profit is not everything; a shop that cuts meat or overprices loses customers over the following weeks.

Respond with ONLY a JSON object:
{"price": so'm 6000-16000 step 500, "meatG": 30-70 step 5, "marketing": weekly so'm 0-3000000, "wageMult": 0.8-1.4, "hireBaker": -1|0|1, "hireHelper": -1|0|1, "option": index of the event option you choose (0-based) or 0 if no event, "reasoning": "3-4 short sentences in plain words explaining the key trade-off you weighed"}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { lang = 'uz', context = {}, event = null } = readBody(req);
    const language = LANG_NAMES[lang] || LANG_NAMES.uz;
    const c = context;
    const ev = event && typeof event === 'object'
      ? `This week's situation: "${String(event.title).slice(0, 120)}" — ${String(event.description).slice(0, 600)}
Options:
${(event.options || []).slice(0, 3).map((o, i) => `${i}. ${String(o.label).slice(0, 160)}`).join('\n')}`
      : 'No special situation this week.';

    const prompt = `Shop state at the start of week ${Number(c.week) || 1} of 26:
- Cash ${Math.round(Number(c.cash) || 0)} so'm, reputation ${Math.round(Number(c.reputation) || 50)}/100, morale ${Math.round(Number(c.morale) || 60)}/100
- Staff: ${Number(c.bakers)} bakers (6,000,000 so'm/month each), ${Number(c.helpers)} helpers (3,500,000 so'm/month each). Hiring costs ~400,000 so'm; firing pays 2 weeks severance and hurts morale.
- Capacity now: about ${Number(c.capacityPerDay) || 0} somsa/day. A baker adds ~200/day, a helper ~60/day.
- Current meat price: ${Number(c.meatPrice) || 115000} so'm/kg. Cost per somsa at current settings: ${Number(c.unitCost) || 0} so'm. Turnover tax 4%.
- Current settings: price ${Number(c.price)} so'm, meat ${Number(c.meatG)} g, marketing ${Number(c.marketing)} so'm/week, wage multiplier ${Number(c.wageMult)}
- Typical market price for a somsa nearby: about 10,000 so'm with ~45 g meat.
- Last weeks (sold / demanded / profit): ${(Array.isArray(c.recentWeeks) ? c.recentWeeks : []).slice(-4).map((w) => `${w.sold}/${w.demand}/${w.profit}`).join(', ') || 'first week'}
- Rent 7,000,000/month, utilities 1,800,000/month.

${ev}

Write "reasoning" in ${language}.`;

    const out = await callClaude({ system: SYSTEM, prompt, maxTokens: 700 });
    res.status(200).json({
      decision: {
        price: out.price, meatG: out.meatG, marketing: out.marketing,
        wageMult: out.wageMult, hireBaker: out.hireBaker, hireHelper: out.hireHelper,
      },
      option: Math.max(0, Math.min((event?.options?.length || 1) - 1, Math.round(Number(out.option) || 0))),
      reasoning: String(out.reasoning || '').slice(0, 900),
    });
  } catch (err) {
    sendError(res, err);
  }
}
