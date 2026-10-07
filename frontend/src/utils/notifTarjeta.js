// Datos de la "tarjeta" de una notificación (7-oct-2026): cliente, día/hora,
// técnico y dirección de la visita o trabajo al que apunta. Los manda el
// backend (NotificacionDTO) y los usan la campanita, el aviso urgente y el push.
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function cuandoDeNotif(n) {
    if (!n) return '';
    const partes = [];
    if (n.fecha) {
        const [a, m, d] = String(n.fecha).split('-').map(Number);
        const f = new Date(a, m - 1, d);
        partes.push(`${DIAS[f.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`);
    }
    if (n.fecha || n.hora) partes.push(n.hora ? String(n.hora).slice(0, 5) : 'sin horario');
    if (n.tecnicoNombre) partes.push(String(n.tecnicoNombre).split(' ')[0]);
    return partes.join(' · ');
}

export function tieneTarjeta(n) {
    return !!(n && (n.fecha || n.hora || n.direccion || n.clienteNombre));
}
