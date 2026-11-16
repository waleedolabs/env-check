// حارتنا — حلقة اللعبة
(function (L) {
  'use strict';
  const T = L.TILE, UI = L.UI, D = L.District, H = L.Houses, Net = L.Net;
  const TYPES = L.Objects.TYPES;

  const PALETTE = {
    skin: ['#f1c9a5', '#e8b98f', '#d9a47a', '#c99670', '#9a6a48', '#6e4a32'],
    hair: ['#1f1a24', '#3a2b2b', '#6b4a33', '#b07a3a', '#d9d4cc', '#c8553f'],
    shirt: ['#5a6b7a', '#3d7a5a', '#c8553f', '#4f86d6', '#8a64b0', '#d9832b', '#f2c14e', '#2f2f38'],
  };
  const ROOF_KEYS = Object.keys(H.ROOFS);

  const G = {
    state: 'title', world: new L.World(), map: null, player: null, npcs: [], residents: [],
    cam: { x: 0, y: 0 }, zoom: 3, time: 0, busy: false, saveTimer: 0, touch: false, target: null,
    s: null, count: 0, stamp: 1, build: null, particles: [], dirty: true, floaters: [], fishing: null, globe: null, camOff: { x: 0, y: 0 }, zoomMul: 1, dragging: false,
  };
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  const $ = (id) => document.getElementById(id);
  const esc = UI.esc;

  // ---------- الشاشة والكاميرا ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    G.zoom = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / (T * 13)));
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  // زوم فعلي = زوم اللعبة × تصغير/تكبير الإصبع
  function minMul() { if (!G.map) return 0.3; return Math.min(1, Math.max(canvas.width / (G.map.w * T * 2), canvas.height / (G.map.h * T * 2.2)) / G.zoom); }
  const zoomEff = () => G.zoom * L.clamp(G.zoomMul, minMul(), 1.6);
  const view = () => ({ x: G.cam.x, y: G.cam.y, w: canvas.width / zoomEff(), h: canvas.height / zoomEff() });
  function camTarget(px, py) {
    const v = view(), mh = G.map.h * T, c = G.map.cell;
    let y = py - v.h / 2;
    if (c && c.gy === 0) y = Math.max(y, 0);
    if (c && c.gy === L.Planet.GH - 1) y = Math.min(y, mh - v.h);
    return { x: px - v.w / 2, y };
  }
  function snapCamera() { G.camOff = { x: 0, y: 0 }; const t = camTarget(G.player.x, G.player.y - 8); G.cam.x = t.x; G.cam.y = t.y; }
  // سحب الكاميرا بالإصبع + قرص للتصغير/التكبير + نقرة على بيت
  function setupPan() {
    const pts = new Map();
    let pinch = null, moved = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (G.state !== 'play' || G.globe) return;
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; G.dragging = true;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: G.zoomMul }; }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; G.zoomMul = L.clamp(pinch.m * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, minMul(), 1.6); return; }
      const z = zoomEff() / dpr;
      G.camOff.x -= dx / z; G.camOff.y -= dy / z;
      clampOff();
    });
    const up = (e) => {
      const had = pts.delete(e.pointerId); if (!had) return;
      if (pts.size < 2) pinch = null;
      if (!pts.size) G.dragging = false;
      if (moved < 8 && G.state === 'play') tapWorld(e);
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { if (G.state !== 'play') return; e.preventDefault(); G.zoomMul = L.clamp(G.zoomMul * (e.deltaY > 0 ? 0.88 : 1.12), minMul(), 1.6); }, { passive: false });
  }
  function clampOff() {
    if (!G.map || !G.player) return;
    const mw = MW(), mh = MH();
    G.camOff.x = L.clamp(G.camOff.x, -mw * 2, mw * 2);
    G.camOff.y = L.clamp(G.camOff.y, -mh * 1.5, mh * 1.5);
  }
  function tapWorld(e) {
    if (UI.inDialog() || UI.modalOpen() || UI.cardOpen() || G.busy) return;
    const z = zoomEff(), r = canvas.getBoundingClientRect();
    const wx = G.cam.x + (e.clientX - r.left) * dpr / z, wy = G.cam.y + (e.clientY - r.top) * dpr / z;
    for (const h of G.map.homes) {
      if (!h.own || !h.door) continue;
      const ww = h.palace ? 19 * T : H.SHAPES[h.own.lvl].w * T;
      const hx = h.cx - ww / 2, top = h.top;
      if (wx >= hx && wx <= hx + ww && wy >= top && wy <= h.door.y + T) { showHouseCard(h); return; }
    }
  }
  // ساعة اللعبة: يوم كامل كل 24 دقيقة، ونفس الوقت عند كل الناس
  const GAME_DAY = 24 * 60 * 1000;
  const hourNow = () => ((Date.now() + 9 * 60 * 1000) % GAME_DAY) / GAME_DAY * 24;
  const isNight = (h) => { h = h == null ? (G.hourOverride != null ? G.hourOverride : hourNow()) : h; return h >= 19.5 || h < 5.5; };
  const clockText = () => { const h = hourNow(); return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0'); };

  // ---------- الحفظ المحلي ----------
  function fresh(name, look) {
    return { name, look, roof: ROOF_KEYS[Math.floor(Math.random() * 4)], wall: Math.floor(Math.random() * 6), money: 50, lvl: 0, plot: null, motto: '', dlv: 0, d: 1, x: null, y: null, delivery: null, greet: { day: '', ids: [] }, t: 0, rentAt: 0, veh: { own: {}, ride: '' }, fish: 0 };
  }
  function save() {
    if (G.state !== 'play' || !G.s) return;
    G.s.d = +G.map.id.slice(1); G.s.x = Math.round(G.player.x); G.s.y = Math.round(G.player.y); G.s.dir = G.player.dir;
    L.Save.write(JSON.parse(JSON.stringify(G.s)));
    G.saveTimer = 0;
  }
  function myHouseData() {
    const s = G.s;
    return { name: s.name, lvl: s.lvl, plot: s.plot, roof: s.roof, wall: s.wall, motto: s.motto, look: s.look, t: s.t, dlv: s.dlv, veh: bestVeh(), cname: s.cname || '', flag: s.flag || '', cf: s.cf || '', deco: s.deco || [] };
  }
  async function pushHouse() {
    if (!G.s.plot) return;
    const r = await Net.saveMine(myHouseData());
    if (r.ok && r.lvl && r.lvl < G.s.lvl) { clearTimeout(G._retry); G._retry = setTimeout(pushHouse, 65000); } // السيرفر بيرفع درجة كل دقيقة
    if (!r.ok) {
      if (r.reason === 'readonly') UI.toast('بيتك محفوظ عندك بس (هالرابط للمشاهدة)', 'home');
      else if (r.reason === 'taken') lostPlot();
      else if (r.reason === 'country') lostCountry();
      else if (r.reason === 'name') askNewName();
      else if (r.reason === 'net') UI.toast('ما قدرنا نوصل للسيرفر، رح نحاول بعدين', 'phone', 'bad');
    }
  }

  function bestVeh() { const o = (G.s && G.s.veh && G.s.veh.own) || {}; return o.car ? 'car' : o.scooter ? 'scooter' : o.bike ? 'bike' : ''; }

  // ---------- الدول والرؤساء ----------
  // كل حي = دولة. رئيسها أول متابع بنى فيها (الأقدم)
  const FLAGS = ['#c8553f', '#3d7a5a', '#4f78b8', '#f2c14e', '#8a64b0', '#2f8f8a', '#d9832b', '#2a2030'];
  function allHouses() {
    const list = [...Net.houses.values()];
    if (G.s && G.s.lvl && G.s.plot && !Net.houses.has(Net.myId)) list.push(Object.assign({ id: Net.myId }, myHouseData()));
    else if (G.s && G.s.lvl && Net.houses.has(Net.myId)) { const i = list.findIndex((h) => h.id === Net.myId); list[i] = Object.assign({ id: Net.myId }, myHouseData()); }
    return list;
  }
  // ---------- توزيع الرؤساء ----------
  // طالما في دول بلا رئيس: كل واحد جديد بياخد دولة لحاله. الدولة 1 للقصر.
  let _freeVer = -1, _free = 0;
  function countryFree(d) { if (d === 1) return false; const f = Net.firstIn(d); return !f || f.id === Net.myId; }
  function firstFreeCountry() {
    const v = Net.ver + ':' + (G.s && G.s.plot);
    if (v === _freeVer) return _free;
    _freeVer = v; _free = 0;
    for (let d = 2; d <= L.Planet.count; d++) if (countryFree(d)) { _free = d; break; }
    return _free;
  }
  const presRace = () => firstFreeCountry() > 0;
  function canBuildIn(d) { return !presRace() ? d !== 1 || !!(G.s && G.s.owner) : countryFree(d); }
  function goMyCountry() { const d = firstFreeCountry(); if (d) goPlaza(d); }

  // ---------- القصر ----------
  const PAL_ID = 'd1-palace';
  // صاحب القصر: بيفوت بكود سري (اللعبة بتعرف بصمته بس، مو الكود نفسه)
  const OWNER_HASH = '16c62d36a2472f51ee8a595ef7b1062d340a189d57ef1570c4994e499cf58d3b';
  async function checkOwnerCode(code) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(code).trim()));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === OWNER_HASH;
    } catch (e) { return false; }
  }
  async function useOwnerCode(code, quiet) {
    const ok = await checkOwnerCode(code);
    if (!ok) { if (!quiet) UI.toast('الكود غلط', 'flag', 'bad'); return false; }
    try { localStorage.setItem('hara_owner', String(code).trim()); } catch (e) { /* */ }
    Net.ownerCode = String(code).trim(); G.ownerOK = true;
    if (G.s) applyOwner();
    else if (!quiet) { UI.toast('أهلاً يا صاحب القصر 👑 اضغط ادخل', 'home', 'good'); const ni = $('name-input'), po = Net.ownerOf(PAL_ID); ni.value = po ? po.name : ''; ni.placeholder = 'اسمك يا صاحب القصر'; ni.focus(); }
    return true;
  }
  function applyOwner() {
    if (!G.ownerOK || !G.s) return;
    const was = G.s.owner;
    G.s.owner = true; G.s.plot = PAL_ID; G.s.lvl = 10; G.s.t = G.s.t || Date.now();
    if (!G.s.flag) G.s.flag = '#3d7a5a';
    if (!G.s.cname) G.s.cname = 'مملكة ' + G.s.name;
    rebuildAll(); pushHouse(); save();
    if (!was && G.state === 'play') UI.card({ icon: 'home', sub: 'صاحب الحارة', title: 'قصرك جاهز 👑', text: 'إنت رئيس الدولة 1 للأبد، وقصرك أفخم مكان بالعالم.\nمن «بيتي» بتغيّر اسم دولتك ولون علمك وشعارك.', button: 'روح عالقصر', onClose: () => goToPlot(PAL_ID) });
  }
  function palaceOwner() {
    if (G.s && G.s.owner) return Object.assign({ id: Net.myId }, myHouseData(), { me: true, palace: true, lvl: 10, t: 0 });
    const o = Net.ownerOf(PAL_ID);
    return o ? Object.assign({}, o, { palace: true, t: 0 }) : null;
  }
  function palaceHome(q) {
    const own = palaceOwner() || { id: 'palace-none', name: 'صاحب الحارة', lvl: 10, palace: true, elder: true, motto: 'أهلاً وسهلاً بكل الحارة', look: {} };
    return { p: { id: PAL_ID, x: q.x + 1, y: q.y, d: 1, n: -1 }, own, palace: true };
  }
  function presidentOf(d) {
    if (d === 1) { const po = palaceOwner(); if (po) return po; }
    let best = Net.firstIn(d);
    // بيتي لسا ما وصل للسيرفر؟ منحسبه كمان
    if (G.s && G.s.lvl && G.s.plot && +G.s.plot.split('-')[0].slice(1) === d) {
      const me = Object.assign({ id: Net.myId }, myHouseData());
      if (best && best.id === Net.myId) best = me;
      else if (!Net.houses.has(Net.myId) && (!best || me.t < best.t)) best = me;
    }
    return best;
  }
  function countryOf(d) {
    const pres = presidentOf(d);
    const bn = L.Planet.BIOMES[L.Planet.biomeOf(d)].name;
    return { d, pres, name: (pres && pres.cname) || 'دولة ' + bn + ' ' + d, flag: (pres && pres.flag) || FLAGS[(d * 3) % FLAGS.length] };
  }
  const amPresident = () => { if (!G.s || !G.s.plot) return false; const p = presidentOf(+G.s.plot.split('-')[0].slice(1)); return !!p && p.id === Net.myId; };
  function showHouseCard(h) {
    if (h.palace) {
      const o = h.own;
      UI.dialog('👑 قصر ' + o.name, [(o.elder ? 'قصر صاحب الحارة. ' : 'صاحب الحارة ورئيس ' + countryOf(1).name + '. ') + 'أفخم مكان بالعالم كلّه.' + (o.motto ? '\n«' + o.motto + '»' : '')]);
      return;
    }
    const o = h.own, c = countryOf(h.p.d), pres = c.pres && c.pres.id === o.id;
    UI.dialog((pres ? '👑 ' : '') + o.name, [
      (pres ? 'رئيس ' + c.name + '. ' : '') + 'بيته ' + D.LEVEL_NAMES[o.lvl] + ' (مستوى ' + o.lvl + ')' + (o.veh ? ' وعنده ' + L.Nature.VEH[o.veh].name : '') + '.' + (o.motto ? '\n«' + o.motto + '»' : ''),
    ]);
  }

  // ---------- الأراضي والبيوت ----------
  function plotOwner(p) {
    if (p.elder) return Object.assign({ id: 'elder-' + p.n, elder: true, wall: p.n % 6 }, p.elder);
    if (G.s && G.s.plot === p.id && G.s.lvl > 0) {
      const o = Net.ownerOf(p.id);
      if (!o || o.id === Net.myId) return Object.assign({ id: Net.myId, me: true }, myHouseData());
    }
    return Net.ownerOf(p.id);
  }
  function makeInst(o, img, typeOverride) {
    const type = typeOverride || TYPES[o.type];
    const w = o.w || type.w, h = o.h || type.h;
    const px = o.x * T, py = o.y * T;
    img = img || type.sprite(o);
    const inst = { o, type, img, dx: px + type.ox, dy: py + type.oy, base: py + h * T, px, py, w: w * T, h: h * T };
    const hit = type.hit ? { x: px + type.hit.x, y: py + type.hit.y, w: type.hit.w, h: type.hit.h } : { x: px, y: py, w: w * T, h: h * T };
    return { inst, hit };
  }

  // يعيد بناء طبقة البيوت للحي الحالي
  function rebuild(m) {
    m = m || G.map;
    if (!m._static) m._static = { flat: m.flat.slice(), sorted: m.sorted.slice(), solids: m.solids.slice(), lights: m.lights.slice(), windows: m.windows.slice() };
    const st = m._static;
    const flat = [], sorted = [], solids = [], lights = [], windows = [];
    m.homes = [];
    const keep = {};
    (m.residents || []).forEach((r) => { keep[r.key] = r; });
    const residents = [];
    m.plots.forEach((p) => {
      const own = plotOwner(p);
      if (G.build && G.build.plot === p.id) { m.homes.push({ p, own: null, building: true }); return; }
      if (!own) {
        flat.push(makeInst({ type: 'x', x: p.x, y: p.y }, H.lotSprite(), { w: 7, h: 6, ox: 0, oy: 0, flat: true }).inst);
        const sign = makeInst({ type: 'x', x: p.x + 3, y: p.y + 3 }, H.saleSign(), { w: 1, h: 1, ox: -1, oy: -8, hit: { x: 3, y: 10, w: 10, h: 5 } });
        sorted.push(sign.inst); solids.push(sign.hit);
        [[p.x, p.y], [p.x + 6, p.y], [p.x, p.y + 5], [p.x + 6, p.y + 5]].forEach(([x, y]) => {
          sorted.push(makeInst({ type: 'x', x, y }, H.stake(), { w: 1, h: 1, ox: 6, oy: 6, hit: { x: 6, y: 12, w: 4, h: 2 } }).inst);
        });
        // شجرة/صخرة طبيعية بزاوية الأرض الفاضية
        const nb = m.biome, v = p.n % 4;
        const nat = v === 0 ? { type: 'rock', v: nb === 'snow' ? 1 : 0 } : v === 1 ? L.Nature.treeFor(nb, p.n) : null;
        if (nat) { const o = Object.assign({ x: p.x + 1, y: p.y + 1 }, nat); const d2 = makeInst(o); sorted.push(d2.inst); solids.push(d2.hit); }
        if (nb === 'snow' && p.n % 5 === 2) { const d3 = makeInst({ type: 'snowman', x: p.x + 5, y: p.y + 2 }); sorted.push(d3.inst); solids.push(d3.hit); }
        m.homes.push({ p, own: null });
        return;
      }
      const S = H.SHAPES[own.lvl];
      const hx = p.x + Math.floor((D.PW - S.w) / 2), hy = p.y + 5 - S.h;
      const himg = H.houseSprite(own.lvl, own.roof, own.wall);
      const house = makeInst({ type: 'h', x: hx, y: hy }, himg, { w: S.w, h: S.h, ox: -4, oy: S.h * T - himg.height, hit: { x: 0, y: 6, w: S.w * T, h: S.h * T - 6 } });
      sorted.push(house.inst); solids.push(house.hit);
      const htop = (hy + S.h) * T - himg.height;
      // شبابيك بتضوي بالليل
      if (S.tower) { himg._wins.forEach((w) => windows.push({ x: hx * T - 4 + w.x, y: htop + w.y, w: w.w, h: w.h })); }
      else {
      const roofH = 8 + 2 * T - (own.lvl === 1 ? 6 : 0);
      const groundY = S.h * T + 8 - 25;
      const rows = S.floors === 2 ? [roofH + 6, groundY + 2] : [own.lvl === 1 ? roofH + 5 : roofH + 9];
      rows.forEach((wy, ri) => S.win.concat(S.floors === 2 && ri === 0 ? [S.door] : []).forEach((c) => {
        if (ri === rows.length - 1 && c === S.door) return;
        windows.push({ x: hx * T + c * T + 2, y: hy * T - 8 + wy, w: 12, h: 11 });
      }));
      }
      lights.push({ x: hx * T + S.door * T + 14, y: (hy + S.h) * T - 20, r: 26, warm: true });
      H.decor(p, own.lvl, own.deco).forEach((o) => {
        const d = makeInst(o);
        if (d.inst.type.flat) flat.push(d.inst); else sorted.push(d.inst);
        if (d.inst.type.solid !== false) solids.push(d.hit);
        if (d.inst.type.light) lights.push({ x: o.x * T + d.inst.type.light.x, y: o.y * T + d.inst.type.light.y, r: d.inst.type.light.r });
      });
      if (own.veh === 'car' && !(own.me && G.s.veh.ride === 'car')) {
        const c = makeInst({ type: 'car', x: p.x + 4, y: p.y + 7, color: ['red', 'blue', 'yellow', 'white'][p.n % 4] });
        sorted.push(c.inst); solids.push(c.hit);
      } else if ((own.veh === 'bike' || own.veh === 'scooter') && !(own.me && G.s.veh.ride === own.veh)) {
        sorted.push(makeInst({ type: 'x', x: p.x + 5, y: p.y + 6 }, own.veh === 'scooter' ? TYPES.scooter.sprite({}) : parkedBike(), { w: 1, h: 1, ox: own.veh === 'scooter' ? -2 : -3, oy: own.veh === 'scooter' ? -6 : 2 }).inst);
      }
      const door = { x: (hx + S.door) * T, y: (p.y + 4) * T, w: T, h: T };
      m.homes.push({ p, own, door, top: htop, cx: (hx + S.w / 2) * T });
      if (!own.me) {
        const key = own.id + ':' + p.id;
        let r = keep[key];
        if (!r) {
          r = new L.NPC({ id: key, name: own.name, x: p.x + 3.5 + (Math.random() - 0.5) * 2, y: p.y + 6.6, area: 2, look: own.look, lines: [''] });
          r.key = key;
        }
        r.house = own; r.plot = p;
        residents.push(r);
      }
    });
    if (m.palace) { // القصر
      const ph = palaceHome(m.palace), own = ph.own;
      const img = L.Palace.palaceSprite(own.flag || '#c8553f');
      const px = ph.p.x, py = ph.p.y, oy = 4 * T - img.height;
      const pi = makeInst({ type: 'x', x: px, y: py }, img, { w: 19, h: 4, ox: -4, oy, hit: { x: 0, y: 14, w: 19 * T, h: 4 * T - 14 } });
      sorted.push(pi.inst); solids.push(pi.hit);
      const top = py * T + oy, sx0 = px * T - 4;
      img._wins.forEach((w) => windows.push({ x: sx0 + w.x, y: top + w.y, w: w.w, h: w.h }));
      lights.push({ x: sx0 + 158, y: (py + 4) * T - 12, r: 52, warm: true });
      [124, 191].forEach((lx) => lights.push({ x: sx0 + lx, y: top + 154, r: 22, warm: true }));
      ph.door = { x: sx0 + 150, y: (py + 3) * T, w: 16, h: T }; ph.top = top; ph.cx = sx0 + 156;
      m.homes.push(ph);
      if (!own.me && !own.elder) { // صاحب القصر بيتمشى بالساحة
        const key = own.id + ':' + PAL_ID;
        let r = keep[key];
        if (!r) { r = new L.NPC({ id: key, name: own.name, x: px + 9.5, y: py + 5.4, area: 3, look: own.look, lines: [''] }); r.key = key; }
        r.house = own; r.plot = ph.p; residents.push(r);
      }
    }
    m._pres = presidentOf(m.d); m._country = countryOf(m.d);
    { // سارية العلم بالساحة بلون الدولة
      const fp = makeInst({ type: 'x', x: m.flagpole.x, y: m.flagpole.y }, flagSprite(m._country.flag), { w: 1, h: 1, ox: 0, oy: -34, hit: { x: 6, y: 10, w: 4, h: 5 } });
      sorted.push(fp.inst); solids.push(fp.hit);
    }
    m.flat = st.flat.concat(flat);
    m.sorted = st.sorted.concat(sorted);
    m.solids = st.solids.concat(solids);
    m.lights = st.lights.concat(lights);
    m.windows = st.windows.concat(windows);
    m.residents = residents; m._stamp = G.stamp;
    if (m === G.map) G.npcs = m._npcs.concat(residents);
    G.count = Net.houses.size + (G.s && G.s.lvl && !Net.houses.has(Net.myId) ? 1 : 0);
  }
  function rebuildAll() { G.stamp++; G.dirty = false; if (G.map) rebuild(G.map); }

  const _flags = {};
  function flagSprite(col) {
    if (_flags[col]) return _flags[col];
    const [c, x] = L.makeCanvas(26, 50);
    L.rect(x, 6, 2, 2, 46, '#5a4a3a'); L.rect(x, 7, 2, 1, 46, '#8a7a6a'); L.rect(x, 5, 0, 4, 3, '#f2c14e');
    L.rect(x, 9, 4, 16, 10, col); L.rect(x, 9, 4, 16, 1, 'rgba(255,255,255,.35)'); L.rect(x, 9, 13, 16, 1, 'rgba(0,0,0,.25)');
    L.rect(x, 15, 7, 4, 4, '#fff4dc');
    L.rect(x, 3, 46, 8, 4, '#8d8a84'); L.outline(c, '#2a2030');
    _flags[col] = c; return c;
  }
  let _pb = null;
  function parkedBike() {
    if (_pb) return _pb;
    const [c, x] = L.makeCanvas(22, 14); L.Nature.drawVehicle(x, 'bike', 11, 11, 2, null, 0, false); _pb = c; return c;
  }
  // ---------- العالم المفتوح: الدولة الحالية + جيرانها ----------
  function ensureChunk(d) {
    const m = G.world.get('d' + d);
    initJobs(m);
    if (!m._npcs) m._npcs = m.npcs.map((n) => new L.NPC(n));
    if (m._stamp !== G.stamp) rebuild(m);
    m._used = G.time;
    // نخلي بالذاكرة أقرب 16 دولة بس
    const keys = Object.keys(G.world.cache);
    if (keys.length > 16) {
      keys.map((k) => G.world.cache[k]).filter((x) => x !== G.map && x !== m).sort((a, b) => (a._used || 0) - (b._used || 0)).slice(0, keys.length - 16)
        .forEach((x) => { delete G.world.cache[x.id]; });
    }
    return m;
  }
  function loadDistrict(d) {
    G.map = ensureChunk(d);
    G.npcs = G.map._npcs.concat(G.map.residents || []);
  }
  const MW = () => D.W * T, MH = () => D.H * T;
  // الدول اللي بتبين بالشاشة، مع إزاحتها عن الدولة الحالية
  function visibleChunks() {
    const v = view(), mw = MW(), mh = MH(), out = [];
    const c = G.map.cell;
    for (let dy = Math.floor(v.y / mh); dy <= Math.floor((v.y + v.h) / mh); dy++) {
      for (let dx = Math.floor(v.x / mw); dx <= Math.floor((v.x + v.w) / mw); dx++) {
        const d = dx === 0 && dy === 0 ? G.map.d : L.Planet.dAt(c.gx + dx, c.gy + dy);
        if (!d) continue;
        out.push({ m: dx === 0 && dy === 0 ? G.map : ensureChunk(d), ox: dx * mw, oy: dy * mh });
      }
    }
    return out;
  }
  function chunkAt(dx, dy) {
    if (!dx && !dy) return G.map;
    const d = L.Planet.dAt(G.map.cell.gx + dx, G.map.cell.gy + dy);
    return d ? ensureChunk(d) : null;
  }
  // ---------- تحضير الدول الجارة بالخلفية (شوي بكل إطار) ----------
  let _pre = null;
  function nextToPrep() {
    if (!G.map || !G.map.cell || !G.player) return 0;
    const c = G.map.cell, fx = G.player.x / MW() - 0.5, fy = G.player.y / MH() - 0.5;
    let best = 0, bp = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const d = L.Planet.dAt(c.gx + dx, c.gy + dy); if (!d) continue;
      const m = G.world.cache['d' + d]; if (m && m._stamp === G.stamp && m._npcs) continue;
      const pr = -(dx * fx + dy * fy); // الجهة اللي إنت أقرب لها أول
      if (pr < bp) { bp = pr; best = d; }
    }
    return best;
  }
  function* prepSteps(d) {
    const id = 'd' + d;
    let m = G.world.cache[id];
    if (!m) {
      const raw = L.Maps[id](); yield;
      const g = L.Tiles.groundSteps(raw, 3); let r;
      while (!(r = g.next()).done) yield;
      raw.groundCanvas = r.value; yield;
      m = G.world.put(id, raw); yield;
    }
    initJobs(m); if (!m._npcs) m._npcs = m.npcs.map((n) => new L.NPC(n)); yield;
    // صور البيوت وحدة وحدة (بتنحفظ، فالبناء بعدها سريع)
    for (const p of m.plots) { const own = plotOwner(p); if (own && H.SHAPES[own.lvl]) { H.houseSprite(own.lvl, own.roof, own.wall); yield; } }
    if (m._stamp !== G.stamp) rebuild(m);
    m._used = G.time;
  }
  function prepTick() {
    const t0 = performance.now();
    while (performance.now() - t0 < 4) {
      if (!_pre) { const d = nextToPrep(); if (!d) return; _pre = prepSteps(d); }
      if (_pre.next().done) _pre = null;
    }
  }
  // نسخة خفيفة من الدولة للخريطة بس (بدون بناء بلاط ورسومات)
  const _lite = {};
  function liteOf(d) {
    const full = G.world.cache['d' + d];
    if (full && full.homes && full._stamp === G.stamp) return full;
    let m = _lite[d];
    if (m && m._stamp === G.stamp) return m;
    m = { d, biome: L.Planet.biomeOf(d), pois: (G.map.pois || []).filter((p) => p.k !== 'palace'), _stamp: G.stamp };
    m.homes = D.plotList(d).map((p) => ({ p, own: plotOwner(p) }));
    if (d === 1) { m.homes.push(palaceHome(D.palaceSpot())); m.pois = m.pois.concat([D.palacePoi()]); }
    m._pres = presidentOf(d); m._country = countryOf(d);
    _lite[d] = m;
    return m;
  }
  function mapChunk(dx, dy) {
    if (!dx && !dy) return G.map;
    const d = L.Planet.dAt(G.map.cell.gx + dx, G.map.cell.gy + dy);
    return d ? liteOf(d) : null;
  }
  // تصادم عبر الحدود: منقسم المستطيل على الدول اللي بيلمسها
  function blockedOpen(orig, map, r) {
    const mw = MW(), mh = MH();
    if (r.x >= 0 && r.y >= 0 && r.x + r.w <= mw && r.y + r.h <= mh) return orig(map, r);
    const xs = [r.x, r.x + r.w], ys = [r.y, r.y + r.h];
    [0, mw].forEach((b) => { if (b > r.x && b < r.x + r.w) xs.splice(1, 0, b); });
    [0, mh].forEach((b) => { if (b > r.y && b < r.y + r.h) ys.splice(1, 0, b); });
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i], y0 = ys[j], w = xs[i + 1] - x0, h = ys[j + 1] - y0;
      if (w <= 0 || h <= 0) continue;
      const dx = Math.floor((x0 + w / 2) / mw), dy = Math.floor((y0 + h / 2) / mh);
      const base = map.cell ? map : G.map;
      const d = dx || dy ? L.Planet.dAt(base.cell.gx + dx, base.cell.gy + dy) : base.d;
      if (!d) return true;
      const m2 = dx || dy ? ensureChunk(d) : base;
      if (orig(m2, { x: x0 - dx * mw, y: y0 - dy * mh, w, h })) return true;
    }
    return false;
  }
  // اللاعب قطع الحدود؟
  function checkCross() {
    const mw = MW(), mh = MH(), p = G.player;
    let dx = 0, dy = 0;
    if (p.x < 0) dx = -1; else if (p.x >= mw) dx = 1;
    if (p.y < 0) dy = -1; else if (p.y >= mh) dy = 1;
    if (!dx && !dy) return;
    const d = L.Planet.dAt(G.map.cell.gx + dx, G.map.cell.gy + dy);
    if (!d) return;
    const sx = -dx * mw, sy = -dy * mh;
    G.map = ensureChunk(d);
    G.npcs = G.map._npcs.concat(G.map.residents || []);
    p.x += sx; p.y += sy; G.cam.x += sx; G.cam.y += sy;
    G.camOff.x = G.camOff.x; // نفس الإزاحة
    const c = countryOf(d);
    UI.banner('أهلاً بـ' + c.name + (c.pres ? ' · 👑 ' + c.pres.name : ''), 'flag');
    stamp(d);
    L.Audio.play('day');
    save();
  }
  function plotById(id) {
    if (id === PAL_ID) { const q = D.palaceSpot(); return { d: 1, plot: { id, x: q.x + 7, y: q.y - 1.2, d: 1 } }; }
    const d = +id.split('-')[0].slice(1), n = +id.split('-')[1];
    return { d, plot: D.plotList(d).find((p) => p.n === n) };
  }
  function districtsCount() {
    let max = 1;
    Net.houses.forEach((h) => { const d = +h.plot.split('-')[0].slice(1); if (d > max) max = d; });
    const inMax = [...Net.houses.values()].filter((h) => h.plot.startsWith('d' + max + '-')).length;
    return Math.max(5, inMax >= D.plotsFree(max) * 0.85 ? max + 1 : max); // أول 5 أحياء (5 بيئات) مفتوحة من البداية
  }

  // ---------- الشغلات ----------
  const FISH = [
    { name: 'سمكة صغيرة', pay: 14, w: 40 }, { name: 'سمكة ملوّنة', pay: 24, w: 30 },
    { name: 'سمكة كبيرة', pay: 40, w: 18 }, { name: 'سمكة ذهبية!', pay: 90, w: 4 }, { name: 'صندل قديم 😅', pay: 2, w: 8 },
  ];
  function initJobs(m) {
    if (m.litter) return;
    m.litter = []; m.beds = [0, 0, 0, 0];
    m.paveTiles = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.ground[y * m.w + x] === 'P') m.paveTiles.push({ x, y });
    for (let i = 0; i < 10; i++) spawnLitter(m);
  }
  function spawnLitter(m) {
    if (m.litter.length >= 14) return;
    for (let k = 0; k < 20; k++) {
      const t = m.paveTiles[Math.floor(Math.random() * m.paveTiles.length)];
      const x = t.x * T + 3 + Math.random() * 10, y = t.y * T + 8 + Math.random() * 6;
      const b = { x: x - 4, y: y - 4, w: 8, h: 6 };
      if (m.solids.some((s2) => L.rectsOverlap(b, s2))) continue;
      const v = Math.floor(Math.random() * 3);
      m.litter.push({ x, y, v, img: L.Nature.litterSprite(v), draw(ctx) { ctx.drawImage(this.img, Math.round(this.x - 6), Math.round(this.y - 9)); } });
      return;
    }
  }
  function earn(n, icon, text) {
    G.s.money += n; L.Audio.play('coin');
    UI.toast((text ? text + ' · ' : '') + '+' + n + '$', icon || 'coin', 'good');
    G.floaters.push({ x: G.player.x, y: G.player.y - 26, t: 0, text: '+' + n + '$' });
  }
  const RENT_PER_HOUR = 25, RENT_CAP_H = 6;
  function rentDue() {
    const s = G.s; if (!s.lvl) return 0;
    if (!s.rentAt) s.rentAt = Date.now();
    const h = Math.min(RENT_CAP_H, (Date.now() - s.rentAt) / 3600000);
    return Math.floor(h * s.lvl * RENT_PER_HOUR);
  }

  // ---------- الانتقال ----------
  function goTo(d, tx, ty, dir) {
    if (G.busy) return;
    G.busy = true; L.Input.clear(); UI.prompt(null);
    UI.fade(() => {
      if (!G.map || G.map.id !== 'd' + d) loadDistrict(d);
      G.player.x = tx * T; G.player.y = ty * T; G.player.dir = dir || 3;
      snapCamera();
    }).then(() => { G.busy = false; stamp(G.map.d); const c = countryOf(G.map.d); UI.banner(c.name + (c.pres ? ' · 👑 ' + c.pres.name : ' · بلا رئيس'), 'flag'); save(); });
  }
  function goToPlot(id) { const { d, plot } = plotById(id); goTo(d, plot.x + 3.5, plot.y + 6.6, 3); }
  function goPlaza(d) { const m = G.world.get('d' + (d || 1)); goTo(d || 1, m.start.x, m.start.y, 0); }

  // ---------- التفاعل ----------
  const inRect = (pt, r) => pt.x >= r.x && pt.x < r.x + r.w && pt.y >= r.y && pt.y < r.y + r.h;
  function findTarget() {
    const f = G.player.front();
    for (const n of G.npcs) if (Math.hypot(f.x - n.x, f.y - (n.y - 4)) < 12) return { label: n.def.action === 'vehicles' ? 'كراج أبو سامي (مركبات ببلاش)' : n.def.action === 'delivery' ? 'شغل توصيل عند أبو ماهر' : 'التحدث مع ' + n.name, npc: n };
    for (const l of G.map.litter) if (Math.hypot(f.x - l.x, f.y - l.y) < 11 || Math.hypot(G.player.x - l.x, G.player.y - 2 - l.y) < 9) return { label: 'نضّف الشارع (+8$)', litter: l, action: 'litter' };
    for (const h of G.map.homes) {
      if (!h.own || !h.door) continue;
      const r = { x: h.door.x - 4, y: h.door.y, w: h.door.w + 8, h: h.door.h + 4 };
      if (inRect(f, r)) {
        const dv = G.s.delivery;
        if (dv && dv.plot === h.p.id) return { label: 'سلّم الطلب لـ ' + h.own.name, home: h, action: 'deliver' };
        if (h.own.me) return { label: h.palace ? 'قصري 👑' : 'بيتي', home: h, action: 'myhouse' };
        if (h.palace) return { label: 'باب القصر 👑', home: h, action: 'palace' };
        return { label: 'دق باب ' + h.own.name, home: h, action: 'knock' };
      }
    }
    for (const it of G.map.interactables) if (inRect(f, it.rect)) {
      let label = it.label;
      if (it.action === 'garden') label = Date.now() >= G.map.beds[it.obj.bed] ? 'اسقي الورد (+12$)' : 'الورد مسقي 🌸';
      if (it.action === 'fish') label = 'ارمي السنارة 🎣';
      return { label, action: it.action, it };
    }
    for (const h of G.map.homes) {
      if (h.own || h.building) continue;
      const r = { x: h.p.x * T, y: h.p.y * T, w: D.PW * T, h: D.PH * T };
      if (inRect(f, r) || inRect({ x: G.player.x, y: G.player.y - 3 }, r)) return { label: G.s.lvl ? 'أرض فاضية' : canBuildIn(G.map.d) ? 'ابني بيتك هون (ببلاش)' : 'هالدولة إلها رئيس', home: h, action: 'plot' };
    }
    return null;
  }

  const ACTIONS = {
    plot(t) {
      const p = t.home.p;
      if (G.s.lvl) {
        UI.dialog('أرض فاضية', ['إنت عندك بيت، وكل واحد إله بيت واحد.', 'خلّيها لمتابع جديد. احكيله يجي يبني جنبك!']);
        return;
      }
      if (!canBuildIn(p.d)) {
        const fd = firstFreeCountry();
        if (p.d === 1) { UI.dialog('دولة القصر', ['هاي دولة صاحب الحارة 👑 ما فيك تبني فيها.', fd ? 'في إلك دولة فاضية بتستناك!' : 'اختار دولة تانية من الكرة 🌍']); if (fd) setTimeout(() => UI.choice('دولتك', 'بدك روح لدولتك هلأ؟', [{ label: 'خدني لدولتي', fn: goMyCountry }, { label: 'بعدين', ghost: true }]), 10); return; }
        UI.choice('هالدولة إلها رئيس', 'لسا في دول ما إلها رئيس، فكل واحد جديد بياخد دولة لحاله ويصير رئيسها 👑\nدولتك: «' + countryOf(fd).name + '»', [
          { label: 'خدني لدولتي', fn: goMyCountry },
          { label: 'بعدين', ghost: true },
        ]);
        return;
      }
      const c = countryOf(p.d);
      UI.choice('أرض فاضية', 'الأرض رقم ' + (p.n + 1) + ' بـ' + c.name + '. بدك تبني بيتك هون؟ ببلاش، واسمك رح ينكتب عليه.' + (c.pres ? '' : ' وما في رئيس لهالدولة لسا، فإذا بنيت هون بتصير إنت الرئيس 👑'), [
        { label: 'ابني بيتي هون (ببلاش)', fn: () => startBuild(p, 1) },
        { label: 'لا، بشوف غيرها', ghost: true },
      ]);
    },
    myhouse() { openMyHouse(); },
    rent() {
      const r = rentDue(); if (!r) return;
      G.s.rentAt = Date.now(); earn(r, 'home', 'إيجار البيت'); save();
    },
    palace(t) {
      const o = t.home.own;
      L.Audio.play('door');
      const today = new Date().toDateString();
      if (G.s.greet.day !== today) G.s.greet = { day: today, ids: [] };
      const first = !G.s.greet.ids.includes('palace');
      UI.dialog('قصر ' + o.name, [
        (o.elder ? 'أهلاً وسهلاً بقصر صاحب الحارة 👑' : 'أهلاً وسهلاً بقصر ' + o.name + '، صاحب الحارة 👑') + (o.motto ? '\n«' + o.motto + '»' : ''),
        first ? 'تفضّل فنجان قهوة وكاسة جلّاب ☕ (+25$)' : 'شربت قهوتك اليوم، ارجع بكرا ☕',
      ], () => { if (first) { G.s.greet.ids.push('palace'); earn(25, 'home', 'ضيافة القصر'); save(); } });
    },
    knock(t) {
      const o = t.home.own;
      L.Audio.play('door');
      const pages = [];
      pages.push(o.motto ? '«' + o.motto + '»' : (o.elder ? 'أهلين يا جار!' : 'ما في حدا بالبيت هلأ، بس الباب عليه اسم: ' + o.name));
      pages.push('بيت ' + o.name + ' · ' + D.LEVEL_NAMES[o.lvl] + ' (مستوى ' + o.lvl + ')' + (o.dlv ? ' · وصّل ' + o.dlv + ' طلب' : ''));
      const today = new Date().toDateString();
      if (G.s.greet.day !== today) G.s.greet = { day: today, ids: [] };
      const done = G.s.greet.ids.includes(o.id);
      UI.dialog('بيت ' + o.name, pages, null, { choices: [
        { label: done ? 'سلّمت عليه اليوم ✓' : 'سلّم عليه (+3$)', disabled: done ? 'مرة باليوم' : null, fn: () => {
          G.s.greet.ids.push(o.id); G.s.money += 3; L.Audio.play('coin'); track('greet');
          UI.toast('سلّمت على ' + o.name + ' · +3$', 'heart', 'good'); save();
        } },
        { label: 'مع السلامة', ghost: true },
      ] });
    },
    deliver(t) {
      const dv = G.s.delivery, o = t.home.own;
      const secs = (Date.now() - dv.t0) / 1000;
      const tip = secs < dv.fast ? 10 : 0;
      G.s.money += dv.pay + tip; G.s.dlv++; G.s.delivery = null; track('deliver');
      L.Audio.play('coin');
      UI.dialog(o.name, [(o.motto ? '«' + o.motto + '» ' : '') + 'يسلمو إيديك! هي حقك ' + dv.pay + '$' + (tip ? ' وهي ' + tip + '$ بقشيش لأنك سريع.' : '.')]);
      UI.toast('+' + (dv.pay + tip) + '$', 'coin', 'good');
      if (G.s.plot && G.s.dlv % 5 === 0) pushHouse(); // كل 5 توصيلات منحدّث العدد (لحتى نوفّر طلبات السيرفر)
      save();
    },
    board() { openResidents(); },
    districts() { openGlobe(); },
    jobs() { openJobs(); },
    litter(t) {
      const m = G.map; const i = m.litter.indexOf(t.litter); if (i < 0) return;
      m.litter.splice(i, 1); earn(8, 'bag', 'نضّفت'); track('litter');
      for (let k = 0; k < 8; k++) G.particles.push({ x: t.litter.x, y: t.litter.y - 4, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0.4, c: '#fff4dc' });
    },
    garden(t) {
      const i = t.it.obj.bed;
      if (Date.now() < G.map.beds[i]) { UI.toast('الورد مسقي، ارجع بعد شوي', 'flower'); return; }
      G.map.beds[i] = Date.now() + 45000;
      for (let k = 0; k < 14; k++) G.particles.push({ x: t.it.rect.x + Math.random() * 32, y: t.it.rect.y + 2, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, life: 0.6, c: '#7cc6ea' });
      earn(12, 'flower', 'سقيت الورد'); track('garden');
    },
    fish() {
      if (G.fishing) return;
      G.busy = true; G.fishing = { t: 0, dur: 1.2 + Math.random() * 2.2, x: G.player.x, y: G.player.y - 34, phase: 'wait', bt: 0, sp: 4 + Math.random() * 3, zone: 0.12 + Math.random() * 0.06 };
      L.Audio.play('click');
    },
    race() { startRace(); },
    bench() { UI.toast('قعدت شوي... الحارة حلوة اليوم', 'sun'); },
  };

  function talk(n) {
    n.talking = true; n.faceTo(G.player.x, G.player.y);
    const end = () => { n.talking = false; };
    if (n.def.action === 'delivery') { talkDelivery(end); return; }
    if (n.def.action === 'vehicles') { end(); openVehicles(); return; }
    if (n.def.action === 'falafel') {
      UI.dialog('أبو سليم', ['أهلين بالجار الجديد!', 'نصيحة: كل ما رقّيت بيتك، الناس بتشوفه أكبر من بعيد. وسلّم على جيرانك كل يوم، بيعطوك شي.'], end);
      return;
    }
    if (n.house) {
      const o = n.house;
      UI.dialog(o.name, [o.motto ? '«' + o.motto + '»' : 'أهلين! أنا ساكن هون.', 'بيتي ' + D.LEVEL_NAMES[o.lvl] + '. مرّ لعندي أي وقت!'], end);
      return;
    }
    UI.dialog(n.name, ['أهلين!'], end);
  }

  function pickDeliveryTarget() {
    const homes = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const m = chunkAt(dx, dy); if (!m || !m.homes) continue;
      m.homes.forEach((h) => { if (h.own && !h.own.me && h.door) homes.push({ h, ox: dx * MW(), oy: dy * MH() }); });
    }
    if (!homes.length) return null;
    const pick = homes[Math.floor(Math.random() * homes.length)], h = pick.h;
    const dist = Math.hypot(h.door.x + pick.ox - G.player.x, h.door.y + pick.oy - G.player.y) / T;
    return { plot: h.p.id, name: h.own.name, d: h.p.d, pay: Math.round(22 + dist * 0.5 + Math.random() * 8), fast: Math.round(14 + dist * 0.45 / speedMul()), t0: Date.now() };
  }
  function talkDelivery(end) {
    const dv = G.s.delivery;
    if (dv) {
      UI.choice('أبو ماهر', 'لسا الطلب معك! وصّله لبيت ' + dv.name + '. اتبع السهم الأصفر.', [
        { label: 'ماشي، رايح', fn: end },
        { label: 'ما لقيته، اعطيني غيره', ghost: true, fn: () => { G.s.delivery = null; end(); talkDelivery(() => {}); } },
      ]);
      return;
    }
    const job = pickDeliveryTarget();
    if (!job) { UI.dialog('أبو ماهر', ['لا طلبات هلأ، الحارة لسا فاضية. ارجعلي بعد شوي.'], end); return; }
    UI.choice('أبو ماهر', (G.s.dlv ? 'رجعت؟ ' : 'بدك تشتغل؟ ') + 'في طلب لبيت ' + job.name + '. حقّه ' + job.pay + '$، وإذا وصّلته بأقل من ' + job.fast + ' ثانية في بقشيش.', [
      { label: 'هات الطلب', fn: () => { job.t0 = Date.now(); G.s.delivery = job; L.Audio.play('click'); UI.toast('استلمت طلب لـ ' + job.name, 'box'); end(); save(); } },
      { label: 'مش هلأ', ghost: true, fn: end },
    ]);
  }

  // ---------- البناء ----------
  function startBuild(p, lvl) {
    const price = 0;
    if (lvl === 1) {
      const o = Net.ownerOf(p.id); if (o && o.id !== Net.myId) { UI.toast('حدا سبقك عهالأرض!', 'home', 'bad'); return; }
      if (!canBuildIn(p.d)) { UI.toast('هالدولة صار إلها رئيس، روح لدولتك', 'flag', 'bad'); return; }
    }
    if (lvl === 1 && !G.s.cf) { pickFlag(() => startBuild(p, lvl)); return; }
    G.s.money -= price;
    G.build = { plot: p.id, p, t: 0, lvl, cost: price };
    G.busy = true;
    rebuild();
  }
  function finishBuild() {
    const b = G.build; G.build = null; G.busy = false;
    const first = b.lvl === 1;
    G.s.lvl = b.lvl;
    if (first) { G.s.plot = b.plot; G.s.t = Date.now(); G.s.rentAt = Date.now(); }
    rebuild();
    for (let i = 0; i < 40; i++) G.particles.push({ x: (b.p.x + 3.5) * T + (Math.random() - 0.5) * 70, y: (b.p.y + 3) * T + (Math.random() - 0.5) * 50, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 0.8 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#f2c14e' : '#fff4dc' });
    L.Audio.play('day');
    pushHouse(); save();
    UI.card({ icon: 'home', sub: first ? 'صار إلك بيت بالحارة' : 'ترقية', title: first ? 'مبروك يا ' + G.s.name + '!' : D.LEVEL_NAMES[b.lvl] + '!',
      text: first ? 'بيتك انكتب عليه اسمك، وكل اللي بيدخلوا رح يشوفوه.' + (amPresident() ? '\n👑 وإنت أول واحد هون، فصرت رئيس ' + countryOf(b.p.d).name + '! دق باب بيتك لتسمّي دولتك وتختار علمها.' : '\nاشتغل وجمّع مصاري، وبيتك بيكبر لحاله لحد ما يصير قصر.') : 'جمعت ' + GROW_AT[b.lvl] + '$ فبيتك كبر لحاله وصار مستوى ' + b.lvl + '. ببلاش!', button: 'يلا' });
  }
  // البيت بيكبر لحاله كل ما زادت المصاري (ما في دفع)
  const GROW_AT = [0, 0, 120, 350, 800, 1600, 2600, 4000, 6000, 8500, 12000];
  function checkGrow() {
    const s = G.s;
    if (!s || !s.lvl || s.lvl >= D.MAX_LVL || G.build || G.busy || UI.inDialog() || UI.modalOpen() || UI.cardOpen() || G.globe) return;
    if (s.money >= GROW_AT[s.lvl + 1]) { const { plot } = plotById(s.plot); startBuild(plot, s.lvl + 1); }
  }
  function lostCountry() {
    if (!G.s.plot || G.s.owner) return;
    const d0 = +G.s.plot.split('-')[0].slice(1);
    G.s.plot = null; G.s.lvl = 0; G.s.t = 0;
    Net.forget(Net.myId);
    _freeVer = -1; rebuildAll(); save();
    const fd = firstFreeCountry();
    UI.card({ icon: 'flag', sub: 'سبقك حدا بثواني', title: 'حدا صار رئيس ' + countryOf(d0).name, text: 'واحد تاني بنى بهالدولة قبلك بلحظة. ولا يهمك، في إلك دولة فاضية تانية' + (fd ? ': «' + countryOf(fd).name + '». ابني فيها وبتصير رئيسها 👑' : '.'), button: fd ? 'خدني لدولتي' : 'تمام', onClose: () => { if (fd) goPlaza(fd); } });
  }
  // حدا سبقك على نفس الاسم: لازم تغيّره عشان يتحفظ بيتك
  // اختيار علم بلد عربي لبيتك
  function pickFlag(cb, cancelable) {
    const F = L.Flags;
    const box = UI.modal(UI.header('flag', 'علم بيتك') + '<p class="modal-sub">اختار علم بلدك، بيرفرف فوق بيتك قدام الكل.</p>' +
      '<div class="flag-grid">' + F.LIST.map((f) => '<button class="flag-b' + (G.s.cf === f.c ? ' on' : '') + '" data-c="' + f.c + '"><canvas width="60" height="40"></canvas><span>' + f.n + '</span></button>').join('') + '</div>' +
      (cancelable ? '<div class="row"><button class="btn btn-ghost" data-close>سكّر</button></div>' : ''), { cls: '', locked: !cancelable });
    box.querySelectorAll('.flag-b').forEach((b) => {
      const c = b.querySelector('canvas'), g = c.getContext('2d'); g.drawImage(F.canvas(b.dataset.c), 0, 0, 60, 40);
      b.addEventListener('click', () => {
        G.s.cf = b.dataset.c; save(); L.Audio.play('click');
        UI._modalLocked = false; UI.closeModal();
        if (cb) cb();
      });
    });
  }
  function askNewName() {
    if (G._askName) return; G._askName = true;
    const box = UI.modal(UI.header('home', 'الاسم مأخوذ') +
      '<p class="modal-sub">واحد تاني سبقك وسجّل «' + esc(G.s.name) + '». اختار اسم تاني لبيتك.</p>' +
      '<div class="field"><input id="nn-in" maxlength="14" placeholder="اسمك الجديد" autocomplete="off"></div>' +
      '<p class="modal-sub" id="nn-msg"></p><div class="row"><button class="btn" id="nn-ok">تمام</button></div>', { cls: 'small', locked: true });
    UI._onModalClose = () => { G._askName = false; };
    const inp = box.querySelector('#nn-in'), msg = box.querySelector('#nn-msg');
    const go = async () => {
      const n = L.Net.clean(inp.value, 14);
      if (!n) { msg.textContent = 'اكتب اسم مناسب'; return; }
      if (!(await Net.nameFree(n))) { msg.textContent = 'هالاسم مأخوذ كمان، جرب غيره'; inp.value = ''; return; }
      G.s.name = n; save();
      UI._modalLocked = false; UI.closeModal(); G._askName = false;
      pushHouse();
    };
    box.querySelector('#nn-ok').addEventListener('click', go);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    setTimeout(() => inp.focus(), 50);
  }
  function lostPlot() {
    if (!G.s.plot) return;
    G.s.plot = null; G.s.lvl = 0; G.s.t = 0;
    rebuild(); save();
    UI.card({ icon: 'home', sub: 'صار شي غريب', title: 'حدا سبقك عالأرض', text: 'اثنين اختاروا نفس الأرض بنفس اللحظة، والأسبق أخدها. اختار أرض تانية، ببلاش.' });
  }

  // ---------- النوافذ ----------
  function houseCanvas(lvl, roof, wall) {
    const img = H.houseSprite(lvl, roof, wall);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
    return c;
  }
  // ورشة القصر (لصاحب الحارة بس)
  function openPalace() {
    const s = G.s;
    let flagPick = s.flag || '#3d7a5a';
    const box = UI.modal(UI.header('home', 'قصري 👑') +
      '<div class="palace-hero"><span id="ph-c"></span><b>قصر ' + esc(s.name) + '</b><small>صاحب الحارة · رئيس الدولة 1 للأبد</small></div>' +
'<button class="btn btn-ghost" id="hh-flag" style="margin-bottom:8px">🏳️ علم بيتي</button>' +
      (rentDue() > 0 ? '<button class="btn btn-big" id="hh-rent" style="margin-bottom:8px">اجمع إيجار القصر · ' + rentDue() + '$</button>' : '<p class="sync-note">إيجار القصر: ' + (s.lvl * RENT_PER_HOUR) + '$ بالساعة، بيتجمّع لحد ' + RENT_CAP_H + ' ساعات.</p>') +
      '<div class="pres-box"><b>👑 مملكتك</b><div class="field"><label for="hh-cn">اسم الدولة</label><input id="hh-cn" maxlength="18" value="' + esc(s.cname || '') + '" placeholder="مثلاً: مملكة الحارة"></div>' +
      '<div class="field"><label>لون العلم (بيرفرف فوق القصر)</label><div class="roof-pick">' + FLAGS.map((f) => '<button data-f="' + f + '" class="' + (f === flagPick ? 'on' : '') + '" style="background:' + f + ';clip-path:none"></button>').join('') + '</div></div></div>' +
      '<div class="field"><label for="hh-motto">جملة على باب القصر</label><input id="hh-motto" maxlength="40" value="' + esc(s.motto || '') + '" placeholder="مثلاً: أهلاً وسهلاً بكل الحارة"></div>' +
      '<div class="row"><button class="btn" id="hh-save">حفظ</button><button class="btn btn-ghost" data-close>سكّر</button></div>');
    const draw = () => {
      const img = L.Palace.palaceSprite(flagPick), c = document.createElement('canvas');
      c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
      const h = box.querySelector('#ph-c'); h.innerHTML = ''; h.appendChild(c);
    };
    draw();
    const fb = box.querySelector('#hh-flag'); if (fb) fb.addEventListener('click', () => { UI.closeModal(); pickFlag(() => { pushHouse(); rebuildAll(); }, true); });
    const rb = box.querySelector('#hh-rent'); if (rb) rb.addEventListener('click', () => { UI.closeModal(); ACTIONS.rent(); });
    box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { flagPick = b.dataset.f; box.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    box.querySelector('#hh-save').addEventListener('click', () => {
      const raw = box.querySelector('#hh-motto').value, m = Net.clean(raw, 40);
      if (raw.trim() && !m) { UI.toast('هالجملة ما بتمشي، جرّب غيرها', 'home', 'bad'); return; }
      const cnRaw = box.querySelector('#hh-cn').value, cn = Net.clean(cnRaw, 18);
      if (cnRaw.trim() && !cn) { UI.toast('اسم الدولة ما بيمشي، جرّب غيره', 'flag', 'bad'); return; }
      s.cname = cn; s.flag = flagPick; s.motto = m;
      if (L.Planet.invalidate) L.Planet.invalidate();
      UI.closeModal(); rebuildAll(); pushHouse(); save(); UI.toast('انحفظ قصرك 👑', 'home', 'good');
    });
  }
  function openMyHouse() {
    if (G.s && G.s.owner) return openPalace();
    const s = G.s, next = s.lvl + 1;
    const pres = amPresident(), cty = countryOf(+s.plot.split('-')[0].slice(1));
    let flagPick = s.flag || '';
    const deco = (s.deco && s.deco.length ? s.deco.slice() : ['tree', 'flowers', 'lamp', 'bush']);
    const slots = Math.min(4, s.lvl);
    const box = UI.modal(UI.header('home', 'بيتي · ورشة البناء') +
      '<div class="house-hero"><span id="hh-c"></span><div><b>' + esc(s.name) + '</b><span>' + esc(D.LEVEL_NAMES[s.lvl]) + ' · مستوى ' + s.lvl + ' من 10</span>' +
      '<div class="lvl-track">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => '<i class="' + (l <= s.lvl ? 'on' : '') + '"></i>').join('') + '</div></div></div>' +
'<button class="btn btn-ghost" id="hh-flag" style="margin-bottom:8px">🏳️ علم بيتي</button>' +
      (rentDue() > 0 ? '<button class="btn btn-big" id="hh-rent" style="margin-bottom:8px">اجمع الإيجار · ' + rentDue() + '$</button>' : '<p class="sync-note">الإيجار: ' + (s.lvl * RENT_PER_HOUR) + '$ بالساعة، بيتجمّع لحد ' + RENT_CAP_H + ' ساعات.</p>') +
      (next <= D.MAX_LVL ? '<p class="sync-note">بيتك بيكبر لحاله ببلاش لما يصير معك ' + GROW_AT[next] + '$ (معك ' + s.money + '$) ← ' + esc(D.LEVEL_NAMES[next]) + '</p>' : '<p class="modal-sub">بيتك ناطحة سحاب! ما في أعلى من هيك 🏙️</p>') +
      '<div class="build-next">' + (next <= D.MAX_LVL ? '<span>الجاي:</span><span id="hh-next"></span><b>' + esc(D.LEVEL_NAMES[next]) + '</b><div class="bar"><i style="width:' + Math.min(100, Math.round(s.money / GROW_AT[next] * 100)) + '%"></i></div>' : '') + '</div>' +
      (pres ? '<div class="pres-box"><b>👑 إنت رئيس ' + esc(cty.name) + '</b><div class="field"><label for="hh-cn">اسم الدولة</label><input id="hh-cn" maxlength="18" value="' + esc(s.cname || '') + '" placeholder="' + esc(cty.name) + '"></div>' +
        '<div class="field"><label>لون العلم</label><div class="roof-pick">' + FLAGS.map((f) => '<button data-f="' + f + '" class="' + (f === cty.flag ? 'on' : '') + '" style="background:' + f + ';clip-path:none"></button>').join('') + '</div></div></div>' : '') +
      '<div class="field"><label>لون السطح</label><div class="roof-pick">' + ROOF_KEYS.map((k) => '<button data-r="' + k + '" class="' + (k === s.roof ? 'on' : '') + '" style="background:' + H.ROOFS[k].roof + '" title="' + H.ROOFS[k].name + '"></button>').join('') + '</div></div>' +
      (s.lvl < 6 ? '<div class="field"><label>لون الحيطان</label><div class="roof-pick">' + H.WALLS.map((w, i) => '<button data-w="' + i + '" class="' + (i === (s.wall | 0) % 6 ? 'on' : '') + '" style="background:' + w + ';clip-path:none"></button>').join('') + '</div></div>' : '') +
      '<div class="field"><label>زينة الجنينة (بتنفتح خانة مع كل مستوى)</label><div class="deco-grid">' + H.SLOTS.map((sl, i) => '<div class="deco-slot' + (i >= slots ? ' locked' : '') + '"><small>' + sl.name + '</small>' +
        (i >= slots ? '<span>🔒 مستوى ' + (i + 1) + '</span>' : '<select data-s="' + i + '">' + Object.keys(H.DECO).map((k) => '<option value="' + k + '"' + (deco[i] === k ? ' selected' : '') + '>' + H.DECO[k].name + '</option>').join('') + '</select>') + '</div>').join('') + '</div></div>' +
      '<div class="field"><label for="hh-motto">جملة على بابك (بيقراها اللي بيدق عليك)</label><input id="hh-motto" maxlength="40" value="' + esc(s.motto || '') + '" placeholder="مثلاً: أهلاً وسهلاً بالجيران"></div>' +
      '<div class="row"><button class="btn" id="hh-save">حفظ</button><button class="btn btn-ghost" data-close>سكّر</button></div>');
    const redraw = () => { const c = box.querySelector('#hh-c'); c.innerHTML = ''; c.appendChild(houseCanvas(s.lvl, s.roof, s.wall)); };
    redraw();
    if (next <= D.MAX_LVL) box.querySelector('#hh-next').appendChild(houseCanvas(next, s.roof, s.wall));
    box.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { s.wall = +b.dataset.w; box.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', x === b)); redraw(); }));
    box.querySelectorAll('[data-s]').forEach((sel) => sel.addEventListener('change', () => { deco[+sel.dataset.s] = sel.value; }));
    const fb = box.querySelector('#hh-flag'); if (fb) fb.addEventListener('click', () => { UI.closeModal(); pickFlag(() => { pushHouse(); rebuildAll(); }, true); });
    const rb = box.querySelector('#hh-rent'); if (rb) rb.addEventListener('click', () => { UI.closeModal(); ACTIONS.rent(); });
    box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { flagPick = b.dataset.f; box.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b)); }));
    box.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
      s.roof = b.dataset.r; box.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === b));
      const c = box.querySelector('#hh-c'); c.innerHTML = ''; c.appendChild(houseCanvas(s.lvl, s.roof, s.wall));
    }));
    box.querySelector('#hh-save').addEventListener('click', () => {
      const raw = box.querySelector('#hh-motto').value;
      const m = Net.clean(raw, 40);
      if (raw.trim() && !m) { UI.toast('هالجملة ما بتمشي، جرّب غيرها', 'home', 'bad'); return; }
      if (pres) {
        const cnRaw = box.querySelector('#hh-cn').value, cn = Net.clean(cnRaw, 18);
        if (cnRaw.trim() && !cn) { UI.toast('اسم الدولة ما بيمشي، جرّب غيره', 'flag', 'bad'); return; }
        s.cname = cn; s.flag = flagPick;
        if (L.Planet.invalidate) L.Planet.invalidate();
      }
      s.deco = deco.slice(0, 4);
      s.motto = m; UI.closeModal(); rebuild(); pushHouse(); save(); UI.toast('انحفظ بيتك', 'home', 'good');
    });
  }

  function ranked() {
    const list = [...Net.houses.values()];
    if (G.s && G.s.lvl && !Net.houses.has(Net.myId)) list.push(Object.assign({ id: Net.myId }, myHouseData()));
    return list.sort((a, b) => b.lvl - a.lvl || b.dlv - a.dlv || a.t - b.t);
  }
  function openResidents() {
    const all = ranked();
    const box = UI.modal(UI.header('book', 'سكان الحارة') +
      '<p class="modal-sub">' + all.length + ' بيت مبني' + (Net.mode === 'local' ? ' · (على جهازك بس)' : '') + '</p>' +
      '<input class="res-search" id="rs" placeholder="دوّر على اسم..." autocomplete="off"><ul class="res-list" id="rl"></ul>', { cls: 'wide' });
    const draw = (q) => {
      const rows = all.map((h, i) => ({ h, i })).filter(({ h }) => !q || h.name.includes(q)).slice(0, 120);
      box.querySelector('#rl').innerHTML = rows.length ? rows.map(({ h, i }) =>
        '<li class="' + (h.id === Net.myId ? 'me' : '') + '"><span class="res-rank num">' + (i + 1) + '</span><span class="res-roof" style="background:' + H.ROOFS[h.roof].roof + '"></span>' +
        '<div class="res-info"><b>' + esc(h.name) + (h.id === Net.myId ? ' (إنت)' : '') + '</b><span><span class="stars">' + '★'.repeat(h.lvl) + '</span> ' + esc(D.LEVEL_NAMES[h.lvl]) + ' · الحي ' + h.plot.split('-')[0].slice(1) + '</span></div>' +
        '<button class="btn" data-p="' + h.plot + '">زور</button></li>').join('') : '<li class="empty">' + (q ? 'ما في حدا بهالاسم' : 'لسا ما حدا بنى. كون أول واحد!') + '</li>';
      box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { UI.closeModal(); goToPlot(b.dataset.p); }));
    };
    draw('');
    box.querySelector('#rs').addEventListener('input', (e) => draw(e.target.value.trim()));
  }
  function openDistricts() {
    const n = districtsCount();
    const counts = {};
    Net.houses.forEach((h) => { const d = h.plot.split('-')[0]; counts[d] = (counts[d] || 0) + 1; });
    const box = UI.modal(UI.header('flag', 'أحياء الحارة') + '<p class="modal-sub">لما يمتلي حي، بيفتح حي جديد.</p><ul class="item-list district-list">' +
      Array.from({ length: n }, (_, i) => i + 1).map((d) => '<li><img src="' + L.Icons.get('home') + '" alt=""><div class="item-info"><b>الحي ' + d + (G.map.id === 'd' + d ? ' (إنت هون)' : '') + '</b><span>' + (counts['d' + d] || 0) + ' بيت من ' + D.PLOTS_PER + '</span></div><button class="btn" data-d="' + d + '">روح</button></li>').join('') + '</ul>');
    box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { UI.closeModal(); goPlaza(+b.dataset.d); }));
  }
  function openMenu() {
    const syncTxt = { cloud: 'الحارة متصلة بالسيرفر، والكل بيشوف بيتك.', claude: 'الحارة متصلة، والبيوت بتتحدّث مباشرة.', local: 'هالنسخة تجريبية: بيتك محفوظ على جهازك بس. لما نرفع السيرفر، كل الناس رح تشوف بيوت بعض.' }[Net.mode];
    const box = UI.modal(UI.header('menu', 'القائمة') + '<div class="menu-buttons">' +
      (G.s.plot ? '<button class="btn" id="m-home">روح لبيتي</button>' : '') +
      '<button class="btn" id="m-plaza">روح للساحة</button>' +
      '<button class="btn" id="m-globe">الكوكب 🌍</button>' +
      '<button class="btn btn-ghost" id="m-jobs">لوحة الشغل والألعاب</button>' +
      '<button class="btn btn-ghost" id="m-daily">هدية ومهام اليوم</button>' +
      '<button class="btn btn-ghost" id="m-pass">جواز سفري</button>' +
      '<button class="btn btn-ghost" id="m-res">سكان الحارة</button>' +
      '<button class="btn btn-ghost" id="m-snd">' + (L.Audio.muted ? 'تشغيل الصوت' : 'كتم الصوت') + '</button>' +
      '<button class="btn btn-ghost" id="m-title">الشاشة الرئيسية</button></div><p class="sync-note">' + esc(syncTxt) + '</p>', { cls: 'small' });
    const on = (id, f) => { const b = box.querySelector(id); if (b) b.addEventListener('click', () => { UI.closeModal(); f(); }); };
    on('#m-home', () => goToPlot(G.s.plot));
    on('#m-plaza', () => goPlaza(+G.map.id.slice(1)));
    on('#m-res', openResidents);
    on('#m-globe', openGlobe);
    on('#m-jobs', openJobs);
    on('#m-daily', showDaily);
    on('#m-pass', openPassport);
    on('#m-snd', () => { L.Audio.toggle(); });
    on('#m-title', () => { save(); toTitle(); });
  }

  // ---------- الكوكب ----------
  // الدول المفتوحة: أول 9 حول البداية + أي دولة فيها بيوت
  function openList() {
    const set = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    if (G.map && G.map.d) set.add(G.map.d);
    if (presRace()) set.add(firstFreeCountry());
    allHouses().forEach((h) => set.add(+h.plot.split('-')[0].slice(1)));
    return [...set].sort((a, b) => a - b);
  }
  function openGlobe(d0) {
    if (G.globe) return;
    $('planet').classList.remove('hidden');
    const cur = d0 || (G.map ? G.map.d : 1);
    G.globe = { rot: L.Planet.facing(L.Planet.spot(cur)), vel: { x: 0, y: 0 }, zoom: 1.6, sel: cur, selHouse: null, drag: null, pinch: null };
    G.globe.rot.pitch = L.clamp(G.globe.rot.pitch, -1.3, 1.3);
    globeInfo();
  }
  function closeGlobe() { G.globe = null; $('planet').classList.add('hidden'); }
  function districtStats() {
    const counts = {};
    allHouses().forEach((h) => { const d = +h.plot.split('-')[0].slice(1); counts[d] = (counts[d] || 0) + 1; });
    return counts;
  }
  function globeInfo() {
    const g = G.globe; if (!g) return;
    const d = g.sel, counts = districtStats();
    const c = countryOf(d), b = L.Planet.biomeOf(d), mine = G.s && G.s.plot && +G.s.plot.split('-')[0].slice(1) === d;
    if (g.selHouse) {
      const h = g.selHouse;
      $('pl-title').textContent = (c.pres && c.pres.id === h.id ? '👑 ' : '') + h.name + (h.id === Net.myId ? ' (إنت)' : '');
      $('pl-pres').textContent = D.LEVEL_NAMES[h.lvl] + ' · مستوى ' + h.lvl + ' · ساكن بـ' + c.name;
      $('pl-sub').textContent = h.motto ? '«' + h.motto + '»' : '';
      $('pl-go').disabled = !G.s; $('pl-go').textContent = !G.s ? 'ادخل اللعبة أولاً' : 'روح لعند بيته';
    } else {
      $('pl-title').textContent = c.name + (mine ? ' · فيها بيتك' : '');
      $('pl-pres').textContent = c.pres ? '👑 الرئيس: ' + c.pres.name : 'بلا رئيس لسا! أول واحد بيبني هون بيصير الرئيس';
      $('pl-sub').textContent = L.Planet.BIOMES[b].name + ' · ' + (counts[d] || 0) + ' ساكن · ' + (D.plotsFree(d) - (counts[d] || 0)) + ' أرض فاضية';
      $('pl-go').disabled = !G.s;
      $('pl-go').textContent = !G.s ? 'ادخل اللعبة أولاً' : G.map && G.map.d === d ? 'إنت هون · رجوع' : 'روح لهالدولة';
    }
    $('pl-count').textContent = Object.values(counts).reduce((a, n) => a + n, 0) + ' ساكن · ' + openList().length + ' دولة';
  }
  function globeLayout() {
    const c = $('planet-cv'), W = c.width, Hh = c.height;
    const r = Math.min(W, Hh * 0.72) * 0.42 * G.globe.zoom;
    return { cx: W / 2, cy: Hh * 0.43, r };
  }
  function setupGlobe() {
    const c = $('planet-cv');
    const pts = new Map();
    c.addEventListener('pointerdown', (e) => {
      if (!G.globe) return; c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
      if (pts.size === 2) { const [a, b2] = [...pts.values()]; G.globe.pinch = { d: Math.hypot(a.x - b2.x, a.y - b2.y), z: G.globe.zoom }; }
      G.globe.vel = { x: 0, y: 0 };
    });
    c.addEventListener('pointermove', (e) => {
      const g = G.globe, p = pts.get(e.pointerId); if (!g || !p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && g.pinch) { const [a, b2] = [...pts.values()]; g.zoom = L.clamp(g.pinch.z * Math.hypot(a.x - b2.x, a.y - b2.y) / g.pinch.d, 0.7, 14); return; }
      const r = globeLayout().r / dpr;
      g.rot.yaw -= dx / r; g.rot.pitch = L.clamp(g.rot.pitch + dy / r, -1.35, 1.35);
      g.vel = { x: -dx / r, y: dy / r };
    });
    const up = (e) => {
      const g = G.globe, p = pts.get(e.pointerId); pts.delete(e.pointerId);
      if (!g || !p) return; if (pts.size < 2) g.pinch = null;
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && performance.now() - p.t0 < 400) {
        const rect = c.getBoundingClientRect(), mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
        g.vel = { x: 0, y: 0 };
        // بيت؟
        let best = null, bd = 22 * dpr;
        (g.houseMarks || []).forEach((m) => { const dd = Math.hypot(m.x - mx, m.y - my); if (dd < bd) { bd = dd; best = m; } });
        if (best) { g.selHouse = best.h; g.sel = best.d; L.Audio.play('click'); globeInfo(); return; }
        const lay = globeLayout(), pt = L.Planet.unproject(mx, my, lay.cx, lay.cy, lay.r, g.rot);
        if (pt) { const r = L.Planet.dOfPoint(pt); if (r.d) { g.sel = r.d; g.selHouse = null; L.Audio.play('click'); globeInfo(); } }
      }
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { if (G.globe) { e.preventDefault(); G.globe.zoom = L.clamp(G.globe.zoom * (e.deltaY > 0 ? 0.88 : 1.14), 0.7, 14); } }, { passive: false });
    $('pl-close').addEventListener('click', closeGlobe);
    $('pl-go').addEventListener('click', () => {
      const g = G.globe;
      if (g.selHouse) { const id = g.selHouse.plot; closeGlobe(); goToPlot(id); return; }
      const d = g.sel; closeGlobe();
      if (G.map && G.map.d === d) return;
      goPlaza(d);
    });
  }
  function drawMarkerHouse(cx2, x, y, s, col, lit) {
    const R = (a, b, w, h, c) => { cx2.fillStyle = c; cx2.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    R(-4, -3, 8, 6, '#2a2030'); R(-5, -7, 10, 5, '#2a2030');
    R(-3, -2, 6, 4, lit ? '#fff4dc' : '#cfc6b4'); R(-4, -6, 8, 4, col); R(-1, 0, 2, 2, '#6b4a33');
  }
  function label(cx2, text, x, y, size, fg, bg) {
    cx2.font = '900 ' + Math.round(size) + 'px ' + (G._font || (G._font = getComputedStyle(document.body).fontFamily));
    cx2.textAlign = 'center'; cx2.textBaseline = 'middle'; cx2.direction = 'rtl';
    cx2.lineJoin = 'round'; cx2.strokeStyle = bg || '#2a2030'; cx2.lineWidth = size * 0.28;
    cx2.strokeText(text, x, y); cx2.fillStyle = fg || '#fff4dc'; cx2.fillText(text, x, y);
  }
  function renderGlobeTo(cx2, W, Hh, lay, rot, time, opts) {
    const open = openList();
    L.Planet.setCountries(open.map((d) => ({ d, color: countryOf(d).flag })));
    const project = L.Planet.render(cx2, lay.cx, lay.cy, lay.r, rot, time);
    const counts = districtStats();
    const mineD = G.s && G.s.plot ? +G.s.plot.split('-')[0].slice(1) : 0;
    const marks = [], houseMarks = [];
    const zoom = lay.r / (Math.min(W, Hh * 0.72) * 0.42);
    const s = L.clamp(lay.r / 260, 1.5, 2.6 * dpr);
    const fs = 11 * dpr;
    const onScreen = (p) => p.z > 0.05 && p.x > -60 && p.x < W + 60 && p.y > -60 && p.y < Hh + 60;
    open.forEach((d) => {
      const p = project(L.Planet.spot(d));
      if (!onScreen(p)) return;
      marks.push({ d, x: p.x, y: p.y, z: p.z });
    });
    marks.sort((a, b) => a.z - b.z);
    // بيوت الناس (لما تقرّب)
    if (opts.houses && zoom >= 3) {
      const list = allHouses();
      const pres = {}; open.forEach((d) => { const pr = presidentOf(d); if (pr) pres[d] = pr.id; });
      list.forEach((h) => {
        const { d, plot } = plotById(h.plot);
        const p = project(L.Planet.pointIn(d, (plot.x + 3.5) / D.W, (plot.y + 3) / D.H));
        if (!onScreen(p)) return;
        const isP = pres[d] === h.id, me = h.id === Net.myId;
        const hs = L.clamp(zoom / 3.2, 1, 2.4) * dpr;
        drawMarkerHouse(cx2, p.x, p.y, hs, me ? '#3d7a5a' : isP ? '#f2c14e' : (H.ROOFS[h.roof] || H.ROOFS.red).roof, true);
        if (opts.sel && opts.selHouse && opts.selHouse.id === h.id) { cx2.strokeStyle = '#fff4dc'; cx2.lineWidth = 2 * dpr; cx2.beginPath(); cx2.arc(p.x, p.y - hs * 2, hs * 9, 0, Math.PI * 2); cx2.stroke(); }
        if (zoom >= 9 || ((isP || me) && zoom >= 6)) label(cx2, (isP ? '👑 ' : '') + h.name, p.x, p.y - hs * 11, fs * 0.95, me ? '#bff0c8' : isP ? '#ffe08a' : '#fff4dc');
        houseMarks.push({ x: p.x, y: p.y - hs * 2, h, d });
      });
    }
    // علامة كل دولة + اسمها ورئيسها
    marks.forEach((m) => {
      const c = countryOf(m.d);
      if (zoom < 3) {
        const col = m.d === mineD ? '#f2c14e' : (counts[m.d] || 0) ? c.flag : '#9fb4c8';
        if (opts.sel === m.d) { cx2.strokeStyle = '#fff4dc'; cx2.lineWidth = s; cx2.beginPath(); cx2.arc(m.x, m.y - s * 2, s * 9, 0, Math.PI * 2); cx2.stroke(); }
        drawMarkerHouse(cx2, m.x, m.y, s * (opts.sel === m.d ? 1.5 : 1.1), col, true);
      }
      const cellW = lay.r * 0.1047 * Math.max(0.3, Math.cos(Math.asin(L.Planet.spot(m.d).y)));
      if (opts.labels && cellW > 140 * dpr) {
        const tp = project(L.Planet.pointIn(m.d, 0.5, 0.12));
        const f1 = Math.min(fs * 1.6, cellW * 0.85 / Math.max(6, c.name.length * 0.55));
        const sub = (c.pres ? '👑 ' + c.pres.name : 'بلا رئيس') + ' · ' + (counts[m.d] || 0) + ' ساكن';
        const f2 = Math.min(fs * 1.1, cellW * 0.85 / Math.max(6, sub.length * 0.55));
        label(cx2, c.name, tp.x, tp.y, f1, '#fff4dc');
        label(cx2, sub, tp.x, tp.y + f1 * 1.2, f2, '#ffe08a');
      } else if (opts.labels) label(cx2, String(counts[m.d] || 0), m.x, m.y - s * 10, fs * 0.9);
    });
    if (opts.track) { opts.track.marks = marks; opts.track.houseMarks = houseMarks; }
    return marks;
  }
  const STARS = Array.from({ length: 140 }, (_, i) => ({ x: L.hash(i, 1, 900), y: L.hash(i, 2, 901), s: L.hash(i, 3, 902) }));
  function drawStars(cx2, W, Hh, time) {
    cx2.fillStyle = '#120e1c'; cx2.fillRect(0, 0, W, Hh);
    STARS.forEach((st, i) => { const a = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.5 + st.s) + i)); cx2.fillStyle = 'rgba(255,244,220,' + a + ')'; const z = Math.max(1, Math.round(dpr * (st.s > 0.85 ? 2 : 1))); cx2.fillRect(Math.round(st.x * W), Math.round(st.y * Hh), z, z); });
  }
  function renderGlobe(dt) {
    const g = G.globe, c = $('planet-cv');
    const W = Math.floor(window.innerWidth * dpr), Hh = Math.floor(window.innerHeight * dpr);
    if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
    g.rot.yaw += g.vel.x; g.rot.pitch = L.clamp(g.rot.pitch + g.vel.y, -1.35, 1.35); g.vel.x *= 0.92; g.vel.y *= 0.92;
    if (Math.abs(g.vel.x) < 0.0005 && g.zoom < 1.3) g.rot.yaw += dt * 0.03;
    const cx2 = c.getContext('2d');
    drawStars(cx2, W, Hh, G.time);
    renderGlobeTo(cx2, W, Hh, globeLayout(), g.rot, G.time, { sel: g.sel, selHouse: g.selHouse, labels: true, houses: true, track: g });
  }

  // زر التفاعل: بيكتب شو رح يعمل
  function actIcon(t) {
    if (!t) return null;
    if (t.npc) return t.npc.def.action === 'vehicles' ? 'key' : t.npc.def.action === 'delivery' ? 'box' : 'heart';
    return { litter: 'bag', garden: 'flower', fish: 'water', deliver: 'box', myhouse: 'home', knock: 'home', palace: 'home', plot: 'home', board: 'book', jobs: 'flag', bench: 'sun' }[t.action] || 'flag';
  }
  function updateActBtn(paused) {
    const b = $('btn-a'); if (!b || !G.touch) return;
    const t = !paused && G.target;
    let label = 'A', ic = null;
    if (G.fishing) { label = G.fishing.phase === 'bite' ? 'اسحب!' : 'استنى...'; ic = 'water'; }
    else if (UI.inDialog()) label = 'كمّل';
    else if (t) { label = t.label.replace(/\s*\(.*\)\s*/g, ' ').replace(' · ', ' ').trim(); ic = actIcon(t); }
    const key = label + '|' + ic;
    if (b._k !== key) {
      b._k = key;
      $('btn-a-label').textContent = label;
      b.classList.toggle('has-ic', !!ic);
      if (ic) $('btn-a-ic').src = L.Icons.get(ic);
    }
    b.classList.toggle('ready', !!t || (G.fishing && G.fishing.phase === 'bite'));
    const r2 = $('btn-ride2'), best = G.s && bestVeh();
    r2.classList.toggle('hidden', !best);
    if (best) { const k2 = (G.s.veh.ride || best) + (G.s.veh.ride ? 1 : 0); if (r2._k !== k2) { r2._k = k2; r2.querySelector('img').src = L.Nature.vehIcon(G.s.veh.ride || best); } r2.classList.toggle('on', !!G.s.veh.ride); }
  }

  // ---------- المركبات ----------
  function speedMul() { const r = G.s && G.s.veh && G.s.veh.ride; return r ? L.Nature.VEH[r].speed : 1; }
  function setRide(kind, quiet) {
    G.s.veh.ride = kind || '';
    G.player.speed = 74 * speedMul();
    updateRideBtn(); G.dirty = true; save();
    if (quiet) return;
    if (kind) UI.toast('ركبت ال' + L.Nature.VEH[kind].name, 'key'); else UI.toast('نزلت ومشيت', 'key');
  }
  function updateRideBtn() {
    const b = $('btn-ride'); if (!b || !G.s) return;
    const best = bestVeh();
    b.classList.toggle('hidden', !best);
    if (best) { b.querySelector('img').src = L.Nature.vehIcon(G.s.veh.ride || best); b.classList.toggle('on', !!G.s.veh.ride); b.title = G.s.veh.ride ? 'انزل' : 'اركب'; }
  }
  function toggleRide() { if (!G.s || G.busy) return; const best = bestVeh(); if (!best) return; setRide(G.s.veh.ride ? '' : best); }
  function openVehicles() {
    const V = L.Nature.VEH, own = G.s.veh.own;
    const box = UI.modal(UI.header('key', 'كراج أبو سامي') + '<p class="modal-sub">كل المركبات ببلاش! خود اللي بدك ياها.</p><ul class="item-list">' +
      Object.keys(V).map((k) => '<li><img src="' + L.Nature.vehIcon(k) + '" alt="" class="pix"><div class="item-info"><b>' + V[k].name + '</b><span>' + V[k].desc + '</span></div>' +
        (own[k] ? '<button class="btn' + (G.s.veh.ride === k ? ' btn-ghost' : '') + '" data-ride="' + k + '">' + (G.s.veh.ride === k ? 'انزل' : 'اركب') + '</button>'
          : '<span class="price">ببلاش</span><button class="btn" data-buy="' + k + '">خود</button>') + '</li>').join('') + '</ul>');
    box.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.buy;
      own[k] = true; L.Audio.play('good'); UI.closeModal();
      setRide(k, true); pushHouse();
      UI.card({ icon: 'key', sub: 'مبروك', title: 'صار عندك ' + V[k].name + '!', text: 'اضغط زر المركبة فوق لتركب أو تنزل. ولما تكون نازل، بتنصفّ قدّام بيتك وكل الحارة بتشوفها.', button: 'يلا نجرّبها' });
    }));
    box.querySelectorAll('[data-ride]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.ride; UI.closeModal(); setRide(G.s.veh.ride === k ? '' : k); }));
  }
  function openJobs() {
    const m = G.map;
    const jobs = [
      { icon: 'box', name: 'توصيل طلبات', desc: 'عند أبو ماهر بالساحة · 25–60$ للطلب + بقشيش', go: () => goTo(m.d, m.office.x, m.office.y + 0.2, 3) },
      { icon: 'water', name: 'صيد سمك', desc: 'عالرصيف بالبحيرة · 14–90$ لكل سمكة', go: () => goTo(m.d, m.park.pier.x + 0.5, m.park.pier.y + 0.4, 3) },
      { icon: 'flower', name: 'سقاية الورد', desc: '4 أحواض بالحديقة · 12$ للحوض كل 45 ثانية', go: () => goTo(m.d, m.park.x, m.park.y, 3) },
      { icon: 'bag', name: 'تنضيف الشوارع', desc: 'أكياس زبالة عالأرصفة · 8$ للكيس', go: null },
      { icon: 'flag', name: 'سباق الحدود 🏁', desc: '6 نقاط تفتيش، بعضها بدول الجيران · لحد 180$', go: () => startRace() },
      { icon: 'jar', name: 'الكنز المخبّى', desc: 'كنز بكل دولة كل يوم · اتبع حامي/بارد فوق', go: null },
      { icon: 'sun', name: 'نجوم الليل', desc: 'بالليل (الساعة فوق) بتنزل نجوم عالشوارع · 5$ للنجمة', go: null },
      { icon: 'home', name: 'إيجار بيتك', desc: G.s.lvl ? 'دق باب بيتك واجمع ' + (G.s.lvl * RENT_PER_HOUR) + '$ بالساعة' : 'بعد ما تبني بيت، بيجيك إيجار كل ساعة', go: G.s.plot ? () => goToPlot(G.s.plot) : null },
    ];
    const box = UI.modal(UI.header('flag', 'لوحة الشغل') + '<ul class="item-list">' + jobs.map((j, i) => '<li><img src="' + L.Icons.get(j.icon) + '" alt=""><div class="item-info"><b>' + j.name + '</b><span>' + j.desc + '</span></div>' + (j.go ? '<button class="btn" data-j="' + i + '">روح</button>' : '') + '</li>').join('') + '</ul>');
    box.querySelectorAll('[data-j]').forEach((b) => b.addEventListener('click', () => { UI.closeModal(); jobs[+b.dataset.j].go(); }));
  }

  // ================= تحديات وألعاب يومية =================
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const STREAK = [30, 40, 50, 70, 90, 120, 250];
  const MISSIONS = [
    { k: 'fish', t: (n) => 'صيد ' + n + ' سمكات', n: [3, 5], pay: 60 },
    { k: 'litter', t: (n) => 'نضّف ' + n + ' أكياس زبالة', n: [6, 10], pay: 50 },
    { k: 'deliver', t: (n) => 'وصّل ' + n + ' طلبات', n: [2, 4], pay: 70 },
    { k: 'garden', t: (n) => 'اسقي ' + n + ' أحواض ورد', n: [3, 6], pay: 45 },
    { k: 'greet', t: (n) => 'سلّم على ' + n + ' جيران', n: [2, 3], pay: 40 },
    { k: 'visit', t: (n) => 'زور ' + n + ' دول', n: [2, 3], pay: 60 },
    { k: 'stars', t: (n) => 'لمّ ' + n + ' نجوم بالليل', n: [5, 10], pay: 60 },
    { k: 'treasure', t: () => 'لاقي كنز مخبّى', n: [1, 1], pay: 80 },
    { k: 'race', t: () => 'خلّص سباق الحدود', n: [1, 1], pay: 70 },
  ];
  function rollDaily() {
    const s = G.s, day = today();
    if (s.daily && s.daily.day === day) return false;
    const prev = s.daily;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yest = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    const streak = prev && prev.day === yest ? (prev.streak % 7) + 1 : 1;
    const rnd = L.rng(day.split('-').reduce((a, x) => a * 31 + +x, 7));
    const pool = MISSIONS.slice(), ms = [];
    while (ms.length < 3) { const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; const n = m.n[0] + Math.floor(rnd() * (m.n[1] - m.n[0] + 1)); ms.push({ k: m.k, n, prog: 0, done: false, pay: m.pay, text: m.t(n) }); }
    s.daily = { day, streak, claimed: false, missions: ms, bonus: false, visited: [], treasures: [], raceBest: 0 };
    return true;
  }
  function showDaily() {
    if (UI.cardOpen() || UI.inDialog() || UI.modalOpen() || G.busy) { setTimeout(showDaily, 700); return; } // بعد ما تسكّر البطاقة
    const s = G.s, dl = s.daily;
    const box = UI.modal(UI.header('sun', 'هدية اليوم') +
      '<p class="modal-sub">فوت كل يوم لتكبر الهدية! إذا غبت يوم بترجع من الأول.</p><div class="streak">' +
      STREAK.map((v, i) => '<div class="' + (i + 1 < dl.streak ? 'got' : i + 1 === dl.streak ? 'now' : '') + '"><small>يوم ' + (i + 1) + '</small><b class="num">' + v + '$</b></div>').join('') + '</div>' +
      '<h3>مهام اليوم</h3><ul class="item-list">' + dl.missions.map((m) => '<li><div class="item-info"><b>' + esc(m.text) + '</b><span>' + (m.done ? 'خلصت ✓' : m.prog + ' / ' + m.n) + '</span></div><span class="price">+' + m.pay + '$</span></li>').join('') + '</ul>' +
      '<p class="sync-note">إذا خلّصت الثلاثة بتاخد صندوق إضافي +100$</p>' +
      (dl.claimed ? '<button class="btn btn-big" data-close>يلا نلعب</button>' : '<button class="btn btn-big" id="dl-claim">خود هدية اليوم · ' + STREAK[dl.streak - 1] + '$</button>'));
    const b = box.querySelector('#dl-claim');
    if (b) b.addEventListener('click', () => { dl.claimed = true; UI.closeModal(); earn(STREAK[dl.streak - 1], 'sun', 'هدية يوم ' + dl.streak); confetti(); save(); });
  }
  function track(k, n) {
    const dl = G.s && G.s.daily; if (!dl) return;
    dl.missions.forEach((m) => {
      if (m.k !== k || m.done) return;
      m.prog = Math.min(m.n, m.prog + (n || 1));
      if (m.prog >= m.n) {
        m.done = true; L.Audio.play('good'); confetti();
        setTimeout(() => earn(m.pay, 'flag', 'خلصت مهمة: ' + m.text), 300);
        if (!dl.bonus && dl.missions.every((x) => x.done)) { dl.bonus = true; setTimeout(() => { earn(100, 'heart', 'خلصت كل مهام اليوم!'); UI.card({ icon: 'heart', sub: 'برافو', title: 'خلصت مهام اليوم!', text: 'أخدت صندوق +100$. ارجع بكرا في مهام جديدة وهديتك بتكبر.', button: 'تمام' }); }, 1200); }
      }
    });
    save();
  }
  function confetti() {
    if (!G.player) return;
    const cols = ['#f2c14e', '#e05a4a', '#5aa07a', '#4f86d6', '#f59fb7'];
    for (let i = 0; i < 36; i++) G.particles.push({ x: G.player.x, y: G.player.y - 20, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 70, life: 0.9 + Math.random() * 0.5, c: cols[i % 5] });
  }

  // ---- جواز السفر: ختم لكل دولة بتزورها ----
  function stamp(d) {
    const s = G.s; s.stamps = s.stamps || {};
    const dl = s.daily;
    if (dl && !dl.visited.includes(d)) { dl.visited.push(d); if (dl.visited.length > 1) track('visit'); }
    if (s.stamps[d]) return;
    s.stamps[d] = 1;
    const n = Object.keys(s.stamps).length;
    if (n > 1) { earn(15, 'flag', 'ختم جديد بجوازك (' + n + ')'); }
  }
  function openPassport() {
    const st = Object.keys(G.s.stamps || {}).map(Number).sort((a, b) => a - b);
    const box = UI.modal(UI.header('book', 'جواز سفري') + '<p class="modal-sub">' + st.length + ' ختم من ' + L.Planet.count + ' دولة. كل دولة جديدة +15$</p><div class="stamps">' +
      st.map((d) => { const c = countryOf(d); return '<div class="stamp" style="--c:' + c.flag + '"><b>' + esc(c.name) + '</b><small>' + esc(L.Planet.BIOMES[L.Planet.biomeOf(d)].name) + '</small></div>'; }).join('') + '</div>', { cls: 'wide' });
    void box;
  }

  // ---- كنز يومي مخبّى بكل دولة ----
  function treasureOf(m) {
    if (!G.s || !G.s.daily || G.s.daily.treasures.includes(m.d)) return null;
    if (m._tr && m._tr.day === G.s.daily.day) return m._tr;
    const r = L.rng(m.d * 7919 + G.s.daily.day.split('-').reduce((a, x) => a * 31 + +x, 3));
    let t = null;
    for (let k = 0; k < 30 && !t; k++) {
      const tile = m.paveTiles[Math.floor(r() * m.paveTiles.length)];
      const b = { x: tile.x * T + 2, y: tile.y * T + 4, w: 12, h: 10 };
      if (!m.solids.some((s2) => L.rectsOverlap(b, s2))) t = { x: tile.x * T + 8, y: tile.y * T + 12 };
    }
    m._tr = t ? Object.assign(t, { day: G.s.daily.day }) : null;
    return m._tr;
  }
  function treasureHint() {
    const t = treasureOf(G.map); if (!t) return null;
    const dist = Math.hypot(t.x - G.player.x, t.y - G.player.y) / T;
    if (dist < 1.4) {
      G.s.daily.treasures.push(G.map.d);
      const first = G.s.daily.treasures.length === 1;
      earn(first ? 150 : 40, 'jar', 'لقيت الكنز!'); confetti(); confetti(); track('treasure');
      UI.card({ icon: 'jar', sub: countryOf(G.map.d).name, title: 'لقيت الكنز!', text: (first ? '+150$. ' : '+40$. ') + 'في كنز تاني مخبّى بكل دولة كل يوم. روح دوّر بالدول الجارة!', button: 'يلا' });
      return null;
    }
    return dist < 4 ? '🔥🔥 الكنز حامي كتير!' : dist < 12 ? '🔥 الكنز حامي' : dist < 28 ? '🌤️ الكنز دافي' : '❄️ الكنز بارد، دوّر بالدولة';
  }

  // ---- نجوم الليل ----
  function nightStars(m, dt) {
    m.stars = m.stars || [];
    if (!isNight()) { if (m.stars.length) m.stars = []; return; }
    m._st = (m._st || 0) + dt;
    if (m._st > 0.8 && m.stars.length < 22 && m === G.map) {
      m._st = 0;
      let tile = null;
      for (let k = 0; k < 12 && !tile; k++) { const t = m.paveTiles[Math.floor(Math.random() * m.paveTiles.length)]; if (Math.hypot(t.x * T - G.player.x, t.y * T - G.player.y) < 22 * T) tile = t; }
      tile = tile || m.paveTiles[Math.floor(Math.random() * m.paveTiles.length)];
      m.stars.push({ x: tile.x * T + 8, y: tile.y * T + 10, p: Math.random() * 6 });
    }
    for (let i = m.stars.length - 1; i >= 0; i--) {
      const st = m.stars[i];
      if (m === G.map && Math.hypot(st.x - G.player.x, st.y - G.player.y + 4) < 12) {
        m.stars.splice(i, 1); G.s.money += 5; G.floaters.push({ x: st.x, y: st.y - 12, t: 0, text: '+5$' }); L.Audio.play('coin'); track('stars');
        for (let k = 0; k < 8; k++) G.particles.push({ x: st.x, y: st.y - 4, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, life: 0.5, c: '#ffe08a' });
      }
    }
  }
  function drawStarsOn(m) {
    (m.stars || []).forEach((st) => {
      const tw = (Math.sin(G.time * 5 + st.p) + 1) / 2, x = Math.round(st.x), y = Math.round(st.y - 6 - tw * 2);
      ctx.fillStyle = 'rgba(255,224,138,' + (0.25 + tw * 0.3) + ')'; ctx.fillRect(x - 5, y - 5, 11, 11);
      L.rect(ctx, x - 1, y - 4, 3, 9, '#ffe08a'); L.rect(ctx, x - 4, y - 1, 9, 3, '#ffe08a'); L.rect(ctx, x, y, 1, 1, '#fff');
    });
  }

  // ---- سباق الحدود: نقاط تفتيش بالشوارع، بعضها بدول الجيران ----
  function startRace() {
    const c = G.map.cell, pts = [];
    const roadX = [24, 49, 74, 99], roadY = [12, 22, 32, 42, 52, 62];
    const r = L.rng(Date.now() & 0xffff);
    const options = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const d = L.Planet.dAt(c.gx + dx, c.gy + dy); if (d) options.push({ d, dx, dy }); }
    let cur = { d: G.map.d, x: G.player.x, y: G.player.y, dx: 0, dy: 0 };
    for (let i = 0; i < 6; i++) {
      // كل نقطة بعيدة شوي عن اللي قبلها، والنقطة 3 و5 بدولة جارة إذا في
      const o = (i === 2 || i === 4) && options.length > 1 ? options[1 + Math.floor(r() * (options.length - 1))] : options[0];
      const x = roadX[Math.floor(r() * 4)] * T, y = roadY[Math.floor(r() * 6)] * T;
      pts.push({ d: o.d, x, y });
      cur = { d: o.d, x, y };
    }
    G.race = { pts, i: 0, t0: Date.now() };
    UI.closeModal();
    UI.card({ icon: 'flag', sub: 'سباق الحدود', title: '6 نقاط تفتيش', text: 'اتبع السهم الأصفر ومرّ من كل علم. في نقاط بالدول الجارة! كل ما خلصت أسرع، كل ما الجائزة أكبر. اركب سيارتك 🏎️', button: 'انطلق!', onClose: () => { G.race.t0 = Date.now(); L.Audio.play('ring'); } });
  }
  function racePoint(pt) { const dl = L.Planet.delta(G.map.d, pt.d); return { x: pt.x + dl.dx * MW(), y: pt.y + dl.dy * MH() }; }
  function updateRace() {
    const r = G.race; if (!r || UI.cardOpen()) return null;
    const p = racePoint(r.pts[r.i]);
    if (Math.hypot(p.x - G.player.x, p.y - G.player.y) < 26) {
      r.i++; L.Audio.play('coin');
      for (let k = 0; k < 12; k++) G.particles.push({ x: G.player.x, y: G.player.y - 10, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40, life: 0.6, c: '#f2c14e' });
      if (r.i >= r.pts.length) {
        const secs = (Date.now() - r.t0) / 1000; G.race = null;
        const pay = Math.max(30, Math.round(180 - secs * 1.2));
        const best = G.s.daily.raceBest; const isBest = !best || secs < best;
        if (isBest) G.s.daily.raceBest = secs;
        earn(pay, 'flag', 'خلصت السباق'); confetti(); track('race');
        UI.card({ icon: 'flag', sub: 'سباق الحدود', title: secs.toFixed(1) + ' ثانية', text: '+' + pay + '$' + (isBest ? '\nأحسن وقت إلك اليوم! 🏆' : '\nأحسن وقت إلك اليوم: ' + best.toFixed(1) + ' ثانية'), button: 'تمام' });
        return null;
      }
    }
    return '🏁 سباق: نقطة ' + (r.i + 1) + ' من ' + r.pts.length + ' · ' + ((Date.now() - r.t0) / 1000).toFixed(1) + ' ث';
  }
  function drawRace() {
    const r = G.race; if (!r) return;
    r.pts.forEach((pt, i) => {
      if (i < r.i) return;
      const p = racePoint(pt), x = Math.round(p.x), y = Math.round(p.y);
      const on = i === r.i;
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.strokeStyle = on ? '#f2c14e' : '#fff4dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 22, 10, 0, 0, Math.PI * 2); ctx.stroke();
      L.rect(ctx, x - 1, y - 30, 2, 30, '#2a2030'); L.rect(ctx, x + 1, y - 30, 12, 8, on ? '#f2c14e' : '#fff4dc');
      for (let k = 0; k < 3; k++) L.rect(ctx, x + 1 + k * 4, y - 30 + (k % 2) * 4, 4, 4, '#2a2030');
      ctx.globalAlpha = 1;
    });
  }

  // ---- صيد بتوقيت ----
  function fishPress() {
    const f = G.fishing; if (!f) return;
    if (f.phase !== 'bite') { // سحبت بكير
      G.fishing = null; G.busy = false; UI.toast('سحبت بكير! السمكة هربت', 'water', 'bad'); return;
    }
    const pos = (Math.sin(f.bt * f.sp) + 1) / 2, d = Math.abs(pos - 0.5);
    G.fishing = null; G.busy = false;
    if (d > f.zone) { UI.toast('فاتتك! جرّب كمان مرة', 'water', 'bad'); L.Audio.play('bad'); return; }
    const q = 1 - d / f.zone; // كل ما أقرب للنص، سمكة أحسن
    const night = isNight();
    const pool = q > 0.85 ? FISH.slice(2, 4) : q > 0.5 ? FISH.slice(1, 3) : FISH.slice(0, 2);
    let fish = pool[Math.floor(Math.random() * pool.length)];
    if (q > 0.92 && Math.random() < (night ? 0.5 : 0.25)) fish = FISH[3];
    G.s.fish = (G.s.fish || 0) + 1;
    earn(fish.pay + (night ? 10 : 0), 'water', 'صدت ' + fish.name + (night ? ' (صيد ليلي +10)' : ''));
    if (fish === FISH[3]) confetti();
    track('fish');
  }
  function drawFishBar() {
    const f = G.fishing; if (!f || f.phase !== 'bite') return;
    const x = Math.round(G.player.x - 20), y = Math.round(G.player.y - 46);
    L.rect(ctx, x - 1, y - 1, 42, 8, '#2a2030'); L.rect(ctx, x, y, 40, 6, '#e05a4a');
    const zw = Math.round(40 * f.zone * 2); L.rect(ctx, x + 20 - zw / 2, y, zw, 6, '#5aa07a'); L.rect(ctx, x + 18, y, 4, 6, '#f2c14e');
    const pos = (Math.sin(f.bt * f.sp) + 1) / 2; L.rect(ctx, x + Math.round(pos * 38), y - 2, 2, 10, '#fff4dc');
    ctx.font = '900 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff4dc'; ctx.fillText('اضغط هلأ!', x + 20, y - 4);
  }

  // ---------- الأهداف ----------
  function goals() {
    const s = G.s;
    if (!s.lvl) {
      const fd = firstFreeCountry();
      if (fd) return { title: 'ابني بيتك وصير رئيس 👑', steps: [
        { text: 'دولتك: ' + countryOf(fd).name, done: G.map && G.map.d === fd },
        { text: 'امشي لأي أرض عليها لافتة واضغط عليها', done: false },
      ] };
      return { title: 'ابني بيتك هلأ، ببلاش!', steps: [
        { text: 'افتح الكرة 🌍 واختار دولة', done: false },
        { text: 'امشي لأي أرض عليها لافتة واضغط عليها', done: false },
      ] };
    }
    const dl = s.daily;
    if (!dl) return { title: 'جمّع مصاري وبيتك بيكبر', steps: [] };
    const n = dl.missions.filter((m) => m.done).length;
    return { title: 'مهام اليوم ' + n + '/3 · ' + (isNight() ? '🌙 ليل' : '☀️ نهار'), steps: dl.missions.map((m) => ({ text: m.text + ' (' + m.prog + '/' + m.n + ') +' + m.pay + '$', done: m.done })) };
  }

  // ---------- بداية اللعب ----------
  function wrapPlayer(p) {
    const base = p.draw.bind(p);
    p.draw = function (c2, time) {
      const r = G.s && G.s.veh && G.s.veh.ride;
      if (!r) { base(c2, time); return; }
      L.Nature.drawVehicle(c2, r, this.x, this.y + 2, this.dir, null, time, this.moving);
      if (r === 'car') return;
      const y0 = this.y; this.y -= 3; const fr = this.frame; this.frame = 0; base(c2, time); this.frame = fr; this.y = y0;
    };
    p.speed = 74 * speedMul();
    return p;
  }
  function beginPlay() {
    wrapPlayer(G.player); updateRideBtn(); $('mini').classList.remove('hidden');
    if (rollDaily()) setTimeout(showDaily, 900);
    setTimeout(() => stamp(G.map.d), 50);
    G.state = 'play';
    UI.hideTitle(G.touch);
    UI.setAvatar(G.player.sheet);
    $('goal').classList.toggle('collapsed', window.innerWidth < 600);
    snapCamera();
  }
  function newGame(name, look) {
    L.Save.clear();
    G.s = fresh(name, look);
    if (G.ownerOK) { G.s.owner = true; G.s.plot = PAL_ID; G.s.lvl = 10; G.s.t = Date.now(); G.s.flag = '#3d7a5a'; G.s.cname = 'مملكة ' + name; }
    const myD = G.s.owner ? 1 : firstFreeCountry() || 1;
    loadDistrict(myD);
    const st = G.s.owner ? (() => { const q = D.palaceSpot(); return { x: q.x + 10.5, y: q.y + 5.6 }; })() : G.map.start;
    G.player = new L.Player(st.x * T, st.y * T, look);
    G.player.dir = 0;
    beginPlay(); save();
    if (G.s.owner) { rebuildAll(); pushHouse(); UI.card({ icon: 'home', sub: 'صاحب الحارة', title: 'أهلين يا ' + name + ' 👑', text: 'هاد قصرك، وإنت رئيس الدولة 1 للأبد.\nكل متابع بيفوت بياخد دولة لحاله ويصير رئيسها، ولما يخلصوا الدول بيختاروا وين يسكنوا.', button: 'يلا' }); return; }
    stamp(G.map.d);
    if (myD !== 1) {
      UI.card({ icon: 'home', sub: 'أهلاً بحارتنا', title: 'هاي دولتك يا ' + name + ' 👑', text: '«' + countryOf(myD).name + '» فاضية وإلك. ابني بيتك بأي أرض فيها (ببلاش) وبتصير رئيسها، وبتسمّيها وبتختار علمها.\nالعالم مفتوح: امشي أو سوق لأي دولة، واسحب الشاشة بإصبعك وقرّص لتصغّر.', button: 'يلا' });
    } else {
      UI.card({ icon: 'home', sub: 'أهلاً بحارتنا', title: 'أهلين يا ' + name, text: 'كل الدول صار إلها رؤساء! افتح الكرة 🌍 وشوف كل دولة مين رئيسها وكم ساكن فيها، واختار وين بدك تسكن. البيت ببلاش.', button: 'افتح الكرة', onClose: () => openGlobe() });
    }
  }
  function continueGame() {
    const d = L.Save.read();
    if (!d) return;
    G.s = Object.assign(fresh(d.name, d.look), d);
    if (G.s.plot) { const o = Net.ownerOf(G.s.plot); if (o && o.id !== Net.myId) { /* بنعالجها بعد التحميل */ } }
    loadDistrict(G.s.d || 1);
    G.player = new L.Player(G.s.x != null ? G.s.x : G.map.start.x * T, G.s.y != null ? G.s.y : G.map.start.y * T, G.s.look);
    G.player.dir = G.s.dir | 0;
    if (!G.player.free(G.world, G.map, G.player.x, G.player.y)) { G.player.x = G.map.start.x * T; G.player.y = G.map.start.y * T; }
    beginPlay();
    if (G.ownerOK && !G.s.owner) applyOwner();
    UI.toast('أهلاً بعودتك يا ' + G.s.name + '!', 'sun');
    if (G.s.plot && G.s.lvl) pushHouse();
  }
  function toTitle() {
    UI.closeModal();
    G.state = 'title'; G.player = null; G.s = null; $('mini').classList.add('hidden');
    loadDistrict(1);
    UI.showTitle(L.Save.read());
    refreshCreator();
  }

  // ---------- صانع الشخصية ----------
  const look = { skin: PALETTE.skin[1], hair: PALETTE.hair[0], shirt: PALETTE.shirt[Math.floor(Math.random() * 8)], pants: '#3a3f4a', shoes: '#2a2030', longHair: false };
  function refreshCreator() {
    const pv = $('preview'), x = pv.getContext('2d');
    x.imageSmoothingEnabled = false; x.clearRect(0, 0, 16, 22);
    x.drawImage(L.Characters.makeSheet(look), 0, 0, 16, 22, 0, 0, 16, 22);
    document.querySelectorAll('.sw').forEach((box) => {
      const k = box.dataset.k;
      if (!box.children.length) {
        if (k === 'style') {
          [['قصير', false], ['طويل', true]].forEach(([lbl, v]) => {
            const b = document.createElement('button'); b.className = 'txt'; b.textContent = lbl; b.dataset.v = v ? '1' : '';
            b.addEventListener('click', () => { look.longHair = !!b.dataset.v; L.Audio.play('click'); refreshCreator(); }); box.appendChild(b);
          });
        } else {
          PALETTE[k].forEach((c) => {
            const b = document.createElement('button'); b.style.background = c; b.dataset.v = c; b.setAttribute('aria-label', c);
            b.addEventListener('click', () => { look[k] = c; L.Audio.play('click'); refreshCreator(); }); box.appendChild(b);
          });
        }
      }
      [...box.children].forEach((b) => b.classList.toggle('on', k === 'style' ? (!!b.dataset.v === !!look.longHair) : b.dataset.v === look[k]));
    });
  }

  // ---------- التحديث ----------
  function handleActions() {
    let a;
    while ((a = L.Input.consume())) {
      if (G.state !== 'play') continue;
      if (G.globe) { if (a === 'menu') closeGlobe(); continue; }
      if (G.big) { if (a === 'menu') closeBigMap(); continue; }
      if (typeof a === 'string' && a.indexOf('key:') === 0) {
        if (UI.inDialog()) { const n = parseInt(a.slice(4).replace('Digit', '').replace('Numpad', ''), 10); if (n >= 1) UI.pick(n - 1); }
        continue;
      }
      if (UI.cardOpen()) { if (a === 'interact') UI.closeCard(); continue; }
      if (a === 'menu') { if (UI.modalOpen()) { if (!UI._modalLocked) UI.closeModal(); } else if (!UI.inDialog()) openMenu(); }
      else if (a === 'bag') { if (UI.modalOpen()) UI.closeModal(); else if (!UI.inDialog()) openResidents(); }
      else if (a === 'interact') {
        if (G.fishing) { fishPress(); continue; }
        if (UI.inDialog()) UI.advance();
        else if (!UI.modalOpen() && !G.busy && G.target) {
          const t = G.target; UI.prompt(null);
          if (t.npc) talk(t.npc); else if (ACTIONS[t.action]) ACTIONS[t.action](t);
        }
      }
    }
  }

  let titleT = 0;
  function update(dt) {
    G.time += dt;
    handleActions();
    if (G.dirty && G.map) rebuildAll();
    for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; }
    G.particles = G.particles.filter((p) => p.life > 0);
    for (const f of G.floaters) f.t += dt;
    G.floaters = G.floaters.filter((f) => f.t < 1.2);
    if (G.state === 'title') { titleT += dt; return; }
    // شغلات
    G.map._lt = (G.map._lt || 0) + dt;
    if (G.map._lt > 6) { G.map._lt = 0; spawnLitter(G.map); }
    if (G.fishing) {
      const f = G.fishing; f.t += dt;
      if (f.phase === 'wait' && f.t > f.dur) { f.phase = 'bite'; f.bt = 0; L.Audio.play('ring'); }
      if (f.phase === 'bite') { f.bt += dt; if (f.bt > 3) { G.fishing = null; G.busy = false; UI.toast('السمكة هربت! اضغط أسرع', 'water', 'bad'); } }
    }
    for (const ch of (G._chunks || [{ m: G.map }])) nightStars(ch.m, dt);
    if (G.s && rollDaily()) setTimeout(showDaily, 400);
    if (G.build) {
      G.build.t += dt;
      if (Math.random() < dt * 14) G.particles.push({ x: (G.build.p.x + 1 + Math.random() * 5) * T, y: (G.build.p.y + 3 + Math.random() * 2) * T, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 15, life: 0.6, c: '#c9b48a' });
      if (Math.floor(G.build.t * 4) !== Math.floor((G.build.t - dt) * 4)) L.Audio.play('blip');
      if (G.build.t > 1.8) finishBuild();
    }
    checkGrow();
    const paused = G.busy || UI.fading || UI.inDialog() || UI.modalOpen() || UI.cardOpen() || !!G.globe || !!G.big;
    const all = [G.player].concat(G.npcs);
    if (!paused) {
      G.player.update(dt, L.Input, G.world, G.map, all);
      checkCross();
      G.target = findTarget();
      G.saveTimer += dt;
      if (G.saveTimer > 10) save();
    } else { G.player.moving = false; G.player.animate(dt); G.target = null; }
    const v = view();
    for (const ch of (G._chunks || [{ m: G.map, ox: 0, oy: 0 }])) {
      const list = ch.m === G.map ? G.npcs : ch.m._npcs.concat(ch.m.residents || []);
      for (const n of list) {
        if (n.x + ch.ox < v.x - 80 || n.x + ch.ox > v.x + v.w + 80 || n.y + ch.oy < v.y - 80 || n.y + ch.oy > v.y + v.h + 80) continue;
        n.update(dt, G.world, ch.m, ch.m === G.map ? all : list);
      }
    }
    UI.prompt(G.target && !paused ? G.target.label : null);
    updateActBtn(paused);
    if (G.player.moving) { G.camOff.x *= Math.max(0, 1 - dt * 6); G.camOff.y *= Math.max(0, 1 - dt * 6); }
    const t = camTarget(G.player.x + G.camOff.x, G.player.y - 8 + G.camOff.y), k = Math.min(1, dt * (G.dragging ? 30 : 9));
    G.cam.x += (t.x - G.cam.x) * k; G.cam.y += (t.y - G.cam.y) * k;
    UI.hud(G);
    UI.goals(goals());
    const dv = G.s.delivery;
    const raceTxt = updateRace();
    const wayTxt = updateWay();
    const chip = raceTxt || (dv ? 'طلب لبيت ' + dv.name + (dv.d !== G.map.d ? ' (بدولة تانية)' : '') : wayTxt || treasureHint());
    UI.deliveryChip(chip, !raceTxt && dv && (Date.now() - dv.t0) / 1000 > dv.fast);
    if (clockText() !== G._ct) { G._ct = clockText(); $('hud-time').textContent = G._ct; const ic = isNight() ? 'moon' : 'sun'; if (G._ci !== ic) { G._ci = ic; $('hud-home').src = L.Icons.get(ic); } }
  }

  // ---------- الرسم ----------
  function deliveryHome() {
    const dv = G.s && G.s.delivery;
    if (!dv || !G.map) return null;
    const { d, plot } = plotById(dv.plot);
    const dl = L.Planet.delta(G.map.d, d), ox = dl.dx * MW(), oy = dl.dy * MH();
    return { door: { x: (plot.x + 3) * T + ox, y: (plot.y + 4) * T + oy }, d };
  }
  function drawArrowAt(x, y) {
    const R = L.rect;
    y += Math.round(Math.sin(G.time * 6) * 2);
    x = Math.round(x); y = Math.round(y);
    R(ctx, x - 5, y - 8, 10, 6, '#2a2030'); R(ctx, x - 4, y - 7, 8, 4, '#f2c14e');
    for (let i = 0; i < 5; i++) { R(ctx, x - 5 + i, y - 2 + i, 10 - i * 2, 1, '#2a2030'); R(ctx, x - 4 + i, y - 2 + i, 8 - i * 2, 1, '#f2c14e'); }
  }
  function drawIndicator(t) {
    let x, y;
    if (t.npc) { x = t.npc.x; y = t.npc.y - 26; }
    else if (t.home && t.home.door && t.action !== 'plot') { x = t.home.door.x + 8; y = t.home.door.y - 10; }
    else if (t.home) { x = (t.home.p.x + 3.5) * T; y = (t.home.p.y + 2) * T; }
    else { x = t.it.rect.x + t.it.rect.w / 2; y = t.it.rect.y - 8; }
    y += Math.round(Math.sin(G.time * 6) * 1.5);
    x = Math.round(x); y = Math.round(y);
    const R = L.rect;
    R(ctx, x - 3, y - 5, 6, 7, '#2a2030'); R(ctx, x - 2, y - 6, 4, 9, '#2a2030');
    R(ctx, x - 2, y - 5, 4, 7, '#f2c14e'); R(ctx, x - 1, y - 4, 2, 3, '#2a2030'); R(ctx, x - 1, y, 2, 1, '#2a2030');
  }

  // خطوط الحدود: كل دولة بلون علمها، وبين دولتين بيصير خطين
  function drawBorders(m) {
    const col = (m._country && m._country.flag) || '#c8553f';
    const mw = MW(), mh = MH(), t = Math.max(2, Math.round(3 * dpr / zoomEff())), g = t * 4;
    ctx.fillStyle = 'rgba(42,32,48,0.55)';
    ctx.fillRect(0, 0, mw, t / 2); ctx.fillRect(0, 0, t / 2, mh);
    ctx.fillStyle = col;
    for (let x = 0; x < mw; x += g) { ctx.fillRect(x, t / 2, g * 0.6, t); ctx.fillRect(x, mh - t, g * 0.6, t); }
    for (let y = 0; y < mh; y += g) { ctx.fillRect(t / 2, y, t, g * 0.6); ctx.fillRect(mw - t, y, t, g * 0.6); }
    // أعمدة حدود بالزوايا بعلم الدولة
    [[6, 6], [mw - 10, 6], [6, mh - 12], [mw - 10, mh - 12]].forEach(([x, y]) => {
      L.rect(ctx, x, y - 10, 2, 14, '#5a4a3a'); L.rect(ctx, x + 2, y - 10, 7, 5, col); L.rect(ctx, x + 2, y - 10, 7, 1, 'rgba(255,255,255,.4)');
    });
  }

  // شارات الأسماء فوق البيوت (بدقة الشاشة لحتى العربي يبين واضح)
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawTags(cx, cy, z) {
    const v = view();
    const fs = Math.round(L.clamp(z * 4.2, 9.5 * dpr, 15 * dpr));
    const pad = Math.round(fs * 0.45), bw = Math.max(2, Math.round(fs / 7));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    const tags = [];
    for (const ch of (G._chunks || [{ m: G.map, ox: 0, oy: 0 }])) {
      for (const h of ch.m.homes || []) {
        if (!h.own || !h.door) continue;
        const hx = h.cx + ch.ox, ht = h.top + ch.oy;
        if (hx < v.x - 60 || hx > v.x + v.w + 60 || ht < v.y - 30 || ht > v.y + v.h + 40) continue;
        const isP = ch.m._pres && ch.m._pres.id === h.own.id;
        if (z < G.zoom * 0.62 && !h.own.me && !isP && !h.palace) continue; // من بعيد: بس بيتك والرؤساء
        tags.push({ h, hx, ht, isP });
      }
    }
    if (z < G.zoom * 0.62) { // من بعيد: اسم كل دولة ورئيسها بنصها
      for (const ch of (G._chunks || [])) {
        const c = ch.m._country; if (!c) continue;
        const sx = (ch.ox + MW() / 2 - cx) * z, sy = (ch.oy + MH() / 2 - cy) * z;
        label(ctx, c.name, sx, sy, 20 * dpr, '#fff4dc');
        label(ctx, (c.pres ? '👑 ' + c.pres.name : 'بلا رئيس') + ' · ' + (ch.m.homes || []).filter((x) => x.own && !x.own.elder).length + ' ساكن', sx, sy + 24 * dpr, 13 * dpr, '#ffe08a');
      }
    }
    for (const tg of tags) {
      const h = tg.h, o = h.own;
      const sx = Math.round((tg.hx - cx) * z), sy = Math.round((tg.ht + 6 - cy) * z);
      ctx.font = '900 ' + fs + 'px ' + (G._font || (G._font = getComputedStyle(document.body).fontFamily));
      const isPres = tg.isP;
      const label = h.palace ? '👑 قصر ' + o.name : (isPres ? '👑 ' : '') + (o.me ? 'بيتك · ' + o.name : o.name);
      const tw = Math.ceil(ctx.measureText(label).width);
      const badge = fs * 1.35;
      const w = tw + pad * 2 + badge + pad * 0.6, hgt = Math.round(fs * 1.75);
      const x = sx - w / 2, y = sy - hgt;
      ctx.fillStyle = '#2a2030'; rr(x - bw, y - bw, w + bw * 2, hgt + bw * 2 + bw, 3 * bw); ctx.fill();
      ctx.fillStyle = o.me ? '#3d7a5a' : isPres ? '#f2c14e' : o.elder ? '#e2c793' : '#fff4dc'; rr(x, y, w, hgt, 2 * bw); ctx.fill();
      ctx.fillStyle = o.me ? '#fff' : '#2a2030'; ctx.textAlign = 'right';
      ctx.fillText(label, x + w - pad, y + hgt / 2 + 1);
      // شارة المستوى
      const bx = x + pad * 0.5 + badge / 2, by = y + hgt / 2;
      ctx.fillStyle = '#2a2030'; ctx.beginPath(); ctx.arc(bx, by, badge / 2 + bw * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.lvl >= 5 ? '#f2c14e' : o.lvl >= 3 ? '#5aa07a' : '#9fb4c8'; ctx.beginPath(); ctx.arc(bx, by, badge / 2 - bw * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2030'; ctx.textAlign = 'center'; ctx.font = '900 ' + Math.round(fs * 0.9) + 'px "Courier New", monospace';
      ctx.fillText(String(o.lvl), bx, by + 1);
      // علم البلد فوق البيت
      if (o.cf && L.Flags && L.Flags.has(o.cf)) { const fw = Math.round(fs * 2.1), fh = Math.round(fw * 2 / 3); L.Flags.draw(ctx, o.cf, Math.round(sx - fw / 2), y - fh - bw * 3, fw, fh); }
      // ذيل صغير
      ctx.fillStyle = '#2a2030'; ctx.beginPath(); ctx.moveTo(sx - bw * 3, y + hgt + bw); ctx.lineTo(sx + bw * 3, y + hgt + bw); ctx.lineTo(sx, y + hgt + bw * 5); ctx.fill();
    }
    // سهم الطلب (أو نقطة السباق) إذا برا الشاشة
    const nt = navTarget();
    const dh = nt ? { door: { x: nt.x - 8, y: nt.y - 8 } } : null;
    if (dh && G.state === 'play') {
      const tx = (dh.door.x + 8 - cx) * z, ty = (dh.door.y - cy) * z, W = canvas.width, Hh = canvas.height;
      const m = 40 * dpr;
      if (tx < m || ty < m * 2.5 || tx > W - m || ty > Hh - m) {
        const ccx = W / 2, ccy = Hh / 2, ang = Math.atan2(ty - ccy, tx - ccx);
        const ex = L.clamp(tx, m, W - m), ey = L.clamp(ty, m * 2.5, Hh - m);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
        const s = 14 * dpr;
        ctx.fillStyle = '#2a2030'; ctx.beginPath(); ctx.moveTo(s + 4 * dpr, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(s - 2 * dpr, 0); ctx.lineTo(-s + 5 * dpr, -s + 6 * dpr); ctx.lineTo(-s * 0.4 + 2 * dpr, 0); ctx.lineTo(-s + 5 * dpr, s - 6 * dpr); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ---------- الخريطة الصغيرة ----------
  const MINI_COL = { G: null, P: '#bdb4a4', R: '#55545a', O: '#4a9fd0', Z: '#8d8679', C: '#cbc3b5', D: '#c9a36b', A: '#ecd49a' };
  function miniBase(m) {
    if (m._mini) return m._mini;
    const gp = L.Tiles.BIOME_PAL[m.biome] || L.Tiles.BIOME_PAL.grass;
    const [c, x] = L.makeCanvas(m.w * 2, m.h * 2);
    for (let y = 0; y < m.h; y++) for (let i = 0; i < m.w; i++) { x.fillStyle = MINI_COL[m.ground[y * m.w + i]] || gp[0]; x.fillRect(i * 2, y * 2, 2, 2); }
    m._mini = c; return c;
  }
  // ================= الخريطة (رسم مبسّط متل خرائط التلفون) =================
  const _ic = {};
  function iconImg(name) {
    if (_ic[name]) return _ic[name];
    const im = new Image(); im.src = name === 'car' ? L.Nature.vehIcon('car') : L.Icons.get(name);
    _ic[name] = im; return im;
  }
  const MAPCOL = {
    grass: ['#cfe3b0', '#bcd69a'], forest: ['#b8d6a0', '#a3c788'], desert: ['#f1dfb3', '#e7cf98'],
    snow: ['#eef3f7', '#dde7ee'], island: ['#cfe8b4', '#bcdc9c'],
  };
  const SHORT = { delivery: 'توصيل', garage: 'سيارات', games: 'ألعاب', fish: 'صيد', garden: 'ورد', palace: 'القصر' };
  function rrect(x, X, Y, W, Hh, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + Hh, r); x.arcTo(X + W, Y + Hh, X, Y + Hh, r); x.arcTo(X, Y + Hh, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  // ترسم دولة m. (ox,oy) مكان زاويتها عالشاشة، k = بكسل لكل بلاطة
  function drawCountryBase(x, m, ox, oy, k) {
    const cols = MAPCOL[m.biome] || MAPCOL.grass;
    const W = D.W * k, Hh = D.H * k;
    x.fillStyle = cols[0]; x.fillRect(ox, oy, W, Hh);
    // البلوكات (أماكن البيوت)
    for (let r = 0; r < D.ROWS; r++) for (let c = 0; c < D.COLS; c++) {
      const bx = ox + (D.blockX(c) + 1) * k, by = oy + (D.rowY(r) + 1) * k;
      const isPlaza = c === D.PLAZA.c && r === D.PLAZA.r, isPark = c === D.PARK.c && r === D.PARK.r;
      x.fillStyle = isPlaza ? '#efe3cc' : isPark ? '#a9d48a' : cols[1];
      rrect(x, bx, by, 21 * k, 6 * k, Math.min(6, k)); x.fill();
      if (isPark) { x.fillStyle = '#7cc0ea'; rrect(x, bx + 6 * k, by + 1 * k, 9 * k, 4 * k, k * 1.2); x.fill(); }
      if (isPlaza) { x.fillStyle = '#9fd0ee'; x.fillRect(bx + 9 * k, by + 2 * k, 3 * k, 2 * k); }
    }
    // الشوارع: خطوط بيضا عريضة بحافة رمادية
    const road = (X, Y, w, h) => { x.fillStyle = '#b9b2a6'; x.fillRect(X - k * 0.25, Y - k * 0.25, w + k * 0.5, h + k * 0.5); };
    const road2 = (X, Y, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(X, Y, w, h); };
    const H1 = [2], V1 = [];
    for (let r = 0; r < D.ROWS; r++) H1.push(D.rowY(r) + 8);
    for (let c = 0; c < D.COLS; c++) V1.push(D.blockX(c) + 23);
    [road, road2].forEach((f) => { H1.forEach((ty) => f(ox, oy + ty * k, W, 2 * k)); V1.forEach((tx) => f(ox + tx * k, oy, 2 * k, Hh)); });
    // البيوت
    (m.homes || []).forEach((h) => {
      const p = h.p;
      if (h.palace) { // القصر: مبنى عريض وقبة دهب
        const x0 = ox + p.x * k, y0 = oy + (p.y + 0.6) * k, w = 19 * k, hh = 3.2 * k, ln = Math.max(1.5, k * 0.25);
        x.fillStyle = '#2a2030'; x.fillRect(x0 - ln, y0 - ln, w + ln * 2, hh + ln * 2);
        x.fillStyle = '#f3e7cc'; x.fillRect(x0, y0, w, hh);
        x.fillStyle = '#4a424a'; for (let i = 1; i < 3; i++) x.fillRect(x0, y0 + hh * i / 3, w, Math.max(1, k * 0.3));
        [x0, x0 + w - 3 * k].forEach((tx) => { x.fillStyle = '#2a2030'; x.fillRect(tx - ln, y0 - 1.6 * k - ln, 3 * k + ln * 2, 1.6 * k + ln); x.fillStyle = '#f3e7cc'; x.fillRect(tx, y0 - 1.6 * k, 3 * k, 1.6 * k); });
        const dcx = x0 + w / 2, r = 2.6 * k;
        x.fillStyle = '#2a2030'; x.beginPath(); x.arc(dcx, y0, r + ln, Math.PI, 0); x.fill();
        x.fillStyle = '#f2c14e'; x.beginPath(); x.arc(dcx, y0, r, Math.PI, 0); x.fill();
        x.fillStyle = '#c8553f'; x.fillRect(dcx - k * 0.9, y0 + hh - 1.6 * k, k * 1.8, 1.6 * k);
        return;
      }
      if (!h.own) { if (k >= 6) { x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(ox + (p.x + 3.5) * k, oy + (p.y + 3) * k, k * 0.5, 0, Math.PI * 2); x.fill(); } return; }
      const me = h.own.me, pres = m._pres && m._pres.id === h.own.id;
      const cx = ox + (p.x + 3.5) * k, cy = oy + (p.y + 3) * k, s = Math.max(4, k * (me ? 2.6 : 1.9));
      x.fillStyle = '#2a2030';
      x.beginPath(); x.moveTo(cx - s - 1, cy); x.lineTo(cx, cy - s - 1); x.lineTo(cx + s + 1, cy); x.closePath(); x.fill();
      x.fillRect(cx - s * 0.75 - 1, cy - 1, s * 1.5 + 2, s + 2);
      x.fillStyle = me ? '#3d7a5a' : pres ? '#f2c14e' : (H.ROOFS[h.own.roof] || H.ROOFS.red).roof;
      x.beginPath(); x.moveTo(cx - s, cy); x.lineTo(cx, cy - s); x.lineTo(cx + s, cy); x.closePath(); x.fill();
      x.fillStyle = '#fff4dc'; x.fillRect(cx - s * 0.75, cy, s * 1.5, s);
    });
    // حدود الدولة
    const col = (m._country && m._country.flag) || '#c8553f';
    x.lineWidth = Math.max(3, k * 0.7); x.strokeStyle = '#2a2030'; x.strokeRect(ox, oy, W, Hh);
    x.lineWidth = Math.max(2, k * 0.45); x.strokeStyle = col; x.setLineDash([k * 2.5, k * 1.2]); x.strokeRect(ox, oy, W, Hh); x.setLineDash([]);
  }
  // الأسماء والدبابيس فوق صورة الدولة
  function drawCountryTop(x, m, ox, oy, k, o) {
    if (o.labels) (m.homes || []).forEach((h) => {
      if (!h.own) return;
      const me = h.own.me, pres = m._pres && m._pres.id === h.own.id;
      if (h.palace) { label(x, '👑 قصر ' + h.own.name, ox + (h.p.x + 9.5) * k, oy + (h.p.y - 1.4) * k, Math.max(11 * dpr, Math.min(16 * dpr, k * 1.8)), '#ffe08a'); return; }
      if (!(me || pres || k >= 9)) return;
      const p = h.p, cx = ox + (p.x + 3.5) * k, cy = oy + (p.y + 3) * k, s = Math.max(4, k * (me ? 2.6 : 1.9));
      label(x, (pres ? '👑 ' : '') + (me ? 'بيتك' : h.own.name), cx, cy - s - 9 * dpr * 0.8, Math.max(10 * dpr, Math.min(14 * dpr, k * 1.6)), me ? '#bff0c8' : pres ? '#ffe08a' : '#fff4dc');
    });
    // الدبابيس
    const marks = [];
    const ps = o.pin || Math.max(16 * dpr, k * 3.4);
    (m.pois || []).forEach((po) => {
      if (po.k === 'garden' && po.x > D.blockX(D.PARK.c) + 10 && !o.labels) return; // بالخريطة الصغيرة حوض ورد واحد بيكفي
      const px = ox + po.x * k, py = oy + po.y * k;
      if (po.k === 'palace') { marks.push({ po, x: px, y: py, m }); return; }
      drawPin(x, px, py, ps, po.col, po.icon);
      if (o.labels && k >= 4.5 && !(po.k === 'garden' && po.x > D.blockX(D.PARK.c) + 10)) label(x, SHORT[po.k] || po.label, px, py + ps * 0.3, Math.max(9.5 * dpr, ps * 0.34), '#fff4dc');
      marks.push({ po, x: px, y: py - ps * 0.7, m });
    });
    return marks;
  }
  // صورة جاهزة لكل دولة (بتنرسم مرة وحدة لكل تكبير)
  const _cc = new Map();
  let _ccT = 0, _ccMore = false;
  function countryImg(m, k) {
    const kq = Math.pow(2, Math.round(Math.log2(k) * 4) / 4);
    const key = m.d + ':' + kq + ':' + G.stamp + ':' + (m === G.map ? 1 : 0);
    let e = _cc.get(m.d);
    if (e && e.key === key) { _cc.delete(m.d); _cc.set(m.d, e); return e; }
    if (performance.now() - _ccT > 6) { _ccMore = true; return null; } // كفاية بهالإطار، الباقي بعدين
    const pad = Math.ceil(Math.max(3, kq * 0.7)), W = Math.ceil(D.W * kq) + pad * 2, Hh = Math.ceil(D.H * kq) + pad * 2;
    const c = (e && e.c) || document.createElement('canvas');
    c.width = W; c.height = Hh;
    drawCountryBase(c.getContext('2d'), m, pad, pad, kq);
    e = { key, c, kq, pad };
    _cc.delete(m.d); _cc.set(m.d, e);
    let px = 0; _cc.forEach((v) => { px += v.c.width * v.c.height; });
    for (const [kk, v] of _cc) { if (px <= 12e6 || _cc.size <= 1) break; px -= v.c.width * v.c.height; _cc.delete(kk); }
    return e;
  }
  function drawMapCountry(x, m, ox, oy, k, o) {
    if (D.W * k <= 700) {
      const e = countryImg(m, k);
      if (!e) { x.fillStyle = (MAPCOL[m.biome] || MAPCOL.grass)[0]; x.fillRect(ox, oy, D.W * k, D.H * k); }
      else { const sc = k / e.kq; x.imageSmoothingEnabled = true; x.drawImage(e.c, ox - e.pad * sc, oy - e.pad * sc, e.c.width * sc, e.c.height * sc); }
    } else drawCountryBase(x, m, ox, oy, k);
    return drawCountryTop(x, m, ox, oy, k, o);
  }
  function drawPin(x, px, py, s, col, icon) {
    const r = s * 0.5;
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px, py, r * 0.6, r * 0.22, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a2030'; x.beginPath(); x.arc(px, py - s * 0.85, r + 2, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(px, py + 1); x.closePath(); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(px, py - s * 0.85, r, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(px, py - 2); x.closePath(); x.fill();
    x.fillStyle = '#fff4dc'; x.beginPath(); x.arc(px, py - s * 0.85, r * 0.72, 0, Math.PI * 2); x.fill();
    const im = iconImg(icon); if (im.complete) { x.imageSmoothingEnabled = false; x.drawImage(im, px - r * 0.62, py - s * 0.85 - r * 0.62, r * 1.24, r * 1.24); }
  }
  function drawMeArrow(x, px, py, s, dir) {
    const ang = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir | 0];
    x.save(); x.translate(px, py); x.rotate(ang);
    x.fillStyle = 'rgba(224,90,74,.25)'; x.beginPath(); x.arc(0, 0, s * 1.6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a2030'; x.beginPath(); x.moveTo(s + 2, 0); x.lineTo(-s * 0.8 - 2, -s * 0.8 - 2); x.lineTo(-s * 0.35, 0); x.lineTo(-s * 0.8 - 2, s * 0.8 + 2); x.closePath(); x.fill();
    x.fillStyle = '#e05a4a'; x.beginPath(); x.moveTo(s, 0); x.lineTo(-s * 0.8, -s * 0.8); x.lineTo(-s * 0.35, 0); x.lineTo(-s * 0.8, s * 0.8); x.closePath(); x.fill();
    x.restore();
  }
  // يرسم كل الدول الظاهرة حوالين نقطة مركز (بإحداثيات الدولة الحالية بالبكسل)
  function drawMapView(x, W, Hh, cxw, cyw, k, o) {
    x.fillStyle = '#7cb5d8'; x.fillRect(0, 0, W, Hh);
    _ccT = performance.now(); _ccMore = false;
    const mw = D.W, mh = D.H;
    const tx0 = cxw / T - W / 2 / k, ty0 = cyw / T - Hh / 2 / k;
    const marks = [], chunks = [];
    for (let dy = Math.floor(ty0 / mh); dy <= Math.floor((ty0 + Hh / k) / mh); dy++) for (let dx = Math.floor(tx0 / mw); dx <= Math.floor((tx0 + W / k) / mw); dx++) {
      const m = mapChunk(dx, dy); if (!m) continue;
      const ox = (dx * mw - tx0) * k, oy = (dy * mh - ty0) * k;
      marks.push(...drawMapCountry(x, m, ox, oy, k, o));
      chunks.push({ m, ox, oy });
    }
    // أسماء الدول
    if (o.labels) chunks.forEach((c) => {
      const cn = c.m._country; if (!cn) return;
      const nx = L.clamp(c.ox + mw * k / 2, 80 * dpr, W - 80 * dpr), ny = L.clamp(c.oy + 16 * dpr, 16 * dpr, Hh - 40 * dpr);
      if (c.oy + mh * k < 30 * dpr || c.oy > Hh - 30 * dpr || c.ox + mw * k < 40 || c.ox > W - 40) return;
      label(x, cn.name + (cn.pres ? ' · 👑 ' + cn.pres.name : ''), nx, Math.max(ny, c.oy + 16 * dpr), 14 * dpr, '#fff4dc');
    });
    const toS = (wx, wy) => ({ x: (wx / T - tx0) * k, y: (wy / T - ty0) * k });
    // الهدف
    const tgt = navTarget();
    if (tgt) {
      const a = toS(G.player.x, G.player.y), b = toS(tgt.x, tgt.y);
      x.strokeStyle = '#2a2030'; x.lineWidth = 6 * dpr; x.setLineDash([]); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      x.strokeStyle = '#f2c14e'; x.lineWidth = 3.5 * dpr; x.setLineDash([8 * dpr, 6 * dpr]); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); x.setLineDash([]);
      const pr = (6 + 3 * Math.sin(G.time * 5)) * dpr;
      x.fillStyle = '#2a2030'; x.beginPath(); x.arc(b.x, b.y, pr + 3 * dpr, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#f2c14e'; x.beginPath(); x.arc(b.x, b.y, pr, 0, Math.PI * 2); x.fill();
    }
    const me = toS(G.player.x, G.player.y);
    drawMeArrow(x, me.x, me.y, (o.me || 11) * dpr, G.player.dir);
    if (o.labels) label(x, 'إنت', me.x, me.y + 24 * dpr, 12 * dpr, '#ffb3a8');
    return { marks, chunks, tx0, ty0 };
  }

  function drawMini() {
    const mc = $('minimap'); if (!mc || !G.map || G.state !== 'play') return;
    const W = Math.round(mc.clientWidth * dpr), Hh = Math.round(mc.clientHeight * dpr);
    if (!W || !Hh) return;
    if (mc.width !== W || mc.height !== Hh) { mc.width = W; mc.height = Hh; }
    const x = mc.getContext('2d');
    // رادار حوالينك: حوالي 34 بلاطة عرض
    const sm = W < 150 * dpr, k = sm ? W / 26 : W / 34;
    drawMapView(x, W, Hh, G.player.x, G.player.y, k, { pin: (sm ? 11 : 15) * dpr, me: sm ? 6 : 8 });
    // سهم عالطرف إذا الهدف برا الرادار
    const tgt = navTarget();
    if (tgt) {
      const dx = (tgt.x - G.player.x) / T * k, dy = (tgt.y - G.player.y) / T * k;
      if (Math.abs(dx) > W / 2 - 8 || Math.abs(dy) > Hh / 2 - 8) {
        const ang = Math.atan2(dy, dx), ex = W / 2 + Math.cos(ang) * (W / 2 - 12 * dpr), ey = Hh / 2 + Math.sin(ang) * (Hh / 2 - 12 * dpr);
        x.save(); x.translate(ex, ey); x.rotate(ang); x.fillStyle = '#2a2030'; x.beginPath(); x.moveTo(10 * dpr, 0); x.lineTo(-7 * dpr, -8 * dpr); x.lineTo(-7 * dpr, 8 * dpr); x.fill();
        x.fillStyle = '#f2c14e'; x.beginPath(); x.moveTo(7 * dpr, 0); x.lineTo(-5 * dpr, -5.5 * dpr); x.lineTo(-5 * dpr, 5.5 * dpr); x.fill(); x.restore();
      }
    }
    const nm = G.map._country ? G.map._country.name : G.map.name;
    if ($('mini-name').textContent !== nm) $('mini-name').textContent = nm;
  }

  // ---------- الخريطة الكبيرة + الملاحة ----------
  function navTarget() { // {x,y} بإحداثيات الدولة الحالية
    if (G.race && G.race.pts[G.race.i]) return racePoint(G.race.pts[G.race.i]);
    const dh = deliveryHome(); if (dh) return { x: dh.door.x + 8, y: dh.door.y + 8 };
    if (G.way) { const dl = L.Planet.delta(G.map.d, G.way.d); return { x: G.way.x + dl.dx * MW(), y: G.way.y + dl.dy * MH() }; }
    return null;
  }
  function updateWay() {
    if (!G.way) return null;
    const t = navTarget(); if (!t) return null;
    const dist = Math.hypot(t.x - G.player.x, t.y - G.player.y);
    if (dist < 22 && !G.race && !(G.s && G.s.delivery)) { UI.toast('وصلت: ' + G.way.label, 'flag', 'good'); G.way = null; L.Audio.play('good'); return null; }
    return '🧭 ' + G.way.label + ' · ' + Math.round(dist / T) + ' م';
  }
  function openBigMap() {
    if (G.state !== 'play') return;
    $('bigmap').classList.remove('hidden');
    const c = $('bm-cv');
    const fitK = Math.min(c.clientWidth * dpr / (D.W + 6), c.clientHeight * dpr / (D.H + 10));
    G.big = { sel: null, cx: G.player.x, cy: G.player.y, k: fitK * 1.5, minK: fitK / 3, maxK: fitK * 6 };
    $('bm-panel').classList.add('hidden');
    drawBigMapNow();
  }
  function closeBigMap() { $('bigmap').classList.add('hidden'); G.big = null; miniSize(true); }
  let _bmRaf = 0;
  function drawBigMap() { if (_bmRaf) return; _bmRaf = requestAnimationFrame(() => { _bmRaf = 0; drawBigMapNow(); }); }
  function drawBigMapNow() {
    const g = G.big; if (!g) return;
    const c = $('bm-cv'), W = Math.floor(c.clientWidth * dpr), Hh = Math.floor(c.clientHeight * dpr);
    if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
    const x = c.getContext('2d');
    const r = drawMapView(x, W, Hh, g.cx, g.cy, g.k, { labels: true, me: 13 });
    if (_ccMore) drawBigMap(); // كمّل الدول اللي ما لحقت تنرسم
    g.marks = r.marks; g.chunks = r.chunks; g.tx0 = r.tx0; g.ty0 = r.ty0;
    if (g.sel) { const sx = (g.sel.x / T - g.tx0) * g.k, sy = (g.sel.y / T - g.ty0) * g.k; x.strokeStyle = '#fff4dc'; x.lineWidth = 4 * dpr; x.beginPath(); x.arc(sx, sy, 18 * dpr, 0, Math.PI * 2); x.stroke(); x.strokeStyle = '#2a2030'; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(sx, sy, 21 * dpr, 0, Math.PI * 2); x.stroke(); }
  }
  function bigSelect(mx, my) {
    const g = G.big;
    let best = null, bd = 30 * dpr;
    (g.marks || []).forEach((mk) => { const d2 = Math.hypot(mk.x - mx, mk.y - my); if (d2 < bd) { bd = d2; best = mk; } });
    const tx = mx / g.k + g.tx0, ty = my / g.k + g.ty0; // بلاطات بالنسبة للدولة الحالية
    const dx = Math.floor(tx / D.W), dy = Math.floor(ty / D.H), m = mapChunk(dx, dy);
    const toLocal = (mm) => { const dl = L.Planet.delta(G.map.d, mm.d); return { dx: dl.dx, dy: dl.dy }; };
    if (best) {
      const dl = toLocal(best.m);
      g.sel = { d: best.m.d, x: best.po.go.x * T, y: best.po.go.y * T, label: best.po.label + (best.m === G.map ? '' : ' · ' + best.m._country.name) };
      g.sel.x += dl.dx * MW(); g.sel.y += dl.dy * MH(); g.sel.lx = best.po.go.x * T; g.sel.ly = best.po.go.y * T;
    } else if (m) {
      const lx = tx - dx * D.W, ly = ty - dy * D.H;
      const h = (m.homes || []).find((hh) => hh.own && lx >= hh.p.x && lx < hh.p.x + (hh.palace ? 19 : 7) && ly >= hh.p.y - (hh.palace ? 2 : 0) && ly < hh.p.y + (hh.palace ? 4 : 6));
      const gx = h ? (h.p.x + (h.palace ? 9.5 : 3.5)) : lx, gy = h ? (h.p.y + (h.palace ? 5.4 : 6.6)) : ly;
      g.sel = { d: m.d, x: (gx + dx * D.W) * T, y: (gy + dy * D.H) * T, lx: gx * T, ly: gy * T, label: h ? (h.palace ? 'قصر ' + h.own.name : h.own.me ? 'بيتك' : 'بيت ' + h.own.name) + (m === G.map ? '' : ' · ' + m._country.name) : 'نقطة بـ' + m._country.name };
    } else return;
    L.Audio.play('click');
    $('bm-title').textContent = g.sel.label;
    $('bm-panel').classList.remove('hidden');
    drawBigMap();
  }
  function setupBigMap() {
    $('bm-close').addEventListener('click', closeBigMap);
    $('mini-big').addEventListener('click', (e) => { e.currentTarget.blur(); openBigMap(); });
    const c = $('bm-cv'), pts = new Map();
    let pinch = null, moved = 0;
    c.addEventListener('pointerdown', (e) => { if (!G.big) return; c.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: G.big.k }; } });
    c.addEventListener('pointermove', (e) => {
      const g = G.big, p = pts.get(e.pointerId); if (!g || !p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; g.k = L.clamp(pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, g.minK, g.maxK); }
      else { g.cx -= dx * dpr / g.k * T; g.cy -= dy * dpr / g.k * T; }
      drawBigMap();
    });
    const up = (e) => {
      const had = pts.delete(e.pointerId); if (!had || !G.big) return;
      if (pts.size < 2) pinch = null;
      if (moved < 8) { const r = c.getBoundingClientRect(); bigSelect((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr); }
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { const g = G.big; if (!g) return; e.preventDefault(); g.k = L.clamp(g.k * (e.deltaY > 0 ? 0.88 : 1.14), g.minK, g.maxK); drawBigMap(); }, { passive: false });
    $('bm-plus').addEventListener('click', () => { const g = G.big; g.k = Math.min(g.maxK, g.k * 1.4); drawBigMap(); });
    $('bm-minus').addEventListener('click', () => { const g = G.big; g.k = Math.max(g.minK, g.k / 1.4); drawBigMap(); });
    $('bm-me').addEventListener('click', () => { const g = G.big; g.cx = G.player.x; g.cy = G.player.y; g.k = Math.max(g.k, (g.minK * 3) * 2); drawBigMap(); });
    $('bm-nav').addEventListener('click', () => { const s2 = G.big.sel; G.way = { d: s2.d, x: s2.lx, y: s2.ly, label: s2.label }; closeBigMap(); UI.toast('اتبع السهم الأصفر 🧭', 'flag'); });
    $('bm-tp').addEventListener('click', () => { const s2 = G.big.sel; closeBigMap(); goTo(s2.d, s2.lx / T, s2.ly / T, 0); });
  }
  let _miniT = 0;
  function miniSize(small) {
    $('mini').classList.toggle('small', small);
    clearTimeout(_miniT);
    if (!small) _miniT = setTimeout(() => { if (!G.big) miniSize(true); }, 10000); // بترجع تصغر لحالها
  }
  function setupMini() {
    const mc = $('minimap');
    // ضغطة أولى: بتكبر. ضغطة تانية: الخريطة الكاملة
    mc.addEventListener('click', () => {
      if (G.state !== 'play') return;
      L.Audio.play('click');
      if ($('mini').classList.contains('small')) miniSize(false);
      else { openBigMap(); miniSize(true); }
    });
    ['mini-all', 'mini-me', 'mini-big'].forEach((id) => $(id).addEventListener('click', () => miniSize(false)));
    $('mini-all').addEventListener('click', (e) => { e.currentTarget.blur(); G.zoomMul = G.zoomMul <= minMul() + 0.01 ? 1 : minMul(); });
    $('mini-me').addEventListener('click', (e) => { e.currentTarget.blur(); G.camOff = { x: 0, y: 0 }; G.zoomMul = 1; });
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1924'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (G.globe) return; // الكوكب مغطّي الشاشة
    if (G.state === 'title') { // شاشة البداية: الكوكب بيدور
      const W = canvas.width, Hh = canvas.height;
      drawStars(ctx, W, Hh, G.time);
      const r = Math.min(W * 0.46, Hh * 0.3);
      G.titleRot = G.titleRot || L.Planet.facing(L.Planet.spot(1));
      G.titleRot.yaw += 0.0025;
      renderGlobeTo(ctx, W, Hh, { cx: W / 2, cy: Hh * 0.2 + r * 0.35, r }, G.titleRot, G.time, {});
      return;
    }
    if (!G.map) return;
    const z = zoomEff();
    const cx = Math.round(G.cam.x * z) / z, cy = Math.round(G.cam.y * z) / z;
    ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z);
    ctx.imageSmoothingEnabled = false;
    const chunks = G._chunks = visibleChunks();
    const v0 = view();
    // الدول الجارة أولاً، وبعدين دولتك (لحتى اللاعب يبين فوق)
    chunks.sort((a, b) => (a.m === G.map) - (b.m === G.map));
    for (const ch of chunks) {
      const m = ch.m;
      ctx.setTransform(z, 0, 0, z, (-cx + ch.ox) * z, (-cy + ch.oy) * z);
      const vl = { x: v0.x - ch.ox, y: v0.y - ch.oy, w: v0.w, h: v0.h };
      const ents = (m === G.map ? (G.player ? [G.player].concat(G.npcs) : G.npcs.slice()) : m._npcs.concat(m.residents || [])).concat(m.litter || []);
      G.world.draw(ctx, m, vl, ents, G.time);
      // أحواض عطشانة: نقطة مي فوقها
      m.interactables.forEach((it) => {
        if (it.action !== 'garden' || Date.now() < m.beds[it.obj.bed]) return;
        const x = Math.round(it.rect.x + 16), y = Math.round(it.rect.y - 8 + Math.sin(G.time * 5 + it.obj.bed) * 1.5);
        L.rect(ctx, x - 2, y - 4, 4, 1, '#2a2030'); L.rect(ctx, x - 3, y - 3, 6, 5, '#2a2030'); L.rect(ctx, x - 2, y - 3, 4, 4, '#7cc6ea'); L.rect(ctx, x - 1, y - 5, 2, 2, '#7cc6ea'); L.rect(ctx, x - 1, y - 2, 1, 1, '#fff');
      });
      drawBorders(m);
    }
    ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z);
    if (G.fishing) { // الفلّينة بالمي
      const f = G.fishing, bob = Math.sin(G.time * 8) * (f.phase === 'bite' ? 3 : 1);
      ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(G.player.x + 4, G.player.y - 18); ctx.lineTo(f.x, f.y + bob); ctx.stroke();
      L.rect(ctx, Math.round(f.x) - 1, Math.round(f.y + bob) - 2, 3, 3, '#e05a4a'); L.rect(ctx, Math.round(f.x) - 1, Math.round(f.y + bob) + 1, 3, 1, '#fff');
      drawFishBar();
    }
    drawRace();
    for (const fl of G.floaters) { // +$ طايرة
      ctx.globalAlpha = 1 - fl.t / 1.2; ctx.font = '900 8px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#2a2030'; ctx.fillText(fl.text, fl.x + 0.6, fl.y - fl.t * 14 + 0.6); ctx.fillStyle = '#f2c14e'; ctx.fillText(fl.text, fl.x, fl.y - fl.t * 14);
      ctx.globalAlpha = 1;
    }
    if (G.build) {
      const b = G.build, img = H.scaffold(), k = Math.min(1, b.t / 0.4);
      const tall = b.lvl >= 6 ? H.houseSprite(b.lvl, 'red', 0).height : 60, n = Math.ceil(tall / 56);
      ctx.globalAlpha = k;
      for (let i = 0; i < n; i++) ctx.drawImage(img, (b.p.x + 3.5) * T - 30, (b.p.y + 5) * T - 60 - i * 56 + Math.round((1 - k) * 8));
      ctx.globalAlpha = 1;
    }
    for (const p of G.particles) { ctx.globalAlpha = Math.min(1, p.life * 2); L.rect(ctx, Math.round(p.x), Math.round(p.y), 2, 2, p.c); }
    ctx.globalAlpha = 1;
    if (G.state === 'play') {
      const nt = !G.race && navTarget();
      if (nt) drawArrowAt(nt.x, nt.y - 22);
      if (G.target) drawIndicator(G.target);
    }
    const lit = { outdoor: true, lights: [], windows: [] };
    chunks.forEach((ch) => {
      ch.m.lights.forEach((l) => lit.lights.push(Object.assign({}, l, { x: l.x + ch.ox, y: l.y + ch.oy })));
      ch.m.windows.forEach((w) => lit.windows.push(Object.assign({}, w, { x: w.x + ch.ox, y: w.y + ch.oy })));
    });
    L.Lighting.render(ctx, lit, { x: cx, y: cy }, z, G.hourOverride != null ? G.hourOverride : G.state === 'play' ? hourNow() : 18.2, G.player ? { x: G.player.x, y: G.player.y } : null);
    // نجوم الليل والكنز بيلمعوا فوق الضلمة
    for (const ch of chunks) { ctx.setTransform(z, 0, 0, z, (-cx + ch.ox) * z, (-cy + ch.oy) * z); drawStarsOn(ch.m); }
    ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z);
    if (G.state === 'play') {
      const tr = treasureOf(G.map);
      if (tr && Math.hypot(tr.x - G.player.x, tr.y - G.player.y) < 5 * T) {
        const x = Math.round(tr.x), y = Math.round(tr.y), tw = (Math.sin(G.time * 6) + 1) / 2;
        L.rect(ctx, x - 6, y - 8, 12, 8, '#2a2030'); L.rect(ctx, x - 5, y - 7, 10, 6, '#a8763f'); L.rect(ctx, x - 5, y - 7, 10, 2, '#c9a06a'); L.rect(ctx, x - 1, y - 5, 2, 2, '#f2c14e');
        ctx.fillStyle = 'rgba(255,224,138,' + tw + ')'; ctx.fillRect(x + 5, y - 12, 2, 2); ctx.fillRect(x - 8, y - 10, 2, 2); ctx.fillRect(x, y - 14, 1, 3);
      }
    }
    drawTags(cx, cy, z);
    drawMini();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try { update(dt); if (!G.big) render(); if (G.state === 'play' && !G.globe) prepTick(); if (G.globe) renderGlobe(dt); if (G.big && (G._bmT = (G._bmT || 0) + dt) > 0.25) { G._bmT = 0; drawBigMap(); } } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  function setStatus() {
    const n = ranked().length;
    const el = $('world-status');
    if (!el) return;
    el.innerHTML = n ? 'بالحارة هلأ <b class="num">' + n + '</b> بيت' + (Net.mode === 'local' ? ' · نسخة تجريبية' : '') : 'الحارة لسا فاضية. كون أول واحد بيبني!';
  }

  // ---------- التشغيل ----------
  async function boot() {
    resize();
    G.touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    document.body.classList.toggle('touch', G.touch);
    window.addEventListener('touchstart', () => { if (!G.touch) { G.touch = true; document.body.classList.add('touch'); if (G.state === 'play') $('touch').classList.remove('hidden'); } }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (/^(Digit|Numpad)[1-9]$/.test(e.code)) L.Input.push('key:' + e.code);
    }, true);
    L.Input.setupTouch();
    UI.init({
      start: (name) => { G.tryLandscape && G.tryLandscape(); newGame(name, Object.assign({}, look)); },
      ownerCode: (c) => useOwnerCode(c),
      isOwner: () => !!G.ownerOK,
      continueGame: () => { G.tryLandscape && G.tryLandscape(); continueGame(); },
      book: () => { if (G.state === 'play' && !UI.inDialog() && !UI.cardOpen()) openResidents(); },
      menu: () => { if (G.state === 'play' && !UI.inDialog() && !UI.cardOpen()) openMenu(); },
    });
    { // كود صاحب القصر: من الرابط ?owner=... أو محفوظ من قبل
      let c = null;
      try { c = new URLSearchParams(location.search).get('owner'); if (c) history.replaceState(null, '', location.pathname); } catch (e) { /* */ }
      try { c = c || localStorage.getItem('hara_owner'); } catch (e) { /* */ }
      if (c) useOwnerCode(c, true);
    }
    setupGlobe();
    { const orig = G.world.blocked.bind(G.world); G.world.blocked = (map, r) => blockedOpen(orig, map, r); }
    setupPan();
    setupMini();
    setupBigMap();
    // لف التلفون: بنطلب العرض، وإذا ما زبط بنعرض رسالة
    const checkRot = () => {
      const portrait = window.innerHeight > window.innerWidth;
      $('rotate').classList.toggle('hidden', !(G.touch && portrait && G.state === 'play' && !G.rotSkip));
    };
    $('rot-skip').addEventListener('click', () => { G.rotSkip = true; try { localStorage.setItem('hara_rot_skip', '1'); } catch (e) { /* */ } checkRot(); });
    try { G.rotSkip = localStorage.getItem('hara_rot_skip') === '1'; } catch (e) { /* */ }
    window.addEventListener('resize', checkRot); setInterval(checkRot, 1000);
    G.tryLandscape = async () => {
      try {
        if (!G.touch) return;
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
      } catch (e) { /* المتصفح ما سمح، منكتفي بالرسالة */ }
    };
    try { const [gc, gx] = L.makeCanvas(40, 40); L.Planet.render(gx, 20, 20, 17, L.Planet.facing(L.Planet.spot(1)), 0, 1); $('globe-ic').src = gc.toDataURL(); } catch (e) { /* */ }
    $('btn-globe').addEventListener('click', (e) => { e.currentTarget.blur(); if (G.state === 'play' && !UI.inDialog() && !UI.cardOpen()) openGlobe(); });
    $('btn-ride').addEventListener('click', (e) => { e.currentTarget.blur(); toggleRide(); });
    $('btn-ride2').addEventListener('pointerdown', (e) => { e.preventDefault(); toggleRide(); });
    $('btn-new-toggle').addEventListener('click', () => { $('new-block').classList.remove('hidden'); $('btn-new-toggle').classList.add('hidden'); });
    try { const fl = document.createElement('link'); fl.rel = 'icon'; fl.href = L.Icons.get('home'); document.head.appendChild(fl); } catch (e) { /* */ }
    Net.onChange(() => {
      G.dirty = true; setStatus();
      if (G.s && G.s.plot && G.s.lvl && !G.build) { const o = Net.ownerOf(G.s.plot); if (o && o.id !== Net.myId) lostPlot(); }
    });
    loadDistrict(1);
    UI.showTitle(L.Save.read());
    refreshCreator();
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('pagehide', () => save());
    requestAnimationFrame(frame);
    await Net.init();
    G.dirty = true; setStatus();
  }

  window.__hara = { askNewName, G, Net, firstFreeCountry, canBuildIn, presRace, useOwnerCode, palaceOwner, presidentOf, openBigMap, drawBigMapNow, liteOf, rebuildM: (m) => rebuild(m), goToPlot, openGlobe, openVehicles, openJobs, setRide, ACTIONS, startBuild, plotById, openResidents, openMyHouse, rebuild: () => rebuild(), give: (m) => { G.s.money += m; } };
  boot();
})(window.LIFE);
