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
    dibujarResumenServicio,
    dibujarTablaDetalle,
    dibujarSeccion2Col,
    dibujarChecklist,
    dibujarFirmas,
    dibujarGarantia,
    dibujarQRWhatsApp,
    dibujarQRGoogle,
    dibujarResumenEjecutivo,
    dibujarCondiciones,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto } from './helpers.js';
import { dibujarEvidenciaInline, dibujarPaginaEvidencia } from './fotos.js';

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
        case 'ORDEN_SERVICIO':    return `ORDEN DE SERVICIO${suf}`;
        case 'COMPROBANTE':       return 'COMPROBANTE DE VENTA';
        case 'INFORME_TECNICO':   return `INFORME TÉCNICO${suf}`;
        default:                  return tipo;
    }
}

function getPrefijoNro(tipo) {
    const MAP = { PRESUPUESTO: 'PP', ORDEN_SERVICIO: 'OS', COMPROBANTE: 'CV', INFORME_TECNICO: 'IT' };
    return MAP[tipo] || 'DC';
}

function getEstadoBadge(tipo) {
    const MAP = { ORDEN_SERVICIO: 'COMPLETADO', PRESUPUESTO: 'PRESUPUESTO', INFORME_TECNICO: 'INFORME' };
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
}) {
    const pageW = doc.internal.pageSize.getWidth();
    const RIGHT_COL_W = 62;
    const RIGHT_COL_X = pageW - M - RIGHT_COL_W;

    // Cargar fotos de equipo
    const [fotoEquipoData, fotoA, fotoD] = await Promise.all([
        cargarFoto(item.fotoEquipo || item.fotoDespues || null),
        cargarFoto(item.fotoAntes),
        cargarFoto(item.fotoDespues),
    ]);
    const tieneEvidencia = !!(fotoA || fotoD);

    // Bloque cliente + equipo
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item, idx: 0, y, pageW, fotoEquipo: fotoEquipoData });

    // Stats de resumen
    const totalEquipo = parseFloat(item.totalCalculado || item.costo || 0);
    const cantTrabajos = (item.repuestosUsados?.length || 0) + (parseFloat(item.costoExtra || 0) > 0 ? 1 : 0);

    y = dibujarResumenServicio(doc, {
        y,
        stats: [
            { valor: cantTrabajos,    etiqueta: 'Trabajos realizados', colorValor: C.navy  },
            { valor: 1,               etiqueta: 'Equipos atendidos',   colorValor: C.navy  },
            { valor: 'Completado',    etiqueta: 'Estado final',        colorValor: C.green },
            { valor: fecha,           etiqueta: 'Fecha servicio',      colorValor: C.dark  },
        ],
    });

    // ── Sección paralela: tabla (izq) + evidencia (der) ─────────────────────
    const paralelY = y;
    const TABLE_MARGIN_RIGHT = tieneEvidencia ? (pageW - RIGHT_COL_X + 5) : M;

    // Título tabla
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE TRABAJOS Y REPUESTOS', M, y);
    y += 5;

    const filas = construirFilasItem(item);
    const tableData = filas.length > 0
        ? filas.map(r => [r.concepto, String(r.cant), `$ ${r.unitario}`, `$ ${r.importe}`])
        : [['Sin items registrados', '', '', '']];

    autoTable(doc, {
        startY: y,
        head:  [['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
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
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 26 },
            3: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        },
        margin: { left: M, right: TABLE_MARGIN_RIGHT },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                if (filas[data.row.index]?.esServicio) data.cell.styles.textColor = C.navy;
            }
        },
    });

    let tableEndY = doc.lastAutoTable.finalY + 3;

    // Total bajo la tabla (mismo ancho)
    const tableEndX = tieneEvidencia ? RIGHT_COL_X - 5 : pageW - M;
    const totalW    = tableEndX - M;
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, tableEndY, totalW, 10, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 3, tableEndY + 6.5);
    doc.setFontSize(T.md);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${totalEquipo.toLocaleString('es-AR')}`, tableEndX - 3, tableEndY + 7, { align: 'right' });
    tableEndY += 15;

    // Evidencia en columna derecha
    let evidEndY = paralelY;
    if (tieneEvidencia) {
        evidEndY = await dibujarEvidenciaInline(doc, {
            x: RIGHT_COL_X, y: paralelY,
            w: RIGHT_COL_W,
            fotoA, fotoD,
        });
    }

    y = Math.max(tableEndY, evidEndY) + 4;

    // ── Checklist + observaciones ─────────────────────────────────────────────
    const checklist = item.checklist || [];
    const observaciones = sanitizarTexto(item.observaciones || item.trabajo || '');

    if (tipo === 'INFORME_TECNICO' && checklist.length > 0) {
        y = checkSalto(doc, y, 40);
        y = dibujarChecklist(doc, { y, items: checklist, pageW });
    } else if (checklist.length > 0 || observaciones) {
        y = checkSalto(doc, y, 32);
        y = dibujarSeccion2Col(doc, {
            y, pageW,
            tituloIzq: 'CHECKLIST TÉCNICO',
            textoIzq:  checklist.map(c => `${c.ok ? '✓' : '□'} ${c.label || c}`).join('\n'),
            tituloDer:  'OBSERVACIONES',
            textoDer:   observaciones,
        });
    }

    // Próximo mantenimiento
    if (proximoMantenimiento) {
        y = checkSalto(doc, y, 20);
        doc.setFillColor(...C.greenLight);
        doc.setDrawColor(...C.green);
        doc.setLineWidth(0.3);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, 14, 2, 2, 'FD');
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.green);
        doc.text('⚙  PRÓXIMO MANTENIMIENTO SUGERIDO', M + 2, y + 5);
        doc.setFontSize(T.sm);
        doc.setTextColor(...C.dark);
        doc.text(proximoMantenimiento, pageW - M, y + 5, { align: 'right' });
        y += 19;
    }

    // Garantía
    y = checkSalto(doc, y, 18);
    y = dibujarGarantia(doc, { y, texto: garantiaTexto, pageW });

    // Firmas
    y = checkSalto(doc, y, 36);
    y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });

    // QR Google Review
    const empresa = getEmpresa();
    const linkGoogle = googleReviewLink || empresa.googleReviewLink;
    if (linkGoogle) {
        y = checkSalto(doc, y, 38);
        y = await dibujarQRGoogle(doc, { y, link: linkGoogle });
    }

    return y;
}

// ── FLUJO SINGLE PRESUPUESTO (1 equipo) ───────────────────────────────────────

async function generarSinglePresupuesto(doc, {
    item, cliente, sede, y, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, descuentoPorcentaje,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Cargar foto del equipo para mostrar en el bloque cliente+equipo
    const fotoEquipoData = await cargarFoto(item.fotoAntes || item.fotoDespues || item.fotoEquipo || null);

    // Bloque cliente + equipo con foto
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item, idx: 0, y, pageW, fotoEquipo: fotoEquipoData });

    // Problema / trabajo propuesto — solo si hay contenido real
    const problemaTexto = sanitizarTexto(item.problema || item.solicitud || item.descripcion || '');
    const trabajoTexto  = sanitizarTexto(item.trabajo  || item.trabajoRealizado || item.resumenTexto || '');
    if (problemaTexto || trabajoTexto) {
        y = checkSalto(doc, y, 32);
        y = dibujarSeccion2Col(doc, {
            y, pageW,
            tituloIzq: problemaTexto ? 'PROBLEMA / SOLICITUD INFORMADA' : null,
            textoIzq:  problemaTexto || null,
            tituloDer:  trabajoTexto  ? 'TRABAJO PROPUESTO' : null,
            textoDer:   trabajoTexto  || null,
        });
    }

    // Tabla full-width
    const filas = construirFilasItem(item);
    const totalBruto   = parseFloat(item.totalCalculado || item.costo || 0);
    const pct          = parseFloat(descuentoPorcentaje || 0);
    const descuento    = pct > 0 ? totalBruto * pct / 100 : 0;
    const total        = totalBruto - descuento;

    y = checkSalto(doc, y, 40);
    y = dibujarTablaDetalle(doc, {
        rows:   filas,
        y,
        titulo: 'DETALLE DE CONCEPTOS',
        total:  total.toLocaleString('es-AR'),
        labelTotal: 'TOTAL ESTIMADO DEL SERVICIO',
    });

    // Validez del presupuesto
    const validez = new Date();
    validez.setDate(validez.getDate() + 7);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(
        `Válido hasta: ${validez.toLocaleDateString('es-AR')}  (7 días corridos)`,
        pageW - M, y - 4, { align: 'right' },
    );

    // Condiciones
    y = checkSalto(doc, y, 36);
    y = dibujarCondiciones(doc, { y, pageW });

    // QR WhatsApp aprobación — siempre se muestra (con QR si hay WA, sin él si no)
    y = checkSalto(doc, y, 48);
    if (empresa.whatsapp) {
        y = await dibujarQRWhatsApp(doc, {
            x: M, y,
            telefono: empresa.whatsapp,
            mensaje:  `Hola, quiero aprobar el presupuesto ${nroDoc}`,
            nroDoc,
        });
    } else {
        // Card de aprobación sin QR
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(...C.green);
        doc.setLineWidth(0.3);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, 20, 2, 2, 'FD');
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text('¿ESTÁ DE ACUERDO CON ESTE PRESUPUESTO?', M + 4, y + 8);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`Respondanos para coordinar el servicio — Nro. presupuesto: ${nroDoc}`, M + 4, y + 14);
        y += 25;
    }

    // Firmas
    y = checkSalto(doc, y, 36);
    y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: true });

    return y;
}

// ── FLUJO MULTI TÉCNICO (varias páginas) ──────────────────────────────────────

async function generarMultiTecnico(doc, {
    ticketItems, cliente, sede, tipo, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, garantiaTexto, googleReviewLink, leyenda,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // ── Página 1: Resumen ejecutivo ──────────────────────────────────────────
    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );

    let y = HEADER_H.normal + 8;

    // Resumen ejecutivo
    y = dibujarResumenEjecutivo(doc, {
        y, cliente, fecha,
        cantEquipos:   ticketItems.length,
        cantServicios: ticketItems.reduce((a, it) => a + (it.repuestosUsados?.length || 0) + (parseFloat(it.costoExtra || 0) > 0 ? 1 : 0), 0),
        total:         subtotalTotal.toLocaleString('es-AR'),
        estado:        tipo === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'COMPLETADO',
        pageW,
    });

    // Bloque cliente (sin equipo específico)
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW });

    // Observaciones generales (del primer item si existe)
    const obsGral = sanitizarTexto(ticketItems[0]?.observaciones || leyenda || '');
    if (obsGral) {
        y = checkSalto(doc, y, 28);
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('OBSERVACIONES GENERALES', M, y);
        y += 5;
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const obsLines = doc.splitTextToSize(obsGral, CONTENT_W);
        obsLines.slice(0, 6).forEach((l, i) => doc.text(l, M, y + i * 4.2));
        y += Math.min(6, obsLines.length) * 4.2 + 6;
    }

    // Garantía
    y = checkSalto(doc, y, 18);
    y = dibujarGarantia(doc, { y, texto: garantiaTexto, pageW });

    // Firmas
    y = checkSalto(doc, y, 36);
    y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });

    // QR Google
    const linkGoogle = googleReviewLink || empresa.googleReviewLink;
    if (linkGoogle) {
        y = checkSalto(doc, y, 38);
        y = await dibujarQRGoogle(doc, { y, link: linkGoogle });
    }

    // ── Página 2: Detalle técnico por equipos ────────────────────────────────
    doc.addPage();
    dibujarHeaderCompacto(doc, { tipoLabel: 'DETALLE TÉCNICO POR EQUIPOS', fecha, tecnico, nroDoc });
    y = HEADER_H.compact + 8;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text('Registro completo de trabajos y repuestos utilizados por equipo', M, y);
    y += 6;

    // Tabla grande con sub-headers por equipo
    const bodyRows = [];
    const bodyMeta = []; // para saber qué filas son sub-headers

    ticketItems.forEach((item, idx) => {
        const modelo = item.modeloEquipo || item.equipoModelo || 'Dispenser';
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? `S/N: ${item.equipoSerial}` : '';
        const header = [`EQUIPO ${idx + 1}: ${modelo}${serial ? '  ·  ' + serial : ''}`, '', '', ''];
        bodyRows.push(header);
        bodyMeta.push({ isHeader: true });

        const filas = construirFilasItem(item);
        if (filas.length === 0) {
            bodyRows.push(['Sin items registrados', '', '', '']);
            bodyMeta.push({ isHeader: false });
        } else {
            filas.forEach(f => {
                bodyRows.push([f.concepto, String(f.cant), `$ ${f.unitario}`, `$ ${f.importe}`]);
                bodyMeta.push({ isHeader: false, esServicio: f.esServicio });
            });
        }

        // Subtotal del equipo
        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        bodyRows.push(['', '', 'Subtotal equipo', `$ ${sub.toLocaleString('es-AR')}`]);
        bodyMeta.push({ isHeader: false, isSubtotal: true });
    });

    autoTable(doc, {
        startY: y,
        head:  [['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 28 },
            3: { halign: 'right',  cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section !== 'body') return;
            const meta = bodyMeta[data.row.index];
            if (meta?.isHeader) {
                data.cell.styles.fillColor    = C.navyLight || [30, 65, 120];
                data.cell.styles.textColor    = C.white;
                data.cell.styles.fontStyle    = 'bold';
                data.cell.styles.fontSize     = T.xs;
            } else if (meta?.isSubtotal) {
                data.cell.styles.fillColor    = C.grayBg;
                data.cell.styles.fontStyle    = 'bold';
                data.cell.styles.textColor    = C.red;
            } else if (data.row.index % 2 === 0) {
                data.cell.styles.fillColor = C.grayZebra;
            }
            if (meta?.esServicio) data.cell.styles.textColor = C.navy;
        },
    });

    y = doc.lastAutoTable.finalY + 4;

    // Total final
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL FACTURADO', M + 4, y + 7);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${subtotalTotal.toLocaleString('es-AR')}`, pageW - M, y + 8, { align: 'right' });

    // ── Página 3: Evidencia fotográfica ─────────────────────────────────────
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc);
}

