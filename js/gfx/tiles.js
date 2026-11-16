// LIFE | حياة — رسم بلاطات الأرض (Pixel Art إجرائي)
(function (L) {
  'use strict';
  const T = L.TILE;
  const R = L.rect;

  // أنواع الأرض: الحرف -> خصائص
  const GROUND = {
    G: { name: 'grass', solid: false },
    A: { name: 'sand', solid: false },
    P: { name: 'pavement', solid: false },
    D: { name: 'dirt', solid: false },
    R: { name: 'road', solid: false },
    O: { name: 'water', solid: true },
    W: { name: 'wall', solid: true },     // جدار داخلي (منزل)
    S: { name: 'shopwall', solid: true }, // جدار داخلي (متجر)
    F: { name: 'wood', solid: false },
    T: { name: 'tiles', solid: false },
    M: { name: 'mat', solid: false },
    X: { name: 'void', solid: true },
    Y: { name: 'lot', solid: false },     // أرض ترابية مهملة
    Z: { name: 'blockwall', solid: true },// جدار بلوك
    C: { name: 'concrete', solid: false },// أرضية إسمنت/بلاط قديم
    V: { name: 'flatwall', solid: true }, // جدار مقشّر
  };

  const PAL = {
    grass: ['#8fa85a', '#7b9449', '#a3b96c', '#66793b'],
    pave: ['#bdb4a4', '#a69c8b', '#cbc3b5', '#8c8272'],
    dirt: ['#c9a36b', '#b48d58', '#d9b77f', '#9c7746'],
    road: ['#55545a', '#4b4a50', '#605f66', '#3f3e44'],
    water: ['#4a9fd0', '#3f8cbd', '#7cc6ea', '#2f6e98'],
  };

  // ألوان الأرض حسب بيئة الحي
  const BIOME_PAL = {
    grass: ['#8fa85a', '#7b9449', '#a3b96c', '#66793b'],
    forest: ['#6f9a4c', '#5c8640', '#86b25e', '#4a6e33'],
    desert: ['#e3c48a', '#d1ad72', '#efd6a2', '#b8935a'],
    snow: ['#eef3f6', '#d3dfe8', '#ffffff', '#b4c6d4'],
    island: ['#9cc46a', '#86ad57', '#b3d47f', '#6e9443'],
  };
  let GP = BIOME_PAL.grass;
  function drawGrass(ctx, px, py, tx, ty, map) {
    const PG = PAL.grass;
    R(ctx, px, py, T, T, GP[0]);
    for (let i = 0; i < 9; i++) {
      const r1 = L.hash(tx, ty, i * 3 + 1), r2 = L.hash(tx, ty, i * 3 + 2), r3 = L.hash(tx, ty, i * 3 + 3);
      const x = px + Math.floor(r1 * 15), y = py + Math.floor(r2 * 14);
      if (r3 < 0.5) { R(ctx, x, y, 1, 2, GP[1]); }
      else if (r3 < 0.8) { R(ctx, x, y, 1, 1, GP[2]); R(ctx, x + 1, y + 1, 1, 1, GP[1]); }
      else { R(ctx, x, y + 1, 1, 1, GP[3]); }
    }
    const f = L.hash(tx, ty, 99);
    if (f < (GP === BIOME_PAL.desert || GP === BIOME_PAL.snow ? 0 : 0.06)) { // زهرة صغيرة
      const fx = px + 4 + Math.floor(L.hash(tx, ty, 7) * 8), fy = py + 4 + Math.floor(L.hash(tx, ty, 8) * 8);
      const col = ['#fff4d6', '#ffd447', '#f59fb7'][Math.floor(L.hash(tx, ty, 9) * 3)];
      R(ctx, fx, fy - 1, 1, 1, col); R(ctx, fx - 1, fy, 1, 1, col); R(ctx, fx + 1, fy, 1, 1, col);
      R(ctx, fx, fy + 1, 1, 1, col); R(ctx, fx, fy, 1, 1, '#f0a020');
    }
  }

  function drawPave(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, PAL.pave[0]);
    // بلاطات حجرية 8x8
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const x = px + sx * 8, y = py + sy * 8;
      R(ctx, x, y, 8, 1, PAL.pave[2]);
      R(ctx, x, y, 1, 8, PAL.pave[2]);
      R(ctx, x, y + 7, 8, 1, PAL.pave[1]);
      R(ctx, x + 7, y, 1, 8, PAL.pave[1]);
      if (L.hash(tx * 2 + sx, ty * 2 + sy, 5) < 0.15) R(ctx, x + 3, y + 3, 2, 1, PAL.pave[1]);
      if (L.hash(tx * 2 + sx, ty * 2 + sy, 6) < 0.1) { R(ctx, x + 1, y + 1, 6, 6, PAL.pave[3]); R(ctx, x + 2, y + 2, 4, 4, PAL.pave[1]); }
    }
    const lit = L.hash(tx, ty, 41);
    if (lit < 0.06) { R(ctx, px + 9, py + 5, 3, 2, '#e8e2d2'); R(ctx, px + 9, py + 7, 3, 1, '#b9b1a0'); }
    else if (lit < 0.09) { R(ctx, px + 4, py + 10, 2, 1, '#c8553f'); R(ctx, px + 6, py + 10, 1, 1, '#e6c9a0'); }
  }

  function drawDirt(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, PAL.dirt[0]);
    for (let i = 0; i < 7; i++) {
      const x = px + Math.floor(L.hash(tx, ty, i + 20) * 15), y = py + Math.floor(L.hash(tx, ty, i + 40) * 15);
      R(ctx, x, y, 2, 1, i % 2 ? PAL.dirt[1] : PAL.dirt[2]);
    }
    if (L.hash(tx, ty, 61) < 0.4) R(ctx, px + 9, py + 10, 2, 2, PAL.dirt[3]);
  }

  function drawRoad(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, PAL.road[0]);
    for (let i = 0; i < 10; i++) {
      const x = px + Math.floor(L.hash(tx, ty, i + 70) * 16), y = py + Math.floor(L.hash(tx, ty, i + 90) * 16);
      R(ctx, x, y, 1, 1, i % 2 ? PAL.road[1] : PAL.road[2]);
    }
    const h = L.hash(tx, ty, 77);
    if (h < 0.12) { R(ctx, px + 3, py + 4, 7, 6, '#4a494f'); R(ctx, px + 3, py + 4, 7, 1, '#5d5c62'); }
    else if (h < 0.25) { const cx = px + 4 + Math.floor(L.hash(tx, ty, 78) * 8); R(ctx, cx, py + 3, 1, 3, '#38373c'); R(ctx, cx + 1, py + 6, 1, 3, '#38373c'); R(ctx, cx, py + 9, 1, 2, '#38373c'); }
    else if (h < 0.3) { R(ctx, px + 6, py + 8, 2, 1, '#c9c1ad'); }
  }

  function drawWater(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, PAL.water[0]);
    for (let i = 0; i < 3; i++) {
      const x = px + Math.floor(L.hash(tx, ty, i + 110) * 12), y = py + 2 + Math.floor(L.hash(tx, ty, i + 120) * 12);
      R(ctx, x, y, 4, 1, PAL.water[1]);
    }
  }

  function drawWall(ctx, px, py, tx, ty, shop) {
    const base = shop ? '#cfe5d6' : '#ecdcbf';
    const stripe = shop ? '#bcd8c6' : '#e0cca9';
    R(ctx, px, py, T, T, base);
    for (let x = 0; x < T; x += 4) R(ctx, px + x, py, 2, T, stripe);
  }

  function drawWood(ctx, px, py, tx, ty) {
    const tones = ['#b9844f', '#ad7843', '#c48f5a'];
    for (let r = 0; r < 4; r++) {
      const y = py + r * 4;
      const tone = tones[Math.floor(L.hash(tx, ty * 4 + r, 3) * 3)];
      R(ctx, px, y, T, 4, tone);
      R(ctx, px, y + 3, T, 1, '#8f5f33');
      const seam = Math.floor(L.hash(tx, ty * 4 + r, 4) * 14) + 1;
      R(ctx, px + seam, y, 1, 3, '#8f5f33');
      if (L.hash(tx, ty * 4 + r, 6) < 0.12) R(ctx, px + ((seam + 6) % 14), y + 1, 2, 1, '#94653a');
    }
  }

  function drawTiles(ctx, px, py, tx, ty) {
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const light = (tx * 2 + sx + ty * 2 + sy) % 2 === 0;
      R(ctx, px + sx * 8, py + sy * 8, 8, 8, light ? '#eee8da' : '#d3dde0');
      R(ctx, px + sx * 8, py + sy * 8, 8, 1, light ? '#f8f4ea' : '#dfe7ea');
    }
  }

  function drawMat(ctx, px, py, tx, ty, map) {
    // الأرضية تحت السجادة
    const under = map && map.matFloor === 'T' ? drawTiles : map && map.matFloor === 'C' ? drawConcrete : drawWood;
    under(ctx, px, py, tx, ty);
    R(ctx, px + 1, py + 3, 14, 11, '#9e3f37');
    R(ctx, px + 2, py + 4, 12, 9, '#c4584b');
    for (let x = 3; x < 13; x += 2) R(ctx, px + x, py + 6, 1, 5, '#d8786a');
  }

  function drawVoid(ctx, px, py) {
    R(ctx, px, py, T, T, '#1d1924');
  }

  function drawLot(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, '#a8936c');
    for (let i = 0; i < 8; i++) {
      const x = px + Math.floor(L.hash(tx, ty, i + 200) * 15), y = py + Math.floor(L.hash(tx, ty, i + 220) * 15);
      R(ctx, x, y, i % 3 ? 1 : 2, 1, i % 2 ? '#957f58' : '#bba67e');
    }
    if (L.hash(tx, ty, 240) < 0.3) { R(ctx, px + 3, py + 9, 1, 3, '#7b9449'); R(ctx, px + 4, py + 10, 1, 2, '#8fa85a'); R(ctx, px + 2, py + 10, 1, 2, '#66793b'); }
    if (L.hash(tx, ty, 241) < 0.12) R(ctx, px + 10, py + 4, 3, 2, '#8a8478');
  }
  function drawBlockWall(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, '#9a9284');
    for (let r = 0; r < 4; r++) {
      const y = py + r * 4, off = r % 2 ? 4 : 0;
      R(ctx, px, y + 3, T, 1, '#7e776b');
      for (let x = off; x < T; x += 8) R(ctx, px + x, y, 1, 3, '#7e776b');
      R(ctx, px, y, T, 1, '#aaa294');
    }
    const h = L.hash(tx, ty, 260);
    if (h < 0.18) { R(ctx, px + 2, py + 5, 3, 7, '#857d6f'); R(ctx, px + 3, py + 12, 2, 3, '#857d6f'); }
  }
  function drawConcrete(ctx, px, py, tx, ty) {
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const v = L.hash(tx * 2 + sx, ty * 2 + sy, 270);
      R(ctx, px + sx * 8, py + sy * 8, 8, 8, v < 0.5 ? '#b3ab9c' : '#aaa292');
      R(ctx, px + sx * 8, py + sy * 8, 8, 1, '#c1b9ab');
      R(ctx, px + sx * 8 + 7, py + sy * 8, 1, 8, '#968e7f');
      if (v > 0.85) R(ctx, px + sx * 8 + 2, py + sy * 8 + 3, 3, 1, '#8b8374');
    }
  }
  function drawFlatWall(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, '#c9c2a8');
    for (let i = 0; i < 5; i++) {
      const x = px + Math.floor(L.hash(tx, ty, i + 280) * 14), y = py + 4 + Math.floor(L.hash(tx, ty, i + 290) * 9);
      R(ctx, x, y, 2 + (i % 2), 1 + (i % 2), '#b2ab92');
    }
    if (L.hash(tx, ty, 299) < 0.3) { R(ctx, px + 5, py + 6, 4, 3, '#e3dcc4'); R(ctx, px + 5, py + 9, 4, 1, '#9f977e'); }
  }

  function drawSand(ctx, px, py, tx, ty) {
    R(ctx, px, py, T, T, '#ecd49a');
    for (let i = 0; i < 8; i++) { const x = px + Math.floor(L.hash(tx, ty, i + 600) * 15), y = py + Math.floor(L.hash(tx, ty, i + 620) * 15); R(ctx, x, y, 1, 1, i % 2 ? '#d9bd80' : '#f7e4b5'); }
    if (L.hash(tx, ty, 640) < 0.08) { R(ctx, px + 7, py + 8, 3, 2, '#f4f0e6'); R(ctx, px + 7, py + 8, 3, 1, '#e8b0a0'); }
  }
  const DRAW = { A: drawSand, G: drawGrass, P: drawPave, D: drawDirt, R: drawRoad, O: drawWater, F: drawWood, T: drawTiles, M: drawMat, X: drawVoid, Y: drawLot, Z: drawBlockWall, C: drawConcrete, V: (c, a, b, d, e) => drawFlatWall(c, a, b, d, e),
    W: (c, a, b, d, e) => drawWall(c, a, b, d, e, false), S: (c, a, b, d, e) => drawWall(c, a, b, d, e, true) };

  // رسم طبقة الأرض الكاملة لخريطة + الحواف التلقائية
  function renderGround(map) {
    const g = groundSteps(map, 1e9); let r; while (!(r = g.next()).done); return r.value;
  }
  // نفس الرسم بس مقسوم لقطع (كل قطعة شوية صفوف) حتى ما يعلّق الإطار
  function* groundSteps(map, band) {
    const pal = BIOME_PAL[map.biome] || BIOME_PAL.grass; GP = pal;
    const [c, ctx] = L.makeCanvas(map.w * T, map.h * T);
    const at = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h ? null : map.ground[y * map.w + x]);
    for (let y0 = 0; y0 < map.h; y0 += band) {
    const y1 = Math.min(map.h, y0 + band);
    GP = pal;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = at(x, y);
        (DRAW[t] || drawVoid)(ctx, x * T, y * T, x, y, map);
      }
    }
    // حواف وتفاصيل
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = at(x, y), px = x * T, py = y * T;
        const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
        if (t === 'P') { // رصيف بجانب الشارع: حافة
          if (dn === 'R') { R(ctx, px, py + 13, T, 3, '#a89c86'); R(ctx, px, py + 13, T, 1, '#efe8da'); }
          if (up === 'R') { R(ctx, px, py, T, 2, '#a89c86'); }
          if (rt === 'R') { R(ctx, px + 13, py, 3, T, '#a89c86'); R(ctx, px + 13, py, 1, T, '#efe8da'); }
          if (lf === 'R') { R(ctx, px, py, 2, T, '#a89c86'); }
        }
        if (t === 'R') {
          if (up === 'P') R(ctx, px, py, T, 2, PAL.road[3]);
          if (lf === 'P') R(ctx, px, py, 1, T, PAL.road[3]);
        }
        if (t === 'G') { // ظل خفيف لحواف العشب
          if (dn === 'P' || dn === 'D') R(ctx, px, py + 15, T, 1, GP[3]);
          if (up === 'P' || up === 'D') { for (let i = 0; i < T; i += 3) R(ctx, px + i, py, 1, 2, GP[1]); }
        }
        if (t === 'D' || t === 'P') {
          if (up === 'G') for (let i = 1; i < T; i += 3) R(ctx, px + i, py, 1, 1, GP[1]);
        }
        if (t === 'O') {
          if (up !== 'O') { R(ctx, px, py, T, 3, PAL.water[3]); R(ctx, px, py + 3, T, 1, PAL.water[2]); }
          if (lf !== 'O') R(ctx, px, py, 2, T, PAL.water[3]);
          if (rt !== 'O') R(ctx, px + 14, py, 2, T, PAL.water[1]);
          if (dn !== 'O') R(ctx, px, py + 15, T, 1, PAL.water[2]);
        }
        if (t === 'W' || t === 'S' || t === 'V') {
          if (up !== t) { R(ctx, px, py, T, 3, '#6b4a33'); R(ctx, px, py + 3, T, 1, '#8b6649'); }
          if (dn !== t) { R(ctx, px, py + 12, T, 4, '#8b5e3c'); R(ctx, px, py + 12, T, 1, '#a8774f'); }
        }
        if (t !== 'Z' && up === 'Z') { ctx.fillStyle = 'rgba(30,25,20,0.22)'; ctx.fillRect(px, py, T, 4); }
        if (t === 'Z' && dn !== 'Z' && dn != null) { R(ctx, px, py + 13, T, 3, '#6f685d'); }
        // ظل الجدار على الأرضية
        if ((t === 'F' || t === 'T' || t === 'M' || t === 'C') && (up === 'W' || up === 'S' || up === 'V')) {
          ctx.fillStyle = 'rgba(40,20,10,0.18)'; ctx.fillRect(px, py, T, 4);
        }
        if (t === 'M' && rt === 'M') { R(ctx, px + 14, py + 3, 4, 11, '#9e3f37'); R(ctx, px + 13, py + 4, 6, 9, '#c4584b'); }
        // إطار جدران المبنى من الداخل
        if (t === 'X') {
          const inside = (v) => v === 'F' || v === 'T' || v === 'M' || v === 'W' || v === 'S' || v === 'C' || v === 'V';
          const ins = (v) => v === 'F' || v === 'T' || v === 'M' || v === 'C';
          if (inside(rt)) { R(ctx, px + 10, py, 6, T, '#5c3d28'); R(ctx, px + 10, py, 2, T, '#7a5236'); }
          if (inside(lf)) { R(ctx, px, py, 6, T, '#5c3d28'); R(ctx, px + 4, py, 2, T, '#7a5236'); }
          if (ins(up)) { R(ctx, px, py, T, 6, '#5c3d28'); R(ctx, px, py, T, 2, '#7a5236'); }
        }
      }
    }
    if (y1 < map.h) yield null;
    }
    GP = pal;
    // علامات الطريق والممرات
    (map.marks || []).forEach((m) => {
      if (m.type === 'laneH') {
        for (let x = m.x0 * T; x < m.x1 * T; x += 12) R(ctx, x + 2, m.y * T - 1, 6, 2, '#efe4bf');
      } else if (m.type === 'laneV') {
        for (let y = m.y0 * T; y < m.y1 * T; y += 12) R(ctx, m.x * T - 1, y + 2, 2, 6, '#efe4bf');
      } else if (m.type === 'zebraH') { // ممر مشاة عبر شارع أفقي
        for (let y = m.y * T + 2; y < (m.y + m.h) * T - 1; y += 5) R(ctx, m.x * T + 2, y, m.w * T - 4, 3, '#eae6dc');
      } else if (m.type === 'zebraV') {
        for (let x = m.x * T + 2; x < (m.x + m.w) * T - 1; x += 5) R(ctx, x, m.y * T + 2, 3, m.h * T - 4, '#eae6dc');
      }
    });
    return c;
  }

  // تموجات الماء المتحركة
  function drawWaterAnim(ctx, map, time) {
    if (!map.waterTiles) return;
    ctx.fillStyle = 'rgba(200,235,255,0.55)';
    for (const wt of map.waterTiles) {
      const ph = L.hash(wt.x, wt.y, 300) * 6.28;
      const k = (Math.sin(time * 1.6 + ph) + 1) / 2;
      const x = wt.x * T + 3 + Math.floor(k * 6);
      const y = wt.y * T + 6 + Math.floor(L.hash(wt.x, wt.y, 301) * 6);
      ctx.fillRect(x, y, 3, 1);
      if (k > 0.7) ctx.fillRect(x + 6, y + 3, 2, 1);
    }
  }

  L.Tiles = { GROUND, renderGround, groundSteps, drawWaterAnim, PAL, BIOME_PAL };
})(window.LIFE);
