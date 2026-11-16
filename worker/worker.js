// حارتنا — سيرفر Cloudflare (Worker + D1)
// GET  /world  → كل البيوت (مخزّنة بالكاش 90 ثانية، فآلاف الزوار بيقروا نفس النسخة)
// POST /house  → حفظ/تحديث بيت اللاعب
const CACHE_SECONDS = 90;
const BAD = ['كس', 'زب', 'شرموط', 'عرص', 'منيك', 'قحب', 'خول', 'fuck', 'shit', 'bitch', 'dick', 'porn', 'nigg'];
const ROOFS = ['red', 'blue', 'green', 'purple', 'orange', 'teal'];
const PALACE = 'd1-palace';
const TOTAL = (env) => +(env.COUNTRIES || 1260); // عدد الدول بالكوكب

function clean(s, max) {
  s = String(s || '').replace(/[\u0000-\u001f<>{}\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const flat = s.toLowerCase().replace(/[\s._\-ـ*]/g, '');
  return BAD.some((w) => flat.includes(w)) ? '' : s;
}
const col = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);

function cors(origin, env) {
  const allow = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': allow === '*' ? '*' : (allow.split(',').includes(origin) ? origin : allow.split(',')[0]),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, headers) });

// نسخة جاهزة من كل البيوت: بتنحفظ بصف واحد، وما بتنبنى من جديد إلا إذا تغيّر شي (ومرة كل دقيقة على الأكتر).
// هيك كل زيارة بتقرا صفّين بس من قاعدة البيانات بدل آلاف البيوت.
let mem = null; // نسخة بذاكرة السيرفر نفسه (30 ثانية)
async function worldBody(env) {
  const now = Date.now();
  if (mem && now - mem.at < 30000) return mem.body;
  const ver = await env.DB.prepare("SELECT v FROM meta WHERE k = 'ver'").first();
  const v = ver ? ver.v : 0;
  let snap = await env.DB.prepare("SELECT v, at, body FROM snap WHERE k = 'world'").first();
  if (!snap || (snap.v !== v && now - snap.at > 60000)) {
    const { results } = await env.DB.prepare('SELECT uid AS id, name, lvl, plot, roof, wall, motto, look, t, u, dlv, veh, cname, flag, cf, deco FROM houses').all();
    const houses = results.map((r) => Object.assign({}, r, { look: JSON.parse(r.look || '{}'), deco: JSON.parse(r.deco || '[]') }));
    const body = JSON.stringify({ houses, at: now });
    await env.DB.prepare("INSERT INTO snap (k, v, at, body) VALUES ('world', ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at, body = excluded.body").bind(v, now, body).run();
    snap = { v, at: now, body };
  }
  mem = { at: now, body: snap.body };
  return snap.body;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const h = cors(req.headers.get('origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });

    if (req.method === 'GET' && url.pathname === '/world') {
      // كاش إضافي (بيشتغل على دومين خاص). على workers.dev الكاش الأساسي هو [cache] بملف wrangler.toml
      const cache = caches.default;
      const key = new Request(url.origin + '/world' + url.search);
      let res = await cache.match(key);
      if (!res) {
        const body = await worldBody(env);
        res = new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + CACHE_SECONDS } });
        ctx.waitUntil(cache.put(key, res.clone()));
      }
      const out = new Response(res.body, res);
      Object.entries(h).forEach(([k, v]) => out.headers.set(k, v));
      return out;
    }

    // هل الاسم فاضي؟ (بيسأل اللعبة قبل ما يفوت اللاعب)
    if (req.method === 'GET' && url.pathname === '/name') {
      const n = clean(url.searchParams.get('n'), 14), u = String(url.searchParams.get('u') || '').slice(0, 40);
      if (!n) return json({ free: false }, 200, h);
      const hit = await env.DB.prepare('SELECT uid FROM houses WHERE name = ? COLLATE NOCASE AND uid != ? LIMIT 1').bind(n, u).first();
      return json({ free: !hit }, 200, h);
    }

    if (req.method === 'POST' && url.pathname === '/house') {
      let b;
      try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400, h); }
      const uid = String(b.uid || '').slice(0, 40), key = String(b.key || '').slice(0, 64);
      const name = clean(b.name, 14), motto = clean(b.motto, 40);
      const plot = String(b.plot || '');
      let lvl = Math.max(1, Math.min(10, b.lvl | 0));
      if (!/^u[a-z0-9]{6,30}$/.test(uid) || key.length < 16 || !name || !/^d\d{1,4}-(\d{1,3}|palace)$/.test(plot)) return json({ error: 'invalid' }, 400, h);
      const now = Date.now();
      const d = +plot.slice(1).split('-')[0];
      const isPalace = plot === PALACE;
      // القصر: بس صاحب الكود السري (OWNER_CODE)
      if (isPalace && (!env.OWNER_CODE || String(b.owner || '') !== env.OWNER_CODE)) return json({ error: 'not owner' }, 403, h);
      if (!isPalace && d === 1) return json({ error: 'country' }, 409, h); // دولة القصر محجوزة
      if (d < 1 || d > TOTAL(env)) return json({ error: 'invalid' }, 400, h);
      const dup = await env.DB.prepare("SELECT uid FROM houses WHERE name = ? COLLATE NOCASE AND uid != ? AND (? = 0 OR plot != 'd1-palace') LIMIT 1").bind(name, uid, isPalace ? 1 : 0).first();
      if (dup) return json({ error: 'name' }, 409, h); // الاسم مأخوذ، لازم يغيّره
      const old = await env.DB.prepare('SELECT key, lvl, plot, t, u FROM houses WHERE uid = ?').bind(uid).first();
      if (old && old.key !== key) return json({ error: 'not yours' }, 403, h);
      // حماية بسيطة من الغش: المستوى بيطلع درجة وحدة كل مرة، وبين ترقية وترقية دقيقة على الأقل
      if (isPalace) lvl = 10;
      else if (old && old.plot === plot) {
        if (lvl > old.lvl + 1) lvl = old.lvl + 1;
        if (lvl > old.lvl && now - old.u < 60000) lvl = old.lvl;
      } else lvl = 1;
      if (isPalace) await env.DB.prepare('DELETE FROM houses WHERE plot = ? AND uid != ?').bind(plot, uid).run(); // صاحب القصر غيّر جهازه
      const taken = await env.DB.prepare('SELECT uid FROM houses WHERE plot = ? AND uid != ?').bind(plot, uid).first();
      if (taken) return json({ error: 'taken' }, 409, h);
      // توزيع الرؤساء: طالما في دول فاضية، كل واحد جديد لازم يبني بدولة ما فيها حدا
      const oldD = old ? +old.plot.slice(1).split('-')[0] : 0;
      if (!isPalace && d !== oldD) {
        const claim = await env.DB.prepare('INSERT OR IGNORE INTO countries (d, uid, t) VALUES (?, ?, ?)').bind(d, uid, now).run();
        if (claim.meta && claim.meta.changes) {
          await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('countries', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1").run();
        } else {
          const c = await env.DB.prepare('SELECT uid FROM countries WHERE d = ?').bind(d).first();
          const m = await env.DB.prepare("SELECT v FROM meta WHERE k = 'countries'").first();
          const full = (m ? m.v : 0) >= TOTAL(env) - 1; // الدولة 1 للقصر
          if (c && c.uid !== uid && !full) return json({ error: 'country' }, 409, h);
        }
      }
      const look = b.look || {};
      const lookJson = JSON.stringify({ skin: col(look.skin, '#e8b98f'), hair: col(look.hair, '#2b2233'), shirt: col(look.shirt, '#5a6b7a'), pants: col(look.pants, '#3a3f4a'), longHair: !!look.longHair });
      const roof = ROOFS.includes(b.roof) ? b.roof : 'red';
      const wall = Math.max(0, Math.min(5, b.wall | 0));
      const dlv = Math.max(0, Math.min(100000, b.dlv | 0));
      const veh = ['bike', 'scooter', 'car'].includes(b.veh) ? b.veh : '';
      const cname = clean(b.cname, 18), flag = col(b.flag, '');
      const CF = ['sy','ps','sa','iq','jo','lb','eg','kw','ae','qa','bh','om','ye','ly','tn','dz','ma','mr','sd','so','dj','km'];
      const cf = CF.includes(b.cf) ? b.cf : '';
      const DECO = ['none', 'tree', 'pine', 'palm', 'cactus', 'flowers', 'bush', 'lamp', 'rock', 'snowman', 'mailbox'];
      const deco = JSON.stringify(Array.isArray(b.deco) ? b.deco.filter((k) => DECO.includes(k)).slice(0, 4) : []);
      // وقت البناء من السيرفر (مو من جهاز اللاعب)، والقصر وقته صفر فصاحبه رئيس الدولة 1 للأبد
      const t = isPalace ? 0 : (old && old.plot === plot ? old.t : now);
      try {
        await env.DB.prepare(`INSERT INTO houses (uid, key, name, lvl, plot, roof, wall, motto, look, t, u, dlv, veh, cname, flag, deco, d, cf)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?16, ?10, ?11, ?12, ?13, ?14, ?15, ?17, ?18)
          ON CONFLICT(uid) DO UPDATE SET name = ?3, lvl = ?4, plot = ?5, roof = ?6, wall = ?7, motto = ?8, look = ?9, t = ?16, u = ?10, dlv = ?11, veh = ?12, cname = ?13, flag = ?14, deco = ?15, d = ?17, cf = ?18`)
          .bind(uid, key, name, lvl, plot, roof, wall, motto, lookJson, now, dlv, veh, cname, flag, deco, t, d, cf).run();
      } catch (e) {
        if (String(e).includes('UNIQUE')) return json({ error: String(e).includes('name') ? 'name' : 'taken' }, 409, h);
        throw e;
      }
      await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('ver', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1").run(); // في تغيير
      return json({ ok: true, lvl }, 200, h);
    }

    return json({ error: 'not found' }, 404, h);
  },
};
