/**
 * Utilidad de exportación CSV.
 * Genera y descarga un archivo .csv desde un array de objetos.
 */
import { getTodayISO } from './dateUtils';

/** Escapa un valor para CSV (maneja comas, comillas y saltos de línea) */
function escapar(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Descarga un string CSV como archivo */
function descargar(csvString, nombreArchivo) {
    // BOM para que Excel abra con caracteres especiales correctamente
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Genera y descarga CSV desde un array de filas (objetos planos) */
export function exportarCSV(filas, columnas, nombreArchivo) {
    if (!filas.length) return;
    const header = columnas.map(c => escapar(c.label)).join(',');
    const rows = filas.map(fila =>
        columnas.map(c => escapar(c.valor(fila))).join(',')
    );
    descargar([header, ...rows].join('\n'), nombreArchivo);
}

// ── Exportadores específicos ───────────────────────────────────────────────────

/** Exporta servicios técnicos — una fila por equipo/item */
export function exportarServiciosCSV(servicios) {
    const filas = [];
    servicios.forEach(s => {
        const total = s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;
        if (!s.items?.length) {
            filas.push({ ...s, _item: null, _total: total });
        } else {
            s.items.forEach(item => {
                filas.push({ ...s, _item: item, _total: total });
            });
        }
    });

    const columnas = [
        { label: 'ID',              valor: f => f.id },
        { label: 'Fecha',           valor: f => f.fecha },
        { label: 'Estado',          valor: f => f.estado === 'REALIZADO' ? 'Realizado' : f.estado === 'PRESUPUESTO' ? 'Pendiente' : 'Rechazado' },
        { label: 'Cliente',         valor: f => f.clienteNombre },
        { label: 'Sede',            valor: f => f.sedeNombre },
        { label: 'Equipo Serial',   valor: f => f._item?.equipoSerial || '' },
        { label: 'Trabajo',         valor: f => f._item?.trabajoRealizado || '' },
        { label: 'Repuestos',       valor: f => f._item?.repuestosUsados?.map(r => `${r.cantidad}x ${r.nombre}`).join(' / ') || '' },
        { label: 'MO ($)',          valor: f => f._item?.costoExtra || 0 },
        { label: 'Total Item ($)',  valor: f => f._item?.costo || 0 },
        { label: 'Total Servicio ($)', valor: f => f._total },
    ];

    const fecha = getTodayISO();
    exportarCSV(filas, columnas, `servicios_${fecha}.csv`);
}

/** Exporta ventas — una fila por producto/item */
export function exportarVentasCSV(ventas) {
    const filas = [];
    ventas.forEach(v => {
        const total = v.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;
        if (!v.items?.length) {
            filas.push({ ...v, _item: null, _total: total });
        } else {
            v.items.forEach(item => {
                filas.push({ ...v, _item: item, _total: total });
            });
        }
    });

    const columnas = [
        { label: 'ID',              valor: f => f.id },
        { label: 'Fecha',           valor: f => f.fecha },
        { label: 'Estado',          valor: f => f.estado === 'REALIZADO' ? 'Cobrada' : f.estado === 'PRESUPUESTO' ? 'Pendiente' : 'Rechazada' },
        { label: 'Cliente',         valor: f => f.clienteNombre },
        { label: 'Sede',            valor: f => f.sedeNombre },
        { label: 'Producto',        valor: f => f._item?.trabajoRealizado || '' },
        { label: 'Cantidad',        valor: f => f._item?.cantidad || 1 },
        { label: 'Precio Unit ($)', valor: f => f._item?.precioUnitario || f._item?.costo || 0 },
        { label: 'Total Item ($)',  valor: f => f._item?.costo || 0 },
        { label: 'Total Venta ($)', valor: f => f._total },
    ];

    const fecha = getTodayISO();
    exportarCSV(filas, columnas, `ventas_${fecha}.csv`);
}

/** Exporta balance mensual — resumen + operaciones */
export function exportarBalanceCSV(stats, mes) {
    const imp = stats.facturacion * 0.30;
    const resumen = [
        { concepto: 'Facturación bruta',             monto: stats.facturacion },
        { concepto: 'Impuestos (30%)',                monto: -imp },
        { concepto: 'Repuestos / costos directos',    monto: -stats.costoRepuestos },
        { concepto: 'Gastos operacionales',            monto: -stats.gastosVarios },
        { concepto: 'GANANCIA REAL',                   monto: stats.gananciaReal },
    ];

    const lineas = ['\uFEFF'];
    lineas.push(`Balance - ${mes}`);
    lineas.push('');
    lineas.push('Concepto,Monto ($)');
    resumen.forEach(r => lineas.push(`${escapar(r.concepto)},${r.monto}`));

    if (stats.transacciones?.length) {
        lineas.push('');
        lineas.push('Operaciones del mes');
        lineas.push('Fecha,Tipo,Concepto,Costo ($),Venta ($),Margen (%)');
        stats.transacciones.forEach(t => {
            const costo  = parseFloat(t.costo || 0);
            const venta  = parseFloat(t.venta || 0);
            const margen = venta > 0 ? Math.round((venta - costo) / venta * 100) : 0;
            lineas.push([escapar(t.fecha), escapar(t.tipo), escapar(t.concepto), costo, venta, margen].join(','));
        });
    }

    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance_${mes}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Exporta gastos — tabla plana */
export function exportarGastosCSV(gastos, mes) {
    const columnas = [
        { label: 'ID',           valor: f => f.id },
        { label: 'Fecha',        valor: f => f.fecha },
        { label: 'Categoría',    valor: f => f.categoria },
        { label: 'Descripción',  valor: f => f.descripcion },
        { label: 'Monto ($)',    valor: f => f.monto },
    ];

    const sufijo = mes ? `_${mes}` : `_${getTodayISO()}`;
    exportarCSV(gastos, columnas, `gastos${sufijo}.csv`);
}
