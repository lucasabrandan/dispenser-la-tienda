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
    EN_PROGRESO:           { label: 'Asignado',     grupo: 'curso' },
    COMPLETADO:            { label: 'Hecho',        grupo: 'curso' },
    PENDIENTE_FACTURACION: { label: 'Hecho · a facturar', grupo: 'curso' },
    FACTURADO:             { label: 'Facturado',    grupo: 'curso' },
    COBRADO:               { label: 'Cobrado',      grupo: 'listo' },
    REALIZADO:             { label: 'Cobrado',      grupo: 'listo' },
    CANCELADO:             { label: 'Cancelado',    grupo: 'pendiente' },
    ARCHIVADO:             { label: 'Archivado',    grupo: 'pendiente' },
    // Orden de visita
    PENDIENTE:             { label: 'Asignado',     grupo: 'pendiente' },
    EN_CAMINO:             { label: 'En camino',    grupo: 'camino' },
    EN_SITIO:              { label: 'En el lugar',  grupo: 'curso' },
    COMPLETADA:            { label: 'Hecho',        grupo: 'listo' },
    CANCELADA:             { label: 'Cancelada',    grupo: 'pendiente' },
    NO_ATENDIDO:           { label: 'No atendido',  grupo: 'pendiente' },
};

// Etapas del recorrido de un trabajo (3-oct-2026): las MISMAS palabras y colores en
// Trabajos, Panel, Venta y la pantalla Hoy del técnico.
export const ETAPAS = [
    { id: 'PRESUPUESTO', label: 'Presupuesto', color: '#A8A29E' },
    { id: 'ASIGNADO',    label: 'Asignado',    color: '#A78BFA' },
    { id: 'CAMINO',      label: 'En camino',   color: '#60A5FA' },
    { id: 'LUGAR',       label: 'En el lugar', color: '#F0A500' },
    { id: 'HECHO',       label: 'Hecho',       color: '#2DD4BF' },
    { id: 'FACTURADO',   label: 'Facturado',   color: '#818CF8' },
    { id: 'COBRADO',     label: 'Cobrado',     color: '#4ADE80' },
];
const ETAPA_POR_ID = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
// Estado (de servicio o de visita) → etapa
const ETAPA_DE_ESTADO = {
    PRESUPUESTO: 'PRESUPUESTO', APROBADO: 'PRESUPUESTO', EN_PROGRESO: 'ASIGNADO',
    COMPLETADO: 'HECHO', PENDIENTE_FACTURACION: 'HECHO', FACTURADO: 'FACTURADO',
    COBRADO: 'COBRADO', REALIZADO: 'COBRADO',
    PENDIENTE: 'ASIGNADO', EN_CAMINO: 'CAMINO', EN_SITIO: 'LUGAR', COMPLETADA: 'HECHO',
};
export const etapaDeEstado = (estado) => ETAPA_POR_ID[ETAPA_DE_ESTADO[estado]] || null;
export const etapaColor = (estado) => etapaDeEstado(estado)?.color || '#78716C';

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
