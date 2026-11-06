/* Chorecast · the Japanese sky. The app's sky on every device that can draw WebGL 2 (proto.js), unless ?sky=classic
   turned it off there. Only the background behind the app changes.

   A painted lake scene in 3D, built like an anime film background: every layer sits at its own depth, so as the view
   drifts (and follows the mouse, the tilt of the device or the page's scroll) near things slide past far ones.
   - Far to near: the sky, three bands of towering cumulus, Mount Fuji, blue ridges, a far shore wooded with round
     trees and cherries in bloom, drifting mist, the lake, a vermilion arched bridge, grassy banks, two cherry trees.
   - The clouds are painted once when the app opens, as shapes with a surface direction, and lit live, taking a silver
     lining toward the sun. Everything recolours smoothly as the time of day changes.
   - A mix of 3D and 2D. The water, Fuji, the ridges, the far shore and its round trees, the bridge and the banks'
     ground are 3D, cel-shaded the anime way: a crisp edge between light and shade, a brighter top light, a rim of
     light along the edges, and haze that thickens with distance. Fuji has gullies carved down its sides, with snow
     filling them further down than on the ridges between.
   - The cherry trees and the grass are drawn like a 2D anime illustration, but built in 3D so they sway and slide with
     the view: flat tones with hard edges, and an ink line around every blossom mass, branch and tuft. The trees are
     real branches carrying thousands of blossom clusters that bend and shiver in the wind; the banks are covered in
     drawn grass tufts and a few flowering bushes.
   - Petals are 3D: each tumbles, flutters side to side as it falls, and is swept along in gusts, near ones soft with
     depth of field.
   - The lake mirrors the scene with ripples and painted glints. At dusk and night, lanterns glow on the bridge,
     fireflies drift over the water and the blossoms are lit warm from below.
   - No shrine gates or temples: the app keeps religion out. With reduced motion, the scene is drawn once and stays still. */
(function () {
  'use strict';
  const T = window.THREE, host = document.getElementById('sky'), root = document.documentElement;
  if (!T || !host || window.JapanSky || root.dataset.sky !== 'japan') return;
  let R;
  try { R = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  if (!R.capabilities.isWebGL2) { R.dispose(); return; } // the painted layers need WebGL 2 (every iPad on iPadOS 15 or later)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = R.domElement; cv.className = 'jp-cv'; cv.setAttribute('aria-hidden', 'true');
  host.insertBefore(cv, host.firstChild);
  let pr = Math.min(devicePixelRatio || 1, 1.5); R.setPixelRatio(pr);
  const WY = -2.2; // the lake's surface; the view stands 2.2 above it
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), deg = Math.PI / 180;
  const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hsh = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbmJ = (x, y, o) => { let s = 0, a = 0.5; for (let i = 0; i < (o || 5); i++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s; };

  /* ---------- Colours for each time of day ---------- */
  const PAL = {
    day: {
      zen: '#0e3890', mid: '#2b70c9', hor: '#cbe6f6', horSun: '#fff2d2', sun: '#ffffff', glow: '#fff0c4', glowAmt: 0.85, star: 0, sunX: 0.82, sunY: 0.4, sunR: 0.024, front: 0.62,
      cLight: '#ffffff', cMid: '#eef4fd', cShadow: '#b3c4e6', cCrease: '#8c9fcf', cRim: '#ffffff', cHaze: '#cde3f4', rimAmt: 0.9, cirrus: '#ffffff',
      fRockL: '#7b97cc', fRockS: '#45609c', fSnowL: '#ffffff', fSnowS: '#a9bbe4', fHaze: '#c5ddf1',
      rL: '#7ea3cf', rS: '#5677a2', rHaze: '#bfd9ef',
      sL: '#4a8566', sS: '#1f4443', sPinkL: '#f7c4d4', sPinkS: '#b98aa9', sHaze: '#a2c7de',
      mist: '#ffffff', mistAmt: 0.5,
      wDeep: '#23609c', wGlint: '#ffffff', wHaze: '#c5e1f2',
      gL: '#7cb45c', gS: '#255042', gTip: '#cfe877',
      bLight: '#fbd3e1', bMid: '#f3a9c6', bShadow: '#d980aa', bTrans: '#ffd3e2', ink: '#a03f74',
      kL: '#6d4657', kS: '#3a2333', kInk: '#22111c', gInk: '#1d4632',
      vL: '#e9492e', vS: '#952a2f', wood: '#6e4738', dim: 1,
      key: [0.55, 0.62, 0.56], keyCol: '#fff4e2', amb: '#5a6f9a', fill: [0.05, -0.85, 0.5], fillCol: '#ffb070', fillAmt: 0,
      pLight: '#fff5f8', pDeep: '#f3b4ca', lantern: 0, fly: 0, flare: 1, scrim: 0.26, vig: 0.16,
    },
    dawn: {
      zen: '#252b69', mid: '#78599b', hor: '#ffc6a6', horSun: '#ffe3ac', sun: '#fff1cf', glow: '#ffbe86', glowAmt: 1.0, star: 0.12, sunX: 0.2, sunY: 0.585, sunR: 0.032, front: 0.3,
      cLight: '#ffe7d0', cMid: '#f3b9bf', cShadow: '#8976aa', cCrease: '#64578f', cRim: '#fff0b8', cHaze: '#e3b6c3', rimAmt: 1.25, cirrus: '#ffd2c0',
      fRockL: '#c38db0', fRockS: '#62558b', fSnowL: '#ffe3e9', fSnowS: '#a494c4', fHaze: '#e5bbc8',
      rL: '#8b79a6', rS: '#5e5386', rHaze: '#d9afbf',
      sL: '#5a6a72', sS: '#313954', sPinkL: '#f8c6d4', sPinkS: '#a582a8', sHaze: '#c6a2b7',
      mist: '#ffe1e7', mistAmt: 0.66,
      wDeep: '#3d3e77', wGlint: '#ffe3be', wHaze: '#e3bbc6',
      gL: '#839f68', gS: '#2f3f48', gTip: '#e6d49c',
      bLight: '#fbd2dc', bMid: '#ee9fbb', bShadow: '#bf77a5', bTrans: '#ffd3b8', ink: '#7f3766',
      kL: '#6c4a5c', kS: '#33233a', kInk: '#1f1324', gInk: '#1e2a30',
      vL: '#e25a3b', vS: '#7e2b3c', wood: '#5f3c3a', dim: 0.85,
      key: [-0.75, 0.4, 0.55], keyCol: '#ffe2c4', amb: '#5d5486', fill: [0.05, -0.85, 0.5], fillCol: '#ffb070', fillAmt: 0,
      pLight: '#fff1ef', pDeep: '#eeb0c4', lantern: 0, fly: 0, flare: 0.8, scrim: 0.3, vig: 0.2,
    },
    dusk: {
      zen: '#231e5b', mid: '#853975', hor: '#ff9050', horSun: '#ffd27a', sun: '#ffe7a8', glow: '#ff9a4c', glowAmt: 1.1, star: 0.18, sunX: 0.5, sunY: 0.575, sunR: 0.036, front: 0.28,
      cLight: '#ffd99e', cMid: '#f3a08a', cShadow: '#7d5c98', cCrease: '#5c4580', cRim: '#ffe6a0', cHaze: '#e48977', rimAmt: 1.3, cirrus: '#ffb98a',
      fRockL: '#a8608a', fRockS: '#453162', fSnowL: '#ffd4b2', fSnowS: '#977baf', fHaze: '#e29585',
      rL: '#7b4d79', rS: '#49325b', rHaze: '#d4837b',
      sL: '#463c58', sS: '#271f3b', sPinkL: '#eaa8be', sPinkS: '#896594', sHaze: '#a66679',
      mist: '#ffc3a3', mistAmt: 0.46,
      wDeep: '#322859', wGlint: '#ffcf86', wHaze: '#de8d7f',
      gL: '#706b53', gS: '#2a2238', gTip: '#e8b476',
      bLight: '#ffcdb9', bMid: '#e99ab3', bShadow: '#a3669a', bTrans: '#ffb98a', ink: '#5f2a54',
      kL: '#5e3f52', kS: '#2a1e30', kInk: '#1a0f1c', gInk: '#1a1424',
      vL: '#e65a34', vS: '#6d2236', wood: '#4e3134', dim: 0.72,
      key: [0.78, 0.33, 0.55], keyCol: '#ffcc98', amb: '#4d3d70', fill: [0.1, -0.9, 0.4], fillCol: '#ffa868', fillAmt: 0.3,
      pLight: '#ffe7dd', pDeep: '#e8a2b7', lantern: 0.8, fly: 0.25, flare: 0.8, scrim: 0.3, vig: 0.22,
    },
    night: {
      zen: '#040a20', mid: '#0c1b45', hor: '#263f79', horSun: '#3a5694', sun: '#fff8e6', glow: '#a9bcf2', glowAmt: 0.55, star: 1, sunX: 0.8, sunY: 0.2, sunR: 0.02, front: 0.5,
      cLight: '#a7b9e5', cMid: '#5a70a7', cShadow: '#293765', cCrease: '#1b254d', cRim: '#e8efff', cHaze: '#20355f', rimAmt: 1.0, cirrus: '#7d93c8',
      fRockL: '#3d5189', fRockS: '#1b274e', fSnowL: '#ccd9f5', fSnowS: '#697cb2', fHaze: '#1f335e',
      rL: '#23355d', rS: '#14203d', rHaze: '#1c2e56',
      sL: '#1a2843', sS: '#0b1326', sPinkL: '#b9a6ca', sPinkS: '#5b5381', sHaze: '#192a4f',
      mist: '#7c92c8', mistAmt: 0.24,
      wDeep: '#08132f', wGlint: '#dfe8ff', wHaze: '#1b2e57',
      gL: '#2d4b51', gS: '#0b1525', gTip: '#62918a',
      bLight: '#dcb9de', bMid: '#a986bd', bShadow: '#574b86', bTrans: '#ffc4a0', ink: '#2b1f48',
      kL: '#3e3150', kS: '#150f1d', kInk: '#0a0610', gInk: '#060c16',
      vL: '#c94a36', vS: '#491828', wood: '#2e2030', dim: 0.42,
      key: [0.5, 0.62, 0.6], keyCol: '#b8c8f0', amb: '#1c2650', fill: [0.05, -0.85, 0.5], fillCol: '#ffae6e', fillAmt: 0.62,
      pLight: '#fff3f5', pDeep: '#d8a0c0', lantern: 1, fly: 1, flare: 0, scrim: 0.12, vig: 0.24,
    },
  };
  const KEYS = Object.keys(PAL.day), U = {}, tmpC = new T.Color(), tmpV = new T.Vector3();
  for (const k of KEYS) { const v = PAL.day[k]; U['p_' + k] = { value: typeof v === 'string' ? new T.Color(v) : Array.isArray(v) ? new T.Vector3(...v).normalize() : v }; }
  Object.assign(U, { uTime: { value: 0 }, uClip: { value: 0 }, uWaterY: { value: WY }, uGust: { value: 0 }, uWindAmp: { value: 0.2 },
    uSunDir: { value: new T.Vector3(0.3, 0.2, -1).normalize() }, uSpin: { value: 0 }, uWindOff: { value: new T.Vector3() }, uPxW: { value: 0.001 }, uInk: { value: 1.7 } });
  const PDECL = KEYS.map(k => { const v = PAL.day[k]; return `uniform ${typeof v === 'number' ? 'float' : 'vec3'} p_${k};`; }).join('\n') +
    '\nuniform float uTime, uClip, uWaterY, uGust, uWindAmp, uSpin, uPxW, uInk; uniform vec3 uSunDir, uWindOff;\n';
  const snap = () => { const o = {}; for (const k of KEYS) { const v = U['p_' + k].value; o[k] = v.isColor ? '#' + v.getHexString() : v.isVector3 ? [v.x, v.y, v.z] : v; } return o; };
  let from = PAL.day, to = PAL.day, blend = 1, phase = '';
  function applyPalette(f) {
    for (const k of KEYS) {
      const a = from[k], b = to[k], u = U['p_' + k];
      if (typeof b === 'string') u.value.set(a).lerp(tmpC.set(b), f);
      else if (Array.isArray(b)) u.value.set(...a).lerp(tmpV.set(...b), f).normalize();
      else u.value = a + (b - a) * f;
    }
  }
  function setPhase(p) {
    p = PAL[p] ? p : 'day'; if (p === phase) return;
    const first = !phase; phase = p; from = first ? PAL[p] : snap(); to = PAL[p]; blend = first ? 1 : 0; applyPalette(first ? 1 : 0); dirty = true;
  }

  /* ---------- Shader pieces ---------- */
  const NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1., 0.)), u.x), mix(hash12(i + vec2(0., 1.)), hash12(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.02 + vec2(13.7, 7.1); a *= .5; } return s; }
