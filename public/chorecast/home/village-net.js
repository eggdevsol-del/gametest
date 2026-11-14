/* The village, live (Phase D): this device's line to the Chorecast server, where brothers and sisters in the same
   family meet. One event stream in (who's here, where they are, what they say), small messages out, a few a second.
   Nothing is typed: an emoji, one of the set phrases, an action, all by number. Without a server (the local working
   copy) or a family, it quietly stays off and the village is just you and the villagers. */
(function () {
  'use strict';
  const IH = window.IsoHome = window.IsoHome || {};
  const EMOJI = ['👋', '😄', '😂', '😮', '❤️', '⭐', '👍', '🎉'];
  const PHRASES = ['Hi!', 'Follow me!', 'Want to trade?', 'Look at this!', 'Let’s go to the café', 'Race you!', 'Thanks!', 'Bye!'];
  const ACTIONS = [['👋', 'Wave'], ['💃', 'Dance'], ['🙌', 'High five']];
  const CODE_KEY = 'cc:village:family';
  const N = { on: false, me: null, key: null, peers: new Map(), es: null, q: [], fns: {}, last: null, lastT: 0, info: null, place: 'home', why: '' };

  function code() {
    try { const u = new URLSearchParams(location.search).get('family'); if (u) { localStorage.setItem(CODE_KEY, u.toLowerCase()); return u.toLowerCase(); } return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
  }
  function setCode(c) { c = String(c || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24); try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch (e) { /* this visit only */ } stop(); if (N.info) start(N.info, N.place); return c; }
  const emit = (ev, d) => { for (const f of N.fns[ev] || []) { try { f(d); } catch (e) { console.error('village-net', ev, e); } } };
  function on(ev, f) { (N.fns[ev] = N.fns[ev] || []).push(f); return () => { N.fns[ev] = (N.fns[ev] || []).filter(g => g !== f); }; }

  function start(info, place) {
    N.info = info; N.place = place || N.place; if (N.es || !window.EventSource) return;
    const q = new URLSearchParams({ name: info.name || 'Me', avatar: info.avatar || '🦊', hue: info.hue || '#7cc8e8', code: code() });
    let es; try { es = new EventSource('/api/village/join?' + q); } catch (e) { return; }
    N.es = es;
    const msg = (ev, f) => es.addEventListener(ev, e => { let d = null; try { d = JSON.parse(e.data); } catch (err) { return; } f(d); });
    msg('hi', d => {
      N.on = true; N.me = d.id; N.key = d.key; N.why = ''; N.peers.clear(); N.last = null;
      for (const p of d.peers) N.peers.set(p.id, p); emit('peers'); send({ t: 'p', s: N.lastS || { pl: N.place } }, true);
    });
    msg('join', p => { N.peers.set(p.id, p); emit('join', p); emit('peers'); });
    msg('leave', d => { const p = N.peers.get(d.id); N.peers.delete(d.id); if (p) emit('leave', p); emit('peers'); });
    msg('p', d => { const p = N.peers.get(d.id); if (!p) return; const was = p.s && p.s.pl; p.s = d.s; p.at = performance.now(); emit('pose', p); if (d.s && d.s.pl !== was) emit('moved', { p, was }); });
    msg('e', d => { const p = N.peers.get(d.id); if (p) emit('emote', { p, k: d.k, i: d.i, to: d.to }); });
    for (const ev of ['tr', 'buy', 'sold', 'busy']) msg(ev, d => emit(ev, d));
    msg('full', () => { N.why = 'full'; stop(); });
    es.onerror = () => { if (es.readyState === 2) { N.why = N.on ? 'lost' : (code() ? 'off' : 'nofamily'); N.on = false; N.es = null; N.peers.clear(); emit('peers'); emit('state'); } else if (N.on) { N.on = false; emit('state'); } };
    es.onopen = () => emit('state');
  }
  function stop() { if (N.es) N.es.close(); N.es = null; N.on = false; N.key = null; N.peers.clear(); emit('peers'); emit('state'); }

  // out: queued and sent together; presence at most six times a second, and only when it's changed
  let flushT = 0;
  function send(m, now) { if (!N.key) return; N.q.push(m); if (now) flush(); else if (!flushT) flushT = setTimeout(flush, 60); }
  function flush() {
    clearTimeout(flushT); flushT = 0; if (!N.key || !N.q.length) return; const m = N.q.splice(0, 12);
    fetch('/api/village/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: N.key, m }), keepalive: true })
      .then(r => { if (r.status === 410) { stop(); if (N.info) setTimeout(() => start(N.info, N.place), 1000); } }).catch(() => { /* (the stream notices) */ });
    if (N.q.length) flushT = setTimeout(flush, 60);
  }
  function pose(s) {
    N.lastS = s; N.place = s.pl; if (!N.key) return; const t = performance.now(), j = JSON.stringify(s);
    if (j === N.last || t - N.lastT < 160) return; N.last = j; N.lastT = t; send({ t: 'p', s });
  }

  IH.villageNet = {
    EMOJI, PHRASES, ACTIONS, start, stop, on, send, pose, code, setCode,
    get live() { return N.on; }, get me() { return N.me; }, get why() { return N.why; }, get peers() { return [...N.peers.values()]; }, peer: id => N.peers.get(id)
  };
})();
