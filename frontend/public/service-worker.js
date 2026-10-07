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

function abrirKV() {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch { resolve(null); }
    });
}

async function leerKV(clave) {
    const db = await abrirKV();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(clave);
            r.onsuccess = () => resolve(r.result ?? null);
            r.onerror = () => resolve(null);
        } catch { resolve(null); }
    });
}

async function guardarKV(clave, valor) {
    const db = await abrirKV();
    if (!db) return;
    await new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(valor, clave);
            tx.oncomplete = resolve; tx.onerror = resolve;
        } catch { resolve(); }
    });
}

function leerTokenCacheado() { return leerKV('token'); }

// Pedido a la API con el JWT cacheado. Si venció (la app no se abrió en más de
// 24 hs), lo renueva con el refresh token y reintenta (7-oct-2026: antes el
// push quedaba genérico, "Tenés una notificación nueva", sin la tarjeta).
async function apiFetch(path, opts = {}) {
    const pedir = (tk) => fetch(`${API_BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${tk}` } });
    let token = await leerKV('token');
    let res = token ? await pedir(token) : null;
    if (!res || res.status === 401 || res.status === 403) {
        const refresh = await leerKV('refresh');
        if (!refresh) return res;
        const r = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!r.ok) return res;
        const data = await r.json();
        if (!data?.accessToken) return res;
        await guardarKV('token', data.accessToken);
        res = await pedir(data.accessToken);
    }
    return res;
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function cuando(n) {
    const partes = [];
    if (n.fecha) {
        const [a, m, d] = String(n.fecha).split('-').map(Number);
        partes.push(`${DIAS[new Date(a, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`);
    }
    if (n.fecha || n.hora) partes.push(n.hora ? String(n.hora).slice(0, 5) : 'sin horario');
    if (n.tecnicoNombre) partes.push(String(n.tecnicoNombre).split(' ')[0]);
    return partes.join(' · ');
}

// Mismo criterio que esUrgente() de AvisoUrgente.jsx (para los dos roles)
function esUrgentePush(n) {
    const t = String(n.titulo || '');
    return t.startsWith('Contactar al cliente') || t.startsWith('Mensaje de ') || t.startsWith('Visita en pausa') || t.startsWith('Visita reasignada')
        || t.startsWith('✓ El admin avisó') || n.tipo === 'ORDEN_NO_ATENDIDO' || n.tipo === 'ORDEN_ASIGNADA'
        || (n.tipo === 'ORDEN_EN_CAMINO' && n.referenciaId)
        || (n.tipo === 'TRABAJO_ASIGNADO' && t !== 'Horario confirmado');
}

async function mostrarNotif(n) {
    const t = String(n.titulo || '');
    const esDeTrabajo = n.tipo === 'TRABAJO_ASIGNADO';
    const ordenId = n.ordenId || (!esDeTrabajo ? n.referenciaId : null);
    const tag = `dlt-${n.id}`;
    const yaMostrada = (await self.registration.getNotifications({ tag })).length > 0;

    // Cuerpo = mensaje + la "tarjeta" (cliente, día/hora/técnico, dirección)
    const lineas = [
        n.mensaje,
        n.clienteNombre && !t.includes(n.clienteNombre) && !String(n.mensaje || '').includes(n.clienteNombre) ? `👤 ${n.clienteNombre}` : null,
        cuando(n) ? `🕐 ${cuando(n)}` : null,
        n.direccion ? `📍 ${n.direccion}` : null,
        !ordenId && !esDeTrabajo && n.origenNombre ? `de ${n.origenNombre}` : null,
    ].filter(Boolean);

    let actions = [];
    if (ordenId) {
        if (t.startsWith('Contactar al cliente') || n.tipo === 'ORDEN_EN_CAMINO') {
            actions = [{ action: 'avisar', title: '💬 Avisar al cliente' }, { action: 'ver', title: 'Ver visita' }];
        } else if (n.tipo === 'ORDEN_ASIGNADA') {
            actions = [{ action: 'okvoy', title: '✓ Ok, voy' }, { action: 'ver', title: 'Ver' }];
        } else {
            actions = [{ action: 'ver', title: 'Ver visita' }];
        }
    } else if (esDeTrabajo && n.referenciaId) {
        actions = [{ action: 'ver', title: 'Ver trabajo' }];
    }

    return self.registration.showNotification(n.titulo || 'Dispenser La Tienda', {
        body: lineas.join('\n') || 'Tocá para verla en la app.',
        tag,
        renotify: !yaMostrada,
        silent: yaMostrada,
        requireInteraction: esUrgentePush(n), // en compu queda en pantalla hasta que se toca
        icon: '/notif-icon-v3.png',
        badge: '/notif-badge-v2.png',
        actions,
        data: ordenId ? { ordenId, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje }
            : esDeTrabajo ? { referenciaId: n.referenciaId, tipo: n.tipo } : undefined,
    });
}

self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
        const generico = () => self.registration.showNotification('Dispenser La Tienda', {
            body: 'Tenés una notificación nueva — abrí la app para verla.',
            tag: 'dlt-notificacion',
            renotify: true,
        });
        try {
            const res = await apiFetch('/notificaciones');
            if (!res || !res.ok) return generico();
            const notifs = await res.json();
            if (!Array.isArray(notifs) || notifs.length === 0) return generico();
            // Todas las nuevas sin leer (si llegan dos juntas no se pierde ninguna),
            // no solo la última. Se recuerda hasta cuál ya se mostró.
            const ultimoId = Number(await leerKV('pushUltimoId')) || 0;
            let nuevas = ultimoId ? notifs.filter((n) => !n.leida && n.id > ultimoId).slice(0, 4) : [];
            if (nuevas.length === 0) nuevas = [notifs[0]];
            await guardarKV('pushUltimoId', Math.max(ultimoId, ...notifs.map((n) => n.id || 0)));
            for (const n of nuevas.reverse()) await mostrarNotif(n);
        } catch {
            return generico();
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
            try { await apiFetch(`/ordenes/${d.ordenId}/confirmar`, { method: 'PATCH' }); } catch { /* */ }
        })());
        return;
    }
    if (d.ordenId && event.action === 'avisar') {
        event.waitUntil((async () => {
            try {
                const r = await apiFetch(`/ordenes/${d.ordenId}/contacto`);
                const c = await r.json();
                let num = String(c.telefono || '').replace(/\D/g, '');
                if (!num) return abrirVentana(`/?notif=1&ordenId=${d.ordenId}`);
                if (num.startsWith('0')) num = num.slice(1);
                if (!num.startsWith('54')) num = '549' + num;
                const motivo = d.tipo === 'ORDEN_EN_CAMINO' ? 'Voy en camino' : d.mensaje;
                apiFetch(`/ordenes/${d.ordenId}/cliente-avisado`, { method: 'POST' }).catch(() => {});
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
