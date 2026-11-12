/* Manchester United: a team portrait — page logic. Uses d3, ../assets/dash.js and data.js. */
const D = window.DASH_DATA;
const C = dash.colors;
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


/* ---------- shim: let the shared anatomy charts read the 2015-16 block ---------- */
const SB = D.sb;
const LAB = {mu: 'Manchester United 2015–16'};
D.zones = {mu: SB.zones}; D.zone_league = SB.zone_league; D.pressures = {mu: SB.pressures}; D.network = {mu: SB.network};
D.xt = {mu: SB.xt}; D.fullbacks = SB.fullbacks; D.goal_kicks = {mu: SB.goal_kicks, pl_short_pct: SB.goal_kicks.pl_short_pct};
D.shots = {mu: SB.shots}; D.matches = {mu: SB.matches};

const SEAS = D.seasons.map(s => s.season);
const sLab = s => '’' + s.slice(2, 4);                 // '2015-16' -> ’15
const sLong = s => s.replace('-', '–');
const MAJOR = D.eras.filter(e => e.games >= 10);
const shortName = n => n.replace(' (caretaker)', '').replace('Ole Gunnar ', '').replace('Louis van Gaal', 'Van Gaal').replace('José ', '').replace('Erik ten Hag', 'Ten Hag').replace('Rúben ', '').replace('Ralf ', '').replace('Michael ', '').replace('Ruud van Nistelrooy', 'Van Nistelrooy').replace('Darren ', '');


