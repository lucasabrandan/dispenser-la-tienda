// Service worker — Web Push. No cachea nada de la app (la app sigue
// sirviéndose siempre fresca desde Vercel).
//
// Los pushes que manda el backend van sin contenido (ver WebPushService.java
// — no hay cifrado RFC 8291 implementado), así que acá, al recibir el push,
// se pide el detalle real a la API (título/mensaje/tipo/trabajo) usando el
// JWT que la pestaña ya dejó cacheado en IndexedDB (ver pushTokenCache.js) —
// así la notificación del sistema operativo muestra el texto real en vez de
// uno genérico, y al tocarla se puede llevar directo a la pantalla de ese
// trabajo puntual (ver notificationclick más abajo). Si no hay token
// cacheado o el pedido falla, se degrada sola a la notificación genérica.

const API_BASE = 'https://api.gestiondlt.com/api';
const DB_NAME = 'dlt-auth';
const STORE = 'kv';

function leerTokenCacheado() {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction(STORE, 'readonly');
                    const getReq = tx.objectStore(STORE).get('token');
                    getReq.onsuccess = () => resolve(getReq.result || null);
                    getReq.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
        const generico = {
            title: 'Dispenser La Tienda',
            options: {
                body: 'Tenés una notificación nueva — abrí la app para verla.',
                tag: 'dlt-notificacion',
                renotify: true,
            },
        };

        const token = await leerTokenCacheado();
        if (!token) {
            return self.registration.showNotification(generico.title, generico.options);
        }

        try {
            const res = await fetch(`${API_BASE}/notificaciones`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('no-ok');
            const notifs = await res.json();
            const ultima = Array.isArray(notifs) && notifs.length > 0 ? notifs[0] : null;
            if (!ultima) {
                return self.registration.showNotification(generico.title, generico.options);
            }
            return self.registration.showNotification(ultima.titulo || generico.title, {
                body: ultima.mensaje || generico.options.body,
                tag: 'dlt-notificacion',
                renotify: true,
                data: { referenciaId: ultima.referenciaId, tipo: ultima.tipo },
            });
        } catch {
            return self.registration.showNotification(generico.title, generico.options);
        }
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // '?notif=1' le avisa a la app (ver Layout.jsx) que se abrió desde una
    // notificación push. Si se pudo identificar el trabajo (ver 'push' más
    // arriba), se suma servicioId+tipo para ir directo a esa pantalla en vez
    // de abrir la lista general.
    const { referenciaId, tipo } = event.notification.data || {};
    const urlDestino = referenciaId
        ? `/?notif=1&servicioId=${referenciaId}&tipo=${encodeURIComponent(tipo || '')}`
        : '/?notif=1';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    if ('navigate' in client) {
                        return client.navigate(urlDestino).then((c) => c && c.focus()).catch(() => client.focus());
                    }
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(urlDestino);
        })
    );
});
