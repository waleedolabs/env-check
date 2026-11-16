// حارتنا — مزامنة البيوت. ثلاث طرق تلقائية:
//  1) cloud: سيرفرك على Cloudflare (ضع رابطه بـ window.HARA_API) — للجمهور العام
//  2) claude: قاعدة بيانات صفحة Claude (للتجربة مع ناس عندهم حساب)
//  3) local: على جهازك بس (إذا ما في ولا وحدة)
(function (L) {
  'use strict';
  const LOCAL_KEY = 'hara_houses_local_v1';
  const ID_KEY = 'hara_uid_v1';
  const listeners = [];
  // أي تغيير بالبيوت بيزيد الرقم، فالفهرس بينبنى من جديد بس وقت يلزم
  let ver = 0, idxVer = -1, byPlot = new Map(), byD = new Map();
  class HMap extends Map { set(k, v) { ver++; return super.set(k, v); } delete(k) { ver++; return super.delete(k); } clear() { ver++; return super.clear(); } }
  const houses = new HMap();
  const older = (a, b) => !b || a.t < b.t || (a.t === b.t && a.id < b.id);
  function reindex() {
    if (idxVer === ver) return; idxVer = ver;
    byPlot = new Map(); byD = new Map();
    houses.forEach((h) => {
      if (older(h, byPlot.get(h.plot))) byPlot.set(h.plot, h);
      const d = +String(h.plot).split('-')[0].slice(1);
      if (older(h, byD.get(d))) byD.set(d, h);
    });
  }
  let mode = 'local', db = null, user = null, myId = null, canWrite = true, isOwner = false;
  let pollTimer = null, lastSync = 0;

  // ---------- تنظيف الأسماء (كل الناس رح تشوفها) ----------
  const BAD = ['كس', 'زب', 'شرموط', 'عرص', 'منيك', 'قحب', 'خول', 'كلب', 'حمار', 'fuck', 'shit', 'bitch', 'dick', 'porn', 'sex', 'nigg'];
  function clean(s, max) {
    s = String(s || '').replace(/[\u0000-\u001f<>{}\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 14);
    const flat = s.toLowerCase().replace(/[\s._\-ـ*]/g, '');
    if (BAD.some((w) => flat.includes(w))) return '';
    return s;
  }
  function validHouse(h) {
    if (!h || typeof h !== 'object') return null;
    const lvl = Math.max(1, Math.min(10, h.lvl | 0));
    const name = clean(h.name, 14);
    if (!name || typeof h.plot !== 'string' || !/^d\d+-(\d+|palace)$/.test(h.plot)) return null;
    const look = h.look && typeof h.look === 'object' ? h.look : {};
    const col = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
    return {
      id: String(h.id), name, lvl, plot: h.plot,
      roof: L.Houses.ROOFS[h.roof] ? h.roof : 'red', wall: (h.wall | 0) % 6,
      motto: clean(h.motto, 40), t: +h.t || Date.now(), u: +h.u || +h.t || Date.now(),
      dlv: Math.max(0, h.dlv | 0), veh: ['bike', 'scooter', 'car'].includes(h.veh) ? h.veh : '', cname: clean(h.cname, 18), flag: col(h.flag, ''), cf: (L.Flags && L.Flags.has(h.cf)) ? h.cf : '', deco: Array.isArray(h.deco) ? h.deco.filter((k) => L.Houses.DECO[k]).slice(0, 4) : [],
      look: { skin: col(look.skin, '#e8b98f'), hair: col(look.hair, '#2b2233'), shirt: col(look.shirt, '#5a6b7a'), pants: col(look.pants, '#3a3f4a'), longHair: !!look.longHair, beard: look.beard ? col(look.beard, null) || undefined : undefined },
    };
  }

  function emit() { listeners.forEach((f) => { try { f(houses); } catch (e) { console.error(e); } }); }
  function replaceAll(list) {
    houses.clear();
    list.forEach((raw) => { const h = validHouse(raw); if (h) houses.set(h.id, h); });
    emit();
  }

  function localId() {
    try {
      let id = localStorage.getItem(ID_KEY);
      if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem(ID_KEY, id); }
      return id;
    } catch (e) { return 'u' + Math.random().toString(36).slice(2, 10); }
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; } }
  function writeLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify([...houses.values()])); } catch (e) { /* ممتلئ */ } }

  // ---------- 1) سيرفر Cloudflare ----------
  async function cloudPull() {
    const api = window.HARA_API;
    const r = await fetch(api.replace(/\/$/, '') + '/world?v=' + Math.floor(Date.now() / 90000), { cache: 'default' });
    if (!r.ok) throw new Error('world ' + r.status);
    const j = await r.json();
    lastSync = Date.now();
    const mine = houses.get(myId); // حافظ على بيتي المحلي إذا لسا ما وصل للقطة
    replaceAll(j.houses || []);
    if (mine && !houses.has(myId)) { houses.set(myId, mine); emit(); }
  }

  // ---------- 2) قاعدة بيانات Claude ----------
  function claudeSubscribe() {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 10000);
      db.collection('houses').onSnapshot((snap) => {
        replaceAll(snap.docs.map((d) => Object.assign({}, d.data(), { id: d.id })));
        if (!done && !snap.metadata.fromCache) { done = true; clearTimeout(timer); resolve(true); }
      }, (e) => { console.warn('db', e && e.code); if (!done) { done = true; clearTimeout(timer); resolve(false); } });
    });
  }

  const Net = {
    houses,
    get mode() { return mode; },
    get myId() { return myId; },
    get canWrite() { return canWrite; },
    get isOwner() { return isOwner; },
    get lastSync() { return lastSync; },
    clean,
    onChange(f) { listeners.push(f); },

    async init() {
      // 1) Cloudflare
      if (window.HARA_API) {
        myId = localId();
        try { await cloudPull(); mode = 'cloud'; pollTimer = setInterval(() => { if (!document.hidden) cloudPull().catch(() => {}); }, 90000); return mode; }
        catch (e) { console.warn('cloud off', e); }
      }
      // 2) Claude db (تنتظر شوي، وإذا ما ردّت منكمل محلي)
      if (window.claude && typeof window.claude.use === 'function') {
        try {
          const [d, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
          if (d && u) {
            const id = await u.id();
            if (id) {
              db = d; user = u; myId = id;
              try { isOwner = !!(u.isOwner && await u.isOwner()); } catch (e) { /* */ }
              try { const c = u.can && await u.can('data.write'); if (c === false) canWrite = false; } catch (e) { /* */ }
              mode = 'claude';
              await claudeSubscribe();
              return mode;
            }
          }
        } catch (e) { console.warn('claude db off', e); }
      }
      // 3) محلي
      mode = 'local'; myId = localId();
      replaceAll(readLocal());
      return mode;
    },

    // يحفظ بيتي. يرجّع {ok, reason}
    async saveMine(h) {
      const clean_ = validHouse(Object.assign({}, h, { id: myId, u: Date.now() }));
      if (!clean_) return { ok: false, reason: 'bad' };
      houses.set(myId, clean_); emit();
      const body = Object.assign({}, clean_); delete body.id;
      try {
        if (mode === 'cloud') {
          const r = await fetch(window.HARA_API.replace(/\/$/, '') + '/house', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify(Object.assign({ uid: myId, key: Net.secret() }, body, Net.ownerCode ? { owner: Net.ownerCode } : {})),
          });
          if (r.status === 409) { const j = await r.json().catch(() => ({})); return { ok: false, reason: j.error === 'country' ? 'country' : j.error === 'name' ? 'name' : 'taken', next: j.next }; }
          if (!r.ok) return { ok: false, reason: 'server' };
          const j = await r.json().catch(() => ({}));
          return { ok: true, lvl: j.lvl };
        } else if (mode === 'claude') {
          if (!canWrite) return { ok: false, reason: 'readonly' };
          await db.collection('houses').doc(myId).set(body);
        } else writeLocal();
        return { ok: true };
      } catch (e) {
        if (e && e.code === 'invalid_argument' && mode === 'claude') { canWrite = false; return { ok: false, reason: 'readonly' }; }
        return { ok: false, reason: 'net' };
      }
    },

    // هل الاسم فاضي؟ (أول شي من البيوت اللي عندنا، وبعدين نسأل السيرفر ليكون آخر خبر)
    async nameFree(name) {
      const k = String(name || '').trim().toLowerCase();
      if (!k) return false;
      for (const h of houses.values()) if (h.id !== myId && String(h.name).trim().toLowerCase() === k) return false;
      if (mode === 'cloud') {
        try {
          const r = await fetch(window.HARA_API.replace(/\/$/, '') + '/name?n=' + encodeURIComponent(name) + '&u=' + encodeURIComponent(myId || ''));
          if (r.ok) { const j = await r.json(); return !!j.free; }
        } catch (e) { /* ما في نت: منكمل والسيرفر بيتأكد بعدين */ }
      }
      return true;
    },

    _debugAdd(h) { const v = validHouse(h); if (v) { houses.set(v.id, v); emit(); } },

    // نشيل بيت من النسخة اللي عندنا بس (لما السيرفر يرفضه)
    forget(id) { if (houses.delete(id)) emit(); },
    async remove(id) {
      if (mode === 'claude' && isOwner) { await db.collection('houses').doc(id).delete(); return true; }
      if (mode === 'local') { houses.delete(id); emit(); writeLocal(); return true; }
      return false;
    },

    // مفتاح سري محلي يثبت إنو هاد البيت إلي (للسيرفر)
    secret() {
      try {
        let k = localStorage.getItem('hara_key_v1');
        if (!k) { k = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('hara_key_v1', k); }
        return k;
      } catch (e) { return 'nokey'; }
    },

    // من صاحب الأرض؟ (إذا اثنين حجزوها بنفس الوقت، الأقدم بيربح)
    ownerOf(plotId) { reindex(); return byPlot.get(plotId) || null; },
    // أقدم بيت بالدولة d (من السيرفر)
    firstIn(d) { reindex(); return byD.get(d) || null; },
    // كم دولة فيها ناس
    countries() { reindex(); return byD.size; },
    get ver() { return ver; },
  };
  L.Net = Net;
})(window.LIFE);
