// Generadores PDF para servicio tecnico (single y multi equipo)
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W, HEADER_H } from './theme.js';
import { dibujarHeaderCompacto } from './layout.js';
import {
    dibujarBloqueClienteEquipo,
    dibujarBloqueEquipoYTrabajo,
    dibujarBloqueDiagnosticoDetalle,
    dibujarChecklist,
    dibujarFirmas,
    dibujarRegistroFotografico,
    dibujarCondiciones,
    dibujarCondicionesCompactas,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto } from './helpers.js';
import { dibujarPaginaEvidencia } from './fotos.js';
import { construirFilasItem, getLabelTipo, TABLE_HEAD_STYLES, TABLE_BODY_STYLES, makeDidDrawPage } from './pdfShared.js';

export async function generarSingleTecnico(doc, {
    item, cliente, sede, tipo, y, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, aclaracionCliente = '', garantiaTexto, proximoMantenimiento,
    incluirFirmas = true, descuentoPorcentaje = 0, leyenda = '', sinPrecios = false,
}) {
    const pageW = doc.internal.pageSize.getWidth();

    // Cargar fotos
    const [fotoA, fotoD] = await Promise.all([
        cargarFoto(item.fotoAntes),
        cargarFoto(item.fotoDespues),
    ]);

    // Bloque cliente | equipo en columna derecha (si tiene serial real); si no, full-width
    const tieneEquipoReal = item.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial);
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: tieneEquipoReal ? item : null, y, pageW, diagnostico: null });

    // Trabajo realizado: bloque propio si el equipo ya está en columna derecha; combinado si no
    const diagDetalle = sanitizarTexto(item.trabajo || item.resumenTexto || item.trabajoRealizado || item.observaciones || '');
    if (tieneEquipoReal) {
        if (diagDetalle) {
            y = checkSalto(doc, y, 20);
            y = dibujarBloqueDiagnosticoDetalle(doc, { texto: diagDetalle, y, pageW, titulo: '• TRABAJO REALIZADO' });
        }
    } else {
        y = checkSalto(doc, y, 36);
        y = dibujarBloqueEquipoYTrabajo(doc, {
            item, trabajo: diagDetalle, y, pageW,
            fotoAntes: (fotoA && fotoD) ? fotoA : null,
            tituloTrabajo: '• TRABAJO REALIZADO',
            barraColor: C.navy,
        });
    }

    const totalEquipo = parseFloat(item.totalCalculado || item.costo || 0);

    const filas = construirFilasItem(item);
    // Concepto MO más específico: usar el trabajo real en lugar del genérico (solo reparaciones)
    if (filas.length > 0 && filas[0].esServicio && item.trabajo?.trim() && !item.esVisita) {
        const t = item.trabajo.trim();
        filas[0].concepto = t.length > 55 ? t.substring(0, 52) + '...' : t;
    }
    // Sin ítems → mostrar fila placeholder profesional
    const filasConPlaceholder = filas.length > 0 ? filas : [{
        concepto: 'Servicio de diagnostico tecnico', cant: 1,
        unitario: 'A coordinar', importe: 'A coordinar', esServicio: true,
    }];
    const sinItems = filas.length === 0;

    // Cargar fotos de los repuestos (MO no tiene imagen)
    const FOTO_ST_W = 18;
    const FOTO_ST_H = 18;
    const fotosST = [];
    let repIdx = 0;
    for (const f of filasConPlaceholder) {
        if (f.esServicio) {
            fotosST.push(null);
        } else {
            const rep = (item.repuestosUsados || [])[repIdx++];
            fotosST.push(await cargarFoto(rep?.fotoUrl || null));
        }
    }
    const hayFotosST = fotosST.some(f => f !== null);

    const tableData = filasConPlaceholder.map(r => {
        const cantStr    = String(r.cant);
        const unitStr    = r.unitario.startsWith('A') ? r.unitario : `$ ${r.unitario}`;
        const importeStr = r.importe.startsWith('A')  ? r.importe  : `$ ${r.importe}`;
        // MO sin imagen: concepto ocupa columna imagen+concepto (colSpan 2) para no dejar celda vacía
        if (hayFotosST && r.esServicio) {
            const row = [
                { content: r.concepto, colSpan: 2, styles: { textColor: C.navy, fontStyle: 'bold', fontSize: T.xs } },
                cantStr,
            ];
            if (!sinPrecios) row.push(unitStr, importeStr);
            return row;
        }
        const fila = sinPrecios ? [r.concepto, cantStr] : [r.concepto, cantStr, unitStr, importeStr];
        if (hayFotosST) fila.unshift('');
        return fila;
    });

    const headColsST = sinPrecios
        ? (hayFotosST ? ['Img', 'CONCEPTO', 'CANT'] : ['CONCEPTO', 'CANT'])
        : (hayFotosST ? ['Img', 'CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE'] : ['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']);

    autoTable(doc, {
        startY: y,
        head:  [headColsST],
        body:  tableData,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
            ...(hayFotosST ? { valign: 'middle' } : {}),
        },
        columnStyles: hayFotosST ? (sinPrecios ? {
            0: { cellWidth: FOTO_ST_W + 4 },
            1: { cellWidth: 'auto', overflow: 'linebreak' },
            2: { halign: 'center', cellWidth: 13 },
        } : {
            0: { cellWidth: FOTO_ST_W + 4 },
            1: { cellWidth: 'auto', overflow: 'linebreak' },
            2: { halign: 'center', cellWidth: 13 },
            3: { halign: 'right',  cellWidth: 26 },
            4: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        }) : (sinPrecios ? {
            0: { cellWidth: 'auto', overflow: 'linebreak' },
            1: { halign: 'center', cellWidth: 13 },
        } : {
            0: { cellWidth: 'auto', overflow: 'linebreak' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 26 },
            3: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        }),
        rowPageBreak: 'avoid',
        margin: { left: M, right: M, top: HEADER_H.compact + 8 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                dibujarHeaderCompacto(doc, { tipoLabel: getLabelTipo(tipo, false), fecha, nroDoc });
            }
        },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                const col = hayFotosST ? 1 : 0;
                if (data.column.index >= col && filasConPlaceholder[data.row.index]?.esServicio) {
                    data.cell.styles.textColor = C.navy;
                }
                // Altura mínima solo para filas con foto (MO no tiene imagen)
                if (hayFotosST && fotosST[data.row.index] !== null) {
                    data.cell.styles.minCellHeight = FOTO_ST_H + 4;
                }
            }
        },
        didDrawCell: hayFotosST ? (data => {
            if (data.section === 'body' && data.column.index === 0) {
                const foto = fotosST[data.row.index];
                if (foto) {
                    const ix = data.cell.x + (data.cell.width  - FOTO_ST_W) / 2;
                    const iy = data.cell.y + (data.cell.height - FOTO_ST_H) / 2;
                    doc.addImage(foto.data, foto.format, ix, iy, FOTO_ST_W, FOTO_ST_H);
                }
            }
        }) : undefined,
    });

    let tableEndY = doc.lastAutoTable.finalY + 3;

    if (!sinPrecios) {
        // Desglose subtotal → descuento → total
        const pct = parseFloat(descuentoPorcentaje || 0);
        const descuentoMonto = (!sinItems && pct > 0) ? Math.round(totalEquipo * pct / 100) : 0;
        const totalFinal = totalEquipo - descuentoMonto;
        const totalLabel = sinItems ? 'A coordinar con el cliente' : `$ ${totalFinal.toLocaleString('es-AR')}`;

        if (pct > 0 && !sinItems) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 3, tableEndY + 4.5);
            doc.text(`$ ${totalEquipo.toLocaleString('es-AR')}`, pageW - M - 2, tableEndY + 4.5, { align: 'right' });
            tableEndY += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 3, tableEndY + 4.5);
            doc.text(`- $ ${descuentoMonto.toLocaleString('es-AR')}`, pageW - M - 2, tableEndY + 4.5, { align: 'right' });
            tableEndY += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, tableEndY, pageW - M, tableEndY);
            tableEndY += 2;
        }

        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, tableEndY, CONTENT_W, 13, 1.5, 1.5, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('TOTAL DEL SERVICIO', M + 3, tableEndY + 5.5);
        doc.setFontSize(sinItems ? T.xs : T.md);
        doc.setTextColor(...C.navy);
        doc.text(totalLabel, pageW - M - 2, tableEndY + 10, { align: 'right' });
        tableEndY += 18;
    }
    y = tableEndY;

    // Registro fotográfico — umbral reducido acorde al nuevo tamaño de foto
    if (fotoA || fotoD) {
        const pageH = doc.internal.pageSize.getHeight();
        if (y + 65 > pageH - 25) {
            doc.addPage();
            dibujarHeaderCompacto(doc, { tipoLabel: getLabelTipo(tipo, false), fecha, nroDoc });
            y = HEADER_H.compact + 8;
        }
        y = dibujarRegistroFotografico(doc, { y, fotoA, fotoD });
    }

    // Checklist
    const checklist = item.checklist || [];
    if (checklist.length > 0) {
        y = checkSalto(doc, y, 40);
        y = dibujarChecklist(doc, { y, items: checklist, pageW });
    }

    // Próximo mantenimiento
    if (proximoMantenimiento) {
        y = checkSalto(doc, y, 20);
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.3);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, 14, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('PRÓXIMO MANTENIMIENTO SUGERIDO', M + 2, y + 5);
        doc.setFontSize(T.sm);
        doc.setTextColor(...C.dark);
        doc.text(proximoMantenimiento, pageW - M, y + 5, { align: 'right' });
        y += 19;
    }

    // Condiciones del servicio (leyenda ingresada en el formulario)
    // Evitar duplicar si la leyenda es igual al texto de garantía
    const textoGar = garantiaTexto || '90 días sobre mano de obra  ·  Repuestos según fabricante';
    const leyLimpia = (leyenda || '').trim();
    const esGarantiaDefault = leyLimpia.toLowerCase().replace(/[·\-–—]/g, '').replace(/\s+/g, ' ')
        .includes('90 d') && leyLimpia.toLowerCase().includes('mano de obra');
    if (leyLimpia && !esGarantiaDefault) {
        y = checkSalto(doc, y, 20);
        const leyLines = doc.splitTextToSize(leyLimpia.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
        const leyH = Math.min(leyLines.length, 4) * 4.2 + 11;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, leyH, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('OBSERVACIONES', M + 2, y + 6);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        leyLines.slice(0, 4).forEach((l, i) => doc.text(l, M + 2, y + 11 + i * 4.2));
        y += leyH + 4;
    }

    // Garantía compacta (1 línea) + firmas — intentar en misma página, si no cabe omitir garantía antes de crear página
    const firmasH = incluirFirmas ? 44 : 0;
    const pageHS = doc.internal.pageSize.getHeight();
    const cabeGarYFirmas = y + 14 + firmasH < pageHS - 18;
    const cabeSoloFirmas = y + firmasH < pageHS - 18;

    if (!cabeGarYFirmas && cabeSoloFirmas) {
        // Firmas caben pero garantía+firmas no → poner solo firmas sin garantía separada
        if (incluirFirmas) {
            y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, aclaracionCliente, esPresupuesto: false });
        }
    } else {
        y = checkSalto(doc, y, 14 + firmasH);
        // Garantía inline
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.line(M, y, pageW - M, y);
        y += 4;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('GARANTÍA:', M, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(textoGar, M + 20, y);
        y += 6;
        if (incluirFirmas) {
            y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, aclaracionCliente, esPresupuesto: false });
        }
    }

    return y;
}

