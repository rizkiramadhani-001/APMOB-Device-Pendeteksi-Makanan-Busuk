export const executeNativePush = (key, title, body, nativePushTimes) => {
  const lastSent = nativePushTimes.current.get(key) || 0;
  const now = Date.now();
  
  if (now - lastSent > 60000) {
    if ("Notification" in window && Notification.permission === "granted") {
      // Android Chrome (and newer mobile browsers) strictly block the direct 'new Notification()' constructor.
      // They REQUIRE displaying notifications via an active Service Worker registration.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, {
              body,
              icon: '/logo192.png',
              badge: '/logo192.png',
              vibrate: [200, 100, 200],
              tag: key // Avoid duplicates
            });
          })
          .catch((err) => {
            // Fallback for desktop/older browsers if Service Worker is unavailable
            try {
              new Notification(title, { body, icon: '/logo192.png' });
            } catch (e) {
              console.warn("Direct Notification failed:", e);
            }
          });
      } else {
        // Default desktop fallback
        try {
          new Notification(title, { body, icon: '/logo192.png' });
        } catch (e) {
          console.warn("Direct Notification failed:", e);
        }
      }
      
      nativePushTimes.current.set(key, now);
    }
  }
};
