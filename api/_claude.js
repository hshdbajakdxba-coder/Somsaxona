// AI provayderga umumiy chaqiruv (fayl nomi "_" bilan boshlangani uchun Vercel uni route qilmaydi).
// GROQ_API_KEY bo'lsa Groq ishlatiladi, aks holda ANTHROPIC_API_KEY.

export const LANG_NAMES = { uz: 'Uzbek (Latin script)', ru: 'Russian', en: 'English' };

export async function callClaude({ system, prompt, maxTokens = 1200 }) {
  if (process.env.GROQ_API_KEY) return callGroq({ system, prompt, maxTokens });
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic({ system, prompt, maxTokens });
  throw Object.assign(new Error('No AI key: set GROQ_API_KEY or ANTHROPIC_API_KEY'), { status: 500 });
}

async function callGroq({ system, prompt, maxTokens }) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      // gpt-oss avval o'ylaydi, shuning uchun token zaxirasi kattaroq
      max_tokens: maxTokens + 2500,
      reasoning_effort: 'low',
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw Object.assign(new Error(`Groq API ${r.status}: ${body.slice(0, 300)}`), { status: 502 });
  }
  const data = await r.json();
  return extractJson(data.choices?.[0]?.message?.content || '');
}

async function callAnthropic({ system, prompt, maxTokens }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw Object.assign(new Error(`Anthropic API ${r.status}: ${body.slice(0, 300)}`), { status: 502 });
  }
  const data = await r.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  return extractJson(text);
}

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw Object.assign(new Error('No JSON in model output'), { status: 502 });
  return JSON.parse(text.slice(start, end + 1));
}

export function readBody(req) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (JSON.stringify(body).length > 20000) throw Object.assign(new Error('Body too large'), { status: 413 });
  return body;
}

export function sendError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}