/* ---------- shared pitch charts (same code as the Pochettino portrait) ---------- */
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
    stats.append('span').text('Dominant in ').append('b').text(dom + ' of 30 zones');
    stats.append('span').text('Opponent dominant in ').append('b').text(con);
    if (D.zone_league) {
      const rank = [...D.zone_league].sort((a, b) => b.dominant - a.dominant);
      const me = rank.findIndex(r => r.team === 'Manchester United');
      if (me >= 0) stats.append('span').text('United ranked ').append('b').text(ord(me + 1) + ' of 20');
      stats.append('span').text('Most-dominant PL sides: ' + rank.slice(0, 3).map(r => r.team.replace('Tottenham Hotspur', 'Spurs').replace('Manchester United', 'United').replace('Manchester City', 'Man City') + ' ' + r.dominant).join(' · '));
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

['mu'].forEach(k => { drawZone(k); drawPress(k); drawNet(k); drawXtZone(k); drawFb(k); drawGk(k); drawShots(k); drawXtPlayers(k); drawMatches(k); });

/* ---------- 1. timeline ---------- */
const HONOURS = {
  '2014-15': [], '2015-16': ['FA Cup'], '2016-17': ['League Cup', 'Europa League', 'Community Shield'], '2017-18': ['FA Cup final'],
  '2018-19': [], '2019-20': [], '2020-21': ['Europa League final'], '2021-22': [], '2022-23': ['League Cup', 'FA Cup final'],
  '2023-24': ['FA Cup'], '2024-25': ['Europa League final'], '2025-26': []
};
dash.draw('timeline', el => {
  el.replaceChildren();
  const W = el.clientWidth || 900, narrow = W < 640;
  const P = d => new Date(d);
  const x = d3.scaleTime().domain([P('2014-07-01'), P('2026-07-01')]).range([4, W - 4]);
  const H = narrow ? 170 : 250;
  const svg = svgIn(el, W, H, 'Timeline of Manchester United managers and league finishes, 2014 to 2026');
  const tip = tipIn(el);
  const yb = 34, bh = 30;
  D.managers.forEach((m, i) => {
    const a = x(P(m.first < '2014-07-01' ? '2014-07-01' : m.first)), b = x(P(m.last > '2026-07-01' ? '2026-07-01' : m.last));
    const g = svg.append('g').on('pointerenter pointermove', ev => {
      const e = D.eras.find(z => z.name === m.name);
      showTip(tip, el, ev, [m.name, m.first.slice(0, 7) + ' → ' + (m.last > '2026-11' ? 'now' : m.last.slice(0, 7)), e ? `${e.games} league games · ${e.w}W ${e.dr}D ${e.l}L · ${f2(e.ppg)} pts/game` : '']);
    }).on('pointerleave', () => hideTip(tip));
    g.append('rect').attr('x', a + 1).attr('y', yb).attr('width', Math.max(2, b - a - 2)).attr('height', bh).attr('rx', 4)
      .style('fill', C[0]).style('fill-opacity', m.caretaker ? 0.3 : (i % 2 ? 0.75 : 0.95));
    if (!m.caretaker && b - a > (narrow ? 34 : 60)) g.append('text').attr('x', (a + b) / 2).attr('y', yb + bh / 2 + 4).attr('text-anchor', 'middle')
      .style('fill', '#fff').style('font-weight', 600).style('font-size', narrow ? '10px' : '12px').style('pointer-events', 'none').text(narrow ? shortName(m.name) : m.name.replace('Ole Gunnar ', ''));
  });
  // carets for caretakers too narrow to label
  svg.append('text').attr('x', 4).attr('y', yb - 8).style('font-size', '11px').text('Manager (hover for record)');
  // seasons row
  const ys = yb + bh + 26;
  D.seasons.forEach(s => {
    const y0 = +s.season.slice(0, 4), a = x(P(y0 + '-08-01')), b = x(P((y0 + 1) + '-06-01')), cx = (a + b) / 2;
    const good = s.finish <= 4;
    svg.append('text').attr('x', cx).attr('y', ys).attr('text-anchor', 'middle').style('font-size', '11px').text(narrow ? sLab(s.season) : sLong(s.season).replace('20', '').replace('–20', '–'));
    svg.append('circle').attr('cx', cx).attr('cy', ys + 22).attr('r', narrow ? 11 : 14).style('fill', good ? C[0] : 'var(--color-panel)').style('stroke', good ? C[0] : 'var(--cds-chart-axis)').style('stroke-width', 1.5);
    svg.append('text').attr('x', cx).attr('y', ys + 26).attr('text-anchor', 'middle').style('font-weight', 600).style('font-size', narrow ? '10px' : '12px')
      .style('fill', good ? '#fff' : 'var(--color-fg)').text(ord(s.finish));
    if (narrow) { const won = (HONOURS[s.season] || []).filter(h => !h.includes('final') && h !== 'Community Shield').length;
      if (won) svg.append('text').attr('x', cx).attr('y', ys + 52).attr('text-anchor', 'middle').style('font-size', '11px').style('fill', 'var(--color-fg)').text('★'.repeat(won));
      return; }
    (HONOURS[s.season] || []).forEach((h, k) => {
      const t = svg.append('text').attr('x', cx).attr('y', ys + 52 + k * 14).attr('text-anchor', 'middle').style('font-size', narrow ? '8px' : '10.5px')
        .style('fill', h.includes('final') ? 'var(--cds-text-secondary)' : 'var(--color-fg)').style('font-weight', h.includes('final') ? 400 : 600);
      t.text(narrow ? h.replace('Community Shield', 'Shield').replace('Europa League', 'Europa').replace('League Cup', 'Lg Cup') : h);
    });
  });
  svg.append('text').attr('x', W - 4).attr('y', H - 4).attr('text-anchor', 'end').style('font-size', '11px').text(narrow ? 'Filled: top-four finish · ★ major trophy' : 'Filled circle: top-four finish. Bold: trophy won; grey: lost final.');
});

/* ---------- 2. arc ---------- */
let ARC = 'xg';
document.querySelectorAll('[data-arc]').forEach(b => b.addEventListener('click', () => {
  ARC = b.getAttribute('data-arc');
  document.querySelectorAll('[data-arc]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  dash.draw('arcline');
}));
function rolling(arr, k, f) { return arr.map((d, i) => { const s = arr.slice(Math.max(0, i - k + 1), i + 1).map(f).filter(v => v != null); return s.length >= 5 ? d3.mean(s) : null; }); }
dash.draw('arcline', el => {
  el.replaceChildren();
  const rows = D.arc.map((d, i) => Object.assign({i}, d));
  const W = el.clientWidth || 900, H = 360, m = {t: 44, r: 16, b: 34, l: 40};
  const svg = svgIn(el, W, H, 'Rolling 10-match underlying numbers for every Manchester United league match since 2014');
  const x = d3.scaleLinear().domain([0, rows.length - 1]).range([m.l, W - m.r]);
  const series = {
    xg: [{key: 'npxG for', f: d => d.npxg, c: C[0]}, {key: 'npxG against', f: d => d.npxga, c: C[1]}],
    ppda: [{key: 'PPDA (lower = more pressing)', f: d => d.ppda, c: C[0]}, {key: 'Opponent PPDA (how hard United were pressed)', f: d => d.oppda, c: 'var(--cds-chart-muted)'}],
    deep: [{key: 'Deep completions for', f: d => d.deep, c: C[0]}, {key: 'Deep completions against', f: d => d.deep_a, c: C[1]}],
    pts: [{key: 'Points per game', f: d => d.pts, c: C[0]}, {key: 'Expected points per game', f: d => d.xpts, c: 'var(--cds-chart-muted)'}]
  }[ARC];
  const lines = series.map(s => ({s, v: rolling(rows, 10, s.f)}));
  const allv = lines.flatMap(l => l.v).filter(v => v != null);
  const y = d3.scaleLinear().domain([Math.min(0, d3.min(allv)), d3.max(allv) * 1.08]).nice().range([H - m.b, m.t]);
  // manager bands
  const spells = []; rows.forEach(r => { const l = spells[spells.length - 1]; if (l && l.mgr === r.mgr) l.b = r.i; else spells.push({mgr: r.mgr, a: r.i, b: r.i}); });
  spells.forEach((s, i) => {
    const a = x(s.a) - (i ? (x(1) - x(0)) / 2 : 0), b = x(s.b) + (x(1) - x(0)) / 2;
    svg.append('rect').attr('x', a).attr('y', m.t).attr('width', Math.max(1, b - a)).attr('height', H - m.b - m.t).style('fill', 'var(--cds-chart-muted)').style('opacity', i % 2 ? 0.04 : 0.12);
    if (b - a > 44) svg.append('text').attr('x', (a + b) / 2).attr('y', m.t + 12).attr('text-anchor', 'middle').style('font-size', '11px').text(shortName(s.mgr));
  });
  // season ticks
  d3.groups(rows, r => r.season).forEach(([s, rs]) => {
    svg.append('text').attr('x', x(rs[0].i)).attr('y', H - m.b + 16).style('font-size', '10.5px').text(W < 600 && +s.slice(2, 4) % 2 ? '' : sLab(s));
  });
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  lines.forEach(({s, v}) => {
    svg.append('path').datum(rows.map((d, i) => ({x: d.i, y: v[i]}))).attr('d', d3.line().defined(p => p.y != null).x(p => x(p.x)).y(p => y(p.y))).style('fill', 'none').style('stroke', s.c).style('stroke-width', 2);
  });
  const lg = svg.append('g').attr('transform', `translate(${m.l},14)`); let lx = 0;
  series.forEach(s => { lg.append('rect').attr('x', lx).attr('y', -6).attr('width', 14).attr('height', 3).style('fill', s.c); const t = lg.append('text').attr('x', lx + 18).attr('y', -1).text(s.key); lx += t.node().getComputedTextLength() + 34; });
  if (ARC === 'ppda') svg.append('text').attr('x', W - m.r).attr('y', H - m.b - 6).attr('text-anchor', 'end').text('Per-match PPDA not available after April 2025');
  const tip = tipIn(el);
  const hl = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-reference)').style('opacity', 0);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.b - m.t).style('fill', 'transparent')
    .on('pointermove', ev => {
      const idx = Math.max(0, Math.min(rows.length - 1, Math.round(x.invert(d3.pointer(ev)[0])))); const d = rows[idx];
      hl.attr('x1', x(idx)).attr('x2', x(idx)).style('opacity', 1);
      showTip(tip, el, ev, [d.date + (d.opp ? ' · ' + (d.ha === 'h' ? 'vs ' : 'at ') + d.opp : ''), shortName(d.mgr) + ' · ' + d.gf + '–' + d.ga + ' · npxG ' + f2(d.npxg) + '–' + f2(d.npxga),
        ...lines.map(l => l.s.key + ' (10-match): ' + (l.v[idx] == null ? '—' : f2(l.v[idx])))]);
    }).on('pointerleave', () => { hideTip(tip); hl.style('opacity', 0); });
});

/* ---------- 3. seasons ---------- */
dash.draw('seasonbars', el => {
  el.replaceChildren();
  const S = D.seasons, B = Object.fromEntries(D.bench.map(b => [b.season, b])), W = el.clientWidth || 900;
  const panels = [
    {k: 'npxgd', t: 'npxG difference per game', r: 'rank_npxgd', fmt: fs},
    {k: 'npxg', t: 'npxG per game', r: 'rank_npxg', fmt: f2, b: 'npxg'},
    {k: 'npxga', t: 'npxG conceded per game', r: 'rank_npxga', fmt: f2, b: 'npxga'},
    {k: 'ppda', t: 'PPDA (lower = more pressing)', r: 'rank_ppda', fmt: f1, b: 'ppda'},
    {k: 'oppda', t: 'Opponent PPDA (lower = pressed harder)', r: 'rank_oppda', fmt: f1},
    {k: 'deep', t: 'Deep completions per game', r: 'rank_deep', fmt: f1, b: 'deep'},
  ];
  const cols = W < 560 ? 1 : (W < 900 ? 2 : 3), gap = 28, pw = (W - (cols - 1) * gap) / cols, ph = 190;
  const H = Math.ceil(panels.length / cols) * (ph + 40);
  const svg = svgIn(el, W, H, 'Manchester United season-by-season underlying numbers with league ranks');
  const tip = tipIn(el);
  panels.forEach((p, i) => {
    const g = svg.append('g').attr('transform', `translate(${(i % cols) * (pw + gap)},${Math.floor(i / cols) * (ph + 40)})`);
    g.append('text').attr('class', 'strong').attr('y', 12).text(p.t);
    const vals = S.map(s => s[p.k]).concat(p.b ? D.bench.map(b => b[p.b]) : []);
    const x = d3.scaleBand().domain(SEAS).range([0, pw]).padding(0.22);
    const y = d3.scaleLinear().domain([Math.min(0, d3.min(vals)), Math.max(0, d3.max(vals)) * 1.22]).nice().range([ph, 34]);
    g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'var(--cds-chart-axis)');
    S.forEach(s => {
      const v = s[p.k], cx = x(s.season) + x.bandwidth() / 2;
      g.append('rect').attr('x', x(s.season)).attr('width', x.bandwidth()).attr('y', Math.min(y(v), y(0))).attr('height', Math.max(1, Math.abs(y(v) - y(0)))).attr('rx', 2)
        .style('fill', v < 0 ? C[1] : C[0]).style('fill-opacity', 0.85)
        .on('pointerenter pointermove', ev => showTip(tip, el, ev, [sLong(s.season) + ' · ' + s.managers.replace(/ \| /g, ', '), p.t + ': ' + p.fmt(v) + (p.r ? ' (' + ord(s[p.r]) + ' of 20)' : ''), p.b ? 'Top-six standard: ' + p.fmt(B[s.season][p.b]) : '']))
        .on('pointerleave', () => hideTip(tip));
      g.append('text').attr('x', cx).attr('y', ph + 14).attr('text-anchor', 'middle').style('font-size', '10px').text(sLab(s.season));
      if (p.r && x.bandwidth() > 14) g.append('text').attr('x', cx).attr('y', v >= 0 ? y(v) - 4 : y(v) + 11).attr('text-anchor', 'middle').style('font-size', '9.5px').text(s[p.r]);
    });
    if (p.b) g.append('path').datum(S).attr('d', d3.line().x(s => x(s.season) + x.bandwidth() / 2).y(s => y(B[s.season][p.b]))).style('fill', 'none').style('stroke', 'var(--color-fg)').style('stroke-width', 1.3).style('stroke-dasharray', '4 3').style('pointer-events', 'none');
  });
});

