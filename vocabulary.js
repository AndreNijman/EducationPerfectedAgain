// vocabulary.js
// Depends on: state, DIR, cleanString, sleep, and syncPanelState

const { state } = require('./state');
const { DIR } = require('./constants');
const { cleanString, sleep } = require('./utils');
const { syncPanelState } = require('./panel');

async function refreshAll() {
  await syncPanelState({ message: 'Refreshing word lists…' });

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
    // best-effort scraping; silently continue
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
    // best-effort; silently continue
  }

  try {
    state.questionMode = await page.evaluate(() => {
      return document
        .querySelectorAll('.selected[ng-click="starter.selectLearningMode(item)"]')[0]
        .children[1].children[0].children[0].textContent.toString();
    });
  } catch (err) {
    state.questionMode = '';
  }

  const totalEntries = Object.keys(state.dict).length;
  // entriesWithAudio counts entries where the base word appears in the audio map values
  const audioValues = Object.values(state.audioMap);
  const entriesWithAudio = Object.values(state.dict).filter(v => audioValues.includes(v)).length;

  state.stats.totalEntries = totalEntries;
  state.stats.entriesWithAudio = entriesWithAudio;
  state.stats.lastRefresh = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const message = `All word lists refreshed:\nTotal entries: ${totalEntries}\nWith audio: ${entriesWithAudio}\n\n`;
  await page.evaluate(msg => alert(msg), message);

  await syncPanelState({
    message: `Loaded ${totalEntries} entries · ${entriesWithAudio} with audio`,
    highlightRefresh: true
  });
}

async function fixAnswer() {
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
      await syncPanelState({ message: `Learned correction for "${cleanedQuestion}"` });
    }

    await page.$eval(DIR.selectors.continueButton, btn => (btn.disabled = false));
    await page.click(DIR.selectors.continueButton);
  } catch (err) {
    await syncPanelState({ message: 'Unable to read correction modal. Please continue manually.' });
  }
}

module.exports = { refreshAll, fixAnswer };
