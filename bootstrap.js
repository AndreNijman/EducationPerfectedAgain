// bootstrap.js
// Depends on: puppeteer, DIR, state, initPanel, Vocabulary, and Engine

const puppeteer = require('puppeteer');
const { DIR } = require('./constants');
const { state } = require('./state');
const { initPanel } = require('./panel');
const Vocabulary = require('./vocabulary');
const Engine = require('./engine');

async function start() {
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

  page.on('load', () => initPanel());

  await page.goto(DIR.loginUrl);
}

module.exports = { start };
