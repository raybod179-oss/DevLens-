/**
 * DevLens — History
 * ----------------------------------------------------------------
 * Everything a user analyzes stays on their own device. History is
 * stored in localStorage only — nothing is ever sent to a server.
 */
(function (global) {
  const STORAGE_KEY = 'devlens.history.v1';
  const MAX_ITEMS = 50;

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(entry) {
    const items = getAll();
    const record = {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      mode: entry.mode,
      input: entry.input,
      summary: entry.summary,
      result: entry.result,
    };
    items.unshift(record);
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage full or unavailable — fail silently */ }
    return record;
  }

  function remove(id) {
    const items = getAll().filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function get(id) {
    return getAll().find((i) => i.id === id) || null;
  }

  global.DevLensHistory = { getAll, save, remove, clear, get };
})(window);
