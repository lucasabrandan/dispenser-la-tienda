// Service worker mínimo — solo para Web Push. No cachea nada de la app
// (la app sigue sirviéndose siempre fresca desde Vercel).
//
// Los pushes que manda el backend van sin contenido (ver WebPushService.java
// en el backend) — acá se muestra una notificación genérica; el detalle real
// se ve al abrir la app (la campanita ya lo resuelve).

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const title = 'Dispenser La Tienda';
    const options = {
        body: 'Tenés una notificación nueva — abrí la app para verla.',
        tag: 'dlt-notificacion',
        renotify: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow('/');
        })
    );
});
