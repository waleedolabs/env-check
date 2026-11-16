// حارتنا — الكوكب: خريطة بيئات، أماكن الأحياء، ورسم كرة بكسلية بتدور
(function (L) {
  'use strict';

  // ---------- ضجيج ثلاثي الأبعاد (بدون درزات على الكرة) ----------
  function hash3(x, y, z, s) {
    let h = (x * 374761393 + y * 668265263 + z * 1440662683 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, s);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  function fbm(x, y, z, s, oct) {
    let a = 0.5, f = 1, t = 0, n = 0;
    for (let i = 0; i < (oct || 5); i++) { t += a * vnoise(x * f, y * f, z * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
    return t / n;
  }

  const BIOMES = {
    ocean: { name: 'بحر' },
    grass: { name: 'سهول خضرا', col: [122, 168, 84] },
    forest: { name: 'غابة', col: [70, 128, 66] },
    desert: { name: 'صحرا', col: [222, 190, 120] },
    snow: { name: 'تلج', col: [236, 242, 246] },
    island: { name: 'جزيرة', col: [150, 196, 98] },
  };

  // ---------- خريطة الكوكب (مستطيلة) ----------
  const TW = 360, TH = 180;
  const tex = new Uint8ClampedArray(TW * TH * 3);
  const bio = new Array(TW * TH);
  const SEA = 0.5;
  function classify(x, y, z) {
    const h = fbm(x * 1.6 + 9, y * 1.6, z * 1.6, 3, 6);
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
    if (h < SEA) return { b: 'ocean', h };
    const m = fbm(x * 2.2, y * 2.2 + 5, z * 2.2, 41, 4);
    let b;
    if (Math.abs(lat) > 64 || h > 0.76) b = 'snow';
    else if (h < SEA + 0.025) b = 'island';
    else if (m < 0.42 && Math.abs(lat) < 42) b = 'desert';
    else if (m > 0.56) b = 'forest';
    else b = 'grass';
    return { b, h, m };
  }
  for (let j = 0; j < TH; j++) {
    const lat = (0.5 - (j + 0.5) / TH) * Math.PI;
    for (let i = 0; i < TW; i++) {
      const lon = ((i + 0.5) / TW) * Math.PI * 2 - Math.PI;
      const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
      const c = classify(x, y, z);
      const k = (j * TW + i) * 3;
      bio[j * TW + i] = c.b;
      let r, g, b;
      if (c.b === 'ocean') {
        const d = Math.min(1, (SEA - c.h) / 0.12);
        r = 56 - d * 26; g = 140 - d * 52; b = 196 - d * 40;
        if (d < 0.12) { r = 110; g = 190; b = 214; } // مي ضحلة
      } else {
        [r, g, b] = BIOMES[c.b].col;
        const sh = (c.h - SEA) * 1.4;
        if (c.b !== 'snow') { r -= sh * 60; g -= sh * 50; b -= sh * 40; }
        if (c.b === 'island') { const s = Math.min(1, (c.h - SEA) / 0.012); if (s < 0.5) { r = 236; g = 214; b = 156; } }
      }
      const q = 12; // ألوان محدودة = إحساس بكسل
      tex[k] = Math.round(r / q) * q; tex[k + 1] = Math.round(g / q) * q; tex[k + 2] = Math.round(b / q) * q;
    }
  }
  // غيوم
  const CW = 180, CH = 90, clouds = new Float32Array(CW * CH);
  for (let j = 0; j < CH; j++) {
    const lat = (0.5 - (j + 0.5) / CH) * Math.PI;
    for (let i = 0; i < CW; i++) {
      const lon = ((i + 0.5) / CW) * Math.PI * 2 - Math.PI;
      const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
      const n = fbm(x * 3, y * 3 + 20, z * 3, 77, 4);
      clouds[j * CW + i] = n > 0.6 ? Math.min(1, (n - 0.6) * 6) : 0;
    }
  }
  function biomeAt(x, y, z) {
    const lat = Math.asin(y), lon = Math.atan2(x, z);
    const i = Math.min(TW - 1, Math.floor((lon + Math.PI) / (Math.PI * 2) * TW)), j = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH));
    return bio[j * TW + i];
  }

  // ---------- شبكة الدول ----------
  // الكوكب مقسوم مربعات 6°×6° (متل خطوط الطول والعرض). كل مربع = دولة، وجيرانها عالكوكب هم جيرانها باللعبة
  const GW = 5, GH = 4, LAT_TOP = 64, KW = 360 / GW, KH = (LAT_TOP * 2) / GH; // 5 × 4 = 20 دولة، كل وحدة كبيرة (72° × 32°)
  const DEG = Math.PI / 180;
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const xyz = (lat, lon) => ({ x: Math.cos(lat * DEG) * Math.sin(lon * DEG), y: Math.sin(lat * DEG), z: Math.cos(lat * DEG) * Math.cos(lon * DEG) });
  const wrapX = (gx) => ((gx % GW) + GW) % GW;
  const cells = [];
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const c = { gx, gy };
    c.lat = LAT_TOP - (gy + 0.5) * KH; c.lon = -180 + (gx + 0.5) * KW;
    c.p = xyz(c.lat, c.lon);
    // بيئة الدولة: الأكثر بين نقاطها؛ إذا أغلبها بحر بتصير جزيرة
    const cnt = {}; let land = 0;
    for (let a = 0; a < 5; a++) for (let b2 = 0; b2 < 5; b2++) {
      const q = xyz(c.lat + (a - 2) * KH / 5, c.lon + (b2 - 2) * KW / 5), bb = biomeAt(q.x, q.y, q.z);
      if (bb !== 'ocean') { land++; cnt[bb] = (cnt[bb] || 0) + 1; }
    }
    c.land = land / 25;
    c.b = land < 7 ? 'island' : Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0];
    cells.push(c);
  }
  const at0 = (gx, gy) => (gy < 0 || gy >= GH ? null : cells[gy * GW + wrapX(gx)]);
  // البداية: أقرب مكان لبلاد الشام (30° شمال، 35° شرق) فيه يابسة كتير حواليه
  const S0 = xyz(30, 35);
  let G0 = cells[0], best = -1e9;
  cells.forEach((c) => {
    if (c.b === 'snow' || c.b === 'island') return;
    let l = 0; const kinds = new Set();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = at0(c.gx + dx, c.gy + dy); if (n) { l += n.land; kinds.add(n.b); } }
    const sc = l * 0.6 + kinds.size * 2 - (1 - dot(c.p, S0)) * 6;
    if (sc > best) { best = sc; G0 = c; }
  });
  cells.forEach((c) => {
    let dx = Math.abs(c.gx - G0.gx); dx = Math.min(dx, GW - dx);
    const dy = c.gy - G0.gy;
    c.k = dx * dx + dy * dy + Math.atan2(dy, c.gx - G0.gx) * 0.01;
  });
  const order = cells.slice().sort((a, b) => a.k - b.k);
  const byPos = new Int16Array(GW * GH);
  order.forEach((c, i) => { c.d = i + 1; byPos[c.gy * GW + c.gx] = c.d; });
  const cell = (d) => order[(d - 1) % order.length];
  function spot(d) { return cell(d).p; }
  function biomeOf(d) { return cell(d).b; }
  function cellOf(d) { const c = cell(d); return { gx: c.gx, gy: c.gy }; }
  function dAt(gx, gy) { if (gy < 0 || gy >= GH) return 0; return byPos[gy * GW + wrapX(gx)]; }
  // فرق الشبكة بين دولتين (أقصر طريق حوالين الكوكب)
  function delta(d1, d2) {
    const a = cell(d1), b = cell(d2);
    let dx = b.gx - a.gx; if (dx > GW / 2) dx -= GW; if (dx < -GW / 2) dx += GW;
    return { dx, dy: b.gy - a.gy };
  }
  // نقطة على الكوكب لمكان داخل الدولة (fx, fy من 0 لـ 1)
  function pointIn(d, fx, fy) { const c = cell(d); return xyz(LAT_TOP - (c.gy + fy) * KH, -180 + (c.gx + fx) * KW); }
  // من نقطة على الكرة للدولة
  function dOfPoint(p) {
    const lat = Math.asin(Math.max(-1, Math.min(1, p.y))) / DEG, lon = Math.atan2(p.x, p.z) / DEG;
    const gy = Math.floor((LAT_TOP - lat) / KH), gx = Math.floor((lon + 180) / KW);
    return { d: dAt(gx, gy), fx: (lon + 180) / KW - gx, fy: (LAT_TOP - lat) / KH - gy };
  }

  // ---------- تلوين الدول المفتوحة وحدودها ----------
  const own = new Int16Array(TW * TH).fill(-1), border = new Uint8Array(TW * TH);
  let cols = [], ckey = '';
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function setCountries(list) { // [{d, color}]
    const key = list.map((c) => c.d + c.color).join('|');
    if (key === ckey) return; ckey = key;
    own.fill(-1); border.fill(0);
    cols = list.map((c) => hexRgb(c.color));
    list.forEach((c, n) => {
      const cc = cell(c.d);
      const i0 = cc.gx * KW, j0 = (90 - LAT_TOP) + cc.gy * KH; // تكسل 1° = خلية 6×6
      for (let j = j0; j < j0 + KH; j++) for (let i = i0; i < i0 + KW; i++) {
        const k = j * TW + i; own[k] = n;
        if (i === i0 || j === j0 || i === i0 + KW - 1 || j === j0 + KH - 1) border[k] = 1;
      }
    });
  }
  function invalidate() { ckey = ''; }

  // ---------- رسم الكرة (بس الجزء الظاهر عالشاشة) ----------
  let buf = null, bctx = null, img = null;
  function ensure(w, h) {
    if (!buf || buf.width !== w || buf.height !== h) { [buf, bctx] = L.makeCanvas(w, h); img = bctx.createImageData(w, h); }
  }
  function rotFns(rot) {
    const cyaw = Math.cos(rot.yaw), syaw = Math.sin(rot.yaw), cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
    return { cyaw, syaw, cp, sp };
  }
  // من الشاشة لنقطة على الكوكب (أو null)
  function unproject(sx, sy, cx, cy, radius, rot) {
    const vx = (sx - cx) / radius, vy = (cy - sy) / radius, rr = vx * vx + vy * vy;
    if (rr > 1) return null;
    const vz = Math.sqrt(1 - rr), f = rotFns(rot);
    const y1 = vy * f.cp + vz * f.sp, z1 = -vy * f.sp + vz * f.cp;
    return { x: vx * f.cyaw + z1 * f.syaw, y: y1, z: -vx * f.syaw + z1 * f.cyaw };
  }
  function render(ctx, cx, cy, radius, rot, time) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const R1 = radius * 1.08;
    const bx0 = Math.max(0, Math.floor(cx - R1)), by0 = Math.max(0, Math.floor(cy - R1));
    const bx1 = Math.min(W, Math.ceil(cx + R1)), by1 = Math.min(H, Math.ceil(cy + R1));
    const f = rotFns(rot), project = (p) => {
      const x1 = p.x * f.cyaw - p.z * f.syaw, z1 = p.x * f.syaw + p.z * f.cyaw;
      return { x: cx + x1 * radius, y: cy - (p.y * f.cp - z1 * f.sp) * radius, z: p.y * f.sp + z1 * f.cp };
    };
    if (bx1 <= bx0 || by1 <= by0) return project;
    const bw = bx1 - bx0, bh = by1 - by0;
    const px = Math.max(1, Math.sqrt((bw * bh) / 70000), radius / 2400 * 0 + 1);
    const w = Math.max(8, Math.round(bw / px)), h = Math.max(8, Math.round(bh / px));
    ensure(w, h);
    const d = img.data;
    const lx = -0.55, ly = 0.45, lz = 0.7;
    const cloudShift = time * 0.012;
    const cloudA = radius > Math.max(W, H) * 1.2 ? 0.35 : 0.85; // من قريب الغيوم أخف
    const sxk = bw / w, syk = bh / h;
    for (let j = 0; j < h; j++) {
      const sy = by0 + (j + 0.5) * syk, vy = (cy - sy) / radius;
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        const sx = bx0 + (i + 0.5) * sxk, vx = (sx - cx) / radius;
        const rr = vx * vx + vy * vy;
        if (rr > 1) {
          const a = 1 - (Math.sqrt(rr) - 1) / 0.06;
          if (a > 0) { d[o] = 120; d[o + 1] = 190; d[o + 2] = 255; d[o + 3] = a * 120; } else d[o + 3] = 0;
          continue;
        }
        const vz = Math.sqrt(1 - rr);
        const y1 = vy * f.cp + vz * f.sp, z1 = -vy * f.sp + vz * f.cp;
        const x2 = vx * f.cyaw + z1 * f.syaw, z2 = -vx * f.syaw + z1 * f.cyaw;
        const lat = Math.asin(Math.max(-1, Math.min(1, y1))), lon = Math.atan2(x2, z2);
        const ti = Math.min(TW - 1, Math.floor((lon + Math.PI) / (Math.PI * 2) * TW)), tj = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH));
        const k = (tj * TW + ti) * 3, ck = tj * TW + ti;
        let r = tex[k], g = tex[k + 1], b = tex[k + 2];
        const cn = own[ck];
        if (cn >= 0) {
          const cc = cols[cn];
          if (border[ck]) {
            // خط الحدود رفيع: بس عطرف التكسل
            const fu = ((lon + Math.PI) / (Math.PI * 2) * TW) % 1, fv = ((0.5 - lat / Math.PI) * TH) % 1;
            const th = Math.max(0.06, Math.min(0.35, 2.2 * TW / (radius * Math.PI * 2)));
            const edgeL = (ti % KW === 0 && fu < th) || (ti % KW === KW - 1 && fu > 1 - th);
            const edgeT = ((tj - (90 - LAT_TOP)) % KH === 0 && fv < th) || ((tj - (90 - LAT_TOP)) % KH === KH - 1 && fv > 1 - th);
            if (edgeL || edgeT) { r = 255; g = 244; b = 220; }
            else { r += (cc[0] - r) * 0.4; g += (cc[1] - g) * 0.4; b += (cc[2] - b) * 0.4; }
          } else { r += (cc[0] - r) * 0.4; g += (cc[1] - g) * 0.4; b += (cc[2] - b) * 0.4; }
        }
        const cu = ((lon + Math.PI) / (Math.PI * 2) + cloudShift) % 1;
        const cl = clouds[Math.min(CH - 1, Math.floor((0.5 - lat / Math.PI) * CH)) * CW + Math.min(CW - 1, Math.floor(cu * CW))] * cloudA;
        r += (245 - r) * cl; g += (248 - g) * cl; b += (255 - b) * cl;
        let sh = vx * lx + vy * ly + vz * lz;
        sh = sh > 0 ? 0.5 + sh * 0.6 : 0.5 + sh * 0.25;
        sh = Math.round(sh * 6) / 6;
        const rim = Math.pow(1 - vz, 3) * 0.6;
        d[o] = Math.min(255, r * sh + 90 * rim); d[o + 1] = Math.min(255, g * sh + 150 * rim); d[o + 2] = Math.min(255, b * sh + 230 * rim); d[o + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, bx0, by0, bw, bh);
    ctx.imageSmoothingEnabled = prev;
    return project;
  }
  function facing(p) { return { yaw: Math.atan2(p.x, p.z), pitch: Math.asin(p.y) }; }

  L.Planet = { render, spot, biomeOf, facing, BIOMES, count: cells.length, setCountries, invalidate, cellOf, dAt, delta, pointIn, dOfPoint, unproject, GW, GH };
})(window.LIFE);
