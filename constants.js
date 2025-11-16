// constants.js
// No side effects, just constants

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

module.exports = { DIR, MODE_LABELS };
