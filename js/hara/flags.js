// أعلام الدول العربية (22). كلها مرسومة بالكود على مربع 30×20، وبتنرسم فوق كل بيت.
(function (L) {
  'use strict';
  const W = 30, H = 20;

  const LIST = [
    ['sy', 'سوريا'], ['ps', 'فلسطين'], ['sa', 'السعودية'], ['iq', 'العراق'], ['jo', 'الأردن'], ['lb', 'لبنان'],
    ['eg', 'مصر'], ['kw', 'الكويت'], ['ae', 'الإمارات'], ['qa', 'قطر'], ['bh', 'البحرين'], ['om', 'عُمان'],
    ['ye', 'اليمن'], ['ly', 'ليبيا'], ['tn', 'تونس'], ['dz', 'الجزائر'], ['ma', 'المغرب'], ['mr', 'موريتانيا'],
    ['sd', 'السودان'], ['so', 'الصومال'], ['dj', 'جيبوتي'], ['km', 'جزر القمر'],
  ].map(([c, n]) => ({ c, n }));
  const NAME = {}; LIST.forEach((f) => { NAME[f.c] = f.n; });

  // ---------- أدوات الرسم ----------
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const stripes = (g, cols, ws) => {
    const tot = ws ? ws.reduce((a, b) => a + b, 0) : cols.length; let y = 0;
    cols.forEach((c, i) => { const h = H * (ws ? ws[i] : 1) / tot; rect(g, 0, y, W, h + 0.05, c); y += h; });
  };
  const poly = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const starPts = (cx, cy, R, n, inner, rot) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = (rot == null ? -Math.PI / 2 : rot) + i * Math.PI / n, r = i % 2 ? R * inner : R; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return pts;
  };
  const star = (g, cx, cy, R, c, n, rot) => { n = n || 5; poly(g, starPts(cx, cy, R, n, n === 5 ? 0.382 : 0.45, rot), c); };
  // هلال: دايرة كبيرة ناقص دايرة صغيرة (even-odd)
  const crescent = (g, cx, cy, r, ix, iy, ir, c) => {
    g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.moveTo(ix + ir, iy); g.arc(ix, iy, ir, 0, Math.PI * 2); g.fill('evenodd');
  };
  const zig = (g, x0, x1, n, c) => { // شريط مسنّن عالجنب الأيسر (قطر/البحرين)
    const pts = [[0, 0]]; const step = H / n;
    for (let i = 0; i < n; i++) { pts.push([x0, i * step]); pts.push([x1, (i + 0.5) * step]); }
    pts.push([x0, H]); pts.push([0, H]);
    poly(g, pts, c);
  };

  // ---------- كل علم ----------
  const DRAW = {
    sy(g) { // علم الاستقلال: أخضر/أبيض/أسود + 3 نجوم حمر
      stripes(g, ['#007a3d', '#ffffff', '#000000']);
      [8.2, 15, 21.8].forEach((x) => star(g, x, 10, 2.15, '#ce1126'));
    },
    ps(g) { stripes(g, ['#000000', '#ffffff', '#009736']); poly(g, [[0, 0], [11, 10], [0, 20]], '#ce1126'); },
    sa(g) { // الشهادتين + السيف (مبسّطة)
      rect(g, 0, 0, W, H, '#006c35');
      g.fillStyle = '#fff';
      [[5, 6.4, 3], [9.2, 6.2, 2], [11.8, 6.4, 3.4], [16, 6.2, 2.4], [19, 6.4, 3.2], [23, 6.2, 2]].forEach(([x, y, w]) => g.fillRect(x, y, w, 1.6));
      [[7, 9.2, 3], [11, 9, 2.4], [14.2, 9.2, 3.6], [18.6, 9, 2.4], [21.4, 9.2, 2.6]].forEach(([x, y, w]) => g.fillRect(x, y, w, 1.3));
      g.fillRect(6, 14.2, 18, 0.9); g.fillRect(21.6, 12.6, 1, 4); g.fillRect(5, 13.8, 2.2, 1.6); // السيف
    },
    iq(g) {
      stripes(g, ['#ce1126', '#ffffff', '#000000']);
      g.fillStyle = '#007a3d'; [[8, 8.6, 1.2, 2.8], [10, 9.4, 2.4, 1.1], [13, 8.2, 1.1, 3.2], [15.3, 9, 2, 1.2], [18, 8.2, 1.1, 3.2], [20.2, 9.4, 1.6, 1.1]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
    },
    jo(g) {
      stripes(g, ['#000000', '#ffffff', '#007a3d']); poly(g, [[0, 0], [15, 10], [0, 20]], '#ce1126'); star(g, 4.6, 10, 2.1, '#ffffff', 7);
    },
    lb(g) { // الأرزة
      stripes(g, ['#ed1c24', '#ffffff', '#ed1c24'], [1, 2, 1]);
      rect(g, 14.4, 14, 1.2, 2, '#7a4a1e');
      poly(g, [[15, 4], [12.8, 8.6], [17.2, 8.6]], '#00a651'); poly(g, [[15, 6.3], [11.6, 11.6], [18.4, 11.6]], '#00a651'); poly(g, [[15, 8.6], [10.4, 14.4], [19.6, 14.4]], '#00a651');
    },
    eg(g) { // نسر صلاح الدين (مبسّط)
      stripes(g, ['#ce1126', '#ffffff', '#000000']);
      const gold = '#c09300';
      poly(g, [[15, 9.3], [10.4, 7.8], [10.8, 12.4], [15, 14.2], [19.2, 12.4], [19.6, 7.8]], gold);
      g.fillStyle = gold; g.beginPath(); g.arc(15, 7.4, 1.25, 0, Math.PI * 2); g.fill();
      rect(g, 14.1, 13.6, 1.8, 2.2, gold);
      poly(g, [[13.3, 9.4], [16.7, 9.4], [16.7, 12.2], [15, 13.4], [13.3, 12.2]], '#ce1126');
    },
    kw(g) { stripes(g, ['#007a3d', '#ffffff', '#ce1126']); poly(g, [[0, 0], [6.5, 6.67], [6.5, 13.33], [0, 20]], '#000000'); },
    ae(g) { stripes(g, ['#00732f', '#ffffff', '#000000']); rect(g, 0, 0, 7.5, H, '#ff0000'); },
    qa(g) { rect(g, 0, 0, W, H, '#8a1538'); zig(g, 8.5, 11.5, 9, '#ffffff'); },
    bh(g) { rect(g, 0, 0, W, H, '#ce1126'); zig(g, 8.5, 11.5, 5, '#ffffff'); },
    om(g) { // أبيض/أحمر/أخضر + شريط أحمر عالجنب
      stripes(g, ['#ffffff', '#db161b', '#008000']); rect(g, 0, 0, 9.5, H, '#db161b');
      g.strokeStyle = '#ffffff'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(2.2, 2.4); g.lineTo(7.4, 6.8); g.moveTo(7.4, 2.4); g.lineTo(2.2, 6.8); g.stroke();
      g.beginPath(); g.arc(4.8, 5.8, 2.1, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    },
    ye(g) { stripes(g, ['#ce1126', '#ffffff', '#000000']); },
    ly(g) {
      stripes(g, ['#e70013', '#000000', '#239e46'], [1, 2, 1]);
      crescent(g, 14.4, 10, 4.2, 15.9, 10, 3.5, '#ffffff'); star(g, 17.2, 10, 1.7, '#ffffff');
    },
    tn(g) {
      rect(g, 0, 0, W, H, '#e70013'); g.fillStyle = '#fff'; g.beginPath(); g.arc(15, 10, 5.8, 0, Math.PI * 2); g.fill();
      crescent(g, 14.4, 10, 3.7, 15.5, 10, 3.0, '#e70013'); star(g, 16.2, 10, 2.1, '#e70013', 5, -Math.PI / 2 + 0.3);
    },
    dz(g) {
      rect(g, 0, 0, 15, H, '#006233'); rect(g, 15, 0, 15, H, '#ffffff');
      crescent(g, 14.2, 10, 5.2, 15.7, 10, 4.2, '#d21034'); star(g, 17, 10, 2.6, '#d21034', 5, -Math.PI / 2 + 0.2);
    },
    ma(g) { // نجمة سليمان الخضراء
      rect(g, 0, 0, W, H, '#c1272d'); const p = starPts(15, 10.4, 5.6, 5, 1, null).filter((_, i) => i % 2 === 0);
      g.strokeStyle = '#006233'; g.lineWidth = 1.1; g.beginPath(); [0, 2, 4, 1, 3, 0].forEach((k, i) => (i ? g.lineTo(p[k][0], p[k][1]) : g.moveTo(p[k][0], p[k][1]))); g.stroke();
    },
    mr(g) {
      rect(g, 0, 0, W, H, '#00a95c'); rect(g, 0, 0, W, 3.2, '#d01c1f'); rect(g, 0, H - 3.2, W, 3.2, '#d01c1f');
      crescent(g, 15, 8.6, 5, 15, 6.9, 4.4, '#ffc400'); star(g, 15, 7.4, 1.6, '#ffc400');
    },
    sd(g) { stripes(g, ['#d21034', '#ffffff', '#000000']); poly(g, [[0, 0], [11, 10], [0, 20]], '#007229'); },
    so(g) { rect(g, 0, 0, W, H, '#4189dd'); star(g, 15, 10.4, 5.4, '#ffffff'); },
    dj(g) {
      rect(g, 0, 0, W, 10, '#6ab2e7'); rect(g, 0, 10, W, 10, '#12ad2b'); poly(g, [[0, 0], [14, 10], [0, 20]], '#ffffff'); star(g, 4.6, 10, 2.1, '#d7141a');
    },
    km(g) {
      stripes(g, ['#ffc61e', '#ffffff', '#ce1126', '#3a75c4']); poly(g, [[0, 0], [13.5, 10], [0, 20]], '#3d8e33');
      crescent(g, 4.8, 10, 3.5, 6, 10, 3.0, '#ffffff'); [6.4, 8.9, 11.4, 13.9].forEach((y, i) => star(g, 7.6 + 0 * i, 6.8 + i * 2.1, 0.8, '#ffffff'));
    },
  };

  const cache = {};
  function canvas(code) {
    if (!DRAW[code]) return null;
    if (cache[code]) return cache[code];
    const S = 4, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.scale(S, S); g.imageSmoothingEnabled = true;
    DRAW[code](g);
    cache[code] = c; return c;
  }
  // يرسم العلم بمربع (x,y,w,h) مع إطار غامق رفيع
  function draw(ctx, code, x, y, w, h) {
    const c = canvas(code); if (!c) return false;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.drawImage(c, x, y, w, h); ctx.restore();
    return true;
  }
  L.Flags = { LIST, NAME, W, H, has: (c) => !!DRAW[c], canvas, draw };
})(window.LIFE = window.LIFE || {});
