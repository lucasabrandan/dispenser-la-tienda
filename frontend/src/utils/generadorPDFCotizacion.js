import jsPDF from 'jspdf';
import { C, T, M, CONTENT_W, HEADER_H, PAGE_H, FOOTER_SAFE, procesarFecha, generarNroDocumento } from './pdf/theme.js';
import { dibujarHeader, dibujarFooter } from './pdf/layout.js';
import { cargarFoto } from './pdf/helpers.js';

/**
 * generarPDFCotizacion
 * Cotizacion de precios escalonados por volumen — soporta multi-producto.
 * Recibe `productos` (array) o los campos legacy de producto unico para compatibilidad.
 */
export async function generarPDFCotizacion({
    clienteNombre       = '',
    clienteTelefono     = '',
    // Multi-producto
    productos           = [],
    // Legacy (producto unico) — se convierte a array internamente
    productoNombre,
    productoCodigo,
    productoDescripcion,
    fotoUrl,
    filas: filasLegacy,
    validezDias         = '7',
    notas               = '',
}) {
    // Compatibilidad: si se pasaron campos legacy, armar array de 1
    if (productos.length === 0 && productoNombre) {
        productos = [{
            productoNombre,
            productoCodigo:      productoCodigo || '',
            productoDescripcion: productoDescripcion || '',
            fotoUrl:             fotoUrl || '',
            filas:               filasLegacy || [],
        }];
    }

    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const fecha  = procesarFecha(new Date().toISOString());
    const nroDoc = generarNroDocumento('CT', fecha, clienteNombre || 'CLI');
    const bottomLimit = PAGE_H - FOOTER_SAFE;

    let pagina = 1;
    const totalPaginas = () => doc.internal.getNumberOfPages();

    // Carga todas las fotos en paralelo
    const fotos = await Promise.all(
        productos.map(p => cargarFoto(p.fotoUrl || null))
    );

    // ── Helpers ─────────────────────────────────────────────────────────────
    const checkNewPage = (y, needed = 30) => {
        if (y + needed > bottomLimit) {
            dibujarFooter(doc, { pagina, totalPaginas: totalPaginas(), textoCentral: '' });
            doc.addPage();
            pagina++;
            return 20;
        }
        return y;
    };

    // ── Header ──────────────────────────────────────────────────────────────
    dibujarHeader(doc, {
        tipoLabel: productos.length > 1
            ? `COTIZACION DE PRECIOS · ${productos.length} PRODUCTOS`
            : 'COTIZACION DE PRECIOS POR VOLUMEN',
        fecha,
        nroDoc,
        estado: 'PRESUPUESTO',
    });

    let y = HEADER_H.normal + 10;

    // ── Bloque "Para:" ──────────────────────────────────────────────────────
    const paraH = clienteTelefono ? 18 : 13;
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, paraH, 2, 2, 'FD');

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

    // ── Iterar productos ────────────────────────────────────────────────────
    for (let pi = 0; pi < productos.length; pi++) {
        const prod = productos[pi];
        const foto = fotos[pi];

        // Estimar espacio total del producto: info (~45) + tabla header (9) + filas (12 cada) + ahorro (16)
        const espacioProducto = 45 + 9 + prod.filas.length * 12 + 20;

        // Separador entre productos
        if (pi > 0) {
            y = checkNewPage(y, Math.min(espacioProducto + 10, bottomLimit - 20));
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.3);
            doc.line(M, y, pageW - M, y);
            y += 6;
        }

        y = checkNewPage(y, Math.min(espacioProducto, bottomLimit - 20));

        // ── Bloque producto ─────────────────────────────────────────────────
        const FOTO_SZ = 30;
        const fotoX   = pageW - M - FOTO_SZ;
        const textW   = foto ? fotoX - M - 5 : CONTENT_W;
        const yProd   = y;

        // Numero de producto (solo si hay mas de 1)
        if (productos.length > 1) {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`PRODUCTO ${pi + 1} DE ${productos.length}`, M, y);
            y += 4;
        }

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(productos.length > 1 ? '' : '• PRODUCTO', M, y);
        if (productos.length <= 1) y += 5;

        // Nombre
        doc.setFontSize(T.lg);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        const nameLines = doc.splitTextToSize(prod.productoNombre || '—', textW);
        doc.text(nameLines.slice(0, 2), M, y);
        y += nameLines.slice(0, 2).length * 5.5;

        // SKU
        if (prod.productoCodigo) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`SKU: ${prod.productoCodigo}`, M, y);
            y += 5;
        }

        // Descripcion
        if (prod.productoDescripcion?.trim()) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            const descLines = doc.splitTextToSize(prod.productoDescripcion, textW);
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

        // Asegurar y este debajo de la foto
        if (y < yProd + (foto ? FOTO_SZ : 0)) y = yProd + (foto ? FOTO_SZ : 0);
        y += 8;

        // ── Tabla de precios escalonados ─────────────────────────────────────
        y = checkNewPage(y, 20 + prod.filas.length * 12);

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('• ESCALA DE PRECIOS', M, y);
        y += 5;

        const colCant = M;
        const colDesc = M + 48;
        const colUnit = M + 95;
        const colSub  = pageW - M - 4;
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
            doc.text('/u', colUnit + doc.getTextWidth(`$${unit.toLocaleString('es-AR')}`) + 1, y + 7.5);

            // Subtotal
            const maxSub = Math.max(...prod.filas.map(f => Number(f.cantidad) * Number(f.precioUnitario)));
            const esMax  = sub === maxSub && prod.filas.length > 1;
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

        // ── Nota de ahorro ──────────────────────────────────────────────────
        if (prod.filas.length >= 2) {
            const f1   = prod.filas[0];
            const fMax = [...prod.filas].sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0];
            const p1   = Number(f1.precioUnitario)  || 0;
            const pMax = Number(fMax.precioUnitario) || 0;
            if (p1 > pMax && pMax > 0) {
                y = checkNewPage(y, 16);
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
    }

    // ── Validez ─────────────────────────────────────────────────────────────
    y = checkNewPage(y, 10);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(
        `Valido por ${validezDias} dia${validezDias !== '1' ? 's' : ''} desde la fecha de emision`,
        pageW - M, y, { align: 'right' }
    );
    y += 8;

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
