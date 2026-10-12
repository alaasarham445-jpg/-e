(function () {
  if (!window.indexedDB || !window.localStorage) return;
  var DB = 'pwa-backup', ST = 'ls', ready = false, timer = null;
  function open() {
    return new Promise(function (ok, no) {
      var q = indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { q.result.createObjectStore(ST); };
      q.onsuccess = function () { ok(q.result); };
      q.onerror = function () { no(q.error); };
    });
  }
  function done(tx) {
    return new Promise(function (ok, no) { tx.oncomplete = ok; tx.onerror = tx.onabort = function () { no(tx.error); }; });
  }
  function backup() {
    return open().then(function (db) {
      var tx = db.transaction(ST, 'readwrite'), st = tx.objectStore(ST);
      st.clear();
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); st.put(localStorage.getItem(k), k); }
      return done(tx).then(function () { db.close(); });
    });
  }
  function sched() {
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(function () { backup().catch(function () {}); }, 800);
  }
  function restore() {
    return open().then(function (db) {
      return new Promise(function (ok, no) {
        var st = db.transaction(ST).objectStore(ST), keys = st.getAllKeys(), vals = st.getAll();
        vals.onsuccess = function () {
          var n = 0;
          keys.result.forEach(function (k, i) {
            if (localStorage.getItem(k) === null) { localStorage.setItem(k, vals.result[i]); n++; }
          });
          db.close(); ok(n);
        };
        vals.onerror = function () { no(vals.error); };
      });
    });
  }
  var _set = Storage.prototype.setItem, _rem = Storage.prototype.removeItem, _clr = Storage.prototype.clear;
  Storage.prototype.setItem = function () { _set.apply(this, arguments); if (this === localStorage) sched(); };
  Storage.prototype.removeItem = function () { _rem.apply(this, arguments); if (this === localStorage) sched(); };
  Storage.prototype.clear = function () { _clr.apply(this, arguments); if (this === localStorage) sched(); };
  function persist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
  }
  persist();
  ['click', 'touchend'].forEach(function (ev) { addEventListener(ev, persist, { once: true, passive: true }); });
  restore().then(function (n) {
    ready = true;
    if (n > 0 && !sessionStorage.getItem('pwa-restored')) { sessionStorage.setItem('pwa-restored', '1'); location.reload(); return; }
    return backup();
  }).catch(function () { ready = true; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && ready) backup().catch(function () {}); });
  addEventListener('pagehide', function () { if (ready) backup().catch(function () {}); });
})();
