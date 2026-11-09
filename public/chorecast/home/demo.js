/* Chorecast homes on its own (home.html): a demo kid with demo XP, saved on this device. */
(function () {
  const go = () => { const H = window.IsoHome; if (!H || !H.open || !H.open({ demo: true, kid: { id: 'demo', name: 'Ari', avatar: new URLSearchParams(location.search).get('ava') || '🦊', hue: '#4DABF7' }, xp: () => ({ earned: 6000, left: 4500 }) })) document.body.insertAdjacentHTML('beforeend', '<p style="font:700 18px system-ui;padding:24px">This needs a device that can draw 3D.</p>'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
