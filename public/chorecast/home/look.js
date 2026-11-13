/* Chorecast homes (a prototype), part 1 of 5: the anime look.
   Every model is real 3D. These shaders draw it like a hand-painted anime cel:
   - AnimeMaterial: flat colour in two tones, lit and a cool violet shade (never black), a thin richer band where the
     light turns, a hard toy highlight, a rim of light round the edges, and lamplight in stepped pools at night.
     Shadows from the sun get the same hard edge.
   - Ink: a second pass writes each surface's facing and part number, and the finish pass draws ink wherever depth,
     facing or part changes. Lines take a dark tint of the colour they sit on, like coloured trace lines on a cel;
     outer lines are thicker than inner ones.
   - Finish: the painted sky behind (gradient, cel-shaded clouds, stars at night), the soft "diffusion" glow anime
     compositors put on bright things, and a slight vignette.
   - Frames: anime runs at 24 frames a second and is mostly animated "on twos", 12 new drawings a second. The whole
     scene, camera included, only redraws on those beats (on threes is 8; 24 and smooth are there to compare). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const col = h => new T.Color(h);
  // Phones and iPads (a touch screen): a lighter farm and village, so they keep up. Fewer grass blades and grass layers,
  // a smaller shadow map and at most 1.5 pixels a point. ?lite=1 or ?lite=0 on the address tries it either way.
  IH.lite = (() => {
    try { const q = new URLSearchParams(location.search).get('lite'); if (q === '1' || q === '0') return q === '1'; return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1; } catch (e) { return false; }
  })();

  // Times of day. lit/shade multiply the base colour; sky/ground tint faces by which way they point.
  const PHASES = {
    day: {
      sun: [-0.42, 1, 0.55], sunI: 1, lit: [1.05, 1.01, 0.95], shade: [0.68, 0.67, 0.86], sky: [1.03, 1.03, 1.06], ground: [0.93, 0.92, 0.96],
      rim: [1, 0.96, 0.86], rimK: 0.2, ink: [0.36, 0.29, 0.44], glowT: 0.9, glowK: 0.22, lamps: 0, stars: 0,
      top: '#4f9cf0', mid: '#9ccdf7', bot: '#e8f5ff', cloud: '#ffffff', cloudSh: '#bccdee', sunAt: [0.82, 0.86], sunC: [1, 0.97, 0.88]
    },
    dusk: {
      sun: [-0.8, 0.5, 0.35], sunI: 1, lit: [1.14, 0.9, 0.7], shade: [0.56, 0.5, 0.78], sky: [1.04, 0.98, 1.02], ground: [0.9, 0.86, 0.92],
      rim: [1, 0.7, 0.45], rimK: 0.34, ink: [0.32, 0.22, 0.38], glowT: 0.8, glowK: 0.34, lamps: 0.6, stars: 0,
      top: '#4b5ab8', mid: '#e79bb0', bot: '#ffd59a', cloud: '#ffe2c4', cloudSh: '#b27fa8', sunAt: [0.14, 0.42], sunC: [1, 0.74, 0.5]
    },
    night: {
      sun: [0.35, 1, 0.45], sunI: 1, lit: [0.5, 0.56, 0.84], shade: [0.27, 0.29, 0.5], sky: [1, 1.02, 1.08], ground: [0.92, 0.92, 1],
      rim: [0.55, 0.65, 1], rimK: 0.26, ink: [0.3, 0.3, 0.46], glowT: 0.55, glowK: 0.55, lamps: 1, stars: 1,
      top: '#070f2e', mid: '#1b2a63', bot: '#38508e', cloud: '#5a6aa3', cloudSh: '#27336a', sunAt: [0.8, 0.84], sunC: [0.75, 0.82, 1]
    }
  };

  // Shared palette uniforms: every anime material points at these, so a change of time of day is one write.
  const PAL = {
    uLit: { value: new T.Vector3(1, 1, 1) }, uShade: { value: new T.Vector3(0.7, 0.7, 0.86) },
    uSky: { value: new T.Vector3(1, 1, 1) }, uGround: { value: new T.Vector3(0.93, 0.92, 0.96) },
    uRimC: { value: new T.Vector3(1, 1, 1) }, uRim: { value: 0.2 }, uPlain: { value: 0 },
    uHouse: { value: new T.Vector4(0, 0, 0, 0) }, uLampIn: { value: [0, 0, 0, 0] }
  };
  function setPhase(name) {
    const p = PHASES[name] || PHASES.day;
    PAL.uLit.value.set(...p.lit); PAL.uShade.value.set(...p.shade); PAL.uSky.value.set(...p.sky); PAL.uGround.value.set(...p.ground);
    PAL.uRimC.value.set(...p.rim); PAL.uRim.value = p.rimK;
    return p;
  }

  const VS = `
    #include <common>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    attribute vec2 aExt;
    #ifdef USE_PAT
      attribute vec2 aPat; varying vec2 vPat; varying vec3 vPL; varying vec3 vON;
    #endif
    #ifdef USE_TINT
      attribute float aTint; varying float vTint;
    #endif
    varying vec3 vCol; varying vec3 vN; varying vec3 vWN; varying vec3 vVP; varying vec2 vExt; varying vec3 vWP; varying vec2 vUv2;
    #ifdef ATLAS
      attribute float aTile; varying float vTile;
    #endif
    void main() {
      vec3 objectNormal = normal;
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      vec3 transformed = position;
      #include <skinning_vertex>
      vec3 transformedNormal = normalMatrix * objectNormal;
      vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
      vUv2 = uv;
      #ifdef ATLAS
        vTile = aTile;
      #endif
      #ifdef USE_TINT
        vTint = aTint;
      #endif
      #ifdef USE_PAT
        vPat = aPat; vPL = position; vON = normal;
      #endif
      vec4 mvPosition = viewMatrix * worldPosition;
      gl_Position = projectionMatrix * mvPosition;
      vN = transformedNormal; vWN = mat3(modelMatrix) * objectNormal; vVP = mvPosition.xyz; vExt = aExt; vWP = worldPosition.xyz;
      #ifdef USE_COLOR
        vCol = color;
      #else
        vCol = vec3(1.0);
      #endif
      #include <shadowmap_vertex>
    }`;
  const FS = `
    uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uRimC;
    uniform float uRim; uniform float uGlow; uniform float uOpacity; uniform float uSpec; uniform float uPlain;
    uniform vec4 uHouse; uniform float uLampIn[4];
    // which side of the home's walls lamp k lights (only the first four are a home's own lamps; any more, the farm's
    // and village's building lamps, light where they are). Read through this so a scene with more than four lamps
    // never indexes past the end of the array: that stops this shader compiling, and every model vanishes.
    float lampIn(int k) { if (k == 0) return uLampIn[0]; if (k == 1) return uLampIn[1]; if (k == 2) return uLampIn[2]; if (k == 3) return uLampIn[3]; return 0.0; }
    varying vec2 vUv2;
    #ifdef USE_TEX
      uniform sampler2D tMap; uniform vec2 uTexTone;
    #endif
    #ifdef USE_TINT
      uniform vec3 uTint; varying float vTint;
    #endif
    #ifdef USE_PAT
      varying vec2 vPat; varying vec3 vPL; varying vec3 vON;
      // Surface finishes, painted flat like an anime background: 1 wood grain, 2 woven fabric, 3 velvet, 4 stripes,
      // 5 polka dots, 6 brushed metal, 7 marble, 8 flowers, 9 big checks, 10 brick, 11 wood panels, 12 knit.
      // uv runs over whichever face it's on, in tiles (half metres) times the scale.
      vec3 finish(vec3 base, float id, float sc, out float sheen) {
        sheen = 0.0;
        vec3 n = abs(normalize(vON));
        vec2 uv = (n.x > 0.57 ? vPL.zy : n.y > 0.57 ? vPL.xz : vPL.xy) * sc;
        if (id < 1.5) { float g = fract(uv.y * 9.0 + sin(uv.x * 2.3) * 0.45 + sin(uv.x * 7.1) * 0.08); return base * mix(1.0, 0.87, step(0.8, g)) * mix(1.0, 0.95, step(0.45, fract(uv.y * 3.0 + 0.3))); }
        if (id < 2.5) { float c = mod(floor(uv.x * 40.0) + floor(uv.y * 40.0), 2.0); return base * (1.0 - 0.07 * c); }
        if (id < 3.5) { sheen = 1.0; return base * 0.86; }
        if (id < 4.5) { return base * mix(1.0, 0.8, step(0.5, fract(uv.x * 4.0))); }
        if (id < 5.5) { vec2 q = fract(uv * 4.0 + vec2(0.0, mod(floor(uv.x * 4.0), 2.0) * 0.5)) - 0.5; return mix(base, min(base * 1.35 + 0.18, vec3(1.0)), step(length(q), 0.17)); }
        if (id < 6.5) { sheen = 0.6; return base * mix(0.92, 1.04, step(0.5, fract(uv.y * 30.0))); }
        if (id < 7.5) { float v = abs(sin(uv.x * 3.0 + sin(uv.y * 4.0) * 1.6 + sin(uv.x * 9.0 + uv.y * 3.0) * 0.4)); return base * mix(0.8, 1.0, smoothstep(0.03, 0.1, v)); }
        if (id < 8.5) { vec2 c = fract(uv * 3.0 + vec2(0.0, mod(floor(uv.x * 3.0), 2.0) * 0.5)) - 0.5; float r = length(c), a = atan(c.y, c.x); float petal = step(r, 0.14 + 0.07 * cos(a * 5.0)); return mix(mix(base, base * 0.82, step(r, 0.42) * (1.0 - step(r, 0.3)) * 0.0), mix(vec3(1.0), base * 0.6 + vec3(0.4, 0.2, 0.25), step(r, 0.05)), petal * 0.85); }
        if (id < 9.5) { float c = mod(floor(uv.x * 1.0) + floor(uv.y * 1.0), 2.0); return base * (1.0 - 0.3 * c); }
        if (id < 10.5) { float row = floor(uv.y * 6.0); float m = max(step(fract(uv.y * 6.0), 0.12), step(fract(uv.x * 2.2 + mod(row, 2.0) * 0.5), 0.05)); return mix(base * mix(0.92, 1.05, fract(sin(dot(floor(vec2(uv.x * 2.2 + mod(row, 2.0) * 0.5, row)), vec2(12.9, 78.2))) * 4375.5)), vec3(0.9, 0.88, 0.84), m); }
        if (id < 11.5) { float g = fract(uv.y * 9.0 + sin(uv.x * 2.3) * 0.45); return base * mix(1.0, 0.9, step(0.82, g)) * mix(1.0, 0.72, step(0.95, fract(uv.x * 2.0))); }
        float kx = fract(uv.x * 14.0), ky = fract(uv.y * 10.0 + abs(kx - 0.5)); return base * mix(1.0, 0.88, step(0.6, ky));
      }
    #endif
    varying vec3 vCol; varying vec3 vN; varying vec3 vWN; varying vec3 vVP; varying vec2 vExt; varying vec3 vWP;
    #ifdef CUT
      uniform vec3 uCutMin; uniform vec3 uCutMax; uniform vec3 uCutDir; uniform float uCutOn;
      // scenery between the camera and the home is left out (a window cut through it to look in): a point outside the
      // home whose line away from the camera runs into the home's box
      bool cutOut(vec3 p) {
        if (uCutOn < 0.5) return false;
        if (all(greaterThan(p, uCutMin)) && all(lessThan(p, uCutMax))) return false;
        vec3 inv = 1.0 / uCutDir, t0 = (uCutMin - p) * inv, t1 = (uCutMax - p) * inv, lo = min(t0, t1), hi = max(t0, t1);
        float a = max(max(lo.x, lo.y), lo.z), b = min(min(hi.x, hi.y), hi.z);
        return b > max(a, 0.0);
      }
    #endif
    #ifdef ATLAS
      uniform sampler2D tAtlas; uniform vec4 uAtlas; varying float vTile; // uAtlas: columns, rows, the tile's share of its cell, the padding's share
      vec3 atlasTex(vec2 uv) {
        float c = mod(vTile, uAtlas.x), r = floor(vTile / uAtlas.x);
        vec2 inCell = uAtlas.w + fract(uv) * uAtlas.z, scale = vec2(uAtlas.z / uAtlas.x, uAtlas.z / uAtlas.y);
        vec2 auv = vec2((c + inCell.x) / uAtlas.x, (uAtlas.y - 1.0 - r + inCell.y) / uAtlas.y);
        return texture2DGradEXT(tAtlas, auv, dFdx(uv) * scale, dFdy(uv) * scale).rgb;
      }
    #endif
    #include <common>
    #include <packing>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    void main() {
      #ifdef CUT
        if (cutOut(vWP)) discard;
      #endif
      vec3 base = vCol;
      #ifdef ATLAS
        if (vTile > -0.5) base = min(vCol * atlasTex(vUv2), vec3(1.0)); // (the texture, tinted to this part's own colour)
      #endif
      #ifdef USE_TEX
        base *= min(pow(texture2D(tMap, vUv2).rgb, vec3(uTexTone.x)) * uTexTone.y, vec3(1.0));
      #endif
      #ifdef USE_TINT
        base = mix(base, base * uTint, smoothstep(0.3, 0.7, vTint)); // a white shirt dyed the kid's colour
      #endif
      float sheen = 0.0;
      #ifdef USE_PAT
        if (vPat.x > 0.5) base = finish(base, vPat.x, vPat.y, sheen);
      #endif
      vec3 N = normalize(vN);
      if (!gl_FrontFacing) N = -N;
      float sh = 1.0;
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        sh = getShadow(directionalShadowMap[0], directionalLightShadows[0].shadowMapSize, directionalLightShadows[0].shadowBias, directionalLightShadows[0].shadowRadius, vDirectionalShadowCoord[0]);
      #endif
      vec3 L = vec3(0.0, 1.0, 0.0);
      #if NUM_DIR_LIGHTS > 0
        L = directionalLights[0].direction;
      #endif
      float ndl = dot(N, L);
      float up = clamp(normalize(vWN).y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col;
      if (uPlain > 0.5) {
        // plain 3D, for comparing: smooth light and soft shadows
        col = base * (0.42 + 0.66 * max(ndl, 0.0) * sh) * mix(uGround, uSky, up);
      } else {
        float aa = fwidth(ndl) * 0.8 + 0.003;
        float lit = smoothstep(0.03 - aa, 0.03 + aa, ndl);
        float shs = smoothstep(0.68, 0.8, sh); // (a thin thing, a picket or a chair leg, only half darkens its patch of the shadow map: that still counts)
        float k = lit * shs;
        vec3 c = mix(base * uShade, base * uLit, k);
        // the thin, richer band where light turns to shade, as painted on anime cels
        float band = smoothstep(0.0, 0.07, ndl) * (1.0 - smoothstep(0.1, 0.24, ndl)) * shs;
        c = mix(c, pow(base, vec3(1.4)) * uLit * 1.06, band * 0.5);
        c *= mix(uGround, uSky, up);
        // a hard toy highlight and a rim of light
        vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
        c += smoothstep(0.955, 0.962, dot(N, H)) * k * uSpec * 0.3;
        float fr = 1.0 - clamp(N.z, 0.0, 1.0);
        c += uRimC * smoothstep(0.72, 0.75, fr) * uRim * (0.35 + 0.65 * k);
        c += base * smoothstep(0.5, 0.62, fr) * sheen * 0.45; // velvet and metal catch the light at the edges
        col = c;
      }
      #if NUM_POINT_LIGHTS > 0
        // lamps: warm pools of light in two steps, kept inside the house (or out in the garden)
        float inHouse = step(uHouse.x, vWP.x) * step(vWP.x, uHouse.z) * step(uHouse.y, vWP.z) * step(vWP.z, uHouse.w);
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) { {
          vec3 lv = pointLights[ i ].position - vVP;
          float ld = length(lv);
          float att = clamp(1.0 - ld / max(pointLights[ i ].distance, 0.001), 0.0, 1.0);
          att *= att;
          float pl = att * (0.5 + 0.5 * max(dot(N, lv / max(ld, 0.001)), 0.0)) * mix(1.0 - inHouse, inHouse, lampIn(UNROLLED_LOOP_INDEX));
          col += base * pointLights[ i ].color * (uPlain > 0.5 ? pl * 0.9 : smoothstep(0.08, 0.1, pl) * 0.26 + smoothstep(0.34, 0.36, pl) * 0.2);
        } }
        #pragma unroll_loop_end
      #endif
      col += mix(base, vec3(1.0, 0.64, 0.32), 0.55) * vExt.y * uGlow * 0.75; // glowing bulbs and shades: warm, and not glaring
      gl_FragColor = vec4(col, uOpacity);
    }`;

  // map: a painted texture multiplied in; skinning: for meshes bent by bones
  function animeMat({ side = T.FrontSide, glow = 0, spec = 1, opacity = 1, map = null, skinning = false, tone = [1, 1], tint = null, pat = false } = {}) {
    const u = Object.assign(T.UniformsUtils.merge([T.UniformsLib.lights]), PAL, { uGlow: { value: glow }, uSpec: { value: spec }, uOpacity: { value: opacity }, tMap: { value: map }, uTexTone: { value: new T.Vector2(...tone) }, uTint: { value: new T.Color(tint || '#ffffff') } });
    const m = new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, lights: true, vertexColors: !map, side, transparent: opacity < 1, defines: Object.assign(map ? { USE_TEX: 1 } : {}, tint ? { USE_TINT: 1 } : {}, pat ? { USE_PAT: 1 } : {}) });
    m.skinning = skinning;
    m.extensions = { derivatives: true };
    m.userData.anime = true;
    return m;
  }
  const BASE = animeMat({ pat: true }), BASE2 = animeMat({ side: T.DoubleSide, pat: true });

  // Glass: pale tint, two bright diagonal streaks, no ink.
  function glassMat(tint = '#bfe6ff', a = 0.32) {
    return new T.ShaderMaterial({
      uniforms: { uC: { value: col(tint) }, uA: { value: a } }, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying vec3 vW;
        void main(){ float s = fract((vW.x + vW.z) * 0.35 + vW.y * 0.5); float st = step(0.12, s) * step(s, 0.2) + step(0.26, s) * step(s, 0.29);
          gl_FragColor = vec4(mix(uC, vec3(1.0), st * 0.6), uA + st * min(0.3, uA)); }` // streaks in step with how clear the glass is, so big panes don't white out
    });
  }
  // Water in tanks, bowls and pools: stepped ripples drift on the beat.
  const WATER_U = { uT: { value: 0 } };
  function waterMat(tint = '#4fc3e8', a = 0.55) {
    return new T.ShaderMaterial({
      uniforms: Object.assign({ uC: { value: col(tint) }, uA: { value: a } }, WATER_U), transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uT; varying vec3 vW; varying vec3 vN;
        void main(){ float top = step(0.6, normalize(vN).y);
          float r = sin(vW.x * 3.1 + uT * 2.0) + sin(vW.z * 2.7 - uT * 1.6) + sin((vW.x + vW.z) * 1.9 + uT);
          float hi = step(1.6, r) * top;
          vec3 c = mix(uC * (0.8 + 0.2 * top), vec3(1.0), hi * 0.7);
          gl_FragColor = vec4(c, uA + hi * 0.3 + top * 0.1); }`
    });
  }
  // The sea, a lake, a river (the islands): Chorecast's water at the homes' scale. A sheet over the ground carries
  // each point's depth, so the shallows show the bed through them, the deep turns blue, the shore laps white, swells
  // roll in and break into churning foam that washes up the sand; ripples drift, glints and glimmer catch the sun.
  // o: { shallow, deep, clear, deepAt, foam, scale, wave: { a, k, w }, brk, flow, mud }
  const SEA_V = `attribute float depth; uniform float uT, uWave, uK, uW; varying vec3 vW; varying float vD, vCrest;
void main() {
  vD = depth; vec3 p = position; vCrest = 0.0;
  if (uWave > 0.0) {
    vec4 w0 = modelMatrix * vec4(p, 1.0);
    float ph = vD * uK - uT * uW + (sin(w0.x * 0.13) + sin(w0.z * 0.11)) * 0.6;
    float c = pow(0.5 + 0.5 * sin(ph), 3.0), grow = smoothstep(0.0, 0.3, vD) * (1.0 + 1.6 * (1.0 - smoothstep(0.4, 2.4, vD)));
    p.y += uWave * c * grow; vCrest = c * grow;
  }
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
}`;
  // The water's look (anime, but real): the body in soft bands of colour from the sandy shallows to deep blue, light
  // caustics wavering on the bed through the clear shallows, the sky's reflection with a fresnel edge, crisp sun
  // glints in drawn shapes and twinkling glimmer. At the shore, the breakwater: drawn foam lines that roll in band
  // after band and break on the sand, a bright frothy rim that wobbles along the waterline, and the wash.
  const SEA_F = `uniform float uT, uDeepAt, uFoamW, uScale, uA0, uA1, uClear, uBreak, uWave, uNight; uniform vec2 uFlow; uniform vec3 uShallow, uDeep, uSky, uSkyTop, uSun, uSunDir, uMud; varying vec3 vW; varying float vD, vCrest;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
vec2 ngrad(vec2 p) { const float e = 0.06; return vec2(noise(p + vec2(e, 0.0)) - noise(p - vec2(e, 0.0)), noise(p + vec2(0.0, e)) - noise(p - vec2(0.0, e))) / (2.0 * e); }
// caustics: bright wavy net lines (two drifting layers of folded noise)
float caustic(vec2 p, float t) { float a = abs(noise(p + vec2(t * 0.35, t * 0.2)) - 0.5), b = abs(noise(p * 1.37 - vec2(t * 0.28, -t * 0.31)) - 0.5); return smoothstep(0.07, 0.0, min(a, b)); }
void main() {
  float t = uT; vec2 p = vW.xz * uScale - uFlow * t;
  vec2 g = ngrad(p + vec2(t * 0.31, t * 0.17)) * 0.55 + ngrad(p * 2.3 + vec2(-t * 0.27, t * 0.33)) * 0.3 + ngrad(p * 5.7 + vec2(t * 0.52, -t * 0.41)) * 0.15;
  vec3 n = normalize(vec3(-g.x * 0.075, 1.0, -g.y * 0.075));
  if (uWave > 0.0) { vec3 gn = normalize(cross(dFdx(vW), dFdy(vW))); if (gn.y < 0.0) gn = -gn; n = normalize(gn + vec3(n.x, 0.0, n.z)); }
  vec3 V = normalize(cameraPosition - vW);
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  float d = max(vD, 0.0), deep0 = smoothstep(0.0, uDeepAt, d);
  // soft bands of depth colour (cel steps, blended a little so they don't look cut out)
  float deep = mix(deep0, floor(deep0 * 4.0 + 0.5) / 4.0, 0.55);
  vec3 body = mix(uShallow, uDeep, deep);
  body = mix(mix(uMud, body, 0.55 + 0.45 * uClear), body, smoothstep(0.0, uDeepAt * 0.45, d));
  // caustics on the bed, seen through the shallows
  float cs = caustic(vW.xz * 1.3 * uScale / 0.55, t) * (1.0 - smoothstep(uDeepAt * 0.1, uDeepAt * 0.6, d)) * smoothstep(0.0, uFoamW * 1.5, d) * uClear;
  body += vec3(0.9, 1.0, 0.95) * cs * 0.22 * (1.0 - uNight * 0.7);
  vec3 R = reflect(-V, n); vec3 sky = mix(uSky, uSkyTop, clamp(R.y * 1.4, 0.0, 1.0));
  vec3 col = mix(body, sky, clamp(fres * 0.85 + 0.08, 0.0, 1.0));
  vec3 H = normalize(uSunDir + V); float nh = max(dot(n, H), 0.0);
  // the sun's glint as a drawn shape (a hard edge, a soft halo), and glimmer twinkling on the ripples
  float glint = smoothstep(0.985, 0.992, nh) * 1.6 + pow(nh, 40.0) * 0.06;
  col += uSun * glint * (1.0 - uNight * 0.7);
  float gl = noise(vW.xz * 3.2 + vec2(t * 1.7, -t * 1.1)) * noise(vW.xz * 2.4 - vec2(t * 1.3, t * 0.9));
  gl = step(0.62, gl) * 0.9 * (0.2 + 0.8 * pow(nh, 14.0)) * (1.0 - uNight * 0.6);
  col += uSun * gl;
  // the breakwater: foam lines rolling in toward the shore band after band, broken up, drawn crisp
  float fw = max(uFoamW, 0.0001), zone = 1.0 - smoothstep(fw * 2.5, fw * 5.0, d), brk = noise(vW.xz * 2.2 + vec2(t * 0.4, 0.0));
  float roll = fract(d / (fw * 1.6) + t * 0.32 + brk * 0.35);
  float lines = smoothstep(0.80, 0.86, roll) * (1.0 - smoothstep(0.93, 0.99, roll)) * zone * smoothstep(0.25, 0.55, brk + 0.2);
  // the rim: a bright frothy edge right at the waterline that wobbles in and out, a darker line of wet behind it
  float edge = fw * (0.45 + 0.35 * sin(t * 1.6 + noise(vW.xz * 1.5) * 6.0));
  float rim = 1.0 - smoothstep(edge * 0.7, edge, d), behind = smoothstep(edge, edge * 1.3, d) * (1.0 - smoothstep(edge * 1.3, edge * 2.0, d));
  col = mix(col, col * 0.86, behind * 0.6);
  // breaking waves: the crest churns white as it reaches the shallows, streaky foam left behind
  float churn = uBreak * smoothstep(0.55, 0.95, vCrest) * (1.0 - smoothstep(0.3, 2.0, d)) * step(0.45, noise(vW.xz * 1.8 + vec2(t * 2.0, t * 0.7)));
  float wake = uBreak * (1.0 - smoothstep(0.0, 1.0, d)) * step(0.62, noise(vW.xz * 0.9 + vec2(t * 0.9, -t * 0.6))) * 0.5;
  float white = clamp(max(max(lines, rim), max(churn, wake)), 0.0, 1.0);
  col = mix(col, vec3(0.97, 0.99, 1.0), white);
  float a = mix(uA0, uA1, deep0);
  a = max(a, fres * 0.75 * uClear);
  a = max(a, white);
  a = max(a, min(1.0, gl + glint));
  gl_FragColor = vec4(col, a * smoothstep(-0.02, 0.06, vD));
}`;
  const SEA_U = { uNight: { value: 0 } };
  function seaMat(o = {}) {
    const wv = o.wave || {};
    const U = Object.assign({ uWave: { value: wv.a || 0 }, uK: { value: wv.k || 2.4 }, uW: { value: wv.w || 1.5 }, uBreak: { value: o.brk || 0 }, uDeepAt: { value: o.deepAt || 2.2 }, uFoamW: { value: o.foam || 0.3 }, uScale: { value: o.scale || 0.55 }, uFlow: { value: new T.Vector2(...(o.flow || [0, 0])) },
      uA0: { value: o.clear === false ? 0.62 : 0.18 }, uA1: { value: o.clear === false ? 0.95 : 0.85 }, uClear: { value: o.clear === false ? 0 : 1 },
      uShallow: { value: col(o.shallow || '#7fe3e0') }, uDeep: { value: col(o.deep || '#1a6fb8') }, uMud: { value: col(o.mud || '#c9b48a') }, uSky: { value: col('#bfe3ff') }, uSkyTop: { value: col('#5aa8ff') }, uSun: { value: col('#fff3d6') }, uSunDir: { value: new T.Vector3(-0.3, 0.8, 1).normalize() } }, WATER_U, SEA_U);
    const m = new T.ShaderMaterial({ uniforms: U, vertexShader: SEA_V, fragmentShader: SEA_F, transparent: true, depthWrite: false, side: T.DoubleSide, extensions: { derivatives: true } });
    // (its colour blends over the ground; its alpha only adds, so the ground under it stays solid for the outlines and the sky)
    m.blending = T.CustomBlending; m.blendSrc = T.SrcAlphaFactor; m.blendDst = T.OneMinusSrcAlphaFactor; m.blendSrcAlpha = T.OneFactor; m.blendDstAlpha = T.OneFactor;
    m.userData.U = U; return m;
  }
  // a sheet of water over a rectangle at height y, over ground at h(x, z) (world x, z); n: grid steps per unit
  function seaSheet(x0, z0, x1, z1, y, h, o = {}) {
    const n = o.n || 1, nx = Math.max(2, Math.round((x1 - x0) * n)), nz = Math.max(2, Math.round((z1 - z0) * n));
    const geo = new T.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2), p = geo.attributes.position, dep = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2; p.setXYZ(i, x, y, z); dep.push(y - h(x, z)); }
    geo.setAttribute('depth', new T.Float32BufferAttribute(dep, 1));
    const m = new T.Mesh(geo, seaMat(o)); m.layers.set(1); m.renderOrder = 2; m.userData.special = true; m.userData.bg = true; return m;
  }
  // Falling water (the waterfall): streaks pouring down, white where it churns, see-through at its edges. uv.y runs
  // top (1) to bottom (0).
  function fallMat(o = {}) {
    const m = new T.ShaderMaterial({ uniforms: Object.assign({ uC: { value: col(o.tint || '#bfeaff') }, uS: { value: o.speed || 1.6 }, uR: { value: o.rep || 6 } }, WATER_U), transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uC; uniform float uS, uR, uT; varying vec2 vU;
        float h(float x){ return fract(sin(x * 91.7) * 4378.5); }
        void main(){ float col = floor(vU.x * 22.0), sp = 0.7 + h(col) * 0.6, y = vU.y * uR + uT * uS * sp + h(col + 3.0) * 9.0;
          float streak = smoothstep(0.55, 0.95, fract(y)) * (0.5 + 0.5 * h(col + 7.0));
          float edge = smoothstep(0.0, 0.12, vU.x) * smoothstep(1.0, 0.88, vU.x), foot = 1.0 - smoothstep(0.0, 0.18, vU.y);
          vec3 c = mix(uC, vec3(1.0), clamp(streak * 0.8 + foot * 0.7, 0.0, 1.0));
          gl_FragColor = vec4(c, (0.55 + streak * 0.35 + foot * 0.3) * edge); }` });
    m.blending = T.CustomBlending; m.blendSrc = T.SrcAlphaFactor; m.blendDst = T.OneMinusSrcAlphaFactor; m.blendSrcAlpha = T.OneFactor; m.blendDstAlpha = T.OneFactor;
    return m;
  }
  // Sunbeams through windows and lamp halos: added light, drawn in the colour pass only (layer 1, no ink).
  const BEAM_U = { uK: { value: 1 } };
  function beamMat(tint = '#fff4d8', a = 0.22) {
    return new T.ShaderMaterial({
      uniforms: Object.assign({ uC: { value: col(tint) }, uA: { value: a } }, BEAM_U), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uK; varying vec2 vUv;
        void main(){ float e = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x); float f = pow(1.0 - vUv.y, 2.6) * smoothstep(0.0, 0.08, vUv.y); // fades away early and softly, so where it meets furniture there's no hard edge // soft at the sides, fading away to nothing along its length
          gl_FragColor = vec4(uC * uA * uK * e * f, 1.0); }`
    });
  }
  const HALO_U = { uK: { value: 0 } };
  function haloMat(tint = '#ffcf7a') {
    return new T.ShaderMaterial({
      uniforms: Object.assign({ uC: { value: col(tint) }, uOn: { value: 1 } }, { uK: HALO_U.uK }), transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uC; uniform float uK; uniform float uOn; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); a = a * a * 0.32 + step(d, 0.42) * 0.06; // a soft warm glow, not a bright disc
          gl_FragColor = vec4(uC * a * uK * uOn, 1.0); }`
    });
  }

  // Normals and part numbers, for the ink.
  const NORMAL_MAT = new T.ShaderMaterial({
    side: T.DoubleSide,
    skinning: true,
    vertexShader: `#include <common>
      #include <skinning_pars_vertex>
      attribute vec2 aExt; varying vec3 vN; varying float vId;
      void main(){ vec3 objectNormal = normal;
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        vec3 transformed = position;
        #include <skinning_vertex>
        vN = normalize(normalMatrix * objectNormal); vId = aExt.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed,1.0); }`,
    fragmentShader: `varying vec3 vN; varying float vId;
      void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n.xy * 0.5 + 0.5, vId, 1.0); }`
  });

  const NORMAL_SKIN = NORMAL_MAT.clone(); NORMAL_SKIN.skinning = true;
  // Scenery (the island, the lawn and trees, the house's walls and floors, its windows and doors) is painted like an
  // anime background: no ink. It still hides what's behind it in the normals pass, but writes "no ink here".
  const NORMAL_BG = NORMAL_MAT.clone(); NORMAL_BG.skinning = false;
  NORMAL_BG.fragmentShader = NORMAL_MAT.fragmentShader.replace('vec4(n.xy * 0.5 + 0.5, vId, 1.0)', 'vec4(n.xy * 0.5 + 0.5, vId, 0.0)');
  // a material that paints each part with its tile of a texture atlas (scenery: the street), tinted to its colour
  function atlasMat(tex, info) {
    const m = animeMat({ pat: true }); m.defines = Object.assign({}, m.defines, { ATLAS: 1 }); m.extensions = { derivatives: true, shaderTextureLOD: true };
    const S = info.tile + 2 * info.pad; m.uniforms.tAtlas = { value: tex }; m.uniforms.uAtlas = { value: new T.Vector4(info.cols, info.rows, info.tile / S, info.pad / S) };
    return m;
  }
  // The cut through scenery in front of the home (see cutOut): the same box and view direction for every material
  // that uses it, set each frame by settings.js (view).
  const CUT_U = { uCutMin: { value: new T.Vector3() }, uCutMax: { value: new T.Vector3() }, uCutDir: { value: new T.Vector3(0, -1, 0) }, uCutOn: { value: 0 } };
  const CUTS = new Map();
  function cutMat(src) {
    if (!src || !src.userData || !src.userData.anime) return src;
    if (CUTS.has(src)) return CUTS.get(src);
    const m = src.clone(); m.uniforms = Object.assign({}, src.uniforms, CUT_U); m.defines = Object.assign({}, src.defines, { CUT: 1 }); m.userData = Object.assign({}, src.userData, { cut: true });
    CUTS.set(src, m); return m;
  }
  const NORMAL_CUT = new T.ShaderMaterial({
    side: T.DoubleSide, uniforms: CUT_U, defines: { CUT: 1 },
    vertexShader: `attribute vec2 aExt; varying vec3 vN; varying float vId; varying vec3 vWP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vN = normalize(normalMatrix * normal); vId = aExt.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN; varying float vId; varying vec3 vWP;` + `
    #ifdef CUT
      uniform vec3 uCutMin; uniform vec3 uCutMax; uniform vec3 uCutDir; uniform float uCutOn;
      // scenery between the camera and the home is left out (a window cut through it to look in): a point outside the
      // home whose line away from the camera runs into the home's box
      bool cutOut(vec3 p) {
        if (uCutOn < 0.5) return false;
        if (all(greaterThan(p, uCutMin)) && all(lessThan(p, uCutMax))) return false;
        vec3 inv = 1.0 / uCutDir, t0 = (uCutMin - p) * inv, t1 = (uCutMax - p) * inv, lo = min(t0, t1), hi = max(t0, t1);
        float a = max(max(lo.x, lo.y), lo.z), b = min(min(hi.x, hi.y), hi.z);
        return b > max(a, 0.0);
      }
    #endif
` + `
      void main(){ if (cutOut(vWP)) discard; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n.xy * 0.5 + 0.5, vId, 0.0); }`
  });
  // Drawn (2D) characters write "no ink here" into the normals pass, so lines behind them don't show through.
  const MASK_MAT = new T.ShaderMaterial({
    uniforms: { map: { value: null } }, side: T.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.4) discard; gl_FragColor = vec4(0.5, 0.5, 0.0, 0.0); }'
  });
  const FINISH_FS = `
    uniform sampler2D tC; uniform sampler2D tD; uniform sampler2D tN;
    uniform vec2 uRes; uniform float uDpr; uniform float uPx; uniform float uRange; uniform float uInkOn; uniform vec3 uInk;
    uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform vec3 uCloud; uniform vec3 uCloudSh;
    uniform float uStars; uniform vec2 uSun; uniform vec3 uSunC; uniform float uT; uniform float uBg;
    uniform float uGlowT; uniform float uGlowK; uniform float uVig;
    uniform float uFilm; uniform float uNear; uniform float uFar; uniform float uFocus;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
    float puff(vec2 q, vec2 c, float s) {
      vec2 p = (q - c) / (0.1 * s);
      float d = length(p - vec2(-1.05, 0.15)) - 0.5;
      d = min(d, length(p - vec2(-0.5, 0.42)) - 0.68);
      d = min(d, length(p - vec2(0.15, 0.62)) - 0.82);
      d = min(d, length(p - vec2(0.8, 0.4)) - 0.66);
      d = min(d, length(p - vec2(1.3, 0.12)) - 0.46);
      d = min(d, length(p - vec2(-0.15, 0.1)) - 0.62);
      d = min(d, length(p - vec2(0.55, 0.05)) - 0.6);
      return max(d, -p.y) * 0.1 * s;
    }
    float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
    float cloudField(vec2 q, float asp) {
      float d = q.y - 0.07;
      for (int i = 0; i < 7; i++) {
        float fi = float(i), w = asp + 1.0;
        float x = fract(hash(vec2(fi, 1.0)) + uT * 0.0025 * (0.6 + hash(vec2(fi, 4.0)))) * w - 0.5;
        d = smin(d, puff(q, vec2(x, 0.05 + hash(vec2(fi, 5.0)) * 0.09), 1.3 + hash(vec2(fi, 9.0)) * 1.1), 0.025);
      }
      for (int i = 0; i < 3; i++) {
        float fi = float(i) + 20.0, w = asp + 0.6;
        float x = fract(hash(vec2(fi, 1.0)) + uT * 0.004 * (0.6 + hash(vec2(fi, 4.0)))) * w - 0.3;
        d = min(d, puff(q, vec2(x, 0.7 + hash(vec2(fi, 5.0)) * 0.14), 0.45 + hash(vec2(fi, 9.0)) * 0.3));
      }
      return d;
    }
    vec3 sky(vec2 uv) {
      vec3 c = uv.y > 0.5 ? mix(uMid, uTop, (uv.y - 0.5) * 2.0) : mix(uBot, uMid, uv.y * 2.0);
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      vec2 q = uv * asp;
      float d = length(q - uSun * asp);
      c += uSunC * (smoothstep(0.5, 0.0, d) * 0.2 + smoothstep(0.034, 0.03, d) * 0.7 + smoothstep(0.06, 0.035, d) * 0.12);
      if (uStars > 0.5) c -= uSunC * smoothstep(0.03, 0.026, length(q - uSun * asp - vec2(0.014, 0.01))) * 0.62;
      // cumulus: puffy tops and flat bases, a bank low down and a few small ones high up, lit on the top-left
      float m = 0.0;
      if (q.y < 0.36 || (q.y > 0.6 && q.y < 0.97)) {
        m = smoothstep(0.0015, -0.0015, cloudField(q, asp.x));
        if (m > 0.0) {
          float lit = smoothstep(0.0015, -0.0015, cloudField(q + vec2(0.01, -0.028), asp.x));
          float rim = smoothstep(-0.0015, 0.0015, cloudField(q + vec2(-0.003, 0.006), asp.x)) * lit;
          vec3 cl = mix(uCloudSh, uCloud, lit) + rim * 0.06;
          c = mix(c, cl, m * 0.97);
        }
      }
      // stars
      vec2 g = floor(uv * uRes / (3.0 * uDpr));
      float st = step(0.9965, hash(g)) * uStars * smoothstep(0.25, 0.6, uv.y) * (1.0 - m);
      c += vec3(st) * (0.6 + 0.4 * hash(g + 7.0));
      return c;
    }
    vec3 nrm(vec4 t) { vec2 xy = t.xy * 2.0 - 1.0; return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy)))); }
    void main() {
      vec4 c = texture2D(tC, vUv);
      vec3 col = c.rgb;
      vec2 o = vec2(uPx) / uRes;
      if (uInkOn > 0.5 && c.a > 0.01) {
        float d0 = texture2D(tD, vUv).r;
        vec2 o2 = o * 1.7;
        float dl = texture2D(tD, vUv - vec2(o2.x, 0.0)).r, dr = texture2D(tD, vUv + vec2(o2.x, 0.0)).r;
        float du = texture2D(tD, vUv + vec2(0.0, o2.y)).r, dd = texture2D(tD, vUv - vec2(0.0, o2.y)).r;
        float dz = (max(max(dl, dr), max(du, dd)) - d0) * uRange;
        vec4 n0 = texture2D(tN, vUv), nl = texture2D(tN, vUv - vec2(o.x, 0.0)), nu = texture2D(tN, vUv + vec2(0.0, o.y));
        float e = smoothstep(0.22, 0.4, dz) * n0.a; // (scenery writes no ink, so its silhouettes have no lines)
        vec3 N0 = nrm(n0);
        float en = max((1.0 - dot(N0, nrm(nl))) * nl.a, (1.0 - dot(N0, nrm(nu))) * nu.a);
        e = max(e, smoothstep(0.16, 0.26, en) * n0.a);
        float ei = max(step(0.002, abs(n0.b - nl.b)) * nl.a, step(0.002, abs(n0.b - nu.b)) * nu.a) * n0.a;
        e = max(e, ei * 0.92);
        col = mix(col, col * uInk, e);
      }
      // soft diffusion glow on bright things
      if (uGlowK > 0.0) {
        vec3 g = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7854 + 0.39;
          vec2 dir = vec2(cos(a), sin(a)) * uDpr / uRes;
          g += max(texture2D(tC, vUv + dir * 5.0).rgb - uGlowT, 0.0) + max(texture2D(tC, vUv + dir * 12.0).rgb - uGlowT, 0.0) * 0.7;
        }
        col += g * (uGlowK / 13.6);
      }
      // the film look (an anime background's atmosphere): haze with distance, sunlight blooming in from the sun's side
      // with soft beams through it, cool shadows and warm lights, a whisper of grain
      if (uFilm > 0.5 && uBg > 0.5 && c.a > 0.01) {
        float dist = uNear + texture2D(tD, vUv).r * (uFar - uNear);
        float haze = smoothstep(uFocus + 25.0, uFocus + 320.0, dist) * 0.62; // (past the home: it stays crisp)
        vec3 hz = mix(uBot, uMid, 0.3);
        col = mix(col, hz, haze);
        col = mix(col, mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), 0.35), haze); // (far things paler, as in air)
      }
      if (uFilm > 0.5 && uBg > 0.5) {
        vec2 asp = vec2(uRes.x / uRes.y, 1.0), q = (vUv - uSun) * asp; float r = length(q);
        float day = 1.0 - step(0.5, uStars);
        float bloom = pow(max(0.0, 1.0 - r * 0.85), 2.4) * 0.16 * day;
        float ang = atan(q.y, q.x), beams = smoothstep(0.45, 0.95, fbm(vec2(ang * 6.0, uT * 0.03))) * pow(max(0.0, 1.0 - r * 0.7), 1.6) * 0.09 * day;
        float sky0 = 1.0 - c.a; col += uSunC * (bloom * (0.35 + 0.65 * sky0) + beams * sky0); // (the beams in the sky only: over the home and the ground they read as streaks, not light)
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(lum), col, 1.08); // (a little richer)
        col += mix(vec3(0.035, 0.02, 0.07), vec3(0.03, 0.015, -0.01), smoothstep(0.25, 0.85, lum)) * (0.6 + 0.4 * day); // (lilac in the shadows, warm in the lights)
        col += (hash(vUv * uRes + fract(uT) * 91.0) - 0.5) * 0.022; // (grain)
      }
      if (uBg > 0.5) {
        if (c.a < 0.999) col += sky(vUv) * (1.0 - c.a); // the sky behind the island: its colours for the time of day, drifting clouds, the sun, stars at night
        vec2 q = vUv - 0.5;
        col *= 1.0 - uVig * dot(q, q) * 1.6;
        gl_FragColor = vec4(col, 1.0);
      } else {
        gl_FragColor = vec4(c.a > 0.001 ? col / c.a : vec3(0.0), c.a);
      }
    }`;

  // One drawing pass set: colour (+ depth), normals and parts, then the finish to the screen or a target.
  /* The speed readout (?perf=1 on the page's address): how many pictures a second are really being drawn, and
     switches that take one costly part out at a time (the grass blades, the grass layers, the ink, the shadows, half
     the pixels), so on a phone or an iPad we can see which part is slow there. "Every frame" draws all the time
     instead of 24 a second, so the count shows what the device could manage. Nothing is saved; reload to reset. */
  // (on for everyone for now, while the farm's speed is measured on phones and iPads that open the app from the home
  // screen, where there's no address bar; ?perf=0 hides it)
  const PERF_DEFAULT = true;
  const PERF = (() => { try { const a = location.search + location.hash; if (/[?&#]perf=0\b/.test(a)) return false; return PERF_DEFAULT || /[?&#]perf=1\b/.test(a); } catch (e) { return false; } })();
  if (PERF) {
    const P = IH.perf = { every: false, off: { blades: false, shells: false, ink: false, shadow: false }, res: 1, n: 0, gaps: [], cpu: 0, last: 0, calls: 0, tris: 0, px: '' };
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:calc(8px + env(safe-area-inset-left,0px));top:calc(56px + env(safe-area-inset-top,0px));z-index:99999;background:rgba(14,18,26,.86);color:#e8f0ff;font:12px/1.35 ui-monospace,Menlo,monospace;padding:8px 10px;border-radius:10px;max-width:250px;pointer-events:auto;user-select:none;-webkit-user-select:none';
    const out = document.createElement('div'), btns = document.createElement('div'); btns.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px';
    box.append(out, btns);
    const sw = [['every', 'Every frame'], ['blades', 'Blades off'], ['shells', 'Grass layers off'], ['ink', 'Ink off'], ['shadow', 'Shadows frozen'], ['res', 'Half pixels']];
    const paint = () => btns.querySelectorAll('button').forEach(b => { const k = b.dataset.k, on = k === 'every' ? P.every : k === 'res' ? P.res < 1 : P.off[k]; b.style.background = on ? '#ffd166' : '#2c3646'; b.style.color = on ? '#1a1a1a' : '#e8f0ff'; });
    for (const [k, label] of sw) { const b = document.createElement('button'); b.dataset.k = k; b.textContent = label; b.style.cssText = 'border:0;border-radius:6px;padding:5px 7px;font:inherit;cursor:pointer'; b.addEventListener('click', e => { e.stopPropagation(); if (k === 'every') P.every = !P.every; else if (k === 'res') { P.res = P.res < 1 ? 1 : 0.5; dispatchEvent(new Event('resize')); } else P.off[k] = !P.off[k]; P.gaps = []; paint(); }); btns.appendChild(b); }
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) box.addEventListener(ev, e => e.stopPropagation());
    paint();
    const show = () => { if (!document.body) return; if (!box.parentNode) document.body.appendChild(box); const g = P.gaps.slice(-120).sort((a, b) => a - b), avg = g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0, worst = g.length ? g[g.length - 1] : 0;
      out.innerHTML = `<b style="font-size:15px">${avg ? (1000 / avg).toFixed(1) : '–'} fps</b> drawn<br>${avg.toFixed(1)} ms a picture · worst ${worst.toFixed(0)} ms<br>scene ${(P.cpu).toFixed(1)} ms on the CPU<br>${P.px} · ${P.calls} draws · ${(P.tris / 1000).toFixed(0)}k tris`; };
    setInterval(show, 500);
  }
  class Pipeline {
    constructor(r) {
      this.r = r; this.w = 1; this.h = 1; this.dpr = 1; this.ink = true; this.bg = true;
      const opt = { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: false };
      this.dt = new T.DepthTexture(1, 1, T.UnsignedIntType);
      this.rtC = new T.WebGLRenderTarget(1, 1, Object.assign({ depthTexture: this.dt }, opt));
      this.rtC.texture.minFilter = T.LinearFilter; this.rtC.texture.magFilter = T.LinearFilter;
      this.rtN = new T.WebGLRenderTarget(1, 1, opt);
      this.u = {
        tC: { value: this.rtC.texture }, tD: { value: this.dt }, tN: { value: this.rtN.texture },
        uRes: { value: new T.Vector2(1, 1) }, uDpr: { value: 1 }, uPx: { value: 1 }, uRange: { value: 100 }, uInkOn: { value: 1 }, uInk: { value: new T.Vector3(0.35, 0.3, 0.42) },
        uTop: { value: col('#4f9cf0') }, uMid: { value: col('#9ccdf7') }, uBot: { value: col('#e8f5ff') }, uCloud: { value: col('#fff') }, uCloudSh: { value: col('#bccdee') },
        uStars: { value: 0 }, uSun: { value: new T.Vector2(0.8, 0.85) }, uSunC: { value: new T.Vector3(1, 1, 1) }, uT: { value: 0 }, uBg: { value: 1 },
        uGlowT: { value: 0.9 }, uGlowK: { value: 0.2 }, uVig: { value: 0.22 }, uFilm: { value: 1 }, uNear: { value: 1 }, uFar: { value: 1000 }, uFocus: { value: 90 }
      };
      this.fsScene = new T.Scene(); this.fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
      this.fsMat = new T.ShaderMaterial({ uniforms: this.u, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: FINISH_FS, depthTest: false, depthWrite: false });
      const q = new T.Mesh(g, this.fsMat); q.frustumCulled = false; this.fsScene.add(q);
    }
    setSize(w, h, dpr) {
      if (IH.perf && IH.perf.res < 1) dpr *= IH.perf.res; // (the speed readout's half-pixels test)
      this.w = w; this.h = h; this.dpr = dpr; const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
      this.rtC.setSize(W, H); this.rtN.setSize(W, H); this.u.uRes.value.set(W, H); this.u.uDpr.value = dpr; this.u.uPx.value = Math.max(1, dpr * 0.95);
    }
    phase(p) {
      const u = this.u; u.uTop.value.set(p.top); u.uMid.value.set(p.mid); u.uBot.value.set(p.bot); u.uCloud.value.set(p.cloud); u.uCloudSh.value.set(p.cloudSh);
      u.uStars.value = p.stars; u.uSun.value.set(...p.sunAt); u.uSunC.value.set(...p.sunC); u.uInk.value.set(...p.ink); u.uGlowT.value = p.glowT; u.uGlowK.value = p.glowK;
    }
    render(scene, cam, target = null) {
      const PF = IH.perf && target === null && this.bg ? IH.perf : null; // (the speed readout watches the screen's own drawing only)
      if (!PF) return this._render(scene, cam, target);
      const t0 = performance.now(), hid = [], ink = this.ink;
      if (PF.off.blades || PF.off.shells) scene.traverse(o => { const g = o.userData && o.userData.grassPart; if (g && o.visible && PF.off[g]) { o.visible = false; hid.push(o); } });
      if (PF.off.ink) this.ink = false;
      this._render(scene, cam, target, PF.off.shadow);
      this.ink = ink; hid.forEach(o => { o.visible = true; });
      PF.cpu += (performance.now() - t0 - PF.cpu) * 0.1; if (PF.last) PF.gaps.push(t0 - PF.last); if (PF.gaps.length > 240) PF.gaps.splice(0, 120); PF.last = t0;
      PF.px = `${this.rtC.width}×${this.rtC.height} px`;
    }
    _render(scene, cam, target = null, keepShadow = false) {
      const r = this.r, u = this.u;
      u.uRange.value = cam.far - cam.near; u.uNear.value = cam.near; u.uFar.value = cam.far; u.uFilm.value = this.film === false ? 0 : 1; u.uFocus.value = this.focus || 90; u.uInkOn.value = this.ink ? 1 : 0; u.uBg.value = this.bg ? 1 : 0;
      const clr = r.getClearColor(new T.Color()), ca = r.getClearAlpha();
      cam.layers.enableAll();
      if (!keepShadow) r.shadowMap.needsUpdate = true;
      r.setRenderTarget(this.rtC); r.setClearColor(0x000000, 0); r.clear(true, true, false); r.render(scene, cam);
      if (IH.perf) { IH.perf.calls = r.info.render.calls; IH.perf.tris = r.info.render.triangles; }
      if (this.ink) {
        // bone-driven meshes draw their normals with their own (skinned) pass, so the ink follows the pose
        const skinned = []; scene.traverse(o => { if (o.isSkinnedMesh && o.visible) { skinned.push([o, o.material]); o.visible = false; } });
        // characters, pets and the things in the home get ink; scenery (userData.bg) doesn't
        cam.layers.set(0); const nsw = []; scene.traverse(o => { if (o.isMesh && o.visible && !o.isSkinnedMesh) { nsw.push([o, o.material]); o.material = o.userData.bg ? (o.material.userData && o.material.userData.cut ? NORMAL_CUT : NORMAL_BG) : NORMAL_MAT; } });
        r.setRenderTarget(this.rtN); r.setClearColor(0x808000, 0); r.clear(true, true, false); r.render(scene, cam);
        for (const [o, m] of nsw) o.material = m;
        if (skinned.length) {
          const hid = []; scene.traverse(o => { if (o.isMesh && o.visible && !o.isSkinnedMesh) { hid.push(o); o.visible = false; } });
          for (const [o] of skinned) { o.visible = true; o.material = NORMAL_SKIN; }
          r.render(scene, cam);
          for (const [o, m] of skinned) o.material = m; hid.forEach(o => { o.visible = true; });
        } else for (const [o] of skinned) o.visible = true;
        // the drawn characters, as a mask
        cam.layers.set(2); const sw = [];
        scene.traverse(o => { if (o.isMesh && (o.layers.mask & 4) && o.visible && o.material.map) { const m = MASK_MAT.clone(); m.uniforms.map.value = o.material.map; sw.push([o, o.material, m]); o.material = m; } });
        if (sw.length) { r.render(scene, cam); for (const [o, mat, m] of sw) { o.material = mat; m.dispose(); } }
        cam.layers.enableAll();
      }
      r.setRenderTarget(target); r.render(this.fsScene, this.fsCam);
      r.setClearColor(clr, ca);
    }
    dispose() { this.rtC.dispose(); this.rtN.dispose(); this.dt.dispose(); this.fsMat.dispose(); }
  }

  // Frame stepping. fps 0 is smooth. beat(now) says whether this display frame starts a new drawing.
  const FRAMES = { twos: 12, threes: 8, ones: 24, smooth: 0 };
  function Beat() {
    let last = -1;
    return {
      mode: 'twos',
      beat(nowMs) {
        const fps = FRAMES[this.mode] || 0;
        if (!fps) { last = nowMs; return nowMs / 1000; }
        const i = Math.floor(nowMs / 1000 * fps);
        if (i === last) return null;
        last = i; return i / fps;
      },
      reset() { last = -1; }
    };
  }

  IH.look = { PHASES, PAL, setPhase, animeMat, atlasMat, cutMat, CUT_U, BASE, BASE2, glassMat, waterMat, seaMat, seaSheet, SEA_U, fallMat, beamMat, haloMat, WATER_U, BEAM_U, HALO_U, NORMAL_MAT, Pipeline, Beat, FRAMES };
})();
