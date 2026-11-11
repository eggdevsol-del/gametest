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

  IH.farmBuildings = { barn, bale };
})();
