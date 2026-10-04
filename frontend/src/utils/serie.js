import api from '../services/api';

// N/S (5-oct-2026): siempre sin espacios y en mayúsculas.
export const limpiarSerie = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();

// Base automática: inicial del técnico + "S" (Service) + fecha ddmmaa.
// Ej: Lucas el 4/10/26 → LS041026. Si ya existe, el backend agrega A, B, C…
export const baseSerie = (nombre, fecha = new Date()) => {
    const inicial = (String(nombre || 'X').normalize('NFD').replace(/[^A-Za-z]/g, '')[0] || 'X').toUpperCase();
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const aa = String(fecha.getFullYear()).slice(-2);
    return `${inicial}S${dd}${mm}${aa}`;
};

// Próximo N/S libre. `ocupados`: series ya usadas en la pantalla y todavía sin guardar.
export async function generarSerie(nombre, ocupados = []) {
    const lista = ocupados.filter(Boolean).join(',');
    const r = await api.get('/equipos/siguiente-serie', { params: { base: baseSerie(nombre), ...(lista ? { ocupados: lista } : {}) } });
    if (!r.data?.serie) throw new Error('sin serie');
    return r.data.serie;
}
