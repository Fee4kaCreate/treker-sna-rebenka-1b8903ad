// Общие UI-примитивы: модалка, тост, выбор времени.

import { icon } from './icons.js';

export function toast(msg, ms = 2200) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: msg }));
}

// Простая модалка с одним содержимым. Возвращает close().
export function openModal({ title, body, onClose, actions = [] }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-bg" data-modal-bg>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || '')}">
        <div class="handle"></div>
        <h2>${escapeHtml(title || '')}</h2>
        <div data-modal-body></div>
        ${actions.length ? `<div class="row" style="justify-content:flex-end; gap:8px; margin-top:14px;">
          ${actions.map(a => `<button class="btn ${a.kind || ''}" data-action="${a.id}">${escapeHtml(a.label)}</button>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  const bodyEl = root.querySelector('[data-modal-body]');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  const close = () => {
    root.innerHTML = '';
    if (onClose) onClose();
  };
  root.querySelector('[data-modal-bg]').addEventListener('click', (e) => {
    if (e.target.dataset.modalBg !== undefined) close();
  });
  root.querySelectorAll('[data-action]').forEach(b => {
    b.addEventListener('click', () => {
      const a = actions.find(x => x.id === b.dataset.action);
      if (a?.onClick) a.onClick(close);
    });
  });
  return close;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function pickTime(initial = '13:00') {
  return new Promise((resolve) => {
    const [h0, m0] = initial.split(':').map(Number);
    let hh = h0, mm = m0;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="row" style="gap:8px; align-items:flex-end;">
        <div class="field" style="flex:1; margin:0;">
          <label>Часы</label>
          <input type="number" min="0" max="23" value="${hh}" data-hh>
        </div>
        <div class="field" style="flex:1; margin:0;">
          <label>Минуты</label>
          <input type="number" min="0" max="59" value="${mm}" data-mm>
        </div>
      </div>`;
    const close = openModal({
      title: 'Время',
      body,
      actions: [
        { id: 'cancel', label: 'Отмена', onClick: (c) => { c(); resolve(null); } },
        { id: 'ok', label: 'Готово', kind: 'primary', onClick: (c) => {
          const h = parseInt(body.querySelector('[data-hh]').value, 10);
          const m = parseInt(body.querySelector('[data-mm]').value, 10);
          if (isNaN(h) || isNaN(m)) { c(); resolve(null); return; }
          c(); resolve(`${String(Math.max(0, Math.min(23, h))).padStart(2, '0')}:${String(Math.max(0, Math.min(59, m))).padStart(2, '0')}`);
        } },
      ],
    });
    body.querySelector('[data-hh]').addEventListener('change', e => hh = e.target.value);
    body.querySelector('[data-mm]').addEventListener('change', e => mm = e.target.value);
  });
}

export function pickDate(initial = new Date()) {
  return new Promise((resolve) => {
    const init = new Date(initial);
    const iso = init.toISOString().slice(0, 10);
    const body = document.createElement('div');
    body.innerHTML = `<div class="field"><label>Дата</label><input type="date" value="${iso}" data-date></div>`;
    const close = openModal({
      title: 'Дата',
      body,
      actions: [
        { id: 'cancel', label: 'Отмена', onClick: (c) => { c(); resolve(null); } },
        { id: 'ok', label: 'Готово', kind: 'primary', onClick: (c) => {
          c(); resolve(body.querySelector('[data-date]').value);
        } },
      ],
    });
  });
}

export function confirmDialog(message, { title = 'Точно?', okLabel = 'Да', cancelLabel = 'Отмена' } = {}) {
  return new Promise((resolve) => {
    const close = openModal({
      title,
      body: `<p style="margin: 6px 0 0;">${escapeHtml(message)}</p>`,
      actions: [
        { id: 'cancel', label: cancelLabel, onClick: (c) => { c(); resolve(false); } },
        { id: 'ok', label: okLabel, kind: 'primary', onClick: (c) => { c(); resolve(true); } },
      ],
    });
  });
}
