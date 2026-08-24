// Utilidades de fecha centralizadas

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Nombres de mes en español, 1-indexado (posición 0 vacía a propósito
// para poder escribir MESES_ES[mes] con mes 1-12 sin restar 1 cada vez).
// Antes había 5 copias sueltas de este mismo array en distintos archivos.
export const MESES_ES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Retorna hoy en formato YYYY-MM-DD
export const getTodayISO = () => fmt(new Date());

// Formatea cualquier Date a YYYY-MM-DD
export const formatDateISO = (d) => fmt(d);

// Fecha ISO (YYYY-MM-DD) a "DD/MM" — para espacios chicos (tarjetas), sin
// pasar por Date() para no arrastrar corrimientos de huso horario.
export function formatFechaCorta(fechaISO) {
    if (!fechaISO) return '';
    const [, m, d] = fechaISO.split('-');
    if (!m || !d) return fechaISO;
    return `${d}/${m}`;
}

// Lunes de la semana que contiene "fecha" (Date), a las 00:00. Antes esta
// misma cuenta vivía copiada por separado en WeekDatePicker.jsx y MiAgenda.jsx.
export function lunesDeLaSemana(fecha) {
    const d = new Date(fecha);
    const dow = d.getDay(); // 0=domingo, 1=lunes...
    const offset = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Primer dia del mes de una fecha
export const inicioMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Ultimo dia del mes de una fecha
export const finMes = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Extrae la clave "YYYY-MM" de una fecha en formato ISO (YYYY-MM-DD) o DD/MM/YYYY.
// Se usa para agrupar listados por mes sin importar en qué formato venga la fecha.
export function mesKeyDeFecha(f) {
    if (!f) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
        const [, m, y] = f.split('/');
        return `${y}-${m}`;
    }
    return f.slice(0, 7);
}

// "2026-08" -> "Agosto 2026"
export function formatMesLargo(mesKey) {
    if (!mesKey) return '';
    const [y, m] = mesKey.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${MESES_LARGO[idx] || ''} ${y}`.trim();
}

// Estado de garantía respecto de hoy, a partir de una fecha "hasta" (YYYY-MM-DD).
// dias >= 0 y vigente = true  → días que quedan de garantía
// dias <  0 y vigente = false → días que pasaron desde que venció
export function estadoGarantia(fechaHastaISO) {
    if (!fechaHastaISO) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(fechaHastaISO);
    hasta.setHours(0, 0, 0, 0);
    const dias = Math.round((hasta - hoy) / 86400000);
    return { dias, vigente: dias >= 0, hasta: fechaHastaISO };
}

// Convierte periodo rapido (MES, MES_ANT, ANO, CUSTOM, TODO) a rango {desde, hasta}
export function resolverFechas(periodoRapido, mesSelector, desde, hasta) {
    const now = new Date();

    if (periodoRapido === 'TODO') return { desde: '', hasta: '' };
    if (periodoRapido === 'MES') {
        return { desde: fmt(inicioMes(now)), hasta: fmt(finMes(now)) };
    }
    if (periodoRapido === 'MES_ANT') {
        const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { desde: fmt(inicioMes(ant)), hasta: fmt(finMes(ant)) };
    }
    if (periodoRapido === 'ANO') {
        return { desde: `${now.getFullYear()}-01-01`, hasta: `${now.getFullYear()}-12-31` };
    }
    if (periodoRapido === 'CUSTOM') {
        if (mesSelector) {
            const [y, m] = mesSelector.split('-').map(Number);
            const ref = new Date(y, m - 1, 1);
            return { desde: fmt(inicioMes(ref)), hasta: fmt(finMes(ref)) };
        }
        return { desde, hasta };
    }
    return { desde: '', hasta: '' };
}
