/* The Pep Index — page logic. Relies on d3, ../assets/dash.js and data.js. */

/* ---------------- shared helpers ---------------- */
function piShort(name) {
  const w = name.split(' ');
  const last = w[w.length - 1], prev = w[w.length - 2] || '';
  return ['De','de','Van','van','Di','di','Da','da','Ten','ten','Le','La','Del','del'].includes(prev) ? prev + ' ' + last : last;
}
function piNum(rows, textCols) {
  return rows.map(function (r) {
    const o = Object.assign({}, r);
    for (const k of Object.keys(o)) if (!textCols.includes(k) && o[k] !== null && o[k] !== '') o[k] = +o[k];
    return o;
  });
}
function piTip(tip, el, ev, w) {
  const [px, py] = d3.pointer(ev, el);
  tip.style('left', Math.max(0, Math.min(px + 12, el.clientWidth - (w || 250))) + 'px').style('top', Math.max(0, py - 10) + 'px').style('opacity', 1);
}
function piEmpty(el, status) {
  const p = document.createElement('p'); p.className = 'pi-muted';
  p.textContent = status === 'missing' ? 'Data failed to load' : '—'; el.appendChild(p);
}
function piPlaceLabels(sel, posFn, W, mr) {
  const placed = [];
  sel.each(function (d) {
    const bw = this.getComputedTextLength();
    const [cx, cy] = posFn(d);
    let xx = cx + 8, yy = cy + 4;
    if (xx + bw > W - mr) xx = cx - 8 - bw;
    const tries = [[0,0],[0,-12],[0,12],[-bw-16,0],[0,-24],[0,24],[-bw-16,-12],[-bw-16,12]];
    for (const [dx, dy] of tries) {
      const tx = xx + dx, ty = yy + dy;
      if (!placed.find(p => Math.abs(p.y - ty) < 11 && tx < p.x + p.w && tx + bw > p.x)) { xx = tx; yy = ty; break; }
    }
    placed.push({x: xx, y: yy, w: bw}); d3.select(this).attr('x', xx).attr('y', yy);
  });
}

/* ---------------- ranking table + headline ---------------- */
window.PI = {sortKey: 'rank', asc: true, league: '', season: '', n: 50};
PI.LEAGUES = ['Premier League','La Liga','Serie A','Bundesliga','Ligue 1'];
PI.rows = function () {
  const d = dash.data('pep');
  return d.status === 'ok' ? piNum(d.data, ['manager','team','league','season','other_coaches']) : null;
};
document.querySelectorAll('.pi-legend i[data-lg]').forEach(el => {
  el.style.background = dash.colors[PI.LEAGUES.indexOf(el.getAttribute('data-lg'))];
});
document.getElementById('f-league').addEventListener('change', e => { PI.league = e.target.value; dash.draw('rows'); });
document.getElementById('f-n').addEventListener('change', e => { PI.n = +e.target.value; dash.draw('rows'); });
document.getElementById('f-season').addEventListener('change', e => { PI.season = e.target.value; dash.draw('rows'); });
document.querySelectorAll('#rank-table th[data-k]').forEach(th => th.addEventListener('click', () => {
  const k = th.getAttribute('data-k');
  const textCols = ['manager','team','league','season'];
  const lowerIsBetter = ['rank','season_rank','rank_v2','rank_resource_adj','long_ball_share_pct','gk_long_ball_share_pct','high_regain_share_pct'];
  if (PI.sortKey === k) PI.asc = !PI.asc;
  else { PI.sortKey = k; PI.asc = textCols.includes(k) || lowerIsBetter.includes(k); }
  document.querySelectorAll('#rank-table th[data-k]').forEach(h => h.removeAttribute('aria-sort'));
  th.setAttribute('aria-sort', PI.asc ? 'ascending' : 'descending');
  dash.draw('rows');
}));

dash.draw('top1', el => { const r = PI.rows(); el.textContent = r ? r[0].manager + "'s " + r[0].season + ' ' + r[0].team : '—'; });
dash.draw('peprank', el => { const r = PI.rows(); const p = r && r.find(x => x.manager === 'Pep Guardiola' && x.season === '2025-26'); el.textContent = p ? String(p.rank) : '—'; });
dash.draw('topadj', el => { const r = PI.rows(); const p = r && r.find(x => x.rank_resource_adj === 1); el.textContent = p ? p.manager + "'s " + p.season + ' ' + p.team : '—'; });

