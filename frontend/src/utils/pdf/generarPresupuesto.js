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
        // No pasar fotoAntes aquí — la foto se muestra una sola vez en la sección dedicada abajo
        y = dibujarBloqueEquipoYTrabajo(doc, { item, trabajo: diagnostico, y, pageW, fotoAntes: null });
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

    let presupTableEndY = doc.lastAutoTable.finalY + 8;

    if (!sinPrecios) {
        const totalPresupLabel = sinItems ? 'A coordinar con el cliente' : total.toLocaleString('es-AR');

        // Desglose subtotal → descuento → total
        if (pct > 0 && !sinItems) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text('Subtotal', M + 3, presupTableEndY + 4.5);
            doc.text(`$ ${totalBruto.toLocaleString('es-AR')}`, pageW - M - 4, presupTableEndY + 4.5, { align: 'right' });
            presupTableEndY += 6;
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.red);
            doc.text(`Descuento ${pct}%`, M + 3, presupTableEndY + 4.5);
            doc.text(`- $ ${descuento.toLocaleString('es-AR')}`, pageW - M - 4, presupTableEndY + 4.5, { align: 'right' });
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
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, presupTableEndY, CONTENT_W, cajaH, 1.5, 1.5, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 3, presupTableEndY + 5);
        doc.setFontSize(sinItems ? T.xs : T.md);
        doc.setTextColor(...C.navy);
        doc.text(sinItems ? totalPresupLabel : `$ ${totalPresupLabel}`, pageW - M - 4, presupTableEndY + 9.5, { align: 'right' });
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

    if (fotoAntes || fotoDespues) {
        const compacto = espacioRestante < (84 + necesitaCondiciones);
        y = dibujarRegistroFotografico(doc, { y, fotoA: fotoAntes, fotoD: fotoDespues, esPresupuesto: true, compacto });
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

    // Detectar si algún equipo tiene repuestos o M/O
    const hayRepuestosP = ticketItems.some(it => (it.repuestosUsados || []).length > 0 || parseFloat(it.costoExtra || 0) > 0);

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

        // Equipo: cada dato en su renglón, solo si existe
        const equipoLines = [
            [marca, modelo].filter(Boolean).join(' '),
            serial ? `S/N: ${serial}` : null,
            ubic   ? `Ubic: ${ubic}` : null,
            piso   ? `Piso: ${piso}` : null,
            sector ? `Sector: ${sector}` : null,
        ].filter(Boolean);
        const equipoCell = equipoLines.join('\n');

        // Trabajo estimado (sin MO$ — ya está en IMPORTE)
        const desc = (item.trabajo || item.trabajoRealizado || '').trim();
        const trabajoCell = desc || '—';

        // Repuestos + M/O: armar celda con desglose
        const mo = parseFloat(item.costoExtra || 0);
        const reps = item.repuestosUsados || [];
        const lineas = [];
        if (mo > 0 && !sinPrecios) {
            const moLabel = item.esVisita ? 'M/O Visita' : 'M/O Reparación';
            lineas.push(`· ${moLabel} — $${mo.toLocaleString('es-AR')}`);
        }
        reps.forEach(r => {
            if (sinPrecios) { lineas.push(`· ${r.nombre} (x${r.cantidad})`); }
            else {
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                lineas.push(`· ${r.nombre} (x${r.cantidad}) — $${sub.toLocaleString('es-AR')}`);
            }
        });
        const repCell = lineas.length > 0 ? lineas.join('\n') : '—';

        // Construir fila: N° badge + equipo + [trabajo] + [repuestos] + [importe]
        const row = [String(idx + 1), equipoCell];
        if (!trabajoComun) row.push(trabajoCell);
        if (hayRepuestosP) row.push(repCell);
        if (!sinPrecios) {
            const sub = parseFloat(item.totalCalculado || item.costo || 0);
            row.push(sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar');
        }
        bodyRows.push(row);
    });

    const tipoLabelTabla = 'PRESUPUESTO — MÚLTIPLES EQUIPOS';

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE EQUIPOS Y CONCEPTOS', M, y);
    y += 5;

    // Cabecera: N° + columnas dinámicas
    const colsP = ['N°', 'EQUIPO'];
    if (!trabajoComun) colsP.push('TRABAJO ESTIMADO');
    if (hayRepuestosP) colsP.push('CONCEPTOS');
    if (!sinPrecios) colsP.push('IMPORTE');
    const headCols = [colsP];

    // Anchos: col 0 = N° (9mm), resto adaptativo
    const colStylesP = { 0: { cellWidth: 9, halign: 'center', valign: 'middle' } };
    const lastIdxP = colsP.length - 1;
    if (!sinPrecios) {
        colStylesP[lastIdxP] = { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy };
    }
    // Equipo siempre bold
    const restColsP = colsP.length - 1;
    colStylesP[1] = { cellWidth: restColsP <= 2 ? 60 : (restColsP <= 3 ? 48 : 42), fontStyle: 'bold' };

    autoTable(doc, {
        startY: y,
        head:  headCols,
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xs, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            halign: 'center',
        },
        bodyStyles: {
            fontSize: T.sm, textColor: C.dark, valign: 'top', halign: 'left',
            cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: colStylesP,
        margin: { left: M, right: M, top: HEADER_H.compact + 8 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                dibujarHeaderCompacto(doc, { tipoLabel: tipoLabelTabla, fecha, nroDoc });
            }
        },
        didParseCell: data => {
            if (data.section !== 'body') return;
            if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
            // N° badge: fondo charcoal, texto blanco, centrado
            if (data.column.index === 0) {
                data.cell.styles.fillColor = C.navy;
                data.cell.styles.textColor = C.white;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = T.sm;
                data.cell.styles.halign = 'center';
                data.cell.styles.valign = 'middle';
            }
            if (data.column.index === 1) data.cell.styles.fontStyle = 'bold';
        },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Asegurar espacio para total + footer (mínimo 30mm)
    y = checkSalto(doc, y, 30);

    if (!sinPrecios) {
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

        // Validez — calculada desde la fecha del documento
        const [dMP, mMP, aMP] = fecha.split('/').map(Number);
        const validezMP = new Date(aMP, mMP - 1, dMP + 7);

        // Total final + validez + fecha visita integrada
        const tieneFechaVisitaMP = fechaVisita && fechaVisita.trim();
        const cajaHMP = tieneFechaVisitaMP ? 21 : 16;
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, cajaHMP, 2, 2, 'FD');
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 4, y + 5);
        doc.setFontSize(T.xl);
        doc.setTextColor(...C.navy);
        doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M - 4, y + 9.5, { align: 'right' });
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
