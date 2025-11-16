// panel.js
// Depends on: state, MODE_LABELS

const { state } = require('./state');
const { MODE_LABELS } = require('./constants');

async function renderPanelState({ highlightRefresh = false } = {}) {
  if (!state.page) return;

  const snapshot = {
    totalEntries: state.stats.totalEntries,
    entriesWithAudio: state.stats.entriesWithAudio,
    lastRefresh: state.stats.lastRefresh
  };

  await state.page.evaluate(
    ({ running, mode, stats, message, highlightRefresh, modeLabel }) => {
      const panel = document.getElementById('ep-control-panel');
      if (!panel) return;

      const indicator = document.getElementById('panel-run-indicator');
      if (indicator) {
        indicator.textContent = running ? 'Running' : 'Idle';
        indicator.classList.toggle('running', !!running);
      }

      const stateEl = document.getElementById('panel-state-value');
      if (stateEl) stateEl.textContent = running ? 'Answering' : 'Idle';

      const modeEl = document.getElementById('panel-mode-value');
      if (modeEl) modeEl.textContent = modeLabel;

      const entriesEl = document.getElementById('panel-entries-value');
      if (entriesEl) entriesEl.textContent = stats.totalEntries;

      const audioEl = document.getElementById('panel-audio-value');
      if (audioEl) {
        const pct = stats.totalEntries
          ? Math.round((stats.entriesWithAudio / stats.totalEntries) * 100)
          : 0;
        audioEl.textContent = `${stats.entriesWithAudio} (${pct}% with audio)`;
      }

      const refreshEl = document.getElementById('panel-refresh-value');
      if (refreshEl) refreshEl.textContent = stats.lastRefresh;

      const messageEl = document.getElementById('panel-message');
      if (messageEl) messageEl.textContent = message;

      document.querySelectorAll('[data-mode-btn]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode-btn') === mode);
      });

      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.innerHTML = running
          ? '<span>⏹️</span><span>Stop</span>'
          : '<span>▶️</span><span>Start</span>';
      }

      if (highlightRefresh) {
        panel.classList.add('ep-panel-pulse');
        setTimeout(() => panel.classList.remove('ep-panel-pulse'), 800);
      }
    },
    {
      running: state.running,
      mode: state.mode,
      stats: snapshot,
      message: state.panelMessage,
      highlightRefresh,
      modeLabel: MODE_LABELS[state.mode] || state.mode
    }
  );
}

async function syncPanelState({ message, highlightRefresh = false } = {}) {
  if (typeof message === 'string') {
    state.panelMessage = message;
  }
  await renderPanelState({ highlightRefresh }).catch(() => {});
}