// ── FLUJO MULTI PRESUPUESTO ───────────────────────────────────────────────────

async function generarMultiPresupuesto(doc, {
    ticketItems, cliente, sede, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, descuentoPorcentaje,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    let y = HEADER_H.normal + 8;

    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );
    const pct       = parseFloat(descuentoPorcentaje || 0);
    const descuento = pct > 0 ? subtotalTotal * pct / 100 : 0;
    const total     = subtotalTotal - descuento;

    // Bloque cliente
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW });

    // Resumen general (métricas)
    y = dibujarResumenServicio(doc, {
        y,
        stats: [
            { valor: ticketItems.length, etiqueta: 'Equipos', colorValor: C.navy },
            { valor: ticketItems.reduce((a, it) => a + (it.repuestosUsados?.length || 0), 0) + ticketItems.filter(it => parseFloat(it.costoExtra || 0) > 0).length,
              etiqueta: 'Servicios estimados', colorValor: C.navy },
            { valor: fecha, etiqueta: 'Fecha', colorValor: C.dark },
            { valor: `$ ${total.toLocaleString('es-AR')}`, etiqueta: 'Total estimado', colorValor: C.red },
        ],
    });

    // Tabla grande por equipo
    const bodyRows = [];
    const bodyMeta = [];

    ticketItems.forEach((item, idx) => {
        const modelo = item.modeloEquipo || 'Dispenser';
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? `S/N: ${item.equipoSerial}` : '';
        bodyRows.push([`EQUIPO ${idx + 1}: ${modelo}${serial ? '  ·  ' + serial : ''}`, '', '', '']);
        bodyMeta.push({ isHeader: true });

        const filas = construirFilasItem(item);
        filas.forEach(f => {
            bodyRows.push([f.concepto, String(f.cant), `$ ${f.unitario}`, `$ ${f.importe}`]);
            bodyMeta.push({ isHeader: false, esServicio: f.esServicio });
        });

        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        bodyRows.push(['', '', 'Subtotal', `$ ${sub.toLocaleString('es-AR')}`]);
        bodyMeta.push({ isHeader: false, isSubtotal: true });
    });

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE EQUIPOS Y CONCEPTOS', M, y);
    y += 5;

    autoTable(doc, {
        startY: y,
        head:  [['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 28 },
            3: { halign: 'right',  cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section !== 'body') return;
            const meta = bodyMeta[data.row.index];
            if (meta?.isHeader) {
                data.cell.styles.fillColor = [30, 65, 120];
                data.cell.styles.textColor = C.white;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize  = T.xs;
            } else if (meta?.isSubtotal) {
                data.cell.styles.fillColor = C.grayBg;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = C.red;
            } else if (data.row.index % 2 === 0) {
                data.cell.styles.fillColor = C.grayZebra;
            }
        },
    });

    y = doc.lastAutoTable.finalY + 4;

    // Total final
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 4, y + 7);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M, y + 8, { align: 'right' });
    y += 16;

    // Validez
    const validez = new Date();
    validez.setDate(validez.getDate() + 7);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(`Válido hasta: ${validez.toLocaleDateString('es-AR')}  (7 días corridos)`, pageW - M, y, { align: 'right' });
    y += 6;

    // Condiciones
    y = checkSalto(doc, y, 36);
    y = dibujarCondiciones(doc, { y, pageW });

    // QR WhatsApp
    if (empresa.whatsapp) {
        y = checkSalto(doc, y, 48);
        y = await dibujarQRWhatsApp(doc, {
            x: M, y,
            telefono: empresa.whatsapp,
            mensaje:  `Hola, quiero aprobar el presupuesto ${nroDoc}`,
            nroDoc,
        });
    }

    // Firmas
    y = checkSalto(doc, y, 36);
    y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: true });
}

