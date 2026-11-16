// LIFE | حياة — الحفظ المحلي (LocalStorage)
(function (L) {
  'use strict';

  function storage() {
    try { const k = '__life_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; }
    catch (e) { return null; }
  }
  const S = storage();
  let memory = null; // بديل إذا كان التخزين غير متاح

  L.Save = {
    available: !!S,
    write(data) {
      data.v = 1; data.savedAt = Date.now();
      const json = JSON.stringify(data);
      if (S) { try { S.setItem(L.SAVE_KEY, json); return true; } catch (e) { /* ممتلئ */ } }
      memory = json; return false;
    },
    read() {
      let json = memory;
      if (S) { try { json = S.getItem(L.SAVE_KEY) || json; } catch (e) { /* تجاهل */ } }
      if (!json) return null;
      try {
        const d = JSON.parse(json);
        if (!d || d.v !== 1 || typeof d.name !== 'string') return null;
        return d;
      } catch (e) { return null; }
    },
    clear() { memory = null; if (S) try { S.removeItem(L.SAVE_KEY); } catch (e) { /* تجاهل */ } },
  };
})(window.LIFE);
