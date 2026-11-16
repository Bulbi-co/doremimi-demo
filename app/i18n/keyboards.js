/*
 * The game keyboard's letters per language (Controls/GameKeyboard.axaml for Türkçe). Turkish is the app's: Q, W and X
 * left out, because no Turkish answer has them and three fewer keys made the rest wider. English and French answers do
 * use them (Woodwind, xylophone, quatre), so those layouts are the full QWERTY and AZERTY. French has no accented keys:
 * the matcher folds accents (lib/answers.js normalise), so "becarre" is the answer "Bécarre". tests/i18n.test.mjs holds
 * every letter of every typeable answer to its language's keys.
 */
export const KEYBOARDS = {
  tr: { rows: ['ERTYUIOPĞÜ', 'ASDFGHJKLŞİ', 'ZCVBNMÖÇ'], digits: '1234567890' },
  en: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], digits: '1234567890' },
  fr: { rows: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'], digits: '1234567890' },
};
