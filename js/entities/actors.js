// LIFE | حياة — الشخصيات: اللاعب والشخصيات غير القابلة للعب
(function (L) {
  'use strict';
  const T = L.TILE;
  const DX = [0, -1, 1, 0], DY = [1, 0, 0, -1];

  function Actor(x, y, look) {
    this.x = x; this.y = y; // منتصف القدمين بالبكسل
    this.dir = 0; this.frame = 0; this.animT = 0; this.moving = false;
    this.sheet = L.Characters.makeSheet(look);
    this.look = look;
  }
  Actor.prototype.box = function (x, y) {
    return { x: (x == null ? this.x : x) - 5, y: (y == null ? this.y : y) - 6, w: 10, h: 6 };
  };
  Actor.prototype.free = function (world, map, x, y, others) {
    const b = this.box(x, y);
    if (world.blocked(map, b)) return false;
    if (others) for (const o of others) if (o !== this && L.rectsOverlap(b, o.box())) return false;
    return true;
  };
  // حركة على محورين منفصلين مع انزلاق على الزوايا
  Actor.prototype.move = function (dx, dy, world, map, others, slide) {
    let moved = false;
    if (dx) {
      if (this.free(world, map, this.x + dx, this.y, others)) { this.x += dx; moved = true; }
      else if (slide && !dy) moved = this.nudge('y', Math.abs(dx), world, map, others, dx) || moved;
    }
    if (dy) {
      if (this.free(world, map, this.x, this.y + dy, others)) { this.y += dy; moved = true; }
      else if (slide && !dx) moved = this.nudge('x', Math.abs(dy), world, map, others, dy) || moved;
    }
    return moved;
  };
  // عند الاصطدام بزاوية قريبة، ادفع الشخصية جانبياً لتمر بسلاسة
  Actor.prototype.nudge = function (axis, amt, world, map, others, d) {
    for (let k = 1; k <= 6; k++) {
      for (const s of [1, -1]) {
        const ox = axis === 'x' ? s * k : 0, oy = axis === 'y' ? s * k : 0;
        const tx = this.x + ox + (axis === 'y' ? d : 0), ty = this.y + oy + (axis === 'x' ? d : 0);
        if (this.free(world, map, this.x + ox, this.y + oy, others) && this.free(world, map, tx, ty, others)) {
          const step = Math.min(amt, k);
          if (axis === 'x') this.x += s * step; else this.y += s * step;
          return true;
        }
      }
    }
    return false;
  };
  Actor.prototype.animate = function (dt) {
    if (this.moving) { this.animT += dt * 8; this.frame = Math.floor(this.animT) % 4; }
    else { this.animT = 0; this.frame = 0; }
  };
  Actor.prototype.draw = function (ctx) {
    L.Characters.drawCharacter(ctx, this.sheet, this.x, this.y, this.dir, this.frame);
  };

  // ---------------- اللاعب ----------------
  function Player(x, y, look) { Actor.call(this, x, y, look); this.speed = 74; }
  Player.prototype = Object.create(Actor.prototype);
  Player.prototype.update = function (dt, input, world, map, others) {
    const v = input.vector();
    this.moving = false;
    if (v.x || v.y) {
      // تحديد الاتجاه حسب المحور الأقوى
      if (Math.abs(v.x) > Math.abs(v.y)) this.dir = v.x < 0 ? 1 : 2; else this.dir = v.y < 0 ? 3 : 0;
      const len = Math.hypot(v.x, v.y) || 1;
      const sp = this.speed * dt;
      // خطوات صغيرة لتجنب اختراق الجدران عند انخفاض الإطارات
      const steps = Math.ceil(sp / 4);
      for (let i = 0; i < steps; i++) {
        const m = this.move((v.x / len) * sp / steps, (v.y / len) * sp / steps, world, map, others, true);
        if (m) this.moving = true;
      }
    }
    this.animate(dt);
  };
  // النقطة أمام اللاعب (للتفاعل)
  Player.prototype.front = function () {
    return { x: this.x + DX[this.dir] * 11, y: this.y - 3 + DY[this.dir] * 11 };
  };

  // ---------------- شخصيات الحي ----------------
  function NPC(def) {
    Actor.call(this, def.x * T, def.y * T, def.look);
    this.def = def; this.name = def.name;
    this.homeX = this.x; this.homeY = this.y;
    this.dir = def.dir || 0;
    this.timer = 1 + Math.random() * 2; this.wdir = -1;
    this.talking = false; this.lineIndex = 0; this.speed = 28;
  }
  NPC.prototype = Object.create(Actor.prototype);
  NPC.prototype.update = function (dt, world, map, others) {
    this.moving = false;
    if (this.def.static || this.talking) { this.animate(dt); return; }
    this.timer -= dt;
    if (this.timer <= 0) {
      const area = (this.def.area || 2) * T;
      const far = Math.abs(this.x - this.homeX) > area || Math.abs(this.y - this.homeY) > area;
      if (far) {
        const dx = this.homeX - this.x, dy = this.homeY - this.y;
        this.wdir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      } else {
        this.wdir = Math.random() < 0.4 ? -1 : Math.floor(Math.random() * 4);
      }
      this.timer = 0.8 + Math.random() * 2.2;
    }
    if (this.wdir >= 0) {
      this.dir = this.wdir;
      const ok = this.move(DX[this.wdir] * this.speed * dt, DY[this.wdir] * this.speed * dt, world, map, others, false);
      if (ok) this.moving = true; else { this.wdir = -1; }
    }
    this.animate(dt);
  };
  // الشخصيات لا تمشي في الشارع
  NPC.prototype.free = function (world, map, x, y, others) {
    if (!Actor.prototype.free.call(this, world, map, x, y, others)) return false;
    const b = this.box(x, y);
    const xs = [Math.floor(b.x / T), Math.floor((b.x + b.w) / T)], ys = [Math.floor(b.y / T), Math.floor((b.y + b.h) / T)];
    for (const ty of ys) for (const tx of xs) if (map.ground[ty * map.w + tx] === 'R') return false;
    return true;
  };
  NPC.prototype.faceTo = function (x, y) {
    const dx = x - this.x, dy = y - this.y;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
  };
  NPC.prototype.nextLine = function () {
    const l = this.def.lines[this.lineIndex % this.def.lines.length];
    this.lineIndex++;
    return l;
  };

  L.Player = Player;
  L.NPC = NPC;
})(window.LIFE);
