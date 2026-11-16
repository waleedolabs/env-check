// LIFE | حياة — توليد شخصيات Pixel Art بأربعة اتجاهات وحركة مشي
(function (L) {
  'use strict';
  const R = L.rect;
  const FW = 16, FH = 22; // حجم الإطار
  // الاتجاهات: 0 أسفل، 1 يسار، 2 يمين، 3 أعلى
  const DIRS = { down: 0, left: 1, right: 2, up: 3 };

  function shade(hex, amt) {
    const [r, g, b] = L.hexToRgb(hex);
    const f = (v) => L.clamp(Math.round(v + amt), 0, 255);
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  function drawFrame(ctx, ox, oy, look, dir, frame) {
    const skin = look.skin, skinD = shade(look.skin, -28);
    const hair = look.hair, hairL = shade(look.hair, 30);
    const shirt = look.shirt, shirtD = shade(look.shirt, -35);
    const pants = look.pants, pantsD = shade(look.pants, -30);
    const shoes = look.shoes || '#3a2b2b';
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const bob = step !== 0 ? 1 : 0;
    const P = (x, y, w, h, c) => R(ctx, ox + x, oy + y + bob, w, h, c);
    const Pn = (x, y, w, h, c) => R(ctx, ox + x, oy + y, w, h, c); // بدون اهتزاز (الأرجل)

    if (dir === 0 || dir === 3) {
      // الأرجل
      const lLen = step === 1 ? 2 : 3, rLen = step === -1 ? 2 : 3;
      Pn(5, 15, 3, lLen, pants); Pn(8, 15, 3, rLen, pantsD);
      Pn(5, 15 + lLen, 3, 1, shoes); Pn(8, 15 + rLen, 3, 1, shoes);
      // الجسم
      P(4, 9, 8, 6, shirt); P(4, 13, 8, 1, shirtD); P(4, 14, 8, 1, pants);
      // الذراعان
      const aL = step === 1 ? -1 : step === -1 ? 1 : 0;
      P(3, 9 + Math.max(0, aL), 1, 4, shirtD); P(3, 13 + Math.max(0, aL), 1, 1, skin);
      P(12, 9 + Math.max(0, -aL), 1, 4, shirtD); P(12, 13 + Math.max(0, -aL), 1, 1, skin);
      // الرأس
      P(4, 2, 8, 7, skin); P(5, 1, 6, 1, skin);
      P(4, 8, 8, 1, skinD);
      if (dir === 0) {
        P(4, 1, 8, 2, hair); P(5, 0, 6, 1, hair); P(4, 3, 1, 3, hair); P(11, 3, 1, 3, hair);
        P(5, 3, 3, 1, hair); P(6, 1, 3, 1, hairL);
        if (look.longHair) { P(3, 3, 1, 6, hair); P(12, 3, 1, 6, hair); P(4, 6, 1, 3, hair); P(11, 6, 1, 3, hair); }
        P(6, 5, 1, 2, '#2b2233'); P(9, 5, 1, 2, '#2b2233');
        P(5, 7, 1, 1, '#f0a0a0'); P(10, 7, 1, 1, '#f0a0a0');
        if (look.beard) { P(5, 7, 6, 2, look.beard); P(7, 7, 2, 1, skin); }
        // ياقة
        P(7, 9, 2, 1, skinD);
      } else {
        P(4, 1, 8, 7, hair); P(5, 0, 6, 1, hair); P(5, 1, 6, 1, hairL);
        P(4, 8, 8, 1, shade(look.hair, -20));
        if (look.longHair) { P(3, 3, 1, 6, hair); P(12, 3, 1, 6, hair); P(4, 8, 8, 2, hair); }
        P(4, 9, 8, 1, shirtD);
      }
    } else {
      // جانبي (يسار)، اليمين ينعكس لاحقاً
      if (step === 0) {
        Pn(6, 15, 4, 4, pants); Pn(6, 19 - 1, 4, 1, shoes);
      } else {
        Pn(4, 15, 3, 3, pants); Pn(3, 18, 4, 1, shoes);
        Pn(9, 15, 3, 3, pantsD); Pn(9, 18, 4, 1, shoes);
      }
      P(5, 9, 6, 6, shirt); P(5, 13, 6, 1, shirtD); P(5, 14, 6, 1, pants);
      // الذراع الأمامية
      const ay = step === 0 ? 0 : 0;
      const ax = step === 1 ? 5 : step === -1 ? 9 : 7;
      P(ax, 9 + ay, 2, 4, shirtD); P(ax, 13 + ay, 2, 1, skin);
      // الرأس
      P(4, 2, 8, 7, skin); P(5, 1, 6, 1, skin); P(3, 5, 1, 2, skin);
      P(4, 8, 8, 1, skinD);
      P(4, 1, 8, 2, hair); P(5, 0, 6, 1, hair); P(7, 3, 5, 4, hair); P(11, 3, 1, 5, hair); P(6, 1, 3, 1, hairL);
      P(4, 3, 2, 1, hair);
      if (look.longHair) { P(9, 7, 3, 3, hair); P(12, 3, 1, 6, hair); }
      P(5, 5, 1, 2, '#2b2233');
      P(4, 7, 1, 1, '#f0a0a0');
      P(8, 5, 1, 2, skinD); // أذن
      if (look.beard) { P(4, 7, 4, 2, look.beard); }
    }
  }

  // يبني صفحة رسومات: 4 اتجاهات × 4 إطارات
  function makeSheet(look) {
    const [c, ctx] = L.makeCanvas(FW * 4, FH * 4);
    for (let f = 0; f < 4; f++) {
      drawFrame(ctx, f * FW, 0 * FH + 1, look, 0, f);
      drawFrame(ctx, f * FW, 1 * FH + 1, look, 1, f);
      drawFrame(ctx, f * FW, 3 * FH + 1, look, 3, f);
    }
    // اليمين = انعكاس اليسار
    for (let f = 0; f < 4; f++) {
      ctx.save();
      ctx.translate(f * FW + FW, 2 * FH);
      ctx.scale(-1, 1);
      ctx.drawImage(c, f * FW, FH, FW, FH, 0, 0, FW, FH);
      ctx.restore();
    }
    L.outline(c, '#2a2030');
    return c;
  }

  function drawCharacter(ctx, sheet, x, y, dir, frame) {
    // x,y = منتصف القدمين
    ctx.fillStyle = 'rgba(20,20,30,0.25)';
    ctx.fillRect(Math.round(x) - 5, Math.round(y) - 2, 10, 3);
    ctx.fillRect(Math.round(x) - 4, Math.round(y) - 3, 8, 5);
    ctx.drawImage(sheet, frame * FW, dir * FH, FW, FH, Math.round(x - FW / 2), Math.round(y) - 20, FW, FH);
  }

  L.Characters = { makeSheet, drawCharacter, DIRS, FW, FH };
})(window.LIFE);
