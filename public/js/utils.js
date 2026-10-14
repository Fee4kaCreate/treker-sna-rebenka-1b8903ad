// Утилиты: форматирование, возраст, границы суток, окно сна, согласование окончаний.

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// «1 ч 45 мин» / «45 мин» / «2 ч»
export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes) || minutes < 0) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

// «1:45» — компактный формат для графиков
export function formatHM(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function formatTime(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(d, withYear = false) {
  const date = (d instanceof Date) ? d : new Date(d);
  let s = `${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
  if (withYear) s += ` ${date.getFullYear()}`;
  return s;
}

export function formatDateShort(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatWeekday(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  return WEEKDAYS[date.getDay()];
}

export function startOfDay(d) {
  const date = (d instanceof Date) ? new Date(d) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Возраст в полных месяцах, округление вниз.
export function ageInMonths(birthDate, refDate = new Date()) {
  const birth = (birthDate instanceof Date) ? birthDate : new Date(birthDate);
  const ref = (refDate instanceof Date) ? refDate : new Date(refDate);
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  if (ref.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

// Скорректированный возраст (ПКВ) для недоношенных.
// Ребёнок «родился на N недель раньше» — прибавляем эту разницу к возрасту.
export function correctedAgeInMonths(birthDate, dueDate, refDate = new Date()) {
  if (!dueDate) return ageInMonths(birthDate, refDate);
  const birth = (birthDate instanceof Date) ? birthDate : new Date(birthDate);
  const due = (dueDate instanceof Date) ? dueDate : new Date(dueDate);
  const ref = (refDate instanceof Date) ? refDate : new Date(refDate);
  // Разница в неделях: на сколько раньше ПДР родился
  const diffDays = Math.max(0, (due - birth) / 86400000);
  const diffWeeks = diffDays / 7;
  // Хронологический возраст + «недоношенность» в месяцах (≈ нед/4.33)
  const chrono = ageInMonths(birth, ref);
  return Math.max(0, chrono + diffWeeks / 4.345);
}

export function isPremature(birthDate, dueDate) {
  if (!dueDate) return false;
  const birth = (birthDate instanceof Date) ? birthDate : new Date(birthDate);
  const due = (dueDate instanceof Date) ? dueDate : new Date(dueDate);
  return birth < due;
}

// Возвращает Date с тем же y/m/d, но другим временем
export function withTime(date, hh, mm) {
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function dateOnly(d) {
  const date = (d instanceof Date) ? new Date(d) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

// «Сутки сна» по правилу из ТЗ:
//  - ночной сон → sleepDayDate = дата утреннего пробуждения (конца сна)
//  - дневной сон → sleepDayDate = дата начала сна
// Если тип авто — выбираем по эвристике (вызывающий код передаёт уже вычисленный type).
export function computeSleepDayDate(startTime, endTime, type) {
  const ref = type === 'night' ? endTime : startTime;
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return dateOnly(d);
}

// Автоопределение типа сна: самый длинный сон, начавшийся между 18:00 и 00:00 — ночной.
// Возвращает 'night' | 'day'.
export function autoDetectSleepType(startTime, endTime, longestNightCandidate = null) {
  const s = new Date(startTime);
  const hour = s.getHours();
  if (hour >= 18 || hour < 6) {
    // Если передан явный кандидат — ночной только если он самый длинный
    if (longestNightCandidate) {
      return longestNightCandidate.id === _idOf(s, endTime) ? 'night' : 'day';
    }
    return 'night';
  }
  return 'day';
}

function _idOf(s, e) { return `${s.getTime()}_${e.getTime()}`; }

// Из date + time ('HH:MM') вернуть Date
export function combineDateTime(date, timeStr) {
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

// Согласование окончаний для «проснулся / проснулась», «устал / устала».
// gender: 'boy' | 'girl' | 'unknown'
export function g(opts = {}, gender = 'unknown') {
  const m = opts.m || '';
  const f = opts.f || opts.m || '';
  const n = opts.n || opts.m || '';
  if (gender === 'girl') return f;
  if (gender === 'boy') return m;
  return n; // нейтрально
}

// Длительность между двумя датами в минутах (всегда > 0)
export function minutesBetween(start, end) {
  return Math.max(0, (new Date(end) - new Date(start)) / 60000);
}

// Сравнить две даты по дню (без времени)
export function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function addMinutes(date, mins) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

export function uid() {
  return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}
