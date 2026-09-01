export const ESTADO_BORDER = {
    PRESUPUESTO: 'var(--color-brand-amber)', COMPLETADO: 'var(--blue-tx)', PENDIENTE_FACTURACION: 'var(--info-tx)',
    FACTURADO: 'var(--indigo-tx)', COBRADO: 'var(--success-tx)', REALIZADO: 'var(--success-tx)', ARCHIVADO: 'var(--color-muted)',
};

export const ESTADO_LABEL = {
    PRESUPUESTO: 'Pendiente', COMPLETADO: 'Realizado', PENDIENTE_FACTURACION: 'Por cobrar',
    FACTURADO: 'Facturado', COBRADO: 'Cobrado', REALIZADO: 'Cobrado', ARCHIVADO: 'Archivado',
};

// Color de identidad del header de tecnico en la Agenda. Antes tomaba
// ESTADO_COLORS[estadoPredominante(...)] — el estado de un trabajo cualquiera
// terminaba pintando la tarjeta de la persona (ej: la card de "Lucas Brandan"
// se veia celeste o violeta segun que trabajo predominara ese dia). Con el
// sistema "identidad != estado", el header de tecnico usa siempre este mismo
// tono neutro; el estado de cada trabajo se sigue viendo en el borde/label de
// cada AgendaCard individual, que ya era chip-scale y no card-scale.
export const IDENTIDAD_COLOR = { bg: 'bg-chip', text: 'text-ink', avatar: 'bg-muted', bar: 'bg-muted' };

export const MAX_TRABAJOS = 5;

export const calcTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

export const getIniciales = (n) => n.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);

// Agrupa una lista por la clave que devuelva keyFn — mismo criterio que antes
// duplicaban a mano AgendaBlock.jsx y PlanificadorBlock.jsx (agrupar servicios
// por tecnico, o notas por tecnicoNombre). Devuelve un objeto { clave: [items] }.
export function agruparPor(items, keyFn) {
    const grupos = {};
    (items || []).forEach(item => {
        const key = keyFn(item) || 'Sin asignar';
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(item);
    });
    return grupos;
}
