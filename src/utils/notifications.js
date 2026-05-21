export const executeNativePush = (key, title, body, nativePushTimes) => {
  const lastSent = nativePushTimes.current.get(key) || 0;
  const now = Date.now();
  if (now - lastSent > 60000) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/logo192.png' });
      nativePushTimes.current.set(key, now);
    }
  }
};