async function initPanel() {
  if (!state.page) return;

  await state.page.evaluate(() => {
    if (document.querySelector('#ep-control-panel')) return;

    if (!document.getElementById('ep-panel-style')) {
      const style = document.createElement('style');
      style.id = 'ep-panel-style';
      style.textContent = `
                    #ep-control-panel {
                        position: fixed;
                        top: 16px;
                        right: 24px;
                        width: 320px;
                        padding: 18px;
                        background: #ffffff;
                        border-radius: 18px;
                        border: 1px solid rgba(15, 23, 42, 0.08);
                        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        font-size: 13px;
                        color: #0f172a;
                        z-index: 9999;
                    }
                    #ep-control-panel button {
                        font-family: inherit;
                    }
                    #ep-control-panel.ep-draggable .ep-panel-header {
                        cursor: move;
                    }
                    #ep-control-panel .ep-panel-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 8px;
                        margin-bottom: 14px;
                    }
                    #ep-control-panel .ep-panel-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #0f172a;
                    }
                    #ep-control-panel .ep-panel-version {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #64748b;
                        margin-bottom: 2px;
                    }
                    #ep-control-panel .ep-run-indicator {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        padding: 4px 12px;
                        border-radius: 999px;
                        background: #cbd5f5;
                        color: #1e1b4b;
                    }
                    #ep-control-panel .ep-run-indicator.running {
                        background: #16a249;
                        color: #ffffff;
                    }
                    #ep-control-panel .ep-panel-hide {
                        border: none;
                        background: transparent;
                        color: #94a3b8;
                        cursor: pointer;
                        font-size: 16px;
                        padding: 2px 4px;
                    }
                    #ep-control-panel .ep-panel-hide:hover {
                        color: #475569;
                    }
                    #ep-control-panel .ep-panel-collapse {
                        border: none;
                        background: transparent;
                        color: #94a3b8;
                        cursor: pointer;
                        font-size: 16px;
                        padding: 2px 4px;
                    }
                    #ep-control-panel .ep-panel-collapse:hover { color: #475569; }
                    #ep-control-panel .ep-panel-actions,
                    #ep-control-panel .ep-panel-modes {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 12px;
                    }
                    #ep-control-panel .ep-panel-actions button,
                    #ep-control-panel .ep-panel-modes button {
                        flex: 1;
                    }
                    #ep-control-panel .ep-panel-btn {
                        border-radius: 12px;
                        border: 1px solid #d2d6dc;
                        background: #f8fafc;
                        padding: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    #ep-control-panel .ep-panel-btn:hover {
                        background: #eef2ff;
                        border-color: #94a3b8;
                    }
                    #ep-control-panel .ep-panel-btn.active {
                        background: #d9fdd3;
                        border-color: #16a249;
                        color: #065f46;
                        box-shadow: inset 0 0 0 1px rgba(6, 95, 70, 0.28);
                    }
                    #ep-control-panel .ep-panel-stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 10px;
                        margin-bottom: 12px;
                    }
                    #ep-control-panel .ep-stat {
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 10px;
                    }
                    #ep-control-panel .ep-stat-label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #94a3b8;
                        margin-bottom: 4px;
                    }
                    #ep-control-panel .ep-stat-value {
                        font-size: 13px;
                        font-weight: 600;
                        color: #0f172a;
                    }
                    #ep-control-panel .ep-panel-message {
                        background: #eef2ff;
                        border-radius: 12px;
                        padding: 10px;
                        font-size: 12px;
                        color: #1e1b4b;
                        min-height: 38px;
                        margin-bottom: 10px;
                    }
                    #ep-control-panel .ep-panel-shortcuts {
                        font-size: 11px;
                        color: #475569;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        justify-content: space-between;
                    }
                    #ep-control-panel.ep-panel-pulse {
                        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35), 0 24px 60px rgba(15, 23, 42, 0.28);
                    }
                    /* Collapsed state */
                    #ep-control-panel.ep-collapsed {
                        width: auto;
                        padding: 8px 10px;
                        border-radius: 999px;
                    }
                    #ep-control-panel.ep-collapsed .ep-panel-header { margin: 0; }
                    #ep-control-panel.ep-collapsed .ep-panel-title { display:none; }
                    #ep-control-panel.ep-collapsed .ep-panel-version { display:none; }
                    #ep-control-panel.ep-collapsed .ep-run-indicator { padding: 2px 10px; }
                    #ep-control-panel.ep-collapsed .ep-panel-actions,
                    #ep-control-panel.ep-collapsed .ep-panel-modes,
                    #ep-control-panel.ep-collapsed .ep-panel-stats,
                    #ep-control-panel.ep-collapsed .ep-panel-message,
                    #ep-control-panel.ep-collapsed .ep-panel-shortcuts { display:none; }
                `;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'ep-control-panel';
    panel.innerHTML = `
                <div class="ep-panel-header">
                    <div>
                        <div class="ep-panel-version">SimplyPerfected v1.0.1</div>
                        <div class="ep-panel-title">Control Panel</div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <div id="panel-run-indicator" class="ep-run-indicator">Idle</div>
                        <button id="collapse-panel" class="ep-panel-collapse" title="Collapse/expand">▾</button>
                        <button id="hide-panel" class="ep-panel-hide" title="Hide panel">✕</button>
                    </div>
                </div>
                <div class="ep-panel-actions">
                    <button id="refresh-btn" class="ep-panel-btn" title="Refresh all (Alt+R)">
                        <span>🔄</span><span>Refresh</span>
                    </button>
                    <button id="start-btn" class="ep-panel-btn" title="Start/stop (Alt+S)">
                        <span>▶️</span><span>Start</span>
                    </button>
                </div>
                <div class="ep-panel-modes">
                    <button id="mode-Auto" data-mode-btn="auto" class="ep-panel-btn" title="Instant (Alt+1)">
                        <span>⚡</span><span>Instant</span>
                    </button>
                    <button id="mode-Semi" data-mode-btn="semi" class="ep-panel-btn" title="Semi-auto (Alt+2)">
                        <span>⏸️</span><span>Semi</span>
                    </button>
                    <button id="mode-Delay" data-mode-btn="delay" class="ep-panel-btn" title="Delayed (Alt+3)">
                        <span>⏱️</span><span>Delay</span>
                    </button>
                </div>
                <div class="ep-panel-stats">
                    <div class="ep-stat">
                        <div class="ep-stat-label">Mode</div>
                        <div id="panel-mode-value" class="ep-stat-value">—</div>
                    </div>
                    <div class="ep-stat">
                        <div class="ep-stat-label">State</div>
                        <div id="panel-state-value" class="ep-stat-value">Idle</div>
                    </div>
                    <div class="ep-stat">
                        <div class="ep-stat-label">Entries</div>
                        <div id="panel-entries-value" class="ep-stat-value">0</div>
                    </div>
                    <div class="ep-stat">
                        <div class="ep-stat-label">Audio Map</div>
                        <div id="panel-audio-value" class="ep-stat-value">0 (0% with audio)</div>
                    </div>
                    <div class="ep-stat">
                        <div class="ep-stat-label">Last Refresh</div>
                        <div id="panel-refresh-value" class="ep-stat-value">—</div>
                    </div>
                </div>
                <div id="panel-message" class="ep-panel-message">Select a mode and refresh to build your word list.</div>
                <div class="ep-panel-shortcuts">
                    <span>Alt+R Refresh</span>
                    <span>Alt+S Start</span>
                    <span>Alt+1 Instant</span>
                    <span>Alt+2 Semi</span>
                    <span>Alt+3 Delay</span>
                </div>
            `;

    document.body.appendChild(panel);

    // Draggable behavior and persistence
    panel.classList.add('ep-draggable');
    const header = panel.querySelector('.ep-panel-header');
    let dragData = null;
    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function savePos(left, top) {
      try { localStorage.setItem('epPanelPos', JSON.stringify({ left, top })); } catch {}
    }
    function restorePos() {
      try {
        const saved = JSON.parse(localStorage.getItem('epPanelPos') || 'null');
        if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
          panel.style.left = saved.left + 'px';
          panel.style.top = saved.top + 'px';
          panel.style.right = 'auto';
        }
      } catch {}
    }
    header.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      dragData = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once: true });
      e.preventDefault();
    });
    function onMove(e) {
      if (!dragData) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = clamp(e.clientX - dragData.offsetX, 6, vw - panel.offsetWidth - 6);
      const top = clamp(e.clientY - dragData.offsetY, 6, vh - panel.offsetHeight - 6);
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      if (!dragData) return;
      const rect = panel.getBoundingClientRect();
      savePos(rect.left, rect.top);
      dragData = null;
    }
    restorePos();

    document.getElementById('refresh-btn').onclick = window.refresh;
    document.getElementById('start-btn').onclick = window.startAnswer;
    document.getElementById('mode-Auto').onclick = window.setAuto;
    document.getElementById('mode-Semi').onclick = window.setSemi;
    document.getElementById('mode-Delay').onclick = window.setDelay;

    // Collapsible behavior with persistence
    const collapseBtn = document.getElementById('collapse-panel');
    function setCollapsed(collapsed) {
      panel.classList.toggle('ep-collapsed', !!collapsed);
      try { localStorage.setItem('epPanelCollapsed', collapsed ? '1' : '0'); } catch {}
      collapseBtn.textContent = collapsed ? '▸' : '▾';
      collapseBtn.title = collapsed ? 'Expand panel' : 'Collapse panel';
    }
    collapseBtn.onclick = () => setCollapsed(!panel.classList.contains('ep-collapsed'));
    try {
      const savedCollapsed = localStorage.getItem('epPanelCollapsed') === '1';
      if (savedCollapsed) setCollapsed(true);
    } catch {}

    document.getElementById('hide-panel').onclick = () => {
      panel.style.display = 'none';
      try { localStorage.setItem('epPanelHidden', '1'); } catch {}
      const showBtn = document.createElement('button');
      showBtn.textContent = '📋';
      showBtn.title = 'Show SimplyPerfected panel';
      Object.assign(showBtn.style, {
        position: 'fixed',
        top: '16px',
        right: '24px',
        zIndex: 9999,
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid #d2d6dc',
        background: '#ffffff',
        cursor: 'pointer',
        boxShadow: '0 16px 30px rgba(15, 23, 42, 0.18)'
      });
      showBtn.onclick = () => {
        panel.style.display = 'block';
        try { localStorage.setItem('epPanelHidden', '0'); } catch {}
        showBtn.remove();
      };
      document.body.appendChild(showBtn);
    };

    // Restore hidden state with a show button if needed
    try {
      if (localStorage.getItem('epPanelHidden') === '1') {
        panel.style.display = 'none';
        const showBtn = document.createElement('button');
        showBtn.textContent = '📋';
        showBtn.title = 'Show SimplyPerfected panel';
        Object.assign(showBtn.style, {
          position: 'fixed',
          top: '16px',
          right: '24px',
          zIndex: 9999,
          padding: '6px 12px',
          borderRadius: '999px',
          border: '1px solid #d2d6dc',
          background: '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 16px 30px rgba(15, 23, 42, 0.18)'
        });
        showBtn.onclick = () => {
          panel.style.display = 'block';
          try { localStorage.setItem('epPanelHidden', '0'); } catch {}
          showBtn.remove();
        };
        document.body.appendChild(showBtn);
      }
    } catch {}

    document.addEventListener('keydown', e => {
      if (!e.altKey) return;
      if (e.key.toLowerCase() === 'r') window.refresh();
      if (e.key.toLowerCase() === 's') window.startAnswer();
      if (e.key === '1') window.setAuto();
      if (e.key === '2') window.setSemi();
      if (e.key === '3') window.setDelay();
    });
  }, state.mode);

  await syncPanelState();
}

module.exports = { initPanel, renderPanelState, syncPanelState };
