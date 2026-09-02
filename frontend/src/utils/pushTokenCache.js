// El JWT vive en localStorage (services/api.js lo lee de ahí para cada
// pedido), pero el service worker no puede leer localStorage — solo
// IndexedDB, que sí comparten la página y el service worker. Este archivo
// espeja el token ahí cada vez que cambia, para que el SW pueda pedir el
// detalle real de una notificación push (ver 'push' en service-worker.js)
// sin depender de que haya una pestaña abierta — así el push puede traer
// un título/mensaje reales en vez del genérico, y saber a qué trabajo
// llevar al tocarlo.
const DB_NAME = 'dlt-auth';
const STORE = 'kv';

function abrirDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function guardarTokenParaSW(token) {
    if (!('indexedDB' in window)) return;
    try {
        const db = await abrirDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            if (token) tx.objectStore(STORE).put(token, 'token');
            else tx.objectStore(STORE).delete('token');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        // No es crítico — si esto falla, el service worker se degrada solo
        // a mostrar la notificación genérica de siempre.
    }
}