float vnoiseP(vec2 p, float per){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); float x0 = mod(i.x, per), x1 = mod(i.x + 1., per);
  return mix(mix(hash12(vec2(x0, i.y)), hash12(vec2(x1, i.y)), u.x), mix(hash12(vec2(x0, i.y + 1.)), hash12(vec2(x1, i.y + 1.)), u.x), u.y); }
float fbmP(vec2 p, float per){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoiseP(p, per); p = p * 2. + vec2(0., 7.1); per *= 2.; a *= .5; } return s; }
`;
  // Painted light: three tones (shadow, middle, light) with crisp but soft edges, the way a background artist paints form
  const PAINT = `
vec3 band3(float d, vec3 cs, vec3 cm, vec3 cl, float soft){ float a = smoothstep(-.06 - soft, .1 + soft, d), b = smoothstep(.5 - soft, .66 + soft, d); return mix(mix(cs, cm, a), cl, b); }
vec3 decodeN(vec4 t){ vec2 xy = t.xy * 2. - 1.; return vec3(xy, sqrt(max(0., 1. - dot(xy, xy)))); }
`;
  // Wind: a slow push that swells in gusts, with a quicker shiver on top; `f` is how far out on the tree this point is
  const WIND = `
vec3 sway(vec3 a, float f){
  float ph = a.x * .35 + a.z * .2 + a.y * .15, g = .3 + uGust * 1.1;
  float big = sin(uTime * .9 - ph) * .55 + sin(uTime * 1.63 - ph * 1.3) * .3 + .45;
  float jit = sin(uTime * 3.7 + a.x * 3.1 + a.y * 2.3) * .12 + sin(uTime * 5.3 + a.z * 4.1 + a.y) * .07;
  return vec3(big * g + jit * (.5 + g), jit * .5 - big * g * .12, jit * .7 + big * g * .22) * f * uWindAmp;
}
`;
  const BAKE_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const mk = (vs, fs, uni, opt) => new T.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign({}, U, uni || {}), extensions: { derivatives: true } }, opt || {}));

  /* ---------- Baking the painted layers ---------- */
  // Each layer is painted once into a texture holding its surface direction (red, green), one extra mask (blue) and
  // its shape (alpha). The live shaders light those surfaces, so a change of time of day needs no repaint.
  const bakeScene = new T.Scene(), bakeCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), bakeMesh = new T.Mesh(new T.PlaneGeometry(2, 2));
  bakeMesh.frustumCulled = false; bakeScene.add(bakeMesh);
  const target = (w, h, wrapX) => { const rt = new T.WebGLRenderTarget(w, h, { wrapS: wrapX ? T.RepeatWrapping : T.ClampToEdgeWrapping, wrapT: T.ClampToEdgeWrapping, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, generateMipmaps: true, depthBuffer: false, stencilBuffer: false }); rt.texture.generateMipmaps = true; return rt; };
  const bakeMat = (fs, uniforms) => new T.ShaderMaterial({ vertexShader: BAKE_VS, fragmentShader: fs, uniforms, blending: T.NoBlending, depthTest: false, depthWrite: false, extensions: { derivatives: true } });
  function bake(fs, uniforms, w, h, wrapX) {
    const rt = target(w, h, wrapX), m = bakeMat(fs, uniforms); bakeMesh.material = m;
    R.setRenderTarget(rt); R.render(bakeScene, bakeCam); R.setRenderTarget(null); m.dispose(); return rt.texture;
  }

  // Cumulus: each cloud is a heap of overlapping rounded lobes. Where one lobe sits in front of another a crease forms;
  // the bottoms are cut flat and shaded, the way clouds are painted in anime films.
  const CLOUD_BAKE = `
#define N 96
uniform vec4 pa[N]; uniform vec4 pb[N]; uniform int count; uniform float asp, per, texel;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = vec2(vUv.x * asp, vUv.y), nq = vec2(vUv.x * per, vUv.y * per / asp);
  vec2 warp = vec2(fbmP(nq, per) - .5, fbmP(nq + vec2(0., 31.7), per) - .5) * .02 + vec2(fbmP(nq * 4., per * 4.) - .5, fbmP(nq * 4. + vec2(0., 9.3), per * 4.) - .5) * .005;
  vec2 q = p + warp;
  float best = -1e4, sd = -1e4, rb = 1.; vec4 info = vec4(0.);
  for (int i = 0; i < N; i++) {
    if (i >= count) break;
    vec4 a = pa[i]; vec2 d = q - a.xy; float dd = dot(d, d), r2 = a.z * a.z;
    sd = max(sd, a.z - sqrt(dd));
    if (dd < r2) { float h = a.w + sqrt(r2 - dd); if (h > best) { best = h; rb = a.z; info = pb[i]; } }
  }
  // blend the lobes near the top into one surface, so neighbours merge with soft creases instead of hard rings
  vec3 nsum = vec3(0.); float wsum = 0., k = rb * .2;
  for (int i = 0; i < N; i++) {
    if (i >= count) break;
    vec4 a = pa[i]; vec2 d = q - a.xy; float dd = dot(d, d), r2 = a.z * a.z;
    if (dd < r2) { float s = sqrt(r2 - dd), w = exp((a.w + s - best) / k); nsum += w * vec3(d, s) / a.z; wsum += w; }
  }
  vec3 nb = wsum > 0. ? normalize(nsum) : vec3(0., 0., 1.);
  float base = info.x, ht = max(info.y, 1e-3);
  float bottom = smoothstep(base - .004, base + .016 + (fbmP(nq * 2., per * 2.) - .5) * .018, q.y);
  float alpha = best > -1e3 ? smoothstep(-texel, texel, sd) * bottom : 0.;
  vec2 bn = vec2(fbmP(nq * 7., per * 7.) - .5, fbmP(nq * 7. + vec2(0., 5.3), per * 7.) - .5);
  nb.xy += bn * .32; nb.z = sqrt(max(.03, 1. - dot(nb.xy, nb.xy) * .85)); nb = normalize(nb);
  float crease = smoothstep(1.05, 1.9, wsum);
  float under = smoothstep(base, base + ht * .5, q.y);
  float shade = (1. - crease * .32) * mix(.5, 1., under) * (1. - info.z * .12);
  gl_FragColor = vec4(nb.xy * .5 + .5, shade, alpha);
}`;
  function bakeClouds(puffs, w, h, per) {
    const asp = w / h, rt = target(w, h, true), N = 96;
    const pa = Array.from({ length: N }, () => new T.Vector4()), pb = Array.from({ length: N }, () => new T.Vector4());
    const uni = { pa: { value: pa }, pb: { value: pb }, count: { value: 0 }, asp: { value: asp }, per: { value: per }, texel: { value: 1.4 / h } };
    const m = bakeMat(CLOUD_BAKE, uni); bakeMesh.material = m;
    const all = []; for (const p of puffs) { all.push(p); if (p[0] - p[2] < 0.06) all.push([p[0] + asp, ...p.slice(1)]); if (p[0] + p[2] > asp - 0.06) all.push([p[0] - asp, ...p.slice(1)]); }
    const pad = 0.035;
    const tile = (x0, y0, tw, th) => {
      const ux0 = x0 / h, ux1 = (x0 + tw) / h, uy0 = y0 / h, uy1 = (y0 + th) / h;
      const hit = all.filter(p => p[0] + p[2] + pad > ux0 && p[0] - p[2] - pad < ux1 && p[1] + p[2] + pad > uy0 && p[1] - p[2] - pad < uy1);
      if (hit.length > N && tw > 16) { const a = tw / 2, b = th / 2; tile(x0, y0, a, b); tile(x0 + a, y0, a, b); tile(x0, y0 + b, a, b); tile(x0 + a, y0 + b, a, b); return; }
      if (hit.length > N) { hit.sort((a, b) => b[2] - a[2]); hit.length = N; }
      hit.forEach((p, i) => { pa[i].set(p[0], p[1], p[2], p[3]); pb[i].set(p[4], p[5], p[6], 0); });
      uni.count.value = hit.length;
      rt.scissor.set(x0, y0, tw, th); rt.scissorTest = true;
      R.setRenderTarget(rt); R.render(bakeScene, bakeCam);
    };
    for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 256) tile(x, y, Math.min(256, w - x), Math.min(256, h - y));
    rt.scissorTest = false; R.setRenderTarget(null); m.dispose(); return rt.texture;
  }
  // One cumulus: a few towers make its outline; lobes run along that outline with smaller cauliflower lobes on their
  // tops, and bigger lobes behind fill the body. Puff: [x, y, radius, depth, base, height, inner].
  function cumulus(r, cx, base, w, h, out, lobeK) {
    const towers = [{ x: cx, w: w, h: h * (0.42 + r() * 0.12) }];
    for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) towers.push({ x: cx + (r() - 0.5) * w * 0.55, w: w * (0.25 + r() * 0.25), h: h * (0.65 + r() * 0.35) });
    const env = x => { let y = 0; for (const t of towers) { const v = (x - t.x) / (t.w / 2); if (Math.abs(v) < 1) y = Math.max(y, t.h * Math.pow(1 - v * v, 0.55)); } return y; };
    const lobe = w * (lobeK || 0.07);
    for (let x = cx - w / 2; x < cx + w / 2;) {
      const top = env(x); if (top < lobe * 0.5) { x += lobe * 0.3; continue; }
      const rr = lobe * (0.6 + r() * 0.75) * (0.75 + 0.45 * top / h), y = base + Math.max(rr * 0.6, top - rr * 0.55);
      out.push([x, y, rr, (r() - 0.35) * rr * 0.5, base, h, 0]);
      for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
        const a = Math.PI * (0.12 + 0.76 * r()), sr = rr * (0.26 + r() * 0.3);
        out.push([x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.76, sr, rr * 0.22 + r() * sr * 0.4, base, h, 0]);
      }
      x += rr * (0.72 + r() * 0.42);
    }
    for (let i = 0, n = Math.round(w * h * 0.9 / (lobe * lobe)); i < n; i++) {
      const x = cx + (r() - 0.5) * (w - lobe * 2), top = env(x); if (top < lobe * 1.5) continue;
      out.push([x, base + lobe * 0.5 + r() * (top - lobe * 1.4), lobe * (1.3 + r() * 0.7), -lobe * (0.9 + r() * 0.6), base, h, 1]);
    }
  }

  const MIST_BAKE = `
uniform float per, asp;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 nq = vec2(vUv.x * per, vUv.y * per / asp * 2.5);
  float n = fbmP(nq, per) * .7 + fbmP(nq * 3. + vec2(0., 4.), per * 3.) * .3;
  float band = smoothstep(0., .3, vUv.y) * (1. - smoothstep(.3, .95, vUv.y));
  gl_FragColor = vec4(1., 1., 1., smoothstep(.3, .75, n * (.5 + band * .8)) * band);
}`;

  const SKY_BAKE = `
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = vUv;
  vec2 cq = vec2(p.x * 3.2 + fbm(vec2(p.x * 2., p.y * 6.)) * 1.4, p.y * 26.);
  float c = fbm(cq + vec2(0., fbm(p * vec2(4., 10.)) * 3.));
  float cir = smoothstep(.56, .8, c) * smoothstep(.12, .3, p.y) * (1. - smoothstep(.42, .62, p.y));
  float big = fbm(p * vec2(3., 6.) + 4.);
  float mw = exp(-pow((p.y - .42 - (p.x - .5) * .45) * 6., 2.)) * smoothstep(.3, .8, fbm(p * vec2(12., 26.)));
  gl_FragColor = vec4(cir, big, mw, 1.);
}`;

  /* ---------- Scene ---------- */
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(45, 1, 0.3, 2400); cam.layers.enable(1);
  const cam0 = new T.PerspectiveCamera(45, 1, 0.3, 2400); // the view without its drift, for placing things on screen
  const mcam = new T.PerspectiveCamera(); mcam.matrixAutoUpdate = false; mcam.layers.set(1);
  let W = 1, H = 1, VF = 45, HF = 60, pitch = 0.1;
  const hwAt = d => d * Math.tan(HF * deg / 2);

  const LAYER_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const LAYER_FS = `
