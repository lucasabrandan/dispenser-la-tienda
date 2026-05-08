import jsPDF from 'jspdf';
import { DARK, RED, GOLD, GRAY_TEXT, GRAY_LIGHT, WARM_BORDER, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';
import { cargarFoto } from './pdf/helpers';

/**
 * generarPDFCotizacion
 * Cotización de precios escalonados por volumen para un producto específico.
 */
export async function generarPDFCotizacion({
    clienteNombre    = '',
    clienteTelefono  = '',
    productoNombre   = '',
    productoCodigo   = '',
    productoDescripcion = '',
    fotoUrl          = '',
    filas            = [],
    validezDias      = '7',
    notas            = '',
}) {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 14;
    const fecha  = new Date().toLocaleDateString('es-AR');

    dibujarHeaderPDF(doc, 'COTIZACIÓN DE PRECIOS', fecha, `Válida por ${validezDias} día${validezDias !== '1' ? 's' : ''}`);

    // Cargar foto del producto (si hay)
    const foto = await cargarFoto(fotoUrl);

    let y = 52;

    // ── Bloque "Para:" ────────────────────────────────────────────────────────
    doc.setFillColor(...GRAY_LIGHT);
    doc.setDrawColor(...WARM_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageW - margin * 2, clienteTelefono ? 16 : 12, 3, 3, 'FD');

    // Acento dorado izq
    doc.setFillColor(...GOLD);
    doc.rect(margin, y, 3, clienteTelefono ? 16 : 12, 'F');

    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('PARA:', margin + 7, y + 5);

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(clienteNombre || '—', margin + 7, y + 11);

    if (clienteTelefono) {
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Tel: ${clienteTelefono}`, margin + 7, y + 14.5);
    }

    y += (clienteTelefono ? 16 : 12) + 8;

    // ── Bloque producto ───────────────────────────────────────────────────────
    const FOTO_SZ = 32; // mm cuadrado
    const fotoX   = pageW - margin - FOTO_SZ;
    const textW   = foto ? fotoX - margin - 4 : pageW - margin * 2;
    const yProd   = y;

    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text('PRODUCTO', margin, y);
    y += 4;

    // Nombre del producto (puede ser largo — wrapeamos al ancho disponible)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    const nameLines = doc.splitTextToSize(productoNombre || '—', textW);
    doc.text(nameLines.slice(0, 2), margin, y);
    y += nameLines.slice(0, 2).length * 5.5;

    if (productoCodigo) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`SKU: ${productoCodigo}`, margin, y);
        y += 4.5;
    }

    if (productoDescripcion) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        const lines = doc.splitTextToSize(productoDescripcion, textW);
        doc.text(lines.slice(0, 3), margin, y);
        y += lines.slice(0, 3).length * 4;
    }

    // Foto del producto — columna derecha
    if (foto) {
        try {
            doc.setFillColor(...GRAY_LIGHT);
            doc.setDrawColor(...WARM_BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(fotoX, yProd, FOTO_SZ, FOTO_SZ, 3, 3, 'FD');
            doc.addImage(foto.data, foto.format, fotoX, yProd, FOTO_SZ, FOTO_SZ);
            doc.setDrawColor(...WARM_BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(fotoX, yProd, FOTO_SZ, FOTO_SZ, 3, 3, 'S');
        } catch {}
    }

    // Avanzar y hasta debajo de la foto si corresponde
    const yMinTras = yProd + (foto ? FOTO_SZ : 0);
    if (y < yMinTras) y = yMinTras;

    y += 6;

    // ── Tabla de precios escalonados ──────────────────────────────────────────
    const colCant  = margin;
    const colUnit  = margin + 55;
    const colSub   = pageW - margin;
    const rowH     = 12;
    const headerH  = 9;

    // Cabecera tabla
    doc.setFillColor(...RED);
    doc.roundedRect(margin, y, pageW - margin * 2, headerH, 2, 2, 'F');

    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CANTIDAD', colCant + 4, y + 6);
    doc.text('PRECIO UNITARIO', colUnit, y + 6);
    doc.text('SUBTOTAL', colSub, y + 6, { align: 'right' });
    y += headerH;

    // Filas
    filas.forEach((fila, idx) => {
        const cant  = Number(fila.cantidad)      || 0;
        const unit  = Number(fila.precioUnitario) || 0;
        const sub   = cant * unit;

        const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 248, 245];
        doc.setFillColor(...bg);
        doc.setDrawColor(...WARM_BORDER);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, pageW - margin * 2, rowH, 'FD');

        // Cantidad — en badge dorado si es > 1
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        doc.text(cant.toLocaleString('es-AR'), colCant + 4, y + 7.5);

        if (cant > 1) {
            doc.setFontSize(7);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...GRAY_TEXT);
            doc.text('unid.', colCant + 4 + doc.getTextWidth(cant.toLocaleString('es-AR')) + 2, y + 7.5);
        }

        // Precio unitario
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        doc.text(`$${unit.toLocaleString('es-AR')}`, colUnit, y + 7.5);

        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('c/u', colUnit + doc.getTextWidth(`$${unit.toLocaleString('es-AR')}`) + 2, y + 7.5);

        // Subtotal — en rojo si es la línea de mayor volumen (max subtotal)
        const maxSub = Math.max(...filas.map(f => Number(f.cantidad) * Number(f.precioUnitario)));
        const esMax  = sub === maxSub && filas.length > 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...(esMax ? GOLD : DARK));
        doc.text(`$${sub.toLocaleString('es-AR')}`, colSub, y + 8, { align: 'right' });

        y += rowH;
    });

    // Borde inferior tabla
    doc.setDrawColor(...WARM_BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);

    y += 10;

    // ── Nota de ahorro (si hay ≥2 filas con cantidades distintas) ─────────────
    if (filas.length >= 2) {
        const f1    = filas[0];
        const fMax  = [...filas].sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0];
        const p1    = Number(f1.precioUnitario) || 0;
        const pMax  = Number(fMax.precioUnitario) || 0;
        if (p1 > pMax && pMax > 0) {
            const ahorro = Math.round(((p1 - pMax) / p1) * 100);
            doc.setFillColor(255, 248, 230);
            doc.setDrawColor(212, 136, 0);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GOLD);
            doc.text(
                `★  Comprando ${Number(fMax.cantidad).toLocaleString('es-AR')} unidades ahorrás un ${ahorro}% por unidad`,
                pageW / 2, y + 6.5, { align: 'center' }
            );
            y += 16;
        }
    }

    // ── Notas adicionales ─────────────────────────────────────────────────────
    if (notas) {
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...GRAY_TEXT);
        const notasLines = doc.splitTextToSize(`Nota: ${notas}`, pageW - margin * 2);
        doc.text(notasLines, margin, y);
        y += notasLines.length * 4 + 4;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    dibujarFooterPDF(doc, null, null, 'Precios en pesos argentinos · IVA no incluido salvo indicación');

    const nombre = (clienteNombre || 'cliente').toLowerCase().replace(/\s+/g, '-');
    doc.save(`cotizacion-${nombre}.pdf`);
}
