// Sistema de color "cada color, una sola función" (rediseño 29-sep-2026, ver
// mockup "Panel gestiondlt — rediseño"). Todos los estados de la app caen en
// 4 grupos, y cada grupo tiene UN color, que se usa siempre chico (punto o
// texto), nunca como fondo lleno de una tarjeta:
//   pendiente (gris) · camino (azul) · curso (ámbar) · listo (verde)

export const GRUPO_COLOR = {
    pendiente: 'var(--estado-pendiente)',
    camino:    'var(--estado-camino)',
    curso:     'var(--estado-curso)',
    listo:     'var(--estado-listo)',
};

// Servicio (EstadoServicio en el backend) + Orden de visita (EstadoOrden)
export const ESTADO_UI = {
    // Servicio
    PRESUPUESTO:           { label: 'Presupuesto',  grupo: 'pendiente' },
    APROBADO:              { label: 'Aprobado',     grupo: 'pendiente' },
    EN_PROGRESO:           { label: 'En curso',     grupo: 'curso' },
    COMPLETADO:            { label: 'Realizado',    grupo: 'curso' },
    PENDIENTE_FACTURACION: { label: 'Por cobrar',   grupo: 'curso' },
    FACTURADO:             { label: 'Facturado',    grupo: 'curso' },
    COBRADO:               { label: 'Cobrado',      grupo: 'listo' },
    REALIZADO:             { label: 'Cobrado',      grupo: 'listo' },
    CANCELADO:             { label: 'Cancelado',    grupo: 'pendiente' },
    ARCHIVADO:             { label: 'Archivado',    grupo: 'pendiente' },
    // Orden de visita
    PENDIENTE:             { label: 'Pendiente',    grupo: 'pendiente' },
    EN_CAMINO:             { label: 'En camino',    grupo: 'camino' },
    EN_SITIO:              { label: 'En sitio',     grupo: 'curso' },
    COMPLETADA:            { label: 'Completada',   grupo: 'listo' },
    CANCELADA:             { label: 'Cancelada',    grupo: 'pendiente' },
    NO_ATENDIDO:           { label: 'No atendido',  grupo: 'pendiente' },
};

const humanizar = (estado) => {
    if (!estado) return '';
    const t = String(estado).replace(/_/g, ' ').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
};

export const estadoLabel = (estado) => ESTADO_UI[estado]?.label || humanizar(estado);
export const estadoColor = (estado) => GRUPO_COLOR[ESTADO_UI[estado]?.grupo] || GRUPO_COLOR.pendiente;

// Color de identidad por técnico: fijo para cada persona (mismo nombre → mismo
// color en Agenda, Órdenes y Despacho). Es la única "decoración" permitida.
const PALETA_TECNICO = ['#5EC4B6', '#A78BFA', '#F9A8D4', '#93C5FD', '#FCD34D', '#86EFAC'];
export const colorTecnico = (nombre) => {
    const n = String(nombre || '');
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETA_TECNICO[h % PALETA_TECNICO.length];
};
