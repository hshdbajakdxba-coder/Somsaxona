// Engine'ni tez tekshirish: 26 hafta standart qaror bilan + bitta vaziyat.
import { newGame, simulateWeek, defaultDecision, offlineAdvice, preview } from '../src/engine/engine.js';
import { FALLBACK_EVENTS, localizeEvent } from '../src/data/fallbackEvents.js';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n);
let g = newGame({ name: 'Test', seed: 42, startMonth: 9 });
console.log('Preview:', preview(g, defaultDecision()));

let total = 0;
for (let w = 1; w <= 26 && g.status === 'playing'; w++) {
  const ev = w % 3 === 0 ? localizeEvent(FALLBACK_EVENTS[w % FALLBACK_EVENTS.length], 'uz') : null;
  const { state, report } = simulateWeek(g, defaultDecision(), ev, 0);
  total += report.profit;
  if (w <= 4 || w % 6 === 0)
    console.log(`W${w} sold ${report.sold}/${report.demand} cap ${report.capacity} unit ${fmt(report.unitCost)} profit ${fmt(report.profit)} cash ${fmt(report.cash)} rep ${report.reputation} morale ${report.morale}`);
  g = state;
}
console.log('Total profit:', fmt(total), 'status', g.status);

// Determinizm: bir xil kirish -> bir xil chiqish
const g0 = newGame({ seed: 7, startMonth: 0 });
const a = simulateWeek(g0, defaultDecision()).report.profit;
const b = simulateWeek(g0, defaultDecision()).report.profit;
console.log('Deterministic:', a === b);

const ev = localizeEvent(FALLBACK_EVENTS[0], 'uz');
const adv = offlineAdvice(g0, ev);
console.log('Offline advice:', adv, 'profit', fmt(simulateWeek(g0, adv.decision, ev, adv.option).report.profit));
