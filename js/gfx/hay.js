// LIFE | حياة — رسومات الحي الشعبي: العمارات، المحلات، والأغراض
(function (L) {
  'use strict';
  const T = L.TILE;
  const R = L.rect;
  const { sprite, shadowEllipse, goods } = L.Objects.helpers;
  const TYPES = L.Objects.TYPES;

  const WALLS = {
    beige: ['#d3c39e', '#c2b28c', '#e0d2b0'],
    gray: ['#b8b2a5', '#a59f92', '#c9c3b6'],
    yellow: ['#d8c88f', '#c7b77e', '#e6d8a2'],
    pink: ['#cfae98', '#bd9c86', '#dcbea9'],
    blue: ['#a9b5b3', '#97a3a1', '#bac5c3'],
  };
  const SIGNS = {
    red: ['#b8392f', '#d65a44', '#7e2620'],
    green: ['#2f6b4a', '#4a8a63', '#1f4a33'],
    orange: ['#d9772b', '#ef9a4c', '#9c5016'],
    brown: ['#6b4a33', '#8a6448', '#4a3222'],
  };

  // أيقونات اللافتات (8×8 تقريباً)
  function signIcon(ctx, x, y, icon) {
    if (icon === 'falafel') {
      R(ctx, x, y + 2, 9, 5, '#e6c07a'); R(ctx, x + 1, y + 1, 7, 1, '#e6c07a');
      R(ctx, x + 2, y + 3, 2, 2, '#7a4a20'); R(ctx, x + 5, y + 3, 2, 2, '#7a4a20'); R(ctx, x + 3, y + 5, 3, 1, '#5bb36a');
    } else if (icon === 'bag') {
      R(ctx, x + 1, y + 2, 7, 6, '#f2c14e'); R(ctx, x + 2, y, 1, 3, '#f2c14e'); R(ctx, x + 6, y, 1, 3, '#f2c14e'); R(ctx, x + 2, y, 5, 1, '#f2c14e');
    } else if (icon === 'box') {
      R(ctx, x, y + 2, 9, 6, '#e8c48a'); R(ctx, x, y + 2, 9, 1, '#f6dcae'); R(ctx, x + 4, y + 2, 1, 6, '#a8763f'); R(ctx, x + 1, y, 7, 2, '#d6ac6c');
    } else if (icon === 'cup') {
      R(ctx, x + 1, y + 3, 6, 5, '#f6f1e8'); R(ctx, x + 7, y + 4, 2, 2, '#f6f1e8'); R(ctx, x + 2, y + 3, 4, 1, '#7a4a20');
      R(ctx, x + 2, y, 1, 2, '#d9d2c4'); R(ctx, x + 5, y, 1, 2, '#d9d2c4');
    }
  }

  // ---------------- العمارة / المحل ----------------
  function makeBlock(o) {
    const w = o.w, h = o.h, W = w * T + 8, H = h * T + 8;
    const key = 'block_' + [w, h, o.wall, o.doorCol, (o.windows || []).join('.'), o.shop ? o.shop.color + o.shop.icon + o.shop.front : '', o.seed || 0].join('_');
    return sprite(key, W, H, (ctx) => {
      const rnd = L.rng(o.seed || (w * 31 + h * 7 + o.doorCol));
      const C = WALLS[o.wall] || WALLS.beige;
      // السطح
      R(ctx, 0, 2, W, 22, '#8d8679');
      for (let i = 0; i < 14; i++) R(ctx, Math.floor(rnd() * W), 5 + Math.floor(rnd() * 16), 3, 1, '#7f786c');
      R(ctx, 0, 0, W, 4, '#b5ad9e'); R(ctx, 0, 0, W, 1, '#cbc4b6');
      // خزانات المياه والصحون
      const tanks = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < tanks; i++) {
        const tx = 8 + Math.floor(rnd() * (W - 30)), ty = 6;
        const black = rnd() < 0.5;
        R(ctx, tx, ty, 12, 13, black ? '#2f3036' : '#e9e6dd'); R(ctx, tx, ty, 12, 3, black ? '#4a4b52' : '#ffffff');
        R(ctx, tx + 2, ty + 1, 8, 1, black ? '#5c5d64' : '#f6f4ef'); R(ctx, tx, ty + 12, 12, 1, black ? '#1f2024' : '#bdb9ae');
        R(ctx, tx + 1, ty + 13, 2, 2, '#6b665c'); R(ctx, tx + 9, ty + 13, 2, 2, '#6b665c');
      }
      const dx = W - 22 - Math.floor(rnd() * 10);
      R(ctx, dx, 9, 9, 8, '#d9d6cf'); R(ctx, dx + 1, 10, 7, 6, '#c1beb6'); R(ctx, dx + 4, 13, 1, 6, '#6b665c'); R(ctx, dx + 3, 12, 3, 2, '#5a5650');
      R(ctx, 0, 22, W, 4, '#a49c8d'); R(ctx, 0, 22, W, 1, '#c3bbac');
      ctx.fillStyle = 'rgba(30,25,20,0.3)'; ctx.fillRect(4, 26, w * T, 3);
      // الواجهة
      R(ctx, 4, 26, w * T, H - 26, C[0]);
      for (let i = 0; i < 40; i++) R(ctx, 4 + Math.floor(rnd() * w * T), 28 + Math.floor(rnd() * (H - 34)), 2, 1, rnd() < 0.5 ? C[1] : C[2]);
      // شقوق
      for (let i = 0; i < 2; i++) {
        let cx = 8 + Math.floor(rnd() * (w * T - 10)), cy = 30 + Math.floor(rnd() * 20);
        for (let k = 0; k < 6; k++) { R(ctx, cx, cy, 1, 2, C[1]); cx += rnd() < 0.5 ? 1 : -1; cy += 2; }
      }
      const groundTop = H - 32;
      // خط فاصل بين الطوابق
      R(ctx, 4, groundTop - 2, w * T, 2, C[1]);
      R(ctx, 4, 50, w * T, 1, C[1]);
      // النوافذ العلوية
      const wins = o.windows || [];
      const lit = [];
      [30, 54].forEach((fy, floor) => {
        if (fy + 16 > groundTop - 2) return;
        wins.forEach((col) => {
          const x = 4 + col * T + 2, y = fy;
          const kind = rnd();
          R(ctx, x - 1, y - 1, 14, 15, C[1]);
          R(ctx, x, y, 12, 12, '#55606b');
          R(ctx, x + 1, y + 1, 10, 10, '#7f95a3');
          R(ctx, x + 1, y + 1, 3, 2, '#a9bcc6');
          if (kind < 0.35) { for (let i = 0; i < 12; i += 3) R(ctx, x + i + 1, y, 1, 12, '#3a3a40'); R(ctx, x, y + 6, 12, 1, '#3a3a40'); }
          else if (kind < 0.55) { R(ctx, x, y, 12, 12, '#c9b98f'); for (let i = 1; i < 12; i += 2) R(ctx, x, y + i, 12, 1, '#b2a37b'); }
          else if (kind < 0.7) { R(ctx, x - 1, y + 12, 14, 2, '#8a8478'); }
          // ستارة
          if (kind >= 0.55) { R(ctx, x + 1, y + 1, 3, 10, ['#c46a5a', '#6a8fc4', '#c4b45a'][Math.floor(rnd() * 3)]); }
          // مكيف
          if (rnd() < 0.3) { R(ctx, x + 2, y + 13, 9, 6, '#e3e0d8'); R(ctx, x + 3, y + 15, 7, 1, '#a9a59b'); R(ctx, x + 3, y + 17, 7, 1, '#a9a59b'); }
          // تسرب ماء تحت النافذة
          ctx.fillStyle = 'rgba(80,70,50,0.18)'; ctx.fillRect(x + 4, y + 14, 3, 8);
          if (rnd() < 0.45) lit.push({ x: x - 4, y: y - 8, w: 12, h: 12 });
        });
      });
      // حبل غسيل
      if (o.laundry) {
        const ly = 47, x0 = 8, x1 = w * T - 4;
        R(ctx, x0, ly, x1 - x0, 1, '#4a4540');
        const cols = ['#e05a4f', '#4f86d6', '#f2c14e', '#ffffff', '#5bb36a'];
        for (let x = x0 + 3; x < x1 - 6; x += 7 + Math.floor(rnd() * 5)) R(ctx, x, ly + 1, 4 + Math.floor(rnd() * 3), 5 + Math.floor(rnd() * 3), cols[Math.floor(rnd() * cols.length)]);
      }
      // الطابق الأرضي
      R(ctx, 4, groundTop, w * T, H - groundTop, C[1]);
      R(ctx, 4, H - 5, w * T, 5, '#8d8679'); R(ctx, 4, H - 5, w * T, 1, '#a49c8d');
      const doorX = 4 + o.doorCol * T + 1;
      if (o.shop) {
        const S = SIGNS[o.shop.color] || SIGNS.red;
        // اللافتة
        R(ctx, 6, groundTop - 1, w * T - 4, 10, S[0]); R(ctx, 6, groundTop - 1, w * T - 4, 2, S[1]); R(ctx, 6, groundTop + 8, w * T - 4, 1, S[2]);
        signIcon(ctx, 10, groundTop, o.shop.icon);
        for (let x = 24; x < w * T - 12; x += 7) R(ctx, x, groundTop + 3, 4 + (x % 3), 2, '#fff4dc');
        // واجهة المحل
        const fy = groundTop + 10, fh = H - 5 - fy;
        if (o.shop.front === 'shutter') {
          R(ctx, 8, fy, w * T - 8, fh, '#6f7a80');
          for (let y = fy; y < fy + fh; y += 3) R(ctx, 8, y, w * T - 8, 1, '#5d676c');
          // جزء مفتوح عند الباب
          R(ctx, doorX - 1, fy, 16, fh, '#3c3a38'); R(ctx, doorX, fy + 2, 14, fh - 2, '#2c2a29');
          goods(ctx, doorX + 1, fy + fh - 1, 13, 7);
        } else {
          R(ctx, 8, fy, w * T - 8, fh, '#4a4846');
          R(ctx, 9, fy + 1, w * T - 10, fh - 1, '#c9b48a');
          // داخل المحل
          R(ctx, 9, fy + fh - 8, w * T - 10, 8, '#8a6448'); R(ctx, 9, fy + fh - 8, w * T - 10, 1, '#a8805e');
          goods(ctx, 12, fy + 8, w * T - 18, 99 + w);
          R(ctx, doorX, fy + 1, 14, fh - 1, '#3a3836');
          R(ctx, doorX + 1, fy + 2, 12, fh - 2, '#2a2826');
          // مظلة قماش
          for (let x = 6; x < w * T + 2; x += 6) { R(ctx, x, fy - 1, 3, 3, S[1]); R(ctx, x + 3, fy - 1, 3, 3, '#efe6d2'); }
        }
      } else {
        // مدخل العمارة
        R(ctx, doorX - 2, groundTop + 4, 18, H - groundTop - 9, '#857e71');
        R(ctx, doorX, groundTop + 6, 14, H - groundTop - 11, '#3f5a4f');
        R(ctx, doorX + 1, groundTop + 7, 12, 6, '#5a7a6c'); R(ctx, doorX + 2, groundTop + 8, 10, 4, '#2c3a34');
        R(ctx, doorX + 10, groundTop + 16, 2, 2, '#c9b98f');
        R(ctx, doorX + 4, groundTop + 2, 6, 2, '#ffe9a6');
        // نوافذ أرضية
        wins.forEach((col) => {
          if (col === o.doorCol) return;
          const x = 4 + col * T + 2, y = groundTop + 6;
          R(ctx, x - 1, y - 1, 14, 13, C[2]); R(ctx, x, y, 12, 11, '#55606b');
          for (let i = 0; i < 12; i += 3) R(ctx, x + i + 1, y, 1, 11, '#2f2f34');
        });
      }
      // رقم/كتابة على الحائط (خربشات)
      if (o.graffiti) {
        const gx = 4 + (o.doorCol === 0 ? w - 2 : 0) * T + 6, gy = H - 14;
        ctx.fillStyle = o.graffiti;
        for (let i = 0; i < 9; i++) ctx.fillRect(gx + i * 2, gy + Math.round(Math.sin(i * 1.7) * 2), 2, 1);
        ctx.fillRect(gx + 3, gy - 3, 1, 5); ctx.fillRect(gx + 11, gy - 2, 1, 4);
      }
      o._lit = lit;
    });
  }

  TYPES.block = {
    ox: -4, oy: -8,
    sprite: (o) => makeBlock(o),
    windows: (o) => { makeBlock(o); return o._lit || []; },
  };

  // ---------------- أغراض الشارع ----------------
  TYPES.trash = { w: 1, h: 1, ox: 0, oy: -4, hit: { x: 2, y: 4, w: 12, h: 11 }, sprite: () => sprite('trash', 16, 20, (c) => {
    R(c, 2, 6, 12, 13, '#3f6b4a'); R(c, 2, 6, 12, 2, '#5a8a63'); R(c, 1, 4, 14, 3, '#2f5238'); R(c, 4, 9, 1, 8, '#2f5238'); R(c, 11, 9, 1, 8, '#2f5238');
    R(c, 5, 1, 5, 4, '#2a2a30'); R(c, 9, 2, 4, 3, '#d9d2c4');
  }) };
  TYPES.bags = { w: 1, h: 1, ox: 0, oy: 0, hit: { x: 2, y: 6, w: 12, h: 9 }, sprite: () => sprite('bags', 16, 16, (c) => {
    L.blob(c, 6, 10, 5, ['#4a4a52', '#33333a', '#24242a']); L.blob(c, 11, 11, 4, ['#4a4a52', '#33333a', '#24242a']);
    R(c, 6, 4, 2, 2, '#24242a'); R(c, 3, 13, 3, 2, '#d9d2c4');
  }) };
  TYPES.car = { w: 2, h: 1, ox: 0, oy: -8, hit: { x: 1, y: 1, w: 30, h: 14 }, sprite: (o) => sprite('car' + (o.color || 'white'), 32, 24, (c) => {
    const col = { white: ['#e6e3dc', '#c7c3b9', '#f6f4ef'], red: ['#b8392f', '#8f2a22', '#d65a44'], blue: ['#3f5f8a', '#2f4a6c', '#5a7aa8'], yellow: ['#e0b13a', '#b8902a', '#f2cd6a'] }[o.color || 'white'];
    R(c, 1, 9, 30, 10, col[0]); R(c, 1, 9, 30, 2, col[2]); R(c, 1, 17, 30, 2, col[1]);
    R(c, 7, 2, 17, 8, col[0]); R(c, 9, 3, 6, 6, '#6d8796'); R(c, 16, 3, 6, 6, '#6d8796'); R(c, 9, 3, 2, 2, '#a9c0cc');
    R(c, 3, 18, 7, 5, '#232327'); R(c, 22, 18, 7, 5, '#232327'); R(c, 5, 19, 3, 2, '#77777f'); R(c, 24, 19, 3, 2, '#77777f');
    R(c, 0, 12, 2, 3, '#f6e7a6'); R(c, 30, 12, 2, 3, '#c94a3f');
    shadowEllipse(c, 16, 22, 15, 2, 0.25);
  }) };
  TYPES.chair = { w: 1, h: 1, ox: 0, oy: -2, hit: { x: 3, y: 6, w: 10, h: 8 }, sprite: (o) => sprite('chair' + (o.color || 'w'), 16, 18, (c) => {
    const col = o.color === 'r' ? ['#c94a3f', '#a33a30'] : ['#e9e6dd', '#c9c5bb'];
    R(c, 4, 1, 8, 8, col[0]); R(c, 5, 2, 6, 1, col[1]); R(c, 5, 4, 6, 1, col[1]);
    R(c, 3, 9, 10, 3, col[0]); R(c, 3, 11, 10, 1, col[1]);
    R(c, 3, 12, 1, 5, col[1]); R(c, 12, 12, 1, 5, col[1]);
  }) };
  TYPES.ctable = { w: 1, h: 1, ox: 0, oy: -3, hit: { x: 2, y: 5, w: 12, h: 9 }, sprite: () => sprite('ctable', 16, 19, (c) => {
    R(c, 1, 3, 14, 6, '#e9e6dd'); R(c, 1, 3, 14, 1, '#ffffff'); R(c, 7, 9, 2, 9, '#a9a59b'); R(c, 4, 17, 8, 1, '#a9a59b');
    R(c, 3, 1, 2, 3, '#d9a873'); R(c, 3, 1, 2, 1, '#8a3f20'); R(c, 10, 2, 3, 2, '#6b6b72'); R(c, 11, 1, 1, 1, '#d9d2c4');
  }) };
  TYPES.cart = { w: 2, h: 1, ox: 0, oy: -18, hit: { x: 1, y: 2, w: 30, h: 13 }, sprite: () => sprite('cart', 32, 34, (c) => {
    // مظلة
    for (let x = 0; x < 32; x += 6) { R(c, x, 1, 3, 6, '#d64545'); R(c, x + 3, 1, 3, 6, '#f2e6c8'); }
    R(c, 0, 0, 32, 1, '#9a2e2e'); R(c, 15, 7, 2, 12, '#6b665c');
    // العربة
    R(c, 2, 18, 28, 11, '#c9b98f'); R(c, 2, 18, 28, 2, '#e0d2a8'); R(c, 2, 27, 28, 2, '#a89a72');
    R(c, 5, 15, 9, 4, '#b8b4ab'); R(c, 6, 16, 7, 2, '#e6c07a'); R(c, 18, 15, 8, 4, '#d9d2c4'); R(c, 19, 16, 2, 2, '#5bb36a'); R(c, 22, 16, 2, 2, '#e05a4f');
    R(c, 9, 21, 14, 4, '#b8392f'); R(c, 11, 22, 10, 2, '#fff4dc');
    R(c, 4, 29, 5, 5, '#232327'); R(c, 23, 29, 5, 5, '#232327'); R(c, 5, 30, 3, 3, '#77777f');
  }) };
  TYPES.board = { w: 1, h: 1, ox: -4, oy: -12, hit: { x: 1, y: 8, w: 14, h: 7 }, sprite: () => sprite('board', 24, 28, (c) => {
    R(c, 5, 16, 2, 11, '#5a4636'); R(c, 17, 16, 2, 11, '#5a4636');
    R(c, 1, 1, 22, 17, '#8a6448'); R(c, 2, 2, 20, 15, '#c9a87a');
    R(c, 3, 3, 7, 6, '#f6f1e8'); R(c, 4, 4, 5, 1, '#8a8478'); R(c, 4, 6, 4, 1, '#8a8478');
    R(c, 12, 3, 8, 7, '#fff3b0'); R(c, 13, 4, 6, 1, '#b8392f'); R(c, 13, 6, 5, 1, '#8a8478'); R(c, 13, 8, 4, 1, '#8a8478');
    R(c, 4, 11, 9, 5, '#d6ecf5'); R(c, 5, 12, 6, 1, '#3f5f8a'); R(c, 5, 14, 4, 1, '#8a8478');
    R(c, 15, 12, 5, 4, '#f6f1e8'); R(c, 6, 3, 1, 1, '#e05a4f'); R(c, 15, 3, 1, 1, '#4f86d6');
  }) };
  TYPES.scooter = { w: 1, h: 1, ox: -2, oy: -6, hit: { x: 1, y: 6, w: 14, h: 9 }, sprite: () => sprite('scooter', 20, 22, (c) => {
    R(c, 3, 2, 10, 8, '#d9772b'); R(c, 3, 2, 10, 2, '#ef9a4c'); R(c, 5, 5, 6, 3, '#fff4dc');
    R(c, 2, 11, 16, 5, '#3f4a55'); R(c, 13, 6, 2, 6, '#3f4a55'); R(c, 12, 5, 6, 2, '#2a2a30');
    R(c, 1, 15, 5, 5, '#232327'); R(c, 14, 15, 5, 5, '#232327'); R(c, 2, 16, 3, 3, '#77777f'); R(c, 15, 16, 3, 3, '#77777f');
  }) };
  TYPES.tire = { w: 1, h: 1, ox: 0, oy: 0, hit: { x: 3, y: 6, w: 10, h: 8 }, sprite: () => sprite('tire', 16, 16, (c) => {
    R(c, 3, 6, 10, 9, '#2a2a30'); R(c, 2, 8, 12, 5, '#2a2a30'); R(c, 5, 8, 6, 5, '#3f3f46'); R(c, 6, 9, 4, 3, '#8d8679');
  }) };
  TYPES.brokenlamp = { w: 1, h: 1, ox: 0, oy: -20, hit: { x: 5, y: 10, w: 6, h: 5 }, sprite: () => sprite('brokenlamp', 16, 36, (c) => {
    R(c, 7, 8, 2, 25, '#3d4250'); R(c, 5, 31, 6, 4, '#3d4250'); R(c, 4, 2, 8, 4, '#3d4250'); R(c, 5, 6, 6, 3, '#55565e'); R(c, 6, 7, 2, 1, '#77777f');
  }) };
  TYPES.dumpster = { w: 2, h: 1, ox: 0, oy: -8, hit: { x: 1, y: 2, w: 30, h: 13 }, sprite: () => sprite('dumpster', 32, 24, (c) => {
    R(c, 1, 6, 30, 15, '#3f6b8a'); R(c, 1, 6, 30, 2, '#5a8aa8'); R(c, 0, 3, 32, 4, '#2f526b');
    for (let x = 5; x < 30; x += 6) R(c, x, 9, 1, 11, '#2f526b');
    R(c, 4, 0, 6, 4, '#33333a'); R(c, 12, 1, 5, 3, '#d9d2c4'); R(c, 20, 0, 7, 4, '#4a4a52');
    R(c, 3, 21, 3, 3, '#232327'); R(c, 26, 21, 3, 3, '#232327');
  }) };
  TYPES.graffiti = { w: 2, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: (o) => sprite('graffiti' + (o.v || 0), 32, 16, (c) => {
    const rnd = L.rng(700 + (o.v || 0));
    const cols = [['#d64545', '#f2c14e'], ['#4f86d6', '#ffffff'], ['#5bb36a', '#e2678c']][(o.v || 0) % 3];
    for (let i = 0; i < 14; i++) { R(c, 3 + i * 2, 5 + Math.round(Math.sin(i * 0.9 + rnd()) * 3), 2, 2, cols[0]); }
    for (let i = 0; i < 8; i++) R(c, 6 + i * 3, 9 + Math.round(Math.cos(i) * 2), 1, 1, cols[1]);
  }, false) };
  TYPES.wires = { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: () => sprite('weeds', 16, 16, (c) => {
    R(c, 3, 9, 1, 5, '#66793b'); R(c, 4, 11, 1, 3, '#7b9449'); R(c, 11, 8, 1, 6, '#66793b'); R(c, 12, 10, 1, 4, '#8fa85a'); R(c, 7, 12, 3, 1, '#d9d2c4');
  }, false) };

  // ---------------- داخل الشقة ----------------
  TYPES.mattress = { w: 1, h: 2, ox: 0, oy: 0, sprite: (o) => sprite('mattress' + (o.color || 'b'), 16, 32, (c) => {
    const bl = { b: ['#4f6b8a', '#3f5670'], r: ['#8a4f4f', '#6c3e3e'], g: ['#5a7a4f', '#45603d'], y: ['#a8904a', '#86723a'] }[o.color || 'b'];
    R(c, 1, 3, 14, 28, '#d9d2c4'); R(c, 1, 3, 14, 1, '#ece6da'); R(c, 1, 30, 14, 1, '#b5ad9e');
    R(c, 3, 5, 10, 5, '#efe9dd'); R(c, 3, 9, 10, 1, '#c9c2b4');
    R(c, 1, 13, 14, 17, bl[0]); R(c, 1, 13, 14, 2, bl[1]);
    for (let y = 17; y < 29; y += 4) R(c, 2, y, 12, 1, bl[1]);
  }) };
  TYPES.lowtable = { w: 2, h: 1, ox: 0, oy: -2, hit: { x: 2, y: 3, w: 28, h: 11 }, sprite: () => sprite('lowtable', 32, 18, (c) => {
    R(c, 2, 4, 28, 8, '#8a6448'); R(c, 2, 4, 28, 1, '#a8805e'); R(c, 2, 11, 28, 2, '#6b4a33'); R(c, 4, 13, 2, 4, '#5a3a24'); R(c, 26, 13, 2, 4, '#5a3a24');
    R(c, 6, 1, 3, 4, '#d9a873'); R(c, 6, 1, 3, 1, '#8a3f20'); R(c, 11, 2, 3, 3, '#d9a873'); R(c, 11, 2, 3, 1, '#8a3f20');
    R(c, 19, 5, 6, 3, '#77777f'); R(c, 20, 5, 4, 1, '#a9a59b'); R(c, 21, 4, 3, 1, '#e9e6dd');
    R(c, 15, 6, 2, 2, '#e6c07a');
  }) };
  TYPES.kitchen = { w: 2, h: 1, ox: 0, oy: -10, sprite: () => sprite('kitchen', 32, 26, (c) => {
    R(c, 0, 8, 32, 18, '#b5ad9e'); R(c, 0, 8, 32, 3, '#cfc8ba'); R(c, 0, 24, 32, 2, '#8d8679');
    R(c, 2, 13, 13, 9, '#9a9284'); R(c, 18, 13, 12, 9, '#9a9284'); R(c, 8, 16, 2, 2, '#5a564e'); R(c, 23, 16, 2, 2, '#5a564e');
    R(c, 3, 4, 11, 6, '#3f3f46'); R(c, 4, 5, 3, 3, '#232327'); R(c, 9, 5, 3, 3, '#232327'); R(c, 5, 6, 1, 1, '#4f86d6');
    R(c, 18, 5, 10, 5, '#d9d6cf'); R(c, 19, 6, 8, 3, '#a9b5b3'); R(c, 22, 2, 1, 4, '#9aa7b0');
    R(c, 6, 0, 5, 4, '#77777f'); R(c, 7, 0, 3, 1, '#a9a59b');
  }) };
  TYPES.jar = { w: 1, h: 1, ox: 0, oy: -8, sprite: () => sprite('jar', 16, 24, (c) => {
    R(c, 1, 10, 14, 13, '#8a6448'); R(c, 1, 10, 14, 2, '#a8805e'); R(c, 3, 15, 10, 1, '#6b4a33'); R(c, 7, 17, 2, 1, '#e6c07a');
    R(c, 4, 2, 8, 9, '#c8e3e6'); R(c, 5, 1, 6, 2, '#9aa7b0'); R(c, 5, 6, 6, 4, '#f2c14e'); R(c, 6, 5, 2, 1, '#f2c14e'); R(c, 5, 3, 1, 5, '#ffffff');
  }) };
  TYPES.laptop = { w: 1, h: 1, ox: 0, oy: -2, hit: { x: 2, y: 8, w: 12, h: 6 }, sprite: () => sprite('laptop', 16, 18, (c) => {
    R(c, 3, 2, 10, 8, '#2a2a3a'); R(c, 4, 3, 8, 6, '#4f86d6'); R(c, 5, 4, 4, 1, '#d9e6ff'); R(c, 5, 6, 6, 1, '#d9e6ff'); R(c, 1, 10, 14, 3, '#8f8f98'); R(c, 1, 12, 14, 1, '#6b6b73');
  }) };
  TYPES.clothes = { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: () => sprite('clothes', 16, 16, (c) => {
    L.blob(c, 7, 10, 5, ['#6a8fc4', '#4f6b8a', '#3f5670']); R(c, 9, 7, 5, 4, '#c46a5a'); R(c, 3, 12, 4, 2, '#e9e6dd');
  }) };
  TYPES.poster = { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: () => sprite('poster', 16, 16, (c) => {
    R(c, 3, 2, 10, 12, '#2a2a3a'); R(c, 4, 3, 8, 6, '#d64545'); R(c, 6, 4, 4, 4, '#f2c14e'); R(c, 5, 10, 6, 1, '#e9e6dd'); R(c, 5, 12, 4, 1, '#e9e6dd');
  }, false) };
  TYPES.bagpack = { w: 1, h: 1, ox: 0, oy: -2, hit: { x: 3, y: 6, w: 10, h: 8 }, sprite: () => sprite('bagpack', 16, 18, (c) => {
    R(c, 3, 4, 10, 12, '#3f5a8a'); R(c, 3, 4, 10, 2, '#5a7aa8'); R(c, 5, 9, 6, 5, '#2f4a6c'); R(c, 6, 1, 4, 4, '#2f4a6c'); R(c, 7, 2, 2, 2, '#3f5a8a');
  }) };
  TYPES.grill = { w: 2, h: 1, ox: 0, oy: -10, sprite: () => sprite('grill', 32, 26, (c) => {
    R(c, 0, 8, 32, 18, '#77777f'); R(c, 0, 8, 32, 2, '#a9a59b'); R(c, 2, 11, 28, 6, '#2a2a30');
    for (let x = 4; x < 28; x += 5) { R(c, x, 12, 3, 2, '#c97a3a'); R(c, x + 1, 14, 2, 2, '#e6c07a'); }
    R(c, 2, 19, 28, 5, '#5a5a62'); R(c, 6, 20, 4, 2, '#e05a4f'); R(c, 12, 20, 4, 2, '#f2c14e');
    R(c, 3, 0, 26, 8, '#9aa7b0'); R(c, 4, 1, 24, 2, '#c4cdd3');
  }) };
  TYPES.menuboard = { w: 2, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: () => sprite('menuboard', 32, 16, (c) => {
    R(c, 1, 1, 30, 13, '#2a2a30'); R(c, 2, 2, 28, 11, '#3a3a40');
    for (let y = 4; y < 12; y += 3) { R(c, 4, y, 12, 1, '#e9e6dd'); R(c, 22, y, 5, 1, '#f2c14e'); }
  }, false) };
})(window.LIFE);