dash.draw('rows', tb => {
  const all = PI.rows();
  tb.replaceChildren();
  if (!all) return;
  let rows = PI.season ? all.filter(r => r.season === PI.season && r.season_rank <= PI.n) : all.filter(r => r.rank <= PI.n);
  if (PI.league) rows = rows.filter(r => r.league === PI.league);
  const k = PI.sortKey;
  rows.sort((a, b) => { const x = a[k], y = b[k]; const c = (typeof x === 'string') ? x.localeCompare(y) : x - y; return PI.asc ? c : -c; });
  const fmt = {tempo_score:'+.2f',retention_score:'+.2f',patience_score:'+.2f',rank_v2:'d',passes_per_xg:'d',pep_index:'.2f',pep_index_resource_adj:'+.2f',xg_chain_per_xg:'.2f',points_per_game:'.2f',goal_diff_per_game:'+.2f',passes_per_match:'d',manager_share_pct:'d',rank:'d',season_rank:'d',rank_resource_adj:'d'};
  const cols = Array.from(document.querySelectorAll('#rank-table th[data-k]')).map(h => h.getAttribute('data-k'));
  for (const r of rows) {
    const tr = document.createElement('tr');
    for (const c of cols) {
      const td = document.createElement('td');
      const v = r[c];
      if (['manager','team','league','season'].includes(c)) { td.className = 'l'; td.textContent = v; }
      else td.textContent = (v === null || v === '' || Number.isNaN(v)) ? '' : d3.format(fmt[c] || '.1f')(v);
      if (c === 'manager') { td.className = 'l mgr' + (r.manager_share_pct < 75 ? ' mixed' : ''); if (r.other_coaches) td.title = 'Also: ' + r.other_coaches; }
      if (c === 'pep_index') td.className = 'idx';
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
});

/* ---------------- fingerprint ---------------- */
window.PS = {};
PS.rows = function () {
  const d = dash.data('signature');
  if (d.status !== 'ok') return null;
  return d.data.map(r => Object.assign({}, r, {
    z_city_2425: +r.z_city_2425, z_city_2526: +r.z_city_2526, signature: +r.signature,
    consistent: +r.consistent, in_fingerprint: +r.in_fingerprint,
    pick_order: r.pick_order === null || r.pick_order === '' ? null : +r.pick_order,
    separation_after_pick: r.separation_after_pick === null || r.separation_after_pick === '' ? null : +r.separation_after_pick,
    pctile_city_2425: +r.pctile_city_2425, pctile_city_2526: +r.pctile_city_2526 }));
};

dash.draw('sig', {
  update(el) {
    const rows = PS.rows();
    el.replaceChildren();
    if (!rows) return piEmpty(el, 'missing');
    rows.sort((a, b) => Math.abs(b.signature) - Math.abs(a.signature) || Math.abs(b.z_city_2526) - Math.abs(a.z_city_2526));
    const W = el.clientWidth || 600, rowH = 22, m = {t: 30, r: 24, b: 30, l: Math.min(300, W * 0.48)};
    const H = m.t + rows.length * rowH + m.b;
    const x = d3.scaleLinear().domain([-3, 3.5]).range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Dot plot of Pep’s City z-scores on 20 style features for 2024-25 and 2025-26, sorted by how consistently City stands out.');
    svg.append('rect').attr('x', x(-1)).attr('y', m.t - 6).attr('width', x(1) - x(-1)).attr('height', rows.length * rowH + 6).style('fill', 'var(--cds-chart-muted)').style('opacity', .12);
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t - 6).attr('y2', m.t + rows.length * rowH).style('stroke', 'var(--cds-chart-reference)');
    svg.append('g').attr('transform', `translate(0,${m.t + rows.length * rowH})`).call(d3.axisBottom(x).ticks(W < 500 ? 5 : 8).tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    svg.append('text').attr('x', x(-1)).attr('y', m.t - 12).text('← below average');
    svg.append('text').attr('x', x(1)).attr('y', m.t - 12).attr('text-anchor', 'end').text('above average →');
    const c25 = dash.colors[0], c26 = dash.colors[1];
    const tip = d3.select(el).append('div').attr('class', 'pi-tip').style('opacity', 0);
    const clamp = v => Math.max(-3, Math.min(3.5, v));
    const g = svg.selectAll('g.r').data(rows).join('g').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append('text').attr('x', m.l - 10).attr('y', rowH / 2 + 4).attr('text-anchor', 'end')
      .style('fill', d => d.consistent ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', d => d.in_fingerprint ? 600 : 400)
      .text(d => (d.in_fingerprint ? '★ ' : '') + d.feature)
      .each(function () { let t = this.textContent; while (this.getComputedTextLength() > m.l - 16 && t.length > 8) { t = t.slice(0, -2); this.textContent = t + '…'; } });
    g.append('line').attr('x1', d => x(clamp(d.z_city_2425))).attr('x2', d => x(clamp(d.z_city_2526))).attr('y1', rowH / 2).attr('y2', rowH / 2)
      .style('stroke', d => d.consistent ? 'var(--color-fg-muted)' : 'var(--cds-chart-grid)').style('stroke-width', 2);
    [['z_city_2425', c25], ['z_city_2526', c26]].forEach(([f, c]) => {
      g.append('circle').attr('cx', d => x(clamp(d[f]))).attr('cy', rowH / 2).attr('r', 5.5)
        .style('fill', c).style('opacity', d => d.consistent ? 1 : 0.45).style('stroke', 'var(--color-panel)').style('stroke-width', 2)
        .on('pointerenter pointermove', (ev, d) => {
          tip.selectAll('*').remove();
          tip.append('div').style('font-weight', '600').text(d.feature);
          tip.append('div').text('City 2024-25: ' + d3.format('+.2f')(d.z_city_2425) + ' (' + d.pctile_city_2425 + 'th percentile)');
          tip.append('div').text('City 2025-26: ' + d3.format('+.2f')(d.z_city_2526) + ' (' + d.pctile_city_2526 + 'th percentile)');
          tip.append('div').text(d.consistent ? 'Consistent signature' : 'Not consistent across both seasons');
          if (d.pick_order) tip.append('div').text('Picked #' + d.pick_order + ' by forward selection');
          piTip(tip, el, ev);
        })
        .on('pointerleave', () => tip.style('opacity', 0));
    });
    const lg = svg.append('g').attr('transform', `translate(${m.l},12)`);
    [['City 2024-25', c25], ['City 2025-26', c26]].forEach(([t, c], i) => {
      lg.append('circle').attr('cx', i * 110 + 5).attr('cy', -4).attr('r', 5).style('fill', c);
      lg.append('text').attr('x', i * 110 + 14).attr('y', 0).text(t);
    });
  }
});

dash.draw('sigcurve', {
  update(el) {
    const rows = PS.rows();
    el.replaceChildren();
    if (!rows) return piEmpty(el, 'missing');
    const pts = rows.filter(r => r.pick_order).sort((a, b) => a.pick_order - b.pick_order);
    const W = el.clientWidth || 400, H = 260, m = {t: 18, r: 16, b: 80, l: 40};
    const x = d3.scalePoint().domain(pts.map(p => p.pick_order)).range([m.l, W - m.r]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(pts, p => p.separation_after_pick) * 1.15]).range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Line chart of how much each added feature separates City from its nearest rivals.');
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)))
      .call(a => { a.select('.domain').remove(); a.selectAll('line').style('stroke', 'var(--cds-chart-grid)'); });
    const xa = svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(k => pts.find(q => q.pick_order === k).key.replace(/_/g, ' ')).tickSizeOuter(0));
    xa.selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    xa.selectAll('text').attr('transform', 'rotate(-35)').attr('text-anchor', 'end').attr('dx', '-4').attr('dy', '6');
    svg.append('path').datum(pts).attr('d', d3.line().x(p => x(p.pick_order)).y(p => y(p.separation_after_pick))).style('fill', 'none').style('stroke', dash.colors[0]).style('stroke-width', 2);
    svg.selectAll('circle.p').data(pts).join('circle').attr('cx', p => x(p.pick_order)).attr('cy', p => y(p.separation_after_pick)).attr('r', 4.5)
      .style('fill', p => p.in_fingerprint ? dash.colors[0] : 'var(--cds-chart-muted)').style('stroke', 'var(--color-panel)').style('stroke-width', 2);
    svg.selectAll('text.v').data(pts).join('text').attr('x', p => x(p.pick_order)).attr('y', p => y(p.separation_after_pick) - 9).attr('text-anchor', 'middle').text(p => d3.format('.2f')(p.separation_after_pick));
  }
});

