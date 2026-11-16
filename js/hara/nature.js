// حارتنا — أشجار وزينة حسب البيئة، وأغراض الشغل (بحيرة، أحواض ورد، زبالة، مركبات)
(function (L) {
  'use strict';
  const T = L.TILE, R = L.rect;
  const sprite = L.Objects.helpers.sprite, shadow = L.Objects.helpers.shadowEllipse;
  const TYPES = L.Objects.TYPES;

  function pine(v) {
    return sprite('pine' + v, 24, 40, (c) => {
      shadow(c, 12, 37, 8, 3, 0.25);
      R(c, 10, 30, 4, 8, '#6b4a33');
      const g = v ? ['#2f6a4f', '#3f8a63', '#24503c'] : ['#3a6e48', '#4f8d5c', '#2a5236'];
      [[12, 2, 3], [12, 9, 6], [12, 16, 8], [12, 23, 10]].forEach(([x, y, w]) => {
        for (let i = 0; i < 8; i++) R(c, x - Math.round(w * i / 8), y + i, Math.round(w * i / 4) + 1, 1, i < 3 ? g[1] : g[0]);
        R(c, x - w, y + 8, w * 2 + 1, 1, g[2]);
      });
      // تلج
      R(c, 11, 2, 2, 2, '#ffffff'); R(c, 9, 10, 5, 1, '#f4f8fb'); R(c, 7, 17, 4, 1, '#f4f8fb'); R(c, 14, 24, 5, 1, '#f4f8fb');
    });
  }
  function cactus(v) {
    return sprite('cactus' + v, 16, 24, (c) => {
      shadow(c, 8, 22, 5, 2, 0.25);
      R(c, 6, 4, 4, 18, '#4f8a4a'); R(c, 7, 4, 1, 18, '#6fae5f'); R(c, 6, 3, 4, 1, '#3d6e3a');
      R(c, 2, 9, 3, 2, '#4f8a4a'); R(c, 2, 6, 2, 4, '#4f8a4a');
      if (v) { R(c, 11, 11, 3, 2, '#4f8a4a'); R(c, 12, 8, 2, 4, '#4f8a4a'); R(c, 7, 2, 2, 2, '#f59fb7'); }
      for (let y = 6; y < 20; y += 4) R(c, 9, y, 1, 1, '#e8e2c4');
    });
  }
  function palm(v) {
    return sprite('palm' + v, 32, 40, (c) => {
      shadow(c, 16, 37, 8, 3, 0.25);
      for (let y = 14; y < 38; y++) { const x = 14 + Math.round(Math.sin(y / 9 + v) * 2); R(c, x, y, 4, 1, y % 3 ? '#a8763f' : '#8a5d30'); }
      const lf = (x0, y0, dx, dy) => { for (let i = 0; i < 12; i++) R(c, x0 + Math.round(dx * i), y0 + Math.round(dy * i + i * i * 0.05), 3, 2, i < 6 ? '#4f9a4c' : '#3d7a3a'); };
      lf(16, 12, 1.1, -0.4); lf(15, 12, -1.1, -0.4); lf(16, 12, 0.9, 0.3); lf(15, 12, -0.9, 0.3); lf(15, 11, 0.1, -0.8);
      R(c, 14, 12, 3, 3, '#7a4b2a'); R(c, 17, 13, 2, 2, '#6b3f24');
    });
  }
  function rock(v) {
    return sprite('rock' + v, 16, 12, (c) => {
      R(c, 2, 4, 12, 7, '#8d8a84'); R(c, 3, 3, 9, 2, '#a7a39c'); R(c, 4, 5, 4, 2, '#bdb9b1'); R(c, 2, 10, 12, 1, '#6f6c66');
      if (v) { R(c, 3, 2, 8, 2, '#ffffff'); }
    });
  }
  function bed() {
    return sprite('gbed', 32, 16, (c) => {
      R(c, 0, 4, 32, 12, '#7a4b2a'); R(c, 2, 6, 28, 8, '#5a3a24');
      for (let i = 0; i < 6; i++) { const x = 4 + i * 4.6 | 0; R(c, x, 4, 1, 4, '#4f9a4c'); R(c, x - 1, 2, 3, 2, ['#f59fb7', '#ffd447', '#fff4d6', '#e05a4a'][i % 4]); R(c, x, 3, 1, 1, '#f0a020'); }
    });
  }
  function pier() {
    return sprite('pier', 32, 20, (c) => {
      R(c, 0, 4, 32, 12, '#a8835c'); for (let x = 0; x < 32; x += 6) R(c, x, 4, 1, 12, '#7a5a3f');
      R(c, 2, 14, 3, 6, '#6b4a33'); R(c, 27, 14, 3, 6, '#6b4a33'); R(c, 0, 4, 32, 1, '#c9a06a');
    });
  }
  function snowman() {
    return sprite('snowman', 16, 24, (c) => {
      shadow(c, 8, 22, 6, 2, 0.2);
      L.blob(c, 8, 16, 6, ['#ffffff', '#eef3f6', '#c9d6e0']); L.blob(c, 8, 7, 4, ['#ffffff', '#eef3f6', '#c9d6e0']);
      R(c, 6, 6, 1, 1, '#2a2030'); R(c, 9, 6, 1, 1, '#2a2030'); R(c, 8, 8, 2, 1, '#e8803a'); R(c, 5, 2, 6, 2, '#2a2030'); R(c, 6, 0, 4, 2, '#2a2030');
    });
  }

  Object.assign(TYPES, {
    pine: { w: 1, h: 1, ox: -4, oy: -24, hit: { x: 4, y: 6, w: 8, h: 9 }, sprite: (o) => pine(o.v || 0) },
    cactus: { w: 1, h: 1, ox: 0, oy: -9, hit: { x: 4, y: 7, w: 8, h: 8 }, sprite: (o) => cactus(o.v || 0) },
    palm: { w: 1, h: 1, ox: -8, oy: -24, hit: { x: 5, y: 8, w: 6, h: 7 }, sprite: (o) => palm(o.v || 0) },
    rock: { w: 1, h: 1, ox: 0, oy: 3, hit: { x: 2, y: 7, w: 12, h: 7 }, sprite: (o) => rock(o.v || 0) },
    gbed: { w: 2, h: 1, ox: 0, oy: 0, hit: { x: 0, y: 5, w: 32, h: 10 }, sprite: bed },
    pier: { w: 2, h: 1, ox: 0, oy: -2, flat: true, solid: false, sprite: pier },
    snowman: { w: 1, h: 1, ox: 0, oy: -9, hit: { x: 3, y: 9, w: 10, h: 6 }, sprite: snowman },
  });

  // شجرة البيئة
  function treeFor(biome, v) {
    if (biome === 'snow') return { type: 'pine', v: v % 2 };
    if (biome === 'desert') return v % 3 === 0 ? { type: 'palm', v } : { type: 'cactus', v: v % 2 };
    if (biome === 'island') return v % 2 ? { type: 'palm', v } : { type: 'tree', v: v % 3 };
    if (biome === 'forest') return v % 3 === 0 ? { type: 'pine', v: 1 } : { type: 'tree', v: v % 3 };
    return { type: 'tree', v: v % 3 };
  }

  // ---------- المركبات ----------
  const VEH = {
    bike: { name: 'بسكليت', price: 0, speed: 1.6, desc: 'أسرع مرة ونص' },
    scooter: { name: 'موتور', price: 0, speed: 2.1, desc: 'أسرع مرتين' },
    car: { name: 'سيارة', price: 0, speed: 2.7, desc: 'الأسرع، وبتنصفّ قدام بيتك' },
  };
  function bikeH(col) {
    return sprite('bikeH' + col, 22, 14, (c) => {
      const wheel = (x) => { R(c, x - 3, 8, 7, 1, '#2a2030'); R(c, x - 3, 13, 7, 1, '#2a2030'); R(c, x - 4, 9, 1, 4, '#2a2030'); R(c, x + 4, 9, 1, 4, '#2a2030'); R(c, x, 10, 1, 2, '#8a8478'); };
      wheel(4); wheel(17);
      R(c, 4, 10, 13, 1, col); R(c, 8, 6, 1, 5, col); R(c, 15, 4, 1, 7, col); R(c, 7, 5, 4, 2, '#2a2030'); R(c, 14, 3, 4, 2, '#3d4250');
    }, false);
  }
  function bikeV(col) {
    return sprite('bikeV' + col, 8, 20, (c) => {
      R(c, 3, 0, 2, 6, '#2a2030'); R(c, 3, 14, 2, 6, '#2a2030'); R(c, 3, 5, 2, 10, col); R(c, 0, 4, 8, 1, '#3d4250');
    }, false);
  }
  function scooterH(col) {
    return sprite('scH' + col, 26, 16, (c) => {
      R(c, 1, 10, 6, 6, '#2a2030'); R(c, 19, 10, 6, 6, '#2a2030'); R(c, 3, 12, 2, 2, '#8a8478'); R(c, 21, 12, 2, 2, '#8a8478');
      R(c, 4, 7, 18, 5, col); R(c, 4, 7, 18, 1, '#ffffff55'); R(c, 6, 4, 8, 3, '#2a2030'); R(c, 19, 1, 2, 7, '#3d4250'); R(c, 18, 1, 5, 1, '#3d4250'); R(c, 22, 6, 2, 2, '#ffe9a6');
    }, false);
  }
  function scooterV(col) {
    return sprite('scV' + col, 12, 22, (c) => {
      R(c, 4, 0, 4, 5, '#2a2030'); R(c, 4, 17, 4, 5, '#2a2030'); R(c, 3, 4, 6, 14, col); R(c, 4, 7, 4, 6, '#2a2030'); R(c, 0, 3, 12, 1, '#3d4250');
    }, false);
  }
  const carH = (color) => TYPES.car.sprite({ color: color || 'red' });
  const carVCache = {};
  function carV(color) {
    const k = color || 'red';
    if (carVCache[k]) return carVCache[k];
    const h = carH(k);
    const [c, x] = L.makeCanvas(h.height, h.width);
    x.translate(h.height / 2, h.width / 2); x.rotate(Math.PI / 2); x.drawImage(h, -h.width / 2, -h.height / 2);
    carVCache[k] = c; return c;
  }
  // رسم المركبة تحت اللاعب. dir: 0 تحت، 1 يسار، 2 يمين، 3 فوق
  function drawVehicle(ctx, kind, x, y, dir, col, time, moving) {
    x = Math.round(x); y = Math.round(y);
    const bob = moving ? (Math.floor(time * 10) % 2) : 0;
    if (kind === 'car') {
      const img = dir === 1 || dir === 2 ? carH(col) : carV(col);
      ctx.save();
      if (dir === 1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      ctx.drawImage(img, x - img.width / 2, y - img.height + 4 - bob * 0);
      ctx.restore();
      return;
    }
    const sc = kind === 'scooter';
    const colr = sc ? '#c8553f' : '#3d7a5a';
    const img = dir === 1 || dir === 2 ? (sc ? scooterH(colr) : bikeH(colr)) : (sc ? scooterV(colr) : bikeV(colr));
    ctx.save();
    if (dir === 1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(img, x - img.width / 2, y - img.height + 3);
    ctx.restore();
  }
  // صورة صغيرة للمتجر/الأزرار
  function vehIcon(kind) {
    const img = kind === 'car' ? carH('red') : kind === 'scooter' ? scooterH('#c8553f') : bikeH('#3d7a5a');
    const [c, x] = L.makeCanvas(32, 32);
    x.drawImage(img, Math.round((32 - img.width) / 2), Math.round((32 - img.height) / 2));
    return c.toDataURL();
  }

  // ---------- الزبالة (شغل التنضيف) ----------
  function litterSprite(v) {
    return sprite('litter' + v, 12, 10, (c) => {
      if (v === 0) { R(c, 2, 3, 8, 6, '#3d4250'); R(c, 3, 2, 6, 2, '#2a2030'); R(c, 4, 4, 2, 2, '#5a6070'); }
      else if (v === 1) { R(c, 3, 4, 6, 4, '#e8e2d2'); R(c, 3, 4, 6, 1, '#c8553f'); R(c, 5, 2, 2, 2, '#e8e2d2'); }
      else { R(c, 1, 5, 10, 3, '#c9a06a'); R(c, 2, 4, 3, 1, '#a8835c'); R(c, 7, 6, 3, 1, '#8a6a48'); }
    });
  }

  L.Nature = { treeFor, VEH, drawVehicle, vehIcon, litterSprite, carH };
})(window.LIFE);
