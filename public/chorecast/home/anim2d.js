/* Chorecast homes (a prototype): a 2D cut-out animation engine, for characters drawn like anime cels.
   A character is a set of drawn parts per view (front, side, back): flat pictures on transparent backgrounds that
   share one frame, each with a pivot (a joint) and a parent, so a head turns on the neck and the ears and eyelids
   go with it. Long soft parts (tails) bend along their length through a deforming mesh.
   Motion follows how anime animators work:
   - key poses with holds, eased in and out, timed on twos (the home only calls step() on the beat),
   - anticipation (a small opposite move before a big one) and follow-through (springs that lag behind and settle),
   - squash and stretch on landings and bounces, breathing while still, blinks at natural intervals,
   - a quick squash "cheat" when the character turns from one view to another, as hand-drawn turns do.
   Everything is drawn without lighting or ink passes (layer 1), so it looks exactly like the artwork.
   A part can come from any picture: the user's generated part images (see art/yami/PROMPTS.md) or, until then,
   regions cut from a character sheet. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;

  // A damped spring: follows a target with lag and a little overshoot (follow-through).
  class Spring {
    constructor(v = 0, k = 90, d = 11) { this.v = v; this.vel = 0; this.k = k; this.d = d; this.to = v; }
    step(dt) { const n = Math.max(1, Math.ceil(dt / 0.016)), h = dt / n; for (let i = 0; i < n; i++) { this.vel += (this.k * (this.to - this.v) - this.d * this.vel) * h; this.v += this.vel * h; } return this.v; }
    kick(x) { this.vel += x; }
  }
  const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  // Key poses with holds: hold(name, value) moves there over `inn` seconds (eased) and stays.
  class Keys {
    constructor(v = 0) { this.a = v; this.b = v; this.t0 = 0; this.dur = 0; this.v = v; }
    go(b, now, dur) { this.a = this.v; this.b = b; this.t0 = now; this.dur = dur; }
    step(now) { const p = this.dur ? Math.min(1, (now - this.t0) / this.dur) : 1; this.v = this.a + (this.b - this.a) * ease(p); return this.v; }
  }

  // One view of a character: parts on a shared frame (fw × fh px), shown `height` world units tall.
  class View {
    constructor(spec, height) {
      this.spec = spec; this.root = new T.Group(); this.parts = {}; this.k = height / spec.fh;
      const k = this.k, fw = spec.fw, fh = spec.fh;
      // frame px → local units, origin at the bottom centre of the frame
      const P = ([x, y]) => [(x - fw / 2) * k, (fh - y) * k];
      for (const p of spec.parts) {
        const joint = new T.Group(), [px, py] = P(p.pivot);
        const parent = p.parent ? this.parts[p.parent] : null, [ox, oy] = parent ? parent.pv : [0, 0];
        joint.position.set(px - ox, py - oy, (p.z || 0) * 0.002);
        const segs = p.bend ? 14 : 1, g = new T.PlaneGeometry(fw * k, fh * k, segs, segs);
        g.translate(fw * k / 2 - fw * k / 2 - px, fh * k / 2 - py, 0); // the picture placed so its pivot is at the joint
        const tex = p.tex || new T.CanvasTexture(p.canvas);
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: T.DoubleSide, depthWrite: true }));
        m.layers.set(1); m.layers.enable(2); m.renderOrder = 1 + (p.z || 0) * 0.01; joint.add(m);
        (parent ? parent.joint : this.root).add(joint);
        const part = { joint, mesh: m, tex, pv: [px, py], spec: p, base: g.attributes.position.array.slice() };
        if (p.bend) { const [bx, by] = P(p.bend.tip); part.len = Math.hypot(bx - px, by - py) || 1; }
        this.parts[p.name] = part;
      }
    }
    // pose: { part: { r, x, y, sx, sy, bend, show, tex } } in radians and frame px
    apply(pose) {
      for (const [name, q] of Object.entries(pose)) {
        const p = this.parts[name]; if (!p) continue; const j = p.joint;
        const parent = p.spec.parent ? this.parts[p.spec.parent] : null, [ox, oy] = parent ? parent.pv : [0, 0];
        j.position.x = p.pv[0] - ox + (q.x || 0) * this.k; j.position.y = p.pv[1] - oy - (q.y || 0) * this.k;
        j.rotation.z = q.r || 0; j.scale.set(q.sx || 1, q.sy || 1, 1);
        if (q.show !== undefined) p.mesh.visible = q.show;
        if (q.tex && p.mesh.material.map !== q.tex) { p.mesh.material.map = q.tex; p.mesh.material.needsUpdate = true; }
        if (p.spec.bend && q.bend !== undefined) this.bend(p, q.bend);
      }
    }
    // Bends a part along its length: each point turns about the pivot by more the further out it is.
    bend(p, amt) {
      const a = p.mesh.geometry.attributes.position, s = p.base, L = p.len;
      for (let i = 0; i < a.count; i++) {
        const x = s[i * 3], y = s[i * 3 + 1], d = Math.min(1.4, Math.hypot(x, y) / L), ang = amt * Math.pow(d, 1.4), c = Math.cos(ang), sn = Math.sin(ang);
        a.array[i * 3] = x * c - y * sn; a.array[i * 3 + 1] = x * sn + y * c;
      }
      a.needsUpdate = true;
    }
  }

  // A character: its views, one shown at a time, in a card that faces the camera.
  class Character {
    constructor(views, height) {
      this.group = new T.Group(); this.card = new T.Group(); this.group.add(this.card); this.views = {};
      for (const [k, spec] of Object.entries(views)) { const v = new View(spec, height); v.root.visible = false; this.card.add(v.root); this.views[k] = v; }
      this.cur = null; this.turnAt = -9; this.flip = 1;
      const sh = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x3a2a40, transparent: true, opacity: 0.22, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1.3, 0.8, 1); sh.layers.set(1); this.group.add(sh); this.shadow = sh;
    }
    show(name, now, flip = 1) {
      if (name !== this.cur || flip !== this.flip) { if (this.cur) this.turnAt = now; for (const [k, v] of Object.entries(this.views)) v.root.visible = k === name; this.cur = name; this.flip = flip; }
      return this.views[name];
    }
    // The turn cheat: squeezes thin for a beat and springs back, so a change of view reads as a turn.
    turnSquash(now) { const p = (now - this.turnAt) / 0.17; return p < 0 || p > 1 ? 1 : 0.55 + 0.45 * ease(p); }
  }

  IH.anim2d = { Spring, Keys, View, Character, ease };
})();