/* ---------------- style map ---------------- */
window.PQ = {x: 'tempo_axis', y: 'press_height', league: '', lab: 'notable', season: '', coach: ''};
PQ.NOTABLE = ['Ruben Amorim','Carlo Ancelotti','Simone Inzaghi','Thiago Motta','Ange Postecoglou','Pep Guardiola','Vincent Kompany','Luis Enrique','Hansi Flick','Mikel Arteta','Xabi Alonso','Enzo Maresca','Cesc Fàbregas','Roberto De Zerbi','Arne Slot','Andoni Iraola','Oliver Glasner','Ernesto Valverde','Daniele De Rossi','Christian Ilzer','Fabian Hürzeler','José Bordalás','Unai Emery','Diego Simeone','Antonio Conte','Ole Werner','Alexander Blessin','David Moyes','Eddie Howe','Maurizio Sarri','Steffen Baumgart','Cristian Chivu','Gian Piero Gasperini','Sebastian Hoeneß','Daniel Farke','Marco Silva'];
PQ.rows = function () {
  const d = dash.data('style');
  if (d.status !== 'ok') return null;
  return piNum(d.data, ['manager','team','league','season','quadrant']).map(o => { o.xv = o[PQ.x]; return o; });
};
PQ.quadOf = function (r) {
  const b = r.xv, p = r[PQ.y];
  if (p >= 0) return b >= 0 ? 'pep' : 'klopp';
  return b >= 0 ? 'control' : 'deep';
};
PQ.redraw = function () { ['quad','qlist-pep','qlist-klopp','qlist-control','qlist-deep'].forEach(n => dash.draw(n)); };
document.getElementById('q-x').addEventListener('change', e => { PQ.x = e.target.value; PQ.redraw(); });
document.getElementById('q-y').addEventListener('change', e => { PQ.y = e.target.value; PQ.redraw(); });
document.getElementById('q-league').addEventListener('change', e => { PQ.league = e.target.value; PQ.redraw(); });
document.getElementById('q-lab').addEventListener('change', e => { PQ.lab = e.target.value; dash.draw('quad'); });
document.getElementById('q-season').addEventListener('change', e => { PQ.season = e.target.value; PQ.redraw(); });