uniform sampler2D map; uniform vec2 uOff; uniform float uOpacity, uHazeAmt, uPeak, uHazeLow, uFlip;
uniform vec3 uL, uS, uH, uPL, uPS;
varying vec2 vUv; varying vec3 vW;
${PDECL}${PAINT}
void main(){
  if (uClip > .5 && vW.y < uWaterY) discard;
  vec4 t = texture2D(map, vUv + uOff);
#ifdef MIST
  gl_FragColor = vec4(p_mist, t.a * p_mistAmt * uOpacity);
#else
  if (t.a < .003) discard;
  vec3 n = decodeN(t); n.x *= uFlip;
  vec3 L = normalize(p_key), col;
  float h = clamp((vW.y - uWaterY) / uPeak, 0., 1.);
#ifdef CLOUD
  vec3 toS = uSunDir / max(-uSunDir.z, .05);
  float dz = cameraPosition.z - vW.z;
  vec2 sp = cameraPosition.xy + toS.xy * dz, dv = sp - vW.xy;
  float dist = length(dv) / dz; vec2 sd = dv / max(length(dv), 1e-4);
  float nearS = exp(-dist * 3.);
  vec3 Lc = normalize(vec3(sd, p_front));
  float d = dot(n, Lc);
  col = band3(d, p_cShadow, p_cMid, p_cLight, .045);
  col = mix(p_cCrease, col, t.b);
  float rim = pow(1. - n.z, 2.) * max(0., dot(normalize(n.xy + 1e-4), sd));
  col += p_cRim * rim * (.22 + 1.3 * nearS) * p_rimAmt;
  col += p_glow * nearS * .3 * p_glowAmt;
  col = mix(col, p_cHaze, uHazeAmt);
  gl_FragColor = vec4(col, t.a * uOpacity);
#endif
#endif
}`;
  function layer(tex, mode, d, w, h, yBottom, order, extra) {
    const m = mk(LAYER_VS, LAYER_FS, Object.assign({ map: { value: tex }, uOff: { value: new T.Vector2() }, uOpacity: { value: 1 }, uHazeAmt: { value: 0 }, uPeak: { value: 1 }, uHazeLow: { value: 0.4 }, uFlip: { value: 1 },
      uL: U.p_rL, uS: U.p_rS, uH: U.p_rHaze, uPL: U.p_sPinkL, uPS: U.p_sPinkS }, extra), { transparent: true, depthWrite: false, side: T.DoubleSide, defines: { [mode]: 1 } });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m); mesh.position.set(0, yBottom + h / 2, -d); mesh.renderOrder = order; mesh.layers.enable(1); scene.add(mesh); return mesh;
  }

  // Sky: graded by height above the horizon, warmer toward the sun, with high cirrus, the sun or moon, and stars at night
  const SKY_FS = `
uniform sampler2D map;
varying vec2 vUv; varying vec3 vW;
${PDECL}${NOISE}
void main(){
  if (uClip > .5 && vW.y < uWaterY) discard;
  vec3 dir = normalize(vW - cameraPosition);
  float el = dir.y, sd = dot(dir, uSunDir);
  float az = max(0., dot(normalize(dir.xz + 1e-4), normalize(uSunDir.xz + 1e-4)));
  vec3 hor = mix(p_hor, p_horSun, pow(az, 5.) * .9 * (1. - smoothstep(0., .35, el)));
  float t = clamp(el / .62, 0., 1.);
  vec3 col = mix(hor, p_mid, smoothstep(0., .4, t));
  col = mix(col, p_zen, smoothstep(.22, 1., t));
  vec4 d = texture2D(map, vUv);
  col *= .965 + d.g * .07;
  col = mix(col, p_cirrus, d.r * .5 * (1. - p_star * .55));
  float g = max(sd, 0.);
  col += p_glow * (pow(g, 10.) * .32 + pow(g, 80.) * .55 + pow(g, 900.) * .6) * p_glowAmt;
  float disc = smoothstep(cos(p_sunR * 1.04), cos(p_sunR * .96), sd);
  float crater = p_star > .5 ? .9 + .1 * vnoise(dir.xy * 900.) : 1.;
  col = mix(col, p_sun * crater, disc);
  if (p_star > .01) {
    vec2 sc = vec2(atan(dir.x, -dir.z), asin(clamp(el, -1., 1.))) * 170.;
    vec2 ci = floor(sc), cf = fract(sc), h = hash22(ci);
    float on = step(.972, hash12(ci + 7.3)), tw = .55 + .45 * sin(uTime * (1. + h.x * 3.) + h.y * 40.);
    float st = on * smoothstep(.17, 0., length(cf - h * .7 - .15)) * tw * (.35 + h.x);
    col += vec3(.92, .94, 1.) * st * p_star * smoothstep(.02, .14, el) * (1. - disc);
    col += vec3(.5, .55, .85) * d.b * .3 * p_star * smoothstep(.05, .3, el);
  }
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.) - .5) / 200.;
  gl_FragColor = vec4(col, 1.);
}`;

  // Water: mirrors the scene above it (a second view from below the surface), broken by ripples, with painted glints
  const WATER_VS = 'uniform mat4 uTexMat; varying vec4 vR; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vR = uTexMat * w; gl_Position = projectionMatrix * viewMatrix * w; }';
  const WATER_FS = `
uniform sampler2D tRefl; uniform float uShore; uniform vec2 uTexel;
varying vec4 vR; varying vec3 vW;
${PDECL}${NOISE}
float hgt(vec2 q){ float t = uTime; return vnoise(q * vec2(.32, 1.05) + vec2(t * .22, t * .07)) + .5 * vnoise(q * vec2(.85, 2.5) - vec2(t * .16, t * .27)) + .25 * vnoise(q * vec2(2.1, 5.) + vec2(t * .4, 0.)); }
void main(){
  vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
  vec2 p = vW.xz; float e = .06, h0 = hgt(p);
  vec2 g = vec2(hgt(p + vec2(e, 0.)) - h0, hgt(p + vec2(0., e)) - h0) / e;
  float k = 1. / (1. + dist * .035);
  vec3 n = normalize(vec3(-g.x * .22 * k, 1., -g.y * .22 * k));
  // a soft reflection, as painted: five taps spread more where the water is near and rippled
  vec2 ru = vR.xy / vR.w + n.xz * .06 * k, bl = uTexel * (1.5 + 3. * k);
  vec3 refl = (texture2D(tRefl, ru).rgb * 2. + texture2D(tRefl, ru + vec2(bl.x, bl.y * .5)).rgb + texture2D(tRefl, ru - vec2(bl.x, bl.y * .5)).rgb
    + texture2D(tRefl, ru + vec2(-bl.x * .5, bl.y)).rgb + texture2D(tRefl, ru + vec2(bl.x * .5, -bl.y)).rgb) / 6.;
  float fres = .38 + .62 * pow(1. - max(V.y, 0.), 4.);
  vec3 col = mix(p_wDeep, refl * .9 + p_wDeep * .08, fres);
  vec3 Hh = normalize(V + uSunDir);
  float spec = pow(max(dot(n, Hh), 0.), 70.);
  float strokes = smoothstep(.6, .7, vnoise(vec2(p.x * 1.1 + uTime * .25, p.y * 7.5 - uTime * .1)));
  col += p_wGlint * spec * strokes * 1.6 * (1. - p_star * .4);
  col += p_wGlint * smoothstep(.78, .82, vnoise(vec2(p.x * .22 - uTime * .04, p.y * 2.2))) * .07 * k;
  col = mix(col, p_wHaze, smoothstep(uShore * .45, uShore, -vW.z) * .22);
  gl_FragColor = vec4(col, 1.);
}`;

  // The bridge and the little islands at its ends: soft two-tone shading in the scene's light
  const SOLID_VS = 'attribute float aMat; varying float vMat; varying vec3 vN, vW; void main(){ vMat = aMat; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';
  const SOLID_FS = `
varying float vMat; varying vec3 vN, vW;
${PDECL}
void main(){
  if (uClip > .5 && vW.y < uWaterY - .02) discard;
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float d = dot(n, normalize(p_key)), a = smoothstep(-.05, .12, d), hi = smoothstep(.55, .75, d);
  vec3 lit, sh;
  if (vMat < .5) { lit = p_vL; sh = p_vS; }
  else if (vMat < 1.5) { lit = p_wood; sh = p_wood * .55; }
  else if (vMat < 2.5) { lit = vec3(.36, .38, .3) * p_dim; sh = vec3(.13, .14, .14) * p_dim; }
  else if (vMat < 3.5) { lit = p_gL; sh = p_gS; }
  else if (vMat > 4.5) { lit = mix(p_gS, p_gL, .62); sh = p_gS * .75; }
  else { lit = vec3(.66, .66, .7) * p_dim; sh = vec3(.3, .31, .4) * p_dim; }
  vec3 col = mix(sh, lit, a) + lit * hi * .12;
  col += p_fillCol * p_lantern * .16 * max(0., 1. - abs(vW.y - uWaterY - 3.) * .25);
  gl_FragColor = vec4(col, 1.);
}`;

  /* ---------- Cherry trees ---------- */
  const BARK_VS = `attribute vec3 aAnc; attribute float aFlex; varying vec3 vN, vW; varying float vFlex;
${PDECL}${WIND}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.); w.xyz += sway(aAnc, aFlex) * length(modelMatrix[0].xyz); vN = normalize(mat3(modelMatrix) * normal);
#ifdef INK
  w.xyz += vN * uInk * 1.3 * length(w.xyz - cameraPosition) * uPxW;
#endif
  vW = w.xyz; vFlex = aFlex; gl_Position = projectionMatrix * viewMatrix * w;
}`;
  const BARK_FS = `
varying vec3 vN, vW; varying float vFlex;
${PDECL}${NOISE}
void main(){
#ifdef INK
  gl_FragColor = vec4(p_kInk, 1.);
#else
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float d = dot(n, normalize(p_key));
  vec3 col = mix(p_kS, p_kL, smoothstep(-.03, .03, d));
  col *= .93 + .1 * step(.55, vnoise(vec2((vW.x + vW.z) * 7., vW.y * 2.)));
  col += p_fillCol * p_fillAmt * .3 * step(.2, dot(n, normalize(p_fill)));
  gl_FragColor = vec4(col, 1.);
#endif
}`;
  // Blossom clumps: each one a single drawn illustration (light, middle and shadow tones, an ink outline, little
  // blossoms), hung on the 3D branches facing the view; drawn lit from the right, and mirrored when the light comes
  // from the left
  const CARD_VS = `
