/**
 * DevLens — Auto Detector
 * ----------------------------------------------------------------
 * Guesses which language/framework a pasted error most likely
 * belongs to, purely from surface patterns in the text. Used when
 * the user leaves the language selector on "Auto Detect".
 */
(function (global) {
  const SIGNATURES = [
    { language: 'laravel',    weight: 5, test: /Illuminate\\|MethodNotAllowedHttpException|ModelNotFoundException|MassAssignmentException/i },
    { language: 'php',        weight: 3, test: /Fatal error:|Parse error:|\.php on line|PHP (Warning|Notice|Deprecated)/i },
    { language: 'python',     weight: 5, test: /Traceback \(most recent call last\)|File "[^"]+", line \d+/ },
    { language: 'java',       weight: 4, test: /Exception in thread|at [\w.$]+\([\w.]+\.java:\d+\)/ },
    { language: 'csharp',     weight: 4, test: /System\.\w*Exception|at [\w.]+\.\w+\([^)]*\) in [^:]+:line \d+/ },
    { language: 'node',       weight: 3, test: /node_modules|internal\/modules|EADDRINUSE|ECONNREFUSED/ },
    { language: 'sql',        weight: 4, test: /SQLSTATE\[|You have an error in your SQL syntax|Unknown column|Duplicate entry/i },
    { language: 'react',      weight: 4, test: /\bReact\b.*(hook|warn)|Rendered (more|fewer) hooks|react-dom/i },
    { language: 'vue',        weight: 5, test: /\[Vue warn\]/ },
    { language: 'typescript', weight: 4, test: /TS\d{4}:|error TS\d{4}/ },
    { language: 'git',        weight: 4, test: /CONFLICT \(content\)|non-fast-forward|detached HEAD|publickey/ },
    { language: 'json',       weight: 2, test: /Unexpected token .* in JSON|Unexpected end of JSON input/ },
    { language: 'javascript', weight: 2, test: /Uncaught \w+Error|at \S+ \(\S+\.js:\d+:\d+\)|\.js:\d+:\d+/ },
    { language: 'css',        weight: 1, test: /unknown property|@media|selector/i },
    { language: 'html',       weight: 1, test: /unclosed element|<\/?[a-z]+>/i },
  ];

  function detectLanguage(text) {
    if (!text || !text.trim()) return null;
    let best = null;
    let bestScore = 0;
    for (const sig of SIGNATURES) {
      if (sig.test.test(text)) {
        if (sig.weight > bestScore) {
          bestScore = sig.weight;
          best = sig.language;
        }
      }
    }
    return best;
  }

  function detectFramework(text) {
    if (/Illuminate\\|laravel/i.test(text)) return 'Laravel';
    if (/react-dom|Rendered (more|fewer) hooks/i.test(text)) return 'React';
    if (/\[Vue warn\]/.test(text)) return 'Vue';
    if (/express|Router\.handle/i.test(text)) return 'Express (Node.js)';
    if (/django/i.test(text)) return 'Django';
    if (/flask/i.test(text)) return 'Flask';
    if (/spring/i.test(text)) return 'Spring';
    return null;
  }

  global.DevLensDetector = { detectLanguage, detectFramework };
})(window);
