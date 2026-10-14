// Аналитика: возраст, границы суток, агрегаты дня/недели.

import { pickNormsRow, computeWakeWindow } from './norms.js';
import { ageInMonths, isPremature, minutesBetween, dateOnly } from './utils.js';

export function ageMonths(child, refDate = new Date()) {
  if (!child) return 0;
  const useCorrected = isPremature(child.birthDate, child.dueDate);
  const base = ageInMonths(child.birthDate, refDate);
  if (!useCorrected) return base;
  const extraWeeks = Math.max(0, (new Date(child.dueDate) - new Date(child.birthDate)) / (7 * 86400000));
  return Math.max(0, base + extraWeeks / 4.345);
}

// Ночной = самый длинный сон, начавшийся между 18:00 и 06:00.
export function detectNightSleep(records) {
  const candidates = records.filter(r => {
    const h = new Date(r.startTime).getHours();
    return h >= 18 || h < 6;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => minutesBetween(b.startTime, b.endTime) - minutesBetween(a.startTime, a.endTime));
  return candidates[0];
}

// Дата суток: для ночного — дата утреннего пробуждения, для дневного — дата начала.
export function sleepDayDate(record, nightRecord) {
  if (record.type === 'night' || (nightRecord && nightRecord.id === record.id)) {
    return dateOnly(record.endTime);
  }
  return dateOnly(record.startTime);
}

function countWakes(records) {
  return records.reduce((s, r) => s + (r.wakings?.length || 0), 0);
}

function compare(actual, [lo, hi]) {
  if (actual < lo - 0.5) return 'low';
  if (actual > hi + 0.5) return 'high';
  return 'ok';
}

// Агрегаты за одни сутки.
export function dayAggregates(records, child, sleepDay, nightRecord) {
  const recs = records.filter(r => sleepDayDate(r, nightRecord) === sleepDay);
  const night = recs.find(r => r.type === 'night' || (nightRecord && r.id === nightRecord.id));
  const naps = recs.filter(r => r !== night);
  const totalNap = naps.reduce((s, r) => s + minutesBetween(r.startTime, r.endTime), 0);
  const nightMin = night ? minutesBetween(night.startTime, night.endTime) : 0;
  const total = totalNap + nightMin;
  const wakingsCount = countWakes(recs);
  // Отрезки ВБ между записями
  const sorted = recs.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const wakeIntervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const dur = (new Date(sorted[i + 1].startTime) - new Date(sorted[i].endTime)) / 60000;
    if (dur > 0 && dur < 24 * 60) wakeIntervals.push(dur);
  }
  const sumWB = wakeIntervals.reduce((a, b) => a + b, 0);
  const avgWB = wakeIntervals.length ? sumWB / wakeIntervals.length : 0;
  const maxWB = wakeIntervals.length ? Math.max(...wakeIntervals) : 0;
  const refDate = new Date(sleepDay + 'T12:00:00');
  const ageM = Math.floor(ageMonths(child, refDate));
  const row = pickNormsRow(ageM);
  const flags = {
    totalSleep: compare(total / 60, row.totalSleep),
    totalNap:   compare(totalNap / 60, row.napsTotal),
    nightSleep: compare(nightMin / 60, row.nightSleep),
    napsCount:  compare(naps.length, row.napsCount),
  };
  return {
    sleepDay, records: recs, night, naps,
    total, totalNap, nightMin, wakingsCount,
    wakeIntervals, sumWB, avgWB, maxWB,
    row, flags, isComplete: !!night,
  };
}

// Сводка за неделю: 7 суток до указанной даты (включительно).
export function weekAggregates(records, child, endSleepDay) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endSleepDay + 'T12:00:00');
    d.setDate(d.getDate() - i);
    const sd = dateOnly(d);
    const night = detectNightSleep(records);
    days.push(dayAggregates(records, child, sd, night));
  }
  const complete = days.filter(d => d.isComplete && d.total > 0);
  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
  const avgTotal = complete.length ? sum(complete, d => d.total / 60) / complete.length : 0;
  const avgNap = complete.length ? sum(complete, d => d.totalNap / 60) / complete.length : 0;
  const avgNight = complete.length ? sum(complete, d => d.nightMin / 60) / complete.length : 0;
  const avgWB = complete.length ? sum(complete, d => d.avgWB) / complete.length : 0;
  const avgNaps = complete.length ? sum(complete, d => d.naps.length) / complete.length : 0;
  return { days, complete, avgTotal, avgNap, avgNight, avgWB, avgNaps,
    completeRatio: complete.length / 7 };
}

// Анализ текущего ВБ относительно нормы.
export function analyzeCurrentWB(elapsedMin, ageM, position = {}) {
  const win = computeWakeWindow(ageM, position);
  let status = 'good';
  let msg = 'В окне укладывания';
  if (elapsedMin < win.min - 15) { status = 'early'; msg = 'Рано, недогул'; }
  else if (elapsedMin > win.max + 15) { status = 'late'; msg = 'Поздно, перегул'; }
  return { ...win, status, msg, elapsedMin };
}

export const DISCLAIMER = 'Это ориентировочные средние нормы, а не медицинская рекомендация. Все дети разные. При тревожных симптомах обратитесь к педиатру.';
