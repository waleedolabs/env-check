// LIFE | حياة — واجهة المستخدم
(function (L) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // عزل المبالغ (مثل 120$) حتى لا تنقلب داخل النص العربي
  const bidi = (s) => String(s).replace(/([+−\-]?\d+)\s?\$/g, '\u2066$1$$\u2069');
  const esc = (s) => bidi(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n) => L.Icons.get(n);

  let dlg = null, typer = null, bannerTimer = null, cardCb = null;

  const UI = {
    esc, bidi,
    init(h) {
      this.h = h;
      $('hud-coin').src = ic('coin');
      $('hud-home').src = ic('home');
      $('hud-people').src = ic('heart');
      document.querySelector('#btn-book img').src = ic('book');
      document.querySelector('#btn-menu img').src = ic('menu', false);
      document.querySelector('#goal img').src = ic('flag');
      document.querySelector('#delivery-chip img').src = ic('box');
      $('btn-book').addEventListener('click', (e) => { e.currentTarget.blur(); h.book(); });
      $('btn-menu').addEventListener('click', (e) => { e.currentTarget.blur(); h.menu(); });
      $('goal-toggle').addEventListener('click', (e) => { e.currentTarget.blur(); $('goal').classList.toggle('collapsed'); });
      $('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal' && !UI._modalLocked) UI.closeModal(); });
      $('dialog').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; e.preventDefault(); UI.advance(); });
      $('card-btn').addEventListener('click', () => UI.closeCard());
      $('card-skip').addEventListener('click', () => { const s = UI._skip; UI._skip = null; $('card').classList.add('hidden'); cardCb = null; s && s(); });
      $('btn-start').addEventListener('click', async () => {
        const raw = $('name-input').value.trim();
        if (raw.startsWith('#') && h.ownerCode) { h.ownerCode(raw.slice(1)); return; } // كود صاحب القصر
        const name = L.Net.clean($('name-input').value, 14);
        if (!name) { $('name-input').value = ''; $('name-input').focus(); $('name-input').placeholder = 'اكتب اسم مناسب أولاً'; return; }
        L.Audio.unlock(); L.Audio.play('click');
        const btn = $('btn-start');
        if (L.Net.nameFree && !(h.isOwner && h.isOwner())) { // صاحب القصر ما بيتفحّص اسمه
          btn.disabled = true;
          const free = await L.Net.nameFree(name).catch(() => true);
          btn.disabled = false;
          if (!free) { $('name-input').value = ''; $('name-input').focus(); $('name-input').placeholder = 'هالاسم مأخوذ، اكتب اسم تاني'; L.Audio.play('bad'); return; }
        }
        h.start(name);
      });
      $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-start').click(); } });
      $('btn-continue').addEventListener('click', () => { L.Audio.unlock(); L.Audio.play('click'); h.continueGame(); });
    },

    showTitle(save) {
      $('title').classList.remove('hidden');
      $('hud').classList.add('hidden');
      $('touch').classList.add('hidden');
      if (save) {
        $('title-continue').classList.remove('hidden');
        $('save-info').textContent = save.name + ' · ' + (save.lvl ? 'بيت مستوى ' + save.lvl : 'لسا بلا بيت') + ' · ' + save.money + ' $';
        $('new-block').classList.add('hidden');
        // اللي عنده بيت ما بيقدر يعمل شخصية جديدة (بيت واحد لكل شخص)
        $('btn-new-toggle').classList.toggle('hidden', !!(save.plot || save.lvl));
      } else {
        $('title-continue').classList.add('hidden');
        $('new-block').classList.remove('hidden');
        $('btn-new-toggle').classList.add('hidden');
      }
    },
    hideTitle(touch) {
      $('title').classList.add('hidden');
      $('hud').classList.remove('hidden');
      if (touch) $('touch').classList.remove('hidden');
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
    },

    // ---------- HUD ----------
    setAvatar(sheet) {
      const c = $('hud-avatar'), x = c.getContext('2d');
      x.imageSmoothingEnabled = false; x.clearRect(0, 0, 16, 22); x.drawImage(sheet, 0, 0, 16, 22, 0, 0, 16, 22);
    },
    _set(id, v, prop) { const k = '_' + id + (prop || ''); if (this[k] !== v) { this[k] = v; if (prop) $(id).style[prop] = v; else $(id).textContent = v; } },
    hud(G) {
      this._set('hud-name', G.s.name);
      this._set('hud-money', String(G.s.money));
      this._set('hud-lvl', G.s.lvl ? 'مستوى ' + G.s.lvl : 'بلا بيت');
      this._set('hud-count', String(G.count));
    },
    goals(g) {
      const key = JSON.stringify(g);
      if (this._goal === key) return;
      this._goal = key;
      $('goal-title').textContent = bidi(g.title);
      $('goal-steps').innerHTML = g.steps.map((s) => '<li class="' + (s.done ? 'done' : '') + (s.warn ? ' warn' : '') + '"><span class="chk"></span>' + esc(s.text) + '</li>').join('');
    },
    deliveryChip(text, urgent) {
      const c = $('delivery-chip');
      if (!text) { c.classList.add('hidden'); return; }
      c.classList.remove('hidden');
      c.classList.toggle('urgent', !!urgent);
      if (this._dc !== text) { c.querySelector('span').textContent = text; this._dc = text; }
    },

    banner(text, icon) {
      const b = $('banner');
      b.querySelector('span').textContent = text;
      b.querySelector('img').src = ic(icon || 'home');
      b.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => b.classList.remove('show'), 2200);
    },
    prompt(label) {
      const p = $('prompt');
      if (label) {
        if (this._prompt !== label) { p.querySelector('span').textContent = label; this._prompt = label; }
        p.classList.add('show');
      } else { p.classList.remove('show'); this._prompt = null; }
      $('btn-a').classList.toggle('ready', !!label);
    },
    toast(text, icon, kind) {
      const t = document.createElement('div');
      t.className = 'toast' + (kind ? ' ' + kind : '');
      if (icon) { const im = document.createElement('img'); im.src = ic(icon); t.appendChild(im); }
      const s = document.createElement('span'); s.textContent = bidi(text); t.appendChild(s);
      $('toasts').appendChild(t);
      while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
      setTimeout(() => t.remove(), 2900);
    },

    // ---------- الحوار والخيارات ----------
    // pages: نص أو مصفوفة. opts: { phone, choices:[{label, fn, disabled}] تظهر بعد آخر صفحة }
    dialog(name, pages, onDone, opts) {
      if (typeof pages === 'string') pages = [pages];
      opts = opts || {};
      dlg = { name, pages, i: 0, onDone, choices: opts.choices || null };
      const d = $('dialog');
      d.classList.remove('hidden');
      d.classList.toggle('phone', !!opts.phone);
      $('dialog-name').textContent = name || '';
      $('dialog-choices').innerHTML = '';
      this._type(pages[0]);
    },
    choice(name, text, choices, opts) {
      this.dialog(name, text, null, Object.assign({}, opts || {}, { choices }));
    },
    _type(text) {
      const el = $('dialog-text');
      clearInterval(typer);
      let n = 0;
      el.textContent = '';
      text = bidi(text);
      dlg.full = text; dlg.typing = true;
      $('dialog-choices').innerHTML = '';
      $('dialog').classList.remove('has-choices');
      typer = setInterval(() => {
        n += 2;
        el.textContent = text.slice(0, n);
        if (n % 6 === 0) L.Audio.play('blip');
        if (n >= text.length) { clearInterval(typer); if (dlg) { dlg.typing = false; this._maybeChoices(); } }
      }, 22);
    },
    _maybeChoices() {
      if (!dlg || !dlg.choices || dlg.i !== dlg.pages.length - 1) return;
      const box = $('dialog-choices');
      box.innerHTML = '';
      $('dialog').classList.add('has-choices');
      dlg.choices.forEach((c, idx) => {
        const b = document.createElement('button');
        b.className = 'btn choice-btn' + (c.ghost ? ' btn-ghost' : '');
        b.innerHTML = '<span class="num">' + (idx + 1) + '</span> ' + esc(c.label);
        if (c.disabled) { b.disabled = true; b.title = c.disabled; }
        b.addEventListener('click', (e) => { e.stopPropagation(); UI.pick(idx); });
        box.appendChild(b);
      });
    },
    pick(idx) {
      if (!dlg || !dlg.choices || dlg.typing || dlg.i !== dlg.pages.length - 1) return false;
      const c = dlg.choices[idx];
      if (!c || c.disabled) return false;
      L.Audio.play('click');
      dlg = null;
      $('dialog').classList.add('hidden');
      c.fn && c.fn();
      return true;
    },
    advance() {
      if (!dlg) return;
      if (dlg.typing) { clearInterval(typer); $('dialog-text').textContent = dlg.full; dlg.typing = false; this._maybeChoices(); return; }
      if (dlg.choices && dlg.i === dlg.pages.length - 1) return; // لازم يختار
      dlg.i++;
      if (dlg.i < dlg.pages.length) { this._type(dlg.pages[dlg.i]); return; }
      const done = dlg.onDone;
      dlg = null;
      $('dialog').classList.add('hidden');
      if (done) done();
    },
    inDialog() { return !!dlg; },

    // ---------- البطاقات (قصة، بداية يوم، ملخص) ----------
    card(o) {
      $('card').classList.remove('hidden');
      $('card').className = o.theme ? 'theme-' + o.theme : '';
      $('card-icon').src = ic(o.icon || 'sun');
      $('card-icon').style.display = o.icon === false ? 'none' : '';
      $('card-sub').textContent = o.sub || '';
      $('card-title').textContent = o.title || '';
      $('card-body').innerHTML = o.html || (o.text ? '<p>' + esc(o.text).replace(/\n/g, '<br>') + '</p>' : '');
      $('card-btn').textContent = o.button || 'متابعة';
      $('card-skip').classList.toggle('hidden', !o.onSkip);
      this._skip = o.onSkip || null;
      cardCb = o.onClose || null;
      if (o.sound) L.Audio.play(o.sound);
    },
    closeCard() {
      if ($('card').classList.contains('hidden')) return;
      L.Audio.play('click');
      $('card').classList.add('hidden');
      $('card-btn').blur();
      const cb = cardCb; cardCb = null;
      cb && cb();
    },
    cardOpen() { return !$('card').classList.contains('hidden'); },

    // ---------- نافذة عامة ----------
    modal(html, opts) {
      opts = opts || {};
      const box = $('modal-box');
      box.className = 'px modal-box' + (opts.cls ? ' ' + opts.cls : '');
      box.innerHTML = html;
      $('modal').classList.remove('hidden');
      this._modalLocked = !!opts.locked;
      box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => UI.closeModal()));
      box.scrollTop = 0;
      return box;
    },
    closeModal() {
      if ($('modal').classList.contains('hidden')) return;
      $('modal').classList.add('hidden');
      const cb = this._onModalClose; this._onModalClose = null;
      cb && cb();
    },
    header(icon, title) {
      return '<header>' + (icon ? '<img src="' + ic(icon) + '" alt="">' : '') + '<h2>' + esc(title) + '</h2><button class="close" data-close aria-label="إغلاق">✕</button></header>';
    },
    modalOpen() {
      return !$('modal').classList.contains('hidden') || !$('work').classList.contains('hidden');
    },

    // متجر عام: items = [{id,name,desc,price,icon}]
    shop(title, icon, items, money, onBuy, note) {
      const box = this.modal(this.header(icon, title) +
        '<p class="modal-sub">معك: <b class="num" id="shop-money">' + money + '</b> $' + (note ? ' · ' + esc(note) : '') + '</p><ul class="item-list">' +
        items.map((it, i) => '<li><img src="' + ic(it.icon) + '" alt=""><div class="item-info"><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span></div>' +
          '<span class="price num">' + it.price + ' $</span><button class="btn" data-i="' + i + '" data-p="' + it.price + '">' + esc(it.verb || 'شراء') + '</button></li>').join('') + '</ul>');
      const refresh = (m) => box.querySelectorAll('button[data-i]').forEach((b) => { b.disabled = m < +b.dataset.p; });
      refresh(money);
      box.querySelectorAll('button[data-i]').forEach((b) => b.addEventListener('click', () => {
        const m = onBuy(items[+b.dataset.i]);
        if (m != null) { box.querySelector('#shop-money').textContent = m; refresh(m); }
      }));
    },

    confirm(text, onYes, yes, no) {
      const box = this.modal('<p class="confirm-text">' + esc(text) + '</p><div class="row"><button class="btn btn-danger" id="cf-yes">' + esc(yes || 'نعم') + '</button><button class="btn btn-ghost" data-close>' + esc(no || 'إلغاء') + '</button></div>', { cls: 'small' });
      box.querySelector('#cf-yes').addEventListener('click', () => { UI.closeModal(); onYes(); });
    },

    fade(mid) {
      const f = $('fade');
      f.classList.add('on');
      UI.fading = true;
      return new Promise((res) => setTimeout(() => { try { mid && mid(); } catch (e) { console.error(e); } setTimeout(() => { f.classList.remove('on'); UI.fading = false; res(); }, 80); }, 260));
    },
  };

  L.UI = UI;
})(window.LIFE);
