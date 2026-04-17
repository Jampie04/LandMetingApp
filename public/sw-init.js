if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    const script = document.currentScript;
    const isProd = script && script.getAttribute("data-is-prod") === "true";

    if (isProd) {
      navigator.serviceWorker.register("/sw.js");
    } else {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(function(registration) {
          registration.unregister();
        });
      });

      if ("caches" in window) {
        caches.keys().then(function(keys) {
          keys.forEach(function(key) {
            caches.delete(key);
          });
        });
      }
    }
  });
}