dash.draw('route', el => {
  el.replaceChildren();
  const S = D.seasons, W = el.clientWidth || 440, H = Math.min(420, Math.max(320, W * 0.85)), m = {t: 16, r: 18, b: 40, l: 46};
  const svg = svgIn(el, W, H, 'Connected scatter of United npxG for and against by season');
  const x = d3.scaleLinear().domain(d3.extent(S.concat(D.bench), s => s.npxg)).nice().range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(S.concat(D.bench), s => s.npxga)).nice().range([m.t, H - m.b]);   // low conceded at top
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.t - m.b))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  svg.append('text').attr('x', W - m.r).attr('y', H - 6).attr('text-anchor', 'end').text('npxG per game →');
  svg.append('text').attr('x', m.l + 4).attr('y', m.t + 10).text('↑ fewer npxG conceded');
  // top-six standard cloud
  svg.selectAll('circle.b').data(D.bench).join('circle').attr('cx', b => x(b.npxg)).attr('cy', b => y(b.npxga)).attr('r', 4).style('fill', 'var(--cds-chart-muted)').style('opacity', 0.45);
  svg.append('path').datum(S).attr('d', d3.line().x(s => x(s.npxg)).y(s => y(s.npxga))).style('fill', 'none').style('stroke', C[0]).style('stroke-width', 1).style('opacity', 0.35);
  const tip = tipIn(el);
  const g = svg.selectAll('g.s').data(S).join('g').attr('transform', s => `translate(${x(s.npxg)},${y(s.npxga)})`)
    .on('pointerenter pointermove', (ev, s) => showTip(tip, el, ev, [sLong(s.season) + ' · ' + ord(s.finish), s.managers.replace(/ \| /g, ', '), 'npxG ' + f2(s.npxg) + ' for, ' + f2(s.npxga) + ' against']))
    .on('pointerleave', () => hideTip(tip));
  g.append('circle').attr('r', 6).style('fill', C[0]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
  g.append('text').attr('x', 8).attr('y', 4).style('font-size', '11px').style('fill', 'var(--color-fg)').text(s => sLab(s.season));
  svg.append('text').attr('x', m.l).attr('y', H - 6).style('font-size', '11px').text('grey dots: top-six standard');
});

