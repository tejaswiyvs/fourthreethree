/* dash.js — a tiny runtime shared by every dashboard on this site.
 *
 * Each dashboard page:
 *   1. loads d3, this file, and its own data.js (which sets window.DASH_DATA = { sourceId: [rows...] })
 *   2. marks elements with data-draw="name"
 *   3. registers drawings with dash.draw("name", fn) or dash.draw("name", {mount, update})
 *
 * dash.draw("name") with no function re-runs that drawing (e.g. after a filter changes).
 * All drawings run once the page has loaded, and again when the window width changes.
 */
(function () {
  const registry = new Map();
  const mounted = new WeakMap();
  let ready = false;

  function run(name) {
    const def = registry.get(name);
    if (!def) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach(function (el) {
      try {
        if (typeof def === 'function') def(el);
        else {
          if (!mounted.has(el)) mounted.set(el, def.mount ? def.mount(el) : undefined);
          def.update(el, mounted.get(el));
        }
      } catch (e) {
        console.error('[dash] drawing "' + name + '" failed:', e);
      }
    });
  }

  function runAll() { registry.forEach(function (_, name) { run(name); }); }

  window.dash = {
    /** Rows for a data source: { status: 'ok' | 'missing', data: [...] } */
    data: function (id) {
      const d = (window.DASH_DATA || {})[id];
      return d ? { status: 'ok', data: d } : { status: 'missing', data: [] };
    },
    /** Categorical series colours, in fixed order (CSS variables, so they follow light/dark mode). */
    colors: ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
             'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'],
    draw: function (name, def) {
      if (def === undefined) { if (ready) run(name); return; }
      registry.set(name, def);
      if (ready) run(name);
    }
  };

  function start() { ready = true; runAll(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);

  let lastWidth = window.innerWidth, timer;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(runAll, 150);
  });
  // redraw charts when the OS switches light/dark, so SVG colours stay right
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', runAll);
  }
})();
