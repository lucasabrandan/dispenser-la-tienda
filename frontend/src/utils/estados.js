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
// Opción 1 "color = etapa" (3-oct-2026): 4 familias (ver index.css --etapa-*).
// nivel 1 = primera etapa del grupo (se dibuja con borde), nivel 2 = segunda (relleno).
// sobre = color del texto encima del relleno (el dorado lleva texto oscuro).
const fam = (f) => ({ color: `var(--etapa-${f})`, tx: `var(--etapa-${f}-tx)`, bg: `var(--etapa-${f}-bg)` });
export const ETAPAS = [
    { id: 'PRESUPUESTO', label: 'Presupuesto', familia: 'hacer',  nivel: 1, sobre: '#FFFFFF', ...fam('hacer') },
    { id: 'ASIGNADO',    label: 'Asignado',    familia: 'hacer',  nivel: 2, sobre: '#FFFFFF', ...fam('hacer') },
    { id: 'CAMINO',      label: 'En camino',   familia: 'marcha', nivel: 1, sobre: '#FFFFFF', ...fam('marcha') },
    { id: 'LUGAR',       label: 'En el lugar', familia: 'marcha', nivel: 2, sobre: '#FFFFFF', ...fam('marcha') },
    { id: 'HECHO',       label: 'Hecho',       familia: 'cobrar', nivel: 1, sobre: '#1C1917', ...fam('cobrar') },
    { id: 'FACTURADO',   label: 'Facturado',   familia: 'cobrar', nivel: 2, sobre: '#1C1917', ...fam('cobrar') },
    { id: 'COBRADO',     label: 'Cobrado',     familia: 'listo',  nivel: 2, sobre: '#FFFFFF', ...fam('listo') },
];
export const ALERTA = { color: 'var(--alerta)', tx: 'var(--alerta-tx)', bg: 'var(--alerta-bg)' };
// Estilo de la etiqueta de etapa: borde (nivel 1) o relleno (nivel 2)
export const estiloEtiqueta = (e) => (e?.nivel === 1
    ? { border: `1.5px solid ${e.color}`, color: e.tx, background: 'transparent' }
    : { background: e?.color, color: e?.sobre || '#fff', border: `1.5px solid ${e?.color}` });
const ETAPA_POR_ID = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
// Estado (de servicio o de visita) → etapa
const ETAPA_DE_ESTADO = {
    PRESUPUESTO: 'PRESUPUESTO', APROBADO: 'PRESUPUESTO', EN_PROGRESO: 'ASIGNADO',
    COMPLETADO: 'HECHO', PENDIENTE_FACTURACION: 'HECHO', FACTURADO: 'FACTURADO',
    COBRADO: 'COBRADO', REALIZADO: 'COBRADO',
    PENDIENTE: 'ASIGNADO', EN_CAMINO: 'CAMINO', EN_SITIO: 'LUGAR', COMPLETADA: 'HECHO',
};
export const etapaDeEstado = (estado) => ETAPA_POR_ID[ETAPA_DE_ESTADO[estado]] || null;
export const etapaColor = (estado) => etapaDeEstado(estado)?.color || 'var(--etapa-hacer)';

const humanizar = (estado) => {
    if (!estado) return '';
    const t = String(estado).replace(/_/g, ' ').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
};

export const estadoLabel = (estado) => ESTADO_UI[estado]?.label || humanizar(estado);
export const estadoColor = (estado) => etapaDeEstado(estado)?.color || GRUPO_COLOR[ESTADO_UI[estado]?.grupo] || GRUPO_COLOR.pendiente;

// Color de identidad por técnico (3-oct-2026): se muestra SOLO como círculo con
// iniciales (AvatarTecnico), nunca como punto suelto, así no se confunde con
// las etapas. Tonos fuera de las familias de etapa (sin azul, dorado, verde ni
// rojo), validados entre sí. El admin puede elegir otro en Usuarios.
export const PALETA_TECNICO = ['#7C4DD8', '#0E9A94', '#B8327A', '#D0641A', '#8B5E3C', '#4B5A8C'];
let elegidos = {};   // nombre → color elegido en Usuarios (lo carga App al entrar)
export const setColoresTecnicos = (lista = []) => {
    elegidos = {};
    lista.forEach(t => { if (t?.nombre && t?.color) elegidos[t.nombre] = t.color; });
    // Los que no eligieron color: el próximo libre de la paleta, por orden de alta,
    // así dos técnicos nunca quedan del mismo color por casualidad.
    const usados = new Set(Object.values(elegidos));
    [...lista].sort((a, b) => (a.id || 0) - (b.id || 0)).forEach(t => {
        if (!t?.nombre || elegidos[t.nombre]) return;
        const libre = PALETA_TECNICO.find(c => !usados.has(c)) || PALETA_TECNICO[(t.id || 0) % PALETA_TECNICO.length];
        elegidos[t.nombre] = libre; usados.add(libre);
    });
};
export const colorTecnico = (nombre) => {
    const n = String(nombre || '');
    if (elegidos[n]) return elegidos[n];
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETA_TECNICO[h % 4];
};
export const inicialesDe = (nombre) => String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
