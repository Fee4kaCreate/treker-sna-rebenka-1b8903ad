// Логика рекомендаций: недосып, смещение, поздний отбой, готовность к сокращению снов.

import { dayAggregates, detectNightSleep, ageMonths } from './analytics-agg.js';
import { dateOnly } from './utils.js';

export function buildRecommendations(child, allRecords) {
  const out = [];
  // Берём последние до 7 завершённых суток (исключая сегодня)
  const completed = [];
  for (let i = 1; i <= 14 && completed.length < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const sd = dateOnly(d);
    const night = detectNightSleep(allRecords);
    const agg = dayAggregates(allRecords, child, sd, night);
    if (agg.isComplete) completed.push(agg);
  }
  if (!completed.length) {
    out.push({ kind: 'info', title: 'Нужно ещё данных',
      text: 'Продолжайте отмечать сны — рекомендации появятся через пару суток.' });
    return out;
  }
  const lows = completed.filter(d => d.flags.totalSleep === 'low');
  if (lows.length >= 2) {
    out.push({ kind: 'warn', title: 'Накопился недосып',
      text: 'Сон ниже нормы два дня подряд. Попробуйте уложить на ночь на 30 мин раньше или добавить дневной сон.',
      why: 'Дефицит сна даёт тот же эффект, что и перегул: ребёнку сложнее уснуть, чаще ночные пробуждения.' });
  }
  const shift = completed.filter(d => d.flags.totalNap === 'high' && d.flags.nightSleep === 'low');
  if (shift.length >= 2) {
    out.push({ kind: 'warn', title: 'Дневной сон «съедает» ночной',
      text: 'Следите, чтобы последний дневной сон заканчивался не позже, чем за одно полное ВБ до ночи.',
      why: 'Слишком длинный или поздний ДС сдвигает ночное засыпание и утренний подъём.' });
  }
  const lateBed = completed.filter(d => d.night && new Date(d.night.startTime).getHours() >= 22).length;
  if (lateBed >= 3) {
    out.push({ kind: 'warn', title: 'Поздний отбой',
      text: 'Ночное засыпание часто позже 22:00. Попробуйте сдвинуть на 15–20 мин раньше каждые 2–3 дня.',
      why: 'С возрастом биоритмы ребёнка хорошо закрепляются на стабильном времени укладывания.' });
  }
  const napLowDays = completed.filter(d => d.flags.totalNap === 'low' || d.flags.napsCount === 'low').length;
  const totalOkDays = completed.filter(d => d.flags.totalSleep === 'ok').length;
  if (napLowDays >= 5 && totalOkDays >= 3) {
    const nextNaps = Math.max(1, completed[0].row.napsCount[0] - 1);
    out.push({ kind: 'info', title: `Возможно, переход на ${nextNaps} ${pluralNaps(nextNaps)}`,
      text: 'Дневной сон стабильно короче нормы, а общий сон в норме — это признак готовности.',
      why: 'Увеличивайте ВБ постепенно, не больше 15 мин за день.' });
  }
  if (!out.length) {
    out.push({ kind: 'good', title: 'Режим в окне нормы',
      text: 'По последним суткам всё стабильно. Продолжайте в том же ритме.',
      why: 'Стабильность режима — главный фактор качественного сна.' });
  }
  return out;
}

function pluralNaps(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'сон';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'сна';
  return 'снов';
}

// Красные флаги по картинке-таблице
export const RED_FLAGS = [
  'Регулярно недосыпает, бодрствуя между снами несколько часов с плачем.',
  'Ночью часто просыпается, а днём компенсирует — отсыпается.',
];

export function redFlagHits(child, allRecords) {
  const hits = [];
  // 1) бодрствование между снами > 3ч с плачем (грубая эвристика по длинным ВБ)
  for (let i = 0; i < allRecords.length - 1; i++) {
    const a = allRecords[i], b = allRecords[i + 1];
    const gap = (new Date(b.startTime) - new Date(a.endTime)) / 60000;
    if (gap > 180) { hits.push(RED_FLAGS[0]); break; }
  }
  // 2) частые ночные пробуждения + длинный ДС
  const lastWeek = allRecords.filter(r => Date.now() - new Date(r.startTime) < 7 * 86400000);
  const totalWakes = lastWeek.reduce((s, r) => s + (r.wakings?.length || 0), 0);
  if (totalWakes > 10) hits.push(RED_FLAGS[1]);
  return Array.from(new Set(hits));
}
