// Таблица норм сна — единственный источник истины.
// Все длительности отрезков ВБ — в МИНУТАХ, чтобы не было ошибок парсинга.
// При пересечении диапазонов (2 и 0–1; 6 в «5–6» и «6–7») — берём более старшую строку.

export const SLEEP_NORMS = [
  { id: '0-1',   label: '0–1 мес',   ageMin: 0,  ageMax: 1,  totalSleep: [15, 17],   totalWake: [7, 9],     wakeWindow: [40, 60],    napsCount: [4, 7], napsTotal: [6, 8],   nightSleep: [8, 10] },
  { id: '2',     label: '2 мес',     ageMin: 2,  ageMax: 2,  totalSleep: [15, 17],   totalWake: [7, 9],     wakeWindow: [70, 90],    napsCount: [4, 6], napsTotal: [6, 8],   nightSleep: [8, 10] },
  { id: '3',     label: '3 мес',     ageMin: 3,  ageMax: 3,  totalSleep: [14, 16],   totalWake: [8, 10],    wakeWindow: [80, 105],   napsCount: [4, 5], napsTotal: [5, 6],   nightSleep: [9, 10] },
  { id: '4',     label: '4 мес',     ageMin: 4,  ageMax: 4,  totalSleep: [14, 15],   totalWake: [9, 10],    wakeWindow: [105, 120],  napsCount: [3, 5], napsTotal: [3.5, 4.5], nightSleep: [10, 11] },
  { id: '5-6',   label: '5–6 мес',   ageMin: 5,  ageMax: 6,  totalSleep: [13, 15],   totalWake: [9, 11],    wakeWindow: [110, 140],  napsCount: [3, 4], napsTotal: [3, 4],   nightSleep: [10, 11] },
  { id: '6-7',   label: '6–7 мес',   ageMin: 6,  ageMax: 7,  totalSleep: [13, 14],   totalWake: [10, 11],   wakeWindow: [140, 180],  napsCount: [3, 3], napsTotal: [3, 3.5], nightSleep: [10, 11] },
  { id: '8-10',  label: '8–10 мес',  ageMin: 8,  ageMax: 10, totalSleep: [12, 14],   totalWake: [10, 12],   wakeWindow: [180, 240],  napsCount: [2, 3], napsTotal: [2, 3],   nightSleep: [10, 11] },
  { id: '11-13', label: '11–13 мес', ageMin: 11, ageMax: 13, totalSleep: [12, 13.5], totalWake: [10.5, 12], wakeWindow: [210, 270],  napsCount: [2, 2], napsTotal: [2, 2.5], nightSleep: [10, 11] },
  { id: '14-17', label: '14–17 мес', ageMin: 14, ageMax: 17, totalSleep: [12, 13],   totalWake: [11, 12],   wakeWindow: [240, 360],  napsCount: [1, 2], napsTotal: [1.5, 2.5], nightSleep: [10, 11] },
  { id: '18-36', label: '18–36 мес', ageMin: 18, ageMax: 36, totalSleep: [11.5, 13], totalWake: [11, 12.5], wakeWindow: [330, 420],  napsCount: [1, 1], napsTotal: [1.5, 2.5], nightSleep: [9.5, 11] },
];

// Правила выбора строки по возрасту (в полных месяцах, округление вниз).
// При пересечении — берём более старшую строку (для 2 → «2», для 6 → «6–7»).
export function pickNormsRow(ageMonths) {
  if (ageMonths < 0) return SLEEP_NORMS[0];
  if (ageMonths > 36) return { ...SLEEP_NORMS[SLEEP_NORMS.length - 1], label: '18–36 мес (ориентир для 3+ лет)' };
  // Прямой перебор: первая строка, в которую попадает возраст.
  for (const row of SLEEP_NORMS) {
    if (ageMonths >= row.ageMin && ageMonths <= row.ageMax) return row;
  }
  return SLEEP_NORMS[SLEEP_NORMS.length - 1];
}

// Окно сна для текущего отрезка ВБ.
// Первое ВБ дня — короче на 10–15 мин от нижней границы.
// Последнее перед ночью — длиннее на 15–30 мин от верхней границы.
// isFirst / isLast — выставляются на экране трекера по контексту дня.
export function computeWakeWindow(ageMonths, { isFirst = false, isLast = false } = {}) {
  const row = pickNormsRow(ageMonths);
  let [min, max] = row.wakeWindow;
  if (isFirst) {
    min = Math.max(20, min - 15);
    max = Math.max(min + 10, max - 10);
  }
  if (isLast) {
    min = min + 15;
    max = max + 30;
  }
  return { min, max, rowId: row.id, label: row.label };
}

// «Красные флаги» с картинки-таблицы — идут в логику рекомендаций.
export const RED_FLAGS = [
  'Регулярно недосыпает, бодрствуя между снами несколько часов с плачем.',
  'Ночью часто просыпается, а днём компенсирует — отсыпается.',
];

// Быстрые теги признаков усталости (ПУ).
export const TIREDNESS_TAGS = [
  'зевает', 'трёт глаза', 'капризничает', 'отводит взгляд',
  'теряет интерес к игре', 'выгибается', 'перевозбуждён(а)',
];

// Теги качества и места сна.
export const QUALITY_TAGS = [
  { id: 'place', label: 'Где', options: ['на руках', 'в коляске', 'в кровати'] },
  { id: 'calm',  label: 'Как',  options: ['спокойно', 'с пробуждениями'] },
];
