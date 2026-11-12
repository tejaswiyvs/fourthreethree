/* Mauricio Pochettino: a data portrait — page logic. Uses d3, ../assets/dash.js and data.js. */
const D = window.DASH_DATA;
const C = dash.colors;                 // C[0] blue = Pochettino's team, C[1] orange = opponent / PSG
const f1 = d3.format('.1f'), f2 = d3.format('.2f'), fs = d3.format('+.2f');

/* ---------- helpers ---------- */
function svgIn(el, W, H, label) {
  return d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
}
function tipIn(el) { return d3.select(el).append('div').attr('class', 'pi-tip').style('opacity', 0); }
function showTip(tip, el, ev, lines) {
  tip.selectAll('*').remove();
  lines.forEach((l, i) => tip.append('div').style('font-weight', i === 0 ? 600 : 400).text(l));
  const [px, py] = d3.pointer(ev, el);
  tip.style('left', Math.max(0, Math.min(px + 12, el.clientWidth - 240)) + 'px').style('top', Math.max(0, py - 10) + 'px').style('opacity', 1);
}
function hideTip(tip) { tip.style('opacity', 0); }
function ord(n) { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* Horizontal pitch, 120x80 StatsBomb yards, attacking left to right. Returns {g, x, y, W, H}. */
function pitch(el, label, opts = {}) {
  const W = Math.max(240, el.clientWidth || 480), pad = 8;
  const pw = W - pad * 2, ph = pw * 80 / 120, H = ph + pad * 2 + (opts.extra || 0);
  const svg = svgIn(el, W, H, label);
  const x = d3.scaleLinear().domain([0, 120]).range([pad, pad + pw]);
  const y = d3.scaleLinear().domain([0, 80]).range([pad, pad + ph]);
  const g = svg.append('g');
  const line = 'var(--cds-chart-axis)';
  const lay = svg.append('g').attr('class', 'pitch-lines').style('fill', 'none').style('stroke', line).style('stroke-width', 1);
  lay.append('rect').attr('x', x(0)).attr('y', y(0)).attr('width', pw).attr('height', ph);
  lay.append('line').attr('x1', x(60)).attr('x2', x(60)).attr('y1', y(0)).attr('y2', y(80));
  lay.append('circle').attr('cx', x(60)).attr('cy', y(40)).attr('r', x(10) - x(0));
  [[0, 18], [102, 18]].forEach(([bx]) => lay.append('rect').attr('x', x(bx)).attr('y', y(18)).attr('width', x(18) - x(0)).attr('height', y(62) - y(18)));
  [[0], [114]].forEach(([bx]) => lay.append('rect').attr('x', x(bx)).attr('y', y(30)).attr('width', x(6) - x(0)).attr('height', y(50) - y(30)));
  if (!opts.noArrow) svg.append('text').attr('x', x(60)).attr('y', y(80) + 14 > H ? H - 2 : y(80) - 4).attr('text-anchor', 'middle').style('font-size', '11px').text('attacking →');
  return {svg, g, lay, x, y, W, H, pw, ph};
}
/* Draw a value grid [nx][ny] on a pitch as cells with opacity proportional to value. */
function heatCells(P, grid, color, tip, el, fmt) {
  const nx = grid.length, ny = grid[0].length, cw = P.pw / nx, ch = P.ph / ny;
  const max = d3.max(grid.flat()) || 1;
  const cells = [];
  grid.forEach((col, i) => col.forEach((v, j) => cells.push({i, j, v})));
  P.g.selectAll('rect.c').data(cells).join('rect').attr('class', 'c')
    .attr('x', d => P.x(0) + d.i * cw).attr('y', d => P.y(0) + d.j * ch).attr('width', cw).attr('height', ch)
    .style('fill', color).style('fill-opacity', d => 0.04 + 0.86 * Math.sqrt(d.v / max))
    .on('pointerenter pointermove', (ev, d) => showTip(tip, el, ev, [fmt(d.v)]))
    .on('pointerleave', () => hideTip(tip));
}

/* ---------- 1. timeline ---------- */
const JOBS = [
  {club: 'Espanyol', from: '2009-01-20', to: '2012-11-26', ctx: true, notes: ['La Liga survival, then mid-table']},
  {club: 'Southampton', from: '2013-01-18', to: '2014-05-27', ctx: true, notes: ['8th in 2013–14']},
  {club: 'Tottenham', from: '2014-05-27', to: '2019-11-19', notes: ['5th · 3rd · 2nd · 3rd · 4th', 'League Cup final 2015', 'Champions League final 2019']},
  {club: 'PSG', from: '2021-01-02', to: '2022-07-05', notes: ['Ligue 1 champions 2021–22', 'Coupe de France 2021', 'Trophée des Champions 2020']},
  {club: 'Chelsea', from: '2023-07-01', to: '2024-05-21', notes: ['6th', 'League Cup final 2024']},
  {club: 'USMNT', from: '2024-09-10', to: '2026-11-11', ongoing: true, notes: ['Gold Cup final 2025', 'World Cup 2026: group winners, last 16', 'Contract to 2030']}
];
dash.draw('timeline', el => {
  el.replaceChildren();
  const W = el.clientWidth || 900, narrow = W < 640, H = narrow ? 70 + JOBS.length * 58 : 300;
  const svg = svgIn(el, W, H, 'Timeline of Pochettino’s coaching jobs from 2009 to now');
  const P = d => new Date(d);
  if (!narrow) {
    const x = d3.scaleTime().domain([P('2008-09-01'), P('2027-06-01')]).range([10, W - 10]);
    svg.append('g').attr('transform', `translate(0,${H - 22})`).call(d3.axisBottom(x).ticks(d3.timeYear.every(2)).tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    JOBS.forEach((j, i) => {
      const x0 = x(P(j.from)), x1 = x(P(j.to)), yb = 120;
      svg.append('rect').attr('x', x0).attr('y', yb).attr('width', Math.max(4, x1 - x0)).attr('height', 26).attr('rx', 5)
        .style('fill', j.ctx ? 'var(--cds-chart-muted)' : C[0]).style('fill-opacity', j.ctx ? 0.35 : (j.ongoing ? 0.6 : 0.9));
      if (j.ongoing) svg.append('path').attr('d', `M${x1},${yb} l10,13 l-10,13 z`).style('fill', C[0]).style('fill-opacity', 0.6);
      const up = i % 2 === 0;
      const ty = up ? yb - 12 : yb + 44 + (j.ongoing ? 62 : 0);
      const last = i === JOBS.length - 1, tx = last ? Math.min(W - 6, x1 + 10) : x0, anc = last ? 'end' : 'start';
      svg.append('text').attr('class', 'strong').attr('x', tx).attr('text-anchor', anc).attr('y', up ? ty - (j.notes.length) * 14 : ty).text(j.club);
      j.notes.forEach((n, k) => svg.append('text').attr('x', tx).attr('text-anchor', anc).attr('y', up ? ty - (j.notes.length - 1 - k) * 14 : ty + 15 + k * 14).text(n));
    });
  } else {
    JOBS.forEach((j, i) => {
      const y0 = 10 + i * 58;
      svg.append('rect').attr('x', 0).attr('y', y0).attr('width', 6).attr('height', 46).attr('rx', 3).style('fill', j.ctx ? 'var(--cds-chart-muted)' : C[0]);
      svg.append('text').attr('class', 'strong').attr('x', 14).attr('y', y0 + 12).text(j.club + ' · ' + j.from.slice(0, 4) + '–' + (j.ongoing ? 'now' : j.to.slice(0, 4)));
      j.notes.slice(0, 2).forEach((n, k) => svg.append('text').attr('x', 14).attr('y', y0 + 28 + k * 14).text(n));
    });
  }
});

/* ---------- 2. career arc ---------- */
let ARC = 'xg';
document.querySelectorAll('[data-arc]').forEach(b => b.addEventListener('click', () => {
  ARC = b.getAttribute('data-arc');
  document.querySelectorAll('[data-arc]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  dash.draw('arcline');
}));
function rolling(arr, k, f) { return arr.map((d, i) => { const s = arr.slice(Math.max(0, i - k + 1), i + 1).map(f).filter(v => v != null); return s.length >= Math.min(k, 5) ? d3.mean(s) : null; }); }
dash.draw('arcline', el => {
  el.replaceChildren();
  const rows = D.arc.map((d, i) => Object.assign({i: i + (d.club === 'Chelsea' ? 8 : 0)}, d));   // gap between clubs
  const W = el.clientWidth || 900, H = 340, m = {t: 24, r: 24, b: 36, l: 44};
  const svg = svgIn(el, W, H, 'Rolling 10-match underlying numbers across Pochettino’s Tottenham and Chelsea league matches');
  const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.i)]).range([m.l, W - m.r]);
  const series = {
    xg: [{key: 'npxG for', f: d => d.npxg, c: C[0]}, {key: 'npxG against', f: d => d.npxga, c: C[1]}],
    ppda: [{key: 'PPDA (lower = more pressing)', f: d => d.ppda, c: C[0]}, {key: 'Opponent PPDA (how much they were pressed)', f: d => d.oppda, c: 'var(--cds-chart-muted)'}],
    deep: [{key: 'Deep completions for', f: d => d.deep, c: C[0]}, {key: 'Deep completions against', f: d => d.deep_a, c: C[1]}],
    pts: [{key: 'Points per game', f: d => d.pts, c: C[0]}, {key: 'Expected points per game', f: d => d.xpts, c: 'var(--cds-chart-muted)'}]
  }[ARC];
  const lines = series.map(s => ({s, v: rolling(rows, 10, s.f)}));
  const allv = lines.flatMap(l => l.v).filter(v => v != null);
  const y = d3.scaleLinear().domain([Math.min(0, d3.min(allv)), d3.max(allv) * 1.12]).nice().range([H - m.b, m.t]);
  // season bands
  const seas = d3.groups(rows, d => d.club + ' ' + d.season);
  seas.forEach(([k, rs], i) => {
    const a = x(rs[0].i), b = x(rs[rs.length - 1].i);
    svg.append('rect').attr('x', a).attr('y', m.t).attr('width', Math.max(1, b - a)).attr('height', H - m.b - m.t).style('fill', 'var(--cds-chart-muted)').style('opacity', i % 2 ? 0.05 : 0.11);
    svg.append('text').attr('x', (a + b) / 2).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text((rs[0].club === 'Chelsea' ? 'CHE ' : '') + rs[0].season.replace('20', '’').replace('-', '–'));
  });
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  lines.forEach(({s, v}) => {
    const pts = rows.map((d, i) => ({x: d.i, y: v[i], club: d.club})).filter(p => p.y != null);
    d3.groups(pts, p => p.club).forEach(([, ps]) => svg.append('path').datum(ps).attr('d', d3.line().x(p => x(p.x)).y(p => y(p.y))).style('fill', 'none').style('stroke', s.c).style('stroke-width', 2));
  });
  // legend
  const lg = svg.append('g').attr('transform', `translate(${m.l + 4},${m.t - 10})`);
  let lx = 0;
  series.forEach(s => { lg.append('rect').attr('x', lx).attr('y', -8).attr('width', 14).attr('height', 3).style('fill', s.c); const t = lg.append('text').attr('x', lx + 18).attr('y', -4).text(s.key); lx += t.node().getComputedTextLength() + 36; });
  if (ARC === 'ppda') svg.append('text').attr('x', W - m.r).attr('y', H - m.b - 6).attr('text-anchor', 'end').text('No PPDA in the Chelsea source data');
  // hover
  const tip = tipIn(el);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.b - m.t).style('fill', 'transparent')
    .on('pointermove', ev => {
      const [px] = d3.pointer(ev); const xi = x.invert(px);
      const idx = d3.minIndex(rows, d => Math.abs(d.i - xi)); const d = rows[idx];
      showTip(tip, el, ev, [d.club + ' · ' + d.date + ' (' + (d.ha === 'h' ? 'home' : 'away') + ')', 'Score ' + d.gf + '–' + d.ga + ' · npxG ' + f2(d.npxg) + '–' + f2(d.npxga),
        ...lines.map(l => l.s.key + ' (10-match): ' + (l.v[idx] == null ? '—' : f2(l.v[idx])))]);
    }).on('pointerleave', () => hideTip(tip));
});