dash.draw('ptsgap', el => {
  el.replaceChildren();
  const S = D.seasons, W = el.clientWidth || 440, H = 380, m = {t: 16, r: 10, b: 54, l: 34};
  const svg = svgIn(el, W, H, 'Points vs expected points by season');
  const x = d3.scaleBand().domain(SEAS).range([m.l, W - m.r]).padding(0.25);
  const y = d3.scaleLinear().domain([0, 90]).range([H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r))).call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
  const tip = tipIn(el);
  const g = svg.selectAll('g.s').data(S).join('g')
    .on('pointerenter pointermove', (ev, s) => showTip(tip, el, ev, [sLong(s.season) + ' · finished ' + ord(s.finish), s.pts + ' points · ' + f1(s.xpts) + ' expected (' + d3.format('+.0f')(s.pts - s.xpts) + ')', 'Expected points rank: ' + ord(s.rank_xpts)]))
    .on('pointerleave', () => hideTip(tip));
  g.append('rect').attr('x', s => x(s.season)).attr('width', x.bandwidth()).attr('y', s => y(s.pts)).attr('height', s => y(0) - y(s.pts)).attr('rx', 3).style('fill', C[0]).style('fill-opacity', 0.85);
  g.append('line').attr('x1', s => x(s.season) - 3).attr('x2', s => x(s.season) + x.bandwidth() + 3).attr('y1', s => y(s.xpts)).attr('y2', s => y(s.xpts)).style('stroke', 'var(--color-fg)').style('stroke-width', 2.5);
  g.append('text').attr('x', s => x(s.season) + x.bandwidth() / 2).attr('y', H - m.b + 14).attr('text-anchor', 'middle').style('font-size', '10px').text(s => sLab(s.season));
  g.append('text').attr('x', s => x(s.season) + x.bandwidth() / 2).attr('y', H - m.b + 28).attr('text-anchor', 'middle').style('font-size', '10px').style('font-weight', 600).style('fill', 'var(--color-fg)').text(s => ord(s.finish));
  g.append('text').attr('x', s => x(s.season) + x.bandwidth() / 2).attr('y', s => Math.min(y(s.pts), y(s.xpts)) - 5).attr('text-anchor', 'middle').style('font-size', '9.5px').text(s => d3.format('+.0f')(s.pts - s.xpts));
  svg.append('text').attr('x', m.l).attr('y', H - 6).style('font-size', '11px').text(W < 520 ? 'Bar: points · mark: expected · bottom: finish' : 'Bar: points · black mark: expected points · number: difference · bottom: league finish');
});

