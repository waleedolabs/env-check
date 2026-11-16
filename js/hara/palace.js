// حارتنا — قصر صاحب الصفحة: طراز دمشقي (حجر أبلق، قبة دهب، مشربيات، ياسمين)
(function (L) {
  'use strict';
  const T = L.TILE, R = L.rect;
  const sprite = L.Objects.helpers.sprite;

  // مكانه: بلوك كامل جنب الساحة بالدولة 1 (21×6 بلاطات)
  const BLOCK = { c: 2, r: 2 };
  const PLOT_ID = 'd1-palace';

  const STONE = '#efe2c4', STONE_L = '#fbf3df', STONE_D = '#d2c09a', BASALT = '#4a424a', BASALT_L = '#5f565f';
  const GOLD = '#f2c14e', GOLD_D = '#c48f2a', GOLD_L = '#ffe69a';
  const WOOD = '#7a4a2a', WOOD_D = '#5a3420', LIT = '#e9b56a';

  // قوس مدبب: نص العرض لكل سطر
  function archHalf(w, ah, yy) { if (yy >= ah) return w / 2; const t = (yy + 1) / ah; return (w / 2) * Math.sqrt(1 - (1 - t) * (1 - t)); }
  function arch(ctx, x, y, w, h, col) {
    const ah = Math.round(w * 0.8);
    for (let yy = 0; yy < h; yy++) { const hw = Math.round(archHalf(w, ah, yy)); if (hw > 0) R(ctx, x + w / 2 - hw, y + yy, hw * 2, 1, col); }
  }
  // حلقة حجارة أبيض وأسود متناوبة حوالين القوس (أبلق)
  function archRing(ctx, x, y, w, h, th) {
    const ah = Math.round(w * 0.8), iw = w - th * 2, iah = Math.round(iw * 0.8), cx = x + w / 2;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const px = x + xx + 0.5;
      const outer = Math.abs(px - cx) < archHalf(w, ah, yy);
      const iy = yy - th, inner = iy >= 0 && Math.abs(px - cx) < archHalf(iw, iah, iy);
      if (!outer || inner) continue;
      const a = Math.atan2(y + ah - (y + yy), px - cx);
      const k = yy >= ah ? Math.floor((yy - ah) / 7) + 1 : Math.floor((a + Math.PI) / (Math.PI / 7));
      R(ctx, x + xx, y + yy, 1, 1, k % 2 ? BASALT : STONE_L);
    }
  }
  // مداميك حجر: أبيض عريض وأسود رفيع
  function ablaq(ctx, x, y, w, h, dark) {
    R(ctx, x, y, w, h, STONE);
    for (let yy = y; yy < y + h; yy += 9) {
      R(ctx, x, yy, w, 1, STONE_L);
      if (((yy - y) / 9) % 2 === 1 || dark) R(ctx, x, yy + 6, w, 3, BASALT); else R(ctx, x, yy + 8, w, 1, STONE_D);
    }
    // فواصل حجارة
    for (let yy = y, i = 0; yy < y + h; yy += 9, i++) for (let xx = x + (i % 2 ? 6 : 1); xx < x + w; xx += 13) R(ctx, xx, yy + 1, 1, 5, STONE_D);
  }
  // مشربية: شباك خشب بنقشة شبكة، والفتحات بتضوي
  function mashrabiya(ctx, x, y, w, h, wins) {
    arch(ctx, x - 2, y - 2, w + 4, h + 3, WOOD_D);
    arch(ctx, x, y, w, h, LIT);
    for (let yy = y + 2; yy < y + h; yy += 3) for (let xx = x + ((yy - y) % 6 ? 1 : 2); xx < x + w; xx += 3) R(ctx, xx, yy, 1, 1, WOOD);
    R(ctx, x, y + Math.round(h * 0.55), w, 1, WOOD_D);
    R(ctx, x - 3, y + h, w + 6, 2, BASALT);
    wins.push({ x, y: y + Math.round(w * 0.4), w, h: h - Math.round(w * 0.4) });
  }
  function dome(ctx, cx, base, r, onion) {
    for (let yy = 0; yy <= r; yy++) {
      const t = (r - yy) / r;
      let hw = r * Math.sqrt(Math.max(0, 1 - t * t));
      if (onion) hw *= 1 + 0.12 * Math.sin(Math.PI * (1 - t));
      hw = Math.round(hw);
      const y = base - r + yy;
      R(ctx, cx - hw, y, hw * 2, 1, GOLD);
      R(ctx, cx + Math.round(hw * 0.45), y, Math.max(0, hw - Math.round(hw * 0.45)), 1, GOLD_D);
      R(ctx, cx - Math.round(hw * 0.7), y, Math.max(1, Math.round(hw * 0.18)), 1, GOLD_L);
    }
    // أضلاع القبة
    for (let k = -2; k <= 2; k++) for (let yy = 4; yy <= r; yy++) {
      const t = (r - yy) / r, hw = r * Math.sqrt(Math.max(0, 1 - t * t));
      R(ctx, Math.round(cx + hw * k / 3), base - r + yy, 1, 1, GOLD_D);
    }
  }
  function finial(ctx, cx, top, h) {
    R(ctx, cx - 1, top, 2, h, GOLD_D);
    R(ctx, cx - 3, top + h - 6, 6, 4, GOLD); R(ctx, cx - 2, top + h - 12, 4, 4, GOLD);
    R(ctx, cx - 2, top - 1, 4, 3, GOLD_L);
  }
  function crenel(ctx, x, y, w) {
    R(ctx, x, y + 5, w, 3, STONE_D);
    for (let xx = x; xx < x + w - 3; xx += 9) { R(ctx, xx, y, 6, 6, STONE); R(ctx, xx, y, 6, 1, STONE_L); R(ctx, xx + 2, y + 1, 2, 2, BASALT); }
  }
  function jasmine(ctx, x, y0, y1, seed) {
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let y = y1; y > y0; y -= 2) {
      const xx = x + Math.round(Math.sin(y * 0.25 + seed) * 2);
      R(ctx, xx, y, 2, 2, '#3f7a44');
      if (rnd() < 0.5) R(ctx, xx + (rnd() < 0.5 ? -2 : 2), y, 2, 2, '#5a9a5c');
      if (rnd() < 0.35) { R(ctx, xx + (rnd() < 0.5 ? -3 : 3), y - 1, 2, 2, '#ffffff'); }
    }
  }

  // القصر نفسه (بدون الساحة، الساحة أرض وأغراض لحالها)
  function palaceSprite(flag) {
    const W = 312, H = 206, TOP = 10;
    const wins = [];
    const img = sprite('palace' + (flag || ''), W, H, (ctx) => {
      ctx.translate(0, TOP);
      const base = H - TOP;
      // ---- البرجين ----
      [[4, 'l'], [260, 'r']].forEach(([tx]) => {
        const tw = 52, cx = tx + tw / 2;
        ablaq(ctx, tx, 46, tw, base - 8 - 46);
        R(ctx, tx, 46, 3, base - 54, STONE_L); R(ctx, tx + tw - 3, 46, 3, base - 54, STONE_D);
        crenel(ctx, tx - 2, 38, tw + 4);
        R(ctx, tx, 46, tw, 3, GOLD); R(ctx, tx, 49, tw, 1, GOLD_D);
        // قبة البرج
        R(ctx, cx - 13, 30, 26, 9, STONE); R(ctx, cx - 13, 30, 26, 2, STONE_L); R(ctx, cx - 9, 32, 4, 6, BASALT); R(ctx, cx + 5, 32, 4, 6, BASALT);
        dome(ctx, cx, 30, 14, true);
        finial(ctx, cx, 4, 13);
        // علم
        R(ctx, cx - 1, -10, 1, 15, GOLD_D);
        const fc = flag || '#c8553f';
        R(ctx, cx, -10, 16, 9, fc); R(ctx, cx, -10, 16, 1, 'rgba(255,255,255,.45)'); R(ctx, cx, -2, 16, 1, 'rgba(0,0,0,.3)');
        R(ctx, cx + 13, -7, 3, 3, 'rgba(0,0,0,0)'); ctx.clearRect(cx + 13, -7, 3, 3); // ذيل العلم
        R(ctx, cx + 4, -7, 5, 3, 'rgba(255,255,255,.35)');
        // شبابيك البرج
        [64, 104].forEach((wy) => mashrabiya(ctx, cx - 7, wy, 14, 24, wins));
        arch(ctx, cx - 6, 144, 12, 22, BASALT); arch(ctx, cx - 4, 146, 8, 20, LIT); wins.push({ x: cx - 4, y: 152, w: 8, h: 14 });
      });
      // ---- جسم القصر ----
      const bx = 56, bw = 204;
      ablaq(ctx, bx, 92, bw, base - 8 - 92);
      crenel(ctx, bx, 84, bw);
      R(ctx, bx, 92, bw, 3, GOLD); R(ctx, bx, 95, bw, 1, GOLD_D);
      R(ctx, bx, 128, bw, 3, BASALT); R(ctx, bx, 131, bw, 1, GOLD_D); // فاصل الطوابق
      // ---- القبة الكبيرة ----
      const dcx = 158;
      ablaq(ctx, dcx - 42, 64, 84, 22, false);
      R(ctx, dcx - 44, 62, 88, 3, GOLD); R(ctx, dcx - 44, 84, 88, 2, STONE_D);
      [-26, -8, 10, 28].forEach((dx) => { arch(ctx, dcx + dx - 4, 68, 8, 13, BASALT); arch(ctx, dcx + dx - 2, 70, 4, 11, LIT); });
      dome(ctx, dcx, 63, 38, false);
      finial(ctx, dcx, 6, 20);
      // ---- شبابيك الطابق الأول (مشربيات) ----
      [66, 90, 114, 186, 210, 234].forEach((x) => mashrabiya(ctx, x, 100, 16, 25, wins));
      // ---- شبابيك الأرضي ----
      [70, 100, 200, 230].forEach((x) => {
        archRing(ctx, x - 3, 138, 22, 36, 4);
        arch(ctx, x + 1, 142, 14, 32, LIT);
        for (let yy = 150; yy < 174; yy += 6) R(ctx, x + 1, yy, 14, 1, WOOD_D);
        R(ctx, x + 7, 142, 2, 32, WOOD_D);
        R(ctx, x - 4, 174, 24, 3, STONE_D);
        wins.push({ x: x + 1, y: 148, w: 14, h: 26 });
      });
      // ---- البوابة الكبيرة ----
      const gx = 130, gw = 56;
      R(ctx, gx, 100, gw, base - 8 - 100, BASALT);
      R(ctx, gx + 2, 102, gw - 4, base - 8 - 102, STONE);
      // مقرنصات دهب
      for (let i = 0; i < gw - 8; i += 6) { R(ctx, gx + 4 + i, 104, 6, 4, GOLD); R(ctx, gx + 5 + i, 108, 4, 3, GOLD_D); R(ctx, gx + 6 + i, 111, 2, 2, GOLD); }
      R(ctx, gx + 4, 115, gw - 8, 2, GOLD_D);
      archRing(ctx, gx + 6, 120, gw - 12, base - 8 - 120, 6);
      arch(ctx, gx + 12, 126, gw - 24, base - 8 - 126, '#2a2030');
      // الباب: خشب ومسامير دهب
      const dx0 = gx + 15, dw = gw - 30;
      R(ctx, dx0, 146, dw, base - 8 - 146, WOOD); R(ctx, dx0 + dw / 2 - 1, 146, 2, base - 8 - 146, WOOD_D);
      for (let yy = 150; yy < base - 10; yy += 6) for (let xx = dx0 + 3; xx < dx0 + dw - 2; xx += 5) R(ctx, xx, yy, 1, 1, GOLD);
      R(ctx, dx0 + dw / 2 - 5, 166, 2, 3, GOLD_L); R(ctx, dx0 + dw / 2 + 3, 166, 2, 3, GOLD_L);
      // شبكة فوق الباب بتضوي
      arch(ctx, gx + 16, 128, gw - 32, 16, LIT); for (let xx = gx + 18; xx < gx + gw - 16; xx += 3) R(ctx, xx, 130, 1, 14, WOOD_D);
      wins.push({ x: gx + 18, y: 134, w: gw - 36, h: 10 });
      // فوانيس دهب
      [gx - 8, gx + gw + 3].forEach((lx) => { R(ctx, lx + 2, 136, 1, 4, GOLD_D); R(ctx, lx, 140, 5, 8, GOLD_D); R(ctx, lx + 1, 141, 3, 6, '#ffe9a6'); R(ctx, lx, 148, 5, 2, GOLD); wins.push({ x: lx + 1, y: 141, w: 3, h: 6 }); });
      // ياسمين على الزوايا
      jasmine(ctx, bx + 4, 132, base - 9, 3); jasmine(ctx, bx + bw - 6, 132, base - 9, 7);
      jasmine(ctx, gx - 4, 150, base - 9, 11); jasmine(ctx, gx + gw + 2, 150, base - 9, 5);
      // القاعدة
      R(ctx, 0, base - 8, W, 8, BASALT); R(ctx, 0, base - 8, W, 2, BASALT_L);
      for (let xx = 2; xx < W; xx += 12) R(ctx, xx, base - 5, 1, 4, '#3a333a');
      R(ctx, gx + 4, base - 8, gw - 8, 8, '#a8423a'); R(ctx, gx + 4, base - 8, gw - 8, 1, '#c8553f'); // أول السجادة
    });
    img._wins = wins.map((w) => ({ x: w.x, y: w.y + TOP, w: w.w, h: w.h }));
    return img;
  }

  // شجرة سرو شامية
  function cypress() {
    return sprite('cypress', 16, 44, (ctx) => {
      R(ctx, 7, 38, 2, 6, '#5a3d28');
      for (let y = 0; y < 40; y++) {
        const t = y / 40, hw = Math.max(1, Math.round(6 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05)) * (0.55 + 0.45 * t)));
        R(ctx, 8 - hw, y, hw * 2, 1, '#2f6b3d'); R(ctx, 8 - hw, y, Math.ceil(hw / 2), 1, '#4a8a52');
        if (y % 5 === 2) R(ctx, 8 + hw - 2, y, 2, 1, '#245532');
      }
    });
  }
  // حوض ياسمين بالساحة
  function jasmineBush(v) {
    return sprite('jasbush' + v, 18, 20, (ctx) => {
      // أصيص فخار
      R(ctx, 4, 13, 10, 7, '#b5653a'); R(ctx, 3, 12, 12, 2, '#d07a48'); R(ctx, 4, 18, 10, 2, '#8a4a2a'); R(ctx, 6, 15, 6, 1, '#d98a5a');
      // شجيرة مدوّرة
      L.blob(ctx, 9, 8, 7, ['#5a9a5c', '#3f7a44', '#2f5f36']);
      // زهر ياسمين أبيض
      const pts = [[5, 5], [11, 3], [13, 8], [7, 9], [10, 11], [4, 10], [9, 6], [14, 5]];
      pts.forEach(([x, y], i) => { if ((i + v) % 4 !== 3) { R(ctx, x, y, 2, 2, '#ffffff'); R(ctx, x + 1, y + 1, 1, 1, '#f2e6a0'); } });
    });
  }

  // أغراض الساحة (إحداثيات بلاطات، bx/by = زاوية البلوك)
  function courtyard(bx, by) {
    return {
      ground: [
        [bx, by + 4, 21, 2, 'C'],
        [bx + 9, by + 4, 3, 2, 'M'],  // سجادة حمرا للباب
        [bx + 3, by + 4, 2, 2, 'O'],  // نافورة
        [bx + 16, by + 4, 2, 2, 'O'],
      ],
      cypress: [[bx, by + 5], [bx + 20, by + 5], [bx + 7, by + 5], [bx + 13, by + 5]],
      jasmine: [[bx + 1, by + 5], [bx + 5, by + 5], [bx + 15, by + 5], [bx + 19, by + 5]],
      lamps: [[bx + 8, by + 5], [bx + 12, by + 5]],
    };
  }

  Object.assign(L.Objects.TYPES, {
    cypress: { w: 1, h: 1, ox: 0, oy: -28, hit: { x: 4, y: 10, w: 8, h: 5 }, sprite: () => cypress() },
    jasmine: { w: 1, h: 1, ox: -1, oy: -4, hit: { x: 2, y: 9, w: 12, h: 6 }, sprite: (o) => jasmineBush(o.v || 0) },
  });

  L.Palace = { BLOCK, PLOT_ID, palaceSprite, cypress, jasmineBush, courtyard, W: 312, H: 206 };
})(window.LIFE);