dash.draw('seasonbars', el => {
  el.replaceChildren();
  const S = D.seasons, W = el.clientWidth || 900;
  const panels = [
    {k: 'npxgd', t: 'npxG difference per game', r: 'rank_npxgd', fmt: fs},
    {k: 'npxg', t: 'npxG per game', r: 'rank_npxg', fmt: f2},
    {k: 'npxga', t: 'npxG against per game', r: 'rank_npxga', fmt: f2, low: true},
    {k: 'ppda', t: 'PPDA (lower = more pressing)', r: 'rank_ppda', fmt: f1, low: true},
    {k: 'deep', t: 'Deep completions per game', fmt: f1},
    {k: 'ptsgap', t: 'Points minus expected points', fmt: d3.format('+.0f')}
  ];
  S.forEach(s => s.ptsgap = s.pts - s.xpts);
  const cols = W < 560 ? 1 : (W < 900 ? 2 : 3), pw = (W - (cols - 1) * 24) / cols, ph = 170;
  const rowsN = Math.ceil(panels.length / cols), H = rowsN * (ph + 34);
  const svg = svgIn(el, W, H, 'Season-by-season underlying numbers with league ranks');
  panels.forEach((p, i) => {
    const gx = (i % cols) * (pw + 24), gy = Math.floor(i / cols) * (ph + 34);
    const g = svg.append('g').attr('transform', `translate(${gx},${gy})`);
    g.append('text').attr('class', 'strong').attr('x', 0).attr('y', 12).text(p.t);
    const vals = S.map(s => s[p.k]).filter(v => v != null);
    const x = d3.scaleBand().domain(S.map(s => s.club === 'Chelsea' ? 'CHE ’23' : s.season.replace('20', '’').slice(0, 3))).range([0, pw]).padding(0.25);
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(vals)), Math.max(0, d3.max(vals)) * 1.25]).nice().range([ph, 34]);
    g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'var(--cds-chart-axis)');
    S.forEach(s => {
      const v = s[p.k], key = s.club === 'Chelsea' ? 'CHE ’23' : s.season.replace('20', '’').slice(0, 3);
      g.append('text').attr('x', x(key) + x.bandwidth() / 2).attr('y', ph + 14).attr('text-anchor', 'middle').style('font-size', '11px').text(key);
      if (v == null) { g.append('text').attr('x', x(key) + x.bandwidth() / 2).attr('y', y(0) - 4).attr('text-anchor', 'middle').style('font-size', '11px').text('n/a'); return; }
      g.append('rect').attr('x', x(key)).attr('width', x.bandwidth()).attr('y', Math.min(y(v), y(0))).attr('height', Math.abs(y(v) - y(0))).attr('rx', 3)
        .style('fill', s.club === 'Chelsea' ? C[6] : C[0]).style('fill-opacity', s.games < 38 ? 0.45 : 0.9);
      g.append('text').attr('x', x(key) + x.bandwidth() / 2).attr('y', v >= 0 ? y(v) - 4 : y(v) + 12).attr('text-anchor', 'middle').style('font-size', '11px')
        .text(p.fmt(v) + (p.r && s[p.r] ? ' (' + s[p.r] + ')' : ''));
    });
  });
  svg.append('text').attr('x', W).attr('y', H - 2).attr('text-anchor', 'end').style('font-size', '11px').text('Faded bar: 2019–20, 12 games before his dismissal. Purple: Chelsea.');
});

