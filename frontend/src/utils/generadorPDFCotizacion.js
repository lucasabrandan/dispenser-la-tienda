import jsPDF from 'jspdf';
import { C, T, M, CONTENT_W, HEADER_H, procesarFecha, generarNroDocumento } from './pdf/theme.js';
import { dibujarHeader, dibujarFooter } from './pdf/layout.js';
import { cargarFoto } from './pdf/helpers.js';

/**
 * generarPDFCotizacion
 * Cotización de precios escalonados por volumen para un producto específico.
 */
export async function generarPDFCotizacion({
    clienteNombre       = '',
    clienteTelefono     = '',
    productoNombre      = '',
    productoCodigo      = '',
    productoDescripcion = '',
    fotoUrl             = '',
    filas               = [],
    validezDias         = '7',
    notas               = '',
}) {
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const fecha = procesarFecha(new Date().toISOString());
    const nroDoc = generarNroDocumento('CT', fecha, clienteNombre || 'CLI');

    dibujarHeader(doc, {
        tipoLabel: 'COTIZACIÓN DE PRECIOS POR VOLUMEN',
        fecha,
        nroDoc,
        estado: 'PRESUPUESTO',
    });

    const foto = await cargarFoto(fotoUrl || null);

    let y = HEADER_H.normal + 10;

    // ── Bloque "Para:" ────────────────────────────────────────────────────────
    const paraH = clienteTelefono ? 18 : 13;
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, paraH, 2, 2, 'FD');

    // Acento dorado izquierdo
    doc.setFillColor(...C.gold);
    doc.rect(M - 2, y, 3, paraH, 'F');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.grayText);
    doc.text('PARA:', M + 4, y + 5);

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(clienteNombre || '—', M + 4, y + 11);

    if (clienteTelefono) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`Tel: ${clienteTelefono}`, M + 4, y + 16);
    }

    y += paraH + 8;

    // ── Bloque producto ───────────────────────────────────────────────────────
    const FOTO_SZ = 30;
    const fotoX   = pageW - M - FOTO_SZ;
    const textW   = foto ? fotoX - M - 5 : CONTENT_W;
    const yProd   = y;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('• PRODUCTO', M, y);
    y += 5;

    // Nombre
    doc.setFontSize(T.lg);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    const nameLines = doc.splitTextToSize(productoNombre || '—', textW);
    doc.text(nameLines.slice(0, 2), M, y);
    y += nameLines.slice(0, 2).length * 5.5;

    // SKU
    if (productoCodigo) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(`SKU: ${productoCodigo}`, M, y);
        y += 5;
    }

    // Descripción
    if (productoDescripcion?.trim()) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const descLines = doc.splitTextToSize(productoDescripcion, textW);
        doc.text(descLines.slice(0, 3), M, y);
        y += descLines.slice(0, 3).length * 4.5;
    }

    // Foto a la derecha
    if (foto) {
        try {
            doc.addImage(foto.data, foto.format, fotoX, yProd, FOTO_SZ, FOTO_SZ);
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.2);
            doc.rect(fotoX, yProd, FOTO_SZ, FOTO_SZ, 'S');
        } catch {}
    }

    // Asegurar y esté debajo de la foto
    if (y < yProd + (foto ? FOTO_SZ : 0)) y = yProd + (foto ? FOTO_SZ : 0);
    y += 8;

    // ── Tabla de precios escalonados ──────────────────────────────────────────
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('• ESCALA DE PRECIOS', M, y);
    y += 5;

    const colCant = M;
    const colDesc = M + 48;
    const colUnit = M + 95;
    const colSub  = pageW - M;
    const rowH    = 12;
    const headerH = 9;

    // Header tabla
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, headerH, 2, 2, 'F');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('CANTIDAD',     colCant + 4, y + 6);
    doc.text('DESCUENTO',    colDesc,     y + 6);
    doc.text('PRECIO UNIT.', colUnit,     y + 6);
    doc.text('SUBTOTAL',     colSub,      y + 6, { align: 'right' });
    y += headerH;

    filas.forEach((fila, idx) => {
        const cant = Number(fila.cantidad)       || 0;
        const unit = Number(fila.precioUnitario) || 0;
        const sub  = cant * unit;
        const pct  = fila.descuentoPct !== '' && fila.descuentoPct !== undefined
            ? Number(fila.descuentoPct) : null;

        doc.setFillColor(...(idx % 2 === 0 ? C.white : C.grayZebra));
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.rect(M, y, CONTENT_W, rowH, 'FD');

        // Cantidad
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(cant.toLocaleString('es-AR'), colCant + 4, y + 7.5);
        if (cant > 1) {
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('unid.', colCant + 4 + doc.getTextWidth(cant.toLocaleString('es-AR')) + 2, y + 7.5);
        }

        // Descuento
        if (pct !== null && pct > 0) {
            const badgeTxt = `-${pct}%`;
            const badgeW   = doc.getStringUnitWidth(badgeTxt) * 9 / doc.internal.scaleFactor + 6;
            doc.setFillColor(255, 248, 220);
            doc.setDrawColor(...C.gold);
            doc.setLineWidth(0.4);
            doc.roundedRect(colDesc, y + 3, badgeW, 6, 1.5, 1.5, 'FD');
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.gold);
            doc.text(badgeTxt, colDesc + badgeW / 2, y + 7.5, { align: 'center' });
        } else {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('—', colDesc, y + 7.5);
        }

        // Precio unitario
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(`$${unit.toLocaleString('es-AR')}`, colUnit, y + 7.5);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('c/u', colUnit + doc.getTextWidth(`$${unit.toLocaleString('es-AR')}`) + 2, y + 7.5);

        // Subtotal — dorado en la fila de mayor volumen
        const maxSub = Math.max(...filas.map(f => Number(f.cantidad) * Number(f.precioUnitario)));
        const esMax  = sub === maxSub && filas.length > 1;
        doc.setFontSize(T.md);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...(esMax ? C.gold : C.navy));
        doc.text(`$${sub.toLocaleString('es-AR')}`, colSub, y + 8, { align: 'right' });

        y += rowH;
    });

    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.line(M, y, pageW - M, y);
    y += 8;

    // ── Nota de ahorro ────────────────────────────────────────────────────────
    if (filas.length >= 2) {
        const f1   = filas[0];
        const fMax = [...filas].sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0];
        const p1   = Number(f1.precioUnitario)  || 0;
        const pMax = Number(fMax.precioUnitario) || 0;
        if (p1 > pMax && pMax > 0) {
            const ahorro = Math.round(((p1 - pMax) / p1) * 100);
            doc.setFillColor(255, 248, 220);
            doc.setDrawColor(...C.gold);
            doc.setLineWidth(0.4);
            doc.roundedRect(M, y, CONTENT_W, 10, 2, 2, 'FD');
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.gold);
            doc.text(
                `Comprando ${Number(fMax.cantidad).toLocaleString('es-AR')} unidades ahorras un ${ahorro}% por unidad`,
                pageW / 2, y + 6.5, { align: 'center' }
            );
            y += 16;
        }
    }

    // ── Validez ───────────────────────────────────────────────────────────────
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(
        `Válido por ${validezDias} día${validezDias !== '1' ? 's' : ''} desde la fecha de emisión`,
        pageW - M, y, { align: 'right' }
    );
    y += 8;

    // ── Notas adicionales ─────────────────────────────────────────────────────
    if (notas?.trim()) {
        const notasLines = doc.splitTextToSize(notas.trim(), CONTENT_W - 12);
        const notasH = notasLines.length * 4.5 + 12;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, notasH, 2, 2, 'FD');
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('CONDICIONES / NOTAS', M + 2, y + 6);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(notasLines, M + 2, y + 11);
        y += notasH + 6;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    dibujarFooter(doc, {
        pagina: 1, totalPaginas: 1,
        textoCentral: 'Precios en pesos argentinos · IVA no incluido salvo indicación',
    });

    const nombre = (clienteNombre || 'cliente').toLowerCase().replace(/\s+/g, '-');
    doc.save(`cotizacion-${nombre}.pdf`);
}
