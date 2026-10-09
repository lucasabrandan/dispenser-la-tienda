// Descuento por alcance (9-oct-2026). El MONTO siempre lo calcula el backend
// (servicio.totales); acá solo están los textos para mostrarlo igual en todos lados.

export const ALCANCES = [
    { valor: 'TOTAL',        etiqueta: 'Todo' },
    { valor: 'MANO_DE_OBRA', etiqueta: 'Mano de obra' },
    { valor: 'REPUESTOS',    etiqueta: 'Repuestos' },
];

const SUFIJO = { MANO_DE_OBRA: ' s/ mano de obra', REPUESTOS: ' s/ repuestos' };

// 40 → "40", 12.5 → "12,5"
export const formatoPct = pct => Number(pct || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });

// "Descuento 40%" · "Descuento 40% s/ mano de obra" · "Descuento 40% s/ repuestos"
export function leyendaDescuento(pct, alcance) {
    return `Descuento ${formatoPct(pct)}%${SUFIJO[alcance] || ''}`;
}

// Versión corta para badges: "-40%" · "-40% s/ MO" · "-40% s/ rep."
export function leyendaDescuentoCorta(pct, alcance) {
    const corto = { MANO_DE_OBRA: ' s/ MO', REPUESTOS: ' s/ rep.' }[alcance] || '';
    return `-${formatoPct(pct)}%${corto}`;
}

// Total de un servicio para mostrar: el que calculó el backend. Si el servicio
// viene de una versión vieja del backend sin `totales`, se suma sin descuento
// solo para no mostrar vacío (no debería pasar después del deploy).
export function totalServicio(s) {
    if (s?.totales?.total != null) return Number(s.totales.total);
    return (s?.items || []).reduce((a, it) => a + (Number(it.costo) || 0), 0);
}