dash.draw('qcoach', sel => {
  const all = PQ.rows();
  const names = all ? Array.from(new Set(all.map(r => r.manager))).sort((a, b) => a.localeCompare(b)) : [];
  sel.replaceChildren(new Option('Highlight: none', ''), ...names.map(n => new Option(n, n)));
  sel.value = PQ.coach || '';
  sel.onchange = () => { PQ.coach = sel.value; dash.draw('quad'); };
});

['pep','klopp','control','deep'].forEach(q => {
  dash.draw('qlist-' + q, ol => {
    const all = PQ.rows();
    ol.replaceChildren();
    if (!all) return;
    const Y = PQ.y;
    let rows = all.filter(r => PQ.quadOf(r) === q);
    if (PQ.league) rows = rows.filter(r => r.league === PQ.league);
    if (PQ.season) rows = rows.filter(r => r.season === PQ.season);
    rows.sort((a, b) => Math.hypot(b.xv, b[Y]) - Math.hypot(a.xv, a[Y]));
    for (const r of rows) {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(r.manager + ' '));
      const s = document.createElement('span');
      s.textContent = r.team + ' ' + r.season + ' (' + d3.format('+.1f')(r.xv) + ', ' + d3.format('+.1f')(r[Y]) + ')' + (r.manager_share_pct < 75 ? ' *' : '');
      li.appendChild(s);
      ol.appendChild(li);
    }
  });
});

