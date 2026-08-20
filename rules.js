/**
 * DevLens — Rule Engine
 * ----------------------------------------------------------------
 * Runs window.DEVLENS_RULES against raw input text and returns the
 * best match. Fully offline — no external API required. Designed
 * to stay modular so new rules (or a future AI-backed matcher) can
 * be dropped in without touching this file.
 */
(function (global) {

  /**
   * @param {string} text        Raw error / stack trace text
   * @param {string} [langHint]  A DEVLENS_LANGUAGES key, or 'auto'
   * @returns {object|null}      { rule, match } or null if nothing matched
   */
  function findBestMatch(text, langHint) {
    if (!text || !text.trim()) return null;
    const rules = global.DEVLENS_RULES || [];
    const candidates = [];

    for (const rule of rules) {
      if (langHint && langHint !== 'auto' && rule.language !== langHint) continue;
      const re = rule.test instanceof RegExp ? rule.test : new RegExp(rule.test, 'i');
      const match = text.match(re);
      if (match) candidates.push({ rule, match });
    }

    // If a language hint filtered everything out, retry across all languages
    if (!candidates.length && langHint && langHint !== 'auto') {
      return findBestMatch(text, 'auto');
    }

    if (!candidates.length) return null;

    // Prefer the match consuming the most characters (more specific pattern)
    candidates.sort((a, b) => (b.match[0].length - a.match[0].length));
    return candidates[0];
  }

  /**
   * Resolve a rule + match into the fields the UI needs.
   */
  function resolve(rule, match) {
    const cause = typeof rule.cause === 'function' ? rule.cause(match) : rule.cause;
    const solution = typeof rule.solution === 'function' ? rule.solution(match) : rule.solution;
    const fix = typeof rule.fix === 'function' ? rule.fix(match) : (rule.fix || null);
    return {
      id: rule.id,
      language: rule.language,
      type: rule.type,
      severity: rule.severity,
      cause,
      solution,
      simple: rule.simple || cause,
      fix,
    };
  }

  global.DevLensRuleEngine = { findBestMatch, resolve };
})(window);
