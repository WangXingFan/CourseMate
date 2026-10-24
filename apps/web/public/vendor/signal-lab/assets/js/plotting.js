(function (root) {
  'use strict';
  const Lab = root.SignalLab;
  const colors = ['#cf5b36', '#347565', '#4e657c', '#8b6b46'];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const format = (value, digits = 4) => !Number.isFinite(value) ? '不适用' : Math.abs(value) < 1e-10 ? '0' : Number(value.toFixed(digits)).toString();
  let serial = 0;
  function svg(spec, taskId, cursor, forExport = false) {
    const width = 900, height = 290, left = 62, right = 23, top = 46, bottom = 60;
    const w = width - left - right, h = height - top - bottom;
    const values = spec.series.flatMap(s => s.points.map(p => p[1]));
    let ymin = Math.min(0, ...values), ymax = Math.max(0, ...values);
    const pad = Math.max((ymax - ymin) * 0.13, 0.15);
    ymin -= pad; ymax += pad;
    const [xmin, xmax] = spec.range;
    const x = t => left + (t - xmin) / (xmax - xmin) * w;
    const y = v => top + (ymax - v) / (ymax - ymin) * h;
    const clip = 'plot-' + (++serial);
    let content = `<svg xmlns="http://www.w3.org/2000/svg" class="signal-plot" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(taskId + ' ' + spec.title)}" ${forExport ? '' : 'tabindex="0" data-chart="' + escape(spec.key) + '"'} data-xmin="${xmin}" data-xmax="${xmax}"><title>${escape(taskId + ' ' + spec.title)}</title><rect width="900" height="290" fill="#fffefa"/><defs><clipPath id="${clip}"><rect x="${left}" y="${top}" width="${w}" height="${h}"/></clipPath></defs><text x="${left}" y="24" fill="#716f65" font-family="sans-serif" font-size="12">${escape(spec.yLabel || '归一化幅度')}</text><text x="${width - right}" y="24" text-anchor="end" fill="#8c8a80" font-family="monospace" font-size="11">${escape(taskId)}</text>`;
    for (let i = 0; i <= 6; i++) {
      const value = xmin + (xmax - xmin) * i / 6, px = x(value);
      content += `<path d="M${px},${top}V${top + h}" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="${px}" y="${top + h + 21}" fill="#77766c" text-anchor="middle" font-family="monospace" font-size="11">${format(value, 2)}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const value = ymin + (ymax - ymin) * i / 4, py = y(value);
      content += `<path d="M${left},${py}H${left + w}" stroke="#e7e6de" stroke-dasharray="2 5"/><text x="${left - 10}" y="${py + 4}" fill="#77766c" text-anchor="end" font-family="monospace" font-size="11">${format(value, 2)}</text>`;
    }
    content += `<path d="M${left},${y(0)}H${left + w}" stroke="#bdbcb0"/><text x="${left + w}" y="${height - 10}" fill="#77766c" text-anchor="end" font-family="sans-serif" font-size="11">${escape(spec.xLabel || '时间 t / s')}</text>`;
    spec.series.forEach((s, i) => {
      const points = s.points.map(([px, py]) => `${x(px).toFixed(2)},${y(py).toFixed(2)}`);
      if (s.fill && points.length) content += `<polygon points="${x(s.points[0][0])},${y(0)} ${points.join(' ')} ${x(s.points[s.points.length - 1][0])},${y(0)}" fill="${s.color || colors[i]}" fill-opacity="0.14" clip-path="url(#${clip})"/>`;
      content += `<polyline points="${points.join(' ')}" fill="none" stroke="${s.color || colors[i]}" stroke-width="${s.width || 2.5}" ${s.dash ? 'stroke-dasharray="' + s.dash + '"' : ''} stroke-linejoin="round" clip-path="url(#${clip})"/>`;
      const lx = left + i * (spec.series.length > 3 ? 195 : 240);
      content += `<path d="M${lx},${height - 15}h22" stroke="${s.color || colors[i]}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="' + s.dash + '"' : ''}/><text x="${lx + 28}" y="${height - 11}" fill="#514f46" font-family="sans-serif" font-size="11">${escape(s.label)}</text>`;
    });
    if (cursor != null && cursor >= xmin && cursor <= xmax) {
      content += `<path d="M${x(cursor)},${top}V${top + h}" stroke="#282d28" stroke-width="1" stroke-dasharray="3 3"/>`;
      spec.series.forEach((s, i) => { const val = Lab.models.at(s.points, cursor); content += `<circle cx="${x(cursor)}" cy="${y(val)}" r="4" stroke="#fffefa" stroke-width="2" fill="${s.color || colors[i]}"/>`; });
      content += `<text x="${Math.min(x(cursor) + 8, width - 130)}" y="${top + 13}" fill="#282d28" font-family="monospace" font-size="11">${format(cursor, 3)} s</text>`;
    }
    return content + '</svg>';
  }
  Lab.escape = escape; Lab.format = format;
  Lab.plot = { svg, colors };
})(typeof window !== 'undefined' ? window : globalThis);
