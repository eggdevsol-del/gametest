/* Chorecast homes (a prototype), part 2 of 5: the modelling kit.
   Furniture, walls and pets are built from rounded boxes, cylinders, balls, cones and lathed shapes. Each part keeps
   its own colour and part number (so the ink draws a line where two parts meet), and everything one item is made of
   is merged into one mesh, so a room full of things stays a few dozen draws. Glass, water and glowing parts are
   kept apart because they draw differently. One unit is one floor tile, about 50 cm. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const L = () => IH.look;
  let seq = 7;
  // Part numbers go into an 8-bit channel; stepping by a prime keeps neighbours far apart.
  const nextId = () => { seq = (seq + 89) % 251; return (seq + 3) / 255; };

  // Rounded box, centred, non-indexed (after three's RoundedBoxGeometry).
  const RB = new Map();
  function rbox(w, h, d, r, seg) {
    r = Math.max(0, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    const key = [w, h, d, r, seg].map(v => +v.toFixed(4)).join(':');
    if (RB.has(key)) return RB.get(key);
    let g;
    if (r < 0.005) g = new T.BoxGeometry(w, h, d).toNonIndexed();
    else {
      const s = seg * 2 + 1; g = new T.BoxGeometry(1, 1, 1, s, s, s).toNonIndexed();
      const p = g.attributes.position.array, n = g.attributes.normal.array, half = 0.5 / s, bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, v = new T.Vector3();
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i], y = p[i + 1], z = p[i + 2];
        v.set(x - Math.sign(x) * half, y - Math.sign(y) * half, z - Math.sign(z) * half).normalize();
        p[i] = bx * Math.sign(x) + v.x * r; p[i + 1] = by * Math.sign(y) + v.y * r; p[i + 2] = bz * Math.sign(z) + v.z * r;
        n[i] = v.x; n[i + 1] = v.y; n[i + 2] = v.z;
      }
    }
    g.deleteAttribute('uv'); RB.set(key, g); return g;
  }
  const flat = g => { const o = g.index ? g.toNonIndexed() : g; if (o.attributes.uv) o.deleteAttribute('uv'); return o; };
  const GC = new Map();
  const cached = (key, make) => { if (!GC.has(key)) GC.set(key, flat(make())); return GC.get(key); };

  const C = new T.Color(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S = new T.Vector3(), N3 = new T.Matrix3();

  class Kit {
    constructor() { this.parts = []; this.extra = []; this.stack = [new T.Matrix4()]; }
    get top() { return this.stack[this.stack.length - 1]; }
    // Everything added inside fn is moved by (x, y, z) and turned by ry (and rx, rz).
    at(x, y, z, ry, fn, rx = 0, rz = 0, s = 1) {
      const m = new T.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(s, s, s));
      this.stack.push(this.top.clone().multiply(m)); fn(this); this.stack.pop(); return this;
    }
    _m(x, y, z, o) {
      const m = new T.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(o.rx || 0, o.ry || 0, o.rz || 0)), S.set(...(o.s || [1, 1, 1])));
      return this.top.clone().multiply(m);
    }
    add(geo, col, m, o = {}) { this.parts.push({ geo, col, m, id: o.id != null ? o.id : nextId(), emit: o.emit || 0, pat: o.pat || 0, ps: o.ps || 1 }); return this; }
    // Boxes, cylinders and cones sit on y (their bottom); balls are centred on y.
    box(w, h, d, x, y, z, col, o = {}) { const r = o.r != null ? o.r : Math.min(0.07, Math.min(w, h, d) * 0.18); return this.add(rbox(w, h, d, r, o.seg || 1), col, this._m(x, y + h / 2, z, o), o); }
    cyl(r, h, x, y, z, col, o = {}) {
      const rt = o.rt != null ? o.rt : r, n = o.n || 18;
      return this.add(cached(`c${rt}:${r}:${h}:${n}`, () => new T.CylinderGeometry(rt, r, h, n)), col, this._m(x, y + h / 2, z, o), o);
    }
    cone(r, h, x, y, z, col, o = {}) { const n = o.n || 16; return this.add(cached(`k${r}:${h}:${n}`, () => new T.ConeGeometry(r, h, n)), col, this._m(x, y + h / 2, z, o), o); }
    ball(r, x, y, z, col, o = {}) { const n = o.n || 16; return this.add(cached(`b${r}:${n}`, () => new T.SphereGeometry(r, n, Math.max(8, n * 0.7 | 0))), col, this._m(x, y, z, o), o); }
    torus(R, t, x, y, z, col, o = {}) { const arc = o.arc || Math.PI * 2; return this.add(cached(`t${R}:${t}:${arc}`, () => new T.TorusGeometry(R, t, 8, 24, arc)), col, this._m(x, y, z, o), o); }
    // pts: [[radius, height], ...] from the bottom up
    lathe(pts, x, y, z, col, o = {}) { const n = o.n || 20, key = 'l' + n + JSON.stringify(pts); return this.add(cached(key, () => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), n)), col, this._m(x, y, z, o), o); }
    // A capsule along y, bottom at y.
    pill(r, len, x, y, z, col, o = {}) {
      const pts = []; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; pts.push([Math.cos(a) * r + 1e-4, r + Math.sin(a) * r]); }
      for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([Math.cos(a) * r + 1e-4, r + len + Math.sin(a) * r]); }
      return this.lathe(pts, x, y, z, col, Object.assign({ n: 14 }, o));
    }
    // Flat shape in the xz plane (for rugs and puddles), extruded up by h.
    shape(points, h, x, y, z, col, o = {}) {
      const key = 's' + h + JSON.stringify(points);
      const g = cached(key, () => { const sh = new T.Shape(points.map(p => new T.Vector2(p[0], -p[1]))); const e = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 24 }); e.rotateX(-Math.PI / 2); return e; });
      return this.add(g, col, this._m(x, y, z, o), o);
    }
    // Parts that draw with their own material: 'glass', 'water' or a THREE.Material.
    special(geo, kind, m, o = {}) { this.extra.push({ geo, kind, m, o }); return this; }
    // A painted picture on a surface: geo carries the uvs, paint is a canvas texture (painted(), below); the anime
    // light and shade still fall on it, and it follows k.at() like everything else.
    painted(geo, tex, x, y, z, o = {}) { const mat = L().animeMat({ map: tex, side: o.double ? T.DoubleSide : T.FrontSide }); mat.userData.painted = true; this.extra.push({ geo, kind: mat, m: this._m(x, y, z, o), o: { solid: true, flat: geo.type === 'PlaneGeometry' || geo.type === 'CircleGeometry' } }); return this; } // (flat pictures take no shadow speckle)
    glassBox(w, h, d, x, y, z, o = {}) { return this.special(rbox(w, h, d, 0.01, 1), o.tint ? { glass: o.tint } : 'glass', this._m(x, y + h / 2, z, o), o); }
    waterBox(w, h, d, x, y, z, o = {}) { return this.special(rbox(w, h, d, Math.min(0.05, w * 0.1), 1), 'water', this._m(x, y + h / 2, z, o), o); }
    waterBall(r, x, y, z, o = {}) { return this.special(cached('wb' + r, () => new T.SphereGeometry(r, 18, 12)), 'water', this._m(x, y, z, o), o); }

    // Merges the coloured parts into one mesh, adds the special parts, and returns a group.
    build(o = {}) {
      const g = new T.Group(); g.userData.kit = true;
      if (this.parts.length) {
        let n = 0; for (const p of this.parts) n += p.geo.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cl = new Float32Array(n * 3), ext = new Float32Array(n * 2), pat = new Float32Array(n * 2);
        const fin = o.fin || this.fin; // a chosen colour and finish: recolours the item's main colour family and lays a pattern on it
        let k = 0;
        for (const p of this.parts) {
          const a = p.geo.attributes.position.array, b = p.geo.attributes.normal.array, c = p.geo.attributes.position.count;
          N3.getNormalMatrix(p.m); let pp = p.pat, ps = p.ps; if (fin && fin.match(p.col)) { C.set(fin.col(p.col)); if (fin.pat) { pp = fin.pat; ps = fin.ps || 1; } } else C.set(p.col); const e = p.m.elements, ne = N3.elements;
          for (let i = 0; i < c; i++) {
            const x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2], j = (k + i) * 3;
            pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
            const nx = b[i * 3], ny = b[i * 3 + 1], nz = b[i * 3 + 2];
            let ox = ne[0] * nx + ne[3] * ny + ne[6] * nz, oy = ne[1] * nx + ne[4] * ny + ne[7] * nz, oz = ne[2] * nx + ne[5] * ny + ne[8] * nz; const l = Math.hypot(ox, oy, oz) || 1;
            nor[j] = ox / l; nor[j + 1] = oy / l; nor[j + 2] = oz / l;
            cl[j] = C.r; cl[j + 1] = C.g; cl[j + 2] = C.b; ext[(k + i) * 2] = p.id; ext[(k + i) * 2 + 1] = p.emit; pat[(k + i) * 2] = pp; pat[(k + i) * 2 + 1] = ps;
          }
          k += c;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
        geo.setAttribute('color', new T.BufferAttribute(cl, 3)); geo.setAttribute('aExt', new T.BufferAttribute(ext, 2)); geo.setAttribute('aPat', new T.BufferAttribute(pat, 2));
        geo.computeBoundingSphere(); geo.computeBoundingBox();
        const glow = this.parts.some(p => p.emit > 0);
        const mat = o.mat || (glow ? L().animeMat({ side: o.double ? T.DoubleSide : T.FrontSide, pat: true }) : o.double ? L().BASE2 : L().BASE);
        const mesh = new T.Mesh(geo, mat); mesh.castShadow = o.shadow !== false; mesh.receiveShadow = true; mesh.userData.main = true;
        if (glow) g.userData.glowMat = mat;
        g.add(mesh); g.userData.mesh = mesh;
      }
      for (const s of this.extra) {
        const mat = s.kind === 'water' ? L().waterMat(s.o.tint, s.o.a) : s.kind === 'glass' ? L().glassMat(undefined, s.o.a) : s.kind && s.kind.glass ? L().glassMat(s.kind.glass, s.o.a) : s.kind;
        const m = new T.Mesh(s.geo, mat); m.applyMatrix4(s.m); m.userData.special = true;
        if (s.o.solid) { m.castShadow = true; m.receiveShadow = !s.o.flat; } else { m.layers.set(1); m.renderOrder = 2; m.castShadow = false; m.receiveShadow = false; }
        g.add(m);
      }
      return g;
    }
  }

  // Canvas textures painted once and shared: key -> texture. draw(ctx, w, h) paints it.
  const PAINT = {};
  function painted(key, w, h, draw) { if (PAINT[key]) return PAINT[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return (PAINT[key] = t); }

  // Small colour helpers
  const shade = (hex, k) => { const c = new T.Color(hex); if (k < 0) c.lerp(new T.Color(0x000000), -k); else c.lerp(new T.Color(0xffffff), k); return '#' + c.getHexString(); };
  const rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  IH.kit = { Kit, rbox, nextId, shade, rng, painted };
})();