attribute vec3 iPos, iClump, iNorm; attribute vec4 iMisc; attribute float iShell, iRad;
uniform vec3 uCanC, uCanR;
varying vec2 vUv; varying vec3 vP;
${PDECL}${WIND}
void main(){
  float sc = length(modelMatrix[0].xyz);
  vec4 c = modelMatrix * vec4(iPos, 1.); c.xyz += sway(iClump, iMisc.z) * sc;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float rot = iMisc.y + sin(uTime * 2.3 + iMisc.y * 7.) * .035 * (.35 + uGust), size = iMisc.x * sc;
#ifdef INK
  vec3 toC = c.xyz - cameraPosition; float dist = length(toC), push = 1.6 * sc;
  c.xyz += toC / dist * push;
  size = size * (dist + push) / dist + 3.6 * uInk * (dist + push) * uPxW;
#endif
  vec2 q = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * position.xy * size;
  vec3 w = c.xyz + right * q.x + up * q.y;
  float v = iMisc.w, fx = p_key.x < 0. ? 1. - uv.x : uv.x;
  vUv = (vec2(fx, uv.y) + vec2(mod(v, 4.), floor(v / 4.))) * .25;
  vP = normalize(mat3(modelMatrix) * ((iPos - uCanC) / uCanR));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
  const CARD_FS = `
uniform sampler2D atlas;
varying vec2 vUv; varying vec3 vP;
${PDECL}
void main(){
  vec4 tx = texture2D(atlas, vUv);
  if (tx.a < .4) discard;
#ifdef INK
  gl_FragColor = vec4(p_ink, clamp((tx.a - .4) / .2, 0., 1.)); return;
#endif
  vec3 c3 = tx.rgb / max(tx.a, .001);
  float t = c3.r;
  vec3 col = mix(p_ink, p_bShadow, smoothstep(.13, .2, t));
  col = mix(col, p_bMid, smoothstep(.46, .54, t));
  col = mix(col, p_bLight, smoothstep(.8, .87, t));
  col = mix(col, mix(p_bLight, vec3(1.), .45), smoothstep(.45, .6, c3.g));
  col = mix(col, p_bShadow * .86, smoothstep(.45, .6, c3.b));
  // clumps on the crown's shaded side and underneath are a tone deeper, as painted
  float dk = dot(normalize(vP), normalize(p_key));
  col *= mix(.83, 1., smoothstep(-.3, -.2, dk));
  col += p_fillCol * p_fillAmt * step(.25, -normalize(vP).y + .2) * .3;
  gl_FragColor = vec4(col, clamp((tx.a - .4) / .2, 0., 1.));
}`;
  // The sheet of clumps, 4 by 4: twelve cloud-shaped clumps and four sprigs of loose blossoms. Red holds the tone
  // (0 ink, a third shadow, two thirds middle, full light), green the light little blossoms, blue the darker ones.
  function blossomAtlas() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S * 4; const g = c.getContext('2d'), r = rng(77);
    const INK = 'rgb(0,0,0)', DARK = 'rgb(85,0,0)', MID = 'rgb(170,0,0)', LIGHT = 'rgb(255,0,0)', FLW = 'rgb(255,255,0)', DFLW = 'rgb(85,0,255)';
    function bloom(x, y, s, rot, fill) {
      g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = fill; g.beginPath();
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, ca = Math.cos(a), sa = Math.sin(a), P = (px, py) => [px * ca - py * sa, px * sa + py * ca];
        const p0 = P(0, 0), c1 = P(s * 0.6, -s * 0.2), c2 = P(s * 0.62, -s * 0.9), p1 = P(s * 0.16, -s), p2 = P(0, -s * 0.84), p3 = P(-s * 0.16, -s), c3 = P(-s * 0.62, -s * 0.9), c4 = P(-s * 0.6, -s * 0.2);
        g.moveTo(...p0); g.bezierCurveTo(...c1, ...c2, ...p1); g.lineTo(...p2); g.lineTo(...p3); g.bezierCurveTo(...c3, ...c4, ...p0); }
      g.fill(); g.restore();
    }
    // a cloud-like outline: a wavy ellipse with small scallops along it
    function blob(W, H, lobes) {
      const ph = [r() * 6.28, r() * 6.28, r() * 6.28], pts = [], N = 96;
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, k = Math.min(1.32, 1 + lobes * (0.15 * Math.sin(3 * a + ph[0]) + 0.09 * Math.sin(5 * a + ph[1]) + 0.05 * Math.sin(9 * a + ph[2]))); pts.push([Math.cos(a) * W * 0.5 * k, Math.sin(a) * H * 0.5 * k]); }
      const bumps = []; for (let i = 0; i < N; i += 3) { const [x, y] = pts[i]; bumps.push([x, y, 6 + r() * 7]); }
      return { pts, bumps };
    }
    function path(b, dx, dy) {
      g.beginPath(); b.pts.forEach(([x, y], i) => i ? g.lineTo(dx + x, dy + y) : g.moveTo(dx + x, dy + y)); g.closePath();
      for (const [x, y, rr] of b.bumps) { g.moveTo(dx + x + rr, dy + y); g.arc(dx + x, dy + y, rr, 0, Math.PI * 2); }
    }
    function clump(cx, cy, W, H, lobes) {
      const b = blob(W, H, lobes);
      g.save(); g.translate(cx, cy);
      g.fillStyle = DARK; path(b, 0, 0); g.fill();
      g.save(); path(b, 0, 0); g.clip();
      g.fillStyle = MID; path(blob(W * 0.98, H * 0.92, lobes * 1.1), W * 0.07, -H * 0.12); g.fill();
      g.fillStyle = LIGHT; path(blob(W * 0.6, H * 0.5, lobes * 1.3), W * 0.17, -H * 0.25); g.fill();
      for (let i = 0; i < 11; i++) bloom((r() - 0.3) * W * 0.75, (r() - 0.7) * H * 0.8, 6 + r() * 4, r() * 6.28, FLW);
      for (let i = 0; i < 4; i++) bloom((r() - 0.7) * W * 0.7, (r() - 0.25) * H * 0.65, 5 + r() * 3, r() * 6.28, DFLW);
      g.restore(); g.restore();
    }
    function sprig(cx, cy) {
      g.save(); g.translate(cx, cy);
      g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-60, 70); g.quadraticCurveTo(-10, 20, 40, -30); g.stroke();
      const fl = []; for (let i = 0; i < 6; i++) fl.push([-40 + i * 16 + (r() - 0.5) * 20, 50 - i * 16 + (r() - 0.5) * 24, 16 + r() * 9, r() * 6.28]);
      for (const [x, y, s, rot] of fl) { g.save(); g.lineWidth = 6; g.strokeStyle = INK; g.translate(x, y); g.rotate(rot); g.beginPath(); g.arc(0, 0, s * 0.95, 0, 7); g.restore(); bloom(x, y, s + 2.5, rot, INK); }
      for (const [x, y, s, rot] of fl) { bloom(x, y, s, rot, MID); bloom(x + 1, y - 1, s * 0.62, rot, LIGHT); bloom(x, y, s * 0.22, rot, DFLW); }
      g.restore();
    }
    for (let i = 0; i < 16; i++) {
      const cx = (i % 4) * S + S / 2, cy = (3 - Math.floor(i / 4)) * S + S / 2;
      g.save(); g.beginPath(); g.rect(cx - S / 2, cy - S / 2, S, S); g.clip();
      if (i < 12) { const wide = r() < 0.7; clump(cx, cy, wide ? 140 + r() * 18 : 120 + r() * 14, wide ? 96 + r() * 20 : 120 + r() * 18, 0.8 + r() * 0.5); }
      else sprig(cx, cy);
      g.restore();
    }
    const tex = new T.CanvasTexture(c); tex.flipY = true; tex.anisotropy = 4; return tex;
  }
  // A branching tree: a short trunk splitting into wide, spreading limbs, then finer branches whose outer lengths carry
  // blossom clusters. Every point remembers how far out it is (for bending) and its anchor (so clusters move as one).
  function makeTree(seed, lean, scale) {
    const r = rng(seed), pos = [], nor = [], anc = [], flex = [], idx = [], cards = [];
    function tube(pts, rads, fl) {
      const ring = 7, base = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], t = (i < pts.length - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
        const a = Math.abs(t.y) < 0.92 ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0);
        const b1 = new T.Vector3().crossVectors(t, a).normalize(), b2 = new T.Vector3().crossVectors(t, b1).normalize();
        for (let k = 0; k < ring; k++) { const ang = k / ring * Math.PI * 2, n = b1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(b2, Math.sin(ang)); pos.push(p.x + n.x * rads[i], p.y + n.y * rads[i], p.z + n.z * rads[i]); nor.push(n.x, n.y, n.z); anc.push(p.x, p.y, p.z); flex.push(fl[i]); }
      }
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < ring; k++) { const a = base + i * ring + k, b = base + i * ring + (k + 1) % ring; idx.push(a, b, a + ring, b, b + ring, a + ring); }
    }
    function clump(c, rad, fl, d) {
      const center = c.clone().addScaledVector(d, rad * 0.25); center.y += rad * 0.25;
      cards.push(center.x, center.y, center.z, center.x, center.y, center.z, 0, 1, 0, rad * (2.7 + r() * 0.6), (r() - 0.5) * 0.25, fl, Math.floor(r() * 12), 1, rad);
    }
    function branch(p0, dir, len, rad, depth, f0) {
      const n = 5, pts = [p0.clone()], rads = [rad], fl = [f0]; let p = p0.clone(); const d = dir.clone();
      for (let i = 1; i <= n; i++) {
        d.x += (r() - 0.5) * 0.32 + lean * 0.018; d.z += (r() - 0.5) * 0.3; d.y += (r() - 0.5) * 0.2 + (depth >= 2 ? -0.06 : 0.03); d.normalize();
        p = p.clone().addScaledVector(d, len / n); pts.push(p); rads.push(rad * (1 - 0.38 * i / n)); fl.push(f0 + len * i / n);
      }
      tube(pts, rads, fl);
      if (depth >= 3) for (let i = depth >= 4 ? 1 : 3; i <= n; i += depth >= 4 ? 1 : 2) clump(pts[i], 0.5 * (0.75 + r() * 0.55), fl[i], d);
      if (depth < 4) {
        const kids = depth === 0 ? 4 : r() < 0.55 ? 2 : 3;
        for (let k = 0; k < kids; k++) {
          const at = depth === 0 ? n : Math.max(2, n - Math.floor(r() * 3)), nd = d.clone();
          if (depth === 0) { const a = (k / kids - 0.5) * 2.4 + lean * 0.5 + (r() - 0.5) * 0.4; nd.set(Math.sin(a) * 1.35, 0.26 + r() * 0.2, (r() - 0.5) * 0.9).normalize(); }
          else nd.addScaledVector(new T.Vector3(r() - 0.5, (r() - 0.4) * 0.4, r() - 0.5).normalize(), 0.7 + r() * 0.45).normalize();
          branch(pts[at], nd, len * (depth === 0 ? 1.7 : 0.72 + r() * 0.12), rads[at] * (depth === 0 ? 0.56 : 0.64), depth + 1, fl[at]);
        }
      }
    }
    branch(new T.Vector3(0, -0.3, 0), new T.Vector3(lean * 0.12, 1, 0).normalize(), 1.1, 0.3, 0, 0);
    const CS = 15, fMax = Math.max(...flex, ...cards.filter((_, i) => i % CS === 11));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3));
    g.setAttribute('aAnc', new T.BufferAttribute(new Float32Array(anc), 3)); g.setAttribute('aFlex', new T.BufferAttribute(new Float32Array(flex.map(f => Math.pow(f / fMax, 1.6))), 1)); g.setIndex(idx);
    const bark = new T.Mesh(g, mk(BARK_VS, BARK_FS, null, { side: T.DoubleSide }));
    const nC = cards.length / CS, A = k => new Float32Array(nC * k), iPos = A(3), iClump = A(3), iNorm = A(3), iMisc = A(4), iShell = A(1), iRad = A(1);
    for (let i = 0; i < nC; i++) { const o = i * CS; iRad[i] = cards[o + 14]; iPos.set(cards.slice(o, o + 3), i * 3); iClump.set(cards.slice(o + 3, o + 6), i * 3); iNorm.set(cards.slice(o + 6, o + 9), i * 3); iMisc.set([cards[o + 9], cards[o + 10], Math.pow(cards[o + 11] / fMax, 1.6), cards[o + 12]], i * 4); iShell[i] = cards[o + 13]; }
    const q = new T.PlaneGeometry(1, 1), ig = new T.InstancedBufferGeometry();
    ig.index = q.index; ig.setAttribute('position', q.attributes.position); ig.setAttribute('uv', q.attributes.uv);
    ig.setAttribute('iPos', new T.InstancedBufferAttribute(iPos, 3)); ig.setAttribute('iClump', new T.InstancedBufferAttribute(iClump, 3)); ig.setAttribute('iNorm', new T.InstancedBufferAttribute(iNorm, 3));
    ig.setAttribute('iMisc', new T.InstancedBufferAttribute(iMisc, 4)); ig.setAttribute('iShell', new T.InstancedBufferAttribute(iShell, 1)); ig.setAttribute('iRad', new T.InstancedBufferAttribute(iRad, 1)); ig.instanceCount = nC;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < nC; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], iPos[i * 3 + k]); hi[k] = Math.max(hi[k], iPos[i * 3 + k]); }
    const canC = new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2 - (hi[1] - lo[1]) * 0.1, (lo[2] + hi[2]) / 2), canR = new T.Vector3((hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2 + 0.5);
    const cu = { atlas: { value: ATLAS }, uCanC: { value: canC }, uCanR: { value: canR } };
    const flowers = new T.Mesh(ig, mk(CARD_VS, CARD_FS, cu, { alphaToCoverage: true })), flowersInk = new T.Mesh(ig, mk(CARD_VS, CARD_FS, cu, { alphaToCoverage: true, defines: { INK: 1 } }));
    const barkInk = new T.Mesh(g, mk(BARK_VS, BARK_FS, null, { side: T.BackSide, defines: { INK: 1 } }));
    const grp = new T.Group(); grp.add(bark, barkInk, flowers, flowersInk);
    for (const m of grp.children) { m.frustumCulled = false; m.layers.enable(1); }
    grp.scale.setScalar(scale); grp.userData.cards = nC; return grp;
  }

  /* ---------- The 3D land ---------- */
  // Cel-shaded the anime way: a crisp edge between light and shade, a brighter top light, a rim of light along the
  // edges, and haze that thickens with distance and low over the water
  const LAND_VS = `attribute vec2 aPol; attribute float aG; varying vec3 vN, vW; varying vec2 vPol; varying float vG, vK;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vPol = aPol; vG = aG; vK = 0.; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const LANDI_VS = `attribute vec3 iOff, iScl; attribute float iK; varying vec3 vN, vW; varying vec2 vPol; varying float vG, vK;
