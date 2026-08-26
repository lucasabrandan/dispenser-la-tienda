// Colores por estado para headers de tecnico y cards — usa las variables CSS
// semanticas de index.css (mismo criterio que ya adoptó ServicioCard.jsx) en
// vez de hex sueltos por tema: un solo valor por estado, ya theme-aware.
export const ESTADO_COLORS = {
    PRESUPUESTO:           { bg: 'bg-[var(--warning-bg)]', text: 'text-brand-amber',        avatar: 'bg-brand-amber',        bar: 'bg-brand-amber' },
    COMPLETADO:            { bg: 'bg-[var(--blue-bg)]',    text: 'text-[var(--blue-tx)]',    avatar: 'bg-[var(--blue-tx)]',    bar: 'bg-[var(--blue-tx)]' },
    PENDIENTE_FACTURACION: { bg: 'bg-[var(--info-bg)]',    text: 'text-[var(--info-tx)]',    avatar: 'bg-[var(--info-tx)]',    bar: 'bg-[var(--info-tx)]' },
    COBRADO:               { bg: 'bg-[var(--success-bg)]', text: 'text-[var(--success-tx)]', avatar: 'bg-[var(--success-tx)]', bar: 'bg-[var(--success-tx)]' },
    REALIZADO:             { bg: 'bg-[var(--success-bg)]', text: 'text-[var(--success-tx)]', avatar: 'bg-[var(--success-tx)]', bar: 'bg-[var(--success-tx)]' },
    ARCHIVADO:             { bg: 'bg-muted/10',            text: 'text-muted',               avatar: 'bg-muted',               bar: 'bg-muted' },
};

export const ESTADO_BORDER = {
    PRESUPUESTO: 'var(--color-brand-amber)', COMPLETADO: 'var(--blue-tx)', PENDIENTE_FACTURACION: 'var(--info-tx)',
    FACTURADO: 'var(--indigo-tx)', COBRADO: 'var(--success-tx)', REALIZADO: 'var(--success-tx)', ARCHIVADO: 'var(--color-muted)',
};

export const ESTADO_LABEL = {
    PRESUPUESTO: 'Pendiente', COMPLETADO: 'Realizado', PENDIENTE_FACTURACION: 'Por cobrar',
    FACTURADO: 'Facturado', COBRADO: 'Cobrado', REALIZADO: 'Cobrado', ARCHIVADO: 'Archivado',
};

export const DEFAULT_COLOR = ESTADO_COLORS.PRESUPUESTO;
export const MAX_TRABAJOS = 5;

export const calcTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

export const getIniciales = (n) => n.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);

export function estadoPredominante(items) {
    const conteo = {};
    items.forEach(s => { conteo[s.estado] = (conteo[s.estado] || 0) + 1; });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || 'PRESUPUESTO';
}
