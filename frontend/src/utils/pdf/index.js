/**
 * index.js — Generador PDF corporativo para Dispenser La Tienda
 *
 * Tipos de documento:
 *   PRESUPUESTO     → 1 o multi equipo
 *   ORDEN_SERVICIO  → servicio completado con fotos y garantía
 *   INFORME_TECNICO → con checklist + próximo mantenimiento
 *   COMPROBANTE     → recibo de venta de productos
 *
 * API pública: generarPDF({ tipo, cliente, sede, tecnico, ticketItems, ... })
 */
import jsPDF      from 'jspdf';
import autoTable  from 'jspdf-autotable';
import { toast }  from 'react-hot-toast';
import {
    C, M, T, CONTENT_W,
    procesarFecha, generarNroDocumento, HEADER_H, getEmpresa,
} from './theme.js';
import { dibujarHeader, dibujarHeaderCompacto, dibujarFooter } from './layout.js';
import {
    dibujarBloqueClienteEquipo,
    dibujarBloqueEquipoYTrabajo,
    dibujarBloqueDiagnosticoDetalle,
    dibujarBloqueSolicitud,
    dibujarChecklist,
    dibujarFirmas,
    dibujarCondicionesCompactas,
    dibujarRegistroFotografico,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto, fitEnCaja } from './helpers.js';
import { dibujarPaginaEvidencia } from './fotos.js';

// ── Helpers de detección / labels ─────────────────────────────────────────────

function detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado }) {
    if (tipo) return tipo;
    if (esPresupuesto) return 'PRESUPUESTO';
    const esTec = esTecnicoForzado !== null && esTecnicoForzado !== undefined
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
    return esTec ? 'ORDEN_SERVICIO' : 'COMPROBANTE';
}

