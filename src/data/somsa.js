// Somsaxona (tandir somsa) uchun boshlang'ich iqtisodiy ma'lumotlar.
// DIQQAT: bu raqamlar Toshkent uchun TAXMINIY. O'yinni real qilish uchun
// ularni bozordagi joriy narxlarga moslab yangilab turing.
// Barcha summalar so'mda.

export const SOMSA = {
  id: 'somsa',

  // Bozor: "o'rtacha" sharoitda kuniga nechta somsa so'raladi
  ref: {
    price: 10000,     // bitta somsa narxi
    dailyDemand: 450, // shu narx va o'rtacha sifatda kunlik talab
    meatG: 45,        // bitta somsadagi go'sht (gramm)
  },
  elasticity: 2.4, // somsa raqobati katta: narx 10% oshsa, talab ~25% kamayadi

  // Xomashyo narxlari (so'm / kg)
  inputs: {
    meat: 115000,  // mol go'shti
    flour: 6500,   // un
    onion: 5000,   // piyoz
    fat: 70000,    // dumba
  },

  // Bitta somsa uchun retsept va mayda xarajatlar
  recipe: {
    flourG: 55,
    onionG: 45,
    fatG: 15,
    gasPerUnit: 180,   // tandir uchun gaz/ko'mir
    packPerUnit: 120,  // qog'oz, paket
  },

  // Doimiy oylik xarajatlar
  rentMonthly: 7000000,
  utilitiesMonthly: 1800000,
  taxRate: 0.04, // aylanmadan olinadigan soliq (taxminiy)

  roles: {
    baker:  { wageMonthly: 6000000, capPerDay: 200 }, // somsapaz
    helper: { wageMonthly: 3500000, capPerDay: 60 },  // yordamchi (xamir, piyoz)
  },
  hireCost: 400000,      // yangi ishchini topish va o'rgatish
  severanceWeeks: 2,     // bo'shatganda beriladigan haftalik maosh

  startCash: 30000000,   // boshlang'ich kapital (jihozlar allaqachon olingan)
  bankruptLimit: -10000000,
  totalWeeks: 26,

  // Oylar bo'yicha talab koeffitsienti (0 = yanvar). Qishda somsa ko'proq ketadi.
  season: [1.10, 1.08, 1.0, 0.98, 0.95, 0.90, 0.88, 0.88, 0.95, 1.0, 1.05, 1.10],

  start: {
    bakers: 2,
    helpers: 1,
    reputation: 50,
    morale: 60,
  },
};

export const DECISION_LIMITS = {
  price:    { min: 6000, max: 16000, step: 500 },
  meatG:    { min: 30, max: 70, step: 5 },
  marketing:{ min: 0, max: 3000000, step: 100000 },
  wageMult: { min: 0.8, max: 1.4, step: 0.05 },
};
