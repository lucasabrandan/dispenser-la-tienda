// Generadores PDF para presupuestos (single y multi equipo)
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W, HEADER_H, getEmpresa } from './theme.js';
import { dibujarHeaderCompacto } from './layout.js';
import {
    dibujarBloqueClienteEquipo,
    dibujarBloqueEquipoYTrabajo,
    dibujarBloqueSolicitud,
    dibujarCondicionesCompactas,
    dibujarCondicionesYCTA,
    dibujarRegistroFotografico,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto, fitEnCaja } from './helpers.js';
import { dibujarPaginaEvidencia } from './fotos.js';
import { construirFilasItem, getLabelTipo, TABLE_HEAD_STYLES, TABLE_BODY_STYLES, makeDidDrawPage } from './pdfShared.js';

export async function generarSinglePresupuesto(doc, {
    item, cliente, sede, y, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, descuentoPorcentaje, incluirFirmas = true, sinPrecios = false, fechaVisita = null,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Cargar fotos: ambas independientemente para no perder fotos del cliente
    const [fotoAntes, fotoDespues] = await Promise.all([
        cargarFoto(item.fotoAntes || item.fotoEquipo || null),
        cargarFoto(item.fotoDespues || null),
    ]);

    // Bloque cliente | equipo en columnas (si hay equipo real); si no, cliente full-width
    const tieneEquipoReal = item.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial);
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: tieneEquipoReal ? item : null, y, pageW, diagnostico: null });

    // Trabajo / solicitud en bloque propio debajo (si tiene equipo real, ya no va en dibujarBloqueEquipoYTrabajo)
    const diagnostico = sanitizarTexto(item.trabajo || item.resumenTexto || item.descripcion || '');
    if (tieneEquipoReal) {
        if (diagnostico) {
            y = checkSalto(doc, y, 20);
            y = dibujarBloqueSolicitud(doc, { texto: diagnostico, y, pageW });
        }
    } else {
        y = checkSalto(doc, y, 36);
        y = dibujarBloqueEquipoYTrabajo(doc, { item, trabajo: diagnostico, y, pageW, fotoAntes });
    }

    // Tabla de precios
    const filas = construirFilasItem(item);
    const totalBruto = parseFloat(item.totalCalculado || item.costo || 0);
    const pct        = parseFloat(descuentoPorcentaje || 0);
    const descuento  = pct > 0 ? totalBruto * pct / 100 : 0;
    const total      = totalBruto - descuento;

    const filasConPlaceholder = filas.length > 0 ? filas : [{
        concepto: 'Servicio tecnico — Diagnostico y presupuesto', cant: 1,
        unitario: 'A coordinar', importe: 'A coordinar', esServicio: true,
    }];
    const sinItems = filas.length === 0;

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE CONCEPTOS', M, y);
    y += 5;

    // Cargar fotos de los repuestos (MO no tiene imagen)
    const FOTO_SP_W = 18;
    const FOTO_SP_H = 18;
    const fotosSP = [];
    let repIdxSP = 0;
    for (const f of filasConPlaceholder) {
        if (f.esServicio) {
            fotosSP.push(null);
        } else {
            const rep = (item.repuestosUsados || [])[repIdxSP++];
            fotosSP.push(await cargarFoto(rep?.fotoUrl || null));
        }
    }
    const hayFotosSP = fotosSP.some(f => f !== null);

    const tableDataP = filasConPlaceholder.map(r => {
        const cantStr    = String(r.cant);
        const unitStr    = r.unitario.startsWith('A') ? r.unitario : `$ ${r.unitario}`;
        const importeStr = r.importe.startsWith('A')  ? r.importe  : `$ ${r.importe}`;
        // MO sin imagen: concepto ocupa columna imagen+concepto (colSpan 2) para no dejar celda vacía
        if (hayFotosSP && r.esServicio) {
            const row = [
                { content: r.concepto, colSpan: 2, styles: { textColor: C.navy, fontStyle: 'bold', fontSize: T.xs } },
                cantStr,
            ];
            if (!sinPrecios) row.push(unitStr, importeStr);
            return row;
        }
        const fila = sinPrecios ? [r.concepto, cantStr] : [r.concepto, cantStr, unitStr, importeStr];
        if (hayFotosSP) fila.unshift('');
        return fila;
    });

    const headColsSP = sinPrecios
        ? (hayFotosSP ? ['Img', 'CONCEPTO', 'CANT'] : ['CONCEPTO', 'CANT'])
        : (hayFotosSP ? ['Img', 'CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE'] : ['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']);

    autoTable(doc, {
        startY: y,
        head:  [headColsSP],
        body:  tableDataP,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
            ...(hayFotosSP ? { valign: 'middle' } : {}),
        },
        columnStyles: hayFotosSP ? (sinPrecios ? {
            0: { cellWidth: FOTO_SP_W + 4 },
            1: { cellWidth: 'auto', overflow: 'linebreak' },
            2: { halign: 'center', cellWidth: 13 },
        } : {
            0: { cellWidth: FOTO_SP_W + 4 },
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
                dibujarHeaderCompacto(doc, { tipoLabel: getLabelTipo('PRESUPUESTO', false), fecha, nroDoc });
            }
        },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                const col = hayFotosSP ? 1 : 0;
                if (data.column.index >= col && filasConPlaceholder[data.row.index]?.esServicio) {
                    data.cell.styles.textColor = C.navy;
                }
                // Altura mínima solo para filas con foto (MO no tiene imagen)
                if (hayFotosSP && fotosSP[data.row.index] !== null) {
                    data.cell.styles.minCellHeight = FOTO_SP_H + 4;
                }
            }
        },
        didDrawCell: hayFotosSP ? (data => {
            if (data.section === 'body' && data.column.index === 0) {
                const foto = fotosSP[data.row.index];
                if (foto) {
                    const ix = data.cell.x + (data.cell.width  - FOTO_SP_W) / 2;
                    const iy = data.cell.y + (data.cell.height - FOTO_SP_H) / 2;
                    doc.addImage(foto.data, foto.format, ix, iy, FOTO_SP_W, FOTO_SP_H);
                }
            }
        }) : undefined,
    });

    let presupTableEndY = doc.lastAutoTable.finalY + 3;

    if (!sinPrecios) {
        const totalPresupLabel = sinItems ? 'A coordinar con el cliente' : total.toLocaleString('es-AR');

        // Desglose subtotal → descuento → total
        if (pct > 0 && !sinItems) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 3, presupTableEndY + 4.5);
            doc.text(`$ ${totalBruto.toLocaleString('es-AR')}`, pageW - M - 2, presupTableEndY + 4.5, { align: 'right' });
            presupTableEndY += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 3, presupTableEndY + 4.5);
            doc.text(`- $ ${descuento.toLocaleString('es-AR')}`, pageW - M - 2, presupTableEndY + 4.5, { align: 'right' });
            presupTableEndY += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, presupTableEndY, pageW - M, presupTableEndY);
            presupTableEndY += 2;
        }

        // Validez — calculada desde la fecha del documento
        const [dSP, mSP, aSP] = fecha.split('/').map(Number);
        const validezSP = new Date(aSP, mSP - 1, dSP + 7);

        // Caja total + validez + fecha visita integrada
        const tieneFechaVisita = fechaVisita && fechaVisita.trim();
        const cajaH = tieneFechaVisita ? 21 : 16;
        doc.setFillColor(...C.goldLight);
        doc.setDrawColor(...C.gold);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, presupTableEndY, CONTENT_W, cajaH, 1.5, 1.5, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.gold);
        doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 3, presupTableEndY + 5);
        doc.setFontSize(sinItems ? T.xs : T.md);
        doc.setTextColor(...C.navy);
        doc.text(sinItems ? totalPresupLabel : `$ ${totalPresupLabel}`, pageW - M - 2, presupTableEndY + 9.5, { align: 'right' });
        // Validez dentro de la caja
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(`Válido hasta: ${validezSP.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 3, presupTableEndY + 13);
        // Fecha estimativa de visita
        if (tieneFechaVisita) {
            const [aV, mV, dV] = fechaVisita.split('-');
            const fechaVisitaStr = dV && mV ? `${dV}/${mV}${aV ? '/' + aV : ''}` : fechaVisita;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text(`Fecha estimativa de visita: ${fechaVisitaStr}`, M + 3, presupTableEndY + 17.5);
        }
        presupTableEndY += cajaH + 4;
    }
    y = presupTableEndY;

    // Registro fotográfico + condiciones: intentar que todo quede en la misma página
    const pageHSP = doc.internal.pageSize.getHeight();
    const espacioRestante = pageHSP - 25 - y; // 25mm margen inferior
    const necesitaCondiciones = 14; // condiciones compactas

    if (tieneEquipoReal && (fotoAntes || fotoDespues)) {
        // Usar fotos compactas si no hay espacio suficiente para normales + condiciones
        const compacto = espacioRestante < (84 + necesitaCondiciones);
        y = dibujarRegistroFotografico(doc, { y, fotoA: fotoAntes, fotoD: fotoDespues, esPresupuesto: true, compacto });
    } else if (!tieneEquipoReal && (fotoAntes || fotoDespues)) {
        const fotoEv = fotoAntes || fotoDespues;
        const esHz = fotoEv.w && fotoEv.h && fotoEv.w > fotoEv.h;
        const compacto = espacioRestante < (84 + necesitaCondiciones);
        const bw = esHz ? (compacto ? 74 : 88) : (compacto ? 42 : 56);
        const bh = esHz ? (compacto ? 56 : 66) : (compacto ? 56 : 74);
        y = checkSalto(doc, y, bh + 13);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('FOTOGRAFÍA DEL EQUIPO', M, y);
        y += 5;
        const { w: fW, h: fH } = fitEnCaja(fotoEv.w, fotoEv.h, bw, bh);
        const offX = (bw - fW) / 2;
        const offY = (bh - fH) / 2;
        const xCentro = M + (CONTENT_W - bw) / 2;
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(xCentro + 1.5, y + 1.5, bw, bh, 2, 2, 'F');
        try { doc.addImage(fotoEv.data, fotoEv.format, xCentro + offX, y + offY, fW, fH); } catch {}
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(xCentro, y, bw, bh, 2, 2, 'S');
        y += bh + 8;
    }

    // Condiciones compactas — siempre en la misma página que el contenido
    y = dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc, esVisita: item.esVisita || false });

    return y;
}

export async function generarMultiPresupuesto(doc, {
    ticketItems, cliente, sede, fecha, nroDoc, tecnico, y: yInicial,
    firmaCliente, firmaTecnico, incluirFirmas = true, descuentoPorcentaje, leyenda, sinPrecios = false, fechaVisita = null,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    let y = yInicial ?? (HEADER_H.compact + 8);

    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );
    const pct       = parseFloat(descuentoPorcentaje || 0);
    const descuento = pct > 0 ? subtotalTotal * pct / 100 : 0;
    const total     = subtotalTotal - descuento;

    // Bloque cliente — con resumen inline en columna derecha (ahorra 22mm del bloque resumen)
    const resumenTextoP = sinPrecios
        ? `${ticketItems.length} equipos`
        : `${ticketItems.length} equipos\nTotal estimado: $ ${total.toLocaleString('es-AR')}`;
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: resumenTextoP, tituloDiag: 'RESUMEN' });

    // Detectar si todos los equipos tienen el mismo trabajo → mostrar una sola vez arriba de la tabla
    const trabajos = ticketItems.map(it => (it.trabajo || it.trabajoRealizado || '').trim()).filter(Boolean);
    const trabajoComun = trabajos.length > 0 && trabajos.every(t => t === trabajos[0]) ? trabajos[0] : null;
    if (trabajoComun) {
        y = dibujarBloqueSolicitud(doc, { texto: trabajoComun, y, pageW });
    }

    // Construir filas de la tabla
    const bodyRows = [];
    ticketItems.forEach((item, idx) => {
        const modelo = item.modeloEquipo  || item.equipoModelo  || 'Dispenser';
        const marca  = item.marcaEquipo   || item.equipoMarca   || null;
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? item.equipoSerial : null;
        const ubic   = item.ubicacionEquipo || item.equipoUbicacion || null;
        const piso   = item.equipoPiso    || null;
        const sector = item.equipoSector  || null;

        const linPisoSec = [piso ? `Piso: ${piso}` : null, sector ? `Sec: ${sector}` : null].filter(Boolean).join(' · ');
        const equipoCell = [
            `${idx + 1}. ${[marca, modelo].filter(Boolean).join(' ')}`,
            serial ? `S/N: ${serial}` : null,
            ubic   ? `Ubic: ${ubic}` : null,
            linPisoSec || null,
        ].filter(Boolean).join('\n');

        // Trabajo (mano de obra con precio)
        const mo   = parseFloat(item.costoExtra) || 0;
        const desc = (item.trabajo || item.trabajoRealizado || '').trim();
        const partesMO = [];
        if (desc) partesMO.push(desc);
        if (!sinPrecios && mo > 0) partesMO.push(`MO: $${mo.toLocaleString('es-AR')}`);
        const trabajoCell = partesMO.length > 0 ? partesMO.join('\n') : '—';

        // Repuestos con precio
        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => {
                if (sinPrecios) return `· ${r.nombre} (x${r.cantidad})`;
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                return `· ${r.nombre} (x${r.cantidad}) — $${sub.toLocaleString('es-AR')}`;
              }).join('\n')
            : '—';

        if (sinPrecios) {
            if (trabajoComun) {
                bodyRows.push([equipoCell, repCell]);
            } else {
                bodyRows.push([equipoCell, trabajoCell, repCell]);
            }
        } else {
            const sub = parseFloat(item.totalCalculado || item.costo || 0);
            const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar';
            if (trabajoComun) {
                bodyRows.push([equipoCell, repCell, importeCell]);
            } else {
                bodyRows.push([equipoCell, trabajoCell, repCell, importeCell]);
            }
        }
    });

    const tipoLabelTabla = 'PRESUPUESTO — MÚLTIPLES EQUIPOS';

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE EQUIPOS Y CONCEPTOS', M, y);
    y += 5;

    const headCols  = sinPrecios
        ? (trabajoComun
            ? [['EQUIPO', 'REPUESTOS ESTIMADOS']]
            : [['EQUIPO', 'TRABAJO ESTIMADO', 'REPUESTOS ESTIMADOS']])
        : (trabajoComun
            ? [['EQUIPO', 'REPUESTOS ESTIMADOS', 'IMPORTE']]
            : [['EQUIPO', 'TRABAJO ESTIMADO', 'REPUESTOS ESTIMADOS', 'IMPORTE']]);
    const colStyles = sinPrecios
        ? (trabajoComun
            ? { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } }
            : { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } })
        : (trabajoComun
            ? { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy } }
            : { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 35 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy } });

    autoTable(doc, {
        startY: y,
        head:  headCols,
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark, valign: 'top',
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: colStyles,
        // Dejar espacio para el header compacto en páginas siguientes
        margin: { left: M, right: M, top: HEADER_H.compact + 8 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                dibujarHeaderCompacto(doc, { tipoLabel: tipoLabelTabla, fecha, nroDoc });
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
        if (pct > 0) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 4, y + 4.5);
            doc.text(`$ ${subtotalTotal.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
            y += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 4, y + 4.5);
            doc.text(`- $ ${descuento.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
            y += 6;
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(M, y, pageW - M, y);
            y += 2;
        }

        // Validez — calculada desde la fecha del documento
        const [dMP, mMP, aMP] = fecha.split('/').map(Number);
        const validezMP = new Date(aMP, mMP - 1, dMP + 7);

        // Total final + validez + fecha visita integrada
        const tieneFechaVisitaMP = fechaVisita && fechaVisita.trim();
        const cajaHMP = tieneFechaVisitaMP ? 21 : 16;
        doc.setFillColor(...C.goldLight);
        doc.setDrawColor(...C.gold);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, cajaHMP, 2, 2, 'FD');
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.gold);
        doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 4, y + 5);
        doc.setFontSize(T.xl);
        doc.setTextColor(...C.navy);
        doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M - 2, y + 9.5, { align: 'right' });
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(`Válido hasta: ${validezMP.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 4, y + 13);
        if (tieneFechaVisitaMP) {
            const [aV, mV, dV] = fechaVisita.split('-');
            const fechaVisitaStr = dV && mV ? `${dV}/${mV}${aV ? '/' + aV : ''}` : fechaVisita;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text(`Fecha estimativa de visita: ${fechaVisitaStr}`, M + 4, y + 17.5);
        }
        y += cajaHMP + 4;
    }

    // Condiciones compactas (presupuesto no lleva QR ni firmas)
    const todosVisita = ticketItems.every(it => it.esVisita);
    y = checkSalto(doc, y, 20);
    y = dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc, esVisita: todosVisita });

    // Fotos — inline si caben, nueva página si no
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc, {
        tipoLabel: 'FOTOGRAFÍAS DE LOS EQUIPOS',
        subtitulo: 'IMÁGENES PROPORCIONADAS POR EL CLIENTE',
        esPresupuesto: true,
        yActual: y,
    });
}
