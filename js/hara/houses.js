// حارتنا — رسم البيوت حسب المستوى، وزينة الأراضي
(function (L) {
  'use strict';
  const T = L.TILE, R = L.rect;
  const sprite = L.Objects.helpers.sprite, drawWindow = L.Objects.helpers.drawWindow;

  const ROOFS = {
    red: { roof: '#c8553f', roofD: '#9a3d2f', roofL: '#de7356', door: '#8a5532', name: 'أحمر' },
    blue: { roof: '#4f78b8', roofD: '#365a8f', roofL: '#6f96d2', door: '#6b4a33', name: 'أزرق' },
    green: { roof: '#5a9a5c', roofD: '#3f7444', roofL: '#7bb876', door: '#7a3f2c', name: 'أخضر' },
    purple: { roof: '#8a64b0', roofD: '#664788', roofL: '#a784cb', door: '#5a3a24', name: 'بنفسجي' },
    orange: { roof: '#d9832b', roofD: '#a8611c', roofL: '#eda24f', door: '#6b3f24', name: 'برتقالي' },
    teal: { roof: '#2f8f8a', roofD: '#226b67', roofL: '#4fb0aa', door: '#6b4a33', name: 'فيروزي' },
  };
  const WALLS = ['#efdcbc', '#f3ead8', '#f1e2c6', '#efe4d4', '#f4e0d0', '#e8e3cf'];

  // شكل البيت حسب المستوى: عرض، ارتفاع، عمود الباب، النوافذ، طابقين؟
  const SHAPES = {
    1: { w: 3, h: 4, door: 1, win: [0], floors: 1 },
    2: { w: 4, h: 4, door: 2, win: [0, 3], floors: 1, chimney: true },
    3: { w: 5, h: 4, door: 2, win: [0, 1, 3, 4], floors: 1, chimney: true, awning: true },
    4: { w: 5, h: 5, door: 2, win: [0, 1, 3, 4], floors: 2, chimney: true, awning: true, balcony: true },
    5: { w: 5, h: 5, door: 2, win: [0, 1, 3, 4], floors: 2, chimney: true, awning: true, balcony: true, gold: true },
    // بنايات: القاعدة 5×4 بلاطات، والطول بيطلع لفوق
    6: { w: 5, h: 4, door: 2, tower: true, floors: 3, style: 'flat' },
    7: { w: 5, h: 4, door: 2, tower: true, floors: 5, style: 'flat' },
    8: { w: 5, h: 4, door: 2, tower: true, floors: 7, style: 'glass' },
    9: { w: 5, h: 4, door: 2, tower: true, floors: 9, style: 'glass', heli: true },
    10: { w: 5, h: 4, door: 2, tower: true, floors: 12, style: 'sky' },
  };

  // عمارات وأبراج (بكسل): بترجع الصورة ومعها أماكن الشبابيك للإضاءة بالليل
  function buildingSprite(lvl, roofKey, wallIdx) {
    const S = SHAPES[lvl], C = ROOFS[roofKey] || ROOFS.red;
    const glass = S.style !== 'flat';
    const wall = glass ? (S.style === 'sky' ? '#3d4a66' : '#56627a') : WALLS[(wallIdx | 0) % WALLS.length];
    const wallD = shade(wall, -24), wallL = shade(wall, 18);
    const FH = 18, top = S.style === 'sky' ? 40 : S.heli ? 22 : 18, ground = 26;
    const W = S.w * T + 8, H = top + S.floors * FH + ground;
    const wins = [];
    const img = sprite('bld' + lvl + roofKey + wallIdx, W, H, (ctx) => {
      const x0 = 4, bw = S.w * T;
      // جسم البناية
      R(ctx, x0, top, bw, H - top, wall);
      R(ctx, x0, top, 3, H - top, wallL); R(ctx, x0 + bw - 3, top, 3, H - top, wallD);
      if (!glass) for (let y = top + 4; y < H - ground; y += 6) R(ctx, x0 + 3, y, bw - 6, 1, wallD);
      // سطح
      R(ctx, x0 - 2, top - 3, bw + 4, 4, glass ? '#2a3348' : wallD); R(ctx, x0 - 2, top - 3, bw + 4, 1, glass ? '#7d8bb0' : wallL);
      if (S.style === 'flat') { // خزانات مي وصحن دش
        [[x0 + 8, 'w'], [x0 + 26, 'w'], [x0 + 52, 'd']].forEach(([x, k]) => {
          if (k === 'w') { R(ctx, x, top - 13, 12, 10, '#e8e2d2'); R(ctx, x, top - 13, 12, 2, '#fff'); R(ctx, x + 1, top - 5, 2, 3, '#8d8a84'); R(ctx, x + 9, top - 5, 2, 3, '#8d8a84'); R(ctx, x + 3, top - 11, 6, 1, '#c9c2b6'); }
          else { R(ctx, x + 6, top - 9, 2, 7, '#8d8a84'); R(ctx, x, top - 16, 14, 8, '#d6d2c8'); R(ctx, x + 2, top - 15, 10, 5, '#eeeae0'); R(ctx, x + 6, top - 13, 2, 2, '#8d8a84'); }
        });
      }
      if (S.heli) { R(ctx, x0 + 18, top - 12, 44, 9, '#3d4250'); R(ctx, x0 + 36, top - 11, 2, 7, '#f2c14e'); R(ctx, x0 + 42, top - 11, 2, 7, '#f2c14e'); R(ctx, x0 + 36, top - 8, 8, 1, '#f2c14e'); R(ctx, x0 + 16, top - 4, 48, 1, '#e05a4a'); }
      if (S.style === 'sky') { // قمة متدرجة + هوائي
        R(ctx, x0 + 10, top - 14, bw - 20, 12, wall); R(ctx, x0 + 22, top - 26, bw - 44, 12, wallL);
        R(ctx, x0 + bw / 2 - 1, 0, 2, top - 26, '#8d8a84'); R(ctx, x0 + bw / 2 - 2, 0, 4, 3, '#e05a4a');
        R(ctx, x0 + 10, top - 14, bw - 20, 1, '#a8b6d8');
      }
      // شريط بلون السطح (هوية البناية)
      R(ctx, x0, top, bw, 3, glass ? C.roofL : C.roof);
      // الطوابق والشبابيك
      for (let f = 0; f < S.floors; f++) {
        const fy = top + 5 + f * FH;
        for (let c = 0; c < 4; c++) {
          const wx = x0 + 6 + c * 18, ww = glass ? 16 : 12, wh = glass ? 13 : 11;
          if (glass) {
            R(ctx, wx - 1, fy - 1, ww, wh + 1, '#2a3348');
            R(ctx, wx, fy, ww - 2, wh, (f + c) % 3 ? '#7fb1d9' : '#a9d0ee'); R(ctx, wx, fy, 3, wh, 'rgba(255,255,255,.35)');
          } else {
            drawWindow(ctx, wx, fy, ww, wh);
            if ((f + c) % 2 === 0) { R(ctx, wx - 2, fy + wh + 1, ww + 4, 2, '#5a4a3a'); for (let i = 0; i < ww + 4; i += 3) R(ctx, wx - 2 + i, fy + wh - 3, 1, 4, '#6b5a4a'); }
            if ((f * 7 + c) % 5 === 1) { R(ctx, wx + 1, fy + wh - 2, 3, 2, '#5bb36a'); R(ctx, wx + 2, fy + wh - 4, 1, 2, '#f59fb7'); }
          }
          wins.push({ x: wx, y: fy, w: ww - (glass ? 2 : 0), h: wh });
        }
        if (glass) R(ctx, x0, fy + 15, bw, 1, S.style === 'sky' ? '#f2c14e' : '#3d4a66');
      }
      // المدخل
      const gy = H - ground;
      R(ctx, x0, gy, bw, ground, glass ? '#2f3a52' : wallD);
      R(ctx, x0, gy, bw, 2, C.roof);
      R(ctx, x0 + 26, gy + 4, 28, 22, '#2a2030'); R(ctx, x0 + 28, gy + 6, 11, 20, '#a9d0ee'); R(ctx, x0 + 41, gy + 6, 11, 20, '#a9d0ee');
      R(ctx, x0 + 22, gy + 1, 36, 4, C.roof); for (let i = 0; i < 36; i += 4) R(ctx, x0 + 22 + i, gy + 1, 2, 4, '#fff4dc');
      R(ctx, x0 + 6, gy + 8, 14, 10, '#ffe9a6'); R(ctx, x0 + bw - 20, gy + 8, 14, 10, '#ffe9a6');
      wins.push({ x: x0 + 6, y: gy + 8, w: 14, h: 10 }, { x: x0 + bw - 20, y: gy + 8, w: 14, h: 10 });
      R(ctx, x0 - 2, H - 3, bw + 4, 3, '#9d968c');
    });
    img._wins = wins;
    return img;
  }

  function houseSprite(lvl, roofKey, wallIdx) {
    if (lvl >= 6) return buildingSprite(lvl, roofKey, wallIdx);
    const S = SHAPES[lvl] || SHAPES[1];
    const C = ROOFS[roofKey] || ROOFS.red;
    const wall = WALLS[(wallIdx | 0) % WALLS.length];
    const wallD = shade(wall, -22);
    const w = S.w, W = w * T + 8, H = S.h * T + 8;
    return sprite('hh' + lvl + roofKey + wallIdx, W, H, (ctx) => {
      const roofH = 8 + 2 * T - (lvl === 1 ? 6 : 0);
      // الجدار
      R(ctx, 4, roofH, w * T, H - roofH, wall);
      for (let y = roofH + 3; y < H - 4; y += 4) R(ctx, 4, y, w * T, 1, wallD);
      R(ctx, 4, roofH, 3, H - roofH, wallD); R(ctx, W - 7, roofH, 3, H - roofH, wallD);
      if (S.gold) { R(ctx, 4, roofH, w * T, 2, '#f2c14e'); R(ctx, 4, roofH + T + 4, w * T, 1, '#d9a83a'); }
      // أساس حجري
      R(ctx, 4, H - 5, w * T, 5, '#9d968c');
      for (let x = 6; x < W - 6; x += 7) R(ctx, x, H - 5, 1, 5, '#837c72');
      R(ctx, 4, H - 5, w * T, 1, '#b8b1a6');
      // السقف
      for (let y = 0; y < roofH; y++) {
        const inset = y < 10 ? 10 - y : 0;
        R(ctx, inset, y, W - inset * 2, 1, C.roof);
      }
      for (let y = 4; y < roofH - 3; y += 5) {
        const inset = y < 10 ? 10 - y : 0;
        R(ctx, inset, y, W - inset * 2, 1, C.roofD);
        const off = (y / 5) % 2 ? 0 : 4;
        for (let x = inset + off; x < W - inset; x += 8) R(ctx, x, y - 4, 1, 4, C.roofD);
        R(ctx, inset, y - 3, W - inset * 2, 1, C.roofL);
      }
      R(ctx, 10, 0, W - 20, 2, S.gold ? '#f2c14e' : C.roofL);
      R(ctx, 0, roofH - 4, W, 4, S.gold ? '#d9a83a' : C.roofD);
      R(ctx, 0, roofH - 4, W, 1, S.gold ? '#ffe08a' : C.roof);
      ctx.fillStyle = 'rgba(30,20,20,0.25)'; ctx.fillRect(4, roofH, w * T, 3);
      if (S.chimney) {
        R(ctx, W - 26, 0, 9, 13, '#9a5a45'); R(ctx, W - 27, 0, 11, 3, '#6e3f31');
        R(ctx, W - 25, 5, 3, 1, '#7a4636'); R(ctx, W - 21, 9, 3, 1, '#7a4636');
      }
      if (S.gold) { // علم على السطح
        R(ctx, 14, 0, 1, 12, '#5a3a24');
        R(ctx, 15, 1, 8, 5, '#f2c14e'); R(ctx, 15, 1, 8, 1, '#ffe08a'); R(ctx, 18, 3, 2, 1, '#c8553f');
      }
      // النوافذ
      const groundY = H - 25;
      const rowsY = S.floors === 2 ? [roofH + 6, groundY + 2] : [lvl === 1 ? roofH + 5 : roofH + 9];
      rowsY.forEach((wy, ri) => {
        S.win.forEach((col) => {
          if (ri === rowsY.length - 1 && col === S.door) return;
          const x = 4 + col * T + 2;
          drawWindow(ctx, x, wy, 12, 11);
          if (lvl >= 3 && ri === rowsY.length - 1) {
            R(ctx, x - 1, wy + 14, 14, 3, '#7a4b2a');
            for (let i = 0; i < 6; i++) R(ctx, x + i * 2, wy + 13, 1, 1, i % 2 ? '#f59fb7' : '#5bb36a');
          }
        });
      });
      if (S.floors === 2 && !S.win.includes(S.door)) { /* لا شي */ }
      if (S.floors === 2) { // نافذة الطابق العلوي فوق الباب
        const x = 4 + S.door * T + 2; drawWindow(ctx, x, rowsY[0], 12, 11);
      }
      if (S.balcony) {
        const bx = 4 + S.door * T - 6, by = rowsY[0] + 13;
        R(ctx, bx, by, 28, 2, '#5a3a24');
        for (let i = 0; i < 28; i += 3) R(ctx, bx + i, by - 6, 1, 6, '#6b4a33');
        R(ctx, bx, by - 7, 28, 1, '#7a5a3f');
      }
      // الباب
      const dx = 4 + S.door * T + 2, dy = groundY;
      if (S.awning) {
        R(ctx, dx - 4, dy - 6, 20, 4, C.roof);
        for (let i = 0; i < 20; i += 4) R(ctx, dx - 4 + i, dy - 6, 2, 4, '#fff4dc');
        R(ctx, dx - 4, dy - 2, 20, 1, C.roofD);
      }
      R(ctx, dx - 1, dy - 1, 14, 22, '#5a3a24');
      R(ctx, dx, dy, 12, 20, S.gold ? '#7a3f2c' : C.door);
      R(ctx, dx + 2, dy + 2, 8, 6, 'rgba(255,255,255,0.12)');
      R(ctx, dx + 2, dy + 11, 8, 6, 'rgba(255,255,255,0.12)');
      R(ctx, dx + 9, dy + 10, 2, 2, '#f2c14e');
      R(ctx, dx - 2, H - 5, 16, 2, '#c9c2b6');
      R(ctx, dx + 13, dy + 2, 3, 4, '#ffe9a6'); R(ctx, dx + 13, dy + 1, 3, 1, '#3d4250');
    });
  }

  function shade(hex, amt) {
    const [r, g, b] = L.hexToRgb(hex);
    const f = (v) => L.clamp(Math.round(v + amt), 0, 255);
    return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // لافتة "للبيع" للأرض الفاضية
  function saleSign() {
    return sprite('salesign', 18, 22, (c) => {
      R(c, 3, 10, 2, 12, '#6b4a33'); R(c, 13, 10, 2, 12, '#6b4a33');
      R(c, 0, 2, 18, 10, '#e8c48a'); R(c, 0, 2, 18, 1, '#f6dcae'); R(c, 0, 11, 18, 1, '#a8763f');
      R(c, 7, 4, 4, 6, '#f2c14e'); R(c, 8, 5, 2, 4, '#d9a83a'); R(c, 7, 4, 4, 1, '#ffe08a');
      R(c, 3, 5, 2, 1, '#3d7a5a'); R(c, 13, 5, 2, 1, '#3d7a5a'); R(c, 3, 8, 2, 1, '#3d7a5a'); R(c, 13, 8, 2, 1, '#3d7a5a');
    });
  }
  function stake() {
    return sprite('stake', 4, 8, (c) => { R(c, 1, 0, 2, 8, '#8a6a48'); R(c, 1, 0, 2, 2, '#e05a4a'); });
  }
  function scaffold() {
    return sprite('scaffold', 60, 60, (c) => {
      for (let x = 2; x < 60; x += 14) R(c, x, 0, 2, 60, '#8a6a48');
      for (let y = 6; y < 60; y += 14) R(c, 0, y, 60, 2, '#a8835c');
      for (let k = 0; k < 4; k++) R(c, 6 + k * 14, 10 + k * 12, 12, 3, '#c9a06a');
      R(c, 10, 46, 40, 14, '#a8936c'); R(c, 14, 42, 10, 6, '#9d968c'); R(c, 30, 40, 12, 8, '#b5ad9e');
    });
  }

  // أرض فاضية: تراب مع حبل حولها
  function lotSprite() {
    return sprite('lot2', 7 * T, 6 * T, (c) => {
      const W = 7 * T, Hh = 6 * T;
      // بقعة تراب صغيرة حوالين اللافتة بس، والباقي أرض البيئة
      c.fillStyle = 'rgba(150,120,80,0.35)'; c.fillRect(40, 44, 32, 18);
      c.fillStyle = 'rgba(150,120,80,0.2)'; c.fillRect(36, 48, 40, 10);
      for (let x = 6; x < W - 6; x += 2) { R(c, x, 6, 1, 1, '#e6d3a8'); R(c, x, Hh - 7, 1, 1, '#e6d3a8'); }
      for (let y = 6; y < Hh - 6; y += 2) { R(c, 6, y, 1, 1, '#e6d3a8'); R(c, W - 7, y, 1, 1, '#e6d3a8'); }
      c.fillStyle = 'rgba(42,32,48,0.18)';
      for (let x = 6; x < W - 6; x += 2) { c.fillRect(x, 7, 1, 1); c.fillRect(x, Hh - 6, 1, 1); }
    }, false);
  }

  // كائنات الزينة حول البيت حسب المستوى (إحداثيات بلاطات)
  // زينة الجنينة اللي بيختارها اللاعب (4 أماكن)
  const DECO = {
    none: { name: 'فاضي' }, tree: { name: 'شجرة', type: 'tree' }, pine: { name: 'صنوبر', type: 'pine' }, palm: { name: 'نخلة', type: 'palm' },
    cactus: { name: 'صبّار', type: 'cactus' }, flowers: { name: 'ورد', type: 'flowers' }, bush: { name: 'شجيرة', type: 'bush' },
    lamp: { name: 'عمود ضو', type: 'lamp' }, rock: { name: 'صخرة', type: 'rock' }, snowman: { name: 'رجل تلج', type: 'snowman' }, mailbox: { name: 'صندوق بريد', type: 'mailbox' },
  };
  const SLOTS = [{ dx: 0, dy: 2, name: 'يمين البيت' }, { dx: 6, dy: 2, name: 'يسار البيت' }, { dx: 1, dy: 5, name: 'قدّام يمين' }, { dx: 5, dy: 5, name: 'قدّام يسار' }];
  function decor(p, lvl, deco) {
    if (Array.isArray(deco) && deco.length) {
      const o = [];
      deco.slice(0, Math.min(4, lvl)).forEach((k, i) => { const dd = DECO[k]; if (!dd || !dd.type) return; const sl = SLOTS[i]; o.push({ type: dd.type, x: p.x + sl.dx, y: p.y + sl.dy, v: (p.n + i) % 3 }); });
      if (lvl >= 4) [0, 6].forEach((c) => { if (!o.some((q) => q.x === p.x + c && q.y === p.y + 5)) o.push({ type: 'fence', x: p.x + c, y: p.y + 5 }); });
      return o;
    }
    lvl = Math.min(lvl, 5);
    const o = [];
    const x = p.x, y = p.y;
    if (lvl >= 1) o.push({ type: 'bush', x: x + 5 + (lvl >= 3 ? 1 : 0), y: y + 4, v: 0 });
    if (lvl >= 2) o.push({ type: 'mailbox', x: x + (lvl >= 3 ? 0 : 0), y: y + 4 });
    if (lvl >= 3) o.push({ type: 'flowers', x: x + 1, y: y + 5, v: 0 }, { type: 'flowers', x: x + 5, y: y + 5, v: 1 });
    if (lvl >= 4) {
      o.push({ type: 'tree', x: x, y: y + 2, v: (p.n % 3) }, { type: 'tree', x: x + 6, y: y + 2, v: ((p.n + 1) % 3) });
      [0, 6].forEach((c) => o.push({ type: 'fence', x: x + c, y: y + 5 }));
    }
    if (lvl >= 5) o.push({ type: 'lamp', x: x + 2, y: y + 5 }, { type: 'lamp', x: x + 4, y: y + 5 });
    else if (lvl >= 3) o.push({ type: 'flowers', x: x + 2, y: y + 5, v: 2 }, { type: 'flowers', x: x + 4, y: y + 5, v: 0 });
    return o;
  }

  L.Houses = { ROOFS, WALLS, SHAPES, DECO, SLOTS, houseSprite, saleSign, lotSprite, stake, scaffold, decor };
})(window.LIFE);