dash.draw('quad', {
  update(el) {
    const all = PQ.rows();
    el.replaceChildren();
    if (!all) return piEmpty(el, 'missing');
    const Y = PQ.y, L = PI.LEAGUES;
    const W = el.clientWidth || 600, H = Math.max(400, Math.min(640, W * 0.72));
    const m = {t: 30, r: 20, b: 40, l: 40};
    const ext = Math.max(d3.max(all, d => Math.abs(d.xv)), 0.5) * 1.05;
    const eyt = Math.max(d3.max(all, d => Math.abs(d[Y])), 0.5) * 1.05;
    const x = d3.scaleLinear().domain([-ext, ext]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([-eyt, eyt]).range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Quadrant chart of 192 club-seasons: tempo on the horizontal axis and pressing on the vertical. Top right is the Pep pole, top left the Klopp pole.');
    [{x0: 0, c: 'var(--color-ok)'}, {x0: -ext, c: 'var(--color-warn)'}].forEach(q => svg.append('rect').attr('x', x(q.x0)).attr('y', y(eyt)).attr('width', x(q.x0 + ext) - x(q.x0)).attr('height', y(0) - y(eyt)).style('fill', q.c).style('opacity', 0.06));
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-reference)');
    svg.append('line').attr('y1', y(0)).attr('y2', y(0)).attr('x1', m.l).attr('x2', W - m.r).style('stroke', 'var(--cds-chart-reference)');
    const corner = (t, xx, yy, anchor) => svg.append('text').attr('class', 'pi-corner').attr('x', xx).attr('y', yy).attr('text-anchor', anchor).text(t);
    corner('Pep pole', W - m.r - 6, m.t + 14, 'end');
    corner('Klopp pole', m.l + 6, m.t + 14, 'start');
    corner('Patient control', W - m.r - 6, H - m.b - 8, 'end');
    corner('Direct, deep', m.l + 6, H - m.b - 8, 'start');
    svg.append('text').attr('x', W - m.r).attr('y', H - 6).attr('text-anchor', 'end')
      .text({tempo_axis: 'Slower, more patient attacks (blended) →', tempo_patience: 'More passes per shot →', tempo_retention: 'More retention, fewer long balls →', build_axis: 'Build-up patience (v1) →'}[PQ.x]);
    svg.append('text').attr('x', m.l).attr('y', m.t - 12).text(Y === 'press_height' ? '↑ Pressing height' : '↑ Pressing intensity');
    const keep = d => (!PQ.league || d.league === PQ.league) && (!PQ.season || d.season === PQ.season) && (!PQ.coach || d.manager === PQ.coach);
    const shown = all.filter(keep), faded = all.filter(d => !keep(d));
    const r0 = W < 500 ? 4 : 5.5;
    svg.append('g').selectAll('circle').data(faded).join('circle')
      .attr('cx', d => x(d.xv)).attr('cy', d => y(d[Y])).attr('r', r0 - 1.5).style('fill', 'var(--cds-chart-muted)').style('opacity', 0.35);
    if (!PQ.season) {
      const mk = 'pi-arrow-q';
      svg.append('defs').append('marker').attr('id', mk).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
        .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,0 L10,5 L0,10 z').style('fill', 'var(--color-fg-muted)');
      const trailNames = PQ.coach ? [PQ.coach] : (PQ.lab === 'all' ? Array.from(new Set(shown.map(d => d.manager))) : PQ.NOTABLE);
      const segs = [];
      d3.group(shown.filter(d => trailNames.includes(d.manager)), d => d.manager).forEach(rs => {
        const a = rs.filter(r => r.season === '2024-25'), b = rs.filter(r => r.season === '2025-26');
        a.forEach(p => b.forEach(q => segs.push([p, q])));
      });
      const end = (s, axis) => { const dx = x(s[1].xv) - x(s[0].xv), dy = y(s[1][Y]) - y(s[0][Y]), L2 = Math.hypot(dx, dy) || 1; return axis === 'x' ? x(s[1].xv) - dx / L2 * (r0 + 2) : y(s[1][Y]) - dy / L2 * (r0 + 2); };
      svg.append('g').selectAll('line').data(segs).join('line')
        .attr('x1', s => x(s[0].xv)).attr('y1', s => y(s[0][Y])).attr('x2', s => end(s, 'x')).attr('y2', s => end(s, 'y'))
        .attr('marker-end', `url(#${mk})`)
        .style('stroke', 'var(--color-fg-muted)').style('stroke-width', PQ.coach ? 2 : 1.2).style('opacity', 0.75);
    }
    const tip = d3.select(el).append('div').attr('class', 'pi-tip').style('opacity', 0);
    svg.append('g').selectAll('circle').data(shown).join('circle')
      .attr('cx', d => x(d.xv)).attr('cy', d => y(d[Y])).attr('r', r0)
      .style('fill', d => dash.colors[L.indexOf(d.league)]).style('fill-opacity', .9)
      .style('stroke', 'var(--color-panel)').style('stroke-width', 1.5)
      .on('pointerenter pointermove', (ev, d) => {
        tip.selectAll('*').remove();
        tip.append('div').style('font-weight', '600').text(d.manager + (d.manager_share_pct < 75 ? ' (' + d.manager_share_pct + '% of season)' : ''));
        tip.append('div').text(d.team + ' · ' + d.league + ' · ' + d.season);
        tip.append('div').text('Tempo ' + d3.format('+.2f')(d.tempo_axis) + ' = patience ' + d3.format('+.2f')(d.tempo_patience) + ' (' + d.passes_per_shot + ' passes/shot) + retention ' + d3.format('+.2f')(d.tempo_retention));
        tip.append('div').text('Press height ' + d3.format('+.2f')(d.press_height) + ' · Intensity ' + d3.format('+.2f')(d.press_intensity));
        tip.append('div').text('Poss ' + d.possession_pct + '% · Long balls ' + d.long_ball_share_pct + '% · Headed goals ' + d.headed_goal_share_pct + '%');
        tip.append('div').text('Pep Index rank #' + d.pep_index_rank);
        piTip(tip, el, ev, 260);
      })
      .on('pointerleave', () => tip.style('opacity', 0));
    const labRows = (PQ.coach || PQ.lab === 'all') ? shown : shown.filter(d => PQ.NOTABLE.includes(d.manager));
    const lbl = svg.append('g').selectAll('text').data(labRows).join('text').attr('class', 'pi-lbl')
      .text(d => piShort(d.manager) + ' ’' + d.season.slice(-2));
    piPlaceLabels(lbl, d => [x(d.xv), y(d[Y])], W, m.r);
  }
});

