// AI ishlamaganda (API kalit yo'q yoki internet yo'q) ishlatiladigan tayyor vaziyatlar.
// Yangi vaziyat qo'shish uchun shu formatda yozing.

const t = (uz, ru, en) => ({ uz, ru, en });

export const FALLBACK_EVENTS = [
  {
    id: 'meat-spike',
    title: t("Go'sht birdan qimmatladi", 'Мясо резко подорожало', 'Meat prices suddenly jumped'),
    description: t(
      "Bozordagi qassobingiz mol go'shti kilosiga narxni ancha oshirganini aytdi: chegaradan kelayotgan mol kamaygan. Bu holat bir necha hafta davom etishi mumkin.",
      'Ваш мясник на рынке сообщил, что говядина сильно подорожала: поставки скота сократились. Это может продлиться несколько недель.',
      'Your butcher at the bazaar says beef has gone up sharply because livestock supply has dropped. It may last several weeks.',
    ),
    base: { meatPrice: 1.3, duration: 4 },
    options: [
      { label: t("Hech narsa qilmaymiz, kutamiz", 'Ничего не делаем, ждём', 'Do nothing and wait'), effects: {} },
      { label: t("Ulgurji yetkazib beruvchi bilan oldindan shartnoma tuzamiz", 'Заключаем предоплатный договор с оптовиком', 'Sign a prepaid deal with a wholesaler'), effects: { meatPrice: 0.85, duration: 4, cash: -3000000 } },
      { label: t("Go'shtning bir qismini dumba bilan almashtiramiz", 'Заменяем часть мяса курдючным жиром', 'Replace part of the meat with tail fat'), effects: { meatPrice: 0.9, duration: 4, reputation: -6 } },
    ],
  },
  {
    id: 'gas-cut',
    title: t("Gaz bosimi tushib ketdi", 'Упало давление газа', 'Gas pressure dropped'),
    description: t(
      "Sovuq kunlarda mahallada gaz bosimi pasaydi, tandir sekin qiziyapti. Ishlab chiqarish sekinlashdi.",
      'В холодные дни в махалле упало давление газа, тандыр греется медленно. Производство замедлилось.',
      'Cold weather has lowered gas pressure in the neighborhood and the tandir heats slowly. Production is slower.',
    ),
    base: { capacity: 0.75, duration: 2 },
    options: [
      { label: t("Ko'mirga o'tamiz", 'Переходим на уголь', 'Switch to coal'), effects: { capacity: 1.2, duration: 2, cash: -1500000 } },
      { label: t("Kamroq pishiramiz, kutamiz", 'Печём меньше, ждём', 'Bake less and wait'), effects: {} },
      { label: t("Ish vaqtini kechgacha cho'zamiz", 'Продлеваем рабочий день', 'Extend working hours'), effects: { capacity: 1.15, duration: 2, morale: -10 } },
    ],
  },
  {
    id: 'telegram-complaint',
    title: t("Telegram'da shikoyat tarqaldi", 'В Telegram разошлась жалоба', 'A complaint went viral on Telegram'),
    description: t(
      "Bir mijoz somsada go'sht kam ekanini aytib, mahalla Telegram guruhiga rasm tashladi. Post tez tarqalyapti.",
      'Клиент выложил фото в телеграм-группу махалли, жалуясь, что в самсе мало мяса. Пост быстро распространяется.',
      'A customer posted a photo in the neighborhood Telegram group saying the somsa had too little meat. It is spreading fast.',
    ),
    base: { reputation: -6 },
    options: [
      { label: t("Ochiq javob yozib, bepul somsa taklif qilamiz", 'Публично отвечаем и предлагаем бесплатную самсу', 'Reply publicly and offer free somsa'), effects: { reputation: 5, cash: -400000 } },
      { label: t("E'tibor bermaymiz", 'Игнорируем', 'Ignore it'), effects: { reputation: -3 } },
      { label: t("Mijoz bilan shaxsan gaplashamiz", 'Лично связываемся с клиентом', 'Contact the customer privately'), effects: { reputation: 2 } },
    ],
  },
  {
    id: 'competitor',
    title: t("Yaqin atrofda yangi somsaxona ochildi", 'Рядом открылась новая самсовая', 'A new somsa shop opened nearby'),
    description: t(
      "Ikki ko'cha narida yangi somsaxona ochildi va birinchi oy uchun arzon narx e'lon qildi.",
      'В двух кварталах открылась новая самсовая и объявила скидки на первый месяц.',
      'A new somsa shop opened two streets away with launch discounts for its first month.',
    ),
    base: { demand: 0.85, duration: 4 },
    options: [
      { label: t("Sifatga urg'u beramiz, narxni tushirmaymiz", 'Делаем ставку на качество, цену не снижаем', 'Focus on quality, keep prices'), effects: { reputation: 2 } },
      { label: t("Instagram reklamasiga pul tikamiz", 'Вкладываемся в рекламу в Instagram', 'Invest in Instagram ads'), effects: { demand: 1.1, duration: 4, cash: -2000000 } },
      { label: t("Doimiy mijozlar uchun karta chiqaramiz", 'Запускаем карту постоянного клиента', 'Launch a loyalty card'), effects: { demand: 1.06, duration: 6, cash: -700000, reputation: 2 } },
    ],
  },
  {
    id: 'wedding-order',
    title: t("To'yga katta buyurtma", 'Крупный заказ на свадьбу', 'A big wedding order'),
    description: t(
      "Mahalladagi oila to'y uchun 1500 dona somsa buyurtma bermoqchi, lekin oldindan to'lov qilmaydi va narxni tushirishni so'rayapti.",
      'Семья из махалли хочет заказать 1500 самс на свадьбу, но без предоплаты и просит скидку.',
      'A local family wants 1,500 somsa for a wedding, with no prepayment, and is asking for a discount.',
    ),
    base: {},
    options: [
      { label: t("Chegirma bilan qabul qilamiz", 'Принимаем со скидкой', 'Accept with a discount'), effects: { cash: 3500000, capacity: 0.85, duration: 1, morale: -4, reputation: 2 } },
      { label: t("Faqat 50% oldindan to'lov bilan qabul qilamiz", 'Принимаем только с предоплатой 50%', 'Accept only with 50% prepayment'), effects: { cash: 2000000, capacity: 0.9, duration: 1 } },
      { label: t("Rad etamiz, oddiy mijozlarga e'tibor", 'Отказываем, фокус на обычных клиентах', 'Decline and focus on regulars'), effects: {} },
    ],
  },
  {
    id: 'baker-sick',
    title: t("Somsapaz kasal bo'lib qoldi", 'Самсапаз заболел', 'A baker fell ill'),
    description: t(
      "Asosiy somsapazlardan biri bir haftaga ishga chiqa olmasligini aytdi.",
      'Один из основных самсапазов сообщил, что не выйдет на работу неделю.',
      'One of your main bakers says he cannot work for a week.',
    ),
    base: { capacity: 0.7, duration: 1 },
    options: [
      { label: t("Vaqtinchalik usta yollaymiz", 'Нанимаем временного мастера', 'Hire a temporary baker'), effects: { capacity: 1.3, duration: 1, cash: -1800000 } },
      { label: t("Qolganlar qo'shimcha ishlaydi (qo'shimcha haq bilan)", 'Остальные работают сверхурочно (с доплатой)', 'Others work overtime (paid)'), effects: { capacity: 1.2, duration: 1, cash: -800000, morale: -5 } },
      { label: t("Kamroq pishiramiz", 'Печём меньше', 'Bake less'), effects: {} },
    ],
  },
  {
    id: 'sanitary-check',
    title: t("Sanitariya tekshiruvi", 'Санитарная проверка', 'Sanitary inspection'),
    description: t(
      "Sanepid xodimlari kutilmaganda tekshiruvga kelishdi. Muzlatgich harorati va qo'l yuvish joyi bo'yicha kamchiliklar topildi.",
      'Санэпидемстанция пришла с внезапной проверкой. Нашли нарушения по температуре холодильника и месту для мытья рук.',
      'Health inspectors arrived unannounced and found problems with fridge temperature and the hand-washing area.',
    ),
    base: {},
    options: [
      { label: t("Darhol tuzatamiz va jarima to'laymiz", 'Сразу исправляем и платим штраф', 'Fix it right away and pay the fine'), effects: { cash: -2500000, reputation: 1 } },
      { label: t("Muddat so'raymiz", 'Просим отсрочку', 'Ask for more time'), effects: { cash: -1000000, reputation: -4 } },
    ],
  },
  {
    id: 'cold-snap',
    title: t("Havo birdan soviydi", 'Резко похолодало', 'A sudden cold snap'),
    description: t(
      "Ob-havo keskin sovidi. Odamlar issiq ovqatni ko'proq so'rayapti, eshik oldida navbat paydo bo'ldi.",
      'Резко похолодало. Люди чаще берут горячую еду, у дверей появилась очередь.',
      'The weather turned cold fast. People want hot food and a queue has formed at the door.',
    ),
    base: { demand: 1.2, duration: 2 },
    options: [
      { label: t("Qo'shimcha somsapaz chaqiramiz", 'Вызываем дополнительного самсапаза', 'Call in an extra baker'), effects: { capacity: 1.15, duration: 2, cash: -900000 } },
      { label: t("Choy bepul beramiz, navbatni sevintiramiz", 'Даём бесплатный чай очереди', 'Give free tea to the queue'), effects: { cash: -300000, reputation: 4 } },
      { label: t("Hech narsa o'zgartirmaymiz", 'Ничего не меняем', 'Change nothing'), effects: {} },
    ],
  },
];

export function localizeEvent(ev, lang) {
  const pick = (o) => o?.[lang] ?? o?.uz ?? '';
  return {
    id: ev.id,
    title: pick(ev.title),
    description: pick(ev.description),
    base: ev.base,
    options: ev.options.map((o) => ({ label: pick(o.label), effects: o.effects })),
  };
}
