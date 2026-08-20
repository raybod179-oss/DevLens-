/**
 * DevLens — App
 * ----------------------------------------------------------------
 * UI wiring only. All actual analysis logic lives in analyzer.js /
 * rules.js / parser.js / detector.js so this file stays about the
 * DOM, not the domain logic.
 */
(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const state = {
    view: 'home',
    mode: 'error',       // error | code | stack
    toolId: null,
    toolMode: 'encode',  // for tools with encode/decode
  };

  const MODE_PLACEHOLDERS = {
    error: "Paste your error, exception, or console message here...\n\ne.g. Uncaught TypeError: Cannot read properties of undefined (reading 'name')\n    at app.js:42:15",
    code: "Paste a snippet of code to scan for common issues...\n\nconst user = undefined;\nconsole.log(user.name);",
    stack: "Paste a full stack trace here — DevLens will pull out every file, line, and function it can find.",
  };

  /* ------------------------------- Routing ------------------------------- */
  function showView(name) {
    state.view = name;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    $$('.main-nav a, .mobile-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === name));
    $('#mobile-nav').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    if (name === 'history') renderHistory();
  }

  function initRouting() {
    $$('[data-view]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showView(a.dataset.view);
      });
    });
    $$('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => showView(btn.dataset.goto));
    });
    $('#btn-header-analyze').addEventListener('click', () => showView('analyzer'));

    const hash = (location.hash || '').replace('#', '');
    const known = { home: 'home', analyze: 'analyzer', tools: 'tools', history: 'history', about: 'about' };
    showView(known[hash] || 'home');
  }

  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-nav');
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ------------------------------- Toast ------------------------------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ------------------------------- Home page data ------------------------------- */
  function renderLangCards() {
    const grid = $('#lang-card-grid');
    const dots = ['dot-blue', 'dot-amber', 'dot-green', 'dot-red'];
    grid.innerHTML = window.DEVLENS_LANGUAGES
      .filter((l) => l.key !== 'auto')
      .map((l, i) => `
        <div class="feature-card">
          <div class="icon-dot"><span class="dot ${dots[i % dots.length]}"></span></div>
          <h3>${l.label}</h3>
          <p>Rule-based detection for common ${l.label} errors.</p>
        </div>
      `).join('');
  }

  /* ------------------------------- Analyzer ------------------------------- */
  function populateLangSelect() {
    const sel = $('#lang-select');
    sel.innerHTML = window.DEVLENS_LANGUAGES.map((l) => `<option value="${l.key}">${l.label}</option>`).join('');
  }

  function initAnalyzerTabs() {
    $$('.toolbar-tab[data-mode]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.toolbar-tab[data-mode]').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.mode = tab.dataset.mode;
        $('#analyzer-input').placeholder = MODE_PLACEHOLDERS[state.mode];
        $('#result-wrap').innerHTML = '';
      });
    });
  }

  function severityBadge(sev) {
    const label = { info: 'Info', warning: 'Warning', error: 'Error', critical: 'Critical' }[sev] || 'Info';
    return `<span class="severity-badge sev-${sev}"><span class="dot dot-${sev === 'critical' || sev === 'error' ? 'red' : sev === 'warning' ? 'amber' : 'blue'}"></span>${label}</span>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderErrorResult(result, explainSimply) {
    const causeText = explainSimply ? result.simple : result.cause;
    const fixHtml = result.fix
      ? `<div class="result-block"><h4><span class="dot dot-green"></span>Suggested Code</h4>
           <div class="code-block"><span class="diff-rem">${escapeHtml(result.fix.before)}</span>
${escapeHtml(result.fix.after)}</div></div>`
      : '';

    return `
      <div class="result-card">
        <div class="result-head">
          ${severityBadge(result.severity)}
          <span class="result-title">${escapeHtml(result.type)}</span>
          ${result.location ? `<span class="result-loc">📍 ${escapeHtml(result.location)}</span>` : ''}
        </div>
        <div class="result-grid">
          <div class="result-stat"><div class="k">Error Type</div><div class="v">${escapeHtml(result.type)}</div></div>
          <div class="result-stat"><div class="k">Language</div><div class="v">${escapeHtml(result.language)}${result.framework ? ` · ${escapeHtml(result.framework)}` : ''}</div></div>
          <div class="result-stat"><div class="k">Location</div><div class="v">${result.location ? escapeHtml(result.location) : '—'}</div></div>
        </div>
        <div class="result-block">
          <h4><span class="dot ${explainSimply ? 'dot-blue' : 'dot-amber'}"></span>${explainSimply ? 'Explained Simply' : 'Cause'}</h4>
          <div class="body-text ${explainSimply ? 'simple' : ''}">${escapeHtml(causeText)}</div>
        </div>
        <div class="result-block">
          <h4><span class="dot dot-green"></span>Solution</h4>
          <div class="body-text">${escapeHtml(result.solution)}</div>
        </div>
        ${fixHtml}
      </div>
    `;
  }

  function renderCodeResult(problems) {
    if (!problems.length) {
      return `<div class="result-card"><div class="result-empty">No obvious problems detected by the rule engine. That doesn't guarantee the code is correct — just that nothing matched a known pattern.</div></div>`;
    }
    const items = problems.map((p) => `
      <div class="problem-item">
        <div class="problem-line">Line ${p.line}</div>
        <div>
          <div class="problem-msg">${severityBadge(p.severity)} <span style="margin-left:8px;">${escapeHtml(p.message)}</span></div>
          <div class="problem-fix">Suggested Fix: <b>${escapeHtml(p.fix)}</b></div>
        </div>
      </div>
    `).join('');
    return `
      <div class="result-card">
        <div class="result-head"><span class="result-title">${problems.length} Problem${problems.length > 1 ? 's' : ''} Found</span></div>
        ${items}
      </div>
    `;
  }

  function renderStackResult(analysis) {
    const frameRows = analysis.frames.length
      ? analysis.frames.map((f, i) => `
          <div class="problem-item">
            <div class="problem-line">#${i}</div>
            <div>
              <div class="problem-msg">${escapeHtml(f.file.split(/[\\/]/).pop())}${f.line ? `:${f.line}` : ''}${f.col ? `:${f.col}` : ''}</div>
              ${f.fn ? `<div class="problem-fix">in <b>${escapeHtml(f.fn)}</b></div>` : ''}
            </div>
          </div>
        `).join('')
      : `<div class="result-empty">No individual stack frames were recognized — pasted text may not be a standard trace format.</div>`;

    const errorSection = analysis.errorAnalysis ? renderErrorResult(analysis.errorAnalysis, false) : '';

    return `
      <div class="result-card">
        <div class="result-head">
          <span class="result-title">Stack Trace Analysis</span>
          <span class="result-loc">📍 ${analysis.primaryLocation ? escapeHtml(analysis.primaryLocation) : '—'}</span>
        </div>
        <div class="result-grid">
          <div class="result-stat"><div class="k">Language</div><div class="v">${escapeHtml(analysis.language)}</div></div>
          <div class="result-stat"><div class="k">Framework</div><div class="v">${analysis.framework ? escapeHtml(analysis.framework) : '—'}</div></div>
          <div class="result-stat"><div class="k">Frames Found</div><div class="v">${analysis.frameCount}</div></div>
        </div>
        ${frameRows}
      </div>
      ${errorSection}
    `;
  }

  function runAnalysis() {
    const input = $('#analyzer-input').value;
    const lang = $('#lang-select').value;
    const explainSimply = $('#explain-simply-toggle').checked;
    const resultWrap = $('#result-wrap');

    if (!input.trim()) {
      toast('Paste something to analyze first.');
      return;
    }

    let html = '';
    let summary = '';
    let resultForHistory = null;

    if (state.mode === 'error') {
      const result = window.DevLensAnalyzer.analyzeError(input, lang);
      html = renderErrorResult(result, explainSimply);
      summary = result.type + (result.location ? ` @ ${result.location}` : '');
      resultForHistory = result;
    } else if (state.mode === 'code') {
      const problems = window.DevLensAnalyzer.analyzeCode(input);
      html = renderCodeResult(problems);
      summary = `${problems.length} problem(s) found`;
      resultForHistory = { problems };
    } else {
      const analysis = window.DevLensAnalyzer.analyzeStackTrace(input);
      html = renderStackResult(analysis);
      summary = `${analysis.frameCount} frame(s) · ${analysis.language}`;
      resultForHistory = analysis;
    }

    resultWrap.innerHTML = html;
    resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    window.DevLensHistory.save({
      mode: state.mode,
      input: input.slice(0, 4000),
      summary,
      result: resultForHistory,
    });
  }

  function initAnalyzerActions() {
    $('#btn-analyze').addEventListener('click', runAnalysis);
    $('#btn-clear').addEventListener('click', () => {
      $('#analyzer-input').value = '';
      $('#result-wrap').innerHTML = '';
    });
    $('#explain-simply-toggle').addEventListener('change', () => {
      if ($('#result-wrap').innerHTML && state.mode === 'error') runAnalysis();
    });
  }

  /* ------------------------------- Tools ------------------------------- */
  function renderToolsGrid() {
    const grid = $('#tools-grid');
    grid.innerHTML = window.DevLensTools.getTools().map((t) => `
      <div class="tool-card ${t.status === 'soon' ? 'is-soon' : ''}" data-tool="${t.id}">
        <div class="t-name">${escapeHtml(t.name)}</div>
        <div class="t-desc">${escapeHtml(t.desc)}</div>
        <div class="t-status">${t.status === 'ready' ? '● ready' : '○ coming soon'}</div>
      </div>
    `).join('');

    $$('.tool-card', grid).forEach((card) => {
      card.addEventListener('click', () => openTool(card.dataset.tool));
    });
  }

  function openTool(id) {
    const tool = window.DevLensTools.getTool(id);
    if (!tool || tool.status !== 'ready') {
      toast('This tool is coming in a future update.');
      return;
    }
    state.toolId = id;
    state.toolMode = 'encode';
    $('#tool-workspace-wrap').classList.remove('hidden');
    $('#tool-workspace-title').textContent = tool.name;
    $('#tool-input').value = '';
    $('#tool-output').value = '';
    $('#tool-input').placeholder = tool.placeholder || '';
    $('#tool-mode-toggle').style.display = tool.hasMode ? 'flex' : 'none';
    if (tool.hasMode) {
      $$('.toolbar-tab[data-tool-mode]').forEach((b) => b.classList.toggle('active', b.dataset.toolMode === 'encode'));
    }
    $('#tool-workspace-wrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function initToolWorkspace() {
    $('#btn-tool-run').addEventListener('click', () => {
      const tool = window.DevLensTools.getTool(state.toolId);
      if (!tool) return;
      const input = $('#tool-input').value;
      const result = tool.run(input, state.toolMode);
      $('#tool-output').value = result.ok ? result.output : `Error: ${result.error}`;
    });
    $('#btn-tool-copy').addEventListener('click', async () => {
      const output = $('#tool-output').value;
      if (!output) { toast('Nothing to copy yet.'); return; }
      try {
        await navigator.clipboard.writeText(output);
        toast('Copied to clipboard.');
      } catch (e) {
        toast('Could not copy — select and copy manually.');
      }
    });
    $$('.toolbar-tab[data-tool-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.toolbar-tab[data-tool-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.toolMode = btn.dataset.toolMode;
      });
    });
  }

  /* ------------------------------- History ------------------------------- */
  function renderHistory() {
    const list = $('#history-list');
    const items = window.DevLensHistory.getAll();
    if (!items.length) {
      list.innerHTML = `<div class="history-empty">No analyses saved yet. Anything you analyze will show up here, stored only in this browser.</div>`;
      return;
    }
    list.innerHTML = items.map((it) => {
      const date = new Date(it.ts);
      const modeLabel = { error: 'Error', code: 'Code', stack: 'Stack Trace' }[it.mode] || it.mode;
      return `
        <div class="history-item" data-id="${it.id}">
          <span class="dot dot-blue"></span>
          <div class="h-main">
            <div class="h-title">${escapeHtml(it.summary || it.input.slice(0, 60))}</div>
            <div class="h-meta">${modeLabel} · ${date.toLocaleString()}</div>
          </div>
          <button class="h-del" data-del="${it.id}" aria-label="Delete">✕</button>
        </div>
      `;
    }).join('');

    $$('.history-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.h-del')) return;
        const record = window.DevLensHistory.get(el.dataset.id);
        if (!record) return;
        showView('analyzer');
        state.mode = record.mode;
        $$('.toolbar-tab[data-mode]').forEach((t) => t.classList.toggle('active', t.dataset.mode === record.mode));
        $('#analyzer-input').value = record.input;
        $('#analyzer-input').placeholder = MODE_PLACEHOLDERS[record.mode];
        runAnalysis();
      });
    });
    $$('.h-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.DevLensHistory.remove(btn.dataset.del);
        renderHistory();
        toast('Removed from history.');
      });
    });
  }

  function initHistoryActions() {
    $('#btn-clear-history').addEventListener('click', () => {
      if (!window.DevLensHistory.getAll().length) return;
      window.DevLensHistory.clear();
      renderHistory();
      toast('History cleared.');
    });
  }

  /* ------------------------------- Init ------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderLangCards();
    populateLangSelect();
    initRouting();
    initMobileNav();
    initAnalyzerTabs();
    initAnalyzerActions();
    renderToolsGrid();
    initToolWorkspace();
    initHistoryActions();
  });
})();
