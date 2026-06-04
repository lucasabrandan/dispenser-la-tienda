// Generadores PDF para ventas (presupuesto venta y comprobante)
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W, HEADER_H, getEmpresa } from './theme.js';
import { dibujarHeaderCompacto } from './layout.js';
import {
    dibujarBloqueClienteEquipo,
    dibujarCondicionesVenta,
    dibujarCondicionesCompactas,
    dibujarFirmas,
    dibujarQRWhatsApp,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto } from './helpers.js';
import { construirFilasItem, getLabelTipo, TABLE_HEAD_STYLES, TABLE_BODY_STYLES, makeDidDrawPage, dibujarObservaciones } from './pdfShared.js';

export async function generarPresupuestoVenta(doc, {
    ticketItems, cliente, sede, y, fecha, descuentoPorcentaje, nroDoc, leyenda = '', sinPrecios = false,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();
    const pct     = parseFloat(descuentoPorcentaje || 0);

    // Condiciones en columna derecha del bloque cliente (evita página separada)
    const condsVenta = [
        '· Valido por 7 dias corridos desde la fecha de emision.',
        '· Precios sujetos a disponibilidad de stock.',
        '· El pedido se prepara una vez confirmado el pago.',
        '· Forma de pago a coordinar al confirmar.',
    ].join('\n');
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: condsVenta, tituloDiag: 'CONDICIONES' });

    // Columnas: imagen | SKU | nombre+desc | cant | p.unit | p.desc | total línea
    const FOTO_W = 20;
    const FOTO_H = 20;
    const filas  = [];
    const fotos  = [];
    const metas  = []; // precios para cálculos en didParseCell

    for (const item of ticketItems) {
        for (const r of (item.repuestosUsados || [])) {
            const precioUnit   = Number(r.precio   || 0);
            const cant         = Number(r.cantidad || 1);
            const precioDesc   = pct > 0 ? precioUnit * (1 - pct / 100) : null;
            const totalLinea   = precioDesc !== null ? cant * precioDesc : cant * precioUnit;
            const desc         = (r.descripcion || '').trim();
            const nombreDesc   = desc ? `${r.nombre}\n${desc}` : (r.nombre || '—');

            if (sinPrecios) {
                filas.push(['', r.sku || '', nombreDesc, String(cant)]);
            } else {
                filas.push([
                    '',
                    r.sku || '',
                    nombreDesc,
                    String(cant),
                    `$ ${precioUnit.toLocaleString('es-AR')}`,
                    precioDesc !== null ? `$ ${precioDesc.toLocaleString('es-AR')}` : '—',
                    `$ ${totalLinea.toLocaleString('es-AR')}`,
                ]);
            }
            fotos.push(await cargarFoto(r.fotoUrl || null));
            metas.push({ tieneDesc: precioDesc !== null });
        }
        // Envío como línea separada (sin descuento, sin foto)
        const envio = parseFloat(item.costoExtra || 0);
        if (envio > 0) {
            if (sinPrecios) {
                filas.push(['', '', 'Envío', '1']);
            } else {
                filas.push(['', '', 'Envío', '1', `$ ${envio.toLocaleString('es-AR')}`, '—', `$ ${envio.toLocaleString('es-AR')}`]);
            }
            fotos.push(null);
            metas.push({ tieneDesc: false, isEnvio: true });
        }
    }

    if (filas.length > 0) {
        y = checkSalto(doc, y, 40);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('DETALLE DE PRODUCTOS', M, y);
        y += 5;

        const conDescuento = !sinPrecios && pct > 0;
        // Solo incluir columna imagen si al menos un repuesto tiene foto (ENVÍO nunca tiene foto)
        const hayFotosPV = fotos.some(f => f !== null);

        // Construye head y body según si hay fotos, descuento y sinPrecios
        let headBase, headFinal, bodyFinal;
        if (sinPrecios) {
            headBase  = ['SKU', 'Producto / Descripción', 'Cant.'];
            headFinal = hayFotosPV ? ['Imagen', ...headBase] : headBase;
            bodyFinal = filas.map((f, i) => {
                // f = ['', sku, nombre, cant] cuando sinPrecios
                const sinImg = f.slice(1);
                if (!hayFotosPV) return sinImg;
                if (metas[i]?.isEnvio) {
                    return [{ content: f[2], colSpan: 3 }, f[3]];
                }
                return [f[0], ...sinImg];
            });
        } else {
            headBase   = ['SKU', 'Producto / Descripción', 'Cant.', 'P. Unit.', ...(conDescuento ? ['P. c/Desc.'] : []), 'Total'];
            headFinal  = hayFotosPV ? ['Imagen', ...headBase] : headBase;
            bodyFinal = filas.map((f, i) => {
                const sinImg  = f.slice(1);
                const sinDesc = conDescuento ? sinImg : sinImg.filter((_, j) => j !== 4);
                if (!hayFotosPV) return sinDesc;
                if (metas[i]?.isEnvio) {
                    const [, , nombre, cant, pUnit, pDesc, total] = f;
                    return [
                        { content: nombre, colSpan: 3 },
                        cant, pUnit,
                        ...(conDescuento ? [pDesc] : []),
                        total,
                    ];
                }
                return [f[0], ...sinDesc];
            });
        }

        // columnStyles dinámico
        let colStylesPV;
        if (sinPrecios) {
            colStylesPV = hayFotosPV ? {
                0: { cellWidth: FOTO_W + 4 },
                1: { cellWidth: 22, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                2: { cellWidth: 'auto' },
                3: { halign: 'center', cellWidth: 14 },
            } : {
                0: { cellWidth: 22, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 14 },
            };
        } else if (hayFotosPV && conDescuento) {
            colStylesPV = {
                0: { cellWidth: FOTO_W + 4 },
                1: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                2: { cellWidth: 'auto' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right',  cellWidth: 22 },
                5: { halign: 'right',  cellWidth: 22, textColor: C.navy },
                6: { halign: 'right',  cellWidth: 24, fontStyle: 'bold' },
            };
        } else if (hayFotosPV) {
            colStylesPV = {
                0: { cellWidth: FOTO_W + 4 },
                1: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                2: { cellWidth: 'auto' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right',  cellWidth: 28 },
                5: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
            };
        } else if (conDescuento) {
            colStylesPV = {
                0: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right',  cellWidth: 22 },
                4: { halign: 'right',  cellWidth: 22, textColor: C.navy },
                5: { halign: 'right',  cellWidth: 24, fontStyle: 'bold' },
            };
        } else {
            colStylesPV = {
                0: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right',  cellWidth: 28 },
                4: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
            };
        }

        // Índice de columna imagen en la tabla final (depende de si hay fotos)
        const imgColIdx = hayFotosPV ? 0 : -1;
        // Índice de columna descuento en tabla final (para zebra override)
        const descColIdx = hayFotosPV ? (conDescuento ? 5 : -1) : (conDescuento ? 4 : -1);

        autoTable(doc, {
            startY: y,
            head:  [headFinal],
            body:  bodyFinal,
            theme: 'grid',
            headStyles: {
                fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
                fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
            },
            bodyStyles: {
                fontSize: T.xs, textColor: C.dark, valign: 'middle',
                cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
                lineColor: C.grayBorder, lineWidth: 0.1,
            },
            rowPageBreak: 'avoid',
            columnStyles: colStylesPV,
            margin: { left: M, right: M, top: HEADER_H.compact + 8 },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    dibujarHeaderCompacto(doc, { tipoLabel: getLabelTipo('PRESUPUESTO_VENTA', false), fecha, nroDoc });
                }
            },
            didParseCell: data => {
                if (data.section !== 'body') return;
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                // minCellHeight solo en filas con foto (no en ENVÍO ni repuestos sin imagen)
                if (hayFotosPV && fotos[data.row.index] !== null) {
                    data.cell.styles.minCellHeight = FOTO_H + 4;
                }
                // col descuento en gris si la fila no tiene descuento aplicado
                if (!sinPrecios && descColIdx >= 0 && data.column.index === descColIdx && !metas[data.row.index]?.tieneDesc) {
                    data.cell.styles.textColor = C.grayText;
                }
            },
            didDrawCell: data => {
                if (data.section === 'body' && data.column.index === imgColIdx && imgColIdx >= 0) {
                    const foto = fotos[data.row.index];
                    if (foto) {
                        const ix = data.cell.x + (data.cell.width - FOTO_W) / 2;
                        const iy = data.cell.y + (data.cell.height - FOTO_H) / 2;
                        doc.addImage(foto.data, foto.format, ix, iy, FOTO_W, FOTO_H);
                    }
                }
            },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    if (!sinPrecios) {
        // Subtotal bruto (productos + envío), descuento, total final
        const subtotalBruto = ticketItems.reduce((a, it) => {
            const prods = (it.repuestosUsados || []).reduce((s, r) => s + Number(r.precio || 0) * Number(r.cantidad || 1), 0);
            return a + prods + parseFloat(it.costoExtra || 0);
        }, 0);
        const descuentoMonto = pct > 0 ? subtotalBruto * pct / 100 : 0;
        const totalPV        = subtotalBruto - descuentoMonto;

        // Desglose subtotal → descuento → total
        if (pct > 0) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 4, y + 4.5);
            doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - M - 4, y + 4.5, { align: 'right' });
            y += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 4, y + 4.5);
            doc.text(`- $ ${descuentoMonto.toLocaleString('es-AR')}`, pageW - M - 4, y + 4.5, { align: 'right' });
            y += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, y, pageW - M, y);
            y += 2;
        }

        // Validez — calculada desde la fecha del documento
        const [dPV, mPV, aPV] = fecha.split('/').map(Number);
        const validezPV = new Date(aPV, mPV - 1, dPV + 7);

        // Total estimado + validez integrada
        doc.setFillColor(...C.goldLight);
        doc.setDrawColor(...C.gold);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, 'FD');
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.gold);
        doc.text('TOTAL ESTIMADO', M + 4, y + 5);
        doc.setFontSize(T.xl);
        doc.setTextColor(...C.navy);
        doc.text(`$ ${totalPV.toLocaleString('es-AR')}`, pageW - M - 4, y + 9.5, { align: 'right' });
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(`Válido hasta: ${validezPV.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 4, y + 13);
        y += 20;
    }

    // Leyenda / observaciones
    const leyLimpiaV = (leyenda || '').trim();
    if (leyLimpiaV) {
        y = checkSalto(doc, y, 20);
        const leyLinesV = doc.splitTextToSize(leyLimpiaV.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
        const leyHV = Math.min(leyLinesV.length, 4) * 4.2 + 11;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, leyHV, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('OBSERVACIONES', M + 2, y + 6);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        leyLinesV.slice(0, 4).forEach((l, i) => doc.text(l, M + 2, y + 11 + i * 4.2));
        y += leyHV + 4;
    }

    // Referencia y contacto (las condiciones comerciales ya están en el bloque cliente)
    y = checkSalto(doc, y, 10);
    const contactoPV = empresa.whatsapp || empresa.telefono || '';
    const partesPV = [];
    if (nroDoc) partesPV.push(`Ref: ${nroDoc}`);
    if (contactoPV) partesPV.push(`Contacto: ${contactoPV}`);
    if (partesPV.length > 0) {
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.line(M, y, pageW - M, y);
        y += 4;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(partesPV.join('   ·   '), M, y);
        y += 5;
    }

    return y;
}

export async function generarComprobante(doc, {
    ticketItems, cliente, sede, y, fecha, nroDoc, descuentoPorcentaje, leyenda, sinPrecios = false,
}) {
    const pageW   = doc.internal.pageSize.getWidth();

    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW });

    const PROD_W = 18;
    const PROD_H = 18;
    const filas  = [];
    const fotos  = [];

    for (const item of ticketItems) {
        for (const r of (item.repuestosUsados || [])) {
            const nombreConDesc = r.descripcion
                ? `${r.nombre}\n${r.descripcion}`
                : r.nombre;
            if (sinPrecios) {
                filas.push(['', nombreConDesc, r.sku || '', String(r.cantidad)]);
            } else {
                filas.push(['', nombreConDesc, r.sku || '', String(r.cantidad),
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal ?? r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            }
            fotos.push(await cargarFoto(r.fotoUrl || null));
        }
        // Envío como línea separada
        const envio = parseFloat(item.costoExtra || 0);
        if (envio > 0) {
            if (sinPrecios) {
                filas.push(['', 'Envío', '', '1']);
            } else {
                filas.push(['', 'Envío', '', '1', `$ ${envio.toLocaleString('es-AR')}`, `$ ${envio.toLocaleString('es-AR')}`]);
            }
            fotos.push(null);
        }
    }

    if (filas.length > 0) {
        // Mostrar columna imagen solo si hay al menos un producto con foto
        const hayFotosComp = fotos.some(f => f !== null);
        let headFinalComp, colStylesFinal;
        if (sinPrecios) {
            headFinalComp = hayFotosComp
                ? [['Imagen', 'Producto', 'SKU', 'Cant.']]
                : [['Producto', 'SKU', 'Cant.']];
            colStylesFinal = hayFotosComp ? {
                0: { cellWidth: PROD_W + 4 }, 1: { cellWidth: 'auto', overflow: 'linebreak' },
                2: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 22 },
                3: { halign: 'center', cellWidth: 16 },
            } : {
                0: { cellWidth: 'auto', overflow: 'linebreak' },
                1: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 22 },
                2: { halign: 'center', cellWidth: 16 },
            };
        } else {
            headFinalComp = hayFotosComp
                ? [['Imagen', 'Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']]
                : [['Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']];
            colStylesFinal = hayFotosComp ? {
                0: { cellWidth: PROD_W + 4 }, 1: { cellWidth: 'auto', overflow: 'linebreak' },
                2: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 18 },
                3: { halign: 'center', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
            } : {
                0: { cellWidth: 'auto', overflow: 'linebreak' },
                1: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 18 },
                2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
            };
        }
        const bodyFinal = filas.map(f => hayFotosComp ? f : f.slice(1));

        y = checkSalto(doc, y, 40);
        autoTable(doc, {
            startY: y,
            head:  headFinalComp,
            body:  bodyFinal,
            theme: 'grid',
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
            bodyStyles: {
                fontSize: T.xs, textColor: C.dark, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
                valign: 'middle', lineColor: C.grayBorder, lineWidth: 0.1, overflow: 'linebreak',
                ...(hayFotosComp ? { minCellHeight: PROD_H + 4 } : {}),
            },
            rowPageBreak: 'avoid',
            columnStyles: colStylesFinal,
            margin: { left: M, right: M, top: HEADER_H.compact + 8 },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    dibujarHeaderCompacto(doc, { tipoLabel: getLabelTipo('COMPROBANTE', false), fecha, nroDoc });
                }
            },
            didParseCell: data => { if (data.section === 'body' && data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra; },
            didDrawCell: hayFotosComp ? (data => {
                if (data.section === 'body' && data.column.index === 0) {
                    const foto = fotos[data.row.index];
                    if (foto) {
                        const ix = data.cell.x + (data.cell.width - PROD_W) / 2;
                        const iy = data.cell.y + (data.cell.height - PROD_H) / 2;
                        doc.addImage(foto.data, foto.format, ix, iy, PROD_W, PROD_H);
                    }
                }
            }) : undefined,
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    if (!sinPrecios) {
        const subtotalTotal = ticketItems.reduce(
            (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
        );
        const pct       = parseFloat(descuentoPorcentaje || 0);
        const descuento = pct > 0 ? subtotalTotal * pct / 100 : 0;
        const total     = subtotalTotal - descuento;

        // Desglose subtotal → descuento → total
        if (pct > 0) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 4, y + 4.5);
            doc.text(`$ ${subtotalTotal.toLocaleString('es-AR')}`, pageW - M - 4, y + 4.5, { align: 'right' });
            y += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 4, y + 4.5);
            doc.text(`- $ ${descuento.toLocaleString('es-AR')}`, pageW - M - 4, y + 4.5, { align: 'right' });
            y += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, y, pageW - M, y);
            y += 2;
        }

        // Total
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, 13, 2, 2, 'FD');
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('TOTAL', M + 4, y + 5.5);
        doc.setFontSize(T.xl);
        doc.setTextColor(...C.navy);
        doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M - 4, y + 10, { align: 'right' });
        y += 18;
    }

    // Leyenda / observaciones del comprobante
    const leyLimpiaC = (leyenda || '').trim();
    if (leyLimpiaC) {
        y = checkSalto(doc, y, 20);
        const leyLinesC = doc.splitTextToSize(leyLimpiaC.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
        const leyHC = Math.min(leyLinesC.length, 4) * 4.2 + 11;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, leyHC, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('OBSERVACIONES', M + 2, y + 6);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        leyLinesC.slice(0, 4).forEach((l, i) => doc.text(l, M + 2, y + 11 + i * 4.2));
        y += leyHC + 4;
    }

    return y;
}
