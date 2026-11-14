/* The pay slip, as the Chorecast app draws it on payday (index.html paydaySheet: a paper slip in a monospace face,
   a header, the lines, a dashed rule and the sums), used here for every move of money: farm sales, farm
   purchases, wages, investments, shop receipts. IH.slip(spec, at) gives its HTML.
   spec: { head, kind, who, lines: [[label, xp]], sum: [[label, xp, 'big' | 'muted']], note } */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // XP as a number; anything else (Chorecast's own money, already written as $4.50) as it comes
  const xp = n => (typeof n === 'string' ? esc(n) : (n < 0 ? '−' : '') + '✨ ' + Math.abs(Math.round(n)).toLocaleString('en-NZ'));
  const day = at => new Date(at || Date.now()).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
  const row = ([l, v, cls], i) => `<div class="sl${cls ? ' ' + cls : ''}" style="--i:${i}"><span>${esc(l)}</span><span>${v == null ? '' : xp(v)}</span></div>`;
  IH.slip = (s, at) => s ? `<div class="ih-slip">
      <div class="ih-slip-h"><b>${esc(s.head || 'CHORECAST')}</b><span>${esc(s.kind || 'Receipt')} · ${esc(s.who || '')} · ${esc(s.date || day(at))}</span></div>
      <div class="ih-slip-lines">${(s.lines || []).map(row).join('')}</div>
      ${s.sum && s.sum.length ? `<div class="ih-slip-sum">${s.sum.map(row).join('')}</div>` : ''}
      ${s.note ? `<p class="ih-slip-note">${esc(s.note)}</p>` : ''}
    </div>` : '';
})();
