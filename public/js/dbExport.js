// Экспорт/импорт всех данных и CSV.
import { listSleep } from './db.js';

async function allOf(name) {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('sleep-tracker', 1);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return new Promise((res, rej) => {
    const tx = db.transaction(name, 'readonly');
    const r = tx.objectStore(name).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function p(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }

export async function exportAll() {
  const [children, sleep, notes] = await Promise.all([allOf('children'), allOf('sleepRecords'), allOf('dayNotes')]);
  return { schema: 'sleep-tracker.v1', exportedAt: new Date().toISOString(), children, sleepRecords: sleep, dayNotes: notes };
}

export async function importAll(data, mode = 'merge') {
  if (!data || data.schema !== 'sleep-tracker.v1') throw new Error('Неизвестный формат файла');
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('sleep-tracker', 1);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  if (mode === 'replace') {
    for (const name of ['children', 'sleepRecords', 'dayNotes']) {
      await p(db.transaction(name, 'readwrite').objectStore(name).clear());
    }
  }
  for (const c of (data.children || [])) await p(db.transaction('children', 'readwrite').objectStore('children').put(c));
  for (const r of (data.sleepRecords || [])) await p(db.transaction('sleepRecords', 'readwrite').objectStore('sleepRecords').put(r));
  for (const n of (data.dayNotes || [])) await p(db.transaction('dayNotes', 'readwrite').objectStore('dayNotes').put(n));
  return { children: (data.children || []).length, sleepRecords: (data.sleepRecords || []).length, dayNotes: (data.dayNotes || []).length };
}

export async function exportCSV(childId) {
  const records = await listSleep(childId);
  const header = ['id', 'childId', 'startTime', 'endTime', 'sleepDayDate', 'type', 'place', 'calm', 'wakings', 'signs', 'comment'];
  const lines = [header.join(',')];
  for (const r of records) {
    const row = [r.id, r.childId, r.startTime, r.endTime, r.sleepDayDate, r.type, r.place || '', r.calm || '',
      (r.wakings || []).map(w => w.time).join('|'), (r.signs || []).join('|'),
      (r.comment || '').replace(/[\n,]/g, ' ')];
    lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

export function downloadFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

export async function readFileAsJSON(file) {
  const text = await file.text();
  return JSON.parse(text);
}