void main(){ vec4 w = modelMatrix * vec4(iOff + position * iScl, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * (normal / iScl)); vPol = vec2(0.); vG = 0.; vK = iK; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const LAND_FS = `
uniform vec3 uL, uS, uH, uPL, uPS; uniform float uHazeNear, uHazeFar, uHazeMax, uMistH, uPeak, uBaseY, uRim, uSide;
varying vec3 vN, vW; varying vec2 vPol; varying float vG, vK;
${PDECL}${NOISE}
void main(){
  if (uClip > .5 && vW.y < uWaterY) discard;
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(p_key * vec3(1. + uSide, 1. - uSide * .3, 1. - uSide * .85)), V = normalize(cameraPosition - vW);
  float d = dot(n, L), lit = smoothstep(-.03, .06, d), top = smoothstep(.6, .7, d);
  float rim = pow(1. - max(dot(n, V), 0.), 3.) * max(d + .3, 0.);
  vec3 col;
#ifdef FUJI
  float hN = (vW.y - uBaseY) / uPeak, a = vPol.x;
  float sl = .64 + (vnoise(vec2(a * 5., .5)) - .5) * .1 - vG * .36 - (vnoise(vec2(a * 46., vPol.y * .05)) - .5) * .07;
  float snow = smoothstep(sl - .006, sl + .006, hN);
  vec3 rock = mix(p_fRockS, p_fRockL, lit); rock = mix(rock, mix(p_fRockL, vec3(1.), .22), top * .6);
  rock *= .92 + .14 * vnoise(vec2(a * 70., vPol.y * .12));
  vec3 sn = mix(p_fSnowS, p_fSnowL, smoothstep(-.1, .0, d));
  col = mix(rock, sn, snow) + p_keyCol * rim * .3;
  col = mix(p_fHaze, col, smoothstep(0., .6, hN) * .78 + .16);
#else
  vec3 cl = uL, cs = uS;
#ifdef KINDS
  if (vK > .5) { cl = uPL; cs = uPS; }
#endif
#ifdef GROUND
  cl = mix(uS, uL, .5); cs = uS * .85;
#endif
  col = mix(cs, cl, lit); col = mix(col, cl * 1.1 + .04, top * .45);
  col += p_keyCol * rim * uRim;
  float dist = length(cameraPosition - vW);
  float hz = max(smoothstep(uHazeNear, uHazeFar, dist) * uHazeMax, (1. - smoothstep(0., max(uMistH, .01), vW.y - uWaterY)) * .55 * step(.01, uMistH));
  col = mix(col, uH, hz);
#endif
  gl_FragColor = vec4(col, 1.);
}`;
  function landMat(o, vs, defs) {
    return mk(vs || LAND_VS, LAND_FS, { uL: o.L || U.p_gL, uS: o.S || U.p_gS, uH: o.H || U.p_gS, uPL: U.p_sPinkL, uPS: U.p_sPinkS, uHazeNear: { value: o.near || 0 }, uHazeFar: { value: o.far || 1 },
      uHazeMax: { value: o.max || 0 }, uMistH: { value: o.mist || 0 }, uPeak: { value: o.peak || 1 }, uBaseY: { value: o.baseY || 0 }, uRim: { value: o.rim == null ? 0.2 : o.rim }, uSide: { value: o.side || 0 } }, { defines: defs || {} });
  }
  const withZeros = g => { const n = g.attributes.position.count; g.setAttribute('aPol', new T.BufferAttribute(new Float32Array(n * 2), 2)); g.setAttribute('aG', new T.BufferAttribute(new Float32Array(n), 1)); return g; };
  function terrain(w, d, sx, sz, cx, cz, hf) {
    const g = new T.PlaneGeometry(w, d, sx, sz); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hf(p.getX(i), p.getZ(i)));
    g.computeVertexNormals(); return withZeros(g);
  }
  // Mount Fuji: slopes that curve out to a wide base, a flat crater top with a ragged rim, and gullies carved down
  // the sides (snow fills them further down than on the ridges between)
  const FUJI_PK = 125;
  function makeFuji() {
    const RS = 90, AS = 240, RAD = 300, TOP = 13, pos = [], pol = [], gul = [], idx = [];
    for (let i = 0; i <= RS; i++) {
      const r = RAD * Math.pow(i / RS, 1.35);
      for (let j = 0; j <= AS; j++) {
        const a = -Math.PI / 2 + j / AS * Math.PI * 2, u = Math.max(0, r - TOP) / (RAD - TOP);
        const wv = fbmJ(r * 0.012 + 3, (a + 9) * 1.4, 2) * 1.8;
        const gv = Math.pow(1 - Math.abs(2 * fbmJ((a + 9) * 7 + wv, r * 0.011, 3) - 1), 2.2) * sm(0, 0.1, u);
        let h = FUJI_PK * Math.pow(1 - u, 1.9) - gv * 6.5 * (1 - u * 0.7) * (0.4 + 0.6 * sm(0.02, 0.3, u));
        if (r < TOP * 1.6) h += (vn(a * 7, 2) - 0.5) * 2.2 * (1 - sm(TOP, TOP * 1.6, r)) - 2.2 * (1 - sm(TOP * 0.4, TOP, r));
        h += (fbmJ(a * 3, r * 0.02, 2) - 0.5) * 4 * sm(0.3, 0.8, u);
        pos.push(Math.cos(a) * r, h, Math.sin(a) * r); pol.push(a, r); gul.push(gv);
      }
    }
    for (let i = 0; i < RS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + 1, c = a + AS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aPol', new T.BufferAttribute(new Float32Array(pol), 2)); g.setAttribute('aG', new T.BufferAttribute(new Float32Array(gul), 1));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, landMat({ peak: FUJI_PK, baseY: WY - 2, side: 0.9 }, null, { FUJI: 1 })); m.layers.enable(1); return m;
  }
  // Blue ridges between the lake and Fuji, dipping in front of the mountain so its slopes show
  const rangeH = (x, z) => -4 + sm(-172, -205, z) * (6 + Math.pow(1 - Math.abs(2 * fbmJ(x * 0.006 + 4, z * 0.012, 5) - 1), 1.5) * 30) * (1 - 0.78 * Math.exp(-Math.pow(x / 120, 2)));
  // The far shore: low rolling hills rising out of the water, wooded with round trees and a few cherries in bloom
  const hillH = (x, z) => -1.6 + sm(-139, -147, z) * (2.4 + fbmJ(x * 0.014 + 7, z * 0.02, 4) * 15 * sm(-142, -185, z));
  function makeShore() {
    const grp = new T.Group();
    const hills = new T.Mesh(terrain(800, 62, 320, 25, 0, -170, hillH), landMat({ L: U.p_sS, S: U.p_sS, H: U.p_sHaze, near: 90, far: 320, max: 0.45, mist: 3.5, rim: 0.06 }));
    const tr = rng(41), off = [], scl = [], kind = [];
    for (let z = -146; z > -194; z -= 6 + tr() * 3) for (let x = -390; x < 390; x += 2.5 + tr() * 2.3) {
      const zz = z + (tr() - 0.5) * 4, h = hillH(x, zz); if (h < 0.4) continue;
      const k = 1 + (-zz - 147) / 60, rr = (1.1 + tr() * 1.0) * k, pink = tr() < 0.14 ? 1 : 0, sd = tr() < 0.5 ? -1 : 1;
      off.push(x, h + rr * 0.8, zz, x + sd * rr * 0.6, h + rr * 1.25, zz - 0.3);
      scl.push(rr, rr * 1.1, rr, rr * 0.66, rr * 0.68, rr * 0.66); kind.push(pink, pink);
    }
    const blob = new T.IcosahedronGeometry(1, 1), ig = new T.InstancedBufferGeometry();
    ig.setAttribute('position', blob.attributes.position); ig.setAttribute('normal', blob.attributes.normal);
    ig.setAttribute('iOff', new T.InstancedBufferAttribute(new Float32Array(off), 3)); ig.setAttribute('iScl', new T.InstancedBufferAttribute(new Float32Array(scl), 3)); ig.setAttribute('iK', new T.InstancedBufferAttribute(new Float32Array(kind), 1)); ig.instanceCount = kind.length;
    const trees = new T.Mesh(ig, landMat({ L: U.p_sL, S: U.p_sS, H: U.p_sHaze, near: 90, far: 320, max: 0.45, mist: 3, rim: 0.16, side: 0.5 }, LANDI_VS, { KINDS: 1 })); trees.frustumCulled = false;
    hills.layers.enable(1); trees.layers.enable(1); grp.add(hills, trees); grp.userData.trees = kind.length / 2; return grp;
  }
  // The near banks: grassy ground, high at the screen's edge and sloping into the lake
  const bankH = (xi, z, s) => {
    const plateau = 1.15 + (fbmJ(xi * 0.3 + s, z * 0.3, 3) - 0.5) * 0.8, t = sm(0.8, 4.2, xi + (fbmJ(z * 0.25 + s, 3.3, 3) - 0.5) * 2.4);
    const back = sm(-1.5, -6.5, z + (fbmJ(xi * 0.3, s + 5, 2) - 0.5) * 2);
    return (plateau * (1 - t) - 0.9 * t) * (1 - back) - 0.9 * back;
  };
  const GRASS_VS = `
attribute vec3 iRoot, iGN; attribute vec4 iP; attribute float iTone;
varying vec2 vUv; varying float vTone; varying vec3 vW, vGN;
${PDECL}${WIND}
void main(){
  vec4 w = modelMatrix * vec4(iRoot + vec3(position.x * iP.x * iP.w, position.y * iP.y, 0.), 1.);
  w.xyz += sway(iRoot * 1.7, position.y * position.y * 1.3) * length(modelMatrix[0].xyz);
  vUv = (uv + vec2(mod(iP.z, 2.), floor(iP.z / 2.))) * .5; vTone = iTone; vW = w.xyz; vGN = normalize(mat3(modelMatrix) * iGN);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
  const GRASS_FS = `
uniform sampler2D atlas;
varying vec2 vUv; varying float vTone; varying vec3 vW, vGN;
${PDECL}${NOISE}
void main(){
  if (uClip > .5 && vW.y < uWaterY) discard;
  vec4 tx = texture2D(atlas, vUv); if (tx.a < .4) discard;
  vec3 c3 = tx.rgb / max(tx.a, .001);
  float d = dot(normalize(vGN), normalize(p_key)), lit = smoothstep(-.02, .02, d) * (.5 + .5 * step(.42, vnoise(vW.xz * .3 + 3.)));
  vec3 body = mix(p_gS * 1.15, p_gL, lit), tip = mix(p_gL, p_gTip, lit);
  vec3 col = mix(body, tip, smoothstep(.72, .8, c3.r)) * mix(.92, 1.05, vTone);
  col = mix(col, mix(p_sPinkS, p_sPinkL, max(lit, .4)), c3.g);
  col = mix(p_gInk, col, smoothstep(.18, .32, c3.r + c3.g));
  col += p_fillCol * p_fillAmt * .08;
  gl_FragColor = vec4(col, clamp((tx.a - .4) / .2, 0., 1.));
}`;
  // A sheet of drawn grass: tufts of pointed blades (body tone, lighter tips, ink outlines), and a rounded flowering
  // bush (red: tone, green: its pink flowers, black: ink)
  function grassAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(13);
    const BODY = 'rgb(150,0,0)', TIP = 'rgb(255,0,0)', INK = '#000';
    function tuft(cell, n, H, W) {
      const cx = (cell % 2) * 256 + 128, by = (1 - Math.floor(cell / 2)) * 256 + 250, blades = [];
      for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * 2 - 1; blades.push({ x0: t * W * 0.22 + (r() - 0.5) * 8, w: 8 + r() * 5, x1: t * W * 0.5 + (r() - 0.5) * 24, y1: H * (0.55 + r() * 0.45) * (1 - Math.abs(t) * 0.35), bend: (r() - 0.5) * 24, z: r() }); }
      blades.sort((a, b) => a.z - b.z);
      g.save(); g.beginPath(); g.rect(cx - 128, by - 250, 256, 256); g.clip(); g.translate(cx, by);
      for (const b of blades) {
        const gr = g.createLinearGradient(0, 0, 0, -b.y1); gr.addColorStop(0, BODY); gr.addColorStop(0.55, BODY); gr.addColorStop(0.57, TIP); gr.addColorStop(1, TIP);
        g.beginPath(); g.moveTo(b.x0 - b.w, 6); g.quadraticCurveTo(b.x0 - b.w * 0.4 + b.bend, -b.y1 * 0.55, b.x1, -b.y1); g.quadraticCurveTo(b.x0 + b.w * 0.4 + b.bend, -b.y1 * 0.5, b.x0 + b.w, 6); g.closePath();
        g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      }
      g.restore();
    }
    tuft(0, 9, 220, 200); tuft(1, 7, 170, 180); tuft(3, 11, 120, 230);
    const cx = 128, by = 250, cs = [[cx, by - 70, 66]];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.06 + 0.88 * i / 8); cs.push([cx + Math.cos(a) * 72, by - 30 - Math.sin(a) * 66, 34 + r() * 16]); }
    g.save(); g.beginPath(); g.rect(0, 0, 256, 256); g.clip();
    g.strokeStyle = INK; g.lineWidth = 8; for (const [x, y, rr] of cs) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); }
    g.fillStyle = BODY; for (const [x, y, rr] of cs) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    g.fillStyle = TIP; for (const [x, y, rr] of cs) if (y < by - 75) { g.beginPath(); g.arc(x + 8, y - 12, rr * 0.45, 0, 7); g.fill(); }
    g.fillStyle = 'rgb(0,255,0)'; for (let i = 0; i < 30; i++) { const a = r() * Math.PI, d = Math.sqrt(r()) * 78; g.beginPath(); g.arc(cx + Math.cos(a) * d, by - 40 - Math.sin(a) * d * 0.9, 4 + r() * 4, 0, 7); g.fill(); }
    g.restore();
    const tex = new T.CanvasTexture(c); tex.flipY = true; tex.anisotropy = 4; return tex;
  }
  // A bank and its grass. side -1 is the left bank (its outer edge off the left of the screen), 1 the right.
  function makeBank(side, seed, treeSeed, treeScale) {
    const grp = new T.Group(), H = (x, z) => bankH(-side * x, z, seed);
    const ground = new T.Mesh(terrain(16, 13, 80, 65, -side * 0.5, -1, H), landMat({ L: U.p_gL, S: U.p_gS, H: U.p_gS, rim: 0.05 }, null, { GROUND: 1 }));
    const r = rng(seed * 7 + 3), roots = [], gn = [], prm = [], tone = [];
    const put = (xi, z, kind, w, ht) => {
      const x = -side * xi, h = bankH(xi, z, seed), e = 0.08, nx = (H(x - e, z) - H(x + e, z)) / (2 * e), nz = (H(x, z - e) - H(x, z + e)) / (2 * e), nl = Math.hypot(nx, 1, nz);
      roots.push(x, h - 0.06, z); gn.push(nx / nl, 1 / nl, nz / nl); prm.push(w, ht, kind, r() < 0.5 ? -1 : 1); tone.push(r());
    };
    for (let tries = 0; tone.length < 2100 && tries < 12000; tries++) {
      const xi = -7 + r() * 15, z = -7 + r() * 12.5; if (bankH(xi, z, seed) < 0.05) continue;
      const k = r(), kind = k < 0.4 ? 0 : k < 0.75 ? 1 : 3;
      put(xi, z, kind, kind === 3 ? 0.6 + r() * 0.3 : 0.5 + r() * 0.3, kind === 0 ? 0.55 + r() * 0.3 : kind === 1 ? 0.42 + r() * 0.2 : 0.28 + r() * 0.12);
    }
    for (let tries = 0, n = 0; n < 9 && tries < 600; tries++) { const xi = -0.5 + r() * 3.5, z = -4.5 + r() * 4.5; if (bankH(xi, z, seed) < 0.3) continue; put(xi, z, 2, 0.7 + r() * 0.35, 0.55 + r() * 0.25); n++; }
    const quad = new T.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
    const ig = new T.InstancedBufferGeometry(); ig.index = quad.index; ig.setAttribute('position', quad.attributes.position); ig.setAttribute('uv', quad.attributes.uv);
    ig.setAttribute('iRoot', new T.InstancedBufferAttribute(new Float32Array(roots), 3)); ig.setAttribute('iGN', new T.InstancedBufferAttribute(new Float32Array(gn), 3));
    ig.setAttribute('iP', new T.InstancedBufferAttribute(new Float32Array(prm), 4)); ig.setAttribute('iTone', new T.InstancedBufferAttribute(new Float32Array(tone), 1)); ig.instanceCount = tone.length;
    const grass = new T.Mesh(ig, mk(GRASS_VS, GRASS_FS, { atlas: { value: GRASS } }, { side: T.DoubleSide, alphaToCoverage: true })); grass.frustumCulled = false;
    ground.layers.enable(1); grass.layers.enable(1); grp.add(ground, grass);
    const tree = makeTree(treeSeed, -side, treeScale); tree.position.set(-side * 0.4, bankH(0.4, 0.3, seed) - 0.4, 0.3); grp.add(tree);
    grp.userData = { tree, blades: tone.length }; return grp;
  }

  /* ---------- Falling petals ---------- */
  const PETAL_VS = `
attribute vec4 iSeed; attribute vec3 iBase;
uniform float uNear, uFar, uTanX, uTanY, uPitch, uSizeK; uniform vec3 uCam0;
varying vec2 vUv; varying vec3 vN; varying float vBlur, vFade, vZ;
${PDECL}
mat3 rotA(vec3 a, float t){ a = normalize(a); float s = sin(t), c = cos(t), o = 1. - c;
  return mat3(o * a.x * a.x + c, o * a.x * a.y + a.z * s, o * a.z * a.x - a.y * s, o * a.x * a.y - a.z * s, o * a.y * a.y + c, o * a.y * a.z + a.x * s, o * a.z * a.x + a.y * s, o * a.y * a.z - a.x * s, o * a.z * a.z + c); }
void main(){
  float z = mix(uNear, uFar, pow(iBase.z, 1.7)), wx = 2. * z * uTanX, wy = 2. * z * uTanY, t = uTime;
  vec2 p = iBase.xy;
  float w = 1.1 + iSeed.z * 1.5, sw = sin(t * w + iSeed.w * 6.283);
  p.x += (uWindOff.x * (.75 + iSeed.y * .5) + sw * .3 * (.5 + iSeed.y) + sin(t * .13 + iSeed.x * 9.) * .5) / wx;
  p.y += (-t * (.32 + iSeed.x * .3) + uWindOff.y * (.7 + iSeed.z * .5) + abs(sw) * .1 + sin(t * .21 + iSeed.y * 7.) * .3) / wy;
  p = fract(p);
  vec3 local = vec3((p.x * 2. - 1.) * z * uTanX * 1.06, (p.y * 2. - 1.) * z * uTanY * 1.06, -z);
  float c = cos(uPitch), s = sin(uPitch);
  vec3 wp = uCam0 + vec3(local.x, c * local.y - s * local.z, s * local.y + c * local.z);
  float spin = uSpin * (.6 + iSeed.y * 1.3) + iSeed.x * 6.283;
  mat3 Rm = rotA(vec3(iSeed.z - .5, iSeed.w - .5, iSeed.x - .5 + .2), spin) * rotA(vec3(0., 0., 1.), sw * .9);
  float size = uSizeK * (.75 + iSeed.w * .5) * (1. + z * .045);
  vec3 world = wp + Rm * (position * size);
  vN = Rm * normal; vUv = uv; vZ = z;
  vBlur = smoothstep(3., .7, z) * .85 + smoothstep(20., 50., z) * .3;
  vFade = smoothstep(.4, 1., z) * (1. - smoothstep(uFar * .85, uFar, z));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.);
}`;
  const PETAL_FS = `
