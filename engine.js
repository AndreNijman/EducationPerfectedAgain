// engine.js
// Depends on: state, DIR, MODE_LABELS, randStr, sleep, Vocabulary.fixAnswer, syncPanelState

const { state } = require('./state');
const { DIR, MODE_LABELS } = require('./constants');
const { randStr, sleep } = require('./utils');
const Vocabulary = require('./vocabulary');
const { syncPanelState } = require('./panel');

async function toggleRun() {
  state.running = !state.running;

  await syncPanelState({
    message: state.running
      ? `Answering in ${MODE_LABELS[state.mode] || state.mode} mode`
      : 'Bot paused. Refresh (Alt+R) when changing tasks.'
  });

  if (state.running) {
    try {
      await loopAnswers();
    } catch (err) {
      state.running = false;
    }

    if (!state.running) {
      await syncPanelState({ message: 'Bot stopped. Adjust the mode or refresh to continue.' });
    }
  }
}

async function setMode(newMode) {
  state.mode = newMode;
  await syncPanelState({
    message: state.running
      ? `Answering in ${MODE_LABELS[state.mode] || state.mode} mode`
      : `Mode set to ${MODE_LABELS[state.mode] || state.mode}. Press Refresh before starting.`
  });
}

async function loopAnswers() {
  const page = state.page;
  if (!page) return;

  if ((state.questionMode === 'Dictation' || state.questionMode === 'Listening') && state.mode !== 'auto') {
    await page.evaluate(msg => alert(msg),
      'Due to some vocabulary having multiple audio, semi and delay mode may get questions wrong. Auto mode is recommended for this.'
    );
  }

  while (state.running) {
    let answer;
    let qText = '';

    try {
      qText = await page.$eval(DIR.selectors.questionText, el => el.textContent.trim());
    } catch (err) {
      // No text question; fall back to audio
    }

    if (qText) {
      const cleaned = require('./utils').cleanString(qText).split(/[;,]/)[0].trim();
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
        answer = (src && state.reverseDict[state.audioMap[src]]) || randStr(8, 10);
      } else {
        answer = (src && state.audioMap[src]) || randStr(8, 10);
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

module.exports = { toggleRun, setMode, loopAnswers };
