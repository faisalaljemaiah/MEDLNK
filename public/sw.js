// Push notification service worker. Deliberately minimal — no offline
// caching or fetch interception, since Capacitor's WebView already loads the
// live site directly (see AGENTS.md / capacitor.config.ts) and a caching SW
// here would fight that, not help it. This exists for exactly two events.

self.addEventListener("push", (event) => {
  let data = { title: "Asyashare", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Not JSON — fall back to the defaults above rather than dropping it.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clientsList.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