/* ---------- 4. eras ---------- */
dash.draw('eras', el => {
  el.replaceChildren();
  const E = MAJOR, W = el.clientWidth || 900, narrow = W < 700;
  const cols = [
    {k: 'ppg', t: 'Points / game', fmt: f2, alt: 'xppg', altT: 'expected'},
    {k: 'npxg', t: 'npxG for', fmt: f2},
    {k: 'npxga', t: 'npxG against', fmt: f2, low: true},
    {k: 'ppda', t: 'PPDA', fmt: f1, low: true},
    {k: 'deep', t: 'Deep compl.', fmt: f1},
    {k: 'deep_a', t: 'Deep allowed', fmt: f1, low: true},
  ];
  const all = D.arc, avg = {ppg: d3.mean(all, r => r.pts), npxg: d3.mean(all, r => r.npxg), npxga: d3.mean(all, r => r.npxga), deep: d3.mean(all, r => r.deep), deep_a: d3.mean(all, r => r.deep_a), ppda: d3.mean(D.seasons, s => s.ppda)};
  const show = W < 480 ? cols.slice(0, 3) : (narrow ? cols.slice(0, 4) : cols);
  const lw = narrow ? 92 : 170, rh = 36, top = 40, H = top + E.length * rh + 24;
  const cw = (W - lw) / show.length;
  const svg = svgIn(el, W, H, 'Manchester United managers compared on per-match underlying numbers');
  const tip = tipIn(el);
  E.forEach((e, i) => {
    const gy = top + i * rh;
    svg.append('rect').attr('x', 0).attr('y', gy).attr('width', W).attr('height', rh).style('fill', i % 2 ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 3%, transparent)');
    svg.append('text').attr('class', 'strong').attr('x', 4).attr('y', gy + 15).text(narrow ? shortName(e.name) : e.name);
    svg.append('text').attr('x', 4).attr('y', gy + 29).style('font-size', '10.5px').text((e.first.slice(0, 4) === e.last.slice(0, 4) ? e.first.slice(0, 4) : e.first.slice(0, 4) + '–' + e.last.slice(0, 4)) + ' · ' + e.games + ' games');
  });
  show.forEach((c, j) => {
    const x0 = lw + j * cw, vals = E.map(e => e[c.k]).concat(c.alt ? E.map(e => e[c.alt]) : []).filter(v => v != null);
    const x = d3.scaleLinear().domain([d3.min(vals), d3.max(vals)]).nice().range([x0 + 12, x0 + cw - 14]);
    svg.append('text').attr('class', 'strong').attr('x', x0 + cw / 2).attr('y', 16).attr('text-anchor', 'middle').style('font-size', narrow ? '11px' : null).text(narrow ? c.t.replace('Points / game', 'Pts/game').replace('npxG against', 'npxG agst') : c.t);
    if (!narrow) svg.append('text').attr('x', x0 + cw / 2).attr('y', 30).attr('text-anchor', 'middle').style('font-size', '10px').text(c.low ? 'lower is better' : (c.alt ? 'dot: actual · ring: expected' : 'higher is better'));
    if (avg[c.k] != null) svg.append('line').attr('x1', x(avg[c.k])).attr('x2', x(avg[c.k])).attr('y1', top).attr('y2', top + E.length * rh).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '2 3');
    E.forEach((e, i) => {
      const cy = top + i * rh + rh / 2, v = e[c.k];
      if (v == null) { svg.append('text').attr('x', x0 + cw / 2).attr('y', cy + 4).attr('text-anchor', 'middle').style('font-size', '10.5px').text('n/a'); return; }
      const best = c.low ? d3.min(E, z => z[c.k]) : d3.max(E, z => z[c.k]);
      if (c.alt) {
        svg.append('line').attr('x1', x(e[c.alt])).attr('x2', x(v)).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--color-fg-muted)');
        svg.append('circle').attr('cx', x(e[c.alt])).attr('cy', cy).attr('r', 5).style('fill', 'var(--color-panel)').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 2);
      }
      svg.append('circle').attr('cx', x(v)).attr('cy', cy).attr('r', 6).style('fill', v === best ? C[0] : 'color-mix(in srgb, ' + C[0] + ' 55%, var(--color-panel))').style('stroke', 'var(--color-panel)').style('stroke-width', 1.5)
        .on('pointerenter pointermove', ev => showTip(tip, el, ev, [e.name, c.t + ': ' + c.fmt(v) + (c.alt ? ' (expected ' + c.fmt(e[c.alt]) + ')' : ''), c.k === 'ppda' && e.ppda_games < e.games ? 'PPDA from ' + e.ppda_games + ' of ' + e.games + ' games' : `${e.w}W ${e.dr}D ${e.l}L`]))
        .on('pointerleave', () => hideTip(tip));
      svg.append('text').attr('x', x(v)).attr('y', cy - 9).attr('text-anchor', 'middle').style('font-size', '9.5px').text(c.fmt(v));
    });
  });
  svg.append('text').attr('x', 4).attr('y', H - 6).style('font-size', '11px').text(narrow ? 'Solid: best spell · dotted: United average · ring: expected' : 'Solid dot: best of these spells · dotted line: 12-season United average');
});

