/* Chorecast homes: the language islands (economy plan, phase 6). One for each language Chorecast teaches, in the
   style of where it comes from: a Spanish hill town (white houses, a plaza and fountain, an orange grove, olives),
   a Chinese canal water town (stone bridges, lanterns, tea terraces), a Japanese country village (rice paddies,
   a little station, wooden houses). No shrines, temples or churches.
   On each: a teacher whose short lessons are played right there (words, something to try, a quick check), and the
   island opens up as the kid learns: lesson 1 opens the market (it buys farm produce, a better price for asking in
   the language), lesson 2 the speciality shop (something for the farm found only there), lesson 3 the activity.
   The people say hello in the language, with the meaning alongside. Free to visit (Travel).
   Words are checked like every Chorecast lesson before they go live. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit || !IH.islandsBuild) return;
  const IB = IH.islandsBuild, K = IB.kit, { rng, bx, board } = K;

  // ---------- the words: [word, how it sounds (pinyin, romaji), meaning]
  const LANGS = {
    es: { island: 'spain', name: 'Spanish', tts: 'es-ES', e: '🍊', shopName: 'plant nursery',
      lessons: [
        { title: 'Hello and thank you', words: [['hola', '', 'hello'], ['adiós', '', 'goodbye'], ['por favor', '', 'please'], ['gracias', '', 'thank you']] },
        { title: 'At the market', words: [['los huevos', '', 'eggs'], ['la leche', '', 'milk'], ['las naranjas', '', 'oranges'], ['la miel', '', 'honey']] },
        { title: 'Counting', words: [['uno', '', 'one'], ['dos', '', 'two'], ['tres', '', 'three'], ['cuatro', '', 'four']] }],
      sellQ: 'I’d like to sell eggs, please.', sell: ['Quiero vender huevos, por favor.', 'Quiero vender leche, por favor.', 'Quiero vender miel, por favor.'],
      hello: ['¡Hola! (Hello!)', '¡Buenos días! (Good morning!)', '¿Qué tal? (How are you?)', '¡Gracias! (Thank you!)', '¡Adiós! (Goodbye!)'],
      signs: { school: ['ESCUELA', 'school · lessons'], market: ['MERCADO', 'market · sells your produce'], shop: ['VIVERO', 'plant nursery · saplings'] },
      special: [['orange', '🍊', 'Orange saplings', 300, 'orchard', 'The lemon trees in your orchards grow oranges instead.'], ['olive', '🫒', 'Olive saplings', 300, 'orchard', 'The feijoa trees in your orchards grow olives instead.']],
      act: { label: 'Pick oranges in the grove', goods: 'orange', n: 4, word: 'naranja = orange', pose: 'fetch', tool: 'basket' } },
    zh: { island: 'china', name: 'Chinese', tts: 'zh-CN', e: '🍵', shopName: 'tea shop',
      lessons: [
        { title: 'Hello and thank you', words: [['你好', 'nǐ hǎo', 'hello'], ['再见', 'zàijiàn', 'goodbye'], ['请', 'qǐng', 'please'], ['谢谢', 'xièxie', 'thank you']] },
        { title: 'At the market', words: [['鸡蛋', 'jīdàn', 'eggs'], ['牛奶', 'niúnǎi', 'milk'], ['茶', 'chá', 'tea'], ['蜂蜜', 'fēngmì', 'honey']] },
        { title: 'Counting', words: [['一', 'yī', 'one'], ['二', 'èr', 'two'], ['三', 'sān', 'three'], ['四', 'sì', 'four']] }],
      sellQ: 'I’d like to sell eggs.', sell: ['我想卖鸡蛋。 wǒ xiǎng mài jīdàn', '我想卖牛奶。 wǒ xiǎng mài niúnǎi', '我想卖蜂蜜。 wǒ xiǎng mài fēngmì'],
      hello: ['你好！ nǐ hǎo (Hello!)', '早上好！ zǎoshang hǎo (Good morning!)', '你好吗？ nǐ hǎo ma (How are you?)', '谢谢！ xièxie (Thank you!)', '再见！ zàijiàn (Goodbye!)'],
      signs: { school: ['学校', 'xuéxiào · school'], market: ['市场', 'shìchǎng · market'], shop: ['茶', 'chá · tea shop'] },
      special: [['tea', '🍵', 'Tea bushes', 300, 'field', 'Your field blocks can grow tea.']],
      act: { label: 'Pick tea leaves on the terraces', goods: 'tea', n: 3, word: '茶 chá = tea', pose: 'fetch', tool: 'basket' } },
    ja: { island: 'japan', name: 'Japanese', tts: 'ja-JP', e: '🌾', shopName: 'rice shop',
      lessons: [
        { title: 'Hello and thank you', words: [['こんにちは', 'konnichiwa', 'hello'], ['さようなら', 'sayōnara', 'goodbye'], ['おねがいします', 'onegaishimasu', 'please'], ['ありがとう', 'arigatō', 'thank you']] },
        { title: 'At the market', words: [['たまご', 'tamago', 'eggs'], ['ぎゅうにゅう', 'gyūnyū', 'milk'], ['おちゃ', 'ocha', 'tea'], ['はちみつ', 'hachimitsu', 'honey']] },
        { title: 'Counting', words: [['いち', 'ichi', 'one'], ['に', 'ni', 'two'], ['さん', 'san', 'three'], ['よん', 'yon', 'four']] }],
      sellQ: 'I’d like to sell eggs.', sell: ['たまごを うりたいです。 tamago o uritai desu', 'ぎゅうにゅうを うりたいです。 gyūnyū o uritai desu', 'はちみつを うりたいです。 hachimitsu o uritai desu'],
      hello: ['こんにちは！ konnichiwa (Hello!)', 'おはよう！ ohayō (Good morning!)', 'げんき？ genki? (How are you?)', 'ありがとう！ arigatō (Thank you!)', 'さようなら！ sayōnara (Goodbye!)'],
      signs: { school: ['がっこう', 'gakkō · school'], market: ['いちば', 'ichiba · market'], shop: ['こめ', 'kome · rice'] },
      special: [['rice', '🌾', 'Rice seedlings', 200, 'field', 'Your field blocks can grow rice.']],
      act: { label: 'Plant rice in the paddy', goods: 'rice', n: 3, word: 'こめ kome = rice', pose: 'fetch', tool: 'trowel' } }
  };

  // ---------- the islands
  const W = 44, D = 36;
  function house(k, solid, x, z, ry, wall, roof, door, w = 5, d = 4, h = 3.2) {
    k.at(x, 0, z, ry, kk => { bx(kk, w, h, d, 0, 0, 0, wall, { r: 0.05 }); kk.cone(Math.hypot(w, d) * 0.62, 1.1, 0, h, 0, roof, { n: 4, ry: Math.PI / 4, s: [w / d, 1, 1] }); bx(kk, 1.1, 1.9, 0.1, 0, 0, d / 2 + 0.02, door); for (const s of [-1, 1]) bx(kk, 0.9, 0.8, 0.1, s * (w / 2 - 1.1), 1.4, d / 2 + 0.02, '#8fc3e0'); });
    const c = Math.abs(Math.cos(ry)), s0 = Math.abs(Math.sin(ry)), hw = (w * c + d * s0) / 2, hd = (w * s0 + d * c) / 2; solid(x - hw, z - hd, x + hw, z + hd);
  }
  // a sign with a face each side (so it reads from wherever the camera is), on a dark board
  function sign(k, key, text, sub, x, y, z, ry) {
    k.at(x, y, z, ry, kk => { kk.box(3.6, 1.0, 0.08, 0, -0.5, 0, '#3d2a24', { r: 0.03 }); for (const f of [0, Math.PI]) kk.at(0, 0, 0, f, k2 => k2.painted(new T.PlaneGeometry(3.4, 0.9), K.signTex(key + f, text, sub, '#fff6e0', '#3d4a6a'), 0, 0, 0.05, {})); });
  }
  const front = (x, z, ry, d) => [x + Math.sin(ry) * (d / 2 + 1.6), z + Math.cos(ry) * (d / 2 + 1.6)];
  function common(code, k, solid, spots, places) {
    const L = LANGS[code], S = L.signs;
    for (const [kind, key, x, z, ry, name] of places) {
      const at = front(x, z, ry, 4); spots.push({ kind, lang: code, id: kind, name, at, yaw: ry + Math.PI, hit: [x, z, 0, 5.5] });
      if (S[key]) sign(k, `${code}-${key}`, S[key][0], S[key][1], x + Math.sin(ry) * (kind === 'lteach' ? 2.42 : 2.2), kind === 'lmarket' ? 2.9 : 2.75, z + Math.cos(ry) * (kind === 'lteach' ? 2.42 : 2.2), ry);
    }
  }
  function spain(st) {
    const R = rng(3401), k = IB.more.base(W, D, R), [sol, solid] = IB.more.solids(), spots = [], root = new T.Group();
    bx(k, 18, 0.05, 13, 22, 0.02, 17, '#eadcbd', { r: 0.03 }); bx(k, 3, 0.05, 15, 22, 0.02, 31, '#eadcbd', { r: 0.03 });
    // the fountain in the plaza
    k.cyl(2.1, 0.55, 22, 0, 17, '#d9cbb0', { n: 18 }); k.cyl(1.8, 0.06, 22, 0.5, 17, '#7fd0e8', { n: 18 }); k.cyl(0.25, 1.5, 22, 0.5, 17, '#d9cbb0', { n: 8 }); k.cyl(0.8, 0.15, 22, 1.6, 17, '#d9cbb0', { n: 12 }); solid(19.8, 14.8, 24.2, 19.2);
    // white houses with terracotta roofs and blue doors, flowers at the windows
    for (const [x, z, ry] of [[7, 5, 0], [15.5, 4.5, 0], [29, 4.5, 0], [37, 5, 0], [37, 28, Math.PI]]) { house(k, solid, x, z, ry, '#f4efe6', '#c8643c', '#2f6fb0'); for (let i = 0; i < 3; i++) k.ball(0.18, x - 1.6 + i * 1.6, 2.5, z + Math.cos(ry) * 2.15, ['#e8463e', '#ff8fb1', '#ffd34f'][i], { n: 6 }); }
    // the school, the market stall, the nursery
    house(k, solid, 9, 28, Math.PI, '#f4efe6', '#c8643c', '#2f6fb0', 7, 4.6);
    k.at(31, 0, 19, -Math.PI / 2, kk => { bx(kk, 4, 1.0, 1.6, 0, 0, 0, '#b7834f'); for (let i = 0; i < 6; i++) bx(kk, 4.2 / 6, 0.12, 2.2, -2.1 + 0.35 + i * 4.2 / 6, 2.4, 0, i % 2 ? '#ffffff' : '#d8433a', { r: 0 }); for (const s of [-1, 1]) bx(kk, 0.12, 2.4, 0.12, s * 1.9, 0, -0.7, '#7a5a3a'); for (let i = 0; i < 4; i++) kk.ball(0.22, -1.2 + i * 0.8, 1.15, 0.2, ['#ff9a2e', '#e8c45a', '#ffffff', '#d9b24a'][i], { n: 6 }); }); solid(29.9, 17, 32.1, 21);
    IB.more.shed(k, 37, 14, -Math.PI / 2, '#8fb07a', '#c8643c'); solid(35.5, 12, 38.5, 16); for (let i = 0; i < 5; i++) { k.cyl(0.3, 0.4, 33.4, 0, 11.5 + i * 1.2, '#c8643c', { n: 8 }); k.ball(0.35, 33.4, 0.65, 11.5 + i * 1.2, i % 2 ? '#5fae4a' : '#ff9a2e', { n: 7 }); }
    // the orange grove and the olives
    const fruit = []; for (const [x, z] of [[4, 13], [9, 13], [4, 19], [9, 19], [14, 24]]) { IB.more.tree(k, x, z, R, 0.75, 0, ['#3f8a3c', '#4e9e48']); solid(x - 0.5, z - 0.5, x + 0.5, z + 0.5); for (let q = 0; q < 10; q++) { const a = q / 10 * 6.28 + R(); k.ball(0.2, x + Math.cos(a) * 1.55, 1.9 + R() * 1.3, z + Math.sin(a) * 1.35, '#ff9a2e', { n: 6 }); } fruit.push([x, z]); }
    for (let i = 0; i < 5; i++) { const x = 26 + i * 3.6; IB.more.tree(k, x, 33, R, 0.6, 0, ['#8a9a7a', '#9aaa88']); solid(x - 0.4, 32.6, x + 0.4, 33.4); }
    common('es', k, solid, spots, [['lteach', 'school', 9, 28, Math.PI, 'the school'], ['lmarket', 'market', 31, 19, -Math.PI / 2, 'the market'], ['lspecial', 'shop', 37, 14, -Math.PI / 2, 'the nursery']]);
    spots.push({ kind: 'lact', lang: 'es', id: 'lact', name: 'the orange grove', at: [6.5, 16], yaw: 0, hit: [6.5, 16, 0, 9] });
    IB.more.post(k, spots, solid, 18, 33.5, 'spain');
    root.add(k.build()); IB.more.hits(root, spots);
    return { id: 'spain', title: 'Spanish town', sub: 'Language island · tap the signpost to travel', kind: 'language', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [19.5, 31.5], lawns: [[0, 0, W, D]], paths: [[13, 10.5, 31, 23.5], [20.5, 23.5, 23.5, 36]], animals: [], npc: 5, centre: [22, 18], growth: 0.4, hello: LANGS.es.hello, welcome: '¡Bienvenidos! (Welcome!) The school, the market and the nursery are round the plaza.' };
  }
  function china(st) {
    const R = rng(5507), k = IB.more.base(W, D, R), [sol, solid] = IB.more.solids(), spots = [], root = new T.Group();
    // the canal across the middle, its stone edges, two bridges over it
    bx(k, W, 0.3, 4.4, 22, -0.3, 18, '#7a8a8a'); k.waterBox(W - 0.4, 0.08, 3.6, 22, 0.03, 18, { tint: '#5fb7c9' });
    for (const z of [15.8, 20.2]) for (let x = 0.5; x < W; x += 1.2) bx(k, 1.16, 0.25, 0.4, x + 0.6, 0, z, R() < 0.5 ? '#a9a297' : '#99938a', { r: 0.04 });
    for (const bxx of [12, 32]) { for (let i = 0; i < 5; i++) { const zz = 15.2 + i * 1.4, y = Math.sin(i / 4 * Math.PI) * 0.5; bx(k, 3.6, 0.3, 1.5, bxx, y, zz, '#b9b2a5', { r: 0.05 }); } for (const s of [-1, 1]) bx(k, 0.2, 0.8, 6.4, bxx + s * 1.8, 0.2, 18, '#a9a297'); }
    solid(0, 15.6, 9.8, 20.4); solid(14.2, 15.6, 29.8, 20.4); solid(34.2, 15.6, W, 20.4);
    // white houses with dark roofs and red lanterns, along both banks
    for (const [x, z, ry] of [[6, 8, 0], [22, 7.5, 0], [38, 8, 0], [6, 27, Math.PI], [38, 27, Math.PI]]) { house(k, solid, x, z, ry, '#f2f0ea', '#3f4650', '#5a3a2a'); for (const s of [-1, 1]) { k.cyl(0.02, 0.4, x + s * 2.2, 2.6, z + Math.cos(ry) * 2.3, '#3d2a24', { n: 3 }); k.ball(0.28, x + s * 2.2, 2.45, z + Math.cos(ry) * 2.3, '#e0332f', { n: 8, s: [1, 1.25, 1] }); } }
    house(k, solid, 22, 27, Math.PI, '#f2f0ea', '#3f4650', '#5a3a2a', 7, 4.6);
    k.at(14, 0, 9, 0, kk => { bx(kk, 4, 1.0, 1.6, 0, 0, 0, '#9c4a3a'); bx(kk, 4.4, 0.12, 2.2, 0, 2.4, 0, '#d8433a'); for (const s of [-1, 1]) bx(kk, 0.12, 2.4, 0.12, s * 1.9, 0, -0.7, '#3d2a24'); for (let i = 0; i < 3; i++) kk.ball(0.25, -1 + i, 2.3, 1.1, '#e0332f', { n: 8 }); }); solid(12, 8.2, 16, 9.8);
    IB.more.shed(k, 30, 9, 0, '#e9e2d4', '#3f4650'); solid(28, 7.5, 32, 10.5);
    // the tea terraces, stepping up the back of the island
    for (let r = 0; r < 3; r++) { const z = 30.5 + r * 1.6, y = r * 0.3; bx(k, 16, 0.3 + y, 1.5, 9.5, 0, z, '#8a7452'); for (let x = 2.5; x < 17; x += 1.1) k.ball(0.5, x, 0.5 + y, z, r % 2 ? '#4e8f3c' : '#5a9a46', { s: [1, 0.7, 1], n: 7 }); } solid(1.5, 29.6, 17.5, 34.6);
    for (const x of [27, 33]) { IB.more.tree(k, x, 22.5, R, 0.7, 0, ['#7aa04a', '#8ab05a']); solid(x - 0.4, 22.1, x + 0.4, 22.9); }
    common('zh', k, solid, spots, [['lteach', 'school', 22, 27, Math.PI, 'the school'], ['lmarket', 'market', 14, 9, 0, 'the market'], ['lspecial', 'shop', 30, 9, 0, 'the tea shop']]);
    spots.push({ kind: 'lact', lang: 'zh', id: 'lact', name: 'the tea terraces', at: [9.5, 28.4], yaw: 0, hit: [9.5, 32, 0, 10] });
    IB.more.post(k, spots, solid, 41, 33.5, 'china');
    root.add(k.build()); IB.more.hits(root, spots);
    return { id: 'china', title: 'Chinese water town', sub: 'Language island · tap the signpost to travel', kind: 'language', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [40, 31], lawns: [[0, 0, W, D]], paths: [[0, 15.4, W, 20.6], [10, 11, 34, 14]], animals: [], npc: 5, centre: [22, 18], growth: 0.4, hello: LANGS.zh.hello, welcome: '欢迎！ huānyíng (Welcome!) Cross a bridge to the school; the market and the tea shop are on this side.' };
  }
  function japan(st) {
    const R = rng(7919), k = IB.more.base(W, D, R), [sol, solid] = IB.more.solids(), spots = [], root = new T.Group();
    // the little station at the front: a platform, a roof, a bench
    bx(k, 16, 0.6, 3, 22, 0, 3, '#b9b2a5', { r: 0.05 }); for (const s of [-1, 1]) bx(k, 0.2, 2.6, 0.2, 22 + s * 6, 0.6, 3.6, '#5a4a3a'); bx(k, 14, 0.15, 3.2, 22, 3.2, 3, '#4a5568'); bx(k, 3, 0.4, 0.6, 22, 0.6, 2.2, '#8a6038');
    board(k, 'ja-eki', 'えき', 'eki · station', '#fff6e0', '#3d4a6a', 3, 0.8, 22, 2.4, 4.55, 0); solid(14, 1.5, 30, 4.4);
    // four rice paddies at the back, shoots in rows, paths between
    const paddies = [[3, 21, 13, 28], [15, 21, 25, 28], [3, 29.5, 13, 34.5], [15, 29.5, 25, 34.5]];
    for (const [x0, z0, x1, z1] of paddies) { bx(k, x1 - x0 + 0.4, 0.2, z1 - z0 + 0.4, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#8a7a5a'); k.waterBox(x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, 0.12, (z0 + z1) / 2, { tint: '#7cc4c0' }); for (let x = x0 + 0.6; x < x1; x += 1.0) for (let z = z0 + 0.6; z < z1; z += 1.0) k.cone(0.05, 0.45, x, 0.15, z, '#7cbf55', { n: 3 }); solid(x0, z0, x1, z1); }
    // wooden houses with dark roofs; the school; the market; the rice shop
    for (const [x, z, ry] of [[33, 9, 0], [40, 16, -Math.PI / 2], [34, 31, Math.PI]]) house(k, solid, x, z, ry, '#c9a27a', '#4a5568', '#5a3a2a');
    house(k, solid, 8, 11, 0, '#d9b98a', '#4a5568', '#5a3a2a', 7, 4.6);
    k.at(22, 0, 12, 0, kk => { bx(kk, 4, 1.0, 1.6, 0, 0, 0, '#8a6038'); bx(kk, 4.4, 0.12, 2.2, 0, 2.4, 0, '#2f4a6a'); for (const s of [-1, 1]) bx(kk, 0.12, 2.4, 0.12, s * 1.9, 0, -0.7, '#3d2a24'); for (let i = 0; i < 4; i++) kk.box(0.5, 0.25, 0.4, -1.2 + i * 0.8, 1.0, 0.2, '#e8c45a', { r: 0.05 }); }); solid(20, 11.2, 24, 12.8);
    IB.more.shed(k, 30, 20, -Math.PI / 2, '#c9a27a', '#4a5568'); solid(28.5, 18, 31.5, 22);
    // two green hills at the back corners
    for (const [x, z, r0] of [[40, 34, 3.4], [29, 35, 2.4]]) { k.cone(r0, r0 * 1.4, x, 0, z, '#5f9a4a', { n: 10 }); k.cone(r0 * 0.35, r0 * 0.5, x, r0 * 0.95, z, '#f4f4f8', { n: 10 }); solid(x - r0 * 0.7, z - r0 * 0.7, x + r0 * 0.7, Math.min(D, z + r0 * 0.7)); }
    common('ja', k, solid, spots, [['lteach', 'school', 8, 11, 0, 'the school'], ['lmarket', 'market', 22, 12, 0, 'the market'], ['lspecial', 'shop', 30, 20, -Math.PI / 2, 'the rice shop']]);
    spots.push({ kind: 'lact', lang: 'ja', id: 'lact', name: 'the rice paddies', at: [14, 24.5], yaw: Math.PI / 2, hit: [14, 24.5, 0, 6] });
    IB.more.post(k, spots, solid, 37, 2, 'japan');
    root.add(k.build()); IB.more.hits(root, spots);
    return { id: 'japan', title: 'Japanese village', sub: 'Language island · tap the signpost to travel', kind: 'language', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [34, 5.5], lawns: [[0, 0, W, D]], paths: [[2.5, 20.5, 25.5, 35], [13, 4.5, 15, 20.5]], animals: [], npc: 4, centre: [22, 18], growth: 0.4, hello: LANGS.ja.hello, welcome: 'ようこそ！ yōkoso (Welcome!) The school, the market and the rice shop are by the station.' };
  }
  IB.LIST.push(
    { id: 'spain', name: 'Spanish town', emoji: '🍊', kind: 'language', xp: 0, about: 'A white hill town round a plaza: Spanish lessons, a market, oranges and olives.' },
    { id: 'china', name: 'Chinese water town', emoji: '🏮', kind: 'language', xp: 0, about: 'Canals, stone bridges and tea terraces: Chinese lessons, a market and tea.' },
    { id: 'japan', name: 'Japanese village', emoji: '🌾', kind: 'language', xp: 0, about: 'Rice paddies and a little station: Japanese lessons, a market and rice.' });
  IB.add('spain', spain); IB.add('china', china); IB.add('japan', japan);
  IH.langIslands = { LANGS, FREE: { spain: 1, china: 1, japan: 1 } };

  /* ---------- what there is to do (village.js adds these to its own, like the other islands') */
  IH.villageLang = c => {
    const V = () => c.V, sh = () => c.V.stage.shop, st = code => sh().isl(LANGS[code].island);
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const done = code => st(code).done || 0;
    const say = (code, words) => { if (!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(words); u.lang = LANGS[code].tts; u.rate = 0.8; speechSynthesis.speak(u); };
    const shuffle = (a, seed) => { const r = rng(seed), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    const head = (t, sub) => `<div class="vg-gh"><b>${t}</b><span>${sub || ''}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div>`;
    const word = w => `<b class="vg-lw">${esc(w[0])}</b>${w[1] ? ` <i>${esc(w[1])}</i>` : ''}`;
    // ---------- the teacher's lessons: the words (hear each), two to try, a quick check; done, ✨ 20 and the next part of the island opens
    let LS = null;
    function lesson(code, n, stage = 'learn') {
      const L = LANGS[code], x = L.lessons[n]; if (!x) return; LS = LS && LS.code === code && LS.n === n ? Object.assign(LS, { stage }) : { code, n, stage, tries: [] };
      let body = '';
      if (stage === 'learn') body = `<div class="vg-gq">${L.e} ${L.name} · lesson ${n + 1}: ${esc(x.title)}. Tap a word to hear it.</div><div class="vg-gb vg-mine">${x.words.map((w, i) => `<button data-v="lang" data-k="say:${code}:${n}:${i}">${word(w)}<small>&nbsp;${esc(w[2])}</small></button>`).join('')}</div><div class="vg-gb vg-go"><button data-v="lang" data-k="ls:${code}:${n}:try0">Next: try it</button></div>`;
      const q = i => { const w = x.words[i], opts = shuffle(x.words.map(v => v[2]), n * 31 + i + code.length), got = LS.tries[i]; return `<div class="vg-gq">What does ${word(w)} mean?</div><div class="vg-gb vg-mine">${opts.map(o => `<button data-v="lang" data-k="ans:${code}:${n}:${i}:${encodeURIComponent(o)}" class="${got == null ? '' : o === w[2] ? 'on' : o === got ? 'no' : ''}" ${got != null ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>${got != null ? `<div class="vg-gq">${got === w[2] ? '✅ Yes!' : `Not quite: it means “${esc(w[2])}”.`}</div>` : ''}`; };
      if (stage === 'try0') body = `<div class="vg-gq">Try it (1 of 2)</div>${q(0)}${LS.tries[0] != null ? `<div class="vg-gb vg-go"><button data-v="lang" data-k="ls:${code}:${n}:try1">Next</button></div>` : ''}`;
      if (stage === 'try1') body = `<div class="vg-gq">Try it (2 of 2)</div>${q(1)}${LS.tries[1] != null ? `<div class="vg-gb vg-go"><button data-v="lang" data-k="ls:${code}:${n}:check">Next: quick check</button></div>` : ''}`;
      if (stage === 'check') { const t = x.words[3], opts = shuffle(x.words.map(v => v[0]), n * 7 + 3), got = LS.check; body = `<div class="vg-gq">Quick check: which word means “${esc(t[2])}”?</div><div class="vg-gb vg-mine">${opts.map(o => `<button data-v="lang" data-k="chk:${code}:${n}:${encodeURIComponent(o)}" class="${got == null ? '' : o === t[0] ? 'on' : o === got ? 'no' : ''}" ${got != null ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>${got != null ? `<div class="vg-gq">${got === t[0] ? '✅ Right!' : `Not quite: it’s ${word(t)}.`}</div><div class="vg-gb vg-go"><button data-v="lang" data-k="fin:${code}:${n}">Finish · ✨ +20 XP</button></div>` : ''}`; }
      c.gamePanel(head(`📚 ${esc(x.title)}`, `${L.name} · ${stage === 'learn' ? '1' : stage === 'check' ? '3' : '2'} of 3`) + body);
    }
    function teacher(code) {
      const L = LANGS[code], n = done(code), opens = ['the market', 'the speciality shop', L.act.label.toLowerCase()];
      c.gamePanel(head(`🧑‍🏫 ${L.name} lessons`, `${n} of ${L.lessons.length} done`) + `<div class="vg-gq">${n < L.lessons.length ? `Your next lesson opens ${esc(opens[n])}.` : 'You’ve done all the lessons here. There’s more language practice in Chorecast.'}</div>
        <div class="vg-gb vg-mine">${L.lessons.map((x, i) => `<button data-v="lang" data-k="ls:${code}:${i}:learn" ${i > n ? 'disabled' : ''}>${i < n ? '✅' : i === n ? '▶️' : '🔒'} ${i + 1}. ${esc(x.title)}<small>&nbsp;${x.words.map(w => esc(w[0])).join(' · ')}</small></button>`).join('')}</div>`);
    }
    // ---------- the market: ask in the language for a better price (once a visit), then sell
    function market(code) {
      const L = LANGS[code], s = st(code), today = Math.floor(Date.now() / 864e5); if (done(code) < 1) return c.toast(`The market opens after your first ${L.name} lesson at the school.`);
      if (!s.visit || s.visit.day !== today) s.visit = { day: today, asked: false, bonus: false };
      if (!s.visit.asked) { const opts = shuffle(L.sell, today); return c.gamePanel(head(`🛒 ${esc(L.signs.market[0])}`, 'the market') + `<div class="vg-gq">The stallholder smiles. Ask in ${L.name}: “${esc(L.sellQ)}”</div><div class="vg-gb vg-mine">${opts.map(o => `<button data-v="lang" data-k="ask:${code}:${encodeURIComponent(o)}">${esc(o)}</button>`).join('')}</div><div class="vg-gb vg-go"><button data-v="lang" data-k="ask:${code}:skip">Just point at things</button></div>`); }
      const list = sh().produceList(), k = s.visit.bonus ? 1.1 : 1;
      c.gamePanel(head(`🛒 ${esc(L.signs.market[0])}`, s.visit.bonus ? '+10% for asking in ' + L.name : '') + `<div class="vg-gq">${list.length ? `What would you like to sell? Into your farm account, less ✨ 1 freight each to get it back home.` : 'You’ve nothing to sell right now. Bring produce from your farm.'}</div><div class="vg-gb vg-mine">${list.map(p => `<button data-v="lang" data-k="sell:${code}:${p.id}"><span class="e">${p.e}</span>${esc(p.name)} · ✨ ${Math.round(p.price * k) - 1}<small>&nbsp;you have ${p.have}</small></button>`).join('')}</div>`);
    }
    // ---------- the speciality shop: something for the farm found only here
    function special(code) {
      const L = LANGS[code], f = sh().farm() || {}, sp = f.specials || {}; if (done(code) < 2) return c.toast(`The ${L.shopName} opens after your second ${L.name} lesson.`);
      c.gamePanel(head(`${L.e} ${esc(L.signs.shop[0])}`, `✨ farm ${Math.round(sh().farmAcct().bal).toLocaleString()}`) + `<div class="vg-gb vg-mine">${L.special.map(([id, e, name, xp, needs, about]) => `<button data-v="lang" data-k="buy:${code}:${id}" ${sp[id] ? 'disabled' : ''}><span class="e">${e}</span>${esc(name)}${sp[id] ? ' ✓' : ` · ✨ ${xp}`}<small>&nbsp;${esc(about)} (Needs ${needs === 'orchard' ? 'an orchard' : 'a field'} block.)</small></button>`).join('')}</div>`);
    }
    function activity(s) {
      const L = LANGS[s.lang], A0 = L.act; if (done(s.lang) < 3) return c.toast(`Finish all three ${L.name} lessons to do this.`);
      if (!sh().daily('lact-' + s.lang, 2)) return c.toast('That’s enough for today. Come back tomorrow!');
      c.chore(s, A0.pose, 3, () => { sh().addGoods(A0.goods, A0.n); c.float(V().kid, A0.goods === 'orange' ? '🍊' : A0.goods === 'tea' ? '🍵' : '🌾'); c.sound('buy'); c.toast(`${A0.n} ${A0.goods === 'orange' ? 'oranges' : A0.goods === 'tea' ? 'bags of tea' : 'bags of rice'} onto your goods shelf! ${A0.word}`); }, null, { tool: A0.tool, fx: 'leaves' });
    }
    const acts = {
      lteach: s => [{ e: '🧑‍🏫', label: `${LANGS[s.lang].name} lessons · ${done(s.lang)} of ${LANGS[s.lang].lessons.length} done`, run: () => c.walkTo(s.at[0], s.at[1], ok => { if (ok) teacher(s.lang); }) }],
      lmarket: s => [{ e: '🛒', label: done(s.lang) < 1 ? 'The market (after lesson 1)' : 'Sell at the market', run: () => c.walkTo(s.at[0], s.at[1], ok => { if (ok) market(s.lang); }) }],
      lspecial: s => [{ e: LANGS[s.lang].e, label: done(s.lang) < 2 ? `The ${LANGS[s.lang].shopName} (after lesson 2)` : `The ${LANGS[s.lang].shopName}`, run: () => c.walkTo(s.at[0], s.at[1], ok => { if (ok) special(s.lang); }) }],
      lact: s => [{ e: '✨', label: done(s.lang) < 3 ? `${LANGS[s.lang].act.label} (after lesson 3)` : LANGS[s.lang].act.label, run: () => activity(s) }]
    };
    function click(k) {
      const p = k.split(':'), [what, code] = p, L = LANGS[code]; if (!L) return;
      if (what === 'ls') return lesson(code, +p[2], p[3]);
      if (what === 'say') { const w = L.lessons[+p[2]].words[+p[3]]; return say(code, w[0]); }
      if (what === 'ans') { const n = +p[2], i = +p[3]; LS.tries[i] = decodeURIComponent(p[4]); c.sound(LS.tries[i] === L.lessons[n].words[i][2] ? 'pop' : 'tick'); say(code, L.lessons[n].words[i][0]); return lesson(code, n, 'try' + i); }
      if (what === 'chk') { const n = +p[2]; LS.check = decodeURIComponent(p[3]); c.sound(LS.check === L.lessons[n].words[3][0] ? 'pop' : 'tick'); return lesson(code, n, 'check'); }
      if (what === 'fin') { const n = +p[2], s = st(code); if (n === done(code)) { s.done = n + 1; sh().farmSave(); sh().lessonXP(20, `${L.name}: ${L.lessons[n].title}`); c.toast(n === 0 ? `Lesson done: ✨ +20. The market’s open now!` : n === 1 ? `Lesson done: ✨ +20. The speciality shop’s open now!` : `Lesson done: ✨ +20. You can ${L.act.label.toLowerCase()} now!`); } LS = null; return teacher(code); }
      if (what === 'ask') { const s = st(code), v = decodeURIComponent(p[2]); s.visit.asked = true; s.visit.bonus = v === L.sell[0]; say(code, v === 'skip' ? '' : v.split(/[。.] /)[0]); c.toast(v === 'skip' ? 'The stallholder nods. Normal prices today.' : s.visit.bonus ? `Perfect! +10% on everything today. ${L.hello[0]}` : 'Close! The stallholder smiles. Normal prices today, try again next visit.'); sh().farmSave(); return market(code); }
      if (what === 'sell') { const s = st(code), it = sh().produceList().find(x => x.id === p[2]); if (!it) return market(code); const pr = Math.max(1, Math.round(it.price * (s.visit && s.visit.bonus ? 1.1 : 1)) - 1); if (sh().sellProduce(it.id, pr, `the ${L.name} market`)) c.toast(`Sold ${it.one}: ✨ ${pr} into your farm account.`); return market(code); }
      if (what === 'buy') { const x = L.special.find(q => q[0] === p[2]), f = sh().farm(); if (!x || !f) return; if (!(f.land || []).some(b => b.type === x[4])) return c.toast(`You need ${x[4] === 'orchard' ? 'an orchard' : 'a field'} block on your farm first (Plan → Land).`); if (!sh().farmPay(x[3], x[2].toLowerCase())) return; (f.specials = f.specials || {})[x[0]] = 1; sh().farmSave(); c.toast(`${x[1]} ${x[2]}! ${x[5]}`); return special(code); }
    }
    return { acts, click };
  };
})();
