import api, { nuevaClaveIdem } from '../services/api';

// Cola de cambios sin señal (2-oct-2026). El técnico en la calle confirma un
// trabajo o cambia el estado de una visita y no hay conexión: en vez de perderlo
// (antes la app reintentaba ~40s y fallaba), el pedido se guarda en el celular y
// se manda solo cuando vuelve la señal, en el mismo orden en que se hizo.
// Solo para pedidos chicos (JSON); las fotos ya se suben aparte antes de esto.

const KEY = 'pendientes_offline_v1';
const KEY_FALLIDOS = 'pendientes_offline_fallidos_v1';
const listeners = new Set();
let enviando = false;

function leer(k) {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}
function escribir(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage lleno/bloqueado */ }
    listeners.forEach(fn => { try { fn(); } catch {} });
}

export const getPendientes = () => leer(KEY).filter(esMio);
export const getFallidos = () => leer(KEY_FALLIDOS);
export const descartarFallidos = () => escribir(KEY_FALLIDOS, []);
export function suscribirPendientes(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// M18: cada pedido guardado sin señal queda marcado con el usuario que lo hizo. Si en el
// mismo celular entra otro usuario, NO se manda con la sesión del nuevo: espera a que
// vuelva a entrar el que lo cargó.
function usuarioActualId() {
    try { return JSON.parse(localStorage.getItem('auth_usuario') || 'null')?.id ?? null; } catch { return null; }
}
const esMio = (p) => p.usuarioId == null || p.usuarioId === usuarioActualId();

function encolar(method, url, data, descripcion, idem) {
    const cola = leer(KEY);
    // idem: la misma clave del primer intento — si ese sí había llegado, el backend no lo repite
    cola.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, method, url, data, descripcion, idem, usuarioId: usuarioActualId(), creado: new Date().toISOString() });
    escribir(KEY, cola);
}

/**
 * Manda el pedido; si no hay señal (o se cae sin respuesta del servidor), lo
 * guarda en la cola y devuelve { encolado: true } en vez de tirar error.
 * Si el servidor SÍ respondió con error (validación, 500...), lo tira igual que api.
 */
export async function enviarOEncolar(method, url, data, descripcion) {
    const idem = nuevaClaveIdem();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        encolar(method, url, data, descripcion, idem);
        return { encolado: true };
    }
    try {
        const res = await api.request({ method, url, data, _sinReintento: true, _idemKey: idem });
        return { encolado: false, data: res.data };
    } catch (e) {
        if (!e?.response) {
            encolar(method, url, data, descripcion, idem);
            return { encolado: true };
        }
        throw e;
    }
}

/** Intenta mandar todo lo pendiente, en orden. Se corta en el primero que falle por red. */
export async function enviarPendientes() {
    if (enviando) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    enviando = true;
    try {
        let cola = leer(KEY).filter(esMio);
        while (cola.length) {
            const p = cola[0];
            try {
                await api.request({ method: p.method, url: p.url, data: p.data, _sinReintento: true, _idemKey: p.idem || undefined });
            } catch (e) {
                // sigue sin señal, o la sesión no se pudo renovar todavía: se reintenta más tarde
                if (!e?.response || e.response.status === 401) break;
                // El servidor lo rechazó: no tiene sentido reintentarlo para siempre
                escribir(KEY_FALLIDOS, [...leer(KEY_FALLIDOS), { ...p, error: e.response?.data?.mensaje || `HTTP ${e.response.status}` }]);
            }
            const resto = leer(KEY).filter(x => x.id !== p.id);
            escribir(KEY, resto);
            cola = resto.filter(esMio);
        }
    } finally {
        enviando = false;
    }
}

// Disparadores: al volver la señal, al volver a la app y cada 60s
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => enviarPendientes());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) enviarPendientes(); });
    setInterval(() => { if (leer(KEY).length) enviarPendientes(); }, 60000);
    setTimeout(() => enviarPendientes(), 3000);
}
