/*
 * The phone's three languages (dossier ch. 14 §11): Türkçe is the source, English and Français are drafts for a native
 * review. Every string a child or a parent reads lives in ./ui.js under one key per language; the game's content (the
 * questions, their answers, the signs, the families, the badges) is in ./content-en.js and ./content-fr.js, laid over
 * the Turkish content by ../data/localise.js. Song lyrics, video titles and the foundation's long site texts stay
 * Turkish, as the spec says.
 */
import { UI } from './ui.js';

export const LANGS = Object.freeze([
  { key: 'tr', name: 'Türkçe' },
  { key: 'en', name: 'English' },
  { key: 'fr', name: 'Français' },
]);
export const LANG_KEYS = LANGS.map(l => l.key);

/**
 * The language to start in: `?dil=` (the screenshots), then what the child chose in Ayarlar › Dil, then the device's
 * own when it is one of the three, else Türkçe. Inside the deck the "device" is the presenter's laptop and the deck
 * itself is Turkish, so an embedded phone starts in Türkçe whatever the laptop is set to; the Dil row still switches it.
 */
export function pickLang({ query = null, saved = null, languages = [], embed = false } = {}) {
  if (LANG_KEYS.includes(query)) return query;
  if (LANG_KEYS.includes(saved)) return saved;
  if (embed) return 'tr';
  for (const l of languages) { const k = String(l).toLowerCase().slice(0, 2); if (LANG_KEYS.includes(k)) return k; }
  return 'tr';
}

/**
 * t(key, vars) for one language. A value may be a plural set ({ one, other }), chosen by Intl.PluralRules on vars.n;
 * {name} in a value is replaced from vars. A key missing from the language falls back to Türkçe rather than showing
 * the key, but tests/i18n.test.mjs fails on any missing key, so the fallback is never what ships.
 */
export function translator(lang) {
  const table = UI[lang] ?? UI.tr;
  const plural = new Intl.PluralRules(lang);
  return (key, vars = {}) => {
    let s = table[key] ?? UI.tr[key];
    if (s == null) return key;
    if (typeof s === 'object') s = s[plural.select(vars.n ?? 0)] ?? s.other;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  };
}

/** A share as the language writes it: "%50", "50%", "50 %" (French's space is U+00A0 in Node and Chrome, a glyph all
 * three shipped fonts have; tests/i18n.test.mjs holds it there). */
export const percent = (lang, v) => new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(v);

/** Capitals by the language's own rules: Turkish i is İ, English and French i is I. */
export const upper = (lang, s) => String(s).toLocaleUpperCase(lang);
