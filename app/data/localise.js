/*
 * The game's content in one language (dossier ch. 14 §11). Türkçe is ./content.js and ./site.js as they are; English
 * and French lay ../i18n/content-en.js and content-fr.js over them, key for key, and build the deck with the same
 * functions the Turkish deck is built with (questionsOf, conceptsOf), so a question's id, colour, difficulty and
 * concepts never depend on the language and a child's progress carries across a switch.
 *
 * What stays Turkish, as the spec says: song lyrics, video titles and the foundation's long site texts. What is
 * translated: the questions with their accepted answers, the signs, the families, the eleven quiz instruments, the 41
 * directory names and summaries, the badges, the intro, the level question, the banners and the help page.
 */
import * as TR from './content.js';
import { DIRECTORY, GROUPS, LEGAL } from './site.js';
import { DIFFICULTIES } from '../lib/modes.js';
import { acceptedFor } from '../lib/answers.js';
import EN from '../i18n/content-en.js';
import FR from '../i18n/content-fr.js';

export const OVERLAYS = { en: EN, fr: FR };

/** The Turkish help page (Yardım ve SSS) as [question, answer] pairs; the other languages carry their own. */
const FAQ_TR = LEGAL.yardim.sections;
/** The Turkish group names are the keys every colour and filter is stored under; these are only what is shown. */
const GROUP_TR = Object.fromEntries(GROUPS.map(g => [g, g]));
const DIFF_TR = Object.fromEntries(DIFFICULTIES.map(d => [d.key, { name: d.name, line: d.line }]));

function build(lang) {
  const O = OVERLAYS[lang];
  const over = (base, table, pick) => base.map(x => ({ ...x, ...pick(table?.[x.key ?? x.id] ?? {}) }));
  const SIGN_CATEGORIES = O ? over(TR.SIGN_CATEGORIES, O.signCategories, x => x) : TR.SIGN_CATEGORIES;
  const SIGN_CARDS = O ? over(TR.SIGN_CARDS, O.signCards, x => x) : TR.SIGN_CARDS;
  const FAMILIES = O ? Object.fromEntries(Object.entries(TR.FAMILIES).map(([k, f]) => [k, { ...f, ...O.families[k] }])) : TR.FAMILIES;
  const INSTRUMENTS = O ? Object.fromEntries(Object.entries(TR.INSTRUMENTS).map(([k, i]) => [k, { ...i, ...O.instruments[k] }])) : TR.INSTRUMENTS;
  const QUIZ = O ? TR.QUIZ.map(([key, , , , archetype, inst]) => { const q = O.quiz[key]; return [key, q.q, q.tip, q.answer, archetype, inst]; }) : TR.QUIZ;
  const acceptedOf = O ? key => O.quiz[key].accepted : (key, answer) => acceptedFor(answer);
  const QUESTIONS = O ? TR.questionsOf({ signCards: SIGN_CARDS, signCategories: SIGN_CATEGORIES, quiz: QUIZ, instruments: INSTRUMENTS, families: FAMILIES, acceptedOf }) : TR.QUESTIONS;
  const CONCEPTS = O ? TR.conceptsOf({ signCategories: SIGN_CATEGORIES, signCards: SIGN_CARDS, families: FAMILIES, instruments: INSTRUMENTS }) : TR.CONCEPTS;
  const BADGES = O ? over(TR.BADGES, O.badges, x => x) : TR.BADGES;
  const INTRO_STEPS = O ? over(TR.INTRO_STEPS, O.intro, x => x) : TR.INTRO_STEPS;
  const BANNERS = TR.BANNERS.map((b, index) => ({ ...b, ...(O?.banners[index] ?? {}), index }));
  const DIFF = O?.difficulties ?? DIFF_TR;
  const groupNames = O?.groups ?? GROUP_TR;
  const directory = O?.directory ?? {};
  return {
    lang, SIGN_CATEGORIES, SIGN_CARDS, FAMILIES, INSTRUMENTS, QUESTIONS, CONCEPTS, BADGES, INTRO_STEPS, BANNERS,
    LEVEL_QUESTION: O?.levelQuestion ?? TR.LEVEL_QUESTION,
    DIFFICULTIES: DIFFICULTIES.map(d => ({ ...d, ...DIFF[d.key] })),
    // `name` stays the Turkish one (routes, photos, songs and riddles are found by it); `label` and `about` are shown.
    DIRECTORY: DIRECTORY.map(d => ({ ...d, label: directory[d.name]?.name ?? d.name, about: directory[d.name]?.summary ?? d.summary })),
    groupName: g => groupNames[g] ?? g,
    /** A Turkish instrument name as this language says it; a name the directory does not hold is left as it is. */
    instName: n => directory[n]?.name ?? (directory[DIRECTORY.find(d => d.name.toLocaleLowerCase('tr') === String(n).toLocaleLowerCase('tr'))?.name]?.name) ?? n,
    FAQ: O?.faq ?? FAQ_TR,
  };
}

const cache = new Map();
/** The content in `lang` (tr, en or fr), built once per language. */
export function localise(lang) {
  if (!cache.has(lang)) cache.set(lang, build(OVERLAYS[lang] || lang === 'tr' ? lang : 'tr'));
  return cache.get(lang);
}
