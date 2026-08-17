/* ============================================================
   HostOps — hand-rolled SVG charts (no dependencies)

   House rules baked in:
     · marks ≤ 24px thick, 4px rounded data-end, square at baseline
     · 2px surface gap between touching fills
     · 2px surface ring on overlapping dots
     · hairline solid gridlines, recessive axes
     · text always wears text tokens, never the series colour
     · every chart ships a hover tooltip + an optional table view
   ============================================================ */
(function (global) {
  'use strict';

  const Charts = {};
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- shared tooltip ---------------- */

  let tip;
  function tipEl() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'charttip';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function showTip(html, x, y) {
    const t = tipEl();
    t.innerHTML = html;
    t.classList.add('is-on');
    const r = t.getBoundingClientRect();
    let left = x + 14;
    let top = y - r.height - 12;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top < 8) top = y + 18;
    t.style.left = Math.max(8, left) + 'px';
    t.style.top = top + 'px';
  }

  function hideTip() { if (tip) tip.classList.remove('is-on'); }
  Charts.hideTip = hideTip;

  document.addEventListener('scroll', hideTip, true);

  /* ---------------- helpers ---------------- */

  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback || '#888';
  }

  Charts.seriesColor = i => css('--series-' + ((i % 5) + 1));

  function niceMax(max) {
    if (max <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / mag;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  function ticks(max, count) {
    const out = [];
    for (let i = 0; i <= count; i++) out.push((max / count) * i);
    return out;
  }

  function svgEl(w, h, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', '100%');
    s.setAttribute('height', h);
    s.setAttribute('class', 'chart ' + (cls || ''));
    s.setAttribute('role', 'img');
    return s;
  }

  function add(parent, name, attrs, text) {
    const e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e);
    return e;
  }

  /**
   * Mount a chart into `el` and re-render it whenever the element resizes.
   * `render(el, width)` must clear and repaint.
   */
  function responsive(el, render) {
    if (!el) return;
    let last = -1;
    const paint = () => {
      const w = Math.max(160, Math.floor(el.clientWidth));
      if (w === last) return;
      last = w;
      el.innerHTML = '';
      render(el, w);
    };
    paint();
    if (el._hostopsRO) el._hostopsRO.disconnect();
    if (global.ResizeObserver) {
      el._hostopsRO = new ResizeObserver(U.debounce(paint, 120));
      el._hostopsRO.observe(el);
    } else {
      window.addEventListener('resize', U.debounce(paint, 200));
    }
  }
  Charts.responsive = responsive;

  /* ============================================================
     Sparkline — 12-point trend for a stat tile.
     De-emphasised body, accent on the current period.
     ============================================================ */

  Charts.sparkline = function (values, opts) {
    const o = opts || {};
    const w = o.w || 104, h = o.h || 34, pad = 3;
    if (!values || values.length < 2) return '';
    const max = Math.max.apply(null, values);
    const min = Math.min.apply(null, values);
    const span = max - min || 1;
    const dx = (w - pad * 2) / (values.length - 1);
    const y = v => h - pad - ((v - min) / span) * (h - pad * 2 - 6);

    let d = '', area = '';
    values.forEach((v, i) => {
      const x = pad + i * dx;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
    });
    area = d + 'L' + (pad + (values.length - 1) * dx).toFixed(1) + ' ' + h + ' L' + pad + ' ' + h + ' Z';

    const color = o.color || 'var(--series-1)';
    const lastX = pad + (values.length - 1) * dx;
    const lastY = y(values[values.length - 1]);

    return '<svg class="chart" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<path d="' + area + '" fill="' + color + '" fill-opacity="0.10"/>' +
      '<path d="' + d.trim() + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      (o.dot === false ? '' :
        '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="4" fill="' + color + '" stroke="var(--chart-surface)" stroke-width="2"/>') +
      '</svg>';
  };

  /* ============================================================
     Line / area chart with crosshair + tooltip
     spec: { labels:[], series:[{name, values, color}], format, caption }
     ============================================================ */

  Charts.line = function (el, spec) {
    responsive(el, function (host, W) {
      const H = spec.height || 230;
      const padL = spec.padL || 42, padR = 14, padT = 14, padB = 26;
      const iw = W - padL - padR, ih = H - padT - padB;
      const labels = spec.labels;
      const series = spec.series;
      const fmt = spec.format || (v => U.num(v));

      let rawMax = 0;
      series.forEach(s => s.values.forEach(v => { if (v > rawMax) rawMax = v; }));
      const max = spec.max || niceMax(rawMax * 1.08) || 10;
      const min = spec.min || 0;

      const x = i => padL + (labels.length === 1 ? iw / 2 : (iw / (labels.length - 1)) * i);
      const y = v => padT + ih - ((v - min) / (max - min)) * ih;

      const svg = svgEl(W, H);
      svg.setAttribute('aria-label', spec.caption || 'Line chart');

      // gridlines + y ticks
      ticks(max, spec.yTicks || 4).forEach(t => {
        add(svg, 'line', { class: 'grid-line', x1: padL, x2: W - padR, y1: y(t).toFixed(1), y2: y(t).toFixed(1) });
        add(svg, 'text', { class: 'axis-label', x: padL - 8, y: y(t) + 3.5, 'text-anchor': 'end' }, spec.yFormat ? spec.yFormat(t) : fmt(t));
      });
      add(svg, 'line', { class: 'base-line', x1: padL, x2: W - padR, y1: y(min), y2: y(min) });

      // x labels — thin them out so they never collide
      const every = Math.ceil(labels.length / Math.max(3, Math.floor(iw / 62)));
      labels.forEach((lab, i) => {
        if (i % every !== 0 && i !== labels.length - 1) return;
        add(svg, 'text', { class: 'axis-label', x: x(i), y: H - 8, 'text-anchor': 'middle' }, lab);
      });

      // crosshair (hidden until hover)
      const cross = add(svg, 'line', { class: 'base-line', x1: 0, x2: 0, y1: padT, y2: padT + ih, opacity: 0, stroke: css('--axis') });

      // series
      series.forEach((s, si) => {
        const color = s.color || Charts.seriesColor(si);
        let d = '';
        s.values.forEach((v, i) => { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; });

        if (spec.area !== false && series.length === 1) {
          add(svg, 'path', {
            d: d + 'L' + x(labels.length - 1).toFixed(1) + ' ' + y(min) + ' L' + x(0).toFixed(1) + ' ' + y(min) + ' Z',
            fill: color, 'fill-opacity': 0.1, stroke: 'none'
          });
        }
        add(svg, 'path', { d: d.trim(), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      });

      // hover dots, created once and moved on hover
      const dots = series.map((s, si) => add(svg, 'circle', {
        r: 4.5, fill: s.color || Charts.seriesColor(si),
        stroke: css('--chart-surface'), 'stroke-width': 2, opacity: 0
      }));

      // end labels for the single-series case
      if (series.length === 1 && spec.labelEnd !== false && labels.length) {
        const s = series[0], i = s.values.length - 1;
        add(svg, 'circle', {
          cx: x(i), cy: y(s.values[i]), r: 4.5,
          fill: s.color || Charts.seriesColor(0), stroke: css('--chart-surface'), 'stroke-width': 2
        });
      }

      // one hit rect per index
      const band = iw / Math.max(1, labels.length - 1);
      labels.forEach((lab, i) => {
        const r = add(svg, 'rect', {
          class: 'hit',
          x: (x(i) - band / 2).toFixed(1), y: padT,
          width: Math.max(6, band).toFixed(1), height: ih
        });
        r.addEventListener('mousemove', function (ev) {
          cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
          dots.forEach((dot, si) => {
            dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(series[si].values[i])); dot.setAttribute('opacity', 1);
          });
          const rows = series.map((s, si) =>
            '<div class="tip-row"><i style="background:' + (s.color || Charts.seriesColor(si)) + '"></i>' +
            U.esc(s.name) + '<em>' + fmt(s.values[i]) + '</em></div>'
          ).join('');
          showTip('<b>' + U.esc(spec.tipLabels ? spec.tipLabels[i] : lab) + '</b>' + rows, ev.clientX, ev.clientY);
        });
        r.addEventListener('mouseleave', function () {
          cross.setAttribute('opacity', 0);
          dots.forEach(d => d.setAttribute('opacity', 0));
          hideTip();
        });
      });

      host.appendChild(svg);
    });
  };

  /* ============================================================
     Column chart — vertical bars, ≤24px, 4px rounded cap
     spec: { labels, values, color, format, highlight:index, caption }
     ============================================================ */

  Charts.columns = function (el, spec) {
    responsive(el, function (host, W) {
      const H = spec.height || 200;
      const padL = spec.padL === undefined ? 40 : spec.padL, padR = 10, padT = 16, padB = 26;
      const iw = W - padL - padR, ih = H - padT - padB;
      const vals = spec.values;
      const fmt = spec.format || (v => U.num(v));
      const max = spec.max || niceMax(Math.max.apply(null, vals.concat([1])) * 1.1);

      const slot = iw / vals.length;
      const bw = Math.min(24, Math.max(4, slot - 6));   // leftover slot stays as air
      const y = v => padT + ih - (v / max) * ih;

      const svg = svgEl(W, H);
      svg.setAttribute('aria-label', spec.caption || 'Column chart');

      if (padL > 0) {
        ticks(max, spec.yTicks || 3).forEach(t => {
          add(svg, 'line', { class: 'grid-line', x1: padL, x2: W - padR, y1: y(t).toFixed(1), y2: y(t).toFixed(1) });
          add(svg, 'text', { class: 'axis-label', x: padL - 8, y: y(t) + 3.5, 'text-anchor': 'end' }, spec.yFormat ? spec.yFormat(t) : fmt(t));
        });
      }
      add(svg, 'line', { class: 'base-line', x1: padL, x2: W - padR, y1: y(0), y2: y(0) });

      const every = Math.ceil(vals.length / Math.max(3, Math.floor(iw / 46)));

      vals.forEach((v, i) => {
        const cx = padL + slot * i + slot / 2;
        const h = Math.max(v > 0 ? 2 : 0, (v / max) * ih);
        const color = spec.colors ? spec.colors[i]
          : (spec.highlight === i ? css('--coral-500') : (spec.color || Charts.seriesColor(0)));

        // 4px rounded top, square at the baseline
        const top = y(v), r = Math.min(4, h);
        const x0 = cx - bw / 2;
        const d = 'M' + x0 + ' ' + (top + h) +
          ' L' + x0 + ' ' + (top + r) +
          ' Q' + x0 + ' ' + top + ' ' + (x0 + r) + ' ' + top +
          ' L' + (x0 + bw - r) + ' ' + top +
          ' Q' + (x0 + bw) + ' ' + top + ' ' + (x0 + bw) + ' ' + (top + r) +
          ' L' + (x0 + bw) + ' ' + (top + h) + ' Z';
        add(svg, 'path', { d: d, fill: color, opacity: spec.dim && spec.dim.indexOf(i) > -1 ? 0.45 : 1 });

        if (spec.labelAll || (spec.highlight === i && spec.labelHighlight !== false)) {
          add(svg, 'text', { class: 'mark-label', x: cx, y: top - 6, 'text-anchor': 'middle' }, fmt(v));
        }

        if (spec.labels && (i % every === 0 || i === vals.length - 1)) {
          add(svg, 'text', { class: 'axis-label', x: cx, y: H - 8, 'text-anchor': 'middle' }, spec.labels[i]);
        }

        const hit = add(svg, 'rect', { class: 'hit', x: padL + slot * i, y: padT, width: slot, height: ih });
        hit.addEventListener('mousemove', ev => {
          showTip('<b>' + U.esc(spec.tipLabels ? spec.tipLabels[i] : (spec.labels ? spec.labels[i] : i)) + '</b>' +
            '<div class="tip-row"><i style="background:' + color + '"></i>' + U.esc(spec.seriesName || 'Value') +
            '<em>' + fmt(v) + '</em></div>' +
            (spec.tipExtra ? spec.tipExtra(i) : ''), ev.clientX, ev.clientY);
        });
        hit.addEventListener('mouseleave', hideTip);
      });

      host.appendChild(svg);
    });
  };

  /* ============================================================
     Horizontal bars — good for ranked categories with long names
     spec: { items:[{label, value, color, sub}], format, caption }
     ============================================================ */

  Charts.barsH = function (el, spec) {
    responsive(el, function (host, W) {
      const items = spec.items;
      const rowH = spec.rowH || 34;
      const H = items.length * rowH + 10;
      const labelW = spec.labelW || Math.min(150, Math.max(80, Math.round(W * 0.32)));
      const valueW = spec.valueW || 62;
      const iw = Math.max(30, W - labelW - valueW - 12);
      const max = spec.max || niceMax(Math.max.apply(null, items.map(i => i.value).concat([1])));
      const fmt = spec.format || (v => U.num(v));

      const svg = svgEl(W, H);
      svg.setAttribute('aria-label', spec.caption || 'Bar chart');

      items.forEach((it, i) => {
        const cy = i * rowH + rowH / 2 + 4;
        const bh = Math.min(18, rowH - 14);
        const bw = Math.max(it.value > 0 ? 3 : 0, (it.value / max) * iw);
        const color = it.color || Charts.seriesColor(i);

        add(svg, 'text', {
          class: 'axis-label', x: 0, y: cy + 4,
          style: 'font-size:12px;fill:var(--text-2)'
        }, U.truncate(it.label, 24));

        // track
        add(svg, 'rect', { x: labelW, y: cy - bh / 2, width: iw, height: bh, rx: 4, fill: css('--grid') });
        // 4px rounded data-end, square at the baseline (left edge)
        const r = Math.min(4, bw);
        const d = 'M' + labelW + ' ' + (cy - bh / 2) +
          ' L' + (labelW + bw - r) + ' ' + (cy - bh / 2) +
          ' Q' + (labelW + bw) + ' ' + (cy - bh / 2) + ' ' + (labelW + bw) + ' ' + (cy - bh / 2 + r) +
          ' L' + (labelW + bw) + ' ' + (cy + bh / 2 - r) +
          ' Q' + (labelW + bw) + ' ' + (cy + bh / 2) + ' ' + (labelW + bw - r) + ' ' + (cy + bh / 2) +
          ' L' + labelW + ' ' + (cy + bh / 2) + ' Z';
        add(svg, 'path', { d: d, fill: color });

        add(svg, 'text', {
          class: 'mark-label', x: W, y: cy + 4, 'text-anchor': 'end'
        }, fmt(it.value));

        const hit = add(svg, 'rect', { class: 'hit', x: 0, y: i * rowH + 4, width: W, height: rowH });
        hit.addEventListener('mousemove', ev => {
          showTip('<b>' + U.esc(it.label) + '</b>' +
            '<div class="tip-row"><i style="background:' + color + '"></i>' + U.esc(spec.seriesName || 'Value') +
            '<em>' + fmt(it.value) + '</em></div>' +
            (it.sub ? '<div style="opacity:.75;margin-top:2px">' + U.esc(it.sub) + '</div>' : ''), ev.clientX, ev.clientY);
        });
        hit.addEventListener('mouseleave', hideTip);
      });

      host.appendChild(svg);
    });
  };

  /* ============================================================
     Composition bar — one stacked row, 2px surface gaps
     spec: { segments:[{label, value, color}], format, height }
     ============================================================ */

  Charts.composition = function (el, spec) {
    responsive(el, function (host, W) {
      const H = spec.height || 16;
      const segs = spec.segments.filter(s => s.value > 0);
      const total = U.sum(segs, s => s.value) || 1;
      const gap = 2;
      const avail = W - gap * Math.max(0, segs.length - 1);
      const fmt = spec.format || (v => U.num(v));

      const svg = svgEl(W, H);
      svg.setAttribute('aria-label', spec.caption || 'Composition');

      let x = 0;
      segs.forEach((s, i) => {
        const w = Math.max(3, (s.value / total) * avail);
        const rx = Math.min(4, w / 2);
        add(svg, 'rect', { x: x.toFixed(1), y: 0, width: w.toFixed(1), height: H, rx: rx, fill: s.color || Charts.seriesColor(i) });
        const hit = add(svg, 'rect', { class: 'hit', x: x.toFixed(1), y: 0, width: w.toFixed(1), height: H });
        const pct = ((s.value / total) * 100).toFixed(0) + '%';
        hit.addEventListener('mousemove', ev => showTip(
          '<div class="tip-row"><i style="background:' + (s.color || Charts.seriesColor(i)) + '"></i>' +
          U.esc(s.label) + '<em>' + fmt(s.value) + ' · ' + pct + '</em></div>', ev.clientX, ev.clientY));
        hit.addEventListener('mouseleave', hideTip);
        x += w + gap;
      });

      host.appendChild(svg);
    });
  };

  /* ============================================================
     Legend + table view (the two accessibility fallbacks)
     ============================================================ */

  Charts.legend = function (items, opts) {
    const o = opts || {};
    return '<div class="legend">' + items.map((it, i) =>
      '<span class="legend__item"><span class="legend__swatch' + (o.line ? ' legend__swatch--line' : '') +
      '" style="background:' + (it.color || Charts.seriesColor(i)) + '"></span>' + U.esc(it.label) +
      (it.value !== undefined ? ' <b style="font-weight:650;font-variant-numeric:tabular-nums">' + U.esc(it.value) + '</b>' : '') +
      '</span>').join('') + '</div>';
  };

  Charts.tableView = function (caption, head, rows) {
    return '<details class="tableview"><summary>' + U.esc(caption || 'View as table') + '</summary>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      head.map((h, i) => '<th' + (i ? ' class="num"' : '') + '>' + U.esc(h) + '</th>').join('') +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => '<td' + (i ? ' class="num"' : '') + '>' + U.esc(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div></details>';
  };

  global.Charts = Charts;
})(window);
