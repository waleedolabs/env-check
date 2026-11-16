// LIFE | حياة — الساعة وتعاقب الليل والنهار والإضاءة
(function (L) {
  'use strict';

  // ---------- الساعة ----------
  function Clock(total) { this.total = total == null ? 8 * 60 : total; } // دقائق منذ بداية اليوم الأول
  Clock.prototype.update = function (dt) { this.total += dt * L.GAME_MIN_PER_SEC; };
  Clock.prototype.day = function () { return Math.floor(this.total / 1440) + 1; };
  Clock.prototype.minutes = function () { return this.total % 1440; };
  Clock.prototype.hour = function () { return this.minutes() / 60; };
  Clock.prototype.text = function () { return L.formatTime(this.minutes()); };
  Clock.prototype.isNight = function () { const h = this.hour(); return h >= 19.5 || h < 6; };
  Clock.prototype.sleepToMorning = function () {
    const d = Math.floor(this.total / 1440);
    const h = this.hour();
    this.total = (h >= 7 ? d + 1 : d) * 1440 + 7 * 60;
  };
  L.Clock = Clock;

  // ---------- شدة الظلام حسب الساعة ----------
  const NIGHT = 0.74;
  function darkness(h) {
    if (h < 5) return NIGHT;
    if (h < 7) return L.lerp(NIGHT, 0, (h - 5) / 2);
    if (h < 17.5) return 0;
    if (h < 20.5) return L.lerp(0, NIGHT, (h - 17.5) / 3);
    return NIGHT;
  }
  // لون الغروب / الشروق
  function tint(h) {
    if (h >= 16.5 && h < 20) { const k = 1 - Math.abs(h - 18.3) / 1.8; return { c: '255,140,70', a: 0.16 * L.clamp(k, 0, 1) }; }
    if (h >= 5 && h < 7.5) { const k = 1 - Math.abs(h - 6.2) / 1.3; return { c: '255,170,120', a: 0.12 * L.clamp(k, 0, 1) }; }
    return null;
  }

  let lc = null, lctx = null;
  function ensure(w, h) {
    if (!lc) { [lc, lctx] = L.makeCanvas(w, h); }
    if (lc.width !== w || lc.height !== h) { lc.width = w; lc.height = h; }
  }

  // رسم طبقة الإضاءة فوق المشهد (بإحداثيات الشاشة)
  function render(ctx, map, cam, zoom, hour, playerPos) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    let dark = darkness(hour);
    const indoor = !map.outdoor;
    if (indoor) dark = map.dim ? 0.1 + dark * 0.55 : dark * 0.38;
    const t = map.outdoor ? tint(hour) : null;

    if (t && t.a > 0.005) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(' + t.c + ',' + t.a + ')'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (dark < 0.01) return;
    const night = dark / NIGHT; // 0..1

    ensure(W, H);
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = indoor ? 'rgba(30,20,40,' + dark + ')' : 'rgba(14,18,48,' + dark + ')';
    lctx.fillRect(0, 0, W, H);

    const sx = (x) => (x - cam.x) * zoom, sy = (y) => (y - cam.y) * zoom;
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const g = lctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * zoom);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
      g.addColorStop(0.4, 'rgba(0,0,0,' + a * 0.7 + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.fillRect(sx(x - r), sy(y - r), r * 2 * zoom, r * 2 * zoom);
    };
    for (const l of map.lights) hole(l.x, l.y + (map.outdoor ? 12 : 0), l.r * (map.outdoor ? 0.8 : 1), 0.9);
    for (const w of map.windows) hole(w.x + w.w / 2, w.y + w.h / 2 + 10, 18 + w.w * 0.3, 0.6);
    if (playerPos) hole(playerPos.x, playerPos.y - 8, indoor ? 70 : 36, 0.45);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lc, 0, 0);

    // توهج دافئ
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, a) => {
      const g = ctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * zoom);
      g.addColorStop(0, 'rgba(255,200,110,' + a + ')');
      g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx(x - r), sy(y - r), r * 2 * zoom, r * 2 * zoom);
    };
    for (const l of map.lights) glow(l.x, l.y, l.r * 0.55, 0.22 * night);
    ctx.globalCompositeOperation = 'source-over';
    // النوافذ المضيئة ليلاً
    if (map.outdoor) {
      ctx.fillStyle = 'rgba(255,214,120,' + 0.75 * night + ')';
      for (const w of map.windows) ctx.fillRect(Math.round(sx(w.x)), Math.round(sy(w.y)), Math.round(w.w * zoom), Math.round(w.h * zoom));
    }
    ctx.restore();
  }

  L.Lighting = { render, darkness };
})(window.LIFE);