/* ---------- 3/4. team anatomy (shared by Spurs and PSG) ---------- */
const LAB = {spurs: 'Spurs 2015–16', psg: 'PSG 2021–22'};
function drawTiles(key) {
  dash.draw('tiles-' + key, el => {
    el.replaceChildren();
    const groups = d3.groups(D.kpis, k => k.group);
    groups.forEach(([gname, ks]) => {
      const h = document.createElement('div'); h.className = 'po-group'; h.textContent = gname; el.appendChild(h);
      const wrap = document.createElement('div'); wrap.className = 'po-tiles'; el.appendChild(wrap);
      ks.forEach(k => {
        const v = key === 'spurs' ? k.spurs : k.psg;
        const t = document.createElement('div'); t.className = 'po-tile';
        const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = k.label; t.appendChild(lab);
        const val = document.createElement('div'); val.className = 'val'; val.textContent = (Math.abs(v) >= 100 ? d3.format('.0f')(v) : f1(v));
        const u = document.createElement('small'); u.textContent = k.unit; val.appendChild(u); t.appendChild(val);
        if (key === 'spurs') {
          const r = document.createElement('div'); r.className = 'rank' + (k.spurs_rank <= 3 ? ' top' : ''); r.textContent = ord(k.spurs_rank) + ' of 20'; val.appendChild(r);
        }
        // range strip: PL min..max, with markers
        const W = 190, H = 26;
        const ext = key === 'spurs' ? [k.pl_min, k.pl_max, v] : [v, k.spurs, k.psg_opp ?? v];
        const pad = (d3.max(ext) - d3.min(ext)) * (key === 'spurs' ? 0 : 0.12) || 1;
        const lo = d3.min(ext) - pad, hi = d3.max(ext) + pad;
        const x = d3.scaleLinear().domain([lo, hi]).range([6, W - 6]);
        const s = d3.select(t).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img')
          .attr('aria-label', 'Position within the Premier League 2015–16 range');
        if (key === 'spurs') s.append('rect').attr('x', x(k.pl_min)).attr('y', 9).attr('width', Math.max(2, x(k.pl_max) - x(k.pl_min))).attr('height', 6).attr('rx', 3).style('fill', 'var(--cds-chart-grid)');
        if (key === 'spurs') s.append('line').attr('x1', x(k.pl_avg)).attr('x2', x(k.pl_avg)).attr('y1', 5).attr('y2', 19).style('stroke', 'var(--cds-chart-reference)');
        if (key === 'psg' && k.psg_opp != null) s.append('circle').attr('cx', x(k.psg_opp)).attr('cy', 12).attr('r', 4.5).style('fill', 'var(--color-panel)').style('stroke', C[1]).style('stroke-width', 2);
        if (key === 'psg') s.append('line').attr('x1', 6).attr('x2', W - 6).attr('y1', 12).attr('y2', 12).style('stroke', 'var(--cds-chart-grid)').style('stroke-width', 2).lower();
        if (key === 'psg') s.append('circle').attr('cx', x(k.spurs)).attr('cy', 12).attr('r', 3.5).style('fill', 'var(--cds-chart-muted)');
        s.append('circle').attr('cx', x(v)).attr('cy', 12).attr('r', 5.5).style('fill', key === 'spurs' ? C[0] : C[1]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
        const cap = document.createElement('div'); cap.className = 'pi-muted'; cap.style.fontSize = '11px';
        cap.textContent = key === 'spurs' ? 'PL range ' + f1(k.pl_min) + '–' + f1(k.pl_max) + ' · avg ' + f1(k.pl_avg)
          : 'Opponents ' + (k.psg_opp != null ? f1(k.psg_opp) : '—') + ' · Spurs ’16 ' + f1(k.spurs) + ' (grey)';
        t.appendChild(cap);
        wrap.appendChild(t);
      });
    });
  });
}

function drawZone(key) {
  dash.draw('zone-' + key, el => {
    el.replaceChildren();
    const z = D.zones[key], P = pitch(el, 'Zone dominance map for ' + LAB[key]), tip = tipIn(el);
    const nx = 6, ny = 5, cw = P.pw / nx, ch = P.ph / ny, cells = [];
    z.share.forEach((col, i) => col.forEach((s, j) => cells.push({i, j, s, own: z.own[i][j], opp: z.opp[i][j]})));
    const col = s => s > 55 ? C[0] : (s < 45 ? C[1] : 'var(--cds-chart-muted)');
    const op = s => s > 55 || s < 45 ? 0.25 + Math.min(0.65, Math.abs(s - 50) / 30) : 0.18;
    P.g.selectAll('rect').data(cells).join('rect').attr('x', d => P.x(0) + d.i * cw + 1).attr('y', d => P.y(0) + d.j * ch + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3)
      .style('fill', d => col(d.s)).style('fill-opacity', d => op(d.s))
      .on('pointerenter pointermove', (ev, d) => showTip(tip, el, ev, [d.s + '% of touches', 'Team ' + d3.format(',')(d.own) + ' · opponents ' + d3.format(',')(d.opp)]))
      .on('pointerleave', () => hideTip(tip));
    P.g.selectAll('text.v').data(cells).join('text').attr('x', d => P.x(0) + d.i * cw + cw / 2).attr('y', d => P.y(0) + d.j * ch + ch / 2 + 4).attr('text-anchor', 'middle')
      .style('font-size', P.W < 420 ? '10px' : '12px').style('fill', 'var(--color-fg)').style('pointer-events', 'none').text(d => Math.round(d.s));
    P.lay.raise();
    const dom = cells.filter(d => d.s > 55).length, con = cells.filter(d => d.s < 45).length;
    const stats = d3.select(el).append('div').attr('class', 'po-stats');
    stats.append('span').html(''); stats.append('span').text('Dominant in ').append('b').text(dom + ' of 30 zones');
    stats.append('span').text('Opponent dominant in ').append('b').text(con);
    if (key === 'spurs') {
      const rank = [...D.zone_league].sort((a, b) => b.dominant - a.dominant);
      stats.append('span').text('Most-dominant PL sides: ' + rank.slice(0, 3).map(r => r.team.replace('Tottenham Hotspur', 'Spurs').replace('Manchester City', 'Man City') + ' ' + r.dominant).join(' · '));
    }
  });
}

function drawPress(key) {
  dash.draw('press-' + key, el => {
    el.replaceChildren();
    const p = D.pressures[key], P = pitch(el, 'Pressing heat map for ' + LAB[key]), tip = tipIn(el);
    heatCells(P, p.grid, C[0], tip, el, v => f1(v) + ' pressures per match here');
    P.lay.raise();
    const s = d3.select(el).append('div').attr('class', 'po-stats');
    s.append('span').text('Pressures per match ').append('b').text(f1(p.per_match));
    s.append('span').text('In the attacking third ').append('b').text(f1(p.att_third_pct) + '%');
    s.append('span').text('Counter-presses ').append('b').text(f1(p.counter_pct) + '%');
  });
}

function drawNet(key) {
  dash.draw('net-' + key, el => {
    el.replaceChildren();
    const N = D.network[key], P = pitch(el, 'Positional passing network for ' + LAB[key]), tip = tipIn(el);
    const pos = Object.fromEntries(N.nodes.map(n => [n.pos, n]));
    const maxL = d3.max(N.links, l => l.n) || 1, maxT = d3.max(N.nodes, n => n.touches);
    const r = d3.scaleSqrt().domain([0, maxT]).range([4, P.W < 420 ? 12 : 16]);
    N.nodes.forEach(n => { n.px = P.x(n.x); n.py = P.y(n.y); });
    const sim = d3.forceSimulation(N.nodes.map(n => ({n, x: n.px, y: n.py, ox: n.px, oy: n.py})))
      .force('c', d3.forceCollide(d => r(d.n.touches) + 3)).force('x', d3.forceX(d => d.ox).strength(0.2)).force('y', d3.forceY(d => d.oy).strength(0.2)).stop();
    for (let i = 0; i < 120; i++) sim.tick();
    sim.nodes().forEach(d => { d.n.px = d.x; d.n.py = d.y; });
    P.g.selectAll('line.l').data(N.links.filter(l => pos[l.s] && pos[l.t])).join('line')
      .attr('x1', l => pos[l.s].px).attr('y1', l => pos[l.s].py).attr('x2', l => pos[l.t].px).attr('y2', l => pos[l.t].py)
      .style('stroke', C[0]).style('stroke-opacity', l => 0.15 + 0.7 * l.n / maxL).style('stroke-width', l => 1 + 6 * l.n / maxL).style('stroke-linecap', 'round');
    const g = P.g.selectAll('g.n').data(N.nodes).join('g').attr('transform', n => `translate(${n.px},${n.py})`)
      .on('pointerenter pointermove', (ev, n) => showTip(tip, el, ev, [n.pos, n.players, d3.format(',')(n.touches) + ' touches in total']))
      .on('pointerleave', () => hideTip(tip));
    g.append('circle').attr('r', n => r(n.touches)).style('fill', 'var(--color-panel)').style('stroke', C[0]).style('stroke-width', 2.5);
    g.append('text').attr('text-anchor', 'middle').attr('y', 4).style('font-size', '10px').style('fill', 'var(--color-fg)').style('font-weight', 600).text(n => n.pos);
    const top = [...N.links].sort((a, b) => b.n - a.n).slice(0, 3);
    d3.select(el).append('div').attr('class', 'po-stats').append('span').text('Busiest links: ').append('b').text(top.map(l => l.s + '→' + l.t + ' ' + f1(l.n)).join(' · '));
  });
}

function drawXtZone(key) {
  dash.draw('xtzone-' + key, el => {
    el.replaceChildren();
    const z = D.xt[key].zone, P = pitch(el, 'Expected threat added by starting zone for ' + LAB[key]), tip = tipIn(el);
    heatCells(P, z, C[2], tip, el, v => f2(v) + ' xT per match from moves starting here');
    P.lay.raise();
    const tot = d3.sum(z.flat()), att = d3.sum(z.slice(11).flat()), wide = d3.sum(z.map(c => c[0] + c[1] + c[10] + c[11]));
    const s = d3.select(el).append('div').attr('class', 'po-stats');
    s.append('span').text('Total xT per match ').append('b').text(f2(tot));
    s.append('span').text('From the last 37.5 yards ').append('b').text(d3.format('.0%')(att / tot));
    s.append('span').text('From the wide channels ').append('b').text(d3.format('.0%')(wide / tot));
  });
}

function drawFb(key) {
  dash.draw('fb-' + key, el => {
    el.replaceChildren();
    ['RB', 'LB'].forEach(side => {
      const f = D.fullbacks[key + '_' + side], b = D.fullbacks['pl_' + side];
      const box = document.createElement('div'); el.appendChild(box);
      const h = document.createElement('div'); h.className = 'pi-muted'; h.style.margin = '6px 0 2px'; h.textContent = (side === 'RB' ? 'Right back: ' : 'Left back: ') + f.players; box.appendChild(h);
      const fig = document.createElement('div'); fig.style.position = 'relative'; box.appendChild(fig);
      const P = pitch(fig, (side === 'RB' ? 'Right' : 'Left') + '-back touch map for ' + LAB[key], {noArrow: true}), tip = tipIn(fig);
      heatCells(P, f.grid, C[0], tip, fig, v => f1(v) + ' touches per match here');
      P.g.append('circle').attr('cx', P.x(f.avg_x)).attr('cy', P.y(f.avg_y)).attr('r', 6).style('fill', C[0]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
      P.g.append('circle').attr('cx', P.x(b.avg_x)).attr('cy', P.y(b.avg_y)).attr('r', 5).style('fill', 'none').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 2);
      P.lay.raise();
      const s = d3.select(box).append('div').attr('class', 'po-stats');
      s.append('span').text('Touches/match ').append('b').text(f1(f.touches_pm) + ' (PL ' + f1(b.touches_pm) + ')');
      s.append('span').text('In final third ').append('b').text(f1(f.final_third_pct) + '% (PL ' + f1(b.final_third_pct) + '%)');
      s.append('span').text('Inside channels in final third ').append('b').text(f1(f.halfspace_f3_pct) + '%');
    });
    const n = document.createElement('div'); n.className = 'pi-muted'; n.style.fontSize = '11px'; n.textContent = 'Filled dot: average touch position. Hollow: average Premier League 2015–16 full-back.'; el.appendChild(n);
  });
}

function drawGk(key) {
  dash.draw('gk-' + key, el => {
    el.replaceChildren();
    const g = D.goal_kicks[key], P = pitch(el, 'Goal kick landing spots for ' + LAB[key]);
    P.g.selectAll('circle').data(g.kicks).join('circle').attr('cx', d => P.x(d[0])).attr('cy', d => P.y(d[1])).attr('r', 3.2)
      .style('fill', d => d[2] < 32 ? C[0] : 'var(--cds-chart-muted)').style('fill-opacity', 0.75).style('stroke', d => d[3] ? 'none' : 'var(--color-bad)');
    P.lay.raise();
    const s = d3.select(el).append('div').attr('class', 'po-stats');
    s.append('span').text('Played short ').append('b').text(f1(g.short_pct) + '%');
    s.append('span').text('PL 2015–16 average ').append('b').text(f1(D.goal_kicks.pl_short_pct) + '%');
    s.append('span').text('Kept the ball ').append('b').text(f1(g.retained_pct) + '%');
    s.append('span').text('Goal kicks ').append('b').text(g.n);
  });
}

function drawShots(key) {
  dash.draw('shots-' + key, el => {
    el.replaceChildren();
    const sh = D.shots[key];
    const P = pitch(el, 'Shot maps for and against ' + LAB[key], {noArrow: true}), tip = tipIn(el);
    // own shots on the right half (attacking right), opponent shots mirrored onto the left half
    const r = d3.scaleSqrt().domain([0, 0.8]).range([1.5, P.W < 420 ? 9 : 12]);
    const pts = sh.for_.map(d => ({x: d[0], y: d[1], xg: d[2], g: d[3], who: 'for'})).concat(sh.against.map(d => ({x: 120 - d[0], y: 80 - d[1], xg: d[2], g: d[3], who: 'against'})));
    P.g.selectAll('circle').data(pts).join('circle').attr('cx', d => P.x(d.x)).attr('cy', d => P.y(d.y)).attr('r', d => r(d.xg))
      .style('fill', d => d.g ? (d.who === 'for' ? C[0] : C[1]) : 'none').style('stroke', d => d.who === 'for' ? C[0] : C[1]).style('stroke-width', 1).style('fill-opacity', 0.85).style('stroke-opacity', 0.6)
      .on('pointerenter pointermove', (ev, d) => showTip(tip, el, ev, [(d.who === 'for' ? 'Shot' : 'Opponent shot') + (d.g ? ' · goal' : ''), 'xG ' + f2(d.xg)]))
      .on('pointerleave', () => hideTip(tip));
    P.lay.raise();
    P.svg.append('text').attr('x', P.x(30)).attr('y', P.y(80) - 4).attr('text-anchor', 'middle').style('font-size', '11px').text('← shots against');
    P.svg.append('text').attr('x', P.x(90)).attr('y', P.y(80) - 4).attr('text-anchor', 'middle').style('font-size', '11px').text('shots for →');
    const s = d3.select(el).append('div').attr('class', 'po-stats');
    s.append('span').text('npxG per match ').append('b').text(f2(sh.npxg_pm) + ' for · ' + f2(sh.npxga_pm) + ' against');
    s.append('span').text('xG per shot ').append('b').text(d3.format('.3f')(sh.xg_per_shot) + ' for · ' + d3.format('.3f')(sh.xga_per_shot) + ' against');
    if (sh.top.length) s.append('span').text('Top: ').append('b').text(sh.top.slice(0, 3).map(t => t.player.split(' ').slice(-1)[0] + ' ' + t.goals + 'g/' + f1(t.xg) + 'xG').join(' · '));
  });
}

function drawXtPlayers(key) {
  dash.draw('xtplayers-' + key, el => {
    el.replaceChildren();
    const rows = D.xt[key].players.slice(0, 10), W = el.clientWidth || 420, rh = 24, m = {l: Math.min(150, W * 0.4), r: 54, t: 4};
    const H = rows.length * rh + 24;
    const svg = svgIn(el, W, H, 'Expected threat per 90 minutes by player for ' + LAB[key]);
    const x = d3.scaleLinear().domain([0, d3.max(rows, r => r.xt90)]).range([m.l, W - m.r]);
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (r, i) => `translate(0,${m.t + i * rh})`);
    g.append('text').attr('x', m.l - 8).attr('y', rh / 2 + 4).attr('text-anchor', 'end').text(r => r.player);
    g.append('rect').attr('x', m.l).attr('y', 5).attr('height', rh - 10).attr('width', r => x(r.xt90) - m.l).attr('rx', 4).style('fill', C[2]);
    g.append('text').attr('x', r => x(r.xt90) + 6).attr('y', rh / 2 + 4).text(r => d3.format('.2f')(r.xt90));
    svg.append('text').attr('x', m.l).attr('y', H - 4).style('font-size', '11px').text('xT per 90 · minutes from lineups');
  });
}

