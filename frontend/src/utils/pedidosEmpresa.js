// Portal Empresa (7-oct-2026): textos y colores compartidos entre el portal de
// la empresa y la bandeja de pedidos del admin.
export const ESTADOS_PEDIDO = {
    NUEVO:       { label: 'Recibido',        color: '#2563EB', paso: 0 },
    AGENDADO:    { label: 'Agendado',        color: '#7C4DD8', paso: 1 },
    EN_CAMINO:   { label: 'En camino',       color: '#D97706', paso: 2 },
    EN_CURSO:    { label: 'Trabajando',      color: '#D97706', paso: 2 },
    HECHO:       { label: 'Hecho',           color: '#16A34A', paso: 3 },
    NO_ATENDIDO: { label: 'A reprogramar',   color: '#C9341F', paso: 1 },
    PAUSADO:     { label: 'En pausa',        color: '#6B7280', paso: 1 },
    CANCELADO:   { label: 'Cancelado',       color: '#6B7280', paso: -1 },
};

export const PASOS_PEDIDO = ['Recibido', 'Agendado', 'En camino', 'Hecho'];

export const MOTIVOS_PEDIDO = [
    'No enfría', 'No calienta', 'Pierde agua', 'No enciende',
    'Mantenimiento / limpieza', 'Instalación', 'Retiro', 'Otro',
];

export const estadoDe = (p) => ESTADOS_PEDIDO[p?.estado] || ESTADOS_PEDIDO.NUEVO;

export const esAbierto = (p) => !['HECHO', 'CANCELADO'].includes(p?.estado);

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function cuandoPedido(p) {
    // Asignado a un técnico que todavía tiene que elegir el día (carga guiada, 10-oct-2026)
    if (!p?.fecha) return p?.estado === 'AGENDADO' && p?.tecnicoNombre ? `Día a coordinar · ${p.tecnicoNombre}` : '';
    const [a, m, d] = String(p.fecha).split('-').map(Number);
    const f = new Date(a, m - 1, d);
    const hora = p.hora ? (String(p.hora).includes(':') ? String(p.hora).slice(0, 5) : String(p.hora).toLowerCase()) : '';
    return [`${DIAS[f.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`, hora, p.tecnicoNombre].filter(Boolean).join(' · ');
}

export const linkMaps = (dir) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir || '')}`;

export function haceCuanto(iso) {
    if (!iso) return '';
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// "Pedido nuevo #12 · …", "Comentario en pedido #12", "Pedido #12 agendado"…
export function pedidoIdDeNotif(n) {
    const m = String(n?.titulo || '').match(/[Pp]edido[^#]*#(\d+)/);
    return m ? Number(m[1]) : null;
}