export async function generarMultiTecnico(doc, {
    ticketItems, cliente, sede, tipo, fecha, nroDoc, tecnico, y: yInicial,
    firmaCliente, firmaTecnico, aclaracionCliente = '', garantiaTexto, leyenda,
    incluirFirmas = true, descuentoPorcentaje = 0, sinPrecios = false,
}) {
    const pageW   = doc.internal.pageSize.getWidth();

    // ── Página 1: Resumen ejecutivo ──────────────────────────────────────────
    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );

    let y = yInicial ?? (HEADER_H.compact + 8);

    // Bloque cliente con resumen inline (ahorra 22mm del bloque resumen separado)
    const resumenTextoMT = sinPrecios
        ? `${ticketItems.length} equipos atendidos`
        : `${ticketItems.length} equipos atendidos\nTotal: $ ${subtotalTotal.toLocaleString('es-AR')}`;
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: resumenTextoMT, tituloDiag: 'RESUMEN' });

    // Garantía compacta + firmas
    const firmasHM = incluirFirmas ? 44 : 0;
    y = checkSalto(doc, y, 14 + firmasHM);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.15);
    doc.line(M, y, pageW - M, y);
    y += 4;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('GARANTÍA:', M, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(garantiaTexto || '90 días sobre mano de obra  ·  Repuestos según fabricante', M + 20, y);
    y += 6;
    if (incluirFirmas) {
        y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, aclaracionCliente, esPresupuesto: false });
    }

    // ── Detalle técnico por equipos (continúa en misma página, autoTable pagina solo) ──
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE TÉCNICO POR EQUIPOS', M, y);
    y += 5;

    const bodyRows = [];

    ticketItems.forEach((item, idx) => {
        const modelo  = item.modeloEquipo  || item.equipoModelo  || 'Dispenser';
        const marca   = item.marcaEquipo   || item.equipoMarca   || null;
        const serial  = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? item.equipoSerial : null;
        const ubic    = item.ubicacionEquipo || item.equipoUbicacion || null;
        const piso    = item.equipoPiso    || null;
        const sector  = item.equipoSector  || null;

        const linPisoSec = [piso ? `Piso: ${piso}` : null, sector ? `Sec: ${sector}` : null].filter(Boolean).join(' · ');
        const equipoCell = [
            `${idx + 1}. ${[marca, modelo].filter(Boolean).join(' ')}`,
            serial ? `S/N: ${serial}` : null,
            ubic   ? `Ubic: ${ubic}` : null,
            linPisoSec || null,
        ].filter(Boolean).join('\n');

        // Trabajo (mano de obra)
        const mo   = parseFloat(item.costoExtra) || 0;
        const desc = (item.trabajo || item.trabajoRealizado || '').trim();
        const partesMO = [];
        if (desc) partesMO.push(desc);
        if (!sinPrecios && mo > 0) partesMO.push(`MO: $${mo.toLocaleString('es-AR')}`);
        const trabajoCell = partesMO.length > 0 ? partesMO.join('\n') : '—';

        // Repuestos: una línea por ítem
        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => {
                if (sinPrecios) return `· ${r.nombre} (x${r.cantidad})`;
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                return `· ${r.nombre} (x${r.cantidad}) — $${sub.toLocaleString('es-AR')}`;
              }).join('\n')
            : '—';

        if (sinPrecios) {
            bodyRows.push([equipoCell, trabajoCell, repCell]);
        } else {
            const sub = parseFloat(item.totalCalculado || item.costo || 0);
            const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar';
            bodyRows.push([equipoCell, trabajoCell, repCell, importeCell]);
        }
    });

    const headMT = sinPrecios
        ? [['EQUIPO', 'TRABAJO INCLUIDO', 'REPUESTOS INCLUIDOS']]
        : [['EQUIPO', 'TRABAJO INCLUIDO', 'REPUESTOS INCLUIDOS', 'IMPORTE']];

    autoTable(doc, {
        startY: y,
        head:  headMT,
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark, valign: 'top',
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: sinPrecios ? {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 50 },
            2: { cellWidth: 'auto' },
        } : {
            0: { cellWidth: 42, fontStyle: 'bold' },
            1: { cellWidth: 37 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy },
        },
        margin: { left: M, right: M, top: HEADER_H.compact + 8 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                dibujarHeaderCompacto(doc, { tipoLabel: 'DETALLE TÉCNICO POR EQUIPOS', fecha, nroDoc });
            }
        },
        didParseCell: data => {
            if (data.section !== 'body') return;
            if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
        },
    });

    y = doc.lastAutoTable.finalY + 4;

    if (!sinPrecios) {
        // Desglose subtotal → descuento → total
        const pctM = parseFloat(descuentoPorcentaje || 0);
        const descuentoM = pctM > 0 ? Math.round(subtotalTotal * pctM / 100) : 0;
        const totalFinalM = subtotalTotal - descuentoM;

        if (pctM > 0) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 4, y + 4.5);
            doc.text(`$ ${subtotalTotal.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
            y += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pctM}%`, M + 4, y + 4.5);
            doc.text(`- $ ${descuentoM.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
            y += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, y, pageW - M, y);
            y += 2;
        }

        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.4);
        doc.roundedRect(M, y, CONTENT_W, 13, 2, 2, 'FD');
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('TOTAL FACTURADO', M + 4, y + 5.5);
        doc.setFontSize(T.xl);
        doc.setTextColor(...C.navy);
        doc.text(`$ ${totalFinalM.toLocaleString('es-AR')}`, pageW - M, y + 10, { align: 'right' });
        y += 18;
    }

    // Condiciones del servicio (leyenda) — solo si caben y no duplican la garantía
    const leyLimpiaM = (leyenda || '').trim();
    const esGarantiaDefaultM = leyLimpiaM.toLowerCase().replace(/[·\-–—]/g, '').replace(/\s+/g, ' ')
        .includes('90 d') && leyLimpiaM.toLowerCase().includes('mano de obra');
    if (leyLimpiaM && !esGarantiaDefaultM) {
        const leyLinesM = doc.splitTextToSize(leyLimpiaM.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
        const leyHM = Math.min(leyLinesM.length, 4) * 4.2 + 11;
        const pageHM = doc.internal.pageSize.getHeight();
        // Solo dibujar si cabe antes del footer (pageH - 18); si no cabe, omitir (ya está la garantía en el resumen)
        if (y + leyHM < pageHM - 18) {
            doc.setFillColor(...C.grayLight);
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.2);
            doc.roundedRect(M - 2, y, CONTENT_W + 4, leyHM, 2, 2, 'FD');
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text('OBSERVACIONES', M + 2, y + 6);
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            leyLinesM.slice(0, 4).forEach((l, i) => doc.text(l, M + 2, y + 11 + i * 4.2));
            y += leyHM + 4;
        }
    }

    // ── Página de evidencia fotográfica ──────────────────────────────────────
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc);
}
