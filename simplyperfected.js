// main.js
const puppeteer = require('puppeteer');

// =======================
// Constants & Utilities
// =======================
const DIR = {
    loginUrl: 'https://app.educationperfect.com/app/login',
    selectors: {
        baseWords: 'div.baseLanguage.question-label.native-font.ng-binding',
        targetWords: 'div.targetLanguage.question-label.native-font.ng-binding',
        questionText: '#question-text.native-font',
        answerInput: 'input#answer-text',
        continueButton: 'button#continue-button',
        modal: 'div[uib-modal-window=modal-window]',
        modalFields: {
            question: 'td.field.native-font#question-field',
            correct: 'td.field.native-font#correct-answer-field'
        }
    }
};

const MODE_LABELS = {
    auto: 'Instant',
    semi: 'Semi-auto',
    delay: 'Delayed'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const cleanString = s =>
    String(s)
        .replace(/\([^)]*\)/g, '')
        .split(/[;]/)[0]
        .trim();

const randStr = (min, max) => {
    const len = Math.floor(Math.random() * (max - min + 1)) + min;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len })
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join('');
};

// =======================
// Global State
// =======================
const state = {
    dict: {},
    reverseDict: {},
    audioMap: {},
    running: false,
    mode: 'delay',
    questionMode: '',
    stats: {
        totalEntries: 0,
        entriesWithAudio: 0,
        lastRefresh: '—'
    },
    panelMessage: 'Refresh the word list to begin.',
    page: null
};

// =======================
// Panel (UI) Management
// =======================
const Panel = {
    async render({ highlightRefresh = false } = {}) {
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
    },

    async sync({ message, highlightRefresh = false } = {}) {
        if (typeof message === 'string') {
            state.panelMessage = message;
        }
        await Panel.render({ highlightRefresh }).catch(() => {});
    },

    async init() {
        if (!state.page) return;

        await state.page.evaluate(currentMode => {
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

            document.getElementById('refresh-btn').onclick = window.refresh;
            document.getElementById('start-btn').onclick = window.startAnswer;
            document.getElementById('mode-Auto').onclick = window.setAuto;
            document.getElementById('mode-Semi').onclick = window.setSemi;
            document.getElementById('mode-Delay').onclick = window.setDelay;

            document.getElementById('hide-panel').onclick = () => {
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
                    showBtn.remove();
                };
                document.body.appendChild(showBtn);
            };

            document.addEventListener('keydown', e => {
                if (!e.altKey) return;
                if (e.key.toLowerCase() === 'r') window.refresh();
                if (e.key.toLowerCase() === 's') window.startAnswer();
                if (e.key === '1') window.setAuto();
                if (e.key === '2') window.setSemi();
                if (e.key === '3') window.setDelay();
            });
        }, state.mode);

        await Panel.sync();
    }
};

// =======================
// Vocabulary & Audio Map
// =======================
const Vocabulary = {
    async refreshAll() {
        await Panel.sync({ message: 'Refreshing word lists…' });

        state.dict = {};
        state.reverseDict = {};
        state.audioMap = {};

        const page = state.page;
        if (!page) return;

        try {
            const base = await page.$$eval(DIR.selectors.baseWords, els => els.map(e => e.textContent));
            const target = await page.$$eval(DIR.selectors.targetWords, els => els.map(e => e.textContent));

            base.forEach((bRaw, i) => {
                const t = cleanString(target[i] || '');
                const b = cleanString(bRaw);
                if (t && b) {
                    state.dict[t] = b;
                    state.reverseDict[b] = t.split(',')[0].trim();
                }
            });
        } catch (err) {
            // Best-effort; log if needed
        }

        try {
            const items = await page.$$('.preview-grid .stats-item');
            for (const item of items) {
                const icon = await item.$('.sound-icon.has-sound');
                if (!icon) continue;
                const rawA = await item.$eval('.baseLanguage', el => el.textContent.trim());
                const a = cleanString(rawA);
                await page.evaluate(el => el.click(), icon);
                await sleep(500);
                const src = await page.evaluate(() => window.lastAudioSrc || null);
                if (src) {
                    state.audioMap[src] = a;
                }
            }
        } catch (err) {
            // Best-effort; log if needed
        }

        state.questionMode = await page.evaluate(() => {
            return document
                .querySelectorAll('.selected[ng-click="starter.selectLearningMode(item)"]')[0]
                .children[1].children[0].children[0].textContent.toString();
        });

        const totalEntries = Object.keys(state.dict).length;
        const entriesWithAudio = Object.values(state.dict).filter(v =>
            Object.values(window.audioMap || {}).includes(v)
        ).length;

        state.stats.totalEntries = totalEntries;
        state.stats.entriesWithAudio = entriesWithAudio;
        state.stats.lastRefresh = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const message = `All word lists refreshed:\nTotal entries: ${totalEntries}\nWith audio: ${entriesWithAudio}\n\n`;
        await page.evaluate(msg => alert(msg), message);

        await Panel.sync({
            message: `Loaded ${totalEntries} entries · ${entriesWithAudio} with audio`,
            highlightRefresh: true
        });
    },

    async fixAnswer() {
        const page = state.page;
        if (!page) return;

        try {
            await page.waitForFunction(
                sel => document.querySelector(sel)?.textContent.trim().length > 0,
                {},
                DIR.selectors.modalFields.question
            );

            const modalData = await page.evaluate(selectors => {
                const safeText = sel => {
                    const el = document.querySelector(sel);
                    return el ? el.textContent : '';
                };
                return {
                    question: safeText(selectors.question),
                    correct: safeText(selectors.correct)
                };
            }, DIR.selectors.modalFields);

            const cleanedQuestion = cleanString(modalData.question);
            const cleanedCorrect = cleanString(modalData.correct);

            if (cleanedQuestion && cleanedCorrect) {
                state.dict[cleanedQuestion] = cleanedCorrect;
                state.reverseDict[cleanedCorrect] = cleanedQuestion.split(',')[0].trim();
                await Panel.sync({ message: `Learned correction for "${cleanedQuestion}"` });
            }

            await page.$eval(DIR.selectors.continueButton, btn => (btn.disabled = false));
            await page.click(DIR.selectors.continueButton);
        } catch (err) {
            await Panel.sync({
                message: 'Unable to read correction modal. Please continue manually.'
            });
        }
    }
};

