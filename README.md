# Biznes Simulyator — Somsaxona (MVP)

Foydalanuvchi somsaxona ochadi va uni 26 hafta boshqaradi. AI har hafta biznesga mos, hayotiy vaziyat uyushtiradi (go'sht qimmatlashi, gaz bosimi tushishi, Telegram'dagi shikoyat, raqobatchi...). Hafta yakunida AI o'sha haftada o'zi qanday qaror qilgan bo'lardi, deb taklif beradi. Keyin uning qarori **aynan o'sha engine'da, o'sha tasodif bilan** sinab ko'riladi va natijalar solishtiriladi.

Tillar: o'zbekcha, ruscha, inglizcha.

## Asosiy qoida: AI raqam to'qimaydi

- **Engine** (`src/engine/engine.js`) barcha hisob-kitobni qiladi: talab, tannarx, maosh, ijara, soliq, obro', kayfiyat. U deterministik, ya'ni bir xil kirish berilsa doim bir xil natija chiqadi.
- **AI** faqat vaziyat matnini va chegaralangan koeffitsientlarni qaytaradi (`src/shared/effects.js`). Masalan: go'sht narxi ×1.3, 4 hafta. Chegaradan chiqqan qiymat kesib tashlanadi.
- AI maslahatchiga variantlarning yashirin ta'sirlari ko'rsatilmaydi. U foydalanuvchi bilan teng sharoitda qaror qiladi, shuning uchun AI ba'zan yutqazadi. Bu ataylab shunday qilingan.
- API ishlamasa, o'yin to'xtamaydi: `src/data/fallbackEvents.js` dagi tayyor vaziyatlar va oflayn maslahatchi ishga tushadi. Oflayn maslahatchi engine'da yuzlab variantni sinab, eng yaxshisini tanlaydi.

## Ishga tushirish

```bash
npm install
npm run dev            # faqat frontend, AI o'rniga oflayn rejim ishlaydi
npm run test:engine    # engine'ni 26 hafta sinab ko'rish
```

AI bilan lokal ishlatish uchun (`/api` funksiyalari ishlashi kerak):

```bash
npm i -g vercel
cp .env.example .env    # ANTHROPIC_API_KEY ni yozing
vercel dev
```

## Vercel'ga deploy

1. Loyihani GitHub'ga yuklang va Vercel'da **Import Project** qiling (Framework: Vite).
2. **Settings → Environment Variables** bo'limida `GROQ_API_KEY` (yoki `ANTHROPIC_API_KEY`) ni qo'shing. Modelni `GROQ_MODEL` bilan almashtirish mumkin.
3. Redeploy qiling.

## Fayllar

| Fayl | Nima uchun |
|---|---|
| `src/data/somsa.js` | Narxlar, maoshlar, ijara, retsept, mavsum. **Taxminiy — bozor narxiga moslab yangilang.** |
| `src/engine/engine.js` | Haftalik simulyatsiya va oflayn maslahatchi |
| `src/shared/effects.js` | AI ta'sirlarining chegaralari (brauzer va server ikkalasi ishlatadi) |
| `src/data/fallbackEvents.js` | Oflayn vaziyatlar (3 tilda) |
| `api/event.js` | AI vaziyat yaratadi |
| `api/advise.js` | AI o'z qarorini beradi |
| `src/i18n.js` | Interfeys matnlari (uz / ru / en) |
| `src/App.jsx` | Interfeys |

## Keyingi qadamlar

- Narxlarni real ma'lumot bilan to'g'rilash: Toshkent bozorlari, ijara e'lonlari, soliq stavkasi.
- Yangi biznes qo'shish: `src/data/` papkasida yangi konfiguratsiya yarating (masalan, choyxona) va engine'dagi retsept qismini umumiy qilib qayta yozing.
- Ko'p haftalik solishtirish: hozir AI bilan faqat bitta hafta solishtiriladi. Keyinchalik "agar 26 haftani AI boshqarganda nima bo'lardi" rejimini qo'shish mumkin.
- Foydalanuvchi o'zi vaziyat uyushtiradigan rejim: `api/event.js` dagi formatda vaziyatni foydalanuvchi yozadi, AI esa qaror qiladi.
