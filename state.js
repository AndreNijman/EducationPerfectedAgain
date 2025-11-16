// state.js
// Central shared runtime state

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

module.exports = { state };