/* ---------------- clustering ---------------- */
window.PC = {anchor: 'template', map: 'pca', side: ''};
PC.ORDER = ['Total dominance','Possession & press','Patient, low press','Balanced mid-block','Low block & counter','Direct & long'];
PC.DIST = {template: 'dist_template', '2526': 'dist_city_2526', '2425': 'dist_city_2425', net: 'dist_net', compact: 'dist_compact'};
PC.SIM = {template: 'sim_template_pct', '2526': 'sim_city_2526_pct', '2425': 'sim_city_2425_pct', net: 'sim_net_pct', compact: 'sim_compact_pct'};
PC.color = c => dash.colors[PC.ORDER.indexOf(c)];
PC.rows = function () {
  const d = dash.data('clusters');
  return d.status === 'ok' ? piNum(d.data, ['manager','team','league','season','cluster']) : null;
};
PC.nearest = all => { const f = PC.DIST[PC.anchor]; return all.filter(r => !r.is_pep).sort((a, b) => a[f] - b[f]); };
PC.key = r => r.team + '|' + r.season;
PC.FEATS = [['poss','Possession','Possession'],['pass_acc','Pass acc.','Pass accuracy'],['passes_p90','Passes','Passes per match'],['xg_chain_per_xg','xGChain/xG','xGChain / xG'],['buildup_share','Buildup','xGBuildup share'],['passes_per_shot','Passes/shot','Passes per shot'],['passes_per_xg','Passes/xG','Passes per xG'],['final3rd_p90','Final 3rd','Final-third passes'],['opp_half_share','Opp half','Opp-half pass share'],['high_regain_share','High-regain %','High-regain share'],['high_regains_p90','High regains','High regains per match'],['def_actions_per_opp_poss','Def. intensity','Def. actions per opp. possession'],['dribbles_p90','Dribbles','Dribbles per match'],['long_ball_share','Long balls','Long-ball share'],['gk_long_share','GK long','GK long-ball share'],['chip_share','Chips','Chipped-pass share'],['cross_share','Crosses','Cross share']];
PC.pepAvg = all => { const p = all.filter(r => r.is_pep); return PC.FEATS.map(f => d3.mean(p, r => r['z_' + f[0]])); };
PC.radar = function (g, R, series, labels) {
  const F = PC.FEATS, n = F.length, rs = d3.scaleLinear().domain([-3, 3]).range([0, R]).clamp(true);
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  [-2, -1, 0, 1, 2, 3].forEach(v => g.append('circle').attr('r', rs(v)).style('fill', 'none')
    .style('stroke', v === 0 ? 'var(--cds-chart-reference)' : 'var(--cds-chart-grid)').style('stroke-dasharray', v === 0 ? '4 3' : null));
  F.forEach((f, i) => {
    g.append('line').attr('x2', R * Math.cos(ang(i))).attr('y2', R * Math.sin(ang(i))).style('stroke', 'var(--cds-chart-grid)');
    if (labels) {
      const a = ang(i);
      g.append('text').attr('x', (R + 10) * Math.cos(a)).attr('y', (R + 10) * Math.sin(a) + 4)
        .attr('text-anchor', Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end')).text(f[1]);
    }
  });
  const line = d3.lineRadial().angle((d, i) => i * 2 * Math.PI / n).radius(d => rs(d)).curve(d3.curveLinearClosed);
  series.forEach(s => g.append('path').attr('d', line(s.vals)).style('fill', s.color).style('fill-opacity', s.fillOpacity ?? 0.15)
    .style('stroke', s.color).style('stroke-width', s.width ?? 2));
};
document.getElementById('c-anchor').addEventListener('change', e => { PC.anchor = e.target.value; PC.side = ''; ['cmap','cbars','cside','cradar'].forEach(n => dash.draw(n)); });
document.getElementById('c-map').addEventListener('change', e => { PC.map = e.target.value; dash.draw('cmap'); });

dash.draw('clegend', el => {
  el.replaceChildren();
  for (const c of PC.ORDER) {
    const s = document.createElement('span'), i = document.createElement('i');
    i.style.background = PC.color(c); s.appendChild(i); s.appendChild(document.createTextNode(c)); el.appendChild(s);
  }
});

dash.draw('cmap', {
  update(el) {
    const all = PC.rows();
    el.replaceChildren();
    if (!all) return piEmpty(el, 'missing');
    const pca = PC.map === 'pca';
    const fx = pca ? 'pc1_control' : 'umap_x', fy = pca ? 'pc2_frontfoot' : 'umap_y';
    const W = el.clientWidth || 600, H = Math.max(400, Math.min(620, W * 0.7));
    const m = {t: 26, r: 20, b: 40, l: 40};
    const x = d3.scaleLinear().domain(d3.extent(all, d => d[fx])).nice().range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain(d3.extent(all, d => d[fy])).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Map of 192 club-seasons coloured by style cluster, with Pep’s City seasons ringed and the nearest sides labelled.');
    const xa = svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 4 : 8).tickSizeOuter(0));
    const ya = svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));
    [xa, ya].forEach(a => a.selectAll('line,path').style('stroke', 'var(--cds-chart-axis)'));
    if (!pca) { xa.selectAll('text').remove(); ya.selectAll('text').remove(); }
    svg.append('text').attr('x', W - m.r).attr('y', H - 6).attr('text-anchor', 'end').text(pca ? 'More control →' : 'UMAP 1');
    svg.append('text').attr('x', m.l).attr('y', m.t - 10).text(pca ? '↑ Front-foot and direct  ·  ↓ Patient' : 'UMAP 2');
    const near = PC.nearest(all), top = new Set(near.slice(0, 12));
    const tip = d3.select(el).append('div').attr('class', 'pi-tip').style('opacity', 0);
    const r0 = W < 500 ? 3.5 : 5;
    svg.append('g').selectAll('circle').data(all).join('circle')
      .attr('cx', d => x(d[fx])).attr('cy', d => y(d[fy])).attr('r', d => d.is_pep ? r0 + 2 : r0)
      .style('fill', d => PC.color(d.cluster)).style('fill-opacity', d => (d.is_pep || top.has(d)) ? 1 : 0.55)
      .style('stroke', d => d.is_pep ? 'var(--color-fg)' : 'var(--color-panel)').style('stroke-width', d => d.is_pep ? 2.5 : 1.5)
      .on('pointerenter pointermove', (ev, d) => {
        tip.selectAll('*').remove();
        tip.append('div').style('font-weight', '600').text(d.manager + (d.manager_share_pct < 75 ? ' (' + d.manager_share_pct + '% of season)' : ''));
        tip.append('div').text(d.team + ' · ' + d.league + ' · ' + d.season);
        tip.append('div').text('Cluster: ' + d.cluster);
        if (!d.is_pep) tip.append('div').text('Nearest-to-Pep rank #' + (near.indexOf(d) + 1) + ' · similarity ' + d[PC.SIM[PC.anchor]] + '%');
        tip.append('div').text('Poss ' + d.possession_pct + '% · ' + d.passes_per_shot + ' passes/shot');
        piTip(tip, el, ev);
      })
      .on('pointerleave', () => tip.style('opacity', 0));
    const labs = all.filter(d => d.is_pep || top.has(d));
    const lbl = svg.append('g').selectAll('text').data(labs).join('text').attr('class', 'pi-lbl')
      .text(d => (d.is_pep ? 'PEP ' : '') + piShort(d.manager) + ' ’' + d.season.slice(-2))
      .style('font-weight', d => d.is_pep ? 700 : 400);
    piPlaceLabels(lbl, d => [x(d[fx]), y(d[fy])], W, m.r);
  }
});

