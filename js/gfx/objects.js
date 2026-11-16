// LIFE | حياة — رسومات الأشياء والمباني والأثاث
// كل نوع يعرّف: حجم القاعدة (w,h بالبلاطات)، دالة رسم، صندوق تصادم، إضاءة، وتفاعل.
(function (L) {
  'use strict';
  const T = L.TILE;
  const R = L.rect;
  const OUT = '#2a2030';

  const cache = {};
  function sprite(key, w, h, draw, outline) {
    if (cache[key]) return cache[key];
    const [c, ctx] = L.makeCanvas(w, h);
    draw(ctx, c);
    if (outline !== false) L.outline(c, OUT);
    cache[key] = c;
    return c;
  }

  function shadowEllipse(ctx, cx, cy, rx, ry, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'rgba(20,30,20,' + (a || 0.22) + ')';
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01)));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
    ctx.restore();
  }

  function goods(ctx, x, y, w, seed) {
    const rnd = L.rng(seed);
    const cols = ['#e05a4f', '#f2c14e', '#5bb36a', '#4f86d6', '#f08fb0', '#ffffff', '#c98a4b', '#8e6bd1'];
    let cx = x;
    while (cx < x + w - 2) {
      const iw = 2 + Math.floor(rnd() * 2), ih = 3 + Math.floor(rnd() * 3);
      const col = cols[Math.floor(rnd() * cols.length)];
      R(ctx, cx, y - ih, iw, ih, col);
      R(ctx, cx, y - ih, 1, ih, 'rgba(255,255,255,0.35)');
      cx += iw + 1;
    }
  }

  // ---------------- الطبيعة والشارع ----------------
  const TREE_COLORS = [
    ['#7cc464', '#4f9c4a', '#357343'],
    ['#8ccf6a', '#5daa50', '#3c7f45'],
    ['#6fb35e', '#468c48', '#2f663d'],
  ];
  function makeTree(v) {
    return sprite('tree' + v, 32, 40, (ctx, c) => {
      const rnd = L.rng(1000 + v * 17);
      R(ctx, 13, 24, 6, 13, '#7a4b2a');
      R(ctx, 13, 24, 2, 13, '#91603a');
      R(ctx, 17, 24, 2, 13, '#5e3920');
      R(ctx, 11, 35, 10, 2, '#6a4024');
      const col = TREE_COLORS[v % 3];
      L.blob(ctx, 16, 17, 11, col, rnd);
      L.blob(ctx, 9, 20, 7.5, col, rnd);
      L.blob(ctx, 23, 20, 7.5, col, rnd);
      L.blob(ctx, 16, 9, 8.5, col, rnd);
      // لمعة
      for (let i = 0; i < 6; i++) R(ctx, 9 + Math.floor(rnd() * 12), 5 + Math.floor(rnd() * 12), 1, 1, '#a6dc86');
      if (v === 1) for (let i = 0; i < 5; i++) R(ctx, 6 + Math.floor(rnd() * 20), 10 + Math.floor(rnd() * 14), 2, 2, '#e8564a');
      L.outline(c, '#22382a');
      shadowEllipse(ctx, 16, 37, 10, 3);
    }, false);
  }

  function makeBush(v) {
    return sprite('bush' + v, 16, 16, (ctx, c) => {
      const rnd = L.rng(2000 + v);
      const col = ['#7cc464', '#4f9c4a', '#357343'];
      L.blob(ctx, 8, 8, 6.5, col, rnd);
      L.blob(ctx, 4.5, 10.5, 4, col, rnd);
      L.blob(ctx, 11.5, 10.5, 4, col, rnd);
      if (v % 2) for (let i = 0; i < 4; i++) R(ctx, 3 + Math.floor(rnd() * 10), 5 + Math.floor(rnd() * 7), 1, 1, '#f59fb7');
      L.outline(c, '#22382a');
      shadowEllipse(ctx, 8, 14, 7, 2);
    }, false);
  }

  function makeFlowers(v) {
    return sprite('flowers' + v, 16, 16, (ctx) => {
      const rnd = L.rng(3000 + v);
      const cols = [['#f59fb7', '#e2678c'], ['#ffd447', '#f0a020'], ['#fff4d6', '#d9cfb0'], ['#b08cf0', '#8a63d2']];
      for (let i = 0; i < 6; i++) {
        const x = 2 + Math.floor(rnd() * 11), y = 3 + Math.floor(rnd() * 10);
        const c = cols[(v + i) % cols.length];
        R(ctx, x, y + 2, 1, 2, '#3f8a46');
        R(ctx, x - 1, y, 3, 1, c[0]); R(ctx, x, y - 1, 1, 3, c[0]); R(ctx, x, y, 1, 1, c[1]);
      }
    }, false);
  }

  function makeLamp() {
    return sprite('lamp', 16, 36, (ctx) => {
      R(ctx, 7, 8, 2, 25, '#3d4250');
      R(ctx, 7, 8, 1, 25, '#596070');
      R(ctx, 5, 31, 6, 4, '#3d4250');
      R(ctx, 5, 31, 6, 1, '#596070');
      R(ctx, 4, 2, 8, 4, '#3d4250');
      R(ctx, 5, 1, 6, 1, '#3d4250');
      R(ctx, 5, 6, 6, 3, '#ffe9a6');
      R(ctx, 5, 6, 2, 3, '#fff7d6');
    });
  }

  function makeBench() {
    return sprite('bench', 32, 20, (ctx) => {
      R(ctx, 2, 2, 28, 3, '#a86e3c'); R(ctx, 2, 2, 28, 1, '#c98a4b');
      R(ctx, 2, 6, 28, 3, '#a86e3c'); R(ctx, 2, 6, 28, 1, '#c98a4b');
      R(ctx, 1, 10, 30, 4, '#b97c45'); R(ctx, 1, 10, 30, 1, '#d69a5c');
      R(ctx, 3, 14, 2, 5, '#3d4250'); R(ctx, 27, 14, 2, 5, '#3d4250');
      R(ctx, 3, 2, 2, 9, '#3d4250'); R(ctx, 27, 2, 2, 9, '#3d4250');
    });
  }

  function makeMailbox() {
    return sprite('mailbox', 16, 22, (ctx) => {
      R(ctx, 7, 12, 2, 9, '#6b4a33');
      R(ctx, 3, 4, 10, 8, '#3f6fc6'); R(ctx, 3, 4, 10, 2, '#5e8de0'); R(ctx, 3, 10, 10, 2, '#2f539a');
      R(ctx, 4, 3, 8, 1, '#3f6fc6');
      R(ctx, 5, 7, 6, 1, '#1f2f55');
      R(ctx, 12, 2, 2, 5, '#e0473f'); R(ctx, 13, 2, 2, 2, '#e0473f');
    });
  }

  function makeSign() {
    return sprite('sign', 24, 24, (ctx) => {
      R(ctx, 5, 12, 2, 11, '#6b4a33'); R(ctx, 17, 12, 2, 11, '#6b4a33');
      R(ctx, 1, 2, 22, 12, '#b97c45'); R(ctx, 1, 2, 22, 2, '#d69a5c'); R(ctx, 1, 12, 22, 2, '#8a5530');
      R(ctx, 4, 6, 16, 1, '#fff1d6'); R(ctx, 6, 9, 12, 1, '#fff1d6');
      R(ctx, 3, 5, 1, 1, '#ffd447');
    });
  }

  function makeFence() {
    return sprite('fence', 16, 16, (ctx) => {
      R(ctx, 0, 5, 16, 2, '#f1e7d4'); R(ctx, 0, 10, 16, 2, '#f1e7d4');
      R(ctx, 0, 7, 16, 1, '#c9bba2'); R(ctx, 0, 12, 16, 1, '#c9bba2');
      R(ctx, 2, 2, 3, 13, '#fbf5ea'); R(ctx, 11, 2, 3, 13, '#fbf5ea');
      R(ctx, 4, 2, 1, 13, '#c9bba2'); R(ctx, 13, 2, 1, 13, '#c9bba2');
    });
  }

  // ---------------- المباني ----------------
  const HOUSE_STYLES = {
    red: { roof: '#c8553f', roofD: '#9a3d2f', roofL: '#de7356', wall: '#efdcbc', wallD: '#dcc59f', door: '#8a5532' },
    blue: { roof: '#4f78b8', roofD: '#365a8f', roofL: '#6f96d2', wall: '#f3ead8', wallD: '#ded2b8', door: '#6b4a33' },
    green: { roof: '#5a9a5c', roofD: '#3f7444', roofL: '#7bb876', wall: '#f1e2c6', wallD: '#dccba8', door: '#7a3f2c' },
    purple: { roof: '#8a64b0', roofD: '#664788', roofL: '#a784cb', wall: '#efe4d4', wallD: '#dacdb8', door: '#5a3a24' },
  };

  function drawWindow(ctx, x, y, w, h) {
    R(ctx, x - 1, y - 1, w + 2, h + 2, '#f6f1e8');
    R(ctx, x, y, w, h, '#86cbe8');
    for (let i = 0; i < 4; i++) R(ctx, x + 1 + i, y + h - 2 - i, 1, 1, '#c8eefa');
    R(ctx, x + 2, y + 1, 2, 1, '#c8eefa');
    R(ctx, x + Math.floor(w / 2), y, 1, h, '#f6f1e8');
    R(ctx, x, y + Math.floor(h / 2), w, 1, '#f6f1e8');
    R(ctx, x - 2, y + h + 1, w + 4, 2, '#d5c9b6');
  }

  function makeHouse(w, h, style, doorCol, windows) {
    const S = HOUSE_STYLES[style] || HOUSE_STYLES.red;
    const W = w * T + 8, H = h * T + 8;
    return sprite('house_' + w + h + style + doorCol + windows.join(','), W, H, (ctx) => {
      const roofH = 8 + 2 * T; // 40
      // الجدار
      R(ctx, 4, roofH, w * T, H - roofH, S.wall);
      for (let y = roofH + 3; y < H - 4; y += 4) R(ctx, 4, y, w * T, 1, S.wallD);
      R(ctx, 4, roofH, 3, H - roofH, S.wallD); R(ctx, W - 7, roofH, 3, H - roofH, S.wallD);
      R(ctx, 4, H - 5, w * T, 5, '#9d968c');
      for (let x = 6; x < W - 6; x += 7) R(ctx, x, H - 5, 1, 5, '#837c72');
      R(ctx, 4, H - 5, w * T, 1, '#b8b1a6');
      // السقف
      for (let y = 0; y < roofH; y++) {
        const inset = y < 10 ? 10 - y : 0;
        R(ctx, inset, y, W - inset * 2, 1, S.roof);
      }
      for (let y = 4; y < roofH - 3; y += 5) {
        const inset = y < 10 ? 10 - y : 0;
        R(ctx, inset, y, W - inset * 2, 1, S.roofD);
        const off = (y / 5) % 2 ? 0 : 4;
        for (let x = inset + off; x < W - inset; x += 8) R(ctx, x, y - 4, 1, 4, S.roofD);
        R(ctx, inset, y - 3, W - inset * 2, 1, S.roofL);
      }
      R(ctx, 10, 0, W - 20, 2, S.roofL);
      R(ctx, 0, roofH - 4, W, 4, S.roofD);
      R(ctx, 0, roofH - 4, W, 1, S.roof);
      ctx.fillStyle = 'rgba(30,20,20,0.25)'; ctx.fillRect(4, roofH, w * T, 3);
      // مدخنة
      R(ctx, W - 30, 0, 9, 13, '#9a5a45'); R(ctx, W - 31, 0, 11, 3, '#6e3f31');
      R(ctx, W - 29, 5, 3, 1, '#7a4636'); R(ctx, W - 25, 9, 3, 1, '#7a4636');
      // النوافذ
      windows.forEach((col) => {
        const x = 4 + col * T + 2, y = roofH + 9;
        drawWindow(ctx, x, y, 12, 11);
        R(ctx, x - 1, y + 14, 14, 3, '#7a4b2a');
        for (let i = 0; i < 6; i++) R(ctx, x + i * 2, y + 13, 1, 1, i % 2 ? '#f59fb7' : '#5bb36a');
      });
      // الباب
      const dx = 4 + doorCol * T + 2, dy = H - 25;
      R(ctx, dx - 1, dy - 1, 14, 22, '#5a3a24');
      R(ctx, dx, dy, 12, 20, S.door);
      R(ctx, dx + 2, dy + 2, 8, 6, 'rgba(255,255,255,0.12)');
      R(ctx, dx + 2, dy + 11, 8, 6, 'rgba(255,255,255,0.12)');
      R(ctx, dx + 9, dy + 10, 2, 2, '#f2c14e');
      R(ctx, dx - 2, H - 5, 16, 2, '#c9c2b6');
      // مصباح الباب
      R(ctx, dx + 13, dy + 2, 3, 4, '#ffe9a6'); R(ctx, dx + 13, dy + 1, 3, 1, '#3d4250');
    });
  }

  function makeShop() {
    const w = 7, h = 6, W = w * T + 8, H = h * T + 8; // 120 x 104
    return sprite('shop', W, H, (ctx) => {
      // السطح
      R(ctx, 0, 6, W, 26, '#b56a4e');
      for (let y = 10; y < 30; y += 5) R(ctx, 0, y, W, 1, '#9a5640');
      R(ctx, 0, 2, W, 5, '#e8dcc4'); R(ctx, 0, 2, W, 1, '#fff6e6'); R(ctx, 0, 6, W, 1, '#c4b597');
      // الواجهة
      R(ctx, 4, 32, W - 8, H - 32, '#f4e8d0');
      for (let y = 36; y < H - 4; y += 6) R(ctx, 4, y, W - 8, 1, '#e7d8bb');
      R(ctx, 4, H - 5, W - 8, 5, '#9d968c'); R(ctx, 4, H - 5, W - 8, 1, '#b8b1a6');
      // اللافتة
      R(ctx, 14, 28, W - 28, 16, '#3d7a5a'); R(ctx, 14, 28, W - 28, 2, '#5aa07a'); R(ctx, 14, 42, W - 28, 2, '#2c5a42');
      // أيقونة كيس تسوق
      R(ctx, 24, 32, 9, 8, '#f2c14e'); R(ctx, 26, 30, 1, 3, '#f2c14e'); R(ctx, 30, 30, 1, 3, '#f2c14e'); R(ctx, 26, 30, 5, 1, '#f2c14e');
      R(ctx, 24, 32, 9, 1, '#ffe08a');
      R(ctx, 38, 33, 50, 2, '#fff6e6'); R(ctx, 38, 38, 36, 2, '#fff6e6');
      R(ctx, 92, 32, 6, 6, '#e05a4f'); R(ctx, 94, 31, 2, 1, '#5bb36a');
      // المظلة المخططة
      for (let x = 4; x < W - 4; x += 8) {
        R(ctx, x, 47, 4, 10, '#d64545');
        R(ctx, x + 4, 47, 4, 10, '#f7efe0');
        R(ctx, x + 1, 57, 2, 2, '#d64545');
        R(ctx, x + 5, 57, 2, 2, '#f7efe0');
      }
      R(ctx, 4, 46, W - 8, 1, '#9a2e2e');
      ctx.fillStyle = 'rgba(40,20,10,0.18)'; ctx.fillRect(4, 59, W - 8, 3);
      // واجهات العرض
      const win = (x, y, ww, hh) => {
        R(ctx, x - 2, y - 2, ww + 4, hh + 4, '#5a6b7a');
        R(ctx, x, y, ww, hh, '#9fd8ee');
        goods(ctx, x + 2, y + hh - 9, ww - 4, x * 7);
        R(ctx, x + 1, y + hh - 9, ww - 2, 1, '#d9b27c');
        goods(ctx, x + 2, y + hh - 1, ww - 4, x * 13);
        for (let i = 0; i < 6; i++) R(ctx, x + 3 + i, y + 2 + i, 1, 1, 'rgba(255,255,255,0.6)');
      };
      win(10, 66, 22, 30);
      win(58, 66, 54, 30);
      // باب زجاجي
      const dx = 4 + 2 * T + 1, dy = H - 31;
      R(ctx, dx - 1, dy - 1, 16, 28, '#4a5866');
      R(ctx, dx, dy, 14, 26, '#a9dcef');
      R(ctx, dx + 7, dy, 1, 26, '#4a5866');
      R(ctx, dx + 2, dy + 12, 3, 1, '#d6d6d6'); R(ctx, dx + 9, dy + 12, 3, 1, '#d6d6d6');
      for (let i = 0; i < 5; i++) R(ctx, dx + 2 + i, dy + 3 + i, 1, 1, 'rgba(255,255,255,0.7)');
      // لوحة "مفتوح"
      R(ctx, dx + 2, dy + 5, 10, 4, '#fff6e6'); R(ctx, dx + 3, dy + 6, 8, 2, '#5bb36a');
    });
  }

  // ---------------- الأثاث الداخلي ----------------
  function makeBed() {
    return sprite('bed', 16, 34, (ctx) => {
      R(ctx, 0, 0, 16, 9, '#8a5530'); R(ctx, 1, 1, 14, 2, '#a86e3c');
      R(ctx, 1, 7, 14, 26, '#f4efe6');
      R(ctx, 3, 9, 10, 5, '#ffffff'); R(ctx, 3, 13, 10, 1, '#d9d2c4');
      R(ctx, 1, 16, 14, 16, '#4f7ccf'); R(ctx, 1, 16, 14, 2, '#7aa0e0');
      for (let y = 20; y < 31; y += 4) R(ctx, 1, y, 14, 1, '#3f67b0');
      R(ctx, 0, 30, 16, 4, '#8a5530');
    });
  }
  function makeNightstand() {
    return sprite('nightstand', 16, 22, (ctx) => {
      R(ctx, 1, 9, 14, 12, '#a86e3c'); R(ctx, 1, 9, 14, 2, '#c98a4b'); R(ctx, 3, 14, 10, 1, '#7a4b2a'); R(ctx, 7, 16, 2, 1, '#f2c14e');
      R(ctx, 6, 6, 4, 3, '#6b4a33');
      R(ctx, 4, 0, 8, 6, '#ffd98a'); R(ctx, 4, 0, 8, 1, '#fff0c4');
    });
  }
  function makePlant() {
    return sprite('plant', 16, 26, (ctx, c) => {
      const rnd = L.rng(77);
      L.blob(ctx, 8, 9, 6, ['#7cc464', '#4f9c4a', '#357343'], rnd);
      L.blob(ctx, 4, 12, 4, ['#7cc464', '#4f9c4a', '#357343'], rnd);
      L.blob(ctx, 12, 12, 4, ['#7cc464', '#4f9c4a', '#357343'], rnd);
      R(ctx, 4, 16, 8, 9, '#c4673f'); R(ctx, 3, 16, 10, 2, '#d9805a'); R(ctx, 9, 18, 2, 6, '#a65232');
    });
  }
  function makeTV() {
    return sprite('tv', 32, 28, (ctx) => {
      R(ctx, 1, 16, 30, 11, '#8a5530'); R(ctx, 1, 16, 30, 2, '#a86e3c'); R(ctx, 15, 19, 2, 6, '#6b4a33');
      R(ctx, 5, 1, 22, 14, '#2b2d3a'); R(ctx, 7, 3, 18, 10, '#3c6a8c');
      R(ctx, 8, 4, 6, 1, '#7fb5d6'); R(ctx, 8, 5, 3, 1, '#7fb5d6');
      R(ctx, 14, 15, 4, 1, '#2b2d3a');
    });
  }
  function makeBookshelf() {
    return sprite('bookshelf', 16, 32, (ctx) => {
      R(ctx, 0, 0, 16, 32, '#8a5530'); R(ctx, 1, 1, 14, 30, '#6b4024');
      for (let s = 0; s < 3; s++) {
        const y = 2 + s * 10;
        R(ctx, 1, y + 8, 14, 2, '#a86e3c');
        const rnd = L.rng(500 + s);
        let x = 2;
        while (x < 14) {
          const bw = 1 + Math.floor(rnd() * 2), bh = 5 + Math.floor(rnd() * 3);
          R(ctx, x, y + 8 - bh, bw, bh, ['#d64545', '#4f86d6', '#f2c14e', '#5bb36a', '#e8dcc4', '#8e6bd1'][Math.floor(rnd() * 6)]);
          x += bw + (rnd() < 0.2 ? 1 : 0);
        }
      }
    });
  }
  function makeFridge(kind) {
    return sprite('fridge' + kind, 16, 30, (ctx) => {
      if (kind === 'drinks') {
        R(ctx, 0, 0, 16, 30, '#3d6fa8'); R(ctx, 0, 0, 16, 3, '#5a8cc6');
        R(ctx, 2, 4, 12, 24, '#bfe6f5');
        for (let s = 0; s < 3; s++) {
          const y = 11 + s * 7;
          R(ctx, 2, y, 12, 1, '#7fa9c0');
          for (let i = 0; i < 4; i++) R(ctx, 3 + i * 3, y - 5, 2, 5, ['#e05a4f', '#5bb36a', '#f2c14e', '#ffffff'][(i + s) % 4]);
        }
        R(ctx, 3, 5, 1, 20, 'rgba(255,255,255,0.6)');
        R(ctx, 3, 0, 10, 2, '#e05a4f');
      } else {
        R(ctx, 1, 0, 14, 30, '#e8eef2'); R(ctx, 11, 0, 4, 30, '#c9d3da');
        R(ctx, 1, 10, 14, 1, '#9aa7b0');
        R(ctx, 3, 4, 1, 4, '#9aa7b0'); R(ctx, 3, 13, 1, 6, '#9aa7b0');
        R(ctx, 6, 3, 3, 3, '#f2c14e'); R(ctx, 7, 14, 3, 3, '#e05a4f');
      }
    });
  }
  function makeStove() {
    return sprite('stove', 16, 22, (ctx) => {
      R(ctx, 1, 0, 14, 22, '#eef0f2'); R(ctx, 1, 0, 14, 8, '#d0d5da');
      R(ctx, 3, 2, 4, 2, '#2b2d3a'); R(ctx, 9, 2, 4, 2, '#2b2d3a'); R(ctx, 3, 5, 4, 2, '#2b2d3a'); R(ctx, 9, 5, 4, 2, '#2b2d3a');
      R(ctx, 3, 11, 10, 8, '#3a3f4a'); R(ctx, 4, 12, 8, 1, '#5a6070'); R(ctx, 3, 9, 10, 1, '#9aa7b0');
    });
  }
  function makeSofa() {
    return sprite('sofa', 32, 20, (ctx) => {
      R(ctx, 0, 4, 32, 15, '#c0644f'); R(ctx, 0, 4, 32, 2, '#d9806a');
      R(ctx, 0, 4, 5, 15, '#a8513f'); R(ctx, 27, 4, 5, 15, '#a8513f');
      R(ctx, 5, 12, 22, 6, '#d9806a'); R(ctx, 16, 12, 1, 6, '#a8513f');
      R(ctx, 2, 18, 3, 2, '#5a3a24'); R(ctx, 27, 18, 3, 2, '#5a3a24');
    });
  }
  function makeTable() {
    return sprite('table', 32, 22, (ctx) => {
      R(ctx, 1, 2, 30, 11, '#c48f5a'); R(ctx, 1, 2, 30, 2, '#d9a873'); R(ctx, 1, 12, 30, 3, '#8f5f33');
      R(ctx, 3, 15, 3, 6, '#8f5f33'); R(ctx, 26, 15, 3, 6, '#8f5f33');
      R(ctx, 6, 5, 6, 4, '#ffffff'); R(ctx, 7, 6, 4, 2, '#f2c14e');
      R(ctx, 20, 3, 4, 6, '#4f86d6'); R(ctx, 21, 1, 2, 3, '#5bb36a'); R(ctx, 20, 0, 2, 2, '#f59fb7'); R(ctx, 22, 0, 2, 2, '#ffd447');
    });
  }
  function makeRug() {
    return sprite('rug', 48, 32, (ctx) => {
      R(ctx, 0, 0, 48, 32, '#7c3f5e'); R(ctx, 2, 2, 44, 28, '#a85a7e');
      R(ctx, 5, 5, 38, 22, '#e7c58a'); R(ctx, 7, 7, 34, 18, '#a85a7e');
      for (let i = 0; i < 6; i++) R(ctx, 10 + i * 5, 14, 3, 3, '#e7c58a');
      for (let x = 0; x < 48; x += 3) { R(ctx, x, 0, 1, 1, '#e7c58a'); R(ctx, x, 31, 1, 1, '#e7c58a'); }
    }, false);
  }
  function makeWallWindow() {
    return sprite('wallwindow', 16, 16, (ctx) => {
      R(ctx, 2, 2, 12, 11, '#f6f1e8'); R(ctx, 3, 3, 10, 9, '#9fd8ee');
      R(ctx, 4, 9, 3, 2, '#c8eefa'); R(ctx, 8, 3, 1, 9, '#f6f1e8');
      R(ctx, 1, 1, 3, 13, '#d6705f'); R(ctx, 12, 1, 3, 13, '#d6705f'); R(ctx, 1, 1, 14, 2, '#b55345');
    }, false);
  }
  function makePainting() {
    return sprite('painting', 16, 16, (ctx) => {
      R(ctx, 2, 3, 12, 10, '#c9a14a'); R(ctx, 3, 4, 10, 8, '#8fd0e8');
      R(ctx, 3, 9, 10, 3, '#5bb36a'); R(ctx, 9, 5, 2, 2, '#ffd447'); R(ctx, 5, 7, 3, 2, '#4f9c4a');
    }, false);
  }
  function makeClock() {
    return sprite('clock', 16, 16, (ctx) => {
      R(ctx, 4, 3, 8, 9, '#6b4a33'); R(ctx, 5, 4, 6, 7, '#fff6e6');
      R(ctx, 7, 5, 1, 3, '#2b2233'); R(ctx, 8, 7, 2, 1, '#2b2233');
    }, false);
  }
  function makeCounter() {
    return sprite('counter', 48, 24, (ctx) => {
      R(ctx, 0, 6, 48, 8, '#d9b27c'); R(ctx, 0, 6, 48, 2, '#ecc995');
      R(ctx, 0, 14, 48, 10, '#a86e3c');
      for (let x = 2; x < 46; x += 11) R(ctx, x, 16, 9, 6, '#b97c45');
      R(ctx, 32, 0, 11, 7, '#596070'); R(ctx, 33, 1, 6, 3, '#7fe0a0'); R(ctx, 31, 6, 13, 2, '#3d4250');
      R(ctx, 6, 3, 8, 4, '#f2c14e'); R(ctx, 6, 3, 8, 1, '#ffe08a');
    });
  }
  function makeWallShelf(w) {
    return sprite('wallshelf' + w, w * T, 30, (ctx) => {
      const W = w * T;
      R(ctx, 0, 0, W, 30, '#7a4b2a'); R(ctx, 1, 1, W - 2, 28, '#5e3920');
      for (let s = 0; s < 3; s++) {
        const y = 9 + s * 9;
        R(ctx, 1, y, W - 2, 2, '#a86e3c');
        goods(ctx, 3, y, W - 5, 900 + s * 31 + w);
      }
    });
  }
  function makeShelf() {
    return sprite('shelf', 32, 28, (ctx) => {
      R(ctx, 0, 2, 32, 25, '#9aa7b0'); R(ctx, 1, 3, 30, 23, '#e6ebee');
      R(ctx, 1, 13, 30, 2, '#9aa7b0'); R(ctx, 1, 24, 30, 2, '#9aa7b0');
      goods(ctx, 3, 13, 27, 41); goods(ctx, 3, 24, 27, 42);
      R(ctx, 0, 2, 32, 2, '#c4cdd3');
    });
  }
  function makeCrate() {
    return sprite('crate', 16, 18, (ctx) => {
      R(ctx, 1, 5, 14, 12, '#b97c45'); R(ctx, 1, 5, 14, 2, '#d69a5c'); R(ctx, 1, 11, 14, 1, '#8a5530');
      R(ctx, 3, 2, 3, 3, '#e05a4f'); R(ctx, 6, 1, 3, 4, '#e8564a'); R(ctx, 9, 2, 3, 3, '#5bb36a'); R(ctx, 12, 3, 2, 2, '#e05a4f');
    });
  }

  // ---------------- سجل الأنواع ----------------
  // ox/oy: إزاحة الرسم عن الزاوية العليا للقاعدة. hit: صندوق التصادم (بكسل، نسبة للقاعدة).
  const TYPES = {
    tree: { w: 1, h: 1, ox: -8, oy: -24, hit: { x: 3, y: 6, w: 10, h: 9 }, sprite: (o) => makeTree(o.v || 0) },
    bush: { w: 1, h: 1, ox: 0, oy: 0, hit: { x: 1, y: 5, w: 14, h: 10 }, sprite: (o) => makeBush(o.v || 0) },
    flowers: { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: (o) => makeFlowers(o.v || 0) },
    lamp: { w: 1, h: 1, ox: 0, oy: -20, hit: { x: 5, y: 10, w: 6, h: 5 }, light: { x: 8, y: -13, r: 60 }, sprite: makeLamp },
    bench: { w: 2, h: 1, ox: 0, oy: -4, hit: { x: 1, y: 3, w: 30, h: 12 }, sprite: makeBench,
      interact: { label: 'الجلوس على المقعد', action: 'bench' } },
    mailbox: { w: 1, h: 1, ox: 0, oy: -6, hit: { x: 4, y: 6, w: 8, h: 9 }, sprite: makeMailbox,
      interact: { label: 'فتح صندوق البريد', action: 'mailbox' } },
    sign: { w: 1, h: 1, ox: -4, oy: -8, hit: { x: 1, y: 8, w: 14, h: 7 }, sprite: makeSign,
      interact: { label: 'قراءة اللافتة', action: 'sign' } },
    fence: { w: 1, h: 1, ox: 0, oy: 0, hit: { x: 0, y: 6, w: 16, h: 8 }, sprite: makeFence },
    house: {
      ox: -4, oy: -8, sprite: (o) => makeHouse(o.w, o.h, o.style, o.doorCol, o.windows),
      windows: (o) => o.windows.map((col) => ({ x: col * T + 2, y: 2 * T + 9, w: 12, h: 11 })),
    },
    shop: { w: 7, h: 6, ox: -4, oy: -8, sprite: makeShop,
      windows: () => [{ x: 6, y: 58, w: 22, h: 30 }, { x: 54, y: 58, w: 54, h: 30 }] },
    bed: { w: 1, h: 2, ox: 0, oy: -2, sprite: makeBed, interact: { label: 'النوم', action: 'bed' } },
    nightstand: { w: 1, h: 1, ox: 0, oy: -6, sprite: makeNightstand, light: { x: 8, y: -3, r: 34, warm: true } },
    plant: { w: 1, h: 1, ox: 0, oy: -10, hit: { x: 3, y: 4, w: 10, h: 11 }, sprite: makePlant },
    tv: { w: 2, h: 1, ox: 0, oy: -12, sprite: makeTV, interact: { label: 'مشاهدة التلفاز', action: 'tv' } },
    bookshelf: { w: 1, h: 1, ox: 0, oy: -16, sprite: makeBookshelf, interact: { label: 'تصفح الكتب', action: 'books' } },
    fridge: { w: 1, h: 1, ox: 0, oy: -14, sprite: () => makeFridge('home'), interact: { label: 'فتح الثلاجة', action: 'fridge' } },
    stove: { w: 1, h: 1, ox: 0, oy: -6, sprite: makeStove, interact: { label: 'استخدام الموقد', action: 'stove' } },
    sofa: { w: 2, h: 1, ox: 0, oy: -4, hit: { x: 0, y: 2, w: 32, h: 14 }, sprite: makeSofa },
    table: { w: 2, h: 1, ox: 0, oy: -6, hit: { x: 1, y: 0, w: 30, h: 14 }, sprite: makeTable },
    rug: { w: 3, h: 2, ox: 0, oy: 0, flat: true, solid: false, sprite: makeRug },
    wallwindow: { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: makeWallWindow },
    painting: { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: makePainting },
    clock: { w: 1, h: 1, ox: 0, oy: 0, flat: true, solid: false, sprite: makeClock },
    counter: { w: 3, h: 1, ox: 0, oy: -8, sprite: makeCounter, interact: { label: 'التحدث مع البائع', action: 'shop' } },
    wallshelf: { w: 3, h: 1, ox: 0, oy: -14, sprite: (o) => makeWallShelf(o.w || 3) },
    shelf: { w: 2, h: 1, ox: 0, oy: -12, hit: { x: 0, y: 0, w: 32, h: 15 }, sprite: makeShelf,
      interact: { label: 'تفقد الرفوف', action: 'shelf' } },
    drinkfridge: { w: 1, h: 1, ox: 0, oy: -16, sprite: () => makeFridge('drinks'), interact: { label: 'تفقد المشروبات', action: 'shelf' } },
    crate: { w: 1, h: 1, ox: 0, oy: -2, sprite: makeCrate },
  };

  L.Objects = { TYPES, makeTree, makeBush, helpers: { sprite, shadowEllipse, goods, drawWindow } };
})(window.LIFE);
