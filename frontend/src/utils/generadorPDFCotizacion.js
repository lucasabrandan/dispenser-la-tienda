import jsPDF from 'jspdf';
import { C, T, M, CONTENT_W, HEADER_H, PAGE_H, FOOTER_SAFE, procesarFecha, generarNroDocumento } from './pdf/theme.js';
import { dibujarHeader, dibujarFooter } from './pdf/layout.js';
import { cargarFoto } from './pdf/helpers.js';

/**
 * generarPDFCotizacion
 * Cotizacion de precios escalonados por volumen — soporta multi-producto.
 * Layout compacto: 2-3 productos caben en 1 pagina.
 */
export async function generarPDFCotizacion({
    clienteNombre       = '',
    clienteTelefono     = '',
    productos           = [],
    // Legacy (producto unico)
    productoNombre,
    productoCodigo,
    productoDescripcion,
    fotoUrl,
    filas: filasLegacy,
    validezDias         = '7',
    notas               = '',
}) {
    // Compatibilidad legacy
    if (productos.length === 0 && productoNombre) {
        productos = [{
            productoNombre,
            productoCodigo:      productoCodigo || '',
            productoDescripcion: productoDescripcion || '',
            fotoUrl:             fotoUrl || '',
            filas:               filasLegacy || [],
        }];
    }

    const multi  = productos.length > 1;
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const fecha  = procesarFecha(new Date().toISOString());
    const nroDoc = generarNroDocumento('CT', fecha, clienteNombre || 'CLI');
    const bottomLimit = PAGE_H - FOOTER_SAFE;

    let pagina = 1;
    const totalPaginas = () => doc.internal.getNumberOfPages();

    const fotos = await Promise.all(
        productos.map(p => cargarFoto(p.fotoUrl || null))
    );

    const checkNewPage = (y, needed = 30) => {
        if (y + needed > bottomLimit) {
            dibujarFooter(doc, { pagina, totalPaginas: totalPaginas(), textoCentral: '' });
            doc.addPage();
            pagina++;
            return 20;
        }
        return y;
    };

    // ── Medidas compactas vs normales ───────────────────────────────────────
    const FOTO_SZ = multi ? 22 : 30;
    const rowH    = multi ? 9  : 12;
    const headerH = multi ? 7  : 9;
    const gapSec  = multi ? 4  : 8;   // espacio entre secciones

    // ── Header ──────────────────────────────────────────────────────────────
    dibujarHeader(doc, {
        tipoLabel: multi
            ? `COTIZACION DE PRECIOS · ${productos.length} PRODUCTOS`
            : 'COTIZACION DE PRECIOS POR VOLUMEN',
        fecha,
        nroDoc,
        estado: 'PRESUPUESTO',
    });

    let y = HEADER_H.normal + 8;

    // ── Bloque "Para:" ──────────────────────────────────────────────────────
    const paraH = clienteTelefono ? 16 : 12;
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, paraH, 2, 2, 'FD');

    doc.setFillColor(...C.gold);
    doc.rect(M - 2, y, 3, paraH, 'F');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.grayText);
    doc.text('PARA:', M + 4, y + 4.5);

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(clienteNombre || '—', M + 4, y + 10);

    if (clienteTelefono) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`Tel: ${clienteTelefono}`, M + 4, y + 14.5);
    }

    y += paraH + gapSec;

    // ── Iterar productos ────────────────────────────────────────────────────
    for (let pi = 0; pi < productos.length; pi++) {
        const prod = productos[pi];
        const foto = fotos[pi];

        // Estimar espacio: info (~30 compacto) + tabla header + filas + ahorro
        const infoH = (foto ? FOTO_SZ : 18) + 8;
        const tablaH = headerH + prod.filas.length * rowH + 4;
        const ahorroH = prod.filas.length >= 2 ? 14 : 0;
        const espacioProducto = infoH + tablaH + ahorroH;

        // Separador entre productos
        if (pi > 0) {
            y = checkNewPage(y, Math.min(espacioProducto + 6, bottomLimit - 20));
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.3);
            doc.line(M, y, pageW - M, y);
            y += 4;
        } else {
            y = checkNewPage(y, Math.min(espacioProducto, bottomLimit - 20));
        }

        // ── Bloque producto — foto a la izquierda, texto a la derecha ──────
        const textX   = foto ? M + FOTO_SZ + 4 : M;
        const textW   = foto ? CONTENT_W - FOTO_SZ - 4 : CONTENT_W;
        const yProd   = y;

        // Foto a la izquierda
        if (foto) {
            try {
                doc.addImage(foto.data, foto.format, M, yProd, FOTO_SZ, FOTO_SZ);
                doc.setDrawColor(...C.grayBorder);
                doc.setLineWidth(0.2);
                doc.rect(M, yProd, FOTO_SZ, FOTO_SZ, 'S');
            } catch {}
        }

        // Numero de producto (solo multi)
        if (multi) {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`PRODUCTO ${pi + 1} DE ${productos.length}`, textX, y);
            y += 4;
        } else {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text('• PRODUCTO', textX, y);
            y += 5;
        }

        // Nombre
        doc.setFontSize(multi ? T.md : T.lg);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        const nameLines = doc.splitTextToSize(prod.productoNombre || '—', textW);
        doc.text(nameLines.slice(0, 2), textX, y);
        y += nameLines.slice(0, 2).length * (multi ? 4.5 : 5.5);

        // SKU
        if (prod.productoCodigo) {
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`SKU: ${prod.productoCodigo}`, textX, y);
            y += 4;
        }

        // Descripcion pegada al producto
        if (prod.productoDescripcion?.trim()) {
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            const maxDesc = multi ? 2 : 3;
            const descLines = doc.splitTextToSize(prod.productoDescripcion, textW);
            doc.text(descLines.slice(0, maxDesc), textX, y);
            y += descLines.slice(0, maxDesc).length * 3.5;
        }

        // Asegurar y debajo de la foto
        if (y < yProd + (foto ? FOTO_SZ : 0)) y = yProd + (foto ? FOTO_SZ : 0);
        y += gapSec;

        // ── Tabla de precios ────────────────────────────────────────────────
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('• ESCALA DE PRECIOS', M, y);
        y += 4;

        const colCant = M;
        const colDesc = M + 48;
        const colUnit = M + 95;
        const colSub  = pageW - M - 4;

        // Header tabla
        doc.setFillColor(...C.navy);
        doc.roundedRect(M, y, CONTENT_W, headerH, 1.5, 1.5, 'F');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        const hTextY = y + (headerH * 0.65);
        doc.text('CANTIDAD',     colCant + 4, hTextY);
        doc.text('DESCUENTO',    colDesc,     hTextY);
        doc.text('PRECIO UNIT.', colUnit,     hTextY);
        doc.text('SUBTOTAL',     colSub,      hTextY, { align: 'right' });
        y += headerH;

        prod.filas.forEach((fila, idx) => {
            y = checkNewPage(y, rowH + 2);

            const cant = Number(fila.cantidad)       || 0;
            const unit = Number(fila.precioUnitario) || 0;
            const sub  = cant * unit;
            const pct  = fila.descuentoPct !== '' && fila.descuentoPct !== undefined
                ? Number(fila.descuentoPct) : null;

            doc.setFillColor(...(idx % 2 === 0 ? C.white : C.grayZebra));
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.rect(M, y, CONTENT_W, rowH, 'FD');

            const textY = y + (rowH * 0.6);

            // Cantidad
            doc.setFontSize(T.sm);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.dark);
            doc.text(cant.toLocaleString('es-AR'), colCant + 4, textY);
            if (cant > 1) {
                doc.setFontSize(T.xxs);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...C.grayText);
                doc.text('unid.', colCant + 4 + doc.getTextWidth(cant.toLocaleString('es-AR')) + 2, textY);
            }

            // Descuento
            if (pct !== null && pct > 0) {
                const badgeTxt = `-${pct}%`;
                const badgeW   = doc.getStringUnitWidth(badgeTxt) * 8 / doc.internal.scaleFactor + 5;
                const badgeH   = multi ? 5 : 6;
                const badgeY   = y + (rowH - badgeH) / 2;
                doc.setFillColor(255, 248, 220);
                doc.setDrawColor(...C.gold);
                doc.setLineWidth(0.4);
                doc.roundedRect(colDesc, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
                doc.setFontSize(multi ? 7.5 : 9);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...C.gold);
                doc.text(badgeTxt, colDesc + badgeW / 2, textY, { align: 'center' });
            } else {
                doc.setFontSize(T.xs);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...C.grayText);
                doc.text('—', colDesc, textY);
            }

            // Precio unitario
            doc.setFontSize(T.sm);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.dark);
            doc.text(`$${unit.toLocaleString('es-AR')}`, colUnit, textY);

            // Subtotal
            const maxSub = Math.max(...prod.filas.map(f => Number(f.cantidad) * Number(f.precioUnitario)));
            const esMax  = sub === maxSub && prod.filas.length > 1;
            doc.setFontSize(multi ? T.sm : T.md);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...(esMax ? C.gold : C.navy));
            doc.text(`$${sub.toLocaleString('es-AR')}`, colSub, textY + 0.5, { align: 'right' });

            y += rowH;
        });

        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(M, y, pageW - M, y);
        y += gapSec;

        // ── Nota de ahorro ──────────────────────────────────────────────────
        if (prod.filas.length >= 2) {
            const f1   = prod.filas[0];
            const fMax = [...prod.filas].sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0];
            const p1   = Number(f1.precioUnitario)  || 0;
            const pMax = Number(fMax.precioUnitario) || 0;
            const cantMax = Number(fMax.cantidad) || 0;
            if (p1 > pMax && pMax > 0 && cantMax > 0) {
                y = checkNewPage(y, 14);
                const ahorroUnit  = p1 - pMax;
                const ahorroTotal = ahorroUnit * cantMax;
                const boxH = multi ? 8 : 10;
                doc.setFillColor(255, 248, 220);
                doc.setDrawColor(...C.gold);
                doc.setLineWidth(0.4);
                doc.roundedRect(M, y, CONTENT_W, boxH, 2, 2, 'FD');
                doc.setFontSize(T.xxs);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...C.gold);
                doc.text(
                    `Llevando ${cantMax.toLocaleString('es-AR')} unid. ahorras $${ahorroTotal.toLocaleString('es-AR')} ($${ahorroUnit.toLocaleString('es-AR')}/u vs precio lista)`,
                    pageW / 2, y + (boxH * 0.6), { align: 'center' }
                );
                y += boxH + gapSec;
            }
        }
    }

    // ── Validez ─────────────────────────────────────────────────────────────
    y = checkNewPage(y, 8);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(
        `Valido por ${validezDias} dia${validezDias !== '1' ? 's' : ''} desde la fecha de emision`,
        pageW - M, y, { align: 'right' }
    );
    y += 6;

    // ── Notas adicionales ───────────────────────────────────────────────────
    if (notas?.trim()) {
        const notasLines = doc.splitTextToSize(notas.trim(), CONTENT_W - 12);
        const notasH = notasLines.length * 4.5 + 12;
        y = checkNewPage(y, notasH + 6);
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

    // ── Footer en todas las paginas ─────────────────────────────────────────
    const total = totalPaginas();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        dibujarFooter(doc, {
            pagina: p, totalPaginas: total,
            textoCentral: 'Precios en pesos argentinos · IVA no incluido salvo indicacion',
        });
    }

    const nombre = (clienteNombre || 'cliente').toLowerCase().replace(/\s+/g, '-');
    doc.save(`cotizacion-${nombre}.pdf`);
}
