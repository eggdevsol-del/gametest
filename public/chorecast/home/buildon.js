/* Chorecast homes: building onto the home (the classic island's Cosy Studio, and every home). Instead of moving to a
   bigger house, a kid adds rooms: an expensive add-on.
   1. Build on: drag out a room against the house, on its left, right or back (the front stays clear for the front
      door). It shows as you drag, green where it can go and red where it can't, with its size and price.
   2. Then tap the wall it shares with the house where the doorway goes.
   3. Build it: the XP is paid, the room joins the house (empty, wooden floor, plain walls) and can be decorated and
      renovated like any other room.
   Built rooms are kept with the home (st.homes[id].ext: rooms, each with its doorway, and dx/dz, how far the home's own
   rooms have moved over for rooms built on its back or left side). app.js homeCfg puts them together. */
(() => {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  const MIN = 2, MAX = 6, BASE_XP = 600, TILE_XP = 60, MAX_ROOMS = 4;
  const price = (w, d) => BASE_XP + TILE_XP * w * d;
  let B = null; // { c (app.js handles), phase, a, b, rect, ok, why, doors, door, preview, ui }

  const rectOf = (a, b) => ({ x: Math.min(a.x, b.x), z: Math.min(a.z, b.z), w: Math.abs(a.x - b.x) + 1, d: Math.abs(a.z - b.z) + 1 });
  // the wall a new room would share with the house: [{ axis, at, a, b }] (axis 'z': a wall along z at x = at)
  function shared(R, rooms) {
    const out = [];
    for (const r of rooms) {
      if (R.x + R.w === r.x || r.x + r.w === R.x) { const at = R.x + R.w === r.x ? r.x : R.x, a = Math.max(R.z, r.z), b = Math.min(R.z + R.d, r.z + r.d); if (b - a >= 1) out.push({ axis: 'z', at, a, b }); }
      if (R.z + R.d === r.z || r.z + r.d === R.z) { const at = R.z + R.d === r.z ? r.z : R.z, a = Math.max(R.x, r.x), b = Math.min(R.x + R.w, r.x + r.w); if (b - a >= 1) out.push({ axis: 'x', at, a, b }); }
    }
    return out;
  }
  function check(R) {
    const def = B.c.def(), rooms = def.rooms, ext = (B.c.ext() || {}).rooms || [];
    if (ext.length >= MAX_ROOMS) return 'Your home has as many rooms as it can take.';
    if (R.w < MIN || R.d < MIN) return `A room needs to be at least ${MIN} by ${MIN}.`;
    if (R.w > MAX || R.d > MAX) return `A room can be up to ${MAX} by ${MAX}.`;
    for (const r of rooms) if (R.x < r.x + r.w && R.x + R.w > r.x && R.z < r.z + r.d && R.z + R.d > r.z) return 'That’s on top of a room you have.';
    if (R.z + R.d > def.d) return 'Keep the front clear: the front door’s there. Build on the sides or the back.';
    const s = shared(R, rooms); if (!s.some(w => w.b - w.a >= 2)) return 'Put it right against the house, sharing at least 2 tiles of wall.';
    return '';
  }
  // ---------- what shows while building: the room's outline on the ground, and the walls a doorway could go in
  function preview() {
    if (B.preview) { B.c.scene().remove(B.preview); B.preview.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); }
    const g = new T.Group(), R = B.rect, FY = B.c.FY; B.preview = g;
    if (R) {
      // (drawn over everything, so the grass and the house never hide it)
      const col = B.ok ? 0x5cd18a : 0xff6b6b, m = new T.Mesh(new T.BoxGeometry(R.w - 0.06, 1.2, R.d - 0.06), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, depthTest: false }));
      m.position.set(R.x + R.w / 2, FY + 0.6, R.z + R.d / 2); m.renderOrder = 30; g.add(m);
      const edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(R.w, 1.2, R.d)), new T.LineBasicMaterial({ color: col, depthTest: false, transparent: true })); edge.position.copy(m.position); edge.renderOrder = 31; g.add(edge);
    }
    if (B.phase === 'door') for (const w of B.doors) for (let u = w.a; u < w.b; u++) {
      const on = B.door != null && w === B.doorWall && u >= B.door && u < B.door + B.dw, m = new T.Mesh(new T.BoxGeometry(w.axis === 'x' ? 0.86 : 0.2, 1.6, w.axis === 'x' ? 0.2 : 0.86), new T.MeshBasicMaterial({ color: on ? 0x5cd18a : 0xffd166, transparent: true, opacity: on ? 0.9 : 0.6, depthWrite: false, depthTest: false })); m.renderOrder = 32;
      m.position.set(w.axis === 'x' ? u + 0.5 : w.at, B.c.FY + 0.8, w.axis === 'x' ? w.at : u + 0.5); m.userData.wall = w; m.userData.u = u; g.add(m);
    }
    g.renderOrder = 8; B.c.scene().add(g); B.c.redraw();
  }
  function bar(html) {
    if (!B.ui) { B.ui = document.createElement('div'); B.ui.className = 'bo-bar'; B.c.root.appendChild(B.ui); B.ui.addEventListener('click', onBar); B.ui.addEventListener('pointerdown', e => e.stopPropagation()); }
    B.ui.innerHTML = html;
  }
  function drawBar() {
    const R = B.rect, xp = R ? price(R.w, R.d) : 0;
    if (B.phase === 'drag') bar(`<b>🧱 Build on a room</b><span>${R ? `${R.w} × ${R.d} tiles · ✨ ${xp.toLocaleString()} XP${B.why ? `<i>${B.why}</i>` : ''}` : 'Drag out a new room against your house: on a side or the back.'}</span><div class="bo-row"><button data-b="cancel" class="bo-2">Cancel</button>${R && B.ok ? '<button data-b="next" class="bo-1">Next: the doorway</button>' : ''}</div>`);
    else if (B.phase === 'door') bar(`<b>🚪 Where’s the doorway?</b><span>${B.door != null ? 'Good spot. Ready to build?' : 'Tap the yellow wall where you want to walk through.'}</span><div class="bo-row"><button data-b="back" class="bo-2">Back</button>${B.door != null ? `<button data-b="build" class="bo-1">Build it · ✨ ${xp.toLocaleString()}</button>` : ''}</div>`);
  }
  function onBar(e) {
    const b = e.target.closest('[data-b]'); if (!b) return; e.stopPropagation(); const a = b.dataset.b;
    if (a === 'cancel') return stop();
    if (a === 'next' && B.ok) { B.phase = 'door'; B.doors = shared(B.rect, B.c.def().rooms).filter(w => w.b - w.a >= 1); B.door = null; preview(); drawBar(); return; }
    if (a === 'back') { B.phase = 'drag'; B.door = null; preview(); drawBar(); return; }
    if (a === 'build') return build();
  }
  // ---------- pointer: drag out the room, then tap the doorway
  function cellAt(px, py) {
    const rc = B.c.rayAt(px, py), PL = new T.Plane(new T.Vector3(0, 1, 0), -B.c.FY), P = new T.Vector3();
    if (!rc.ray.intersectPlane(PL, P)) return null; return { x: Math.floor(P.x), z: Math.floor(P.z) };
  }
  function down(e) {
    if (B.phase === 'drag') { const c = cellAt(e.clientX, e.clientY); if (!c) return true; B.a = c; B.b = c; B.dragging = true; update(); return true; }
    if (B.phase === 'door') {
      const rc = B.c.rayAt(e.clientX, e.clientY), hit = rc.intersectObjects(B.preview ? B.preview.children : [], false).find(h => h.object.userData.wall);
      if (hit) { const w = hit.object.userData.wall, len = w.b - w.a; B.dw = len >= 3 ? 2 : 1; B.doorWall = w; B.door = Math.max(w.a, Math.min(w.b - B.dw, hit.object.userData.u)); B.c.sound('pop'); preview(); drawBar(); }
      return true;
    }
    return false;
  }
  function move(e) { if (B.phase !== 'drag' || !B.dragging) return false; const c = cellAt(e.clientX, e.clientY); if (c && (c.x !== B.b.x || c.z !== B.b.z)) { B.b = c; update(); } return true; }
  function up() { if (B.phase === 'drag') B.dragging = false; return true; }
  function update() { B.rect = rectOf(B.a, B.b); B.why = check(B.rect); B.ok = !B.why; preview(); drawBar(); }
  // ---------- build it
  function build() {
    const R = B.rect, xp = price(R.w, R.d); if (!B.c.pay(xp, `a new ${R.w} × ${R.d} room`)) return;
    const E = B.c.ext(true), dx = Math.max(0, -R.x), dz = Math.max(0, -R.z);
    // a room on the back or left: everything moves over so the grid starts at 0 again
    if (dx || dz) { E.dx = (E.dx || 0) + dx; E.dz = (E.dz || 0) + dz; for (const r of E.rooms) { r.x += dx; r.z += dz; } B.c.shift(dx, dz); }
    const doorAt = (B.doorWall.axis === 'x' ? B.door + dx : B.door + dz);
    E.rooms.push({ x: R.x + dx, z: R.z + dz, w: R.w, d: R.d, floor: 'wood', wall: '#f6efe4', name: `Room ${E.rooms.length + 1}`, doorAt, built: Date.now() });
    B.c.save(); const c = B.c; stop(); c.rebuild(); c.sound('buy'); c.toast(`Your new room is built! Tap Decorate to fill it. ✨`); if (c.track) c.track('home.buildOn', { w: R.w, d: R.d, xp });
  }
  function stop() { if (!B) return; const c = B.c; if (B.preview) { c.scene().remove(B.preview); } if (B.ui) B.ui.remove(); B = null; c.redraw(); }
  IH.buildOn = {
    price, start(c) { if (B) stop(); B = { c, phase: 'drag', rect: null, ok: false }; drawBar(); preview(); c.toast('Drag out your new room against the house.'); },
    stop, get on() { return !!B; },
    down: e => (B ? down(e) : false), move: e => (B ? move(e) : false), up: e => (B ? up(e) : false),
  };
})();
