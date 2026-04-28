// NOTE: document.currentScript is null inside async callbacks (load event,
// setTimeout, etc.), so we cannot rely on it here. Read the flag from the
// already-parsed <script> tag in the DOM instead.
(function () {
  if (!("serviceWorker" in navigator)) return;

  function getIsProd() {
    var tag = document.querySelector('script[src="/sw-init.js"]');
    return !!tag && tag.getAttribute("data-is-prod") === "true";
  }

  function register() {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(function (reg) {
        console.log("[SW] registered:", reg.scope);
      })
      .catch(function (err) {
        console.warn("[SW] registration failed:", err);
      });
  }

  function unregisterAndClear() {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    });
    if ("caches" in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) { caches.delete(k); });
      });
    }
  }

  window.addEventListener("load", function () {
    if (getIsProd()) {
      register();
    } else {
      unregisterAndClear();
    }
  });
})();