function drawMatches(key) {
  dash.draw('matches-' + key, el => {
    el.replaceChildren();
    const rows = D.matches[key], W = el.clientWidth || 900, H = 300, m = {t: 18, r: 44, b: 40, l: 40};
    const svg = svgIn(el, W, H, 'Match-by-match xG for and against with PPDA for ' + LAB[key]);
    const x = d3.scaleBand().domain(rows.map((r, i) => i)).range([m.l, W - m.r]).padding(0.2);
    const mx = d3.max(rows, r => Math.max(r.xg, r.xga));
    const y = d3.scaleLinear().domain([-mx, mx]).nice().range([H - m.b, m.t]);
    const y2 = d3.scaleLinear().domain([0, d3.max(rows, r => r.ppda) * 1.1]).range([H - m.b, m.t]);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(v => Math.abs(v)).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
    svg.append('g').attr('transform', `translate(${W - m.r},0)`).call(d3.axisRight(y2).ticks(4)).call(a => a.selectAll('line,path').style('stroke', 'var(--cds-chart-axis)'));
    svg.append('text').attr('x', m.l).attr('y', m.t - 6).text('xG for ↑ / against ↓');
    svg.append('text').attr('x', W - m.r).attr('y', m.t - 6).attr('text-anchor', 'end').text('PPDA');
    const tip = tipIn(el);
    const g = svg.selectAll('g.m').data(rows).join('g')
      .on('pointerenter pointermove', (ev, r) => showTip(tip, el, ev, [r.date + ' · ' + (r.home ? 'vs ' : 'at ') + r.opponent, 'Score ' + r.gf + '–' + r.ga, 'xG ' + f2(r.xg) + ' – ' + f2(r.xga), 'PPDA ' + r.ppda + ' · 10+ pass moves ' + r.seq10 + ' · field tilt ' + r.field_tilt + '%']))
      .on('pointerleave', () => hideTip(tip));
    g.append('rect').attr('x', (r, i) => x(i)).attr('width', x.bandwidth()).attr('y', r => y(r.xg)).attr('height', r => y(0) - y(r.xg)).attr('rx', 2).style('fill', C[0]);
    g.append('rect').attr('x', (r, i) => x(i)).attr('width', x.bandwidth()).attr('y', y(0)).attr('height', r => y(-r.xga) - y(0)).attr('rx', 2).style('fill', C[1]);
    g.append('rect').attr('x', (r, i) => x(i)).attr('width', x.bandwidth()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent');
    svg.append('path').datum(rows).attr('d', d3.line().x((r, i) => x(i) + x.bandwidth() / 2).y(r => y2(r.ppda))).style('fill', 'none').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.5).style('stroke-dasharray', '3 2');
    svg.selectAll('text.res').data(rows).join('text').attr('x', (r, i) => x(i) + x.bandwidth() / 2).attr('y', H - m.b + 14).attr('text-anchor', 'middle')
      .style('font-size', x.bandwidth() < 14 ? '0px' : '10px').style('fill', r => r.gf > r.ga ? 'var(--color-ok)' : (r.gf < r.ga ? 'var(--color-bad)' : 'var(--color-fg-muted)')).text(r => r.gf > r.ga ? 'W' : (r.gf < r.ga ? 'L' : 'D'));
    svg.append('text').attr('x', m.l).attr('y', H - 6).style('font-size', '11px').text(rows[0].date.slice(0, 7) + ' → ' + rows[rows.length - 1].date.slice(0, 7));
  });
}

