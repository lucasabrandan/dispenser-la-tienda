// Utilidades de fecha centralizadas

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Retorna hoy en formato YYYY-MM-DD
export const getTodayISO = () => fmt(new Date());

// Formatea cualquier Date a YYYY-MM-DD
export const formatDateISO = (d) => fmt(d);

// Primer dia del mes de una fecha
export const inicioMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Ultimo dia del mes de una fecha
export const finMes = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

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
