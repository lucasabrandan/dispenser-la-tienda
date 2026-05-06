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
    dibujarBloqueEquipoDetalle,
    dibujarBloqueDiagnosticoDetalle,
    dibujarBloqueSolicitud,
    dibujarResumenServicio,
    dibujarChecklist,
    dibujarFirmas,
    dibujarGarantia,
    dibujarQRWhatsApp,
    dibujarQRGoogle,
    dibujarResumenEjecutivo,
    dibujarCondiciones,
    dibujarCondicionesYCTA,
    dibujarRegistroFotografico,
} from './bloques.js';
import { cargarFoto, checkSalto, sanitizarTexto } from './helpers.js';
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
        case 'ORDEN_SERVICIO':    return `TRABAJO REALIZADO${suf}`;
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
    incluirFirmas = true, descuentoPorcentaje = 0, leyenda = '',
}) {
    const pageW = doc.internal.pageSize.getWidth();

    // Cargar fotos
    const [fotoA, fotoD] = await Promise.all([
        cargarFoto(item.fotoAntes),
        cargarFoto(item.fotoDespues),
    ]);

    // • DATOS CLIENTE (sin columna derecha — el trabajo va en DIAGNÓSTICO DETALLE abajo)
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, y, pageW, diagnostico: null });

    // • DATOS EQUIPO — thumbnail solo si hay ambas fotos (evita duplicar fotoA en el registro)
    y = checkSalto(doc, y, 36);
    y = dibujarBloqueEquipoDetalle(doc, { item, y, pageW, fotoAntes: fotoD ? fotoA : null, conBullet: true });

    // Descripción del trabajo realizado
    const diagDetalle = sanitizarTexto(item.trabajo || item.resumenTexto || item.trabajoRealizado || item.observaciones || '');
    if (diagDetalle) {
        y = checkSalto(doc, y, 24);
        y = dibujarBloqueDiagnosticoDetalle(doc, { texto: diagDetalle, y, pageW, titulo: '• TRABAJO REALIZADO' });
    }

    const totalEquipo = parseFloat(item.totalCalculado || item.costo || 0);

    // • INFORMACIÓN PRECIOS
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('• INFORMACIÓN PRECIOS', M, y);
    y += 5;

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

    const tableData = filasConPlaceholder.map(r => [r.concepto, String(r.cant), r.unitario.startsWith('A') ? r.unitario : `$ ${r.unitario}`, r.importe.startsWith('A') ? r.importe : `$ ${r.importe}`]);

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
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                if (filasConPlaceholder[data.row.index]?.esServicio) data.cell.styles.textColor = C.navy;
            }
        },
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
    doc.roundedRect(M, tableEndY, CONTENT_W, 10, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL DEL SERVICIO', M + 3, tableEndY + 6.5);
    doc.setFontSize(sinItems ? T.xs : T.md);
    doc.setTextColor(...C.navy);
    doc.text(totalLabel, pageW - M - 2, tableEndY + 7, { align: 'right' });
    tableEndY += 15;
    y = tableEndY;

    // Registro fotográfico
    if (fotoA || fotoD) {
        y = checkSalto(doc, y, 90);
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
        doc.setFillColor(...C.greenLight);
        doc.setDrawColor(...C.green);
        doc.setLineWidth(0.3);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, 14, 2, 2, 'FD');
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.green);
        doc.text('PROXIMO MANTENIMIENTO SUGERIDO', M + 2, y + 5);
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
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('CONDICIONES', M + 2, y + 6);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        leyLines.slice(0, 4).forEach((l, i) => doc.text(l, M + 2, y + 11 + i * 4.2));
        y += leyH + 4;
    }

    // Garantía
    y = checkSalto(doc, y, 18);
    y = dibujarGarantia(doc, { y, texto: garantiaTexto, pageW });

    // Firmas + QR Google juntos en la misma página si hay espacio
    const empresa    = getEmpresa();
    const linkGoogle = googleReviewLink || empresa.googleReviewLink;
    const bloqueH    = (incluirFirmas ? 36 : 0) + (linkGoogle ? 38 : 0);
    const pageH      = doc.internal.pageSize.getHeight();
    if (bloqueH > 0 && y + bloqueH > pageH - 26) {
        doc.addPage();
        y = 18;
    }
    if (incluirFirmas) {
        y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });
    }
    if (linkGoogle) {
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

    // Cargar foto ANTES (para bloque equipo) y foto DESPUÉS (evidencia adicional si hay ambas)
    const [fotoAntes, fotoDespues] = await Promise.all([
        cargarFoto(item.fotoAntes || item.fotoEquipo || null),
        cargarFoto(item.fotoAntes && item.fotoDespues ? item.fotoDespues : null),
    ]);

    // Bloque cliente (sin diagnóstico en columna — va en sección propia debajo)
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, y, pageW, diagnostico: null });

    // Bloque equipo separado con foto ANTES a la derecha
    y = checkSalto(doc, y, 36);
    y = dibujarBloqueEquipoDetalle(doc, { item, y, pageW, fotoAntes });

    // Bloque PROBLEMA / SOLICITUD separado (como en referencia)
    const diagnostico = sanitizarTexto(item.trabajo || item.resumenTexto || item.descripcion || '');
    if (diagnostico) {
        y = checkSalto(doc, y, 24);
        y = dibujarBloqueSolicitud(doc, { texto: diagnostico, y, pageW });
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
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE CONCEPTOS', M, y);
    y += 5;

    const tableDataP = filasConPlaceholder.map(r => [
        r.concepto, String(r.cant),
        r.unitario.startsWith('A') ? r.unitario : `$ ${r.unitario}`,
        r.importe.startsWith('A')  ? r.importe  : `$ ${r.importe}`,
    ]);

    autoTable(doc, {
        startY: y,
        head:  [['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
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
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 26 },
            3: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                if (filasConPlaceholder[data.row.index]?.esServicio) data.cell.styles.textColor = C.navy;
            }
        },
    });

    let presupTableEndY = doc.lastAutoTable.finalY + 3;
    const totalPresupLabel = sinItems ? 'A coordinar con el cliente' : total.toLocaleString('es-AR');
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, presupTableEndY, CONTENT_W, 10, 1.5, 1.5, 'FD');
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL ESTIMADO DEL SERVICIO', M + 3, presupTableEndY + 6.5);
    doc.setFontSize(sinItems ? T.xs : T.md);
    doc.setTextColor(...C.navy);
    doc.text(sinItems ? totalPresupLabel : `$ ${totalPresupLabel}`, pageW - M - 2, presupTableEndY + 7, { align: 'right' });
    presupTableEndY += 15;
    y = presupTableEndY;

    // Validez
    const validez = new Date();
    validez.setDate(validez.getDate() + 7);
    y += 3;
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...C.grayText);
    doc.text(`Válido hasta: ${validez.toLocaleDateString('es-AR')}  (7 días corridos)`, pageW - M, y, { align: 'right' });
    y += 6;

    // Foto del problema (solo si hay segunda foto real además de la de equipo)
    if (fotoDespues) {
        y = checkSalto(doc, y, 40);
        const COL_W  = (CONTENT_W - 6) / 2;
        const FOTO_H = Math.floor((COL_W * 3) / 4);
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('EVIDENCIA FOTOGRÁFICA DEL PROBLEMA', M, y);
        y += 5;
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(M + 1.5, y + 1.5, COL_W, FOTO_H, 2, 2, 'F');
        try { doc.addImage(fotoDespues.data, fotoDespues.format, M, y, COL_W, FOTO_H); } catch {}
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M, y, COL_W, FOTO_H, 2, 2, 'S');
        y += FOTO_H + 8;
    }

    // Condiciones + CTA en el mismo bloque compacto (sin firmas — el cliente no aceptó aún)
    y = checkSalto(doc, y, 54);
    y = dibujarCondicionesYCTA(doc, { y, pageW, empresa, nroDoc });

    return y;
}