['spurs', 'psg'].forEach(k => { drawTiles(k); drawZone(k); drawPress(k); drawNet(k); drawXtZone(k); drawFb(k); drawGk(k); drawShots(k); drawXtPlayers(k); drawMatches(k); });

/* ---------- 5. evolution ---------- */
dash.draw('evolution', el => {
  el.replaceChildren();
  const ks = D.kpis, W = el.clientWidth || 900, rh = 28, narrow = W < 640, m = {l: narrow ? 150 : 320, r: 24, t: 30};
  const H = m.t + ks.length * rh + 30;
  const svg = svgIn(el, W, H, 'Comparison of Spurs 2015–16 and PSG 2021–22 on 20 event-data measures');
  const lg = svg.append('g').attr('transform', `translate(${m.l},12)`);
  [['Spurs 2015–16', C[0], 'f'], ['PSG 2021–22', C[1], 'f'], ['PSG’s opponents', C[1], 'h'], ['PL 2015–16 range', 'var(--cds-chart-grid)', 'b']].forEach(([t, c, kind], i) => {
    const gx = i * (narrow ? 90 : 140);
    if (kind === 'b') lg.append('rect').attr('x', gx).attr('y', -8).attr('width', 14).attr('height', 6).attr('rx', 3).style('fill', c);
    else lg.append('circle').attr('cx', gx + 6).attr('cy', -5).attr('r', 5).style('fill', kind === 'h' ? 'var(--color-panel)' : c).style('stroke', c).style('stroke-width', 2);
    lg.append('text').attr('x', gx + 16).attr('y', -1).style('font-size', narrow ? '10px' : '12px').text(t);
  });
  const tip = tipIn(el);
  ks.forEach((k, i) => {
    const gy = m.t + i * rh;
    const vals = [k.pl_min, k.pl_max, k.spurs, k.psg, k.psg_opp].filter(v => v != null);
    const x = d3.scaleLinear().domain([d3.min(vals), d3.max(vals)]).range([m.l + 8, W - m.r - 8]);
    const g = svg.append('g').attr('transform', `translate(0,${gy})`)
      .on('pointerenter pointermove', ev => showTip(tip, el, ev, [k.label, 'Spurs 2015–16: ' + f2(k.spurs) + ' (' + ord(k.spurs_rank) + ' in PL)', 'PSG 2021–22: ' + f2(k.psg), 'PSG’s opponents: ' + (k.psg_opp != null ? f2(k.psg_opp) : '—'), 'PL 2015–16 range: ' + f2(k.pl_min) + '–' + f2(k.pl_max)]))
      .on('pointerleave', () => hideTip(tip));
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rh).style('fill', i % 2 ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 3%, transparent)');
    g.append('text').attr('x', m.l - 10).attr('y', rh / 2 + 4).attr('text-anchor', 'end').text(narrow ? k.label.split(' (')[0].slice(0, 22) : k.label)
      .each(function () { let t = this.textContent; while (this.getComputedTextLength() > m.l - 16 && t.length > 6) { t = t.slice(0, -2); this.textContent = t + '…'; } });
    g.append('rect').attr('x', x(k.pl_min)).attr('y', rh / 2 - 3).attr('width', Math.max(2, x(k.pl_max) - x(k.pl_min))).attr('height', 6).attr('rx', 3).style('fill', 'var(--cds-chart-grid)');
    g.append('line').attr('x1', x(k.spurs)).attr('x2', x(k.psg)).attr('y1', rh / 2).attr('y2', rh / 2).style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.5);
    if (k.psg_opp != null) g.append('circle').attr('cx', x(k.psg_opp)).attr('cy', rh / 2).attr('r', 4.5).style('fill', 'var(--color-panel)').style('stroke', C[1]).style('stroke-width', 2);
    g.append('circle').attr('cx', x(k.spurs)).attr('cy', rh / 2).attr('r', 6).style('fill', C[0]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
    g.append('circle').attr('cx', x(k.psg)).attr('cy', rh / 2).attr('r', 6).style('fill', C[1]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
  });
  svg.append('text').attr('x', m.l + 8).attr('y', H - 8).style('font-size', '11px').text('Each row has its own scale: compare positions within a row, not across rows.');
});

