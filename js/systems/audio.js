// LIFE | حياة — مؤثرات صوتية مولّدة (بدون ملفات صوت)
(function (L) {
  'use strict';
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('life_muted') === '1'; } catch (e) { /* تجاهل */ }

  function ac() {
    if (muted) return null;
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try { ctx = new A(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slide) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const SFX = {
    click() { tone(660, 0.05, 'square', 0.03); },
    blip() { tone(880, 0.03, 'square', 0.015); },
    coin() { tone(988, 0.08, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
    spend() { tone(520, 0.08, 'triangle', 0.06); tone(390, 0.12, 'triangle', 0.05, 0.06); },
    door() { tone(180, 0.12, 'triangle', 0.08, 0, 120); tone(140, 0.1, 'triangle', 0.06, 0.1); },
    good() { tone(523, 0.08, 'square', 0.04); tone(659, 0.08, 'square', 0.04, 0.08); tone(784, 0.16, 'square', 0.04, 0.16); },
    bad() { tone(300, 0.14, 'sawtooth', 0.04, 0, 200); tone(200, 0.2, 'sawtooth', 0.04, 0.12, 140); },
    ring() { for (let i = 0; i < 3; i++) { tone(1200, 0.08, 'square', 0.035, i * 0.22); tone(950, 0.08, 'square', 0.035, i * 0.22 + 0.09); } },
    day() { tone(392, 0.15, 'triangle', 0.06); tone(523, 0.15, 'triangle', 0.06, 0.15); tone(659, 0.3, 'triangle', 0.06, 0.3); },
    end() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, i * 0.18)); },
  };

  L.Audio = {
    play(name) { try { SFX[name] && SFX[name](); } catch (e) { /* تجاهل */ } },
    unlock() { ac(); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('life_muted', muted ? '1' : '0'); } catch (e) { /* تجاهل */ }
      return muted;
    },
  };
})(window.LIFE);