/* ---------- 5. 2015-16 tiles ---------- */
function tilesFrom(el, ks, opts = {}) {
  el.replaceChildren();
  d3.groups(ks, k => k.group).forEach(([gname, list]) => {
    const h = document.createElement('div'); h.className = 'po-group'; h.textContent = gname; el.appendChild(h);
    const wrap = document.createElement('div'); wrap.className = 'po-tiles'; el.appendChild(wrap);
    list.forEach(k => {
      const t = document.createElement('div'); t.className = 'po-tile';
      const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = k.label; t.appendChild(lab);
      const val = document.createElement('div'); val.className = 'val'; val.textContent = Math.abs(k.v) >= 100 ? d3.format('.0f')(k.v) : f1(k.v);
      const u = document.createElement('small'); u.textContent = k.unit; val.appendChild(u);
      const r = document.createElement('span'); r.className = 'rank' + (k.rank <= 3 ? ' top' : ''); r.textContent = ord(k.rank) + ' of 20'; val.appendChild(r);
      t.appendChild(val);
      const W = 190, H = 26, prev = opts.prev && opts.prev[k.key];
      const ext = [k.pl_min, k.pl_max, k.v].concat(prev ? [prev.v] : []);
      const x = d3.scaleLinear().domain(d3.extent(ext)).range([6, W - 6]);
      const s = d3.select(t).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img').attr('aria-label', 'Position within the Premier League range');
      s.append('rect').attr('x', x(k.pl_min)).attr('y', 9).attr('width', Math.max(2, x(k.pl_max) - x(k.pl_min))).attr('height', 6).attr('rx', 3).style('fill', 'var(--cds-chart-grid)');
      s.append('line').attr('x1', x(k.pl_avg)).attr('x2', x(k.pl_avg)).attr('y1', 5).attr('y2', 19).style('stroke', 'var(--cds-chart-reference)');
      if (prev) s.append('circle').attr('cx', x(prev.v)).attr('cy', 12).attr('r', 4.5).style('fill', 'var(--color-panel)').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 2);
      s.append('circle').attr('cx', x(k.v)).attr('cy', 12).attr('r', 5.5).style('fill', C[0]).style('stroke', 'var(--color-panel)').style('stroke-width', 2);
      const cap = document.createElement('div'); cap.className = 'pi-muted'; cap.style.fontSize = '11px';
      cap.textContent = prev ? `2024–25: ${f1(prev.v)} (${ord(prev.rank)}) · PL avg ${f1(k.pl_avg)}` : `PL range ${f1(k.pl_min)}–${f1(k.pl_max)} · avg ${f1(k.pl_avg)}`;
      t.appendChild(cap); wrap.appendChild(t);
    });
  });
}
dash.draw('tiles-sb', el => tilesFrom(el, SB.kpis));
dash.draw('tiles-modern', el => {
  const now = D.modern['2025-26'].kpis, prev = Object.fromEntries(D.modern['2024-25'].kpis.map(k => [k.key, k]));
  tilesFrom(el, now, {prev});
  const n = document.createElement('div'); n.className = 'pi-muted'; n.style.fontSize = '11px'; n.style.marginTop = '8px';
  n.textContent = 'Filled dot: 2025–26. Hollow dot: 2024–25. Grey band: range of the 20 Premier League sides in 2025–26, with the league average tick.';
  el.appendChild(n);
});