// ── FLUJO COMPROBANTE (venta de productos) ────────────────────────────────────

async function generarComprobante(doc, {
    ticketItems, cliente, sede, y, descuentoPorcentaje, leyenda,
}) {
    const pageW   = doc.internal.pageSize.getWidth();

    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW });

    const PROD_W = 18;
    const PROD_H = 18;
    const filas  = [];
    const fotos  = [];

    for (const item of ticketItems) {
        for (const r of (item.repuestosUsados || [])) {
            filas.push(['', r.nombre, r.sku || '—', String(r.cantidad),
                `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                `$ ${Number(r.subtotal ?? r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            fotos.push(await cargarFoto(r.fotoUrl || null));
        }
    }

    if (filas.length > 0) {
        y = checkSalto(doc, y, 40);
        autoTable(doc, {
            startY: y,
            head:  [['', 'Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']],
            body:  filas,
            theme: 'grid',
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
            bodyStyles: { fontSize: T.xs, textColor: C.dark, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, minCellHeight: PROD_H + 4, valign: 'middle', lineColor: C.grayBorder, lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: PROD_W + 4 }, 1: { cellWidth: 'auto' },
                2: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 18 },
                3: { halign: 'center', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
            },
            margin: { left: M, right: M },
            didParseCell: data => { if (data.section === 'body' && data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra; },
            didDrawCell: data => {
                if (data.section === 'body' && data.column.index === 0) {
                    const foto = fotos[data.row.index];
                    if (foto) {
                        const ix = data.cell.x + (data.cell.width - PROD_W) / 2;
                        const iy = data.cell.y + (data.cell.height - PROD_H) / 2;
                        doc.addImage(foto.data, foto.format, ix, iy, PROD_W, PROD_H);
                    }
                }
            },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );
    const pct       = parseFloat(descuentoPorcentaje || 0);
    const descuento = pct > 0 ? subtotalTotal * pct / 100 : 0;
    const total     = subtotalTotal - descuento;

    // Total
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL', M + 4, y + 7);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M, y + 8, { align: 'right' });
    y += 16;

    // Formas de pago
    y = checkSalto(doc, y, 20);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FORMAS DE PAGO', M, y);
    y += 5;
    ['Efectivo', 'Transferencia', 'Cuenta corriente'].forEach((m, i) => {
        const bW = 48;
        const bX = M + i * (bW + 3);
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.2);
        doc.roundedRect(bX, y - 4, bW, 7, 1.5, 1.5, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.navy);
        doc.text(m, bX + bW / 2, y, { align: 'center' });
    });
    y += 12;

    y = checkSalto(doc, y, 36);
    y = dibujarFirmas(doc, { y, firmaCliente: null, firmaTecnico: null, esPresupuesto: false });

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
    firmaCliente       = null,
    firmaTecnico       = null,
    proximoMantenimiento = null,
    garantiaTexto      = null,
    estadoFinal        = null,
    googleReviewLink   = null,
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
    const nroDoc        = generarNroDocumento(prefijo, fecha, tecnico || 'TEC');

    // Guardar nroDoc en backend
    if (servicioId) {
        try {
            const { default: api } = await import('../../services/api');
            api.patch(`/servicios/${servicioId}/nro-doc`, { nroDocumento: nroDoc }).catch(() => {});
        } catch {}
        localStorage.setItem(`pdf_nro_${servicioId}`, nroDoc);
    }

    // ── HEADER PRIMERA PÁGINA ─────────────────────────────────────────────────
    dibujarHeader(doc, {
        tipoLabel,
        fecha,
        tecnico: tecnico || null,
        nroDoc,
        estado:  getEstadoBadge(tipoDetectado),
    });

    let y = HEADER_H.normal + 8;

    // ── DISPATCH POR TIPO ─────────────────────────────────────────────────────
    const commonArgs = {
        cliente, sede, tecnico, fecha, nroDoc,
        firmaCliente, firmaTecnico, descuentoPorcentaje, garantiaTexto,
        proximoMantenimiento, googleReviewLink, leyenda,
    };

    if (tipoDetectado === 'COMPROBANTE') {
        await generarComprobante(doc, { ...commonArgs, ticketItems, y });

    } else if (tipoDetectado === 'PRESUPUESTO') {
        if (esMulti) {
            await generarMultiPresupuesto(doc, { ...commonArgs, ticketItems });
        } else {
            await generarSinglePresupuesto(doc, { ...commonArgs, item: ticketItems[0], y });
        }

    } else {
        // ORDEN_SERVICIO / INFORME_TECNICO
        if (esMulti) {
            await generarMultiTecnico(doc, { ...commonArgs, ticketItems, tipo: tipoDetectado });
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
    const leyendaLimpia = (leyenda || '').replace(/[\r\n]+/g, ' ').trim().substring(0, 110);
    const esOrdenFinal  = tipoDetectado === 'ORDEN_SERVICIO';
    const total         = doc.internal.getNumberOfPages();

    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        dibujarFooter(doc, {
            pagina:       i,
            totalPaginas: total,
            textoCentral: leyendaLimpia || null,
            conEstrellas: esOrdenFinal && i === 1,
        });
    }

    // ── GUARDAR ───────────────────────────────────────────────────────────────
    const nombreBase = tipoLabel.split(' ')[0];
    const nombreCliente = (cliente.nombre || 'Cliente').replace(/\s+/g, '-');
    const fechaStr = fecha.replace(/\//g, '-');
    doc.save(`${nombreBase}_${nombreCliente}_${fechaStr}.pdf`);
};
