// История: лента записей по суткам с поиском.
import { listSleep } from '../db.js';
import { detectNightSleep, sleepDayDate, dayAggregates } from '../analytics-agg.js';
import { formatDuration, formatTime, formatDate, dateOnly, minutesBetween, escapeHtml } from '../utils.js';
import { icon } from '../icons.js';

export async function mountHistory(root, { child }) {
  const all = await listSleep(child.id);
  root.innerHTML = `
    <div class="h2">История</div>
    <div class="search">${icon('search', 18)}<input id="searchInput" placeholder="Поиск по комментариям и тегам…"></div>
    <div id="histList"></div>
  `;
  const input = root.querySelector('#searchInput');
  const list = root.querySelector('#histList');
  function paint() {
    const q = input.value.trim().toLowerCase();
    const items = all
      .filter(r => !q || (r.comment || '').toLowerCase().includes(q) || (r.signs || []).join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
    if (!items.length) {
      list.innerHTML = `<div class="empty">${icon('moon', 40)}<div>Записей пока нет. Нажмите «Добавить сон» на трекере.</div></div>`;
      return;
    }
    // Группировка по суткам (sleepDayDate)
    const night = detectNightSleep(all);
    const groups = new Map();
    for (const r of items) {
      const day = sleepDayDate(r, night);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(r);
    }
    const days = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
    list.innerHTML = days.map(d => {
      const recs = groups.get(d).sort((a, b) => a.startTime.localeCompare(b.startTime));
      const agg = dayAggregates(all, child, d, night);
      const head = `<div class="day-link active">
        <div class="row"><div class="date">${formatDate(d + 'T12:00:00')}</div>
        <div class="metrics">${formatDuration(agg.total)} · ${recs.length} записей${agg.wakingsCount ? ' · ' + agg.wakingsCount + '× просып.' : ''}</div></div>
        <div class="metrics">ДС ${formatDuration(agg.totalNap)} · НС ${formatDuration(agg.nightMin)}</div>
      </div>`;
      const rows = recs.map(r => `<div class="history-row">
        <div class="time">${formatTime(r.startTime)} – ${r.endTime ? formatTime(r.endTime) : '…'}</div>
        <div class="dur">${r.endTime ? formatDuration(minutesBetween(r.startTime, r.endTime)) : '…'}</div>
        <div class="comment">${r.comment ? escapeHtml(r.comment) : ''}</div>
      </div>`).join('');
      return `<div class="history-day card">${head}<div>${rows}</div></div>`;
    }).join('');
  }
  input.addEventListener('input', paint);
  paint();
}
