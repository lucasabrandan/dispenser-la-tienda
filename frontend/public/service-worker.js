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
            // TRABAJO_ASIGNADO apunta a un Servicio; el resto con referencia, a una
            // visita (OrdenVisita). Desde el 5-oct-2026 la notificación de una visita
            // trae los datos de la tarjeta (cliente, día/hora, técnico, dirección) y
            // botones (Android/compu): "Ver visita", "Ok, voy" o "Avisar al cliente".
            const esDeTrabajo = ultima.tipo === 'TRABAJO_ASIGNADO';
            const esDeVisita = !esDeTrabajo && !!ultima.referenciaId;
            const tag = `dlt-${ultima.id ?? 'notificacion'}`;
            const yaMostrada = (await self.registration.getNotifications({ tag })).length > 0;

            let body = ultima.mensaje || generico.options.body;
            let actions = [];
            if (esDeVisita) {
                try {
                    const r = await fetch(`${API_BASE}/ordenes/${ultima.referenciaId}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (r.ok) {
                        const o = await r.json();
                        const hora = o.horaEstimada ? String(o.horaEstimada).slice(0, 5) : 'sin horario';
                        const fecha = o.fechaProgramada ? o.fechaProgramada.split('-').reverse().slice(0, 2).join('/') : '';
                        const lineas = [
                            ultima.mensaje,
                            `🕐 ${fecha} · ${hora}${o.tecnicoNombre ? ' · ' + o.tecnicoNombre.split(' ')[0] : ''}`,
                            o.direccion ? `📍 ${o.direccion}` : null,
                        ].filter(Boolean);
                        body = lineas.join('\n');
                    }
                } catch { /* sin datos extra: queda el mensaje */ }
                const t = String(ultima.titulo || '');
                if (t.startsWith('Contactar al cliente') || ultima.tipo === 'ORDEN_EN_CAMINO') {
                    actions = [{ action: 'avisar', title: '💬 Avisar al cliente' }, { action: 'ver', title: 'Ver visita' }];
                } else if (ultima.tipo === 'ORDEN_ASIGNADA') {
                    actions = [{ action: 'okvoy', title: '✓ Ok, voy' }, { action: 'ver', title: 'Ver' }];
                } else {
                    actions = [{ action: 'ver', title: 'Ver visita' }];
                }
            }
            const urgente = esDeVisita && (String(ultima.titulo || '').startsWith('Contactar al cliente')
                || ['ORDEN_NO_ATENDIDO', 'ORDEN_ASIGNADA'].includes(ultima.tipo));
            return self.registration.showNotification(ultima.titulo || generico.title, {
                body,
                tag,
                renotify: !yaMostrada,
                silent: yaMostrada,
                requireInteraction: urgente, // en compu queda en pantalla hasta que se toca
                icon: '/logo192.png',
                badge: '/logo192.png',
                actions,
                data: esDeTrabajo ? { referenciaId: ultima.referenciaId, tipo: ultima.tipo }
                    : esDeVisita ? { ordenId: ultima.referenciaId, tipo: ultima.tipo, titulo: ultima.titulo, mensaje: ultima.mensaje } : undefined,
            });
        } catch {
            return self.registration.showNotification(generico.title, generico.options);
        }
    })());
});

// Mensaje de WhatsApp para el cliente (mismo texto que utils/contactoCliente.js)
function mensajeCliente(motivo, o) {
    const quien = (o.tecnicoNombre || 'el técnico').split(' ')[0];
    const hola = `Hola${o.clienteNombre ? ` ${o.clienteNombre}` : ''}, te escribimos de Dispenser La Tienda.`;
    const m = String(motivo || '');
    if (m.startsWith('Me demoro')) return `${hola} ${quien} viene un poco demorado, llega en breve. Disculpá la demora.`;
    if (m.startsWith('Llegué y no hay nadie')) return `${hola} ${quien} ya está en el lugar y no encuentra a nadie. ¿Nos avisás si lo pueden atender?`;
    if (m.startsWith('No me atiende')) return `${hola} ${quien} está intentando comunicarse por la visita de hoy. ¿Nos confirmás si lo pueden atender?`;
    if (m.startsWith('Otro')) return `${hola} Te contactamos por la visita de hoy.`;
    return `${hola} ${quien} ya está en camino para la visita.`;
}

async function abrirVentana(url) {
    const lista = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of lista) {
        if ('focus' in client) {
            if ('navigate' in client) return client.navigate(url).then((c) => c && c.focus()).catch(() => client.focus());
            return client.focus();
        }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const d = event.notification.data || {};
    // Botones de la notificación de una visita (5-oct-2026)
    if (d.ordenId && event.action === 'okvoy') {
        event.waitUntil((async () => {
            const token = await leerTokenCacheado();
            try { await fetch(`${API_BASE}/ordenes/${d.ordenId}/confirmar`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }); } catch { /* */ }
        })());
        return;
    }
    if (d.ordenId && event.action === 'avisar') {
        event.waitUntil((async () => {
            const token = await leerTokenCacheado();
            try {
                const r = await fetch(`${API_BASE}/ordenes/${d.ordenId}/contacto`, { headers: { Authorization: `Bearer ${token}` } });
                const c = await r.json();
                let num = String(c.telefono || '').replace(/\D/g, '');
                if (!num) return abrirVentana(`/?notif=1&ordenId=${d.ordenId}`);
                if (num.startsWith('0')) num = num.slice(1);
                if (!num.startsWith('54')) num = '549' + num;
                const motivo = d.tipo === 'ORDEN_EN_CAMINO' ? 'Voy en camino' : d.mensaje;
                fetch(`${API_BASE}/ordenes/${d.ordenId}/cliente-avisado`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                return self.clients.openWindow(`https://wa.me/${num}?text=${encodeURIComponent(mensajeCliente(motivo, c))}`);
            } catch { return abrirVentana(`/?notif=1&ordenId=${d.ordenId}`); }
        })());
        return;
    }
    if (d.ordenId) { event.waitUntil(abrirVentana(`/?notif=1&ordenId=${d.ordenId}`)); return; }
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
