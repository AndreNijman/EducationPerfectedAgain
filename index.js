// index.js (entry point)
const { start } = require('./bootstrap');
const { checkForUpdatesAndPrompt } = require('./updateChecker');

(async () => {
  // Fire-and-forget update check; does not block app startup
  try { checkForUpdatesAndPrompt(); } catch (_) {}
  await start();
})();
