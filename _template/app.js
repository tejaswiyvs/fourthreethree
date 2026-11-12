/* Register one drawing per data-draw element. It re-runs on resize and when you call dash.draw('example'). */
dash.draw('example', el => {
  const rows = dash.data('example').data;
  el.replaceChildren();
  const W = el.clientWidth, H = 320, m = {t: 10, r: 20, b: 30, l: 90};
  const y = d3.scaleBand().domain(rows.map(r => r.team)).range([m.t, H - m.b]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(rows, r => r.value)]).nice().range([m.l, W - m.r]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Example bar chart');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y));
  svg.selectAll('rect').data(rows).join('rect').attr('x', m.l).attr('y', r => y(r.team)).attr('height', y.bandwidth())
    .attr('width', r => x(r.value) - m.l).attr('rx', 4).style('fill', dash.colors[0]);
});