dash.draw('cbars', {
  update(el) {
    const all = PC.rows();
    el.replaceChildren();
    if (!all) return piEmpty(el, 'missing');
    const S = PC.SIM[PC.anchor];
    const rows = PC.nearest(all).slice(0, 30);
    if (!PC.side) PC.side = PC.key(rows[0]);
    const W = el.clientWidth || 400, rowH = 19, H = rows.length * rowH + 30;
    const m = {l: Math.min(230, W * 0.55), r: 36, t: 6, b: 24};
    const minS = Math.min(0, d3.min(rows, r => r[S]));
    const x = d3.scaleLinear().domain([minS, 100]).range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Horizontal chart of the 30 sides closest to Pep’s City, with bar length showing style similarity.');
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 500 ? 3 : 5).tickFormat(d => d + '%').tickSizeOuter(0)).selectAll('line,path').style('stroke', 'var(--cds-chart-axis)');
    const g = svg.selectAll('g.pi-row').data(rows).join('g').attr('class', r => 'pi-row' + (PC.key(r) === PC.side ? ' sel' : ''))
      .attr('transform', (r, i) => `translate(0,${m.t + i * rowH})`)
      .on('click', (ev, r) => { PC.side = PC.key(r); ['cbars','cside','cradar'].forEach(n => dash.draw(n)); });
    g.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent');
    g.append('text').attr('x', m.l - 8).attr('y', rowH / 2 + 4).attr('text-anchor', 'end')
      .text((r, i) => (i + 1) + '. ' + piShort(r.manager) + ' · ' + r.team + ' ’' + r.season.slice(-2))
      .each(function () { let t = this.textContent; while (this.getComputedTextLength() > m.l - 12 && t.length > 6) { t = t.slice(0, -2); this.textContent = t + '…'; } });
    g.append('line').attr('x1', x(Math.max(0, minS))).attr('x2', r => x(r[S])).attr('y1', rowH / 2).attr('y2', rowH / 2)
      .style('stroke', r => PC.color(r.cluster)).style('stroke-width', 3).style('stroke-linecap', 'round').style('stroke-opacity', .6);
    g.append('circle').attr('cx', r => x(r[S])).attr('cy', rowH / 2).attr('r', r => PC.key(r) === PC.side ? 6 : 4.5)
      .style('fill', r => PC.color(r.cluster)).style('stroke', r => PC.key(r) === PC.side ? 'var(--color-fg)' : 'none').style('stroke-width', 2);
    g.append('text').attr('x', r => x(r[S]) + 8).attr('y', rowH / 2 + 4).text(r => r[S] + '%');
  }
});

