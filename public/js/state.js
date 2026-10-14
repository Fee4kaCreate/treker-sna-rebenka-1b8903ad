// Глобальное состояние приложения и выбор текущего ребёнка.

import { listChildren, getSetting, setSetting, openDB } from './db.js';
import { ageInMonths, isPremature } from './utils.js';

export const state = {
  children: [],
  currentChildId: null,
  route: 'tracker',
};

export async function pickInitialChild() {
  await openDB();
  const children = await listChildren();
  state.children = children;
  let currentId = await getSetting('currentChildId', null);
  if (!currentId || !children.find(c => c.id === currentId)) {
    currentId = children[0]?.id || null;
    if (currentId) await setSetting('currentChildId', currentId);
  }
  state.currentChildId = currentId;
  return state;
}

export function currentChild() {
  return state.children.find(c => c.id === state.currentChildId) || null;
}

export async function setCurrentChild(id) {
  state.currentChildId = id;
  await setSetting('currentChildId', id);
}

export function go(route) {
  state.route = route;
  window.dispatchEvent(new CustomEvent('app:rerender'));
}

export function autoTheme() {
  const h = new Date().getHours();
  const isNight = (h >= 21 || h < 7);
  document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day');
}

export function setupTheme() {
  autoTheme();
  setInterval(autoTheme, 60_000);
}

export function childAgeMonths(child, refDate = new Date()) {
  if (!child) return 0;
  return isPremature(child.birthDate, child.dueDate)
    ? Math.max(0, ageInMonths(child.birthDate, refDate) + Math.max(0, (new Date(child.dueDate) - new Date(child.birthDate)) / (7 * 86400000)) / 4.345)
    : ageInMonths(child.birthDate, refDate);
}

export function childAgeLabel(child) {
  if (!child) return '';
  const useCorrected = isPremature(child.birthDate, child.dueDate);
  const m = Math.floor(childAgeMonths(child));
  return `${m} мес${useCorrected ? ' (ПКВ)' : ''}`;
}
