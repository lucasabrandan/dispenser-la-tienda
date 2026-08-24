// Colores por estado para headers de tecnico y cards
export const ESTADO_COLORS = {
    PRESUPUESTO:           { bg: 'bg-[#D48800]/10 dark:bg-[#F0A500]/10', text: 'text-brand-amber', avatar: 'bg-brand-amber', bar: 'bg-brand-amber' },
    COMPLETADO:            { bg: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/10', text: 'text-[#3B82F6] dark:text-[#60A5FA]', avatar: 'bg-[#3B82F6] dark:bg-[#60A5FA]', bar: 'bg-[#3B82F6] dark:bg-[#60A5FA]' },
    PENDIENTE_FACTURACION: { bg: 'bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/10', text: 'text-[#8B5CF6] dark:text-[#A78BFA]', avatar: 'bg-[#8B5CF6] dark:bg-[#A78BFA]', bar: 'bg-[#8B5CF6] dark:bg-[#A78BFA]' },
    COBRADO:               { bg: 'bg-[#16A34A]/10 dark:bg-[#22C55E]/10', text: 'text-[#16A34A] dark:text-[#22C55E]', avatar: 'bg-[#16A34A] dark:bg-[#22C55E]', bar: 'bg-[#16A34A] dark:bg-[#22C55E]' },
    REALIZADO:             { bg: 'bg-[#16A34A]/10 dark:bg-[#22C55E]/10', text: 'text-[#16A34A] dark:text-[#22C55E]', avatar: 'bg-[#16A34A] dark:bg-[#22C55E]', bar: 'bg-[#16A34A] dark:bg-[#22C55E]' },
    ARCHIVADO:             { bg: 'bg-muted/10 dark:bg-[#A8A29E]/10', text: 'text-muted', avatar: 'bg-muted', bar: 'bg-muted' },
};

export const ESTADO_BORDER = {
    PRESUPUESTO: '#D48800', COMPLETADO: '#3B82F6', PENDIENTE_FACTURACION: '#8B5CF6',
    FACTURADO: '#6366F1', COBRADO: '#16A34A', REALIZADO: '#16A34A', ARCHIVADO: '#A8A29E',
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