dash.draw('cside', sel => {
  const all = PC.rows();
  const rows = all ? PC.nearest(all) : [];
  if (!PC.side && rows.length) PC.side = PC.key(rows[0]);
  sel.replaceChildren(...rows.map((r, i) => new Option((i + 1) + '. ' + r.manager + ' · ' + r.team + ' ' + r.season, PC.key(r))));
  sel.value = PC.side || '';
  sel.onchange = () => { PC.side = sel.value; ['cbars','cradar'].forEach(n => dash.draw(n)); };
});

dash.draw('cradar', {
  update(el) {
    const all = PC.rows();
    el.replaceChildren();
    if (!all) return piEmpty(el, 'missing');
    const side = all.find(r => PC.key(r) === PC.side) || PC.nearest(all)[0];
    const W = el.clientWidth || 400, H = Math.min(W, 460), R = Math.min(W, H) / 2 - 62;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Radar chart comparing the chosen side with Pep’s City on 17 style features.');
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2 + 8})`);
    PC.radar(g, R, [
      {vals: PC.pepAvg(all), color: 'var(--cds-chart-muted)', fillOpacity: 0.25, width: 2},
      {vals: PC.FEATS.map(f => side['z_' + f[0]]), color: PC.color(side.cluster), fillOpacity: 0.12, width: 2.5}
    ], true);
    const lg = svg.append('g').attr('transform', 'translate(8,14)');
    lg.append('text').style('font-weight', 600).style('fill', 'var(--color-fg)').text(side.manager + ' · ' + side.team + ' ' + side.season);
    lg.append('text').attr('y', 16).text('vs Pep’s City (grey) · similarity ' + side[PC.SIM[PC.anchor]] + '% · ' + side.cluster);
  }
});

dash.draw('cradars', el => {
  const d = dash.data('profiles');
  el.replaceChildren();
  if (d.status !== 'ok') return piEmpty(el, 'missing');
  const byLabel = new Map(d.data.map(r => [r.feature, r]));
  const pep = PC.FEATS.map(f => +byLabel.get(f[2])['Pep City (avg of 2)']);
  for (const c of PC.ORDER) {
    const box = document.createElement('div');
    const h = document.createElement('h4'); h.textContent = c; box.appendChild(h);
    el.appendChild(box);
    const W = Math.max(200, box.clientWidth || 220), H = W, R = W / 2 - 14;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Radar of the ' + c + ' cluster average against Pep’s City.');
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
    PC.radar(g, R, [
      {vals: pep, color: 'var(--cds-chart-muted)', fillOpacity: 0.25, width: 1.5},
      {vals: PC.FEATS.map(f => +byLabel.get(f[2])[c]), color: PC.color(c), fillOpacity: 0.2, width: 2}
    ], false);
  }
});
