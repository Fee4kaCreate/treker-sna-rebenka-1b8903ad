// Точка входа. Открывает IndexedDB, выбирает ребёнка, разруливает экраны.

import { state, setupTheme, pickInitialChild, currentChild, go } from './state.js';
import { renderHeader, renderTabbar } from './shell.js';
import { mountOnboarding } from './screens/onboarding.js';
import { mountTracker } from './screens/tracker.js';
import { mountHistory } from './screens/history.js';
import { mountStats } from './screens/stats.js';
import { mountDashboard } from './screens/dashboard.js';
import { mountSettings } from './screens/settings.js';
import { mountRecommendations } from './screens/recommendations.js';

const ROUTES = {
  tracker:         mountTracker,
  dashboard:       mountDashboard,
  history:         mountHistory,
  stats:           mountStats,
  recommendations: mountRecommendations,
  settings:        mountSettings,
};

async function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  renderHeader(app);
  const screen = document.createElement('div');
  screen.className = 'screen no-pad-bot';
  app.appendChild(screen);
  renderTabbar(app);
  const child = currentChild();
  if (!child) {
    await mountOnboarding(screen, { state, onDone: render });
    return;
  }
  const fn = ROUTES[state.route] || ROUTES.tracker;
  await fn(screen, { child, state, go, rerender: render });
}

// Тосты
window.addEventListener('app:toast', (e) => {
  const t = document.getElementById('toast');
  t.textContent = e.detail;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
});

window.addEventListener('app:rerender', () => render());

// Старт
setupTheme();
pickInitialChild().then(render);