/* ---------- 6. Amorim vs Carrick, players ---------- */
dash.draw('split', el => {
  el.replaceChildren();
  const rows = D.arc.filter(r => r.season === '2025-26');
  const grp = [['Rúben Amorim', 'Amorim'], ['Michael Carrick', 'Carrick']].map(([n, l]) => {
    const d = rows.filter(r => r.mgr === n);
    return {l, n: d.length, ppg: d3.mean(d, r => r.pts), xppg: d3.mean(d, r => r.xpts), npxg: d3.mean(d, r => r.npxg), npxga: d3.mean(d, r => r.npxga), deep: d3.mean(d, r => r.deep), deep_a: d3.mean(d, r => r.deep_a), gf: d3.mean(d, r => r.gf), ga: d3.mean(d, r => r.ga)};
  });
  const mets = [['ppg', 'Points'], ['xppg', 'Expected points'], ['gf', 'Goals for'], ['npxg', 'npxG for'], ['ga', 'Goals against'], ['npxga', 'npxG against'], ['deep', 'Deep completions'], ['deep_a', 'Deep allowed']];
  const W = el.clientWidth || 440, rh = 30, lw = 120, H = 40 + mets.length * rh;
  const svg = svgIn(el, W, H, 'Amorim and Carrick compared within the 2025-26 season');
  const lg = svg.append('g').attr('transform', 'translate(' + lw + ',14)');
  grp.forEach((g, i) => { lg.append('circle').attr('cx', i * 150 + 6).attr('cy', -4).attr('r', 5).style('fill', i ? C[0] : 'var(--color-panel)').style('stroke', C[0]).style('stroke-width', 2); lg.append('text').attr('x', i * 150 + 16).attr('y', 0).text(g.l + ' (' + g.n + ' games)'); });
  mets.forEach(([k, t], i) => {
    const cy = 40 + i * rh + rh / 2, a = grp[0][k], b = grp[1][k];
    const x = d3.scaleLinear().domain([0, Math.max(a, b) * 1.15]).range([lw, W - 40]);
    svg.append('text').attr('x', lw - 10).attr('y', cy + 4).attr('text-anchor', 'end').text(t);
    svg.append('line').attr('x1', lw).attr('x2', W - 40).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--cds-chart-grid)');
    svg.append('line').attr('x1', x(a)).attr('x2', x(b)).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--color-fg-muted)').style('stroke-width', 2);
    svg.append('circle').attr('cx', x(a)).attr('cy', cy).attr('r', 6).style('fill', 'var(--color-panel)').style('stroke', C[0]).style('stroke-width', 2);
    svg.append('circle').attr('cx', x(b)).attr('cy', cy).attr('r', 6).style('fill', C[0]);
    svg.append('text').attr('x', Math.max(x(a), x(b)) + 10).attr('y', cy + 4).style('font-size', '10.5px').text(f2(a) + ' → ' + f2(b));
  });
});
let PS = '2025-26';
document.querySelectorAll('[data-ps]').forEach(b => b.addEventListener('click', () => {
  PS = b.getAttribute('data-ps'); document.querySelectorAll('[data-ps]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); dash.draw('players');
}));
dash.draw('players', el => {
  el.replaceChildren();
  const rows = D.modern[PS].players.slice(0, 10), W = el.clientWidth || 420, rh = 26, lw = Math.min(150, W * 0.36), H = 30 + rows.length * rh + 20;
  const svg = svgIn(el, W, H, 'Non-penalty xG and expected assists per 90 by player');
  const x = d3.scaleLinear().domain([0, d3.max(D.modern['2025-26'].players.concat(D.modern['2024-25'].players), r => r.npxg90 + r.xa90)]).range([lw, W - 50]);
  const lg = svg.append('g').attr('transform', `translate(${lw},12)`);
  [['npxG / 90', C[0]], ['xA / 90', C[2]]].forEach(([t, c], i) => { lg.append('rect').attr('x', i * 100).attr('y', -8).attr('width', 10).attr('height', 10).attr('rx', 2).style('fill', c); lg.append('text').attr('x', i * 100 + 14).attr('y', 1).text(t); });
  const tip = tipIn(el);
  const g = svg.selectAll('g.p').data(rows).join('g').attr('transform', (r, i) => `translate(0,${30 + i * rh})`)
    .on('pointerenter pointermove', (ev, r) => showTip(tip, el, ev, [r.player, r.minutes + ' minutes · ' + r.goals + ' goals', 'npxG ' + f1(r.np_xg) + ' · xA ' + f1(r.xa), 'xG chain / 90 ' + f2(r.chain90) + ' · xG buildup / 90 ' + f2(r.buildup90)]))
    .on('pointerleave', () => hideTip(tip));
  g.append('text').attr('x', lw - 8).attr('y', rh / 2 + 4).attr('text-anchor', 'end').text(r => r.player.replace('Amad Diallo Traore', 'Amad Diallo'));
  g.append('rect').attr('x', lw).attr('y', 5).attr('height', rh - 10).attr('width', r => x(r.npxg90) - lw).style('fill', C[0]);
  g.append('rect').attr('x', r => x(r.npxg90) + 1).attr('y', 5).attr('height', rh - 10).attr('width', r => Math.max(0, x(r.npxg90 + r.xa90) - x(r.npxg90) - 1)).style('fill', C[2]);
  g.append('text').attr('x', r => x(r.npxg90 + r.xa90) + 6).attr('y', rh / 2 + 4).text(r => f2(r.npxg90 + r.xa90));
});
