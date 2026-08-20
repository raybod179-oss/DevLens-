/**
 * DevLens — Stack Trace Parser
 * ----------------------------------------------------------------
 * Extracts a "best guess" location (file:line:column) and the list
 * of individual stack frames from raw pasted text, across a few
 * common stack trace conventions.
 */
(function (global) {

  const FRAME_PATTERNS = [
    // JavaScript / Node / TypeScript:  "at fn (file.js:12:34)"  or  "at file.js:12:34"
    {
      kind: 'js',
      re: /at\s+(?:([\w$.<>\[\] ]+)\s+\()?([^\s()]+):(\d+):(\d+)\)?/g,
      map: (m) => ({ fn: m[1] ? m[1].trim() : null, file: m[2], line: m[3], col: m[4] }),
    },
    // Python:  File "app.py", line 12, in <module>
    {
      kind: 'python',
      re: /File "([^"]+)",\s*line\s*(\d+)(?:,\s*in\s*(\S+))?/g,
      map: (m) => ({ fn: m[3] || null, file: m[1], line: m[2], col: null }),
    },
    // PHP:  #0 /var/www/app.php(42): foo()   OR   in /var/www/app.php on line 42
    {
      kind: 'php',
      re: /#?\d*\s*([^\s():]+\.php)\((\d+)\)(?::\s*(\S+))?/g,
      map: (m) => ({ fn: m[3] || null, file: m[1], line: m[2], col: null }),
    },
    {
      kind: 'php-online',
      re: /in\s+([^\s]+\.php)\s+on line\s+(\d+)/g,
      map: (m) => ({ fn: null, file: m[1], line: m[2], col: null }),
    },
    // Java / C#:  at com.foo.Bar.method(Bar.java:42)   OR   in File.cs:line 42
    {
      kind: 'java',
      re: /at\s+([\w.$<>]+)\(([^:)]+):(\d+)\)/g,
      map: (m) => ({ fn: m[1], file: m[2], line: m[3], col: null }),
    },
    {
      kind: 'csharp',
      re: /at\s+([\w.<>]+)\([^)]*\)\s+in\s+([^:]+):line\s+(\d+)/g,
      map: (m) => ({ fn: m[1], file: m[2], line: m[3], col: null }),
    },
  ];

  function parseStackTrace(text) {
    if (!text) return { frames: [], primary: null };
    const frames = [];

    for (const pattern of FRAME_PATTERNS) {
      pattern.re.lastIndex = 0;
      let m;
      while ((m = pattern.re.exec(text)) !== null) {
        const frame = pattern.map(m);
        if (frame.file) frames.push({ ...frame, kind: pattern.kind });
      }
    }

    // De-duplicate identical frames while preserving order
    const seen = new Set();
    const unique = frames.filter((f) => {
      const key = `${f.file}:${f.line}:${f.col}:${f.fn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const primary = unique.length ? unique[0] : null;

    return { frames: unique, primary };
  }

  function formatLocation(frame) {
    if (!frame) return null;
    const base = frame.file.split(/[\\/]/).pop();
    if (frame.col) return `${base}:${frame.line}:${frame.col}`;
    return `${base}:${frame.line}`;
  }

  global.DevLensParser = { parseStackTrace, formatLocation };
})(window);
