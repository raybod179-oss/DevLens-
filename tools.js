/**
 * DevLens — Developer Tools
 * ----------------------------------------------------------------
 * Small, self-contained utilities. Designed to be modular: each
 * tool is a { id, name, desc, run(input) -> {ok, output, error} }
 * entry, so more can be dropped in later without touching app.js.
 */
(function (global) {

  const TOOLS = [
    {
      id: 'json-formatter',
      name: 'JSON Formatter',
      desc: 'Pretty-print and validate JSON.',
      status: 'ready',
      placeholder: '{"name":"devlens","ok":true}',
      run(input) {
        try {
          const parsed = JSON.parse(input);
          return { ok: true, output: JSON.stringify(parsed, null, 2) };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
    },
    {
      id: 'json-validator',
      name: 'JSON Validator',
      desc: 'Check whether text is valid JSON.',
      status: 'ready',
      placeholder: '{"valid": true}',
      run(input) {
        try {
          JSON.parse(input);
          return { ok: true, output: 'Valid JSON ✓' };
        } catch (e) {
          return { ok: false, error: `Invalid JSON — ${e.message}` };
        }
      },
    },
    {
      id: 'base64',
      name: 'Base64 Encoder / Decoder',
      desc: 'Encode or decode Base64 text.',
      status: 'ready',
      placeholder: 'Hello, DevLens!',
      run(input, mode) {
        try {
          if (mode === 'decode') {
            return { ok: true, output: decodeURIComponent(escape(atob(input))) };
          }
          return { ok: true, output: btoa(unescape(encodeURIComponent(input))) };
        } catch (e) {
          return { ok: false, error: 'Could not process input — check it\'s valid Base64 when decoding.' };
        }
      },
      hasMode: true,
    },
    {
      id: 'url-encoder',
      name: 'URL Encoder / Decoder',
      desc: 'Encode or decode URL components.',
      status: 'ready',
      placeholder: 'https://example.com/search?q=hello world',
      run(input, mode) {
        try {
          if (mode === 'decode') return { ok: true, output: decodeURIComponent(input) };
          return { ok: true, output: encodeURIComponent(input) };
        } catch (e) {
          return { ok: false, error: 'Could not decode — input may already be decoded or malformed.' };
        }
      },
      hasMode: true,
    },
    {
      id: 'jwt-decoder',
      name: 'JWT Decoder',
      desc: 'Decode a JWT\'s header and payload (no verification).',
      status: 'ready',
      placeholder: 'eyJhbGciOi...header.payload.signature',
      run(input) {
        const parts = input.trim().split('.');
        if (parts.length < 2) return { ok: false, error: 'That doesn\'t look like a JWT (expected header.payload.signature).' };
        try {
          const decodePart = (p) => JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/'))))), null, 2);
          const header = decodePart(parts[0]);
          const payload = decodePart(parts[1]);
          return { ok: true, output: `// Header\n${header}\n\n// Payload\n${payload}` };
        } catch (e) {
          return { ok: false, error: 'Could not decode — check the token is well-formed.' };
        }
      },
    },
    { id: 'regex-tester', name: 'Regex Tester', desc: 'Test patterns against sample text.', status: 'soon' },
    { id: 'api-tester', name: 'API Tester', desc: 'Send requests and inspect responses.', status: 'soon' },
    { id: 'http-status', name: 'HTTP Status Checker', desc: 'Look up what a status code means.', status: 'soon' },
    { id: 'html-validator', name: 'HTML Validator', desc: 'Catch unclosed or malformed tags.', status: 'soon' },
    { id: 'css-validator', name: 'CSS Validator', desc: 'Catch unknown properties and typos.', status: 'soon' },
    { id: 'js-formatter', name: 'JavaScript Formatter', desc: 'Auto-format JS source.', status: 'soon' },
    { id: 'sql-formatter', name: 'SQL Formatter', desc: 'Pretty-print SQL queries.', status: 'soon' },
    { id: 'git-helper', name: 'Git Error Helper', desc: 'Explain common Git error output.', status: 'soon' },
  ];

  function getTools() { return TOOLS; }
  function getTool(id) { return TOOLS.find((t) => t.id === id); }

  global.DevLensTools = { getTools, getTool };
})(window);
