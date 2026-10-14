// Слой данных на IndexedDB. Структура под будущий Supabase: id, childId, createdAt, updatedAt.
// Stores: children, sleepRecords, dayNotes, settings, actionsLog.

import { uid } from './utils.js';

const DB_NAME = 'sleep-tracker';
const DB_VERSION = 1;
let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('children')) db.createObjectStore('children', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sleepRecords')) {
        const s = db.createObjectStore('sleepRecords', { keyPath: 'id' });
        s.createIndex('byChild', 'childId');
        s.createIndex('byDay', 'sleepDayDate');
        s.createIndex('byChildDay', ['childId', 'sleepDayDate']);
      }
      if (!db.objectStoreNames.contains('dayNotes')) db.createObjectStore('dayNotes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('actionsLog')) db.createObjectStore('actionsLog', { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}
const p = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const nowISO = () => new Date().toISOString();

// ===== Children =====
export const listChildren = async () => {
  const s = await store('children');
  return (await p(s.getAll())).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};
export const getChild = async (id) => { const s = await store('children'); return p(s.get(id)); };
export async function saveChild(data) {
  const s = await store('children', 'readwrite');
  const t = nowISO();
  const rec = { id: data.id || uid(), name: data.name || '', gender: data.gender || 'unknown',
    birthDate: data.birthDate || null, dueDate: data.dueDate || null, color: data.color || 'rose',
    createdAt: data.createdAt || t, updatedAt: t };
  await p(s.put(rec));
  return rec;
}
export async function deleteChild(id) {
  const s = await store('children', 'readwrite');
  await p(s.delete(id));
  for (const st of ['sleepRecords', 'dayNotes']) {
    const x = await store(st, 'readwrite');
    const idx = x.index('byChild');
    const keys = await p(idx.getAllKeys(id));
    for (const k of keys) await p(x.delete(k));
  }
}

// ===== Sleep Records =====
export async function listSleep(childId, since) {
  const s = await store('sleepRecords');
  const idx = s.index('byChild');
  const all = await p(idx.getAll(childId));
  return all.filter(r => !since || r.startTime >= since).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export async function getSleepForDay(childId, sleepDayDate) {
  const s = await store('sleepRecords');
  const idx = s.index('byChildDay');
  return (await p(idx.getAll([childId, sleepDayDate]))).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export const getSleepById = async (id) => { const s = await store('sleepRecords'); return p(s.get(id)); };
export async function saveSleep(data) {
  const s = await store('sleepRecords', 'readwrite');
  const t = nowISO();
  const rec = { id: data.id || uid(), childId: data.childId,
    startTime: data.startTime, endTime: data.endTime, sleepDayDate: data.sleepDayDate,
    type: data.type || 'day', place: data.place || null, calm: data.calm || null,
    wakings: Array.isArray(data.wakings) ? data.wakings : [],
    signs: Array.isArray(data.signs) ? data.signs : [],
    comment: data.comment || '',
    createdAt: data.createdAt || t, updatedAt: t };
  await p(s.put(rec));
  return rec;
}
export async function deleteSleep(id) {
  const s = await store('sleepRecords', 'readwrite');
  const rec = await p(s.get(id));
  if (rec) await p(s.delete(id));
  return rec;
}

// ===== Day Notes =====
export async function getDayNote(childId, sleepDayDate) {
  const s = await store('dayNotes');
  const all = await p(s.getAll());
  return all.find(n => n.childId === childId && n.sleepDayDate === sleepDayDate) || null;
}
export async function saveDayNote(childId, sleepDayDate, note) {
  const s = await store('dayNotes', 'readwrite');
  const t = nowISO();
  const existing = await getDayNote(childId, sleepDayDate);
  if (existing) {
    existing.note = note; existing.updatedAt = t;
    await p(s.put(existing)); return existing;
  }
  const rec = { id: uid(), childId, sleepDayDate, note, createdAt: t, updatedAt: t };
  await p(s.put(rec)); return rec;
}
export const deleteDayNote = async (id) => { const s = await store('dayNotes', 'readwrite'); await p(s.delete(id)); };

// ===== Settings =====
export const getSetting = async (key, fb = null) => { const s = await store('settings'); const r = await p(s.get(key)); return r ? r.value : fb; };
export const setSetting = async (key, value) => { const s = await store('settings', 'readwrite'); await p(s.put({ key, value })); };

// ===== Actions Log (для «Отменить») =====
export async function logAction(action) {
  const s = await store('actionsLog', 'readwrite');
  const rec = { id: uid(), ts: Date.now(), ...action };
  await p(s.put(rec));
  return rec;
}
export async function popLastAction() {
  const s = await store('actionsLog', 'readwrite');
  const all = await p(s.getAll());
  if (!all.length) return null;
  const last = all.sort((a, b) => b.ts - a.ts)[0];
  await p(s.delete(last.id));
  return last;
}
