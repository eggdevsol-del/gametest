/* The sky and the look, chosen per device before the page draws (an external file, so the page keeps one inline script).
   - The sky is the painted Japanese lake scene (sky-japan.js, sky-japan.css). ?sky=classic brings back the classic sky
     on this device, and ?sky=japan returns to the scene. A device that can't draw WebGL 2 keeps the classic sky.
   - ?look=island opens Today on the kid's island, a prototype (?look=classic turns it off). */
(function () {
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private browsing: this visit only */ } };
  const gl2 = () => {
    try {
      const g = document.createElement('canvas').getContext('webgl2'); if (!g) return false;
      const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); // hand the test context straight back
      return true;
    } catch (e) { return false; }
  };
  const P = new URLSearchParams(location.search), q = P.get('look'), k = P.get('sky'), root = document.documentElement;
  if (q === 'island' || q === 'classic') set('cc:look', q);
  if (k === 'japan' || k === 'classic') set('cc:sky', k);
  let css = '';
  if (get('cc:look') === 'island') { root.dataset.look = 'island'; css += '<link rel="stylesheet" href="look-island.css">'; }
  if ((k || get('cc:sky')) !== 'classic' && gl2()) { root.dataset.sky = 'japan'; css += '<link rel="stylesheet" href="sky-japan.css">'; }
  if (css) document.write(css);
})();