varying vec2 vUv; varying vec3 vN; varying float vBlur, vFade, vZ;
${PDECL}
void main(){
  vec2 q = vUv * 2. - 1.;
  float wdt = .64 * (.32 + .68 * sqrt(clamp((q.y + 1.) * .5, 0., 1.)));
  float sdf = length(vec2(q.x / wdt, q.y)) + (1. - smoothstep(0., .24, length(vec2(q.x * 1.5, q.y - 1.)))) * .4;
  float aa = fwidth(sdf) * 1.2 + vBlur;
  float a = 1. - smoothstep(1. - aa, 1. + aa * .2, sdf);
  if (a < .01) discard;
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(p_key); float d = dot(n, L);
  vec3 base = mix(p_pDeep, p_pLight, smoothstep(-1., .55, q.y));
  vec3 col = base * (p_amb * .55 + p_keyCol * (.62 + .38 * d)) + p_bTrans * pow(max(0., -d), 1.5) * .35;
  col += p_fillCol * p_fillAmt * .35 * max(0., dot(n, normalize(p_fill)));
  col = mix(col, p_wHaze, smoothstep(12., 55., vZ) * .45);
  gl_FragColor = vec4(col, a * vFade * (1. - vBlur * .45));
}`;
  const FLY_VS = `attribute vec4 aSeed; uniform float uPx; varying float vA;
${PDECL}
void main(){
  vec3 p = position;
  p.x += sin(uTime * (.18 + aSeed.x * .3) + aSeed.y * 6.28) * 1.6; p.y += sin(uTime * (.3 + aSeed.z * .4) + aSeed.w * 6.28) * .45; p.z += cos(uTime * (.14 + aSeed.y * .2) + aSeed.x * 6.28) * 1.4;
  vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  vA = smoothstep(.15, 1., sin(uTime * (.6 + aSeed.y * .9) + aSeed.w * 30.)) * p_fly;
  gl_PointSize = uPx * (2.4 + aSeed.z * 2.) * 60. / -mv.z;
}`;
  const FLY_FS = `varying float vA; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float d = dot(q, q); float a = exp(-d * 4.) * .6 + exp(-d * 40.); gl_FragColor = vec4(vec3(1., .93, .55) * a * vA, 1.); }`;
  const GLOW_FS = `uniform float uA; varying vec2 vUv; ${PDECL}
void main(){ float d = length(vUv - .5) * 2.; gl_FragColor = vec4(vec3(1., .74, .42) * (exp(-d * d * 5.) * .55 + exp(-d * d * 30.) * .5) * uA * p_lantern, 1.); }`;
  const LANTERN_FS = `varying vec2 vUv; varying vec3 vN; ${PDECL}
void main(){ float rib = .82 + .18 * sin(vUv.y * 70.); vec3 off = vec3(.82, .2, .16) * p_dim; vec3 on = vec3(1.25, .76, .4);
  vec3 col = mix(off, on, p_lantern) * rib; if (vUv.y < .1 || vUv.y > .9) col = vec3(.1, .07, .07); gl_FragColor = vec4(col, 1.); }`;
  const OVER_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  // Final touches: a soft glare from the sun with faint lens ghosts, a gentle vignette and a deeper top for the app's text
  const GLARE_FS = `uniform vec2 uSun; uniform float uAsp; varying vec2 vUv; ${PDECL}
