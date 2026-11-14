/* Chorecast homes on its own (home.html): a demo kid with demo XP, saved on this device. */
(function () {
  // who's playing on this device: Ari (the demo), or a brother or sister set once with ?name=Mika&ava=🐰 (their own save; this tab first, then this device)
  function who() {
    const q = new URLSearchParams(location.search); let w = null; try { w = JSON.parse(sessionStorage.getItem('cc:demo:kid') || localStorage.getItem('cc:demo:kid') || 'null'); } catch (e) { w = null; }
    const nm = (q.get('name') || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 16);
    if (nm) { w = { name: nm, avatar: q.get('ava') || (w && w.avatar) || '🦊' }; try { sessionStorage.setItem('cc:demo:kid', JSON.stringify(w)); localStorage.setItem('cc:demo:kid', JSON.stringify(w)); } catch (e) { /* this visit only */ } }
    else if (q.get('ava') && w) w.avatar = q.get('ava');
    return w ? { id: 'demo-' + w.name.toLowerCase().replace(/\W+/g, ''), name: w.name, avatar: w.avatar, hue: '#4DABF7' } : { id: 'demo', name: 'Ari', avatar: q.get('ava') || '🦊', hue: '#4DABF7' };
  }
  const go = () => { const H = window.IsoHome; if (!H || !H.open || !H.open({ demo: true, kid: who(), islands: new URLSearchParams(location.search).get('islands') === 'all' ? null : undefined, xp: () => ({ earned: 6000, left: 4500 }) })) document.body.insertAdjacentHTML('beforeend', '<p style="font:700 18px system-ui;padding:24px">This needs a device that can draw 3D.</p>'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
