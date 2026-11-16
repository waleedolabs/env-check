// LIFE | حياة — أدوات مشتركة
window.LIFE = window.LIFE || {};
(function (L) {
  'use strict';

  L.TILE = 16;                 // حجم البلاطة بالبكسل (دقة اللعبة الأصلية)
  L.GAME_MIN_PER_SEC = 2;      // كل ثانية حقيقية = دقيقتان داخل اللعبة
  L.SAVE_KEY = 'life_save_v1';

  L.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  L.lerp = (a, b, t) => a + (b - a) * t;

  // مولد أرقام عشوائية ثابت البذرة (لرسومات متطابقة في كل مرة)
  L.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // قيمة عشوائية ثابتة لكل إحداثي
  L.hash = function (x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  L.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  };

  L.rect = function (ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // دائرة بكسلية مظللة (للأشجار والشجيرات)
  L.blob = function (ctx, cx, cy, r, colors, rand) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        const shade = (dx + dy) / (r * 1.6) + (rand ? (rand() - 0.5) * 0.35 : 0);
        let c = colors[1];
        if (shade < -0.35) c = colors[2];
        else if (shade > 0.3) c = colors[0];
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  // إضافة حدود داكنة حول البكسلات المرئية (يعطي طابع Pixel Art)
  L.outline = function (canvas, color, alphaMin) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const src = new Uint8ClampedArray(d);
    const am = alphaMin == null ? 10 : alphaMin;
    const col = hexToRgb(color);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > am;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > am) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
          d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  L.hexToRgb = hexToRgb;

  L.rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  L.pad2 = (n) => (n < 10 ? '0' : '') + n;

  L.formatTime = function (minutesOfDay) {
    const m = Math.floor(minutesOfDay) % 1440;
    return L.pad2(Math.floor(m / 60)) + ':' + L.pad2(m % 60);
  };
})(window.LIFE);