// ── FLUJO MULTI TÉCNICO (varias páginas) ──────────────────────────────────────

async function generarMultiTecnico(doc, {
    ticketItems, cliente, sede, tipo, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, garantiaTexto, googleReviewLink, leyenda,
    incluirFirmas = true, descuentoPorcentaje = 0,
}) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // ── Página 1: Resumen ejecutivo ──────────────────────────────────────────
    const subtotalTotal = ticketItems.reduce(
        (a, it) => a + (parseFloat(it.totalCalculado) || parseFloat(it.costo) || 0), 0,
    );

    let y = HEADER_H.normal + 8;

    // Resumen: solo equipos + total
    y = dibujarResumenServicio(doc, {
        y,
        stats: [
            { valor: ticketItems.length,                              etiqueta: 'Equipos atendidos', colorValor: C.navy },
            { valor: `$ ${subtotalTotal.toLocaleString('es-AR')}`,   etiqueta: 'Total del servicio', colorValor: C.red  },
        ],
    });

    // Bloque cliente sin diagnóstico — cada equipo tiene su propio trabajo
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: null });

    // Garantía
    y = checkSalto(doc, y, 18);
    y = dibujarGarantia(doc, { y, texto: garantiaTexto, pageW });

    // Firmas
    if (incluirFirmas) {
        y = checkSalto(doc, y, 36);
        y = dibujarFirmas(doc, { y, firmaCliente, firmaTecnico, esPresupuesto: false });
    }

    // QR Google
    const linkGoogle = googleReviewLink || empresa.googleReviewLink;
    if (linkGoogle) {
        y = checkSalto(doc, y, 38);
        y = await dibujarQRGoogle(doc, { y, link: linkGoogle });
    }

    // ── Página 2: Detalle técnico por equipos (1 fila por equipo, columnas trabajo/repuestos) ──
    doc.addPage();
    dibujarHeaderCompacto(doc, { tipoLabel: 'DETALLE TÉCNICO POR EQUIPOS', fecha, tecnico, nroDoc });
    y = HEADER_H.compact + 8;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text('Registro completo de trabajos y repuestos utilizados por equipo', M, y);
    y += 6;

    const bodyRows = [];
    const bodyMeta = [];

    ticketItems.forEach((item, idx) => {
        const modelo = item.modeloEquipo || item.equipoModelo || 'Dispenser';
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? `S/N: ${item.equipoSerial}` : '';
        const ubic = item.ubicacionEquipo || item.equipoUbicacion || '';

        const equipoCell = [
            `${idx + 1}. ${modelo}`,
            serial ? serial : null,
            ubic   ? ubic   : null,
        ].filter(Boolean).join('\n');

        // Trabajo (mano de obra)
        const mo   = parseFloat(item.costoExtra || 0);
        const desc = (item.trabajo || item.trabajoRealizado || '').trim();
        const partesMO = [];
        if (desc) partesMO.push(desc);
        if (mo > 0) partesMO.push(`· Mano de obra\n  $ ${mo.toLocaleString('es-AR')}`);
        const trabajoCell = partesMO.length > 0 ? partesMO.join('\n') : '—';

        // Repuestos
        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => {
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                return `· ${r.nombre} (x${r.cantidad})\n  $ ${sub.toLocaleString('es-AR')}`;
              }).join('\n')
            : '—';

        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : '$ 0';

        bodyRows.push([equipoCell, trabajoCell, repCell, importeCell]);
        bodyMeta.push({ idx });
    });

    autoTable(doc, {
        startY: y,
        head:  [['EQUIPO', 'TRABAJO INCLUIDO', 'REPUESTOS INCLUIDOS', 'IMPORTE']],
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark, valign: 'top',
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold' },
            1: { cellWidth: 44 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy },
        },
        margin: { left: M, right: M },
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
    doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL FACTURADO', M + 4, y + 7);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text(`$ ${totalFinalM.toLocaleString('es-AR')}`, pageW - M, y + 8, { align: 'right' });
    y += 16;

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
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('CONDICIONES', M + 2, y + 6);
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
    ticketItems, cliente, sede, fecha, nroDoc, tecnico,
    firmaCliente, firmaTecnico, descuentoPorcentaje, leyenda,
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

    // Bloque cliente sin diagnóstico — en multi cada equipo tiene su propio trabajo
    y = dibujarBloqueClienteEquipo(doc, { cliente, sede, item: null, y, pageW, diagnostico: null });

    // Resumen: solo equipos + total
    y = dibujarResumenServicio(doc, {
        y,
        stats: [
            { valor: ticketItems.length,                        etiqueta: 'Equipos',         colorValor: C.navy },
            { valor: `$ ${total.toLocaleString('es-AR')}`,     etiqueta: 'Total estimado',  colorValor: C.red  },
        ],
    });

    // Tabla columnar por equipo (formato: EQUIPO | TRABAJO ESTIMADO | REPUESTOS ESTIMADOS | IMPORTE)
    const bodyRows = [];

    ticketItems.forEach((item, idx) => {
        const modelo = item.modeloEquipo || item.equipoModelo || 'Dispenser';
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? `S/N: ${item.equipoSerial}` : '';
        const ubic = item.ubicacionEquipo || item.equipoUbicacion || '';

        const equipoCell = [
            `${idx + 1}. ${modelo}`,
            serial || null,
            ubic   || null,
        ].filter(Boolean).join('\n');

        const mo   = parseFloat(item.costoExtra || 0);
        const desc = (item.trabajo || item.trabajoRealizado || '').trim();
        const partesMO = [];
        if (desc) partesMO.push(desc);
        if (mo > 0) partesMO.push(`· Mano de obra\n  $ ${mo.toLocaleString('es-AR')}`);
        const trabajoCell = partesMO.length > 0 ? partesMO.join('\n') : '—';

        const reps = item.repuestosUsados || [];
        const repCell = reps.length > 0
            ? reps.map(r => {
                const sub = parseFloat(r.subtotal ?? r.precio * r.cantidad ?? 0);
                return `· ${r.nombre} (x${r.cantidad})\n  $ ${sub.toLocaleString('es-AR')}`;
              }).join('\n')
            : '—';

        const sub = parseFloat(item.totalCalculado || item.costo || 0);
        const importeCell = sub > 0 ? `$ ${sub.toLocaleString('es-AR')}` : 'A coordinar';

        bodyRows.push([equipoCell, trabajoCell, repCell, importeCell]);
    });

    y = checkSalto(doc, y, 40);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE EQUIPOS Y CONCEPTOS', M, y);
    y += 5;

    autoTable(doc, {
        startY: y,
        head:  [['EQUIPO', 'TRABAJO ESTIMADO', 'REPUESTOS ESTIMADOS', 'IMPORTE']],
        body:  bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark, valign: 'top',
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold' },
            1: { cellWidth: 44 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: C.navy },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section !== 'body') return;
            if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
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

    // Página de fotos de equipos (solo si algún ítem tiene fotoAntes)
    await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc, {
        tipoLabel: 'FOTOGRAFÍAS DE LOS EQUIPOS',
        subtitulo: 'ESTADO ACTUAL DE CADA EQUIPO',
        soloAntes: true,
    });
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
        firmaCliente:  incluirFirmas ? firmaCliente  : null,
        firmaTecnico:  incluirFirmas ? firmaTecnico  : null,
        incluirFirmas,
        descuentoPorcentaje, garantiaTexto,
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
    // Para ORDEN_SERVICIO ignoramos leyenda en footer para que muestre estrellas siempre
    const esOrdenFinal      = tipoDetectado === 'ORDEN_SERVICIO';
    const esTipoPresupuesto = tipoDetectado === 'PRESUPUESTO';
    const leyendaLimpia = (esOrdenFinal || esTipoPresupuesto)
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
    doc.save(`${nombreBase}_${nombreCliente}_${fechaStr}.pdf`);
};