// =======================
// Answering Engine
// =======================
const Engine = {
    async toggleRun() {
        state.running = !state.running;

        await Panel.sync({
            message: state.running
                ? `Answering in ${MODE_LABELS[state.mode] || state.mode} mode`
                : 'Bot paused. Refresh (Alt+R) when changing tasks.'
        });

        if (state.running) {
            try {
                await Engine.loopAnswers();
            } catch (err) {
                state.running = false;
            }

            if (!state.running) {
                await Panel.sync({
                    message: 'Bot stopped. Adjust the mode or refresh to continue.'
                });
            }
        }
    },

    async setMode(newMode) {
        state.mode = newMode;
        await Panel.sync({
            message: state.running
                ? `Answering in ${MODE_LABELS[state.mode] || state.mode} mode`
                : `Mode set to ${MODE_LABELS[state.mode] || state.mode}. Press Refresh before starting.`
        });
    },

    async loopAnswers() {
        const page = state.page;
        if (!page) return;

        if ((state.questionMode === 'Dictation' || state.questionMode === 'Listening') &&
            state.mode !== 'auto') {
            await page.evaluate(msg => alert(msg),
                'Due to some vocabulary having multiple audio, semi and delay mode may get questions wrong. Auto mode is recommended for this.'
            );
        }

        while (state.running) {
            let answer;
            let qText = '';

            try {
                qText = await page.$eval(
                    DIR.selectors.questionText,
                    el => el.textContent.trim()
                );
            } catch (err) {
                // No text question; fall back to audio
            }

            if (qText) {
                const cleaned = cleanString(qText).split(/[;,]/)[0].trim();
                if (state.dict[cleaned]) {
                    answer = state.dict[cleaned];
                } else if (state.reverseDict[cleaned]) {
                    answer = state.reverseDict[cleaned];
                } else {
                    answer = randStr(8, 10);
                }
            } else {
                let src = null;
                try {
                    const speaker = await page.$('.voice-speaker');
                    if (speaker) {
                        await page.evaluate(el => el.click(), speaker);
                        await sleep(500);
                        src = await page.evaluate(() => window.lastAudioSrc || null);
                    }
                } catch (err) {
                    // ignore
                }

                if (state.questionMode === 'Dictation') {
                    answer =
                        (src && state.reverseDict[state.audioMap[src]]) ||
                        randStr(8, 10);
                } else {
                    answer =
                        (src && state.audioMap[src]) ||
                        randStr(8, 10);
                }
            }

            await page.click(DIR.selectors.answerInput, { clickCount: 3 });
            await page.keyboard.sendCharacter(answer);

            if (state.mode === 'auto') {
                await page.keyboard.press('Enter');
            } else if (state.mode === 'delay') {
                await sleep(Math.random() * 3000);
                await page.keyboard.press('Enter');
            }

            if (await page.$(DIR.selectors.modal)) {
                await Vocabulary.fixAnswer();
            }
        }
    }
};

// =======================
// Bootstrap / Puppeteer
// =======================
const Bootstrap = {
    async start() {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });

        const [page] = await browser.pages();
        state.page = page;

        // Track last played audio
        await page.evaluateOnNewDocument(() => {
            window.lastAudioSrc = null;
            const origPlay = HTMLAudioElement.prototype.play;
            HTMLAudioElement.prototype.play = function () {
                window.lastAudioSrc = this.src;
                return origPlay.call(this);
            };
        });

        // Expose Node-side functions to the page
        await page.exposeFunction('refresh', () => Vocabulary.refreshAll());
        await page.exposeFunction('startAnswer', () => Engine.toggleRun());
        await page.exposeFunction('setAuto', () => Engine.setMode('auto'));
        await page.exposeFunction('setSemi', () => Engine.setMode('semi'));
        await page.exposeFunction('setDelay', () => Engine.setMode('delay'));

        page.on('load', () => Panel.init());

        await page.goto(DIR.loginUrl);
    }
};

// =======================
// Entry Point
// =======================
(async () => {
    await Bootstrap.start();
})();