/* ---------- 6. USMNT ---------- */
const RES = r => r.gf > r.ga ? 'W' : (r.gf < r.ga ? 'L' : 'D');
const RCOL = {W: 'var(--color-ok)', D: 'var(--cds-chart-muted)', L: 'var(--color-bad)'};
dash.draw('usa-tiles', el => {
  el.replaceChildren();
  const u = D.usa, w = u.filter(r => RES(r) === 'W').length, d = u.filter(r => RES(r) === 'D').length, l = u.length - w - d;
  const comp = u.filter(r => r.tournament !== 'Friendly'), cw = comp.filter(r => RES(r) === 'W').length;
  const strong = u.filter(r => r.opp_elo_pre >= 1900), sw = strong.filter(r => RES(r) === 'W').length;
  const wc = u.filter(r => r.xg != null);
  const tiles = [
    ['Record', w + 'W ' + d + 'D ' + l + 'L', u.length + ' matches since Oct 2024'],
    ['Goals per match', f2(d3.mean(u, r => r.gf)) + ' – ' + f2(d3.mean(u, r => r.ga)), 'scored – conceded'],
    ['Competitive matches', cw + ' wins in ' + comp.length, 'Nations League, Gold Cup, World Cup'],
    ['Against Elo 1900+ sides', sw + ' wins in ' + strong.length, 'the strongest opponents faced'],
    ['Elo change', d3.format('+')(u[u.length - 1].usa_elo - D.usa_pre[D.usa_pre.length - 1].usa_elo), 'from ' + D.usa_pre[D.usa_pre.length - 1].usa_elo + ' to ' + u[u.length - 1].usa_elo],
    ['World Cup 2026 xG', f2(d3.sum(wc, r => r.xg)) + ' – ' + f2(d3.sum(wc, r => r.xga)), 'for – against, 5 matches']
  ];
  tiles.forEach(([a, b, c]) => {
    const t = document.createElement('div'); t.className = 'po-tile';
    const la = document.createElement('div'); la.className = 'lab'; la.style.minHeight = '0'; la.textContent = a;
    const va = document.createElement('div'); va.className = 'val'; va.style.fontSize = '24px'; va.textContent = b;
    const ca = document.createElement('div'); ca.className = 'pi-muted'; ca.style.fontSize = '11px'; ca.textContent = c;
    t.append(la, va, ca); el.appendChild(t);
  });
});
dash.draw('usa-elo', el => {
  el.replaceChildren();
  const rows = D.usa_pre.concat(D.usa).map(r => Object.assign({}, r, {d: new Date(r.date)}));
  const W = el.clientWidth || 900, H = 300, m = {t: 18, r: 20, b: 30, l: 44};
  const svg = svgIn(el, W, H, 'USA Elo rating from 2022 to now');
  const x = d3.scaleTime().domain(d3.extent(rows, r => r.d)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(rows, r => r.usa_elo)).nice().range([H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  const start = new Date('2024-10-12');
  svg.append('line').attr('x1', x(start)).attr('x2', x(start)).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3');
  svg.append('text').attr('x', x(start) + 6).attr('y', m.t + 10).text('Pochettino’s first match');
  const wcs = new Date('2026-06-11'), wce = new Date('2026-07-07');
  svg.append('rect').attr('x', x(wcs)).attr('y', m.t).attr('width', x(wce) - x(wcs)).attr('height', H - m.b - m.t).style('fill', C[0]).style('opacity', 0.08);
  svg.append('text').attr('x', x(wcs) + 3).attr('y', H - m.b - 6).style('font-size', '11px').text('World Cup');
  svg.append('path').datum(rows).attr('d', d3.line().x(r => x(r.d)).y(r => y(r.usa_elo))).style('fill', 'none').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.5);
  const tip = tipIn(el);
  svg.selectAll('circle').data(rows).join('circle').attr('cx', r => x(r.d)).attr('cy', r => y(r.usa_elo)).attr('r', r => r.d >= start ? 4.5 : 3)
    .style('fill', r => RCOL[RES(r)]).style('stroke', 'var(--color-panel)').style('stroke-width', 1.5).style('opacity', r => r.d >= start ? 1 : 0.5)
    .on('pointerenter pointermove', (ev, r) => showTip(tip, el, ev, [r.date + ' · ' + r.opponent, r.tournament + ' · ' + r.gf + '–' + r.ga, 'USA Elo after: ' + r.usa_elo + ' · opponent Elo: ' + r.opp_elo_pre]))
    .on('pointerleave', () => hideTip(tip));
});
dash.draw('usa-results', el => {
  el.replaceChildren();
  const rows = D.usa, W = el.clientWidth || 480, H = 260, m = {t: 14, r: 10, b: 34, l: 30};
  const svg = svgIn(el, W, H, 'Goal difference in every USMNT match under Pochettino');
  const x = d3.scaleBand().domain(rows.map((r, i) => i)).range([m.l, W - m.r]).padding(0.18);
  const lim = d3.max(rows, r => Math.abs(r.gf - r.ga));
  const y = d3.scaleLinear().domain([-lim, lim]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('+')).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  const tip = tipIn(el);
  svg.selectAll('rect').data(rows).join('rect').attr('x', (r, i) => x(i)).attr('width', x.bandwidth())
    .attr('y', r => r.gf === r.ga ? y(0) - 1.5 : Math.min(y(r.gf - r.ga), y(0))).attr('height', r => r.gf === r.ga ? 3 : Math.abs(y(r.gf - r.ga) - y(0))).attr('rx', 2)
    .style('fill', r => RCOL[RES(r)]).style('opacity', r => r.tournament === 'Friendly' ? 0.55 : 1)
    .on('pointerenter pointermove', (ev, r) => showTip(tip, el, ev, [r.date + ' · ' + r.opponent, r.tournament + ' · ' + r.gf + '–' + r.ga, 'Opponent Elo ' + r.opp_elo_pre]))
    .on('pointerleave', () => hideTip(tip));
  svg.append('text').attr('x', m.l).attr('y', H - 18).style('font-size', '11px').text(rows[0].date.slice(0, 7) + ' → ' + rows[rows.length - 1].date.slice(0, 7));
  svg.append('text').attr('x', m.l).attr('y', H - 4).style('font-size', '11px').text('Faded: friendlies · solid: competitive matches');
});
dash.draw('usa-wc', el => {
  el.replaceChildren();
  const rows = D.usa.filter(r => r.xg != null), W = el.clientWidth || 480, H = 260, m = {t: 30, r: 10, b: 40, l: 34};
  const svg = svgIn(el, W, H, 'USA expected goals for and against at the 2026 World Cup');
  const x0 = d3.scaleBand().domain(rows.map(r => r.opponent)).range([m.l, W - m.r]).padding(0.25);
  const x1 = d3.scaleBand().domain(['xg', 'xga']).range([0, x0.bandwidth()]).padding(0.1);
  const y = d3.scaleLinear().domain([0, d3.max(rows, r => Math.max(r.xg, r.xga)) * 1.15]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  const g = svg.selectAll('g.m').data(rows).join('g').attr('transform', r => `translate(${x0(r.opponent)},0)`);
  [['xg', C[0]], ['xga', C[1]]].forEach(([k, c]) => {
    g.append('rect').attr('x', x1(k)).attr('width', x1.bandwidth()).attr('y', r => y(r[k])).attr('height', r => y(0) - y(r[k])).attr('rx', 3).style('fill', c);
    g.append('text').attr('x', x1(k) + x1.bandwidth() / 2).attr('y', r => y(r[k]) - 4).attr('text-anchor', 'middle').style('font-size', '10px').text(r => f2(r[k]));
  });
  g.append('text').attr('x', x0.bandwidth() / 2).attr('y', H - m.b + 14).attr('text-anchor', 'middle').style('font-size', '11px').text(r => r.opponent.replace('Bosnia and Herzegovina', 'Bosnia'));
  g.append('text').attr('x', x0.bandwidth() / 2).attr('y', H - m.b + 28).attr('text-anchor', 'middle').style('font-size', '11px').style('fill', r => RCOL[RES(r)]).style('font-weight', 600).text(r => r.gf + '–' + r.ga);
  const lg = svg.append('g').attr('transform', `translate(${m.l},14)`);
  [['xG for', C[0]], ['xG against', C[1]]].forEach(([t, c], i) => { lg.append('rect').attr('x', i * 90).attr('y', -8).attr('width', 10).attr('height', 10).attr('rx', 2).style('fill', c); lg.append('text').attr('x', i * 90 + 14).attr('y', 1).text(t); });
});
