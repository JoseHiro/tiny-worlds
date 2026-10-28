// 日本語 / English. The page is written in Japanese; an element with data-en="…" gets that HTML in English. Text made
// in code is a pair [ja, en] passed through L(). The choice is kept per viewer (?lang=en, or the last one picked) and a
// #lang switch (two buttons, data-v="ja" / "en") flips everything in place; onLang(f) re-labels what code made.
const KEY = 'tiny-worlds-lang';
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
let lang = new URLSearchParams(location.search).get('lang') || stored() || 'ja';
if (lang !== 'en') lang = 'ja';
const subs = [];

export const getLang = () => lang;
export const L = (x) => (Array.isArray(x) ? (lang === 'en' ? x[1] ?? x[0] : x[0]) : x);
export function onLang(f) { subs.push(f); }

function apply() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-en]')) {
    if (el.dataset.ja === undefined) el.dataset.ja = el.innerHTML;
    el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.ja;
  }
  for (const b of document.getElementById('lang')?.children ?? []) b.classList.toggle('on', b.dataset.v === lang);
  for (const f of subs) f(lang);
}
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'ja';
  try { localStorage.setItem(KEY, lang); } catch { /* private window: this page only */ }
  apply();
}
for (const b of document.getElementById('lang')?.children ?? []) b.onclick = () => setLang(b.dataset.v);
apply();
