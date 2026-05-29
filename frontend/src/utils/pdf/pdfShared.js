// Helpers compartidos entre los generadores de PDF
import { C, T, M as MARGIN, CONTENT_W } from './theme.js';
import { dibujarHeaderCompacto } from './layout.js';

// Detecta tipo de documento
export function detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado }) {
    if (tipo) return tipo;
    if (esPresupuesto) return 'PRESUPUESTO';
    const esTec = esTecnicoForzado !== null && esTecnicoForzado !== undefined
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
    return esTec ? 'ORDEN_SERVICIO' : 'COMPROBANTE';
}

export function getLabelTipo(tipo, esMulti) {
    const suf = esMulti ? ' — MÚLTIPLES EQUIPOS' : '';
    switch (tipo) {
        case 'PRESUPUESTO':       return `PRESUPUESTO DE SERVICIO TÉCNICO${suf}`;
        case 'PRESUPUESTO_VENTA': return 'PRESUPUESTO DE VENTA';
        case 'ORDEN_SERVICIO':    return `TRABAJO REALIZADO${suf}`;
        case 'COMPROBANTE':       return 'COMPROBANTE DE VENTA';
        case 'INFORME_TECNICO':   return `INFORME TÉCNICO${suf}`;
        default:                  return tipo;
    }
}

export function getPrefijoNro(tipo) {
    const MAP = { PRESUPUESTO: 'PP', PRESUPUESTO_VENTA: 'PV', ORDEN_SERVICIO: 'OS', COMPROBANTE: 'CV', INFORME_TECNICO: 'IT' };
    return MAP[tipo] || 'DC';
}

export function getEstadoBadge(tipo) {
    const MAP = { ORDEN_SERVICIO: 'COMPLETADO', PRESUPUESTO: 'PRESUPUESTO', PRESUPUESTO_VENTA: 'PRESUPUESTO', INFORME_TECNICO: 'INFORME' };
    return MAP[tipo] || null;
}

// Transforma un ticketItem en filas para autoTable
export function construirFilasItem(item) {
    const filas = [];
    const mo = parseFloat(item.costoExtra || 0);
    if (mo > 0) {
        filas.push({
            concepto:   item.esVisita ? 'Visita / Diagnostico' : 'Mano de obra / Servicio tecnico',
            cant:       1,
            unitario:   mo.toLocaleString('es-AR'),
            importe:    mo.toLocaleString('es-AR'),
            esServicio: true,
        });
    }
    (item.repuestosUsados || []).forEach(r => {
        const uni = parseFloat(r.precio || 0);
        const imp = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
        filas.push({
            concepto:   r.nombre,
            cant:       r.cantidad,
            unitario:   uni.toLocaleString('es-AR'),
            importe:    imp.toLocaleString('es-AR'),
            esServicio: false,
        });
    });
    return filas;
}

// Desglose subtotal → descuento → total (compartido entre todos los generadores)
export function dibujarDesgloseTotal(doc, { y, pageW, totalEquipo, descuentoPorcentaje, sinItems = false, labelTotal = 'TOTAL DEL SERVICIO' }) {
    const pct = parseFloat(descuentoPorcentaje || 0);
    const descuentoMonto = (!sinItems && pct > 0) ? Math.round(totalEquipo * pct / 100) : 0;
    const totalFinal = totalEquipo - descuentoMonto;
    const totalLabel = sinItems ? 'A coordinar con el cliente' : `$ ${totalFinal.toLocaleString('es-AR')}`;

    if (pct > 0 && !sinItems) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Subtotal', MARGIN + 3, y + 4.5);
        doc.text(`$ ${totalEquipo.toLocaleString('es-AR')}`, pageW - MARGIN - 2, y + 4.5, { align: 'right' });
        y += 6;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(`Descuento ${pct}%`, MARGIN + 3, y + 4.5);
        doc.text(`- $ ${descuentoMonto.toLocaleString('es-AR')}`, pageW - MARGIN - 2, y + 4.5, { align: 'right' });
        y += 6;
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.line(MARGIN, y, pageW - MARGIN, y);
        y += 2;
    }

    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 13, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(labelTotal, MARGIN + 3, y + 5.5);
    doc.setFontSize(sinItems ? T.xs : T.md);
    doc.setTextColor(...C.navy);
    doc.text(totalLabel, pageW - MARGIN - 2, y + 10, { align: 'right' });
    y += 18;

    return y;
}

// Bloque observaciones compartido
export function dibujarObservaciones(doc, { y, texto, pageW }) {
    const limpio = (texto || '').trim();
    if (!limpio) return y;
    const lines = doc.splitTextToSize(limpio.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
    const h = Math.min(lines.length, 4) * 4.2 + 11;
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN - 2, y, CONTENT_W + 4, h, 2, 2, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('OBSERVACIONES', MARGIN + 2, y + 6);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    lines.slice(0, 4).forEach((l, i) => doc.text(l, MARGIN + 2, y + 11 + i * 4.2));
    return y + h + 4;
}

// Head styles compartidos para autoTable
export const TABLE_HEAD_STYLES = {
    fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
    fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
};

export const TABLE_BODY_STYLES = {
    fontSize: T.xs, textColor: C.dark,
    cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
    lineColor: C.grayBorder, lineWidth: 0.15,
};

// didDrawPage compartido para headers en paginas nuevas
export function makeDidDrawPage(doc, tipoLabel, fecha, nroDoc) {
    return (data) => {
        if (data.pageNumber > 1) {
            dibujarHeaderCompacto(doc, { tipoLabel, fecha, nroDoc });
        }
    };
}
