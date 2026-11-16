// LIFE | حياة — الإدخال: لوحة المفاتيح (WASD والأسهم) + أزرار اللمس
(function (L) {
  'use strict';

  // نستخدم e.code حتى تعمل WASD مع لوحة المفاتيح العربية أيضاً
  const MAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  };
  const ACTION = { KeyE: 'interact', Space: 'interact', Enter: 'interact', NumpadEnter: 'interact',
    Escape: 'menu', KeyI: 'bag', KeyB: 'bag' };

  const held = new Set();
  const pressed = [];
  const touch = { x: 0, y: 0 };

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  }

  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (MAP[e.code]) { held.add(MAP[e.code]); e.preventDefault(); }
    if (ACTION[e.code] && !e.repeat) {
      const ae = document.activeElement;
      if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && ae && ae.tagName === 'BUTTON') return;
      pressed.push(ACTION[e.code]); e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { if (MAP[e.code]) held.delete(MAP[e.code]); });
  window.addEventListener('blur', () => held.clear());

  // ---------- عصا تحكم عائمة: بتطلع مكان ما بتحط إصبعك بالنص اليسار ----------
  function setupTouch() {
    const zone = document.getElementById('joy-zone');
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    const btnA = document.getElementById('btn-a');
    let pid = null, cx = 0, cy = 0;
    const R = () => joy.offsetWidth / 2 || 60;
    function place(x, y) {
      const zr = zone.getBoundingClientRect();
      cx = x; cy = y;
      joy.style.left = (x - zr.left - R()) + 'px'; joy.style.top = (y - zr.top - R()) + 'px';
      joy.style.bottom = 'auto';
    }
    function update(e) {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = R(), len = Math.hypot(dx, dy);
      // إذا الإصبع بعد كتير، العصا بتلحقه
      if (len > max * 1.25) { const k = (len - max * 1.25) / len; place(cx + dx * k, cy + dy * k); dx = e.clientX - cx; dy = e.clientY - cy; }
      const l2 = Math.hypot(dx, dy), c = l2 > max ? max / l2 : 1;
      knob.style.transform = 'translate(' + dx * c + 'px,' + dy * c + 'px)';
      if (l2 > max * 0.18) { touch.x = dx / l2; touch.y = dy / l2; } else { touch.x = 0; touch.y = 0; }
    }
    function end(e) {
      if (e && e.pointerId !== pid) return;
      pid = null; touch.x = 0; touch.y = 0; knob.style.transform = '';
      joy.classList.remove('active'); joy.style.left = ''; joy.style.top = ''; joy.style.bottom = '';
    }
    zone.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      pid = e.pointerId; zone.setPointerCapture(pid);
      joy.classList.add('active'); place(e.clientX, e.clientY); update(e); e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) update(e); });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    btnA.addEventListener('pointerdown', (e) => { pressed.push('interact'); btnA.classList.add('down'); if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) { /* */ } e.preventDefault(); });
    const up = () => btnA.classList.remove('down');
    btnA.addEventListener('pointerup', up); btnA.addEventListener('pointerleave', up); btnA.addEventListener('pointercancel', up);
  }

  L.Input = {
    setupTouch,
    vector() {
      let x = touch.x, y = touch.y;
      if (held.has('left')) x -= 1;
      if (held.has('right')) x += 1;
      if (held.has('up')) y -= 1;
      if (held.has('down')) y += 1;
      return { x: L.clamp(x, -1, 1), y: L.clamp(y, -1, 1) };
    },
    consume() { return pressed.shift(); },
    push(a) { pressed.push(a); },
    clear() { pressed.length = 0; held.clear(); touch.x = 0; touch.y = 0; },
  };
})(window.LIFE);
