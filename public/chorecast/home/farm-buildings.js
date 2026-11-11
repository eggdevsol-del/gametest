/* The farm's walk-in buildings (walkin.js), with what's inside them and where the kid stands to use each thing.
   Each returns the walkin building plus `at`: named places to stand ({ x, z, yaw } in the world) for the task
   series in farm.js, and `parts` (lids, doors, things on hooks) the series open, take and put back. */
(() => {
  const IH = window.IsoHome = window.IsoHome || {};
  if (!IH.walkin) return;
  const PI = Math.PI;
  const WOOD = '#b7834f', WOOD_D = '#8a6038', WOOD_L = '#d4a873', STEEL = '#a9b3bf', STEEL_D = '#7f8a97', DARK = '#2a2630', HAY = '#e8c45a', HAY_D = '#cfa944', WHITE = '#f6f1e6';
  const board = (...a) => IH.islandsBuild && IH.islandsBuild.kit && IH.islandsBuild.kit.board(...a);
  // a small square bale of hay: twine round it, a ragged top
  const bale = (k, x, y, z, ry = 0) => k.at(x, y, z, ry, kk => { kk.box(0.9, 0.42, 0.46, 0, 0, 0, HAY, { r: 0.05 }); for (const e of [-0.25, 0.25]) kk.box(0.02, 0.44, 0.48, e, -0.01, 0, '#c9a35a', { r: 0.005 }); for (let i = 0; i < 4; i++) kk.box(0.2, 0.04, 0.12, -0.3 + i * 0.2, 0.42, (i % 2 ? 0.08 : -0.1), HAY_D, { r: 0.02, ry: i * 0.6 }); });

  /* ---------- the barn: weatherboards, a sliding door on its rail, the hay loft over the back with its ladder, the
     feed bins (grain, pig nuts) with lids that lift, the hay stack under the loft, the planner board over the bins,
     the egg fridge by the door, the shop counter, the tool wall (basket, bucket, hooks), the workbench. */
  function barn(o = {}) {
    const x = o.x != null ? o.x : 12, z = o.z != null ? o.z : 6, w = 10, d = 7, H = 4.4, rise = 2.4;
    const B = IH.walkin.build({
      x, z, ry: 0, w, d, h: H, rise, clad: 'board',
      col: { wall: '#b8402f', lip: '#9c3426', lining: '#d9bf94', trim: WHITE, roof: '#5d5f66', rib: '#4b4d54', floor: '#bdb6a8', floor2: '#ada596' },
      doors: [{ side: 'f', at: 0, w: 3.4, h: 3.6 }],
      windows: [{ side: 'l', at: -1.9, w: 1.1, h: 0.8, y: 2.7 }, { side: 'l', at: 1.6, w: 1.1, h: 0.8, y: 2.7 }, { side: 'r', at: -1.9, w: 1.1, h: 0.8, y: 2.7 }, { side: 'r', at: 0.2, w: 1.1, h: 0.8, y: 2.7 }, { side: 'b', at: 3.2, w: 1.1, h: 0.8, y: 1.4 }],
      loft: { z0: -d / 2 + 0.16, z1: -1.4, y: 2.5, ladder: -0.7 },
      // the sliding doors, run open either side on their rail; the sign over the doorway
      wallDeco(k, sd, top) {
        if (sd !== 'f') return; const zf = d / 2 + 0.06, hh = Math.min(top, 3.7);
        for (const e of [-1, 1]) k.at(e * (1.7 + 0.9), 0, zf, 0, kk => {
          kk.box(1.8, hh, 0.07, 0, 0.05, 0, '#a83a2b', { r: 0.01 }); for (let y = 0.3; y < hh - 0.1; y += 0.3) kk.box(1.8, 0.03, 0.02, 0, y, 0.04, '#962f22', { r: 0.005 });
          for (const xx of [-0.85, 0.85]) kk.box(0.12, hh, 0.04, xx, 0.05, 0.05, WHITE); kk.box(1.8, 0.12, 0.04, 0, 0.05, 0.05, WHITE); if (hh > 3) { kk.box(1.8, 0.12, 0.04, 0, hh - 0.07, 0.05, WHITE); kk.box(0.12, Math.hypot(1.7, hh - 0.2), 0.04, 0, 0.1, 0.06, WHITE, { rz: e * Math.atan2(1.7, hh - 0.2) }); kk.box(0.12, 0.12, 0.05, 0, (hh - 0.1) / 2, 0.06, WHITE); }
          if (hh > 3.6) for (const xx of [-0.6, 0.6]) { kk.cyl(0.07, 0.04, xx, 3.78, -0.02, DARK, { rx: PI / 2, n: 10 }); }
        });
        if (top >= H) { k.box(7.4, 0.1, 0.12, 0, 3.82, zf - 0.02, '#3d4048', { r: 0.02 }); board(k, 'barn3', 'FARM SHOP', 'animals · feed · machines', '#fff6e0', '#b8402f', 3.0, 0.6, 0, 4.06, d / 2 + 0.03); }
      },
      // the hay door up in the front gable, its hood, the pulley and rope; a round vent at the back
      gable(k, sd, zg) {
        if (sd === 'f') {
          k.box(1.3, 1.25, 0.06, 0, H + 0.2, zg + 0.03, '#a83a2b', { r: 0.01 }); for (const [ww, hh, xx, yy] of [[1.5, 0.1, 0, H + 0.12], [1.5, 0.1, 0, H + 1.45], [0.1, 1.43, -0.7, H + 0.12], [0.1, 1.43, 0.7, H + 0.12]]) k.box(ww, hh, 0.05, xx, yy, zg + 0.06, WHITE);
          k.box(0.1, 1.6, 0.05, 0, H + 0.15, zg + 0.07, WHITE, { rz: 0.8 }); k.box(0.18, 0.18, 1.3, 0, H + rise - 0.6, zg + 0.55, WOOD_D, { r: 0.03 }); k.torus(0.1, 0.025, 0, H + rise - 0.72, zg + 1.05, DARK, { ry: PI / 2 }); k.cyl(0.012, 1.1, 0, H + 0.98, zg + 1.05, '#c9a173', { n: 4 }); k.torus(0.05, 0.012, 0, H + 0.98, zg + 1.05, STEEL_D);
        } else { k.cyl(0.36, 0.05, 0, H + 1.0, zg - 0.03, WHITE, { rx: PI / 2, n: 16 }); for (let i = -2; i <= 2; i++) k.box(0.6 - Math.abs(i) * 0.08, 0.04, 0.04, 0, H + 1.0 + i * 0.12 - 0.02, zg - 0.06, '#5a4a4a'); }
      },
      fit(k, api) {
        const ix = w / 2 - 0.16, iz = d / 2 - 0.16;
        // the feed bins against the left wall: grain and pig nuts, each with a lid on hinges at the back
        const BIN = { grain: { z: -0.45, fill: '#e8d08a', label: ['GRAIN', 'poultry'] }, nuts: { z: 0.65, fill: '#b98a5a', label: ['PIG NUTS', 'pigs'] } };
        for (const [kind, b] of Object.entries(BIN)) {
          k.box(0.86, 0.92, 1.02, -ix + 0.43, 0, b.z, WOOD, { r: 0.03 }); for (let y = 0.15; y < 0.9; y += 0.22) k.box(0.88, 0.03, 1.04, -ix + 0.43, y, b.z, WOOD_D, { r: 0.005 });
          k.box(0.6, 0.12, 0.9, -ix + 0.43, 0.78, b.z, b.fill, { r: 0.04 }); // (what's in it, seen with the lid up)
          for (const zz of [b.z - 0.5, b.z + 0.5]) k.box(0.9, 0.95, 0.04, -ix + 0.43, 0, zz, WOOD_D, { r: 0.01 });
          board(k, 'bin-' + kind, b.label[0], b.label[1], '#fff6e0', '#4a3426', 0.62, 0.28, -ix + 0.875, 0.55, b.z, PI / 2);
          api.part('lid_' + kind, -ix + 0.02, 0.93, b.z, 0, kk => { kk.box(0.9, 0.06, 1.06, 0.45, 0, 0, WOOD_L, { r: 0.02 }); kk.box(0.06, 0.04, 0.3, 0.86, 0.06, 0, WOOD_D, { r: 0.02 }); });
          api.part('scoop_' + kind, -ix + 0.43, 0.84, b.z + 0.25, 0.6, kk => { kk.cyl(0.08, 0.16, 0, 0, 0, STEEL, { n: 10, rz: PI / 2 }); kk.cyl(0.02, 0.14, 0.15, 0, 0, '#3f86b0', { n: 6, rz: PI / 2 }); });
        }
        api.solid(-ix, -1.0, -ix + 0.9, 1.2);
        // the planner board on the wall above the bins (a map of the farm pinned to it)
        k.box(0.05, 1.0, 1.7, -ix + 0.03, 1.45, 0.1, WOOD_D, { r: 0.01 }); k.box(0.03, 0.88, 1.58, -ix + 0.06, 1.51, 0.1, '#c99a62', { r: 0.005 });
        k.box(0.01, 0.6, 0.9, -ix + 0.08, 1.62, -0.05, '#f6efe0'); for (const [zz, yy, c] of [[-0.25, 1.95, '#7fbf5c'], [0.15, 1.95, '#7fbf5c'], [-0.25, 1.72, '#e8c45a'], [0.15, 1.72, '#c9a173']]) k.box(0.012, 0.18, 0.32, -ix + 0.09, yy, zz, c);
        for (const [zz, yy, c] of [[0.55, 1.95, '#ffd35a'], [0.6, 1.62, '#a8d8ff']]) k.box(0.012, 0.3, 0.3, -ix + 0.08, yy, zz, c); for (const [zz, yy] of [[-0.48, 2.2], [0.38, 2.2], [0.55, 2.22]]) k.ball(0.025, -ix + 0.1, yy, zz, '#e85a5a', { n: 6 });
        api.spot({ kind: 'fplan', id: 'plan', name: 'the planner board', at: [-ix + 1.55, 0.1], yaw: -PI / 2, hit: [-ix + 0.2, 0.1, 0, 1.6] });
        // the hay stack under the loft, back left (small square bales, three high)
        for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) for (const zz of [-iz + 0.3, -iz + 0.8]) if (!(row === 2 && i === 2)) bale(k, -ix + 0.55 + i * 0.95, row * 0.43, zz, (row + i) % 2 ? 0.04 : -0.03);
        api.solid(-ix, -iz, -ix + 2.9, -iz + 1.1);
        // the egg fridge in the front left corner: glass door (its own part, it swings), egg trays on the shelves
        k.box(0.78, 1.6, 0.78, -ix + 0.4, 0, iz - 0.42, '#f4f4f0', { r: 0.05 }); k.box(0.6, 1.3, 0.62, -ix + 0.42, 0.18, iz - 0.42, '#dfe8ee', { r: 0.02 });
        for (let i = 0; i < 3; i++) k.box(0.58, 0.02, 0.6, -ix + 0.42, 0.45 + i * 0.36, iz - 0.42, '#c9d2da');
        api.part('eggs', -ix + 0.42, 0.47, iz - 0.42, 0, kk => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { kk.box(0.25, 0.04, 0.25, -0.13 + i * 0.27, i * 0.36, -0.13 + j * 0.27, '#c9b28a', { r: 0.01 }); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) kk.ball(0.032, -0.21 + i * 0.27 + a * 0.08, i * 0.36 + 0.06, -0.21 + j * 0.27 + b * 0.08, '#fff3e0', { s: [0.85, 1.15, 0.85], n: 7 }); } });
        api.part('fridgeDoor', -ix + 0.8, 0.02, iz - 0.8, 0, kk => { kk.box(0.05, 1.54, 0.76, 0.02, 0, 0.38, '#e8e8e4', { r: 0.02 }); kk.glassBox(0.02, 1.2, 0.6, 0.05, 0.17, 0.38, { tint: '#d8eef8' }); kk.box(0.05, 0.4, 0.04, 0.07, 0.6, 0.7, STEEL_D, { r: 0.02 }); });
        board(k, 'eggsign', 'FRESH EGGS', 'from our hens', '#fff6e0', '#a0446a', 0.7, 0.3, -ix + 0.4, 1.85, iz - 0.02, PI);
        api.solid(-ix, iz - 0.82, -ix + 0.82, iz);
        // the shop counter (right, by the door): a till, scales, egg boxes for sale, a price board behind it
        k.box(0.62, 1.0, 2.2, ix - 1.6, 0, 1.75, WOOD, { r: 0.03 }); k.box(0.78, 0.06, 2.3, ix - 1.62, 1.0, 1.75, WOOD_L, { r: 0.02 }); for (let zz = 0.75; zz < 2.8; zz += 0.25) k.box(0.02, 0.86, 0.06, ix - 1.92, 0.08, zz, WOOD_D);
        k.box(0.32, 0.22, 0.3, ix - 1.55, 1.06, 2.4, DARK, { r: 0.03 }); k.box(0.26, 0.1, 0.12, ix - 1.55, 1.28, 2.32, '#8fd0ff', { r: 0.02, emit: 0.4 }); k.box(0.28, 0.06, 0.26, ix - 1.55, 1.06, 1.2, STEEL, { r: 0.02 }); k.cyl(0.13, 0.03, ix - 1.55, 1.13, 1.2, STEEL_D, { n: 12 });
        for (let i = 0; i < 3; i++) k.box(0.22, 0.08, 0.3, ix - 1.6, 1.06 + i * 0.085, 1.75, i % 2 ? '#e2d3b0' : '#d6c49c', { r: 0.01 });
        k.box(0.04, 0.9, 1.6, ix - 0.03, 1.5, 1.75, '#2f3a32', { r: 0.02 }); for (let i = 0; i < 4; i++) k.box(0.01, 0.05, 0.9 + (i % 2) * 0.3, ix - 0.06, 2.15 - i * 0.18, 1.7, '#f6f1e6');
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) k.box(0.45, 0.6, 0.32, ix - 0.35, i * 0.6, 1.0 + j * 0.45, j % 2 ? '#d9c49a' : '#c9b28a', { r: 0.06 }); // (feed sacks behind the counter)
        api.solid(ix - 1.95, 0.6, ix, 2.9);
        api.spot({ kind: 'fshop', id: 'shop', name: 'the farm shop', at: [ix - 2.6, 1.75], yaw: PI / 2, hit: [ix - 1.6, 1.75, 0, 1.8] });
        // the tool wall (right, middle): a rail of hooks with the egg basket, the feed bucket, a halter and rope
        k.box(0.04, 0.1, 1.9, ix - 0.03, 1.85, -0.35, WOOD_D); for (let i = 0; i < 5; i++) k.box(0.12, 0.05, 0.03, ix - 0.08, 1.8, -1.15 + i * 0.4, STEEL_D, { r: 0.01 });
        api.part('basket', ix - 0.24, 1.15, -0.75, PI / 2, kk => { kk.cyl(0.17, 0.16, 0, 0.0, 0, '#c9a173', { n: 12, rt: 0.2 }); for (let i = 0; i < 3; i++) kk.torus(0.185 - i * 0.004, 0.008, 0, 0.04 + i * 0.05, 0, '#a07a4a', { rx: PI / 2 }); kk.torus(0.17, 0.015, 0, 0.16, 0, '#a07a4a', { arc: PI }); });
        api.part('bucket', ix - 0.24, 1.15, -0.25, 0, kk => { kk.cyl(0.15, 0.3, 0, 0, 0, '#2f3436', { n: 12, rt: 0.18 }); kk.torus(0.18, 0.012, 0, 0.3, 0, '#2a2e30', { rx: PI / 2 }); kk.torus(0.17, 0.012, 0, 0.3, 0, STEEL_D, { arc: PI }); });
        k.torus(0.16, 0.02, ix - 0.12, 1.5, 0.25, '#c94f3a', { ry: PI / 2 }); k.cyl(0.02, 0.5, ix - 0.12, 1.0, 0.25, '#c94f3a', { n: 5 }); k.torus(0.12, 0.03, ix - 0.12, 1.55, 0.65, '#d9c49a', { ry: PI / 2 }); // (a halter and a coil of rope)
        api.solid(ix - 0.5, -1.2, ix, 0.85);
        // the workbench under the loft, back right: a vice, an oil can, a toolbox, tools on a board over it
        k.box(2.4, 0.06, 0.7, ix - 1.3, 0.9, -iz + 0.4, WOOD_L, { r: 0.02 }); for (const xx of [ix - 2.4, ix - 0.2]) for (const zz of [-iz + 0.15, -iz + 0.65]) k.box(0.08, 0.9, 0.08, xx, 0, zz, WOOD_D);
        k.box(2.4, 0.04, 0.6, ix - 1.3, 0.25, -iz + 0.4, WOOD, { r: 0.01 }); k.box(0.2, 0.16, 0.14, ix - 2.3, 0.96, -iz + 0.68, '#3f6fb5', { r: 0.02 }); k.box(0.45, 0.24, 0.24, ix - 0.8, 0.96, -iz + 0.35, '#c94f3a', { r: 0.03 }); k.cyl(0.07, 0.18, ix - 1.4, 0.96, -iz + 0.3, '#5a7a3a', { n: 10 });
        k.box(2.0, 0.9, 0.04, ix - 1.3, 1.25, -iz + 0.02, '#c99a62', { r: 0.01 }); k.box(0.5, 0.06, 0.03, ix - 1.9, 1.75, -iz + 0.06, STEEL_D); k.box(0.06, 0.32, 0.03, ix - 1.2, 1.5, -iz + 0.06, WOOD_D); k.box(0.14, 0.08, 0.04, ix - 1.2, 1.82, -iz + 0.06, STEEL_D); k.box(0.36, 0.14, 0.02, ix - 0.6, 1.6, -iz + 0.06, STEEL, { rz: 0.4 });
        api.solid(ix - 2.55, -iz, ix, -iz + 0.85);
        // up on the loft: more hay (it fades with the roof)
        api.over(kk => { for (let i = 0; i < 6; i++) for (let row = 0; row < 2; row++) if (!(row === 1 && i % 3 === 2)) bale(kk, -ix + 0.7 + i * 1.5, 2.64 + row * 0.43, -iz + 0.5 + (i % 2) * 0.55, i * 0.07); });
      }
    });
    // where the kid stands for each thing (world)
    const at = (lx, lz, yaw) => { const p = B.toW(lx, lz); return { x: p[0], z: p[1], yaw: B.yawW(yaw) }; };
    const ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    B.at = { grain: at(-ix + 1.55, -0.45, -PI / 2), nuts: at(-ix + 1.55, 0.65, -PI / 2), hay: at(-ix + 1.6, -iz + 1.65, PI), hooks: at(ix - 1.2, -0.5, PI / 2), fridge: at(-ix + 1.55, iz - 0.55, -PI / 2), door: at(0, d / 2 + 1.4, PI), inDoor: at(0, d / 2 - 1.0, 0) };
    B.lamp.intensity = 1.4;
    return B;
  }

  // ---------- shared bits for the sheds
  const atOf = B => (lx, lz, yaw) => { const p = B.toW(lx, lz); return { x: p[0], z: p[1], yaw: B.yawW(yaw) }; };
  // a shelf unit against a wall: uprights, boards, and what's on each board (fill(k, y, x0, x1))
  function shelves(k, x0, x1, z, depth, ys, face, fill) {
    const zf = z + face * depth / 2;
    for (const xx of [x0, x1]) k.box(0.05, ys[ys.length - 1] + 0.1, depth, xx, 0, z, WOOD_D, { r: 0.01 });
    for (const y of ys) { k.box(x1 - x0, 0.04, depth, (x0 + x1) / 2, y, z, WOOD_L, { r: 0.01 }); if (fill) fill(k, y + 0.04, x0 + 0.08, x1 - 0.08, z, zf); }
  }
  const jar = (k, x, y, z, c = '#ffb43a') => { k.cyl(0.055, 0.12, x, y, z, c, { n: 10 }); k.cyl(0.058, 0.03, x, y + 0.12, z, '#c98f5a', { n: 10 }); k.box(0.08, 0.05, 0.005, x, y + 0.03, z + 0.056, WHITE); };
  const crate = (k, x, y, z, fruit, ry = 0) => k.at(x, y, z, ry, kk => { kk.box(0.6, 0.3, 0.4, 0, 0, 0, WOOD_L, { r: 0.02 }); for (const yy of [0.08, 0.18]) kk.box(0.62, 0.04, 0.42, 0, yy, 0, WOOD, { r: 0.005 }); if (fruit) for (let i = 0; i < 6; i++) kk.ball(0.08, -0.2 + (i % 3) * 0.2, 0.3, -0.08 + Math.floor(i / 3) * 0.16, fruit, { n: 7 }); });
  const tap = (k, x, y, z, ry) => k.at(x, y, z, ry, kk => { kk.cyl(0.02, 0.22, 0, 0, 0, STEEL_L, { n: 6 }); kk.cyl(0.018, 0.16, 0, 0.2, 0.06, STEEL_L, { n: 6, rx: PI / 2 }); kk.box(0.06, 0.03, 0.03, 0, 0.24, 0, '#c94f3a'); });
  const STEEL_L = '#cdd5de';

  /* ---------- the milking shed (it replaces the open-air milking stand): a raised stand with its head bail and feed
     tray, the stool, the milk vat with its lid, the sink and tap, pails on hooks, a shelf of strainers and cloths */
  function milkShed(o) {
    const w = 5.6, d = 4.2, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: o.ry || 0, w, d, h: 2.7, rise: 1.1, clad: 'board',
      col: { wall: '#efe6d2', lip: '#d9ccb2', lining: '#f4efe4', trim: '#5a7a9a', roof: '#7a8a9a', rib: '#66768a', floor: '#c9c4bb', floor2: '#bab4aa' },
      doors: [{ side: 'f', at: -1.3, w: 1.8, h: 2.2 }], windows: [{ side: 'l', at: -0.6, w: 0.9, h: 0.7, y: 1.4 }, { side: 'r', at: 0.9, w: 0.9, h: 0.7, y: 1.4 }, { side: 'b', at: 0.4, w: 1.1, h: 0.7, y: 1.4 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 2) board(k, 'milkshed', 'MILKING SHED', 'goats · cows', '#fff6e0', '#3f6fb5', 1.9, 0.42, 1.2, 2.2, d / 2 + 0.03); },
      fit(k, api) {
        // the stand: a low timber deck with a ramp, the head bail (two uprights, a yoke) and the feed tray at its head
        k.box(2.1, 0.22, 1.0, -ix + 1.15, 0, -iz + 0.6, WOOD, { r: 0.02 }); for (let i = 0; i < 7; i++) k.box(0.28, 0.02, 1.02, -ix + 0.25 + i * 0.3, 0.22, -iz + 0.6, WOOD_D);
        k.box(0.7, 0.1, 1.0, -ix + 2.45, 0, -iz + 0.6, WOOD_D, { rz: 0.28, r: 0.02 });
        for (const zz of [-iz + 0.2, -iz + 1.0]) k.box(0.08, 1.4, 0.08, -ix + 0.15, 0.22, zz, STEEL_D, { r: 0.02 }); k.box(0.08, 0.08, 0.9, -ix + 0.15, 1.5, -iz + 0.6, STEEL_D); k.box(0.06, 0.8, 0.06, -ix + 0.18, 0.6, -iz + 0.5, STEEL); k.box(0.06, 0.8, 0.06, -ix + 0.18, 0.6, -iz + 0.7, STEEL);
        k.box(0.3, 0.14, 0.4, -ix + 0.0 + 0.2, 0.9, -iz + 0.6, '#3f86b0', { r: 0.03 }); k.box(0.24, 0.04, 0.34, -ix + 0.2, 1.02, -iz + 0.6, '#e8d08a');
        for (const zz of [-iz + 0.08, -iz + 1.12]) k.box(2.0, 0.06, 0.05, -ix + 1.2, 0.85, zz, STEEL_D); // (side rails)
        api.solid(-ix, -iz, -ix + 2.8, -iz + 1.15);
        api.part('stool', -ix + 1.3, 0, -iz + 1.7, 0, kk => { kk.cyl(0.18, 0.05, 0, 0.42, 0, WOOD_L, { n: 12 }); for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; kk.cyl(0.025, 0.44, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, WOOD_D, { n: 5, rx: Math.sin(a) * 0.15, rz: -Math.cos(a) * 0.15 }); } });
        // the vat: a stainless tank on legs, its lid, the outlet tap
        for (const [xx, zz] of [[ix - 1.3, -iz + 0.2], [ix - 0.2, -iz + 0.2], [ix - 1.3, -iz + 0.9], [ix - 0.2, -iz + 0.9]]) k.box(0.06, 0.4, 0.06, xx, 0, zz, STEEL_D);
        k.box(1.25, 0.75, 0.85, ix - 0.75, 0.4, -iz + 0.55, STEEL_L, { r: 0.12 }); k.box(1.27, 0.06, 0.87, ix - 0.75, 0.75, -iz + 0.55, STEEL, { r: 0.03 }); k.cyl(0.04, 0.18, ix - 1.4, 0.5, -iz + 0.55, STEEL, { n: 8, rz: PI / 2 });
        api.part('vatLid', ix - 0.75, 1.15, -iz + 0.13, 0, kk => { kk.box(0.6, 0.04, 0.8, 0, 0, 0.42, STEEL, { r: 0.02 }); kk.box(0.2, 0.04, 0.05, 0, 0.04, 0.75, STEEL_D); });
        api.solid(ix - 1.4, -iz, ix, -iz + 1.0);
        // the sink and tap on the right wall, by the door end
        k.box(0.55, 0.85, 0.9, ix - 0.28, 0, iz - 0.6, '#d6d9de', { r: 0.03 }); k.box(0.45, 0.2, 0.7, ix - 0.3, 0.68, iz - 0.6, STEEL_L, { r: 0.04 }); tap(k, ix - 0.08, 0.85, iz - 0.6, -PI / 2);
        api.solid(ix - 0.6, iz - 1.1, ix, iz - 0.1);
        // the pails on their hooks (left wall, by the door) and the shelf of strainers and cloths over them
        k.box(0.04, 0.08, 1.2, -ix + 0.03, 1.5, iz - 0.75, WOOD_D); for (let i = 0; i < 3; i++) k.box(0.1, 0.04, 0.03, -ix + 0.08, 1.45, iz - 1.2 + i * 0.4, STEEL_D);
        api.part('pail', -ix + 0.2, 1.0, iz - 0.8, 0, kk => { kk.cyl(0.15, 0.24, 0, 0, 0, '#c9ccd2', { n: 12, rt: 0.17 }); kk.torus(0.15, 0.012, 0, 0.26, 0, '#8a8f98', { arc: PI }); });
        k.cyl(0.15, 0.24, -ix + 0.2, 1.0, iz - 0.4, '#c9ccd2', { n: 12, rt: 0.17 });
        k.box(0.3, 0.03, 1.0, -ix + 0.15, 1.85, iz - 0.75, WOOD_L); k.cyl(0.12, 0.08, -ix + 0.15, 1.88, iz - 1.0, STEEL, { n: 12 }); for (let i = 0; i < 3; i++) k.box(0.22, 0.03, 0.2, -ix + 0.15, 1.88 + i * 0.03, iz - 0.5, ['#ffffff', '#e8eef4', '#ffffff'][i]);
        api.solid(-ix, iz - 1.25, -ix + 0.35, iz - 0.25);
        // a chalkboard of who gave how much
        k.box(0.03, 0.6, 0.9, -ix + 0.03, 1.2, 0.3, '#2f3a32'); for (let i = 0; i < 3; i++) k.box(0.01, 0.04, 0.6, -ix + 0.05, 1.68 - i * 0.14, 0.3, WHITE);
        api.spot({ kind: 'fitem', id: 'it' + o.item, item: o.item, t: 'milkstand', name: 'the milking shed', at: [-ix + 1.3, -iz + 1.95], yaw: PI, hit: [-ix + 1.3, -iz + 0.8, 0, 2.0] });
      }
    });
    const at = atOf(B);
    B.at = { pail: at(-ix + 1.0, iz - 0.8, -PI / 2), milk: at(-ix + 1.3, -iz + 1.95, PI), vat: at(ix - 0.75, -iz + 1.6, PI), sink: at(ix - 1.2, iz - 0.6, PI / 2), door: at(-1.3, d / 2 + 1.2, PI), stand: Object.assign(at(-ix + 1.2, -iz + 0.6, -PI / 2), { y: 0.24 }), out: at(-1.3, d / 2 + 2.6, 0) };
    B.lamp.intensity = 1.0; return B;
  }

  /* ---------- the shearing shed (it replaces the shearing stand): the board (a raised timber floor), the overhead
     drive and its handpiece, the catching pen, the slatted wool table, the wool press and its lever, wool bales */
  function shearShed(o) {
    const w = 6.4, d = 4.6, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: o.ry || 0, w, d, h: 2.8, rise: 1.3, clad: 'iron',
      col: { wall: '#b84a3a', lip: '#a3402f', lining: '#d9bf94', trim: WHITE, roof: '#8a8f98', rib: '#757a83', floor: '#b39a72', floor2: '#a88e66' },
      doors: [{ side: 'f', at: 1.4, w: 1.8, h: 2.3 }], windows: [{ side: 'l', at: 0.9, w: 0.9, h: 0.7, y: 1.4 }, { side: 'r', at: 0.6, w: 0.9, h: 0.7, y: 1.4 }, { side: 'b', at: 1.6, w: 1.1, h: 0.7, y: 1.4 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 2) board(k, 'woolshed', 'WOOLSHED', 'sheep · alpacas · llamas', '#fff6e0', '#b84a3a', 2.0, 0.44, -1.2, 2.25, d / 2 + 0.03); },
      fit(k, api) {
        // the board: smooth pale timber, worn shiny where the sheep sit
        k.box(2.8, 0.14, 1.7, 0.4, 0, -iz + 0.85, '#d8bf8e', { r: 0.02 }); for (let i = 0; i < 9; i++) k.box(0.3, 0.005, 1.7, -0.85 + i * 0.31, 0.14, -iz + 0.85, i % 2 ? '#d0b585' : '#ddc596');
        // the overhead drive: a shaft along the wall, a down tube, the handpiece hanging on it (its own part)
        k.cyl(0.04, 2.8, -1.0, 2.3, -iz + 0.35, STEEL_D, { n: 8, rz: PI / 2 }); k.box(0.18, 0.22, 0.16, 0.4, 2.15, -iz + 0.35, '#3f6fb5', { r: 0.03 }); k.cyl(0.025, 0.9, 0.4, 1.3, -iz + 0.45, DARK, { n: 6 });
        api.part('handpiece', 0.4, 1.2, -iz + 0.45, 0, kk => { kk.box(0.07, 0.24, 0.08, 0, -0.24, 0, STEEL_L, { r: 0.03 }); kk.box(0.09, 0.03, 0.09, 0, -0.27, 0, STEEL_D); });
        // the catching pen (back left): rails, a swinging gate onto the board
        for (const [x0, z0, x1, z1] of [[-ix, 0.1, -1.1, 0.1], [-1.1, -iz + 1.7, -1.1, 0.1]]) { const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0); for (const y of [0.35, 0.7, 1.05]) k.box(L, 0.08, 0.05, (x0 + x1) / 2, y, (z0 + z1) / 2, WOOD, { ry: -ang, r: 0.01 }); }
        for (const [xx, zz] of [[-ix + 0.05, 0.1], [-2.0, 0.1], [-1.1, 0.1], [-1.1, -iz + 1.7]]) k.box(0.1, 1.15, 0.1, xx, 0, zz, WOOD_D, { r: 0.02 });
        k.box(1.8, 0.04, 2.0, -ix + 0.95, 0.01, -iz + 1.1, '#e8d08a'); // (straw)
        api.solid(-ix, 0.0, -1.0, 0.2); api.solid(-1.2, -iz + 1.6, -1.0, 0.2);
        // the wool table (front left): slatted, a fleece laid out on it
        k.box(1.6, 0.06, 1.0, -ix + 0.95, 0.9, iz - 0.7, WOOD_L, { r: 0.01 }); for (let i = 0; i < 6; i++) k.box(0.05, 0.065, 1.0, -ix + 0.25 + i * 0.28, 0.9, iz - 0.7, WOOD_D);
        for (const [xx, zz] of [[-ix + 0.25, iz - 1.1], [-ix + 1.65, iz - 1.1], [-ix + 0.25, iz - 0.3], [-ix + 1.65, iz - 0.3]]) k.box(0.07, 0.9, 0.07, xx, 0, zz, WOOD_D);
        api.part('fleece', -ix + 0.95, 0.97, iz - 0.7, 0, kk => { kk.box(1.1, 0.1, 0.75, 0, 0, 0, '#f2ead8', { r: 0.05 }); for (let i = 0; i < 6; i++) kk.ball(0.13, -0.4 + (i % 3) * 0.4, 0.06, -0.2 + Math.floor(i / 3) * 0.4, '#efe4cc', { s: [1.4, 0.5, 1.2], n: 8 }); });
        api.solid(-ix, iz - 1.2, -ix + 1.75, iz - 0.2);
        // the wool press (right): a tall box, its lever arm (a part that pumps), a bale beside it, sacks
        k.box(0.85, 1.55, 0.85, ix - 0.45, 0, -0.6, WOOD, { r: 0.02 }); for (let y = 0.2; y < 1.5; y += 0.3) k.box(0.87, 0.04, 0.87, ix - 0.45, y, -0.6, WOOD_D); k.box(0.1, 0.5, 0.1, ix - 0.45, 1.55, -0.6, STEEL_D);
        api.part('lever', ix - 0.45, 2.0, -0.6, 0, kk => { kk.box(1.1, 0.06, 0.06, -0.5, 0, 0, STEEL_D, { r: 0.02 }); kk.cyl(0.04, 0.16, -1.05, -0.08, 0, DARK, { n: 6 }); });
        for (let i = 0; i < 2; i++) k.box(0.75, 0.95, 0.75, ix - 0.42, 0, 0.6 + i * 0.85, '#efe6d2', { r: 0.08 }); k.box(0.3, 0.12, 0.01, ix - 0.42, 0.55, 0.98, '#3f6fb5');
        api.solid(ix - 0.9, -1.05, ix, 1.4);
        // the shears on a hook by the board
        k.box(0.4, 0.06, 0.04, 1.5, 1.5, -iz + 0.03, WOOD_D); api.part('shears', 1.5, 1.15, -iz + 0.1, PI / 2, kk => { for (const e of [-1, 1]) { kk.box(0.03, 0.26, 0.012, 0, 0, e * 0.02, STEEL_L, { rx: e * 0.08 }); kk.torus(0.04, 0.012, 0, 0.26, e * 0.035, '#e85a5a', { ry: PI / 2 }); } });
        api.spot({ kind: 'fitem', id: 'it' + o.item, item: o.item, t: 'shearstand', name: 'the woolshed', at: [0.4, -iz + 2.3], yaw: PI, hit: [0.4, -iz + 0.9, 0, 2.2] });
      }
    });
    const at = atOf(B);
    B.at = { shears: at(1.5, -iz + 0.9, PI), pen: Object.assign(at(-ix + 1.0, -iz + 0.9, 0), {}), penGate: at(-0.4, 0.8, -PI / 2), board: Object.assign(at(0.4, -iz + 0.85, PI / 2), { y: 0.14 }), shear: at(0.4, -iz + 2.1, PI), table: at(-ix + 2.05, iz - 0.7, -PI / 2), press: at(ix - 1.6, -0.6, PI / 2), door: at(1.4, d / 2 + 1.2, PI), out: at(1.4, d / 2 + 2.6, 0) };
    B.lamp.intensity = 1.0; return B;
  }

  /* ---------- the seed & tool shed (a field block): seed shelves (packets, jars), the potting bench with seed
     trays, the hand tools on their rack (spade, fork, hoe, rake), sacks of compost */
  function seedShed(o) {
    const w = 4.6, d = 3.6, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: 0, w, d, h: 2.5, rise: 1.0, clad: 'board',
      col: { wall: '#7a9a6a', lip: '#6a8a5a', lining: '#e3d3b0', trim: '#f6efe0', roof: '#a5523f', rib: '#8e4535', floor: '#a88a62', floor2: '#9a7e58' },
      doors: [{ side: 'f', at: -0.5, w: 1.6, h: 2.1 }], windows: [{ side: 'l', at: 0, w: 0.8, h: 0.6, y: 1.3 }, { side: 'r', at: 0, w: 0.8, h: 0.6, y: 1.3 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 2) board(k, 'seedshed2', 'SEEDS & TOOLS', '', '#fff6e0', '#4a7a3a', 1.6, 0.36, 1.2, 1.9, d / 2 + 0.03); },
      fit(k, api) {
        // seed shelves along the back: packets in rows, jars of seed, a tin of labels
        const PK = ['#ff8a5a', '#7fbf5c', '#e8463e', '#ffd34f', '#b59cff', '#ff8fb1'];
        shelves(k, -ix + 0.1, 0.5, -iz + 0.18, 0.32, [0.5, 0.95, 1.4, 1.85], 1, (kk, y, a, b, z) => { let i = 0; for (let x = a; x < b - 0.05; x += 0.14) { kk.box(0.1, 0.16, 0.02, x + 0.05, y, z + 0.06, PK[i % 6]); kk.box(0.08, 0.05, 0.005, x + 0.05, y + 0.08, z + 0.075, WHITE); i++; } jar(kk, b - 0.1, y, z - 0.05, '#c9a173'); });
        api.solid(-ix, -iz, 0.6, -iz + 0.4);
        // the potting bench (right wall): trays of seedlings and an empty one, a sieve, a heap of potting mix
        k.box(0.7, 0.06, 2.0, ix - 0.35, 0.85, -0.2, WOOD_L, { r: 0.01 }); for (const zz of [-1.15, 0.75]) for (const xx of [ix - 0.65, ix - 0.08]) k.box(0.06, 0.85, 0.06, xx, 0, zz, WOOD_D);
        k.box(0.7, 0.04, 2.0, ix - 0.35, 0.25, -0.2, WOOD, { r: 0.01 }); k.ball(0.25, ix - 0.35, 0.91, 0.45, '#5a3f2c', { s: [1, 0.5, 1.3], n: 9 }); k.cyl(0.16, 0.06, ix - 0.35, 0.91, 0.05, STEEL_D, { n: 12 });
        for (const zz of [-1.0, -0.6]) { k.box(0.4, 0.08, 0.32, ix - 0.35, 0.91, zz, DARK, { r: 0.01 }); for (let i = 0; i < 6; i++) k.cone(0.04, 0.1, ix - 0.47 + (i % 3) * 0.12, 0.99, zz - 0.08 + Math.floor(i / 3) * 0.16, '#5fae4a', { n: 4 }); }
        api.part('tray', ix - 0.35, 0.91, -0.2, 0, kk => { kk.box(0.4, 0.08, 0.32, 0, 0, 0, DARK, { r: 0.01 }); kk.box(0.36, 0.03, 0.28, 0, 0.06, 0, '#5a3f2c'); });
        for (let i = 0; i < 2; i++) k.box(0.36, 0.5, 0.26, ix - 0.3, 0, 1.05 + i * 0.32, i % 2 ? '#8a6a4a' : '#7a5a3a', { r: 0.06 }); // (sacks of compost by the bench)
        api.solid(ix - 0.75, -1.25, ix, iz);
        // the tool rack (left wall): spade, fork, hoe, rake hanging handle-up
        k.box(0.04, 0.08, 1.4, -ix + 0.03, 1.6, 0.5, WOOD_D);
        // (each tool its own part: lifted off for the job, hung back after)
        const tool = (name, zz, head) => api.part(name, -ix + 0.1, 0.4, zz, 0, kk => { kk.cyl(0.02, 1.2, 0, 0, 0, '#c98f5a', { n: 6 }); kk.box(0.05, 0.12, 0.1, 0, 1.18, 0, '#c98f5a', { r: 0.02 }); head(kk); });
        tool('spade', 0.0, kk => { kk.box(0.02, 0.3, 0.2, 0, -0.27, 0, STEEL, { r: 0.01 }); kk.box(0.03, 0.03, 0.22, 0, -0.0, 0, STEEL_D); });
        tool('fork', 0.35, kk => { for (let q = 0; q < 4; q++) kk.box(0.015, 0.3, 0.015, 0, -0.28, -0.07 + q * 0.05, STEEL); kk.box(0.02, 0.04, 0.2, 0, 0, 0, STEEL); });
        tool('hoe', 0.7, kk => { kk.box(0.1, 0.02, 0.16, 0.04, 0.02, 0, STEEL, { rz: 0.4 }); });
        tool('rake', 1.05, kk => { kk.box(0.02, 0.03, 0.34, 0, 0, 0, STEEL); for (let q = 0; q < 8; q++) kk.box(0.012, 0.08, 0.012, 0, -0.07, -0.15 + q * 0.043, STEEL); });
        // the compost sack by the door (its own part: carried out and tipped)
        api.part('compost', -ix + 0.35, 0, iz - 0.35, 0.3, kk => { kk.box(0.4, 0.55, 0.28, 0, 0, 0, '#6b4a33', { r: 0.08 }); kk.box(0.42, 0.06, 0.3, 0, 0.5, 0, '#5a3f2c', { r: 0.03 }); kk.box(0.2, 0.12, 0.01, 0, 0.28, 0.145, '#7fbf5c'); });
        api.solid(-ix, iz - 0.6, -ix + 0.6, iz);
        api.solid(-ix, -0.2, -ix + 0.3, 1.3);
        api.spot({ kind: 'seedshed', id: o.id, name: 'the seed shed', at: [ix - 1.2, -0.2], yaw: PI / 2, hit: [ix - 0.5, -0.2, 0, 1.8] });
      }
    });
    const at = atOf(B); B.at = { bench: at(ix - 1.2, -0.2, PI / 2), shelf: at(-0.6, -iz + 1.1, PI), rack: at(-ix + 1.05, 0.5, -PI / 2), door: at(-0.5, d / 2 + 1.2, PI) };
    B.lamp.intensity = 0.8; return B;
  }

  /* ---------- the packing shed (an orchard block): the grading table and crates of fruit, the sink, the chopping
     bench, the stove and its jam pot (steam), shelves of jars, fruit bins, and a small honey extractor in the corner */
  function packShed(o) {
    const w = 5.6, d = 4.2, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: 0, w, d, h: 2.7, rise: 1.1, clad: 'board',
      col: { wall: '#c9b28a', lip: '#b39c76', lining: '#efe3c8', trim: '#5a4632', roof: '#7a6a5a', rib: '#665848', floor: '#c4bcae', floor2: '#b5ad9e' },
      doors: [{ side: 'f', at: -1.2, w: 1.8, h: 2.2 }], windows: [{ side: 'l', at: -0.8, w: 0.9, h: 0.7, y: 1.4 }, { side: 'r', at: 0.6, w: 0.9, h: 0.7, y: 1.4 }, { side: 'b', at: -0.2, w: 1.0, h: 0.6, y: 1.5 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 2) board(k, 'packshed', 'PACKING SHED', 'fruit · jam · honey', '#fff6e0', '#7a4a2a', 1.9, 0.42, 1.2, 2.2, d / 2 + 0.03); },
      fit(k, api) {
        // the sink (back left) and its tap
        k.box(0.8, 0.85, 0.6, -ix + 0.45, 0, -iz + 0.32, '#d6d9de', { r: 0.03 }); k.box(0.6, 0.2, 0.45, -ix + 0.45, 0.68, -iz + 0.32, STEEL_L, { r: 0.04 }); tap(k, -ix + 0.45, 0.85, -iz + 0.08, 0);
        api.solid(-ix, -iz, -ix + 0.9, -iz + 0.65);
        // the chopping bench (back, middle): a board, a knife, a bowl of cut fruit
        k.box(1.6, 0.85, 0.6, -0.6, 0, -iz + 0.32, WOOD, { r: 0.02 }); k.box(1.62, 0.05, 0.62, -0.6, 0.85, -iz + 0.32, WOOD_L, { r: 0.01 }); k.box(0.45, 0.03, 0.3, -0.7, 0.9, -iz + 0.35, '#e8d2a0', { r: 0.01 }); k.box(0.22, 0.01, 0.03, -0.55, 0.93, -iz + 0.35, STEEL_L); k.cyl(0.16, 0.08, -0.15, 0.9, -iz + 0.35, '#e8eef4', { n: 12, rt: 0.12 });
        api.solid(-1.45, -iz, 0.25, -iz + 0.65);
        // the stove (back right) and the jam pot on it (its own part: it bubbles)
        k.box(0.8, 0.85, 0.6, 1.0, 0, -iz + 0.32, '#f4f0ea', { r: 0.03 }); k.box(0.8, 0.03, 0.6, 1.0, 0.85, -iz + 0.32, DARK); for (const xx of [0.82, 1.18]) k.torus(0.1, 0.015, xx, 0.89, -iz + 0.3, '#5a5a5a', { rx: PI / 2 });
        api.part('pot', 0.82, 0.9, -iz + 0.3, 0, kk => { kk.cyl(0.16, 0.2, 0, 0, 0, STEEL, { n: 14 }); kk.cyl(0.15, 0.01, 0, 0.18, 0, '#c9354a', { n: 14 }); for (const e of [-1, 1]) kk.box(0.06, 0.03, 0.03, e * 0.19, 0.15, 0, DARK); });
        api.solid(0.55, -iz, 1.45, -iz + 0.65);
        // the jar shelves (right wall, back): jam and honey, a box of lids
        k.at(ix - 0.18, 0, -0.9, -PI / 2, kk => shelves(kk, -0.75, 0.75, 0, 0.3, [0.5, 1.0, 1.5], 1, (k3, y, a, b, z) => { let i = 0; for (let x = a; x < b; x += 0.16) jar(k3, x + 0.06, y, z, i++ % 3 === 2 ? '#f2c14e' : '#c9354a'); }));
        api.solid(ix - 0.35, -1.7, ix, -0.1);
        // the grading table (middle): crates of fruit, a scale
        k.box(1.5, 0.06, 0.8, 0.15, 0.85, 0.35, WOOD_L, { r: 0.01 }); for (const [xx, zz] of [[-0.5, 0.0], [0.8, 0.0], [-0.5, 0.7], [0.8, 0.7]]) k.box(0.07, 0.85, 0.07, xx, 0, zz, WOOD_D);
        crate(k, -0.25, 0.91, 0.35, '#e8463e'); crate(k, 0.45, 0.91, 0.35, '#ffd84a'); k.box(0.26, 0.08, 0.22, 0.15, 0.25, 0.35, STEEL);
        api.solid(-0.6, -0.1, 0.9, 0.8);
        // the fruit bins (front right) and crates stacked by them
        for (const zz of [0.9]) { k.box(1.1, 0.75, 1.0, ix - 0.6, 0, zz + 0.25, WOOD, { r: 0.03 }); for (let y = 0.15; y < 0.75; y += 0.2) k.box(1.12, 0.04, 1.02, ix - 0.6, y, zz + 0.25, WOOD_D); for (let i = 0; i < 9; i++) k.ball(0.1, ix - 0.95 + (i % 3) * 0.3, 0.72, zz + 0.0 + Math.floor(i / 3) * 0.25, '#7aa04a', { n: 7 }); }
        crate(k, ix - 0.4, 0, iz - 0.25, null, 0.1); crate(k, ix - 0.4, 0.3, iz - 0.25, '#e8463e', -0.05);
        api.solid(ix - 1.2, 0.6, ix, iz);
        // the honey corner (front left): a small hand extractor (its reel spins), an uncapping tray, a bucket of honey
        k.cyl(0.32, 0.8, -ix + 0.4, 0, 0.4, STEEL_L, { n: 16 }); k.cyl(0.33, 0.04, -ix + 0.4, 0.8, 0.4, STEEL, { n: 16 }); k.cyl(0.03, 0.1, -ix + 0.4, 0.15, 0.73, STEEL_D, { n: 6, rx: PI / 2 });
        api.part('reel', -ix + 0.4, 0.84, 0.4, 0, kk => { kk.cyl(0.02, 0.2, 0, 0, 0, STEEL_D, { n: 6 }); kk.box(0.3, 0.02, 0.03, 0.15, 0.2, 0, STEEL_D); kk.cyl(0.025, 0.1, 0.3, 0.2, 0, DARK, { n: 6 }); });
        k.box(0.6, 0.12, 0.4, -ix + 0.4, 0.0, -0.4, STEEL, { r: 0.02 }); k.cyl(0.14, 0.26, -ix + 0.4, 0, 1.15, '#f2c14e', { n: 12 });
        api.solid(-ix, -0.65, -ix + 0.8, 1.35);
        api.spot({ kind: 'press', id: o.id, name: 'the packing shed', at: [0.15, 1.3], yaw: PI, hit: [0.15, 0.35, 0, 1.8] });
        // (phase E) the secateurs by the chopping board; the orchard ladder leant on the outside of the west wall
        api.part('secateurs', -1.25, 0.9, -iz + 0.35, 0.5, kk => { for (const e of [-1, 1]) { kk.box(0.03, 0.02, 0.18, e * 0.02, 0, 0.04, STEEL_L, { ry: e * 0.12 }); kk.box(0.035, 0.03, 0.14, e * 0.03, 0, -0.1, '#c94f3a', { ry: e * 0.2, r: 0.01 }); } });
        api.part('ladder', -w / 2 - 0.35, 0, 0.3, 0, kk => { for (const e of [-0.25, 0.25]) kk.box(0.06, 3.0, 0.08, 0, 0, e, '#c9a173', { r: 0.02 }); for (let y = 0.3; y < 2.9; y += 0.32) kk.box(0.06, 0.05, 0.5, 0, y, 0, '#b08a5a', { r: 0.02 }); });
        api.solid(-w / 2 - 0.6, -0.1, -w / 2, 0.7);
      }
    });
    const at = atOf(B);
    B.parts.ladder.rotation.z = -0.22; // (leant against the wall)
    B.at = { ladder: at(-w / 2 - 1.3, 0.3, PI / 2), secateurs: at(-0.9, -iz + 1.25, PI), grade: at(0.15, 1.35, PI), sink: at(-ix + 0.8, -iz + 1.4, PI), bench: at(-0.6, -iz + 1.25, PI), stove: at(0.9, -iz + 1.25, PI), jars: at(ix - 1.0, -0.9, PI / 2), reel: at(-ix + 1.3, 0.4, -PI / 2), door: at(-1.2, d / 2 + 1.2, PI) };
    B.lamp.intensity = 1.0; return B;
  }

  /* ---------- the honey house (a bee garden): the extractor (its reel spins), the uncapping tray and knife, jar
     shelves, the smoker and hive tool on a hook, spare frames in a box */
  function honeyHouse(o) {
    const w = 4.0, d = 3.4, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: 0, w, d, h: 2.4, rise: 0.9, clad: 'board',
      col: { wall: '#f2d48a', lip: '#dcbc70', lining: '#f7ead0', trim: '#6a4a2a', roof: '#6a5a4a', rib: '#58493b', floor: '#c4bcae', floor2: '#b5ad9e' },
      doors: [{ side: 'f', at: -0.7, w: 1.6, h: 2.05 }], windows: [{ side: 'r', at: 0, w: 0.8, h: 0.6, y: 1.3 }, { side: 'b', at: 0.8, w: 0.8, h: 0.6, y: 1.3 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 2) board(k, 'honeyhouse', 'HONEY HOUSE', '', '#fff6e0', '#a06a1a', 1.3, 0.3, 0.9, 1.85, d / 2 + 0.03); },
      fit(k, api) {
        k.cyl(0.42, 0.9, 0.5, 0, -iz + 0.55, STEEL_L, { n: 18 }); k.cyl(0.43, 0.04, 0.5, 0.9, -iz + 0.55, STEEL, { n: 18 }); for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; k.box(0.05, 0.25, 0.05, 0.5 + Math.cos(a) * 0.38, 0, -iz + 0.55 + Math.sin(a) * 0.38, STEEL_D); } k.cyl(0.035, 0.12, 0.5, 0.18, -iz + 0.95, STEEL_D, { n: 6, rx: PI / 2 });
        api.part('reel', 0.5, 0.94, -iz + 0.55, 0, kk => { kk.cyl(0.025, 0.25, 0, 0, 0, STEEL_D, { n: 6 }); kk.box(0.36, 0.025, 0.04, 0.18, 0.24, 0, STEEL_D); kk.cyl(0.03, 0.12, 0.36, 0.24, 0, DARK, { n: 6 }); });
        api.solid(0.0, -iz, 1.0, -iz + 1.05);
        k.box(1.1, 0.8, 0.6, -ix + 0.6, 0, -iz + 0.32, WOOD, { r: 0.02 }); k.box(0.9, 0.1, 0.45, -ix + 0.6, 0.8, -iz + 0.32, STEEL, { r: 0.02 }); for (let i = 0; i < 3; i++) k.box(0.03, 0.4, 0.38, -ix + 0.35 + i * 0.2, 0.9, -iz + 0.32, '#f2c14e', { r: 0.005 });
        api.solid(-ix, -iz, -ix + 1.2, -iz + 0.65);
        k.at(ix - 0.18, 0, 0.2, -PI / 2, kk => shelves(kk, -0.6, 0.6, 0, 0.28, [0.5, 1.0, 1.5], 1, (k3, y, a, b, z) => { for (let x = a; x < b; x += 0.15) jar(k3, x + 0.06, y, z, '#f2c14e'); }));
        api.solid(ix - 0.35, -0.45, ix, 0.85);
        k.box(0.04, 0.06, 0.6, -ix + 0.03, 1.5, iz - 0.7, WOOD_D);
        api.part('smoker', -ix + 0.15, 1.05, iz - 0.85, 0, kk => { kk.cyl(0.09, 0.26, 0, 0, 0, STEEL_L, { n: 10 }); kk.cone(0.09, 0.1, 0, 0.26, 0, STEEL, { n: 10 }); kk.box(0.06, 0.18, 0.12, 0, 0.05, -0.12, '#8a6038', { r: 0.02 }); });
        k.box(0.04, 0.22, 0.03, -ix + 0.08, 1.1, iz - 0.5, STEEL_D);
        k.box(0.5, 0.3, 0.45, -ix + 0.3, 0, iz - 0.3, WOOD, { r: 0.02 }); for (let i = 0; i < 5; i++) k.box(0.45, 0.04, 0.02, -ix + 0.3, 0.3, iz - 0.48 + i * 0.08, WOOD_L);
        api.solid(-ix, iz - 1.1, -ix + 0.6, iz);
      }
    });
    const at = atOf(B);
    B.at = { smoker: at(-ix + 1.0, iz - 0.85, -PI / 2), uncap: at(-ix + 0.6, -iz + 1.3, PI), reel: at(0.5, -iz + 1.65, PI), jars: at(ix - 1.0, 0.2, PI / 2), door: at(-0.7, d / 2 + 1.2, PI) };
    B.lamp.intensity = 0.8; return B;
  }

  /* ---------- the stable (the Stable yard): four loose boxes along the back (half doors, hay racks, water
     buckets, straw), a wide aisle with cross-ties for grooming, the tack room at the end (saddles on racks,
     bridles, brushes, the counter where tack and horses are bought) */
  function stable(o) {
    const w = 18, d = 7, ix = w / 2 - 0.16, iz = d / 2 - 0.16, BX = [-ix, -5.3, -1.8, 1.7, 5.2];
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: 0, w, d, h: 3.2, rise: 1.6, clad: 'board',
      col: { wall: '#a8673f', lip: '#93573a', lining: '#d9bf94', trim: '#f4ecdc', roof: '#5a4a4a', rib: '#4a3c3c', floor: '#bdb6a8', floor2: '#ada596' },
      doors: [{ side: 'f', at: -3.4, w: 2.6, h: 2.8 }, { side: 'f', at: 7.0, w: 1.6, h: 2.2 }],
      windows: [{ side: 'f', at: -7.2, w: 1.0, h: 0.7, y: 1.6 }, { side: 'f', at: 0.6, w: 1.0, h: 0.7, y: 1.6 }, { side: 'f', at: 3.6, w: 1.0, h: 0.7, y: 1.6 }, { side: 'r', at: -1.0, w: 1.0, h: 0.7, y: 1.6 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top > 3) board(k, 'stable2', 'STABLES & TACK', 'horses · ponies · tack', '#fff6e0', '#7a4a2a', 3.4, 0.6, -0.8, 2.85, d / 2 + 0.03); },
      fit(k, api) {
        // the loose boxes: dividers, half doors with bars on top, straw, a hay rack and a water bucket in each
        for (let i = 0; i < 4; i++) {
          const x0 = BX[i], x1 = BX[i + 1], xm = (x0 + x1) / 2, zf = -iz + 3.0;
          if (i > 0) { k.box(0.12, 1.3, 3.0, x0, 0, -iz + 1.5, WOOD, { r: 0.01 }); for (let b = 0; b < 8; b++) k.cyl(0.015, 0.8, x0, 1.3, -iz + 0.2 + b * 0.37, DARK, { n: 4 }); }
          k.box(x1 - x0 - 1.4, 1.3, 0.12, x0 + (x1 - x0 - 1.4) / 2, 0, zf, WOOD, { r: 0.01 }); for (let b = 0; b < 6; b++) k.cyl(0.015, 0.8, x0 + 0.2 + b * 0.32, 1.3, zf, DARK, { n: 4 });
          k.box(1.2, 1.2, 0.08, x1 - 0.7, 0, zf, '#93573a', { r: 0.01 }); for (const yy of [0.1, 1.05]) k.box(1.2, 0.08, 0.1, x1 - 0.7, yy, zf, '#f4ecdc'); k.box(0.08, 1.4, 0.1, x1 - 0.7, 0.05, zf, '#f4ecdc', { rz: 0.8 }); // (the half door, shut, an X on it)
          k.box(x1 - x0 - 0.3, 0.05, 2.7, xm, 0, -iz + 1.45, '#e8d08a', { r: 0.02 }); for (let q = 0; q < 6; q++) k.box(0.3, 0.05, 0.1, xm - 0.8 + q * 0.32, 0.05, -iz + 0.5 + (q % 3) * 0.7, '#cfa944', { ry: q, r: 0.02 });
          k.box(0.8, 0.5, 0.35, xm - 0.6, 1.3, -iz + 0.2, WOOD_D, { r: 0.02 }); for (let b = 0; b < 6; b++) k.cyl(0.012, 0.5, xm - 0.95 + b * 0.14, 1.3, -iz + 0.35, DARK, { n: 4 }); k.box(0.7, 0.2, 0.25, xm - 0.6, 1.5, -iz + 0.2, HAY, { r: 0.05 });
          k.cyl(0.16, 0.28, xm + 0.6, 0.6, -iz + 0.2, '#3f86b0', { n: 12, rt: 0.18 }); k.cyl(0.15, 0.02, xm + 0.6, 0.85, -iz + 0.2, '#6fc0d8', { n: 12 });
          board(k, 'box' + i, ['Biscuit', 'Clover', 'Duke', 'Maple'][i], '', '#fff6e0', '#7a4a2a', 0.6, 0.18, xm - 0.4, 1.0, zf + 0.07);
        }
        api.solid(-ix, -iz, 5.2, -iz + 3.1);
        // the cross-ties in the aisle: two rings on the posts, ropes with clips
        for (const xx of [-4.6, -2.2]) { k.box(0.16, 2.2, 0.16, xx, 0, 0.4, WOOD_D, { r: 0.02 }); k.torus(0.06, 0.012, xx + (xx < -3 ? 0.1 : -0.1), 1.6, 0.4, STEEL_D, { ry: PI / 2 }); }
        api.solid(-4.7, 0.3, -4.5, 0.5); api.solid(-2.3, 0.3, -2.1, 0.5);
        // the tack room (the end past the boxes): a partition with its doorway, saddle racks, bridles, brushes, the counter
        for (const [z0, z1] of [[-iz, 0.6], [2.2, iz]]) k.box(0.14, 3.2, z1 - z0, 5.3, 0, (z0 + z1) / 2, '#c9a27a', { r: 0.01 });
        api.solid(5.2, -iz, 5.4, 0.6); api.solid(5.2, 2.2, 5.4, iz);
        for (let i = 0; i < 3; i++) { k.box(0.5, 0.08, 0.12, 6.2 + i * 0.95, 1.2, -iz + 0.25, WOOD_D); k.at(6.2 + i * 0.95, 1.28, -iz + 0.3, 0, kk => { kk.box(0.55, 0.12, 0.5, 0, 0, 0, ['#7a4a2a', '#5a3a22', '#8a5a3a'][i], { r: 0.08 }); kk.box(0.2, 0.18, 0.4, 0.2, 0.08, 0, ['#6a3a1a', '#4a2a16', '#7a4a2a'][i], { r: 0.06 }); kk.box(0.04, 0.5, 0.04, -0.1, -0.5, 0.2, DARK); }); }
        for (let i = 0; i < 4; i++) { k.box(0.1, 0.04, 0.03, ix - 0.05, 1.8, -1.6 + i * 0.4, STEEL_D); k.torus(0.12, 0.015, ix - 0.08, 1.55, -1.6 + i * 0.4, ['#5a3a22', '#c94f3a', '#3f6fb5', '#5a3a22'][i], { ry: PI / 2 }); }
        k.box(1.6, 0.95, 0.55, 7.0, 0, 1.0, WOOD, { r: 0.02 }); k.box(1.7, 0.05, 0.62, 7.0, 0.95, 1.0, WOOD_L, { r: 0.01 }); k.box(0.3, 0.2, 0.25, 6.5, 1.0, 1.0, DARK, { r: 0.03 });
        api.part('brush', 7.6, 1.0, 1.0, 0.3, kk => { kk.box(0.08, 0.06, 0.2, 0, 0, 0, '#8a6038', { r: 0.02 }); kk.box(0.07, 0.05, 0.18, 0, -0.05, 0, '#e8d2a0'); });
        api.part('fork', ix - 0.12, 0, 2.6, 0, kk => { kk.cyl(0.02, 1.3, 0, 0.2, 0, '#c98f5a', { n: 6, rx: 0.1 }); kk.box(0.22, 0.03, 0.03, 0, 0.2, -0.02, STEEL); for (let i = 0; i < 4; i++) kk.cyl(0.01, 0.22, -0.09 + i * 0.06, 0.0, -0.02, STEEL, { n: 4 }); });
        api.solid(6.15, 0.65, 7.85, 1.35);
        api.spot({ kind: 'tack', id: 'tack', name: 'the tack room', at: [7.0, 2.0], yaw: PI, hit: [7.0, 1.0, 0, 1.8] });
        api.spot({ kind: 'groom', id: 'groom', name: 'the cross-ties', at: [-3.4, 2.0], yaw: PI, hit: [-3.4, 0.6, 0, 2.2] });
        api.spot({ kind: 'muck', id: 'muck', name: 'the loose boxes', at: [-0.05, -iz + 3.7], yaw: PI, hit: [-0.05, -iz + 1.5, 0, 3] });
      }
    });
    const at = atOf(B);
    B.at = { brush: at(7.6, 1.8, PI), ties: Object.assign(at(-3.4, 0.4, PI / 2), {}), groom: at(-3.4, 1.6, PI), fork: at(ix - 0.9, 2.6, PI / 2), boxes: [0, 1, 2, 3].map(i => at((BX[i] + BX[i + 1]) / 2 + 0.7, -iz + 3.75, PI)), door: at(-3.4, d / 2 + 1.4, PI) };
    B.lamp.intensity = 1.6; return B;
  }

  /* ---------- the machinery shed (phase F): three open bays across the front where the machines are parked (farm.js
     sets them in, `bays`), a fuel tank in its bund, oil drums, a tyre stack, a workbench and a rack for the loader's
     tools. The tractor drives up to it to change what's on the hitch or the front loader. */
  function machShed(o) {
    const w = 14, d = 7, H = 4.2, ix = w / 2 - 0.16, iz = d / 2 - 0.16;
    const B = IH.walkin.build({
      x: o.x, z: o.z, ry: o.ry || 0, w, d, h: H, rise: 1.5, clad: 'iron',
      col: { wall: '#6a8a6e', lip: '#5a7a5e', lining: '#c9c4bb', trim: '#e8e2d4', roof: '#8a8f98', rib: '#757a83', floor: '#b4aea4', floor2: '#a49e94' },
      doors: [{ side: 'f', at: -4.55, w: 4.1, h: 3.7 }, { side: 'f', at: 0, w: 4.1, h: 3.7 }, { side: 'f', at: 4.55, w: 4.1, h: 3.7 }],
      windows: [{ side: 'b', at: -3, w: 1.4, h: 0.6, y: 2.8 }, { side: 'b', at: 3, w: 1.4, h: 0.6, y: 2.8 }],
      wallDeco(k, sd, top) { if (sd === 'f' && top >= H) board(k, 'machshed', 'MACHINERY SHED', '', '#fff6e0', '#3d5a40', 2.6, 0.4, 0, 3.95, d / 2 + 0.03); },
      fit(k, api) {
        // bay lines painted on the floor
        for (const x of [-2.275, 2.275]) k.box(0.08, 0.005, d - 0.6, x, 0.06, 0, '#f2d45a');
        // the fuel tank in its bund (back left), a hose and nozzle on its hook
        k.box(1.6, 0.25, 1.1, -ix + 0.9, 0, -iz + 0.65, '#a9a49a', { r: 0.02 }); k.cyl(0.42, 1.3, -ix + 0.9, 0.25 + 0.42 - 0.65, -iz + 0.65, '#d8433a', { n: 16, rz: PI / 2 }); k.box(0.2, 0.3, 0.2, -ix + 0.9, 1.05, -iz + 0.65, DARK, { r: 0.03 }); k.cyl(0.03, 0.9, -ix + 1.6, 0.4, -iz + 0.65, '#2a2d31', { n: 6 }); k.box(0.12, 0.2, 0.06, -ix + 1.6, 1.1, -iz + 0.7, STEEL_D, { r: 0.02 });
        api.solid(-ix, -iz, -ix + 1.75, -iz + 1.25);
        // oil drums and a tyre stack (back middle)
        for (let i = 0; i < 3; i++) { k.cyl(0.3, 0.88, -1.6 + i * 0.65, 0, -iz + 0.4, ['#3f6fb5', '#d8433a', '#3f6fb5'][i], { n: 14 }); k.cyl(0.31, 0.04, -1.6 + i * 0.65, 0.3, -iz + 0.4, '#2a2d31', { n: 14 }); }
        for (let i = 0; i < 4; i++) { k.cyl(0.45, 0.28, 0.9, i * 0.29, -iz + 0.55, '#2a2d31', { n: 16 }); k.cyl(0.25, 0.3, 0.9, i * 0.29 - 0.01, -iz + 0.55, '#3d4048', { n: 12 }); }
        api.solid(-1.95, -iz, 1.4, -iz + 1.05);
        // the workbench and tool chest (back right)
        k.box(2.0, 0.06, 0.7, ix - 1.1, 0.9, -iz + 0.4, WOOD_L, { r: 0.02 }); for (const xx of [ix - 2.0, ix - 0.2]) for (const zz of [-iz + 0.12, -iz + 0.68]) k.box(0.07, 0.9, 0.07, xx, 0, zz, WOOD_D);
        k.box(0.6, 0.9, 0.5, ix - 2.6, 0, -iz + 0.3, '#d8433a', { r: 0.03 }); for (let i = 0; i < 4; i++) k.box(0.58, 0.02, 0.01, ix - 2.6, 0.2 + i * 0.2, -iz + 0.56, '#2a2d31'); k.box(0.3, 0.2, 0.2, ix - 1.4, 0.96, -iz + 0.4, '#3f6fb5', { r: 0.03 });
        k.box(1.8, 0.8, 0.04, ix - 1.1, 1.3, -iz + 0.02, '#c99a62', { r: 0.01 }); for (let i = 0; i < 5; i++) k.box(0.05, 0.3 + (i % 2) * 0.1, 0.03, ix - 1.8 + i * 0.3, 1.5, -iz + 0.06, STEEL_D);
        api.solid(ix - 2.95, -iz, ix, -iz + 0.85);
        // the loader-tool rack (right wall): the bale spear and the bucket stood on it (shown, they're in the shed)
        k.box(0.08, 0.08, 2.4, ix - 0.04, 0.9, 0.6, DARK); for (const zz of [-0.4, 1.6]) k.box(0.6, 1.0, 0.08, ix - 0.3, 0, zz, DARK);
        api.part('rack_spear', ix - 0.45, 0.6, 1.2, -PI / 2, kk => { kk.box(1.0, 0.45, 0.08, 0, 0, 0, DARK, { r: 0.03 }); kk.cyl(0.035, 1.1, 0, 0.2 - 0.55, 0.55, STEEL_L, { n: 6, rx: PI / 2 }); });
        api.part('rack_bucket', ix - 0.6, 0.0, -0.1, -PI / 2, kk => { kk.box(1.6, 0.08, 0.8, 0, 0, 0.4, DARK, { r: 0.02 }); kk.box(1.6, 0.6, 0.08, 0, 0, 0, DARK, { r: 0.02 }); for (const e of [-1, 1]) kk.box(0.06, 0.5, 0.8, e * 0.78, 0, 0.4, DARK, { r: 0.02 }); });
        api.solid(ix - 1.05, -0.9, ix, 2.0);
        api.spot({ kind: 'machshed', id: 'machshed', name: 'the machinery shed', at: [0, d / 2 + 1.6], yaw: PI, hit: [0, 0, 0, 4] });
      }
    });
    const at = (lx, lz, yaw) => { const p = B.toW(lx, lz); return { x: p[0], z: p[1], yaw: B.yawW(yaw) }; };
    // the six places a machine is parked (two to a bay, nose out), and where the tractor stands to change over
    B.bays = []; for (const bx of [-4.55, 0, 4.55]) for (const bz of [-0.9, 1.9]) B.bays.push(at(bx, bz, 0));
    B.at = { front: at(0, d / 2 + 4.5, PI), door: at(0, d / 2 + 1.6, PI) };
    B.lamp.intensity = 1.4; return B;
  }

  IH.farmBuildings = { barn, bale, milkShed, shearShed, seedShed, packShed, honeyHouse, stable, machShed };
})();
