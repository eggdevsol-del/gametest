/* Chorecast homes (a prototype): where a home is. No more floating islands: each home stands on its own plot at
   street level, in one of two places, built round it in the same cel-shaded anime look (scenery: no ink lines).
   - 'city': inner-city Tokyo. A narrow lane out the front with power poles and their wires, a vending machine and
     bikes; the neighbours' two-storey houses behind their block walls on every side, flats further out, a train
     on a viaduct behind, and the city's towers on the skyline. Windows light up at dusk and night.
   - 'country': the Japanese countryside. A farm lane with an irrigation channel and wooden power poles, flooded rice
     paddies with rows of young rice, an old thatched farmhouse or two, a river, cedar woods on the hills and blue
     mountains far off.
   build(def, kind, bounds) gives { group, lit, tick(t), kind }: lit is the windows and lamps that glow after dark
   (app.js shows it at dusk and night); tick moves the train. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit, shade } = IH.kit;
  const TE = 0.32; // (an outside wall's thickness, as in homes.js)
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];

  // which homes are where to start with (a kid can move any home between the two, under Look)
  const DEFAULT = { studio: 'sidewalk', flat: 'sidewalk', town: 'sidewalk', family: 'sidewalk', cabin: 'sidewalk', bach: 'sidewalk', farm: 'sidewalk', manor: 'sidewalk' }; // (every home on its floating island with a pavement along its front, people walking past; the street, tower, city and country builders are kept here, unused)
  const KINDS = [['sidewalk', 'Pavement out front']];

  // ---------- pieces
  // place(): build something at (x, z), turned ry and scaled sc, into the main kit and (its lit windows and lamps) the
  // lit kit, both moved the same way. Kit-made things are drawn small (a door ~1 m); sc brings them to life size.
  const NOLIT = { box() {}, ball() {}, cyl() {}, at() {} };
  const place = (k, lit, x, z, ry, sc, fn) => k.at(x, 0, z, ry, kk => { if (lit) lit.at(x, 0, z, ry, ll => fn(kk, ll), 0, 0, sc); else fn(kk, NOLIT); }, 0, 0, sc);
  // a two-storey Japanese house: siding walls, a hipped tiled roof with eaves, windows with frames, a balcony with
  // its rail (and washing or a futon over it, sometimes), an air-con unit, a little porch roof over the door
  function house(k, lit, x, z, w, d, ry, R, sc = 1) {
    const wall = pick(R, ['#f2ece2', '#e6e1d6', '#d9d4cc', '#efe3cf', '#cfd6dc', '#e9dccb']), roof = pick(R, ['#4b5566', '#3f4a5c', '#5a5f6b', '#6b4a3f', '#3d5a63']), trim = '#ffffff';
    const h1 = 2.6, h2 = 2.5;
    place(k, lit, x, z, ry, sc, (kk, ll) => {
      kk.box(w, h1 + h2, d, 0, 0, 0, wall, { r: 0.05 });
      kk.box(w + 0.1, 0.12, d + 0.1, 0, h1, 0, shade(wall, -0.08), { r: 0.03 }); // the line between the floors
      kk.cone(Math.max(w, d) * 0.78, 1.7, 0, h1 + h2, 0, roof, { n: 4, ry: Math.PI / 4, s: [w / Math.max(w, d), 1, d / Math.max(w, d)] }); // hipped roof
      kk.box(w + 0.7, 0.12, d + 0.7, 0, h1 + h2 - 0.06, 0, shade(roof, 0.1), { r: 0.04 }); // eaves
      const nf = Math.max(1, Math.floor(w / 2.2));
      for (const fl of [0, 1]) for (let i = 0; i < nf; i++) {
        const wx = -w / 2 + (i + 0.5) * (w / nf), wy = 0.9 + fl * h1;
        kk.box(1.1, 1.0, 0.08, wx, wy, d / 2 + 0.02, trim, { r: 0.02 }); kk.box(0.92, 0.84, 0.06, wx, wy + 0.08, d / 2 + 0.05, '#5d7895', { r: 0.01 });
        if (R() < 0.55) ll.box(0.9, 0.82, 0.04, wx, wy + 0.09, d / 2 + 0.085, pick(R, ['#ffd89a', '#ffe7b8', '#fff2d6']), { r: 0.01, emit: 1 });
      }
      const ns = Math.max(1, Math.floor(d / 2.6));
      for (let i = 0; i < ns; i++) { const wz = -d / 2 + (i + 0.5) * (d / ns); kk.box(0.08, 0.9, 0.9, w / 2 + 0.02, 0.95 + h1, wz, trim, { r: 0.02 }); kk.box(0.06, 0.74, 0.74, w / 2 + 0.05, 1.03 + h1, wz, '#5d7895', { r: 0.01 }); if (R() < 0.5) ll.box(0.04, 0.72, 0.72, w / 2 + 0.085, 1.04 + h1, wz, '#ffe2a8', { r: 0.01, emit: 1 }); }
      kk.box(w * 0.6, 0.12, 0.9, -w * 0.12, h1 + 0.05, d / 2 + 0.45, '#cfcac2', { r: 0.03 }); // the balcony
      for (let i = 0; i <= 8; i++) kk.box(0.04, 0.9, 0.04, -w * 0.42 + i * (w * 0.6 / 8), h1 + 0.17, d / 2 + 0.88, '#9aa0aa', { r: 0.01 });
      kk.box(w * 0.6, 0.06, 0.06, -w * 0.12, h1 + 1.05, d / 2 + 0.88, '#9aa0aa', { r: 0.02 });
      if (R() < 0.5) kk.box(1.3, 0.7, 0.08, -w * 0.12, h1 + 0.5, d / 2 + 0.93, pick(R, ['#ffffff', '#ffd7e2', '#cfe6ff', '#fff1b8']), { r: 0.03 }); // a futon over the rail
      kk.box(0.7, 0.5, 0.35, w / 2 - 0.6, 0.3, d / 2 + 0.2, '#e8e8ea', { r: 0.04 }); kk.cyl(0.17, 0.04, w / 2 - 0.6, 0.55, d / 2 + 0.38, '#b9bcc4', { rx: Math.PI / 2, n: 12 }); // an air-con unit
      kk.box(1.6, 0.08, 0.8, w * 0.25, 2.2, d / 2 + 0.4, roof, { r: 0.02 }); kk.box(1.0, 2.0, 0.08, w * 0.25, 0, d / 2 + 0.02, '#8a6a52', { r: 0.03 }); // porch roof, front door
      ll.ball(0.12, w * 0.25 + 0.6, 1.9, d / 2 + 0.1, '#fff1c8', { n: 8, emit: 1 }); // the door light
    });
  }
  // a block of flats (a 'mansion'): balconies in stripes, lit windows
  function flats(k, lit, x, z, w, d, floors, ry, R, sc = 1) {
    const wall = pick(R, ['#e9e6e0', '#d8d3cb', '#cfd3d9', '#e4dccf']), h = floors * 2.6;
    place(k, lit, x, z, ry, sc, (kk, ll) => {
      kk.box(w, h, d, 0, 0, 0, wall, { r: 0.06 });
      kk.box(w + 0.2, 0.3, d + 0.2, 0, h, 0, shade(wall, -0.1), { r: 0.05 });
      const nw = Math.max(1, Math.floor(w / 2));
      for (let f = 0; f < floors; f++) {
        kk.box(w + 0.1, 0.16, 0.9, 0, f * 2.6 + 0.9, d / 2 + 0.45, '#c8c4bd', { r: 0.03 }); kk.box(w + 0.1, 0.8, 0.08, 0, f * 2.6 + 1.06, d / 2 + 0.88, shade(wall, -0.05), { r: 0.02 });
        for (let i = 0; i < nw; i++) { const wx = -w / 2 + (i + 0.5) * (w / nw); kk.box(1.2, 1.3, 0.06, wx, f * 2.6 + 1.0, d / 2 + 0.02, '#5a7290', { r: 0.01 }); if (R() < 0.45) ll.box(1.15, 1.25, 0.04, wx, f * 2.6 + 1.02, d / 2 + 0.06, pick(R, ['#ffd89a', '#ffe7b8', '#fff2d6', '#d8ecff']), { r: 0.01, emit: 1 }); }
      }
    });
  }
  // a concrete block wall along a lot's edge, capped (about 1.2 m)
  const blockWall = (k, x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); k.at((x0 + x1) / 2, 0, (z0 + z1) / 2, a, kk => { kk.box(0.3, 2.4, L, 0, 0, 0, '#c4c1bb', { r: 0.03 }); kk.box(0.4, 0.12, L, 0, 2.4, 0, '#b0ada6', { r: 0.03 }); }); };
  // a power pole: concrete (city) or wood (country), with its crossarm, sometimes a transformer, and a street lamp
  function pole(k, lit, x, z, wood, R, sc = 1) {
    const c = wood ? '#8a6a4a' : '#bdbab4';
    place(k, lit, x, z, 0, sc, (kk, ll) => {
      kk.cyl(0.13, 7.2, 0, 0, 0, c, { rt: 0.1, n: 8 });
      kk.box(1.9, 0.12, 0.12, 0, 6.6, 0, c, { r: 0.02 }); for (const dx of [-0.8, 0, 0.8]) kk.cyl(0.05, 0.18, dx, 6.72, 0, '#e8e8ea', { n: 6 });
      if (!wood && R() < 0.4) kk.cyl(0.32, 0.9, 0.35, 5.0, 0, '#9da3ab', { n: 10 }); // a transformer
      kk.box(0.06, 0.06, 0.8, 0, 4.6, 0.4, '#8a8f96', { r: 0.01 }); kk.box(0.3, 0.12, 0.2, 0, 4.52, 0.8, '#d8dde4', { r: 0.03 }); ll.box(0.26, 0.04, 0.16, 0, 4.49, 0.8, '#fff3d0', { r: 0.01, emit: 1 }); // street lamp
    });
  }
  // the three wires between two poles, at the crossarm
  function wires(k, a, b, sc = 1) { for (const dx of [-0.8, 0, 0.8]) { const x0 = a[0] + dx * sc, x1 = b[0] + dx * sc, L = Math.hypot(x1 - x0, b[1] - a[1]), ang = Math.atan2(x1 - x0, b[1] - a[1]); k.box(0.05, 0.05, L, (x0 + x1) / 2, 6.78 * sc, (a[1] + b[1]) / 2, '#3d3f46', { r: 0.01, ry: ang }); } }
  function vending(k, lit, x, z, ry, R, sc = 1) {
    const c = pick(R, ['#e8edf2', '#d94848', '#3b7fd6']), cans = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) cans.push(pick(R, ['#ff7a7a', '#7ac8ff', '#ffd36a', '#8fe08f', '#ffffff']));
    place(k, lit, x, z, ry, sc, (kk, ll) => {
      kk.box(1.1, 2.0, 0.8, 0, 0, 0, c, { r: 0.05 });
      kk.box(0.95, 0.9, 0.04, 0, 1.0, 0.41, '#eaf6ff', { r: 0.01 }); cans.forEach((cc, n) => kk.cyl(0.05, 0.16, -0.35 + (n % 6) * 0.14, 1.12 + Math.floor(n / 6) * 0.27, 0.43, cc, { n: 8 }));
      kk.box(0.6, 0.18, 0.06, 0, 0.35, 0.41, '#3a3d44', { r: 0.02 }); ll.box(0.9, 0.85, 0.02, 0, 1.02, 0.44, '#f2fbff', { r: 0.01, emit: 1 });
    });
  }
  function bike(k, x, z, ry, R, sc = 1) { const c = pick(R, ['#e8edf2', '#ff8fae', '#6fb8e8', '#9be38f']); place(k, null, x, z, ry, sc, kk => { for (const dz of [-0.45, 0.45]) kk.torus(0.3, 0.035, 0, 0.32, dz, '#2d2a3a', { ry: Math.PI / 2 }); kk.box(0.06, 0.06, 0.9, 0, 0.5, 0, c, { r: 0.02, rx: 0.2 }); kk.box(0.06, 0.5, 0.06, 0, 0.32, -0.15, c, { r: 0.02 }); kk.box(0.2, 0.06, 0.3, 0, 0.82, -0.2, '#2d2a3a', { r: 0.03 }); kk.box(0.5, 0.05, 0.05, 0, 0.92, 0.42, '#9aa0aa', { r: 0.02 }); kk.box(0.34, 0.22, 0.26, 0, 0.82, 0.55, '#9aa0aa', { r: 0.02 }); }); }
  // a cedar (sugi), tall and narrow; a round broadleaf (a persimmon, with its orange fruit, in orange)
  const cedar = (k, x, z, s, R) => { k.cyl(0.14 * s, 1.4 * s, x, 0, z, '#6b4a33', { n: 6 }); for (let i = 0; i < 3; i++) k.cone((1.0 - i * 0.24) * s, 1.8 * s, x, (1.0 + i * 1.05) * s, z, shade('#2f6b45', R() * 0.08 - i * 0.03), { n: 7 }); };
  const broad = (k, x, z, s, R, c = '#4f9a4a') => { k.cyl(0.16 * s, 1.4 * s, x, 0, z, '#73502f', { n: 6 }); k.ball(1.1 * s, x, 2.0 * s, z, shade(c, R() * 0.1 - 0.05), { n: 10 }); k.ball(0.8 * s, x + 0.6 * s, 2.5 * s, z + 0.2 * s, shade(c, 0.06), { n: 9 }); };
  function farmhouse(k, lit, x, z, ry, sc = 1) {
    place(k, lit, x, z, ry, sc, (kk, ll) => {
      kk.box(9, 0.5, 6.4, 0, 0, 0, '#9a8f7e', { r: 0.05 }); // stone base
      kk.box(8.4, 2.6, 5.8, 0, 0.5, 0, '#efe7d8', { r: 0.04 }); for (let i = 0; i < 7; i++) kk.box(0.18, 2.6, 0.12, -4.2 + i * 1.4, 0.5, 2.92, '#5b3f2c', { r: 0.02 }); // plaster walls, dark timber posts
      kk.box(8.6, 0.14, 0.14, 0, 1.9, 2.92, '#5b3f2c', { r: 0.02 });
      kk.box(5.6, 1.6, 0.08, 0, 0.6, 2.96, '#d8cbb0', { r: 0.02 }); for (let i = 0; i < 8; i++) kk.box(0.03, 1.6, 0.03, -2.8 + i * 0.8, 0.6, 3.0, '#6b4a33', { r: 0.005 }); // sliding doors on the veranda
      ll.box(5.4, 1.4, 0.02, 0, 0.7, 3.02, '#ffe2a8', { r: 0.01, emit: 1 });
      kk.box(10.2, 0.2, 7.6, 0, 3.0, 0, '#a28a5c', { r: 0.1 }); kk.cone(6.2, 4.4, 0, 3.1, 0, '#b8a06a', { n: 4, ry: Math.PI / 4, s: [1.35, 1, 1] }); kk.box(2.2, 0.5, 0.6, 0, 7.2, 0, '#6b5434', { r: 0.1 }); // a deep thatched roof
    });
  }
  function paddy(k, x0, z0, w, d, R) {
    k.box(w - 0.3, 0.03, d - 0.3, x0 + w / 2, -0.04, z0 + d / 2, '#6f6048', { r: 0.01 }); // the mud
    k.box(w - 0.3, 0.07, d - 0.3, x0 + w / 2, -0.02, z0 + d / 2, '#86c4de', { r: 0.01 }); for (let n = 0; n < 2; n++) k.box(0.9 + R() * 1.2, 0.005, 0.08, x0 + 1 + R() * (w - 3), 0.051, z0 + 0.8 + R() * (d - 1.6), '#d6f0fa', { r: 0 }); // the flooded field, a glint of sky on it
    for (let i = 0.7; i < w - 0.6; i += 0.75) for (let j = 0.65; j < d - 0.5; j += 0.6) if (R() < 0.85) for (let t = 0; t < 3; t++) k.cone(0.03, 0.38 + R() * 0.14, x0 + i + (t - 1) * 0.06, 0, z0 + j, pick(R, ['#6fbf4f', '#7fcc5a', '#5fae45']), { n: 3, rz: (t - 1) * 0.25 }); // rows of young rice, a few blades each
    k.box(w, 0.2, 0.32, x0 + w / 2, -0.04, z0 + 0.16, '#8cbf5c', { r: 0.08 }); k.box(0.32, 0.2, d, x0 + 0.16, -0.04, z0 + d / 2, '#8cbf5c', { r: 0.08 }); // the grassy ridges (aze) between paddies
  }

  const TILES = { city: 48, tower: 48, country: 110 }; // (a block's size: blocks.js)

  // ---------- the street the Cosy Studio is on (scenery-src/street.py: built in Blender after the user's painting of a
  // Tokyo street, at real size in metres). Read here into the home's own cel-shaded look: each part keeps its colour as
  // vertex colours on the shared anime material (no ink: scenery); the shop signs get their writing painted on.
  const SIGNS = {
    SIGN_RAMEN: { t: 'ラーメン', bg: '#fbfbf8', fg: '#2d2a3a', v: true }, SIGN_TOKYO: { t: '東京', bg: '#fbf6ea', fg: '#d64040' }, SIGN_CAFE: { t: 'CAFE', bg: '#2f4f74', fg: '#ffffff' },
    SIGN_KONBINI: { t: 'コンビニ', bg: '#fbfbf8', fg: '#2d2a3a', v: true }, SIGN_ATM: { t: 'ATM', bg: '#f6f2ea', fg: '#d64040' }, SIGN_BUS: { t: 'CITY BUS', bg: '#2d3440', fg: '#ffffff' }, SIGN_SHOP: { t: 'OPEN', bg: '#fbfbf8', fg: '#3f7f5a' }
  };
  const signTex = sg => {
    const c = document.createElement('canvas'), v = !!sg.v; c.width = v ? 128 : 512; c.height = v ? 512 : 128; const x = c.getContext('2d');
    x.fillStyle = sg.bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = sg.fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (v) { const ch = [...sg.t]; x.font = `700 ${Math.floor(440 / ch.length * 0.8)}px "Hiragino Sans", "Noto Sans JP", sans-serif`; ch.forEach((q, i) => x.fillText(q, 64, (i + 0.5) * 512 / ch.length)); }
    else { x.font = '700 84px "Hiragino Sans", "Noto Sans JP", Nunito, sans-serif'; x.fillText(sg.t, 256, 68); }
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  };
  // which texture (scenery-src/textures, made in Morphic) each of the street's materials wears
  const TEX_OF = { roof_red: 'roof_tiles', roof_red2: 'roof_tiles', roof_blue: 'roof_metal', roof_teal: 'roof_metal', roof_grey: 'roof_metal', wall_w: 'plaster', wall_g: 'plaster', wall_shop: 'plaster', wall_c: 'facade_tiles',
    wood: 'wood', wood_d: 'wood', asphalt: 'asphalt', paving: 'paving', paving2: 'paving', kerb: 'paving', concrete: 'paving', grass: 'grass', grass2: 'grass', field: 'grass', leaf: 'foliage', leaf2: 'foliage', leaf3: 'foliage', blossom: 'blossom', blossom2: 'blossom', blossom3: 'blossom', trunk: 'bark' };
  let ATLAS = null;
  function loadAtlas() {
    if (ATLAS) return ATLAS;
    ATLAS = (async () => {
      const info = await (await fetch('home/scenery/atlas.json')).json(), img = new Image(); img.src = 'home/scenery/atlas.jpg'; await img.decode();
      const tex = new T.Texture(img); tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.needsUpdate = true;
      return { info, mat: IH.look.cutMat(IH.look.atlasMat(tex, info)) };
    })();
    return ATLAS;
  }
  const GLBS = new Map();
  function loadStreet(url) {
    if (GLBS.has(url)) return GLBS.get(url);
    const P = (async () => {
      const AT = await loadAtlas().catch(() => null), TI = AT && AT.info.tiles;
      const res = await fetch(url); if (!res.ok) throw new Error('no street'); const buf = await res.arrayBuffer(), dv = new DataView(buf);
      let off = 12, json = null, bin = null;
      while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len))); else bin = buf.slice(off + 8, off + 8 + len); off += 8 + len; }
      const CT = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
      const acc = i => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], C = CT[a.componentType], n = NC[a.type], st = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * C.BYTES_PER_ELEMENT, out = new C(a.count * n), src = new DataView(bin);
        for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const q = st + k * stride + c * C.BYTES_PER_ELEMENT; out[k * n + c] = C === Float32Array ? src.getFloat32(q, true) : C === Uint16Array ? src.getUint16(q, true) : C === Uint32Array ? src.getUint32(q, true) : src.getUint8(q); }
        return out; };
      const toS = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; // (the file's colours are linear; the look wants them as painted)
      const parts = [];
      json.nodes.forEach((n, ni) => {
        if (n.mesh == null) return; const M = new T.Matrix4(); if (n.matrix) M.fromArray(n.matrix); else M.compose(new T.Vector3(...(n.translation || [0, 0, 0])), new T.Quaternion(...(n.rotation || [0, 0, 0, 1])), new T.Vector3(...(n.scale || [1, 1, 1])));
        const pos = [], nor = [], col = [], uvs = [], tile = [], signs = [];
        for (const pr of json.meshes[n.mesh].primitives) {
          const m = json.materials[pr.material] || {}, P = acc(pr.attributes.POSITION), N = pr.attributes.NORMAL != null ? acc(pr.attributes.NORMAL) : null, I = pr.indices != null ? acc(pr.indices) : null;
          const cnt = I ? I.length : P.length / 3, get = k => I ? I[k] : k;
          if (SIGNS[m.name]) { const p2 = [], n2 = []; for (let k = 0; k < cnt; k++) { const v = get(k); p2.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); if (N) n2.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); } signs.push({ sign: m.name, p: p2, n: n2 }); continue; }
          const bc = (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor) || [0.8, 0.8, 0.8, 1], U = pr.attributes.TEXCOORD_0 != null ? acc(pr.attributes.TEXCOORD_0) : null, tx = TI && U && TI[TEX_OF[m.name]];
          let c3 = [toS(bc[0]), toS(bc[1]), toS(bc[2])]; if (tx) c3 = c3.map((v, i) => Math.min(2.4, v / Math.max(0.05, tx.avg[i]))); // (textured: the colour becomes a tint over the texture's own)
          for (let k = 0; k < cnt; k++) { const v = get(k); pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); if (N) nor.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); col.push(...c3); uvs.push(U ? U[v * 2] : 0, U ? U[v * 2 + 1] : 0); tile.push(tx ? tx.i : -1); }
        }
        const g = new T.BufferGeometry(), cn = pos.length / 3; g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); if (nor.length) g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); else g.computeVertexNormals();
        g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setAttribute('aTile', new T.Float32BufferAttribute(tile, 1)); const id = ((ni * 89) % 251 + 3) / 255; g.setAttribute('aExt', new T.Float32BufferAttribute(new Float32Array(cn * 2).map((_, i) => i % 2 ? 0 : id), 2)); g.setAttribute('aPat', new T.Float32BufferAttribute(new Float32Array(cn * 2).map((_, i) => i % 2 ? 1 : 0), 2));
        g.applyMatrix4(M); g.computeBoundingBox(); g.computeBoundingSphere();
        const sg = signs.map(S => { const q = new T.BufferGeometry(); q.setAttribute('position', new T.Float32BufferAttribute(S.p, 3)); q.applyMatrix4(M); q.computeBoundingBox(); const bb = q.boundingBox, ex = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z], ax = ex[0] >= ex[2] ? 0 : 2, p = q.attributes.position.array, uv = []; for (let k = 0; k < p.length; k += 3) uv.push(ax === 0 ? (p[k] - bb.min.x) / (ex[0] || 1) : (p[k + 2] - bb.min.z) / (ex[2] || 1), (p[k + 1] - bb.min.y) / (ex[1] || 1)); q.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); return { g: q, sign: S.sign }; });
        parts.push({ name: n.name || '', g, signs: sg, mat: AT ? AT.mat : null });
      });
      return parts;
    })();
    GLBS.set(url, P); return P;
  }

  // everything round the home is drawn always, with only what's between the camera and the home cut out (look.js)
  const cutify = obj => obj.traverse(m => { if (m.isMesh && m.material && m.material.userData && m.material.userData.anime) { m.material = IH.look.cutMat(m.material); m.userData.cut = true; } });

  // ---------- the two places
  // Everything tall round the home is kept in eight slices by direction (bins). The slices on the camera's side are
  // cut away (a house to its ground-floor walls, a tree or tower gone) so nothing ever stands between the camera and
  // the home; turning the view brings them back. view(yaw) does that.
  function build(def, kind, b) {
    if (kind === 'sidewalk') { // nothing round the island: just where its pavement is, for the people walking past (app.js)
      const none = new T.Group(), lit = new T.Group(); lit.visible = false; none.add(lit);
      return { group: none, lit, kind, sidewalk: { x0: b.x0, x1: b.x1, z0: b.z1, z1: b.z1 + 6 }, stops: [], occ: [], view() {}, tick() {}, phase() {} };
    }
    const k = new Kit(), lit = new Kit(), R = rng((def.w * 131 + def.d * 17 + (kind === 'city' ? 7 : 3)) | 1), g = new T.Group();
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, front = b.z1, back = b.z0, left = b.x0, right = b.x1, FAR = kind === 'city' ? 320 : 640, S = 2.3, train = new T.Group(); // (S: Kit-made things to life size)
    const bins = Array.from({ length: 8 }, () => ({ k: new Kit(), lit: new Kit(), stub: new Kit(), fb: { k: new Kit(), lit: new Kit(), stub: new Kit() } })); // (fb: the stand-in neighbours, until the painted blocks are in)
    const at = (x, z) => bins[Math.floor(((Math.atan2(x - cx, z - cz) + Math.PI) / (Math.PI * 2)) * 8) % 8];
    const stub = (x, z, w, d, ry, col) => at(x, z).fb.stub.at(x, 0, z, ry, kk => { kk.box(w, 1.3, d, 0, 0, 0, col, { r: 0.04 }); kk.box(w - 0.3, 0.06, d - 0.3, 0, 1.3, 0, shade(col, -0.18), { r: 0.02 }); }); // (cut away: the walls to waist height)
    // where the painted blocks go: rows behind, across the lane in front, and beside the plot
    const tower = kind === 'tower', FLOOR = 5.4, BELOW = 9, Y0 = tower ? -FLOOR * BELOW : 0; // (in a tower the home's nine floors up: the street's 54 tiles, 27 m, below)
    const TW = tower ? { x0: -0.4, x1: (def.w + 2 * TE) * 6, z0: -def.d - 2 * TE - ((def.plot && def.plot.b) || 4), z1: front } : null; // the tower's footprint: six flats along, two deep
    const spots = [], lane = kind === 'city' ? 8.4 : 6.6, TILE = TILES[kind];
    if (tower) { for (let j = -3; j <= 3; j++) for (let r = 0; r < 3; r++) { spots.push([cx + j * TILE, TW.z0 - 1 - TILE / 2 - r * TILE]); spots.push([cx + j * TILE, TW.z1 + 9 + TILE / 2 + r * TILE]); } for (let r = 0; r < 2; r++) { spots.push([TW.x0 - 1 - TILE / 2 - r * TILE, (TW.z0 + TW.z1) / 2]); spots.push([TW.x1 + 1 + TILE / 2 + r * TILE, (TW.z0 + TW.z1) / 2]); } }
    else {
      for (let j = -3; j <= 3; j++) for (let r = 0; r < 3; r++) { spots.push([cx + j * TILE, back - 1 - TILE / 2 - r * TILE]); spots.push([cx + j * TILE, front + lane + TILE / 2 + r * TILE]); }
      for (let r = 0; r < 3; r++) for (const zc of [cz]) { spots.push([left - 1 - TILE / 2 - r * TILE, zc]); spots.push([right + 1 + TILE / 2 + r * TILE, zc]); }
    }
    const tiles = new T.Group(); g.add(tiles);
    // the blocks round the home (blocks.js: built clean after the Morphic pictures of real streets and farms)
    const BLK = { city: ['city1', 'city2'], tower: ['city1', 'city2'], country: ['farm', 'hill'] }[kind] || [], litTiles = new T.Group();
    const useTiles = Promise.resolve().then(() => {
      if (!IH.blocks || !BLK.length) return false;
      const T2 = rng(def.w * 7 + def.d * 3 + 11), list = [];
      for (const [x, z] of spots) {
        const name = kind === 'country' && z < back ? (T2() < 0.6 ? 'hill' : 'farm') : BLK[Math.floor(T2() * BLK.length)], ry = Math.floor(T2() * 4) * Math.PI / 2, B = IH.blocks.make(name);
        for (const o of [B.group, B.lit]) { o.position.set(x, Y0, z); o.rotation.y = ry; }
        cutify(B.group); cutify(B.lit); tiles.add(B.group); litTiles.add(B.lit); B.group.userData.lit = B.lit; list.push(B.group);
      }
      return list.length > 0;
    });
    let below = null; const neighbours = [], occ = [], stops = []; let busG = null, this_island = null;
    if (kind === 'island') {
      // The street round an island home: its lots (strips.glb, built in Blender: shopfronts and houses cut at the home's
      // wall height, so you look down into them) in rows along each edge of the island, facing in across the lane. Only
      // the rows on the two edges furthest from the camera show (the near ones would be in the way), as walls do.
      const LANE = 5, LOT = 16, VB = def.viewBounds || { x0: left - 17, z0: back - 17, x1: right + 17, z1: front + 17 };
      const ORDER = { n: ['piece_ramen', 'piece_cafe', 'piece_plaza', 'piece_konbini', 'piece_flowers', 'piece_house_a'], w: ['piece_house_a', 'piece_house_b', 'piece_flowers', 'piece_house_a', 'piece_plaza'], s: ['piece_konbini', 'piece_house_b', 'piece_cafe', 'piece_house_a', 'piece_ramen', 'piece_plaza'], e: ['piece_house_b', 'piece_plaza', 'piece_house_a', 'piece_flowers', 'piece_house_b'] };
      const edges = { n: new T.Group(), s: new T.Group(), w: new T.Group(), e: new T.Group() }; for (const e of Object.values(edges)) g.add(e);
      // each edge: where its run of lots goes (a line along it), which way they face (ry)
      const runs = { n: { a: VB.x0, b: VB.x1, at: back - LANE, ry: 0, along: 'x' }, s: { a: VB.x0, b: VB.x1, at: front + LANE, ry: Math.PI, along: 'x' }, w: { a: back, b: front, at: left - LANE, ry: Math.PI / 2, along: 'z' }, e: { a: back, b: front, at: right + LANE, ry: -Math.PI / 2, along: 'z' } };
      loadStreet('home/scenery/strips.glb').then(parts => {
        const byName = new Map(parts.map(P => [P.name, P]));
        for (const [ek, run] of Object.entries(runs)) {
          const n = Math.max(1, Math.floor((run.b - run.a) / LOT)), gap = ((run.b - run.a) - n * LOT) / 2, list = ORDER[ek];
          for (let i = 0; i < n; i++) {
            const P = byName.get(list[i % list.length]); if (!P) continue;
            const grp = new T.Group(), m = new T.Mesh(P.g, P.mat || IH.look.cutMat(IH.look.BASE)); m.userData.bg = true; m.receiveShadow = true; m.castShadow = false; grp.add(m);
            for (const S of P.signs) { const sm = new T.Mesh(S.g, new T.MeshBasicMaterial({ map: signTex(SIGNS[S.sign]), side: T.DoubleSide })); sm.userData.bg = true; grp.add(sm); }
            grp.scale.setScalar(2); grp.rotation.y = run.ry;
            // the lot's front-left corner along the run (in the piece's own space its front runs from x 0 to 8 m on z 0)
            const t = run.a + gap + i * LOT;
            if (run.along === 'x') grp.position.set(run.ry ? t + LOT : t, 0, run.at); else grp.position.set(run.at, 0, run.ry > 0 ? t + LOT : t);
            edges[ek].add(grp);
            { const mid = t + LOT / 2, out = run.along === 'x' ? (run.ry ? 1 : -1) : (run.ry > 0 ? -1 : 1); stops.push(run.along === 'x' ? { x: mid, z: run.at - out * 0.9, yaw: run.ry ? 0 : Math.PI, edge: ek } : { x: run.at - out * 0.9, z: mid, yaw: run.ry > 0 ? -Math.PI / 2 : Math.PI / 2, edge: ek }); } // (just outside its door, facing it)
          }
        }
        yawNow = null;
      }).catch(() => {});
      this_island = edges;
      below = null;
    } else if (kind === 'street') {
      // the Blender street, metres to tiles (x2), its pavement six tiles below this floor (the home's upstairs)
      const sg = new T.Group(); sg.scale.setScalar(2); sg.position.y = -6; g.add(sg);
      loadStreet('home/scenery/street.glb').then(parts => {
        for (const P of parts) {
          const grp = new T.Group(), m = new T.Mesh(P.g, P.mat || IH.look.cutMat(IH.look.BASE)); m.userData.bg = true; m.receiveShadow = true; m.castShadow = false; grp.add(m);
          for (const S of P.signs) { const sm = new T.Mesh(S.g, new T.MeshBasicMaterial({ map: signTex(SIGNS[S.sign]), side: T.DoubleSide })); sm.userData.bg = true; grp.add(sm); }
          grp.name = P.name; sg.add(grp);
          if (P.name === 'bus') busG = grp; // (the roof right over the home is cut away like the rest: only its eaves show)
          else if (P.name.startsWith('occ_') && P.name !== 'occ_b1') { const bb = P.g.boundingBox; occ.push({ grp, x: (bb.min.x + bb.max.x), z: (bb.min.z + bb.max.z), top: bb.max.y * 2 - 6 }); } // (in tiles: x2)
        }
        yawNow = null;
      }).catch(() => {});
      // the ramen shop's keeper below: out of the shop door, about the pavement in front, back in
      below = { y: -6 + 0.28, balcY: -6 + 0.28, room: [1, 7.6, 11, 8.6], balc: [0.5, 9.4, 12, 13.6], door: [3.2, 7.4] };
    } else if (tower) {
      // The tower: the home is the corner flat on its floor, at the building's left edge. Every other flat is a copy
      // of it (same width, depth and height, the same balcony), in a grid: along to the right on this floor, a row
      // behind facing out the back, and the same on every floor below, down to the street. Nothing above this floor
      // is drawn (it'd be in the way); the flats on this floor on the camera's side are cut away to show their rooms.
      const W = def.w, Dd = def.d, Bd = (def.plot && def.plot.b) || 4, FY0 = 0.35, HH = 4.6, wall = '#e9e1d3', tile = '#ddd3c2', glassC = '#5f7d99';
      // the street far below: concrete, a lane along the front of the tower, poles, a vending machine
      k.box(FAR * 2, 0.1, FAR * 2, cx, Y0 - 0.14, cz, '#bdb8b0', { r: 0 }); k.box(FAR * 2, 0.04, 8, cx, Y0 - 0.06, TW.z1 + 4.6, '#6e6f78', { r: 0 });
      for (const dz of [0.6, 8.6]) k.box(FAR * 2, 0.02, 0.12, cx, Y0 - 0.02, TW.z1 + dz, '#f4f4f0', { r: 0 });
      k.at(0, Y0, 0, 0, kk => { vending(kk, lit, TW.x0 - 3, TW.z1 + 1.4, Math.PI, R, 1.85); for (let x = TW.x0 + 4; x < TW.x1; x += 30) pole(kk, lit, x, TW.z1 + 0.5, false, R, S); });
      // one flat, in its own space: x 0..W, z 0..Dd, the balcony out to Dd+Bd (+z), its slab's top at y 0
      const closed = (kk, ll, corner, cap, Rn) => {
        kk.box(W, 0.45, Dd + Bd, W / 2, -0.45, (Dd + Bd) / 2, tile, { r: 0.03 }); // floor slab and balcony
        kk.box(W, FY0 + HH, Dd, W / 2, 0, Dd / 2, wall, { r: 0.04 }); if (corner) kk.box(TE + 0.02, FY0 + HH + 0.45, Dd + 0.3, -TE / 2, -0.45, Dd / 2, wall, { r: 0.03 });
        if (cap) kk.box(W, 0.3, Dd, W / 2, FY0 + HH, Dd / 2, '#a39aa6', { r: 0.02 }); // (cut off at the floor above)
        kk.box(W * 0.6, 3.8, 0.08, W * 0.36, FY0 + 0.1, Dd + 0.04, glassC, { r: 0.02 }); for (let i = 1; i < 4; i++) kk.box(0.06, 3.8, 0.1, W * 0.06 + i * W * 0.15, FY0 + 0.1, Dd + 0.06, '#d8d8dc', { r: 0.01 }); // glass doors onto the balcony
        kk.box(W * 0.2, 1.4, 0.08, W * 0.82, FY0 + 2.2, Dd + 0.04, glassC, { r: 0.02 }); // the kitchen window
        if (Rn() < 0.45) ll.box(W * 0.58, 3.6, 0.04, W * 0.36, FY0 + 0.2, Dd + 0.1, pick(Rn, ['#ffd89a', '#ffe7b8', '#fff2d6']), { r: 0.01, emit: 1 });
        kk.box(0.14, 3.6, Bd, W - 0.07, 0, Dd + Bd / 2, '#efe9df', { r: 0.02 }); // the partition to the next balcony
        for (let gx = 0.3; gx < W - 0.5; gx += 1.6) kk.glassBox(1.55, 1.9, 0.06, gx + 0.8, 0.25, Dd + Bd - 0.1, { tint: '#e4eef2' }); kk.box(W, 0.1, 0.16, W / 2, 2.15, Dd + Bd - 0.1, '#8f949c', { r: 0.03 }); kk.box(W, 0.3, 0.2, W / 2, 0, Dd + Bd - 0.1, '#bdb7ad', { r: 0.03 });
        if (corner) { for (let gz = Dd + 0.3; gz < Dd + Bd - 0.4; gz += 1.6) kk.glassBox(0.06, 1.9, 1.5, 0.05, 0.25, gz + 0.75, { tint: '#e4eef2' }); for (const wz of [Dd * 0.3, Dd * 0.72]) { kk.box(0.08, 2.0, 1.8, -TE - 0.02, FY0 + 1.4, wz, '#ffffff', { r: 0.02 }); kk.box(0.06, 1.8, 1.6, -TE - 0.05, FY0 + 1.5, wz, glassC, { r: 0.01 }); } } // a corner flat: windows down its side, and the side of its balcony railed
        if (Rn() < 0.4) kk.box(2.4, 1.2, 0.08, W * 0.7, 2.0, Dd + Bd * 0.8, pick(Rn, ['#ffffff', '#cfe6ff', '#ffd7e2']), { r: 0.04 }); // washing
        if (Rn() < 0.6) kk.box(1.4, 1.0, 0.7, W - 1.4, 0, Dd + 0.6, '#e8e8ea', { r: 0.05 }); // an air-con unit
        if (Rn() < 0.5) for (let p = 0; p < 2; p++) { kk.cyl(0.35, 0.7, 1.2 + p * 1.1, 0, Dd + Bd - 0.9, '#c08a5a', { rt: 0.42, n: 10 }); kk.ball(0.6, 1.2 + p * 1.1, 1.2, Dd + Bd - 0.9, '#5fae55', { n: 10 }); } // potted plants
      };
      const rows = [[0, 0], [1, Math.PI]]; // (the front row facing out the front; the row behind facing out the back)
      const P = W + 2 * TE, NC = 6; // (flats side by side: their outside walls back to back, one party wall between them)
      for (let f = 0; f <= BELOW - 1; f++) for (let c = 0; c < NC; c++) for (const [row, ry] of rows) {
        const oy = -f * (FY0 + HH + 0.45), ox = c * P + (row ? W : 0), oz = row ? -2 * TE : 0, Rn = rng(f * 977 + c * 131 + row * 17 + 5);
        if (f === 0 && c === 0 && row === 0) continue; // (the home itself)
        if (f === 1 && c === 0 && row === 0) continue; // (the flat below this one: drawn open to see into, below)
        if (f === 0) { neighbours.push({ x: ox, z: oz, ry, row, c }); continue; } // (the flats on this floor: built like the home itself, by app.js)
        k.at(ox, oy, oz, ry, kk => lit.at(ox, oy, oz, ry, ll => closed(kk, ll, c === 0, false, Rn)));
      }
      // the flat below this one: seen into through its glass doors, warm and lived in; the neighbour lives here
      const oyB = -(FY0 + HH + 0.45);
      k.at(0, oyB, 0, 0, kk => {
        kk.box(W, 0.45, Dd + Bd, W / 2, -0.45, (Dd + Bd) / 2, tile, { r: 0.03 });
        kk.box(W, FY0, Dd, W / 2, 0, Dd / 2, '#c99a66', { r: 0.01 }); // its wooden floor
        kk.box(W, FY0 + HH, 0.25, W / 2, 0, 0.12, '#f6efe2', { r: 0.02 }); kk.box(0.25, FY0 + HH, Dd, W - 0.12, 0, Dd / 2, '#f6efe2', { r: 0.02 }); kk.box(TE, FY0 + HH, Dd, -TE / 2, 0, Dd / 2, wall, { r: 0.02 }); // its walls
        kk.box(W, 0.6, Dd, W / 2, FY0 + HH - 0.15, Dd / 2, '#f3ece0', { r: 0.02 }); // its ceiling (our floor)
        kk.box(3.6, 1.0, 1.6, 4.5, FY0, 1.3, '#8aa6c8', { r: 0.2 }); kk.box(3.6, 0.9, 0.4, 4.5, FY0 + 0.9, 0.5, '#7a96b8', { r: 0.15 }); // a sofa
        kk.box(2.2, 0.5, 1.2, 4.5, FY0, 3.6, '#b98a5a', { r: 0.06 }); kk.box(3, 0.04, 2.4, 4.5, FY0 + 0.01, 3.6, '#e7c9d6', { r: 0.01 }); // low table, rug
        kk.box(2.6, 1.6, 0.25, W - 2.6, FY0 + 1.0, 0.4, '#2d2a3a', { r: 0.04 }); kk.box(2.0, 1.0, 0.8, W - 2.6, FY0, 0.7, '#c9a27a', { r: 0.04 }); // TV on a unit
        kk.box(2, 1.0, 4, 1.3, FY0, 2.3, '#f4efe6', { r: 0.12 }); kk.box(2.05, 0.3, 2.7, 1.3, FY0 + 1.0, 3.0, '#ffd27a', { r: 0.12 }); // a bed
        kk.cyl(0.08, 2.6, W - 1.2, FY0, Dd - 1.3, '#3d3f46', { n: 6 });
        kk.glassBox(W * 0.62, 3.9, 0.06, W * 0.36, FY0 + 0.05, Dd + 0.04, { tint: '#d8ecf8' }); kk.box(W * 0.3, FY0 + HH, 0.25, W * 0.84, 0, Dd + 0.12, wall, { r: 0.02 }); // its glass doors (see-through) and the wall beside them
        kk.box(0.14, 3.6, Bd, W - 0.07, 0, Dd + Bd / 2, '#efe9df', { r: 0.02 }); for (let gx = 0.3; gx < W - 0.5; gx += 1.6) kk.glassBox(1.55, 1.9, 0.06, gx + 0.8, 0.25, Dd + Bd - 0.1, { tint: '#e4eef2' }); kk.box(W, 0.1, 0.16, W / 2, 2.15, Dd + Bd - 0.1, '#8f949c', { r: 0.03 });
        for (let gz = Dd + 0.3; gz < Dd + Bd - 0.4; gz += 1.6) kk.glassBox(0.06, 1.9, 1.5, 0.05, 0.25, gz + 0.75, { tint: '#e4eef2' });
        for (let p = 0; p < 3; p++) { kk.cyl(0.35, 0.7, 1.2 + p * 1.1, 0, Dd + Bd - 0.9, '#c08a5a', { rt: 0.42, n: 10 }); kk.ball(0.6, 1.2 + p * 1.1, 1.2, Dd + Bd - 0.9, '#5fae55', { n: 10 }); }
      });
      lit.at(0, oyB, 0, 0, ll => ll.ball(0.45, W - 1.2, FY0 + 2.8, Dd - 1.3, '#fff1c8', { n: 10, emit: 1 }));
      below = { y: oyB + FY0, balcY: oyB, room: [0.9, 1.2, W - 1.2, Dd - 0.9], balc: [1.2, Dd + 0.8, W - 1.2, Dd + Bd - 0.8], door: [W * 0.36, Dd] };
      // skyline far off all round
      for (let i = 0; i < 34; i++) { const a = (i / 34) * Math.PI * 2 + R() * 0.15, r = 205 + R() * 40, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r, B = at(x, z); B.k.at(0, Y0, 0, 0, kk => flats(kk, null, x, z, 10 + R() * 8, 10, 10 + Math.floor(R() * 20), -a + Math.PI, R, S)); }
    } else if (kind === 'city') {
      k.box(FAR * 2, 0.1, FAR * 2, cx, -0.14, cz, '#bdb8b0', { r: 0 }); // concrete everywhere
      k.box(FAR * 2, 0.04, 8, cx, -0.06, front + 4.2, '#6e6f78', { r: 0 }); // the lane out the front (4 m)
      for (const dz of [0.45, 7.95]) k.box(FAR * 2, 0.02, 0.12, cx, -0.02, front + dz, '#f4f4f0', { r: 0 }); // its white edge lines
      // the plot's own walls (not across the front, where the gate is)
      blockWall(k, left - 0.2, back - 0.2, left - 0.2, front); blockWall(k, right + 0.2, back - 0.2, right + 0.2, front); blockWall(k, left - 0.2, back - 0.2, right + 0.2, back - 0.2);
      // the neighbours, in rows: beside the plot, behind it, across the lane; flats in the rows further out
      const lot = 22, W2 = (right - left) / 2;
      const rows = [[cz, 'side'], [back - 12, 'house'], [back - 12 - lot, 'mix'], [back - 12 - lot * 2, 'flats'], [front + 20, 'house'], [front + 20 + lot, 'mix'], [front + 20 + lot * 2, 'flats']];
      for (const [z, type] of rows) for (let x = cx - 4 * lot; x <= cx + 4 * lot; x += lot) {
        let hx = x;
        if (type === 'side') { if (Math.abs(x - cx) < W2 + lot / 2 + 0.5) continue; hx = x < cx ? Math.min(x, left - 1 - lot / 2) : Math.max(x, right + 1 + lot / 2); }
        const faces = z > front ? Math.PI : 0, B = at(hx, z).fb;
        if (type === 'flats' || (type === 'mix' && R() < 0.4)) { const w = 7 + R() * 1.5; flats(B.k, B.lit, hx, z, w, 6, 3 + Math.floor(R() * 4), faces, R, S); stub(hx, z, w * S, 6 * S, faces, '#ddd8d0'); }
        else { const w = 5.6 + R() * 1.4, d = 5.4 + R() * 1.2; house(B.k, B.lit, hx, z, w, d, faces, R, S); stub(hx, z, w * S, d * S, faces, '#e6e1d6'); }
        if (type !== 'side') { const fz = z > front ? z - lot / 2 + 0.3 : z + lot / 2 - 0.3; blockWall(B.k, hx - lot / 2 + 0.6, fz, hx - 1.2, fz); blockWall(B.k, hx + 1.2, fz, hx + lot / 2 - 0.6, fz); } // (a gap at the gate)
      }
      // power poles and their wires along the lane; a vending machine and bikes by the gate
      const pz = front + 0.35, poles = []; for (let x = cx - 120; x <= cx + 120; x += 30) { const B = at(x, pz); pole(B.k, B.lit, x, pz, false, R, S); poles.push([x, pz]); }
      for (let i = 1; i < poles.length; i++) wires(at((poles[i - 1][0] + poles[i][0]) / 2, pz).k, poles[i - 1], poles[i], S);
      vending(k, lit, right + 1.6, front + 1.2, Math.PI, R, 1.85); bike(k, left - 1.6, front + 1.4, Math.PI / 2, R, 2); bike(k, left - 2.8, front + 1.4, Math.PI / 2 + 0.1, R, 2);
      // the towers on the skyline, far out all round, and the viaduct a train runs along behind
      for (let i = 0; i < 34; i++) { const a = (i / 34) * Math.PI * 2 + R() * 0.15, r = 205 + R() * 40, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r, B = at(x, z); flats(B.k, null, x, z, 10 + R() * 8, 10, 10 + Math.floor(R() * 20), -a + Math.PI, R, S); }
      const vz = back - 1 - 3 * TILE - 22; for (let x = cx - FAR; x < cx + FAR; x += 18) { const B = at(x + 9, vz); B.k.box(18, 1.8, 7.4, x + 9, 12, vz, '#c9c6c0', { r: 0.04 }); B.k.box(2.3, 12, 3.7, x + 9, 0, vz, '#bdb9b2', { r: 0.08 }); B.k.box(18, 1.4, 0.28, x + 9, 13.8, vz + 3.6, '#a9a6a0', { r: 0.03 }); }
      const tk = new Kit(); for (let c = 0; c < 6; c++) { tk.box(5.6, 2.4, 2.6, c * 5.8, 6.0, 0, '#f4f6f8', { r: 0.25 }); tk.box(5.62, 0.35, 2.62, c * 5.8, 6.7, 0, '#38a169', { r: 0.05 }); for (let i = 0; i < 4; i++) tk.box(0.8, 0.7, 2.64, c * 5.8 - 2 + i * 1.3, 7.2, 0, '#5d7895', { r: 0.03 }); }
      const tm = tk.build(); train.add(tm); train.scale.setScalar(S); train.position.set(cx - 300, 0, vz); train.userData = { x0: cx - 300 };
    } else {
      k.box(FAR * 2, 0.1, FAR * 2, cx, -0.14, cz, '#8cbf5c', { r: 0 }); // fields of grass
      k.box(FAR * 2, 0.05, 6, cx, -0.07, front + 3.2, '#cdbb92', { r: 0 }); // the gravel farm lane (3 m)
      k.box(FAR * 2, 0.3, 1.4, cx, -0.3, front + 7.0, '#b7b3aa', { r: 0.02 }); k.waterBox(FAR * 2, 0.08, 1.0, cx, -0.2, front + 7.0, {}); // the irrigation channel
      // paddies all round (but the farmhouses' yards), in rows
      const yards = [[cx - 40, back - 25], [cx + 45, front + 32]];
      for (let px = cx - 46; px < cx + 46; px += 7) for (let pz = back - 40; pz < front + 40; pz += 6) {
        if (px + 7 > left - 2 && px < right + 2 && pz + 6 > back - 2 && pz < front + 4.6) continue; // the plot and the lane
        if (pz < front + 4.6 && pz + 6 > front - 0.5) continue;
        if (yards.some(([yx, yz]) => Math.abs(px + 3.5 - yx) < 16 && Math.abs(pz + 3 - yz) < 13)) continue;
        if (Math.hypot(px - cx, pz - front) > 46) continue;
        paddy(at(px + 3.5, pz + 3).fb.k, px, pz, 7, 6, R);
      }
      for (const [i, [yx, yz]] of yards.entries()) { const B = at(yx, yz).fb, ry = i ? Math.PI : 0; farmhouse(B.k, B.lit, yx, yz, ry, S); stub(yx, yz, 9 * S, 6.4 * S, ry, '#efe7d8'); }
      broad(at(yards[0][0] + 6, yards[0][1] + 4).fb.k, yards[0][0] + 6, yards[0][1] + 4, 1.2, R, '#4f9a4a'); broad(at(yards[1][0] - 6, yards[1][1] - 3).fb.k, yards[1][0] - 6, yards[1][1] - 3, 1.1, R, '#e88a3a'); // a persimmon in the yard
      // wooden poles along the lane
      const poles = []; for (let x = cx - 150; x <= cx + 150; x += 34) { const B = at(x, front + 0.4); pole(B.k, B.lit, x, front + 0.4, true, R, S); poles.push([x, front + 0.4]); } for (let i = 1; i < poles.length; i++) wires(at((poles[i - 1][0] + poles[i][0]) / 2, front).k, poles[i - 1], poles[i], S);
      // the river, winding along one side
      for (let i = 0; i < 40; i++) { const z = back - 200 + i * 10, x = right + 2 * TILES.country + 30 + Math.sin(i * 0.5) * 12; k.waterBox(16, 0.1, 11, x, -0.16, z, {}); k.box(18, 0.06, 11.4, x, -0.24, z, '#a99b80', { r: 0.1 }); }
      // cedar woods on the hills, and the mountains far off
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.65 + i * 0.09), r = 380 + R() * 40, hx = cx + Math.sin(a) * r, hz = cz + Math.cos(a) * r * 0.8, B = at(hx, hz); B.k.ball(60 + R() * 30, hx, -20, hz, shade('#4c8a4e', R() * 0.1 - 0.05), { s: [1.4, 0.6, 1], n: 16 }); }
      for (let i = 0; i < 9; i++) { const x = cx - 420 + i * 105 + R() * 30, z = back - 520 - R() * 60, h = 160 + R() * 110, B = at(x, z); B.k.cone(120 + R() * 60, h, x, -4, z, shade('#6f86a8', R() * 0.1), { n: 7 }); B.k.cone(36 + R() * 14, h * 0.28, x, h * 0.72 - 4, z, '#f1f4fa', { n: 7 }); }
      for (let i = 0; i < 10; i++) { const x = left - 4 - R() * 8, z = back - 2 - R() * 6; cedar(at(x, z).k, x, z, 1.5 + R(), R); }
    }
    const scenery = m => m.traverse(o => { if (o.isMesh) { o.userData.bg = true; o.receiveShadow = true; } });
    const base = k.build({ shadow: false }), glow = new T.Group(), lit0 = lit.build({ shadow: false }); scenery(base); scenery(lit0); glow.add(lit0);
    const mk = B => { const full = B.k.build({ shadow: false }), lt = B.lit.build({ shadow: false }), st = B.stub.build({ shadow: false }); scenery(full); scenery(lt); scenery(st); g.add(full, st); glow.add(lt); return { full, lt, st }; };
    const parts = bins.map(B => ({ ...mk(B), fb: mk(B.fb) }));
    let ready = false; useTiles.then(ok => { ready = ok; yawNow = null; if (ok) this_.phase(phaseNow); });
    g.add(base, train, glow); glow.add(litTiles); cutify(base); cutify(glow); parts.forEach(P => { cutify(P.full); cutify(P.lt); cutify(P.fb.full); cutify(P.fb.lt); }); cutify(train); if (train.children[0]) scenery(train.children[0]);
    glow.traverse(o => { if (o.userData && o.userData.glowMat) o.userData.glowMat.uniforms.uGlow.value = 1.4; }); // (lit windows and lamps: warm and bright)
    glow.visible = false;
    let yawNow = null, backHidden = false, phaseNow = 'day';
    const this_ = {
      group: g, lit: glow, kind, below, neighbours, stops, ring: kind === 'island' ? { x0: left, z0: back, x1: right, z1: front } : null, floorY: Y0, occ, // (occ: the street's tall things, cut away on the camera's side)
      phase(ph) { phaseNow = ph; }, // (the blocks are cel-shaded like the home: the day's light does dusk and night)
      // the slices on the camera's side cut away (the camera looks from (sin yaw, cos yaw))
      view(yaw, pitch = 0.56) {
        const U = IH.look.CUT_U; U.uCutOn.value = 1; U.uCutMin.value.set(b.x0 - 0.45, -0.5, b.z0 - 0.45); U.uCutMax.value.set(b.x1 + 0.45, 5.6, b.z1 + 0.2); // (the home: its rooms and its garden or balcony)
        U.uCutDir.value.set(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); // (looking from the camera)
        if (yawNow != null && Math.abs(yaw - yawNow) < 1e-3) return; yawNow = yaw;
        if (this_island) { const cx2 = Math.sin(yaw), cz2 = Math.cos(yaw); this_island.n.visible = cz2 > 0.05; this_island.s.visible = cz2 < -0.05; this_island.w.visible = cx2 > 0.05; this_island.e.visible = cx2 < -0.05; } // (only the two far edges' rows)
        parts.forEach(P => { P.full.visible = true; P.lt.visible = true; P.st.visible = false; P.fb.full.visible = !ready; P.fb.lt.visible = !ready; P.fb.st.visible = false; }); // (all of it shown: only the view of the home is cut out)


      },
      tick(t) { if (busG) busG.position.x = 30 - ((t * 5) % 110); // (the bus along the road, round and round)
        if (!train.children.length) return; train.visible = !backHidden; const tx = (t * 22) % 1200; train.position.x = tx < 600 ? train.userData.x0 + tx : train.userData.x0 - 900; }
    };
    return this_;
  }

  IH.settings = { build, DEFAULT, KINDS };
})();
