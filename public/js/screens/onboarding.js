// Онбординг: приветствие + форма добавления ребёнка. Поддерживает нескольких детей.

import { saveChild, listChildren } from '../db.js';
import { setCurrentChild, go, currentChild } from '../state.js';
import { icon } from '../icons.js';
import { ageInMonths, isPremature } from '../utils.js';
import { toast } from '../ui.js';

export async function mountOnboarding(root, { state, onDone }) {
  const isAdding = state.children.length > 0;
  root.innerHTML = `
    <div class="onboarding">
      <div class="center" style="margin-bottom: 24px;">
        <div style="font-size: 48px; line-height: 1;">${isAdding ? '➕' : '🌙'}</div>
        <h1 class="h1">${isAdding ? 'Добавить ребёнка' : 'Добро пожаловать'}</h1>
        <p class="muted">${isAdding ? 'Заполните данные — можно в любой момент вернуться и добавить ещё одного.' : 'Трекер сна для малышей от 0 до 3 лет. Работает офлайн, всё хранится на устройстве.'}</p>
      </div>
      <form id="obForm" class="card elev">
        <div class="field">
          <label>Имя ребёнка</label>
          <input name="name" required placeholder="Например, Маша" autocomplete="off">
        </div>
        <div class="field">
          <label>Пол</label>
          <div class="radio-group" data-gender>
            <button type="button" class="chip" data-g="girl">девочка</button>
            <button type="button" class="chip" data-g="boy">мальчик</button>
            <button type="button" class="chip active" data-g="unknown">не указан</button>
          </div>
          <div class="hint">Влияет только на цветовой акцент и согласование в текстах.</div>
        </div>
        <div class="field">
          <label>Дата рождения</label>
          <input type="date" name="birthDate" required>
        </div>
        <div class="field">
          <label>Предполагаемая дата родов <span class="faint">(необязательно)</span></label>
          <input type="date" name="dueDate">
          <div class="hint">Если малыш родился раньше срока — укажите ПДР, и нормы будут считаться по скорректированному возрасту (ПКВ).</div>
        </div>
        <div class="row" style="gap: 8px; margin-top: 18px;">
          ${isAdding ? `<button type="button" class="btn ghost" data-action="back">Назад</button>` : ''}
          <button type="submit" class="btn primary block">${isAdding ? 'Добавить' : 'Создать профиль'}</button>
        </div>
      </form>
      <p class="tiny muted center" style="margin-top: 18px;">
        Данные хранятся локально в браузере. Можно в любой момент выгрузить JSON-бэкап.
      </p>
    </div>
  `;
  let gender = 'unknown';
  root.querySelectorAll('[data-gender] .chip').forEach(c => {
    c.addEventListener('click', () => {
      root.querySelectorAll('[data-gender] .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      gender = c.dataset.g;
    });
  });
  const form = root.querySelector('#obForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const birthDate = (fd.get('birthDate') || '').toString();
    const dueDate = (fd.get('dueDate') || '').toString() || null;
    if (!name) { toast('Введите имя'); return; }
    if (!birthDate) { toast('Укажите дату рождения'); return; }
    const child = await saveChild({ name, gender, birthDate, dueDate });
    await setCurrentChild(child.id);
    state.children = await listChildren();
    toast(`Готово, ${name} добавлен(а)`);
    onDone();
  });
  const back = root.querySelector('[data-action="back"]');
  if (back) back.addEventListener('click', () => onDone());
}