function getLabelTipo(tipo, esMulti) {
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

function getPrefijoNro(tipo) {
    const MAP = { PRESUPUESTO: 'PP', PRESUPUESTO_VENTA: 'PV', ORDEN_SERVICIO: 'OS', COMPROBANTE: 'CV', INFORME_TECNICO: 'IT' };
    return MAP[tipo] || 'DC';
}

function getEstadoBadge(tipo) {
    const MAP = { ORDEN_SERVICIO: 'COMPLETADO', PRESUPUESTO: 'PRESUPUESTO', PRESUPUESTO_VENTA: 'PRESUPUESTO', INFORME_TECNICO: 'INFORME' };
    return MAP[tipo] || null;
}

// ── Construir filas de tabla por equipo ────────────────────────────────────────

function construirFilasItem(item) {
    const filas = [];
    const mo = parseFloat(item.costoExtra || 0);
    if (mo > 0) {
        filas.push({
            concepto:   'Mano de obra / Servicio técnico',
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

// ── FLUJO SINGLE TÉCNICO (ORDEN_SERVICIO / INFORME_TECNICO, 1 equipo) ─────────

async function generarSingleTecnico(doc, {
    item, cliente, sede, tipo, y, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, garantiaTexto, proximoMantenimiento, googleReviewLink,
    incluirFirmas = true, descuentoPorcentaje = 0, leyenda = '',
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
    // Concepto MO más específico: usar el trabajo real en lugar del genérico
    if (filas.length > 0 && filas[0].esServicio && item.trabajo?.trim()) {
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
            return [
                { content: r.concepto, colSpan: 2, styles: { textColor: C.navy, fontStyle: 'bold', fontSize: T.xs } },
                cantStr, unitStr, importeStr,
            ];
        }
        const fila = [r.concepto, cantStr, unitStr, importeStr];
        if (hayFotosST) fila.unshift('');
        return fila;
    });

    autoTable(doc, {
        startY: y,
        head:  [hayFotosST
            ? ['Img', 'CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']
            : ['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']
        ],
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
        columnStyles: hayFotosST ? {
            0: { cellWidth: FOTO_ST_W + 4 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 13 },
            3: { halign: 'right',  cellWidth: 26 },
            4: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        } : {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 26 },
            3: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        },
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

    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, tableEndY, CONTENT_W, 13, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL DEL SERVICIO', M + 3, tableEndY + 5.5);
    doc.setFontSize(sinItems ? T.xs : T.md);
    doc.setTextColor(...C.navy);
    doc.text(totalLabel, pageW - M - 2, tableEndY + 10, { align: 'right' });
    tableEndY += 18;
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
    const leyLimpia = (leyenda || '').trim();
    if (leyLimpia) {
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

    // Garantía compacta (1 línea) + firmas
    const firmasH = incluirFirmas ? 44 : 0;
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
    const textoGar = garantiaTexto || '90 días sobre mano de obra  ·  Repuestos según fabricante';
    doc.text(textoGar, M + 20, y);
    y += 6;
    if (incluirFirmas) {
        y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });
    }

    return y;
}

// ── FLUJO SINGLE PRESUPUESTO (1 equipo) ───────────────────────────────────────

async function generarSinglePresupuesto(doc, {
    item, cliente, sede, y, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, descuentoPorcentaje, incluirFirmas = true,
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
            return [
                { content: r.concepto, colSpan: 2, styles: { textColor: C.navy, fontStyle: 'bold', fontSize: T.xs } },
                cantStr, unitStr, importeStr,
            ];
        }
        const fila = [r.concepto, cantStr, unitStr, importeStr];
        if (hayFotosSP) fila.unshift('');
        return fila;
    });

    autoTable(doc, {
        startY: y,
        head:  [hayFotosSP
            ? ['Img', 'CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']
            : ['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']
        ],
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
        columnStyles: hayFotosSP ? {
            0: { cellWidth: FOTO_SP_W + 4 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 13 },
            3: { halign: 'right',  cellWidth: 26 },
            4: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        } : {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 26 },
            3: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        },
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

    // Caja total + validez integrada (ahorra 6mm)
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, presupTableEndY, CONTENT_W, 16, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 3, presupTableEndY + 5);
    doc.setFontSize(sinItems ? T.xs : T.md);
    doc.setTextColor(...C.navy);
    doc.text(sinItems ? totalPresupLabel : `$ ${totalPresupLabel}`, pageW - M - 2, presupTableEndY + 9.5, { align: 'right' });
    // Validez dentro de la caja
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(`Válido hasta: ${validezSP.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 3, presupTableEndY + 13);
    presupTableEndY += 20;
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
    y = dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc });

    return y;
}

// ── FLUJO MULTI TÉCNICO (varias páginas) ──────────────────────────────────────

async function generarMultiTecnico(doc, {
    ticketItems, cliente, sede, tipo, fecha, nroDoc, tecnico, y: yInicial,
    firmaCliente, firmaTecnico, garantiaTexto, googleReviewLink, leyenda,
    incluirFirmas = true, descuentoPorcentaje = 0,
}) {
    const pageW   = doc.internal.pageSize.getWidth();

    // ── Página 1: Resumen ejecutivo ──────────────────────────────────────────
    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );

    let y = yInicial ?? (HEADER_H.compact + 8);

    // Bloque cliente con resumen inline (ahorra 22mm del bloque resumen separado)
    const resumenTexto = `${ticketItems.length} equipos atendidos\nTotal: $ ${subtotalTotal.toLocaleString('es-AR')}`;
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: resumenTexto, tituloDiag: 'RESUMEN' });

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
        y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });
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
        if (mo > 0) partesMO.push(`MO: $${mo.toLocaleString('es-AR')}`);
        const trabajoCell = partesMO.length > 0 ? partesMO.join('\n') : '—';

        // Repuestos: una línea por ítem
        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => {
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                return `· ${r.nombre} (x${r.cantidad}) — $${sub.toLocaleString('es-AR')}`;
              }).join('\n')
            : '—';

        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar';

        bodyRows.push([equipoCell, trabajoCell, repCell, importeCell]);
    });

    autoTable(doc, {
        startY: y,
        head:  [['EQUIPO', 'TRABAJO INCLUIDO', 'REPUESTOS INCLUIDOS', 'IMPORTE']],
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
        columnStyles: {
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

    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, CONTENT_W, 13, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL FACTURADO', M + 4, y + 5.5);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${totalFinalM.toLocaleString('es-AR')}`, pageW - M, y + 10, { align: 'right' });
    y += 18;

    // Condiciones del servicio (leyenda)
    const leyLimpiaM = (leyenda || '').trim();
    if (leyLimpiaM) {
        y = checkSalto(doc, y, 20);
        const leyLinesM = doc.splitTextToSize(leyLimpiaM.replace(/[\r\n]+/g, ' '), CONTENT_W - 10);
        const leyHM = Math.min(leyLinesM.length, 4) * 4.2 + 11;
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

    // ── Página 3: Evidencia fotográfica ─────────────────────────────────────
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc);
}

// ── FLUJO MULTI PRESUPUESTO ───────────────────────────────────────────────────

async function generarMultiPresupuesto(doc, {
    ticketItems, cliente, sede, fecha, nroDoc, tecnico, y: yInicial,
    firmaCliente, firmaTecnico, incluirFirmas = true, descuentoPorcentaje, leyenda,
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
    const resumenTexto = `${ticketItems.length} equipos\nTotal estimado: $ ${total.toLocaleString('es-AR')}`;
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: resumenTexto, tituloDiag: 'RESUMEN' });

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

        // Repuestos: una línea por ítem sin precio inline (el total va en IMPORTE)
        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => `· ${r.nombre} (x${r.cantidad})`).join('\n')
            : '—';

        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar';

        if (trabajoComun) {
            // Sin columna trabajo — ya se mostró arriba
            bodyRows.push([equipoCell, repCell, importeCell]);
        } else {
            const desc = (item.trabajo || item.trabajoRealizado || '').trim();
            bodyRows.push([equipoCell, desc || '—', repCell, importeCell]);
        }
    });

    const tipoLabelTabla = 'PRESUPUESTO — MÚLTIPLES EQUIPOS';

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE EQUIPOS Y CONCEPTOS', M, y);
    y += 5;

    const headCols  = trabajoComun
        ? [['EQUIPO', 'REPUESTOS ESTIMADOS', 'IMPORTE']]
        : [['EQUIPO', 'TRABAJO ESTIMADO', 'REPUESTOS ESTIMADOS', 'IMPORTE']];
    const colStyles = trabajoComun
        ? { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy } }
        : { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 35 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy } };

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

    // Total final + validez integrada
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 4, y + 5);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M - 2, y + 9.5, { align: 'right' });
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(`Válido hasta: ${validezMP.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 4, y + 13);
    y += 20;

    // Condiciones compactas (presupuesto no lleva QR ni firmas)
    y = checkSalto(doc, y, 20);
    y = dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc });

    // Página de fotos (solo si hay alguna)
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc, {
        tipoLabel: 'FOTOGRAFÍAS DE LOS EQUIPOS',
        subtitulo: 'IMÁGENES PROPORCIONADAS POR EL CLIENTE',
        esPresupuesto: true,
    });
}

// ── FLUJO PRESUPUESTO VENTA (cotización de productos) ────────────────────────

async function generarPresupuestoVenta(doc, {
    ticketItems, cliente, sede, y, fecha, descuentoPorcentaje, nroDoc, leyenda = '',
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

            filas.push([
                '',
                r.sku || '',
                nombreDesc,
                String(cant),
                `$ ${precioUnit.toLocaleString('es-AR')}`,
                precioDesc !== null ? `$ ${precioDesc.toLocaleString('es-AR')}` : '—',
                `$ ${totalLinea.toLocaleString('es-AR')}`,
            ]);
            fotos.push(await cargarFoto(r.fotoUrl || null));
            metas.push({ tieneDesc: precioDesc !== null });
        }
        // Envío como línea separada (sin descuento, sin foto)
        const envio = parseFloat(item.costoExtra || 0);
        if (envio > 0) {
            filas.push(['', '', 'Envío', '1', `$ ${envio.toLocaleString('es-AR')}`, '—', `$ ${envio.toLocaleString('es-AR')}`]);
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

        const conDescuento = pct > 0;
        // Solo incluir columna imagen si al menos un repuesto tiene foto (ENVÍO nunca tiene foto)
        const hayFotosPV = fotos.some(f => f !== null);

        // Construye head y body según si hay fotos y si hay descuento
        const headBase   = ['SKU', 'Producto / Descripción', 'Cant.', 'P. Unit.', ...(conDescuento ? ['P. c/Desc.'] : []), 'Total'];
        const headFinal  = hayFotosPV ? ['Imagen', ...headBase] : headBase;
        // filas[i][0] es '' (placeholder imagen), índice 5 es P.c/Desc (solo cuando conDescuento)
        const bodyFinal = filas.map((f, i) => {
            const sinImg  = f.slice(1); // [sku, nombre, cant, pUnit, pDesc, total]
            const sinDesc = conDescuento ? sinImg : sinImg.filter((_, j) => j !== 4);
            if (!hayFotosPV) return sinDesc;
            // Envío: sin imagen ni SKU — concepto ocupa imagen+SKU+nombre (colSpan 3)
            if (metas[i]?.isEnvio) {
                const [, , nombre, cant, pUnit, pDesc, total] = f;
                const cols = [
                    { content: nombre, colSpan: 3 },
                    cant, pUnit,
                    ...(conDescuento ? [pDesc] : []),
                    total,
                ];
                return cols;
            }
            return [f[0], ...sinDesc];
        });

        // columnStyles dinámico
        let colStyles;
        if (hayFotosPV && conDescuento) {
            colStyles = {
                0: { cellWidth: FOTO_W + 4 },
                1: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                2: { cellWidth: 'auto' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right',  cellWidth: 22 },
                5: { halign: 'right',  cellWidth: 22, textColor: C.navy },
                6: { halign: 'right',  cellWidth: 24, fontStyle: 'bold' },
            };
        } else if (hayFotosPV) {
            colStyles = {
                0: { cellWidth: FOTO_W + 4 },
                1: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                2: { cellWidth: 'auto' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right',  cellWidth: 28 },
                5: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
            };
        } else if (conDescuento) {
            colStyles = {
                0: { cellWidth: 18, textColor: C.red, fontStyle: 'bold', fontSize: T.xxs },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right',  cellWidth: 22 },
                4: { halign: 'right',  cellWidth: 22, textColor: C.navy },
                5: { halign: 'right',  cellWidth: 24, fontStyle: 'bold' },
            };
        } else {
            colStyles = {
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
            columnStyles: colStyles,
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
                if (descColIdx >= 0 && data.column.index === descColIdx && !metas[data.row.index]?.tieneDesc) {
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

    // Subtotal bruto (productos + envío), descuento, total final
    const subtotalBruto = ticketItems.reduce((a, it) => {
        const prods = (it.repuestosUsados || []).reduce((s, r) => s + Number(r.precio || 0) * Number(r.cantidad || 1), 0);
        return a + prods + parseFloat(it.costoExtra || 0);
    }, 0);
    const descuentoMonto = pct > 0 ? subtotalBruto * pct / 100 : 0;
    const total          = subtotalBruto - descuentoMonto;

    // Desglose subtotal → descuento → total
    if (pct > 0) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Subtotal', M + 4, y + 4.5);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
        y += 6;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(`Descuento ${pct}%`, M + 4, y + 4.5);
        doc.text(`- $ ${descuentoMonto.toLocaleString('es-AR')}`, pageW - M, y + 4.5, { align: 'right' });
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
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO', M + 4, y + 5);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M, y + 9.5, { align: 'right' });
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(`Válido hasta: ${validezPV.toLocaleDateString('es-AR')}  (7 días corridos)`, M + 4, y + 13);
    y += 20;

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

    // Condiciones compactas (sin QR ni firmas en presupuesto de venta)
    y = checkSalto(doc, y, 14);
    y = dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc });

    return y;
}

// ── FLUJO COMPROBANTE (venta de productos) ────────────────────────────────────

async function generarComprobante(doc, {
    ticketItems, cliente, sede, y, fecha, nroDoc, descuentoPorcentaje, leyenda,
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
            filas.push(['', nombreConDesc, r.sku || '', String(r.cantidad),
                `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                `$ ${Number(r.subtotal ?? r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            fotos.push(await cargarFoto(r.fotoUrl || null));
        }
        // Envío como línea separada
        const envio = parseFloat(item.costoExtra || 0);
        if (envio > 0) {
            filas.push(['', 'Envío', '', '1', `$ ${envio.toLocaleString('es-AR')}`, `$ ${envio.toLocaleString('es-AR')}`]);
            fotos.push(null);
        }
    }

    if (filas.length > 0) {
        // Mostrar columna imagen solo si hay al menos un producto con foto
        const hayFotosComp = fotos.some(f => f !== null);
        const headFinal = hayFotosComp
            ? [['Imagen', 'Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']]
            : [['Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']];
        const bodyFinal = filas.map(f => hayFotosComp ? f : f.slice(1));
        const colStylesFinal = hayFotosComp ? {
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

        y = checkSalto(doc, y, 40);
        autoTable(doc, {
            startY: y,
            head:  headFinal,
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

    // Total
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 13, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL', M + 4, y + 5.5);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M, y + 10, { align: 'right' });
    y += 18;

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

// ── GENERADOR PRINCIPAL ───────────────────────────────────────────────────────

export const generarPDF = async ({
    tipo               = null,
    esPresupuesto      = false,
    esTecnicoForzado   = null,
    cliente,
    sede,
    tecnico,
    ticketItems        = [],
    fechaServicio,
    descuentoPorcentaje = 0,
    leyenda            = '',
    servicioId         = null,
    nroDocumentoExistente = null,
    firmaCliente       = null,
    firmaTecnico       = null,
    proximoMantenimiento = null,
    garantiaTexto      = null,
    estadoFinal        = null,
    googleReviewLink   = null,
    incluirFirmas      = true,
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }

    const tipoDetectado = detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado });
    const esMulti       = ticketItems.length > 1;
    const doc           = new jsPDF();
    const fecha         = procesarFecha(fechaServicio);
    const prefijo       = getPrefijoNro(tipoDetectado);
    const tipoLabel     = getLabelTipo(tipoDetectado, esMulti);

    // Reusar el número existente (DB o localStorage) para no generar uno nuevo cada vez
    const nroDocGuardado = nroDocumentoExistente
        || (servicioId ? localStorage.getItem(`pdf_nro_${servicioId}`) : null);
    const nroDoc = nroDocGuardado || generarNroDocumento(prefijo, fecha, tecnico || 'TEC');

    // Persistir solo si es nuevo (nroDocGuardado era null)
    if (servicioId && !nroDocGuardado) {
        try {
            const { default: api } = await import('../../services/api');
            api.patch(`/servicios/${servicioId}/nro-doc`, { nroDocumento: nroDoc }).catch(() => {});
        } catch {}
        localStorage.setItem(`pdf_nro_${servicioId}`, nroDoc);
    }

    // ── HEADER PRIMERA PÁGINA ─────────────────────────────────────────────────
    // Multi-equipo usa header compacto en todas las páginas para consistencia visual
    // Header compacto para todos los tipos principales (ahorra 20mm)
    const esMultiDoc = esMulti && (tipoDetectado === 'PRESUPUESTO' || tipoDetectado === 'ORDEN_SERVICIO' || tipoDetectado === 'INFORME_TECNICO');
    // Header compacto para todos los tipos (ahorra 20mm vs header normal)
    const usaHeaderCompacto = true;
    if (usaHeaderCompacto) {
        dibujarHeaderCompacto(doc, { tipoLabel, fecha, tecnico: tecnico || null, nroDoc });
    } else {
        dibujarHeader(doc, { tipoLabel, fecha, tecnico: tecnico || null, nroDoc, estado: getEstadoBadge(tipoDetectado) });
    }

    let y = usaHeaderCompacto ? HEADER_H.compact + 8 : HEADER_H.normal + 8;

    // ── DISPATCH POR TIPO ─────────────────────────────────────────────────────
    const commonArgs = {
        cliente, sede, tecnico, fecha, nroDoc,
        firmaCliente:  incluirFirmas ? firmaCliente  : null,
        firmaTecnico:  incluirFirmas ? firmaTecnico  : null,
        incluirFirmas,
        descuentoPorcentaje, garantiaTexto,
        proximoMantenimiento, googleReviewLink, leyenda,
    };

    if (tipoDetectado === 'COMPROBANTE') {
        await generarComprobante(doc, { ...commonArgs, ticketItems, y });

    } else if (tipoDetectado === 'PRESUPUESTO_VENTA') {
        await generarPresupuestoVenta(doc, { ...commonArgs, ticketItems, y, nroDoc });

    } else if (tipoDetectado === 'PRESUPUESTO') {
        if (esMulti) {
            await generarMultiPresupuesto(doc, { ...commonArgs, ticketItems, y });
        } else {
            await generarSinglePresupuesto(doc, { ...commonArgs, item: ticketItems[0], y });
        }

    } else {
        // ORDEN_SERVICIO / INFORME_TECNICO
        if (esMulti) {
            await generarMultiTecnico(doc, { ...commonArgs, ticketItems, tipo: tipoDetectado, y });
        } else {
            await generarSingleTecnico(doc, {
                ...commonArgs,
                item: ticketItems[0],
                tipo: tipoDetectado,
                y,
            });
        }
    }

    // ── FOOTER EN TODAS LAS PÁGINAS ───────────────────────────────────────────
    // Para ORDEN_SERVICIO ignoramos leyenda en footer para que muestre estrellas siempre
    const esOrdenFinal      = tipoDetectado === 'ORDEN_SERVICIO';
    const esTipoPresupuesto = tipoDetectado === 'PRESUPUESTO';
    // Venta y comprobante muestran la leyenda como bloque OBSERVACIONES en el cuerpo — no en el footer
    const esVentaTipo       = tipoDetectado === 'PRESUPUESTO_VENTA' || tipoDetectado === 'COMPROBANTE';
    const leyendaLimpia = (esOrdenFinal || esTipoPresupuesto || esVentaTipo)
        ? null
        : (leyenda || '').replace(/[\r\n]+/g, ' ').trim().substring(0, 110) || null;
    const total         = doc.internal.getNumberOfPages();

    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        dibujarFooter(doc, {
            pagina:       i,
            totalPaginas: total,
            textoCentral: leyendaLimpia,
            conEstrellas: esOrdenFinal,
        });
    }

    // ── GUARDAR ───────────────────────────────────────────────────────────────
    const nombreBase = tipoLabel.split(' ')[0];
    const nombreCliente = (cliente.nombre || 'Cliente').replace(/\s+/g, '-');
    const fechaStr = fecha.replace(/\//g, '-');
    const fileName = `${nombreBase}_${nombreCliente}_${fechaStr}.pdf`;

    // iOS Safari bloquea descargas automáticas después de await — abrir en nueva pestaña
    const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
    if (isIOS) {
        window.open(doc.output('datauristring'), '_blank');
    } else {
        doc.save(fileName);
    }
};
