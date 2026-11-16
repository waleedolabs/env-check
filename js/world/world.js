// LIFE | حياة — تحميل الخرائط، التصادم، والرسم
(function (L) {
  'use strict';
  const T = L.TILE;

  function prepare(map) {
    const TYPES = L.Objects.TYPES;
    map.groundCanvas = map.groundCanvas || L.Tiles.renderGround(map);
    map.waterTiles = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (map.ground[y * map.w + x] === 'O') map.waterTiles.push({ x, y });
    }
    map.solids = [];
    map.flat = [];
    map.sorted = [];
    map.lights = [];
    map.windows = [];
    map.interactables = [];

    map.objects.forEach((o) => {
      const type = TYPES[o.type];
      if (!type) { console.warn('نوع غير معروف', o.type); return; }
      const w = o.w || type.w, h = o.h || type.h;
      const px = o.x * T, py = o.y * T;
      const img = type.sprite(o);
      const inst = { o, type, img, dx: px + type.ox, dy: py + type.oy, base: py + h * T, px, py, w: w * T, h: h * T };
      const hit = type.hit ? { x: px + type.hit.x, y: py + type.hit.y, w: type.hit.w, h: type.hit.h } : { x: px, y: py, w: w * T, h: h * T };
      if (type.solid !== false) map.solids.push(hit);
      if (type.flat) map.flat.push(inst); else map.sorted.push(inst);
      if (type.light) map.lights.push({ x: px + type.light.x, y: py + type.light.y, r: type.light.r, warm: !!type.light.warm });
      if (type.windows) type.windows(o).forEach((r) => map.windows.push({ x: px + r.x, y: py + r.y, w: r.w, h: r.h }));
      if (type.interact || o.action) {
        map.interactables.push({ rect: { x: px, y: py, w: w * T, h: h * T }, label: o.label || type.interact.label, action: o.action || type.interact.action, obj: o });
      }
    });

    map.doors.forEach((d) => {
      map.interactables.push({ rect: { x: d.x * T, y: d.y * T, w: T, h: T }, label: d.label, action: 'door', door: d });
    });
    map.exits.forEach((e) => {
      e.rect = { x: e.x * T, y: e.y * T, w: (e.w || 1) * T, h: (e.h || 1) * T };
      map.interactables.push({ rect: e.rect, label: e.label, action: 'exit', exit: e });
    });
    return map;
  }

  function World() { this.cache = {}; }
  World.prototype.get = function (id) {
    if (!this.cache[id]) {
      if (!L.Maps[id]) throw new Error('خريطة غير موجودة: ' + id);
      this.cache[id] = prepare(L.Maps[id]());
    }
    return this.cache[id];
  };

  // تحضير بالخلفية: خريطة جاهزة الأرض منحطها بالذاكرة
  World.prototype.put = function (id, map) { if (!this.cache[id]) this.cache[id] = prepare(map); return this.cache[id]; };
  // هل المستطيل يصطدم بجدار أو عائق؟
  World.prototype.blocked = function (map, r) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > map.w * T || r.y + r.h > map.h * T) return true;
    const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 0.01) / T);
    const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 0.01) / T);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const g = L.Tiles.GROUND[map.ground[y * map.w + x]];
      if (!g || g.solid) return true;
    }
    for (const s of map.solids) if (L.rectsOverlap(r, s)) return true;
    return false;
  };

  // رسم الخريطة والكيانات بترتيب العمق
  World.prototype.draw = function (ctx, map, view, entities, time) {
    ctx.drawImage(map.groundCanvas, 0, 0);
    L.Tiles.drawWaterAnim(ctx, map, time);
    const inView = (i) => i.dx < view.x + view.w + 8 && i.dx + i.img.width > view.x - 8 && i.dy < view.y + view.h + 8 && i.dy + i.img.height > view.y - 8;
    for (const i of map.flat) if (inView(i)) ctx.drawImage(i.img, i.dx, i.dy);
    const list = [];
    for (const i of map.sorted) if (inView(i)) list.push({ base: i.base, inst: i });
    for (const e of entities) list.push({ base: e.y, ent: e });
    list.sort((a, b) => a.base - b.base);
    for (const it of list) {
      if (it.inst) ctx.drawImage(it.inst.img, it.inst.dx, it.inst.dy);
      else it.ent.draw(ctx, time);
    }
  };

  L.World = World;
})(window.LIFE);
