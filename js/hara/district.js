// حارتنا — مولّد خريطة الحي (كل حي فيه 69 أرض + ساحة)
(function (L) {
  'use strict';
  const T = L.TILE;

  // أبعاد ثابتة: 4 بلوكات أفقية × 6 صفوف، كل بلوك 3 أراضي (7×6 بلاطات)
  const COLS = 4, ROWS = 6, PER = 3, PW = 7, PH = 6;
  const W = 1 + COLS * 25 + 1, H = 4 + ROWS * 10 + 2;
  const PLAZA = { c: 1, r: 2 }; // البلوك اللي فيه الساحة
  const PARK = { c: 2, r: 3 };  // البلوك اللي فيه الحديقة والبحيرة
  const PRICES = [0, 40, 70, 120, 200, 320]; // سعر الأرض ثم كل ترقية
  const LEVEL_NAMES = ['', 'كوخ صغير', 'بيت مرتب', 'بيت عيلة', 'فيلا بطابقين', 'قصر', 'عمارة 3 طوابق', 'عمارة 5 طوابق', 'برج زجاج', 'برج فخم', 'ناطحة سحاب'];

  // بيوت ثابتة لأهل الحارة (ما هم لاعبين) — لحتى الحي ما يكون فاضي وفي وين توصّل طلبات
  const ELDERS = [
    { c: 0, r: 0, i: 1, name: 'أبو فادي', lvl: 3, roof: 'green', motto: 'الجار قبل الدار', look: { skin: '#e8b98f', hair: '#d9d4cc', shirt: '#5a6b5a', pants: '#3a3a44', beard: '#d9d4cc' } },
    { c: 3, r: 1, i: 0, name: 'أم وليد', lvl: 2, roof: 'purple', motto: 'البيت بأهله', look: { skin: '#e8b98f', hair: '#3a2b4a', shirt: '#6a4f8a', pants: '#3a2b4a', longHair: true } },
    { c: 2, r: 4, i: 2, name: 'الحاج محمود', lvl: 4, roof: 'blue', motto: 'اللي بيزرع بيحصد', look: { skin: '#d9a47a', hair: '#8a8478', shirt: '#6b5a3f', pants: '#3a3a44', beard: '#8a8478' } },
    { c: 0, r: 5, i: 0, name: 'حمّودة وأهله', lvl: 1, roof: 'red', motto: 'بكرا أحلى', look: { skin: '#d9a47a', hair: '#2b2233', shirt: '#4f86d6', pants: '#5a4636' } },
  ];

  function Builder(id, name) {
    this.map = { id, name, w: W, h: H, ground: new Array(W * H).fill('G'), objects: [], doors: [], exits: [], npcs: [], marks: [], outdoor: true };
  }
  Builder.prototype.fill = function (x, y, w, h, t) {
    const m = this.map;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < m.w && j < m.h) m.ground[j * m.w + i] = t;
    return this;
  };
  Builder.prototype.obj = function (type, x, y, props) { this.map.objects.push(Object.assign({ type, x, y }, props || {})); return this; };

  function blockX(c) { return 1 + c * 25; }
  function rowY(r) { return 4 + r * 10; }

  // كل الأراضي بالحي، بترتيب ثابت (index = رقم الأرض)
  function plotList(d) {
    const list = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if ((c === PLAZA.c && r === PLAZA.r) || (c === PARK.c && r === PARK.r)) continue;
      for (let i = 0; i < PER; i++) {
        const elder = ELDERS.find((e) => e.c === c && e.r === r && e.i === i);
        const n = list.length;
        const palace = d === 1 && L.Palace && c === L.Palace.BLOCK.c && r === L.Palace.BLOCK.r;
        list.push({ id: 'd' + d + '-' + n, n, d, x: blockX(c) + 1 + i * PW, y: rowY(r) + 1, elder: d === 1 && elder ? elder : null, palace });
      }
    }
    // بالدولة 1 البلوك اللي جنب الساحة محجوز للقصر (أرقام الأراضي التانية ما بتتغير)
    return d === 1 ? list.filter((p) => !p.palace) : list;
  }
  // مكان القصر بالبلاطات
  function palaceSpot() { return L.Palace ? { x: blockX(L.Palace.BLOCK.c) + 1, y: rowY(L.Palace.BLOCK.r) + 1 } : null; }
  function palacePoi() { const q = palaceSpot(); return { k: 'palace', x: q.x + 10.5, y: q.y + 1.2, label: 'القصر 👑', icon: 'home', col: '#f2c14e', go: { x: q.x + 10.5, y: q.y + 5.4 } }; }
  const PLOTS_ALL = (COLS * ROWS - 2) * PER; // 66 أرض بكل حي
  const plotsFree = (d) => PLOTS_ALL - (d === 1 ? ELDERS.length + (L.Palace ? PER : 0) : 0);

  function build(d) {
    const biome = L.Planet.biomeOf(d);
    const BN = L.Planet.BIOMES[biome].name;
    const b = new Builder('d' + d, 'الحي ' + d + ' · ' + BN);
    b.map.biome = biome; b.map.d = d; b.map.cell = L.Planet.cellOf(d);
    const rnd = L.rng(d * 977 + 13);
    const tree = (x, y, v) => { const t = L.Nature.treeFor(biome, v == null ? Math.floor(rnd() * 6) : v); b.obj(t.type, x, y, { v: t.v }); };
    // عالم مفتوح: أطراف الدولة رصيف، والشوارع بتكمل لعند الجيران
    b.fill(0, 0, W, 2, 'P').fill(0, H - 2, W, 2, 'P').fill(0, 0, 1, H, 'P').fill(W - 1, 0, 1, H, 'P');
    b.fill(0, 2, W, 2, 'R');
    for (let r = 0; r < ROWS; r++) {
      const y = rowY(r);
      b.fill(1, y, W - 2, 1, 'P').fill(1, y + 7, W - 2, 1, 'P').fill(0, y + 8, W, 2, 'R');
      b.map.marks.push({ type: 'laneH', y: y + 9, x0: 0, x1: W });
    }
    for (let c = 0; c < COLS; c++) {
      const x = blockX(c);
      b.fill(x, 2, 1, H - 4, 'P').fill(x + 22, 2, 1, H - 4, 'P').fill(x + 23, 0, 2, H, 'R');
    }
    plotList(d).forEach((p) => { b.fill(p.x + 3, p.y + 5, 1, 1, 'D'); });

    // ---- الساحة ----
    const px = blockX(PLAZA.c) + 1, py = rowY(PLAZA.r) + 1;
    b.fill(px, py, 21, 6, 'C');
    b.fill(px + 9, py + 2, 3, 2, 'O'); // نافورة
    b.obj('block', px, py - 1, { w: 6, h: 5, wall: 'blue', doorCol: 2, windows: [0, 4], shop: { color: 'orange', icon: 'box', front: 'shutter' }, seed: 30 + d });
    b.obj('scooter', px + 6, py + 4).obj('scooter', px + 7, py + 4);
    b.obj('board', px + 13, py + 4, { label: 'لوحة سكان الحارة', action: 'board' });
    b.obj('board', px + 15, py + 4, { label: 'لوحة الشغل', action: 'jobs' });
    b.obj('car', px + 17, py + 2, { color: 'red' });
    b.map.flagpole = { x: px + 15, y: py + 1 };
    b.obj('bench', px + 10, py + 1);
    tree(px + 20, py + 1); tree(px + 14, py); tree(px + 8, py);
    b.obj('flowers', px + 8, py + 2).obj('flowers', px + 12, py + 2).obj('flowers', px + 8, py + 3).obj('flowers', px + 12, py + 3);
    b.obj('lamp', px + 7, py + 1).obj('lamp', px + 13, py + 1);
    b.map.npcs.push({ id: 'abumaher', name: 'أبو ماهر', x: px + 2.5, y: py + 4.7, static: true, dir: 0, action: 'delivery',
      look: { skin: '#d9a47a', hair: '#3a2b2b', shirt: '#d9772b', pants: '#3a3f4a', beard: '#3a2b2b' } });
    b.map.npcs.push({ id: 'abusami', name: 'أبو سامي', x: px + 19.5, y: py + 4.7, static: true, dir: 0, action: 'vehicles',
      look: { skin: '#e3ad84', hair: '#d9d4cc', shirt: '#2f2f38', pants: '#4a4a5a', beard: '#d9d4cc' } });
    b.map.start = { x: px + 10.5, y: py + 5.6, dir: 0 };
    b.map.office = { x: px + 2.5, y: py + 5.6 };

    // ---- الحديقة والبحيرة ----
    const kx = blockX(PARK.c) + 1, ky = rowY(PARK.r) + 1;
    b.fill(kx + 6, ky + 1, 9, 4, 'O');
    if (biome === 'desert' || biome === 'island') { b.fill(kx + 5, ky, 11, 1, 'A').fill(kx + 5, ky + 5, 11, 1, 'A').fill(kx + 5, ky, 1, 6, 'A').fill(kx + 15, ky, 1, 6, 'A'); }
    b.obj('pier', kx + 9, ky + 5, { label: 'صيد سمك', action: 'fish' });
    [[kx + 1, ky + 1], [kx + 1, ky + 4], [kx + 17, ky + 1], [kx + 17, ky + 4]].forEach(([x, y], i) => b.obj('gbed', x, y, { label: 'اسقي الورد', action: 'garden', bed: i }));
    tree(kx, ky + 2); tree(kx + 4, ky + 2); tree(kx + 16, ky + 2); tree(kx + 20, ky + 2);
    b.obj('bench', kx + 12, ky + 5);
    b.obj('lamp', kx + 5, ky + 5).obj('lamp', kx + 15, ky + 5);
    if (biome === 'snow') b.obj('snowman', kx + 4, ky + 5);
    else if (biome !== 'desert') b.obj('flowers', kx + 3, ky + 5, { v: 1 }).obj('flowers', kx + 17, ky + 3, { v: 2 });
    else b.obj('rock', kx + 3, ky + 5);
    b.map.park = { x: kx + 10, y: ky + 6.6, pier: { x: kx + 9.5, y: ky + 5.6 } };
    // أماكن مهمة للخريطة (إحداثيات بلاطات)
    b.map.pois = [
      { k: 'delivery', x: px + 2.5, y: py + 4.2, label: 'توصيل (أبو ماهر)', icon: 'box', col: '#d9832b', go: { x: px + 2.5, y: py + 5.6 } },
      { k: 'garage', x: px + 19.5, y: py + 4.2, label: 'كراج السيارات', icon: 'car', col: '#c8553f', go: { x: px + 19.5, y: py + 5.6 } },
      { k: 'games', x: px + 14.5, y: py + 4.5, label: 'لوحة الشغل والسباق', icon: 'flag', col: '#f2c14e', go: { x: px + 15.5, y: py + 5.6 } },
      { k: 'fish', x: kx + 10, y: ky + 3, label: 'صيد بالبحيرة', icon: 'water', col: '#4f86d6', go: { x: kx + 10, y: ky + 6.4 } },
      { k: 'garden', x: kx + 2, y: ky + 2.5, label: 'سقاية الورد', icon: 'flower', col: '#e05a8a', go: { x: kx + 2, y: ky + 3 } },
      { k: 'garden', x: kx + 18, y: ky + 2.5, label: 'سقاية الورد', icon: 'flower', col: '#e05a8a', go: { x: kx + 18, y: ky + 3 } },
    ];

    // ---- زينة الشوارع ----
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = blockX(c), y = rowY(r);
      b.obj('lamp', x + 22, y + 7);
      if (rnd() < 0.4) b.obj('car', x + 2 + Math.floor(rnd() * 16), y + 8, { color: ['red', 'blue', 'yellow', 'white'][Math.floor(rnd() * 4)] });
    }
    // ---- القصر وساحته (الدولة 1 بس) ----
    if (d === 1 && L.Palace) {
      const q = palaceSpot(), cy = L.Palace.courtyard(q.x, q.y);
      b.fill(q.x, q.y, 21, 4, 'C');
      cy.ground.forEach(([x, y, w, h, t]) => b.fill(x, y, w, h, t));
      cy.cypress.forEach(([x, y]) => b.obj('cypress', x, y));
      cy.jasmine.forEach(([x, y], i) => b.obj('jasmine', x, y, { v: i }));
      cy.lamps.forEach(([x, y]) => b.obj('lamp', x, y));
      b.map.palace = q;
      b.map.pois.push(palacePoi());
    }
    b.map.plots = plotList(d);
    return b.map;
  }

  L.District = { build, palaceSpot, palacePoi, blockX, rowY, PLAZA, PARK, plotList, COLS, ROWS, PW, PH, W, H, PRICES, LEVEL_NAMES, ELDERS, PLOTS_ALL, plotsFree, MAX_LVL: 10 };
  L.Maps = new Proxy({}, { get: (_, id) => (typeof id === 'string' && /^d\d+$/.test(id) ? () => build(+id.slice(1)) : undefined) });
})(window.LIFE);