float ghost(vec2 p, vec2 c, float r){ float d = length((p - c) * vec2(uAsp, 1.)) / r; return smoothstep(1., .7, d) * (.5 + .5 * smoothstep(.4, 1., d)); }
void main(){
  vec2 d = (vUv - uSun) * vec2(uAsp, 1.); float r = length(d);
  vec3 col = p_glow * (exp(-r * 3.4) * .09 + exp(-r * 14.) * .15) * p_glowAmt;
  vec2 ax = vec2(.5) - uSun;
  col += (vec3(1., .85, .6) * ghost(vUv, uSun + ax * .7, .035) + vec3(.6, .9, 1.) * ghost(vUv, uSun + ax * 1.3, .022) + vec3(.85, .7, 1.) * ghost(vUv, uSun + ax * 1.75, .07)) * .07 * p_flare;
  gl_FragColor = vec4(col, 1.);
}`;
  const SHADE_FS = `uniform float uVeilX; varying vec2 vUv; ${PDECL}
void main(){ float top = smoothstep(.66, 1., vUv.y), v = smoothstep(.4, .9, length((vUv - .5) * vec2(1., 1.25)));
  float veil = smoothstep(.5, .85, vUv.y) * (1. - smoothstep(uVeilX * .55, uVeilX, vUv.x)) * .5;
  gl_FragColor = vec4(mix(vec3(.02, .05, .16), p_zen * .5, .4), clamp((top + veil) * p_scrim + v * p_vig, 0., .8)); }`;

  let dirty = true, built = false, ATLAS = null, GRASS = null;
  const L = {}; // the scene's parts, for layout and the frame loop
  function build() {
    const t0 = performance.now();
    // painted layers
    const skyTex = bake(SKY_BAKE, {}, 1024, 1024, false);
    const r1 = rng(11), far = []; for (let x = 0.3; x < 8; x += 0.45 + r1() * 0.5) cumulus(r1, x, 0.09 + r1() * 0.04, 0.35 + r1() * 0.5, 0.22 + r1() * 0.3, far, 0.1);
    const r2 = rng(23), big = [];
    // low clouds on the left, where the app's greeting sits; the towers rise to the right of Fuji
    cumulus(r2, 1.45, 0.07, 0.95, 0.3, big, 0.075); cumulus(r2, 0.6, 0.08, 0.7, 0.24, big, 0.085); cumulus(r2, 2.05, 0.06, 0.6, 0.3, big, 0.08);
    cumulus(r2, 2.75, 0.07, 1.0, 0.66, big, 0.06); cumulus(r2, 3.5, 0.08, 0.66, 0.42, big, 0.075);
    for (let i = 0; i < 6; i++) cumulus(r2, 2.3 + r2() * 1.7, 0.3 + r2() * 0.2, 0.16 + r2() * 0.16, 0.08 + r2() * 0.06, big, 0.14);
    for (let i = 0; i < 4; i++) cumulus(r2, r2() * 2.1, 0.1 + r2() * 0.08, 0.14 + r2() * 0.14, 0.06 + r2() * 0.05, big, 0.14);
    const r3 = rng(37), mid = [];
    cumulus(r3, 2.85, 0.24, 0.72, 0.34, mid, 0.07); cumulus(r3, 3.45, 0.5, 0.42, 0.2, mid, 0.09);
    for (let i = 0; i < 5; i++) cumulus(r3, 2.3 + r3() * 1.7, 0.3 + r3() * 0.35, 0.14 + r3() * 0.14, 0.07 + r3() * 0.05, mid, 0.15);
    const texFar = bakeClouds(far, 2048, 256, 64), texBig = bakeClouds(big, 2048, 512, 64), texMid = bakeClouds(mid, 2048, 512, 64);
    const texMist = bake(MIST_BAKE, { per: { value: 10 }, asp: { value: 8 } }, 1024, 128, true);
    ATLAS = blossomAtlas(); GRASS = grassAtlas();

    const sky = new T.Mesh(new T.PlaneGeometry(4800, 3600), mk(LAYER_VS, SKY_FS, { map: { value: skyTex } }, { side: T.DoubleSide }));
    sky.position.set(0, 1500, -1600); sky.layers.enable(1); scene.add(sky);
    L.cFar = layer(texFar, 'CLOUD', 1400, 2722, 340, -23, 1, { uHazeAmt: { value: 0.42 } });
    L.cBig = layer(texBig, 'CLOUD', 980, 1837, 459, -16, 2, { uHazeAmt: { value: 0.1 } });
    L.cMid = layer(texMid, 'CLOUD', 280, 520, 130, 25, 4);
    L.mistFar = layer(texMist, 'MIST', 330, 700, 86, WY - 12, 6, { uOpacity: { value: 0.85 } });
    L.mistNear = layer(texMist, 'MIST', 152, 280, 35, WY - 9, 8, { uOpacity: { value: 0.7 } });
    // the land: Fuji, the ridges, the far shore, and the two near banks with their cherry trees
    L.fuji = makeFuji(); L.fuji.position.set(0, WY - 2, -600); scene.add(L.fuji);
    L.range = new T.Mesh(terrain(1300, 160, 360, 48, 0, -252, rangeH), landMat({ L: U.p_rL, S: U.p_rS, H: U.p_rHaze, near: 120, far: 420, max: 0.55, mist: 6, rim: 0.12, side: 0.7 }));
    L.range.position.y = WY; L.range.layers.enable(1); scene.add(L.range);
    L.shore = makeShore(); L.shore.position.y = WY; scene.add(L.shore);

    // the lake
    L.texMat = new T.Matrix4(); L.reflRT = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false });
    const water = new T.Mesh(new T.PlaneGeometry(800, 151), mk(WATER_VS, WATER_FS, { tRefl: { value: L.reflRT.texture }, uTexMat: { value: L.texMat }, uShore: { value: 150 }, uTexel: { value: new T.Vector2(0.002, 0.002) } }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, WY, (1 - 150) / 2); scene.add(water); L.water = water;

    // the bridge, its two little islands, and lanterns for the evening
    const P = [], N = [], M = [];
    const add = (geo, m) => { const gg = geo.index ? geo.toNonIndexed() : geo; const p = gg.attributes.position.array, n = gg.attributes.normal.array; for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) M.push(m); };
    const beam = (a, b, w, h, m) => { const d = new T.Vector3().subVectors(b, a), gg = new T.BoxGeometry(d.length(), h, w); gg.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()), new T.Vector3(1, 1, 1))); add(gg, m); };
    const post = (x, y0, y1, z, s, m) => { const gg = new T.BoxGeometry(s, y1 - y0, s); gg.translate(x, (y0 + y1) / 2, z); add(gg, m); };
    const BL = 15, BH = 3.4, BW = 2.2, seg = 28, arch = x => BH * Math.pow(Math.max(0, 1 - (2 * x / BL) ** 2), 0.62), V = (x, y, z) => new T.Vector3(x, y, z);
    for (let i = 0; i < seg; i++) {
      const x0 = -BL / 2 + BL * i / seg, x1 = -BL / 2 + BL * (i + 1) / seg, y0 = arch(x0), y1 = arch(x1);
      beam(V(x0, y0, 0), V(x1, y1, 0), BW, 0.2, 1);
      for (const z of [-BW / 2, BW / 2]) { beam(V(x0, y0 - 0.22, z), V(x1, y1 - 0.22, z), 0.16, 0.44, 0); beam(V(x0, y0 + 0.95, z), V(x1, y1 + 0.95, z), 0.13, 0.13, 0); beam(V(x0, y0 + 0.5, z), V(x1, y1 + 0.5, z), 0.07, 0.07, 0); }
    }
    const lanternAt = [];
    for (let i = 0; i <= seg; i += 4) {
      const x = -BL / 2 + BL * i / seg, y = arch(x);
      for (const z of [-BW / 2, BW / 2]) { post(x, y - 0.1, y + 1.1, z, 0.16, 0); if (i === 0 || i === seg) { const c = new T.SphereGeometry(0.17, 10, 8); c.scale(1, 1.4, 1); c.translate(x, y + 1.33, z); add(c, 2); } }
      if (i > 0 && i < seg) lanternAt.push(V(x, y + 0.42, BW / 2 + 0.16));
    }
    for (const fx of [-0.36, -0.2, 0, 0.2, 0.36]) { const x = fx * BL, y = arch(x); for (const z of [-BW / 2 + 0.25, BW / 2 - 0.25]) post(x, -3.5, y - 0.3, z, 0.24, 0); beam(V(x, y * 0.45, -BW / 2), V(x, y * 0.45, BW / 2), 0.12, 0.14, 0); }
    for (const s of [-1, 1]) {
      const m = new T.SphereGeometry(1, 20, 12); m.scale(2.3, 0.75, 2.0); m.translate(s * (BL / 2 + 1.3), -0.4, 0); add(m, 3);
      for (let k = 0; k < 3; k++) { const b = new T.IcosahedronGeometry(0.55 + k * 0.18, 1); b.scale(1.2, 0.85, 1); b.translate(s * (BL / 2 + 1.6 + k * 0.5), 0.25 + k * 0.12, -0.9 + k * 0.5); add(b, 5); }
      for (let k = 0; k < 4; k++) { const st = new T.SphereGeometry(0.5 + k * 0.08, 9, 7); st.scale(1.2, 0.6, 1); st.translate(s * (BL / 2 + 0.4 + k * 0.9), -0.05, 1.6 - k * 0.25); add(st, 4); }
    }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3)); bg.setAttribute('normal', new T.BufferAttribute(new Float32Array(N), 3)); bg.setAttribute('aMat', new T.BufferAttribute(new Float32Array(M), 1));
    const bridge = new T.Group(), bm = new T.Mesh(bg, mk(SOLID_VS, SOLID_FS, null, { side: T.DoubleSide })); bm.layers.enable(1); bridge.add(bm);
    const lanG = new T.SphereGeometry(0.26, 14, 10); lanG.scale(1, 1.3, 1);
    const lanM = mk('varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', LANTERN_FS);
    L.glows = [];
    for (const p of lanternAt) {
      const l = new T.Mesh(lanG, lanM); l.position.copy(p); l.layers.enable(1); bridge.add(l);
      const gl = new T.Mesh(new T.PlaneGeometry(2.6, 2.6), mk(LAYER_VS, GLOW_FS, { uA: { value: 1 } }, { transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      gl.position.copy(p).add(V(0, 0, 0.3)); gl.renderOrder = 9; gl.layers.enable(1); gl.userData.ph = Math.random() * 6; bridge.add(gl); L.glows.push(gl); l.userData.lantern = true;
    }
    L.lanterns = bridge.children.filter(c => c.userData.lantern);
    bridge.rotation.y = -0.32; bridge.position.y = WY + 0.25; scene.add(bridge); L.bridge = bridge;

    // cherry trees
    L.bankL = makeBank(-1, 2, 5, 0.62); L.bankR = makeBank(1, 6, 19, 0.95); scene.add(L.bankL, L.bankR);
    L.treeL = L.bankL.userData.tree; L.treeR = L.bankR.userData.tree;

    // petals
    const pg = new T.PlaneGeometry(1, 1.2, 3, 4), pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i); pp.setZ(i, 0.38 * x * x + 0.1 * y * y); }
    pg.computeVertexNormals();
    const NP = (host.clientWidth || innerWidth) * (host.clientHeight || innerHeight) < 600000 ? 520 : 760, pr2 = rng(91), seeds = new Float32Array(NP * 4), bases = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { for (let k = 0; k < 4; k++) seeds[i * 4 + k] = pr2(); bases[i * 3] = pr2(); bases[i * 3 + 1] = pr2(); bases[i * 3 + 2] = pr2(); }
    const ipg = new T.InstancedBufferGeometry(); ipg.index = pg.index; ['position', 'normal', 'uv'].forEach(k => ipg.setAttribute(k, pg.attributes[k]));
    ipg.setAttribute('iSeed', new T.InstancedBufferAttribute(seeds, 4)); ipg.setAttribute('iBase', new T.InstancedBufferAttribute(bases, 3)); ipg.instanceCount = NP;
    L.petalU = { uNear: { value: 0.7 }, uFar: { value: 60 }, uTanX: { value: 0.6 }, uTanY: { value: 0.4 }, uPitch: { value: 0.1 }, uSizeK: { value: 0.034 }, uCam0: { value: new T.Vector3() } };
    const petals = new T.Mesh(ipg, mk(PETAL_VS, PETAL_FS, L.petalU, { transparent: true, depthWrite: false, side: T.DoubleSide }));
    petals.frustumCulled = false; petals.renderOrder = 12; scene.add(petals); L.petals = petals;

    // fireflies over the water at night
    const NF = 90, fr = rng(5), fp = new Float32Array(NF * 3), fs = new Float32Array(NF * 4);
    for (let i = 0; i < NF; i++) { const z = -5 - Math.pow(fr(), 1.4) * 40; fp.set([(fr() - 0.5) * z * 1.4, WY + 0.3 + fr() * 2.2, z], i * 3); for (let k = 0; k < 4; k++) fs[i * 4 + k] = fr(); }
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(fp, 3)); fg.setAttribute('aSeed', new T.BufferAttribute(fs, 4));
    L.fly = new T.Points(fg, mk(FLY_VS, FLY_FS, { uPx: { value: 1 } }, { transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    L.fly.frustumCulled = false; L.fly.renderOrder = 11; scene.add(L.fly);

    // glare, vignette and the deeper top
    const quad = new T.PlaneGeometry(2, 2);
    L.glareU = { uSun: { value: new T.Vector2(0.8, 0.6) }, uAsp: { value: 1 } };
    const glare = new T.Mesh(quad, mk(OVER_VS, GLARE_FS, L.glareU, { transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    L.shadeU = { uVeilX: { value: 0.75 } };
    const shade = new T.Mesh(quad, mk(OVER_VS, SHADE_FS, L.shadeU, { transparent: true, depthTest: false, depthWrite: false }));
    glare.frustumCulled = shade.frustumCulled = false; glare.renderOrder = 20; shade.renderOrder = 21; scene.add(glare, shade);
    built = true; L.bakeMs = Math.round(performance.now() - t0);
  }

  /* ---------- Layout: the view, and where things sit on this screen ---------- */
  const HORIZON = 0.62;
  function layout() {
    W = Math.max(1, host.clientWidth || innerWidth); H = Math.max(1, host.clientHeight || innerHeight);
    R.setSize(W, H, false);
    const asp = W / H;
    if (asp >= 1) { VF = 45; HF = 2 * Math.atan(Math.tan(VF * deg / 2) * asp) / deg; if (HF > 75) { HF = 75; VF = 2 * Math.atan(Math.tan(37.5 * deg) / asp) / deg; } }
    else { HF = 46; VF = 2 * Math.atan(Math.tan(23 * deg) / asp) / deg; }
    pitch = Math.atan((HORIZON - 0.5) * 2 * Math.tan(VF * deg / 2));
    for (const c of [cam, cam0]) { c.fov = VF; c.aspect = asp; c.rotation.set(pitch, 0, 0); c.updateProjectionMatrix(); }
    cam0.position.set(0, 0, 0); cam0.updateMatrixWorld(true);
    const s = new T.Vector2(); R.getDrawingBufferSize(s); L.reflRT.setSize(Math.max(2, s.x >> 1), Math.max(2, s.y >> 1)); L.water.material.uniforms.uTexel.value.set(2 / s.x, 2 / s.y);
    const land = asp >= 1;
    L.fuji.position.x = (land ? 0.2 : 0.06) * hwAt(600);
    L.range.position.x = L.fuji.position.x * 0.42;
    L.bridge.position.x = -(land ? 0.42 : 0.3) * hwAt(40); L.bridge.position.z = -40;
    const k = clamp(hwAt(10) / 5.9, 0.62, 1.2);
    L.bankL.scale.setScalar(k); L.bankL.position.set(-hwAt(11) * (land ? 1 : 1.06), WY, -11);
    L.bankR.scale.setScalar(k); L.bankR.position.set(hwAt(13) * (land ? 1 : 1.06), WY, -13);
    L.petalU.uTanX.value = Math.tan(HF * deg / 2); L.petalU.uTanY.value = Math.tan(VF * deg / 2); L.petalU.uPitch.value = pitch;
    L.fly.material.uniforms.uPx.value = pr * H / 900;
    U.uPxW.value = 2 * Math.tan(VF * deg / 2) / H;
    L.glareU.uAsp.value = asp; L.shadeU.uVeilX.value = land ? 0.75 : 1.6; dirty = true;
  }

  /* ---------- Frame loop ---------- */
  const BIAS = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const MIR = new T.Matrix4().set(1, 0, 0, 0, 0, -1, 0, 2 * WY, 0, 0, 1, 0, 0, 0, 0, 1);
  const sunV = new T.Vector3(), camPos = new T.Vector3();
  let reflEvery = 1, last = 0, time = 0, windX = 0, windY = 0, spin = 0, ptrX = 0, ptrY = 0, tilt = null, cx = 0, cy = 0, frames = 0, fpsT = 0, fps = 0, slow = 0;
  // The view follows the mouse; on a touch screen it leans with a finger dragged sideways (turning the island, a
  // carousel) and settles back when the finger lifts.
  let touch = null;
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') touch = { id: e.pointerId, x: e.clientX }; }, { passive: true });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { ptrX = e.clientX / innerWidth * 2 - 1; ptrY = e.clientY / innerHeight * 2 - 1; } else if (touch && e.pointerId === touch.id) ptrX = -clamp((e.clientX - touch.x) / innerWidth * 1.6, -1, 1); }, { passive: true });
  const lift = e => { if (touch && e.pointerId === touch.id) { touch = null; ptrX = 0; } };
  addEventListener('pointerup', lift, { passive: true }); addEventListener('pointercancel', lift, { passive: true });
  // Focus: while the kid's island is open, the view glides forward and up over the lake, so the near trees part to
  // the sides and the sky opens up behind the floating island. It runs on the island's own timing (eased in and out).
  let foc = { a: 0, b: 0, t0: 0, dur: 1 }, focV = 0, jump = false;
  const easeIO = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2);
  addEventListener('deviceorientation', e => { if (e.gamma != null && e.beta != null) tilt = { x: clamp(e.gamma / 30, -1, 1), y: clamp((e.beta - 50) / 30, -1, 1) }; }, { passive: true });
  addEventListener('resize', () => { if (built) layout(); });
  new MutationObserver(() => setPhase(root.dataset.phase)).observe(root, { attributes: true, attributeFilter: ['data-phase'] });
  const busy = () => { const C = window.Chorecast; return document.hidden || host.offsetWidth === 0 || !!(C && C.skyBusy && C.skyBusy()); };

  function tick(now) {
    requestAnimationFrame(tick);
    if (!built || busy()) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    if (blend < 1) { blend = Math.min(1, blend + dt / 2.4); const e = blend * blend * (3 - 2 * blend); applyPalette(e); dirty = true; }
    if (reduced && !dirty) return;
    dirty = false;
    if (!cv.isConnected) host.insertBefore(cv, host.firstChild);
    const still = reduced ? 0 : 1; time += dt * still; const t = reduced ? 40 : time;
    // wind: calm stretches broken by gusts that bend the trees and sweep the petals along
    const g0 = 0.5 + 0.5 * (Math.sin(t * 0.21) * 0.55 + Math.sin(t * 0.13 + 1.3) * 0.45 + Math.sin(t * 0.047 + 4) * 0.4);
    const gust = Math.pow(clamp(g0, 0, 1), 2.4);
    windX += (0.45 + gust * 2.4) * dt * still; windY += gust * 0.35 * dt * still; spin += (0.9 + gust * 2.6) * dt * still;
    U.uTime.value = t; U.uGust.value = gust; U.uWindOff.value.set(windX, windY, 0); U.uSpin.value = spin;
    // the view drifts slowly, and follows the mouse, the device's tilt and the page's scroll
    const sc = Math.min(1, (scrollY || 0) / Math.max(1, innerHeight));
    const C = window.Chorecast, pan = (C && C.skyPan && C.skyPan()) || [0, 0];
    const tx = (0.6 * Math.sin(t * 0.083) + 0.9 * ptrX + (tilt ? tilt.x * 0.9 : 0) + pan[0]) * still, ty = (0.25 * Math.sin(t * 0.061 + 1.2) - 0.25 * ptrY + (tilt ? -tilt.y * 0.35 : 0) + pan[1]) * still + sc * 0.7;
    if (jump) { cx = tx; cy = ty; jump = false; } else { cx += (tx - cx) * Math.min(1, dt * 1.6); cy += (ty - cy) * Math.min(1, dt * 1.6); }
    if (!reduced) { const fp = clamp((now - foc.t0) / foc.dur, 0, 1); focV = foc.a + (foc.b - foc.a) * easeIO(fp); }
    cam.position.set(cx, cy + focV * 1.1, -focV * 4.2); cam.rotation.x = pitch + focV * 0.085; cam.updateMatrixWorld(true);
    // the sun (or moon) at its place on screen for this time of day
    const sy = W >= H ? U.p_sunY.value : HORIZON - (HORIZON - U.p_sunY.value) * 0.55;
    sunV.set(U.p_sunX.value * 2 - 1, 1 - sy * 2, 0.5).unproject(cam0); camPos.setFromMatrixPosition(cam0.matrixWorld);
    U.uSunDir.value.copy(sunV.sub(camPos).normalize());
    L.glareU.uSun.value.set(U.p_sunX.value, 1 - sy);
    // clouds drift, mist wanders
    L.cFar.material.uniforms.uOff.value.x = -t * 0.00009; L.cBig.material.uniforms.uOff.value.x = -t * 0.00006; L.cMid.material.uniforms.uOff.value.x = -t * 0.00011;
    L.mistFar.material.uniforms.uOff.value.x = -t * 0.0016; L.mistNear.material.uniforms.uOff.value.x = t * 0.0011;
    const lan = U.p_lantern.value; L.lanterns.forEach(l => { l.visible = lan > 0.02; }); L.glows.forEach(g => { g.visible = lan > 0.02; g.material.uniforms.uA.value = 0.85 + 0.15 * Math.sin(t * 7 + g.userData.ph) * Math.sin(t * 3.1 + g.userData.ph * 2); g.quaternion.copy(L.bridge.quaternion).invert().multiply(cam.quaternion); });
    L.fly.visible = U.p_fly.value > 0.02;
    // the lake's reflection: the same scene seen from below the surface
    mcam.matrix.multiplyMatrices(MIR, cam.matrixWorld); mcam.matrixWorldNeedsUpdate = true; mcam.updateMatrixWorld(true);
    mcam.projectionMatrix.copy(cam.projectionMatrix); mcam.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    L.texMat.multiplyMatrices(BIAS, mcam.projectionMatrix).multiply(mcam.matrixWorldInverse);
    if (!(reflEvery > 1 && (frames % reflEvery))) { U.uClip.value = 1; R.setRenderTarget(L.reflRT); R.render(scene, mcam); R.setRenderTarget(null); U.uClip.value = 0; }
    R.render(scene, cam);
    if (!cv.classList.contains('on')) cv.classList.add('on');
    // keep it smooth: a device that can't keep up draws a little less sharp
    frames++; if (now - fpsT > 1000) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now; if (!reduced && fps < 40) { if (++slow >= 2) { if (pr > 1) { pr = Math.max(1, pr - 0.25); R.setPixelRatio(pr); layout(); } else reflEvery = 2; slow = 0; } } else slow = 0; }
  }

  function start() {
    try { build(); } catch (e) { console.warn('Japanese sky', e); cv.remove(); return; }
    setPhase(root.dataset.phase); layout(); requestAnimationFrame(tick);
  }
  window.JapanSky = { focus: (v, ms) => { foc = { a: focV, b: v, t0: performance.now(), dur: Math.max(1, ms || 0) }; dirty = true; }, debug: () => ({ built, phase, focus: +focV.toFixed(2), fps: Math.round(fps), pr, reflEvery, bakeMs: L.bakeMs, cards: built ? L.treeL.userData.cards + L.treeR.userData.cards : 0, tufts: built ? L.bankL.userData.blades + L.bankR.userData.blades : 0, farTrees: built ? L.shore.userData.trees : 0, view: [+cx.toFixed(2), +cy.toFixed(2)], W, H, VF: Math.round(VF), HF: Math.round(HF) }), redraw: () => { dirty = true; }, snap: () => { setPhase(root.dataset.phase); from = to; blend = 1; applyPalette(1); jump = true; dirty = true; } }; // snap (for tests): finish any fade and glide now
  setTimeout(start, 30);
})();
