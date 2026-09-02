// Notificaciones push (Web Push) — activar/desactivar en este dispositivo.
//
// El backend manda los pushes sin contenido (ver WebPushService.java): acá
// solo hace falta pedir permiso, suscribirse, y avisarle al backend. El
// service worker (public/service-worker.js) es el que muestra la
// notificación cuando llega.

import api from '../services/api';

export function pushSoportado() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// applicationServerKey necesita un Uint8Array, no el string base64url que
// da el backend — conversión estándar del ejemplo de Web Push de Google.
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function estaSuscripto() {
    if (!pushSoportado()) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
}

// Pide permiso (tiene que llamarse desde un click del usuario — los
// navegadores bloquean el pedido si no hay un gesto directo) y suscribe.
export async function activarNotificaciones() {
    if (!pushSoportado()) throw new Error('Este navegador no soporta notificaciones push');

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('Permiso de notificaciones no concedido');

    const { data } = await api.get('/push/vapid-public-key');
    if (!data?.publicKey) throw new Error('El servidor todavía no tiene notificaciones push configuradas');

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    const json = sub.toJSON();
    await api.post('/push/suscribir', { endpoint: json.endpoint, keys: json.keys });
    return true;
}

// Si el navegador ya tiene una suscripcion (se activo antes), la vuelve a
// mandar al backend. Es idempotente (el backend hace upsert por endpoint),
// asi que no rompe nada llamarla de mas — sirve para autocurar el caso en
// que el navegador "cree" que ya esta suscripto pero el backend no llego a
// guardar ese endpoint (o lo perdio), sin tener que borrar datos del sitio.
export async function resincronizar() {
    if (!pushSoportado()) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    const json = sub.toJSON();
    try {
        await api.post('/push/suscribir', { endpoint: json.endpoint, keys: json.keys });
    } catch {
        // No interrumpe el flujo de la campanita si el backend no responde.
    }
    return true;
}

export async function desactivarNotificaciones() {
    if (!pushSoportado()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await api.delete('/push/suscribir', { data: { endpoint } });
}
