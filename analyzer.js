/**
 * DevLens — Analyzer
 * ----------------------------------------------------------------
 * Orchestrates the Rule Engine, Parser, and Detector into the three
 * analysis modes exposed in the UI: Error Analyzer, Code Analyzer,
 * and Stack Trace Analyzer. Everything here runs client-side.
 */
(function (global) {
  const { findBestMatch, resolve } = global.DevLensRuleEngine;
  const { parseStackTrace, formatLocation } = global.DevLensParser;
  const { detectLanguage, detectFramework } = global.DevLensDetector;

  const LANG_LABELS = Object.fromEntries((global.DEVLENS_LANGUAGES || []).map((l) => [l.key, l.label]));

  /* ------------------------------- Error Analyzer ------------------------------- */
  function analyzeError(text, langHint) {
    if (!text || !text.trim()) return null;

    const effectiveLang = (langHint && langHint !== 'auto') ? langHint : detectLanguage(text);
    const found = findBestMatch(text, effectiveLang || 'auto');
    const { frames, primary } = parseStackTrace(text);
    const framework = detectFramework(text);

    if (!found) {
      // No rule matched — still return a useful, honest fallback.
      return {
        matched: false,
        type: 'Unknown',
        language: LANG_LABELS[effectiveLang] || 'Unrecognized',
        languageKey: effectiveLang || null,
        framework,
        location: primary ? formatLocation(primary) : null,
        frames,
        severity: 'info',
        cause: 'DevLens doesn\'t have a rule for this exact message yet. The pattern-matching engine only recognizes errors it has been taught, so this one falls outside its current rule set.',
        solution: 'Try the Stack Trace Analyzer tab to at least extract the file and line number, or check the "Code Analyzer" tab if you have the surrounding code.',
        simple: 'This one is new to DevLens — it hasn\'t learned this exact error yet.',
        fix: null,
      };
    }

    const resolved = resolve(found.rule, found.match);
    return {
      matched: true,
      type: resolved.type,
      language: LANG_LABELS[resolved.language] || resolved.language,
      languageKey: resolved.language,
      framework,
      location: primary ? formatLocation(primary) : null,
      frames,
      severity: resolved.severity,
      cause: resolved.cause,
      solution: resolved.solution,
      simple: resolved.simple,
      fix: resolved.fix,
    };
  }

  /* ------------------------------- Stack Trace Analyzer ------------------------------- */
  function analyzeStackTrace(text) {
    const { frames, primary } = parseStackTrace(text);
    const language = detectLanguage(text);
    const framework = detectFramework(text);
    const errorAnalysis = analyzeError(text, language || 'auto');

    return {
      language: LANG_LABELS[language] || 'Unknown',
      languageKey: language,
      framework,
      frameCount: frames.length,
      primaryLocation: primary ? formatLocation(primary) : null,
      frames: frames.slice(0, 12),
      errorAnalysis,
    };
  }

  /* ------------------------------- Code Analyzer (static checks) ------------------------------- */
  const CODE_CHECKS = [
    {
      severity: 'error',
      test: /\bconst\s+(\w+)\s*=\s*undefined\s*;?/,
      followUp: (varName, restLines, fromLine) => {
        const re = new RegExp(`\\b${varName}\\.(\\w+)`);
        for (let i = fromLine; i < restLines.length; i++) {
          const m = restLines[i].match(re);
          if (m) {
            return {
              line: i + 1,
              message: `\`${varName}\` is undefined here, but \`.${m[1]}\` is accessed on line ${i + 1}.`,
              fix: `Check that \`${varName}\` exists before accessing \`${varName}.${m[1]}\`.`,
            };
          }
        }
        return null;
      },
    },
    {
      severity: 'warning',
      test: /(?<![=!<>])==(?!=)/,
      message: () => 'Loose equality (`==`) can silently coerce types (e.g. `0 == "0"` is true).',
      fix: () => 'Use strict equality (`===`) unless type coercion is intentional.',
    },
    {
      severity: 'warning',
      test: /catch\s*\([^)]*\)\s*\{\s*\}/,
      message: () => 'Empty catch block — errors are being silently swallowed.',
      fix: () => 'At minimum log the error, e.g. `catch (err) { console.error(err); }`.',
    },
    {
      severity: 'warning',
      test: /except\s*:\s*$/,
      message: () => 'Bare `except:` catches every exception, including ones you didn\'t anticipate (like `KeyboardInterrupt`).',
      fix: () => 'Catch a specific exception type, e.g. `except ValueError:`.',
    },
    {
      severity: 'info',
      test: /console\.log\(/,
      message: () => 'Debug `console.log` left in the code.',
      fix: () => 'Remove it before shipping, or replace with a proper logger.',
    },
    {
      severity: 'warning',
      test: /SELECT\s+\*\s+FROM/i,
      message: () => '`SELECT *` pulls every column, which can hurt performance and break if the schema changes.',
      fix: () => 'List only the columns you actually need.',
    },
    {
      severity: 'error',
      test: /\$_(GET|POST|REQUEST)\[[^\]]+\]\s*(?:;|\.|,|\))/,
      message: () => 'Superglobal used directly — this is a common SQL injection / XSS entry point if not sanitized.',
      fix: () => 'Validate and escape the input, or use parameterized queries / a framework request object.',
    },
    {
      severity: 'info',
      test: /\/\/\s*(TODO|FIXME)/i,
      message: (m) => `Unresolved ${m[1].toUpperCase()} comment.`,
      fix: () => 'Track this in your issue tracker if it can\'t be resolved now.',
    },
    {
      severity: 'warning',
      test: /if\s*\([^=!<>]*[^=!<>]=[^=][^)]*\)/,
      message: () => 'Single `=` inside an `if (...)` condition assigns rather than compares — likely a typo for `==`/`===`.',
      fix: () => 'Use `===` for comparison; keep `=` only for assignment.',
    },
  ];

  function analyzeCode(code) {
    if (!code || !code.trim()) return [];
    const lines = code.split('\n');
    const problems = [];

    lines.forEach((line, idx) => {
      // Special-case: undefined variable later dereferenced
      const undefMatch = line.match(CODE_CHECKS[0].test);
      if (undefMatch) {
        const result = CODE_CHECKS[0].followUp(undefMatch[1], lines, idx + 1);
        if (result) {
          problems.push({ line: result.line, severity: 'error', message: result.message, fix: result.fix });
        }
      }

      for (let i = 1; i < CODE_CHECKS.length; i++) {
        const check = CODE_CHECKS[i];
        const m = line.match(check.test);
        if (m) {
          problems.push({
            line: idx + 1,
            severity: check.severity,
            message: check.message(m),
            fix: check.fix(m),
          });
        }
      }
    });

    return problems;
  }

  global.DevLensAnalyzer = { analyzeError, analyzeStackTrace, analyzeCode };
})(window);
