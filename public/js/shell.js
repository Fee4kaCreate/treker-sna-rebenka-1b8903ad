// Шапка приложения и таббар. Рендер + обработчики переключения ребёнка и табов.

import { icon } from './icons.js';
import { state, currentChild, setCurrentChild, go } from './state.js';
import { childAgeLabel } from './state.js';
import { formatDate } from './utils.js';

const TABBAR = [
  { id: 'tracker',         label: 'Трекер',     icon: 'moon' },
  { id: 'dashboard',       label: 'Дашборд',    icon: 'dashboard' },
  { id: 'history',         label: 'История',    icon: 'bars' },
  { id: 'stats',           label: 'Статистика', icon: 'chart' },
  { id: 'recommendations', label: 'Подсказки',  icon: 'sparkles' },
];

export function renderHeader(root) {
  const child = currentChild();
  const isOnboarding = !child;
  const info = child
    ? `${formatDate(child.birthDate, true)} · ${childAgeLabel(child)}`
    : 'Нет профиля';
  const childSwitch = state.children.length > 0 ? `
    <div class="child-switch" id="childSwitch">
      ${state.children.map(c => `
        <button data-id="${c.id}" class="${c.id === state.currentChildId ? 'active' : ''}">
          <span class="dot ${c.gender === 'boy' ? 'boy' : c.gender === 'girl' ? 'girl' : 'unkn'}"></span>${c.name}
        </button>
      `).join('')}
      <button data-action="add-child" aria-label="Добавить ребёнка">+</button>
    </div>` : '';
  const headTitle = isOnboarding
    ? 'Трекер сна'
    : `${child.name}${isPrematureBadge(child) ? ' <span class="badge accent">ПКВ</span>' : ''}`;
  root.insertAdjacentHTML('afterbegin', `
    <header class="app-header">
      <button class="icon-btn" data-action="settings" aria-label="Настройки">${icon('cog', 22)}</button>
      <div style="min-width:0; flex:1;">
        <h1>${headTitle}</h1>
        <div class="sub">${info}</div>
      </div>
      ${child ? `<button class="icon-btn" data-action="add-sleep" aria-label="Добавить сон">${icon('plus', 22)}</button>` : ''}
    </header>
    ${childSwitch}
  `);
  const sw = root.querySelector('#childSwitch');
  if (sw) {
    sw.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.id) {
        await setCurrentChild(btn.dataset.id);
        window.dispatchEvent(new CustomEvent('app:rerender'));
      } else if (btn.dataset.action === 'add-child') {
        window.dispatchEvent(new CustomEvent('app:add-child'));
      }
    });
  }
  root.querySelector('[data-action="settings"]').addEventListener('click', () => go('settings'));
  const addBtn = root.querySelector('[data-action="add-sleep"]');
  if (addBtn) addBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app:add-sleep')));
}

function isPrematureBadge(child) {
  if (!child?.birthDate || !child?.dueDate) return false;
  return new Date(child.birthDate) < new Date(child.dueDate);
}

export function renderTabbar(root) {
  root.insertAdjacentHTML('beforeend', `
    <nav class="tabbar">
      ${TABBAR.map(t => `<button data-go="${t.id}" class="${t.id === state.route ? 'active' : ''}">
        ${icon(t.icon, 22)}<span>${t.label}</span>
      </button>`).join('')}
    </nav>
  `);
  root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
}
