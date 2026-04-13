import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import {
    DARK, RED, GRAY_MID,
    procesarFecha, dibujarHeaderPDF, dibujarHeaderPDFCompacto, dibujarFooterPDF
} from './pdfTheme';
import { construirUrlFoto } from './construirUrlFoto';

// ── Paleta ───────────────────────────────────────────────────────────────────
const CARD_BG     = [248, 248, 247];
const CARD_SHADOW = [232, 230, 228];
const TOTAL_BG    = [244, 243, 241];
const META_TEXT   = [155, 150, 144];
const ZEBRA       = [251, 250, 249];

// ── Niveles de compresión progresiva ─────────────────────────────────────────
// Se itera de menor a mayor compresión hasta que el contenido entra en la hoja.
const NIVELES_COMPRESION = [
    { maxLineas: 4, fotoW: 58, fotoH: 76, gap: 4, cardPad: 3, maxTablaRows: 99 },
    { maxLineas: 3, fotoW: 52, fotoH: 66, gap: 3, cardPad: 2, maxTablaRows: 8  },
    { maxLineas: 2, fotoW: 46, fotoH: 56, gap: 2, cardPad: 2, maxTablaRows: 6  },
    { maxLineas: 1, fotoW: 40, fotoH: 48, gap: 2, cardPad: 1, maxTablaRows: 4  },
];

// ── Margen de seguridad inferior (nunca dibujar por debajo) ──────────────────
const MARGEN_SEG = 22; // mm

// ── Sanitización de texto ────────────────────────────────────────────────────
function sanitizarTexto(texto, maxLen = 400) {
    if (!texto) return '';
    return texto
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLen)
        // Cortar palabras sueltas de más de 30 caracteres
        .split(' ')
        .map(w => w.length > 30 ? w.substring(0, 28) + '…' : w)
        .join(' ');
}

function sanitizarLeyenda(leyenda, maxLen = 110) {
    if (!leyenda) return '';
    return leyenda
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLen);
}

// ── Truncar texto a N líneas con ellipsis ────────────────────────────────────
function truncarLineas(doc, texto, maxWidth, maxLineas) {
    if (!texto) return [];
    const todas = doc.splitTextToSize(texto, maxWidth);
    if (todas.length <= maxLineas) return todas;
    const cortadas = todas.slice(0, maxLineas);
    const ultima   = cortadas[maxLineas - 1];
    cortadas[maxLineas - 1] = ultima.length > 4
        ? ultima.substring(0, ultima.length - 3) + '...'
        : '...';
    return cortadas;
}

// ── Construir línea de metadata con prioridad y sin superponer precio ─────────
// Prioridad: modelo > serial > ubicacion > garantia
function buildMetaLinea(doc, modelo, serial, ubicacion, garantia, maxW, fontSize) {
    doc.setFontSize(fontSize);
    const mide = s => doc.getStringUnitWidth(s) * fontSize / doc.internal.scaleFactor;

    const base = modelo || 'Dispenser';
    const partes = [
        serial    ? `N/S: ${serial}`      : null,
        ubicacion ? `Ubic.: ${ubicacion}` : null,
        garantia  ? `Gta: ${garantia}`    : null,
    ].filter(Boolean);

    // Intentar agregar partes de a una
    let linea = base;
    for (const p of partes) {
        const candidato = linea + '  ·  ' + p;
        if (mide(candidato) <= maxW) {
            linea = candidato;
        } else {
            break; // no agrega más — las de menor prioridad tampoco
        }
    }

    // Si el base solo ya no entra, truncar
    if (mide(linea) > maxW) {
        let s = linea;
        while (s.length > 4 && mide(s + '...') > maxW) s = s.slice(0, -1);
        linea = s + '...';
    }

    return linea;
}

// ── Limitar filas de tabla agrupando las sobrantes ────────────────────────────
function limitarFilas(rows, maxRows, moVal) {
    if (rows.length <= maxRows) return rows;
    const moRows   = moVal > 0 ? 1 : 0;
    const limite   = Math.max(moRows, maxRows - 1); // dejar lugar para el "resumen"
    const cortadas = rows.slice(0, limite);
    const restantes = rows.length - limite;
    cortadas.push([`+ ${restantes} ítem${restantes > 1 ? 's' : ''} más`, '', '—']);
    return cortadas;
}

// ── Estimar altura de un item con una config de compresión ────────────────────
function estimarAlturaConCfg(item, cfg, doc) {
    let h = 14; // label equipo + línea meta + padding superior

    const texto = sanitizarTexto(item.trabajo || item.trabajoRealizado || item.resumenTexto || '');
    if (texto) {
        doc.setFontSize(7.5);
        const lineas = Math.min(Math.min(cfg.maxLineas, 3),
            doc.splitTextToSize(texto, 155).length);
        h += 6 + lineas * 4 + 4;
    }

    const moVal = parseFloat(item.costoExtra || 0);
    const nRaw  = (moVal > 0 ? 1 : 0) + (item.repuestosUsados?.length || 0);
    const nRows = Math.min(cfg.maxTablaRows, nRaw) + (nRaw > cfg.maxTablaRows ? 1 : 0);
    if (nRows > 0) h += 8 + nRows * 5.5;

    const nFotos = (item.fotoAntes ? 1 : 0) + (item.fotoDespues ? 1 : 0);
    if (nFotos > 0) h += cfg.fotoH + 16;

    h += 20; // total dentro de card
    h += cfg.cardPad * 2 + cfg.gap;

    return h;
}

// ── Carga foto lista para addImage ───────────────────────────────────────────
async function cargarFoto(src) {
    if (!src) return null;
    let dataUrl = null;
    if (src instanceof File) {
        dataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror  = () => resolve(null);
            reader.readAsDataURL(src);
        });
    } else if (typeof src === 'string' && src.startsWith('data:')) {
        dataUrl = src;
    } else {
        try {
            const url = construirUrlFoto(src);
            if (!url) return null;
            const res = await fetch(url);
            if (!res.ok) return null;
            const blob = await res.blob();
            dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror  = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    }
    if (!dataUrl) return null;
    return { data: dataUrl, format: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG' };
}

// ── Dibuja una foto individual con label y sombra ────────────────────────────
function dibujarFoto(doc, foto, x, y, w, h, label) {
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...META_TEXT);
    doc.text(label, x + w / 2, y, { align: 'center' });
    const fy = y + 3;
    doc.setFillColor(...CARD_SHADOW);
    doc.roundedRect(x + 1.5, fy + 1.5, w, h, 1.5, 1.5, 'F');
    if (foto) {
        doc.addImage(foto.data, foto.format, x, fy, w, h);
        doc.setDrawColor(210, 207, 203);
        doc.setLineWidth(0.15);
        doc.roundedRect(x, fy, w, h, 1.5, 1.5, 'S');
    } else {
        doc.setFillColor(...CARD_BG);
        doc.roundedRect(x, fy, w, h, 1.5, 1.5, 'F');
        doc.setFontSize(6);
        doc.setTextColor(...META_TEXT);
        doc.text('No disponible', x + w / 2, fy + h / 2, { align: 'center' });
    }
}

// ── Número de presupuesto único por documento ────────────────────────────────
// Formato: PP-DDMM-INITECNICO-XX (PP = presupuesto, RS = remito)
function generarNroDocumento(esPresupuesto, fecha, tecnico) {
    const partesFecha = (fecha || '').split('/');
    const ddmm = partesFecha.length >= 2
        ? `${partesFecha[0].padStart(2,'0')}${partesFecha[1].padStart(2,'0')}`
        : new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' }).replace('/','');

    const palabras = (tecnico || 'TEC').trim().split(/\s+/);
    // 2 palabras: inicial-nombre + inicial-apellido (ej: Lucas Brandan → LB)
    // 1 palabra: primeras 3 letras (ej: Lucas → LUC)
    const ini = palabras.length >= 2
        ? (palabras[0][0] + palabras[1][0]).toUpperCase()
        : palabras[0].substring(0, 3).toUpperCase();

    const storageKey = `pdf_counter_${ddmm}`;
    const n = (parseInt(localStorage.getItem(storageKey) || '0')) + 1;
    localStorage.setItem(storageKey, n.toString());

    const prefijo = esPresupuesto ? 'PP' : 'RS';
    return `${prefijo}-${ddmm}-${ini}-${String(n).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export const generarRemitoPDFPremium = async ({
    esPresupuesto, cliente, sede, tecnico, ticketItems, fechaServicio,
    descuentoPorcentaje = 0,
    leyenda = '',
    esTecnicoForzado = null
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }

    const doc   = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const fecha = procesarFecha(fechaServicio);

    const esTecnico  = esTecnicoForzado !== null
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
    const esSolaHoja = ticketItems.length === 1;
    const esCompacto = ticketItems.length >= 2;

    // ── Número único de documento ────────────────────────────────────────────
    const nroDoc = generarNroDocumento(esPresupuesto, fecha, tecnico || 'TEC');

    // ── Tamaños para modo múltiples equipos (compacto) ───────────────────────
    const FOTO_W_MULTI = 50;
    const FOTO_H_MULTI = 65;

    // ── Totales ──────────────────────────────────────────────────────────────
    const subtotalBruto = ticketItems.reduce((a, b) =>
        a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc    = parseFloat(descuentoPorcentaje) || 0;
    const montoDesc  = pctDesc > 0 ? subtotalBruto * pctDesc / 100 : 0;
    const totalFinal_ = subtotalBruto - montoDesc;

    const tipoLabel = esPresupuesto
        ? (esTecnico ? 'PRESUPUESTO DE SERVICIO TÉCNICO' : 'PRESUPUESTO DE VENTA')
        : (esTecnico ? 'REMITO DE SERVICIO TÉCNICO'      : 'COMPROBANTE DE VENTA');

    // ── HEADER ───────────────────────────────────────────────────────────────
    const subtitulo = esTecnico && tecnico ? `Técnico: ${tecnico}` : null;
    if (esCompacto) {
        dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo, nroDoc);
    } else {
        dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo, nroDoc);
    }

    // ── BLOQUE CLIENTE — layout vertical, legibilidad prioritaria ────────────
    // Header compacto: contenido empieza en y=35 (normal) / y=35 (compacto)
    let y = esCompacto ? 35 : 41;

    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(14, y, pageW - 14, y);
    y += 6;

    doc.setFontSize(6);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text('PARA', 14, y);
    y += 5;

    // Nombre — grande y en negrita
    doc.setFontSize(esCompacto ? 12 : 14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(cliente.nombre?.toUpperCase() || 'PARTICULAR', 14, y);
    y += 5;

    // Datos de contacto — estructura vertical, prioridad: tel > dir > cuit > condición
    const contactoLines = [
        cliente.telefono        ? `Tel: ${cliente.telefono}`              : null,
        sede?.direccion         ? `Dir: ${sede.direccion}`                : (sede?.nombreSede || null),
        cliente.cuilDni         ? `CUIT/DNI: ${cliente.cuilDni}`         : null,
        cliente.condicionFiscal ? `Cond: ${cliente.condicionFiscal}`      : null,
    ].filter(Boolean);

    if (contactoLines.length > 0) {
        const maxLineasContacto = esCompacto ? 2 : 3;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...DARK);
        contactoLines.slice(0, maxLineasContacto).forEach(linea => {
            doc.text(linea, 14, y);
            y += 4.5;
        });
    }

    y += 2;
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(14, y, pageW - 14, y);
    y += 8;

    // ── ITEMS TÉCNICOS ───────────────────────────────────────────────────────
    if (esTecnico) {

        for (const [idx, item] of ticketItems.entries()) {

            const MARGEN_INF = pageH - MARGEN_SEG;

            // ── Elegir nivel de compresión + salto de página inteligente ──
            // Para cada equipo: calcular altura total antes de dibujar.
            // Si no entra completo, mover a página nueva (nunca cortar una card).
            let cfg;
            if (esSolaHoja) {
                // Elegir la menor compresión que quepa en el espacio disponible
                const alturaDisponible = MARGEN_INF - y;
                cfg = NIVELES_COMPRESION[NIVELES_COMPRESION.length - 1]; // fallback mínimo
                for (const nivel of NIVELES_COMPRESION) {
                    if (estimarAlturaConCfg(item, nivel, doc) <= alturaDisponible) {
                        cfg = nivel;
                        break;
                    }
                }
            } else {
                // Multi-equipo: config compacta fija
                cfg = { maxLineas: 3, fotoW: FOTO_W_MULTI, fotoH: FOTO_H_MULTI,
                        gap: 8, cardPad: 3, maxTablaRows: 99 };
                // Salto de página: si el bloque completo no cabe, iniciar nueva página
                const altEst = estimarAlturaConCfg(item, cfg, doc);
                if (y + altEst > MARGEN_INF) { doc.addPage(); y = 18; }
            }

            const subtotalEquipo = parseFloat(item.totalCalculado || item.costo || 0);
            const modelo    = item.modeloEquipo    || item.equipoModelo    || null;
            const serial    = (item.equipoSerial && item.equipoSerial !== 'MOSTRADOR' && item.equipoSerial !== 'SIN-SN')
                ? item.equipoSerial : null;
            const ubicacion = item.ubicacionEquipo || item.equipoUbicacion || null;
            const garantia  = item.garantiaHasta   || null;

            // ── Card background ───────────────────────────────────────────
            const alturaCard = estimarAlturaConCfg(item, cfg, doc);
            doc.setFillColor(...CARD_BG);
            doc.roundedRect(12, y - cfg.cardPad, pageW - 24, alturaCard, 3, 3, 'F');

            const xI = 16;

            // ── Label equipo (capitalizado, no grito) ─────────────────────
            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...RED);
            doc.text(`Equipo ${idx + 1}`, xI, y);

            // ── Línea única: modelo · serial · ubic  +  precio ───────────
            y += 5;
            const T_TITULO  = esSolaHoja ? 10 : 9.5;
            const precioStr = `$ ${subtotalEquipo.toLocaleString('es-AR')}`;
            doc.setFontSize(T_TITULO);
            const precioW   = doc.getStringUnitWidth(precioStr) * T_TITULO / doc.internal.scaleFactor + 6;
            const maxMetaW  = pageW - xI - 16 - precioW;

            const metaTexto = buildMetaLinea(doc, modelo, serial, ubicacion, garantia, maxMetaW, T_TITULO);

            doc.setFontSize(T_TITULO);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(metaTexto, xI, y);
            doc.text(precioStr, pageW - 16, y, { align: 'right' });
            y += 8;

            // ── Detalle del servicio — altura máxima fija ─────────────────
            const textoTrabajo = sanitizarTexto(
                (item.trabajo || item.trabajoRealizado || item.resumenTexto || '').replace(/\| MO:.*/, '')
            );

            if (textoTrabajo) {
                const T_BODY = esSolaHoja ? 7.5 : 7.5;
                // Nunca sobrepasar margen de seguridad
                if (!esSolaHoja && y + 20 > MARGEN_INF) { doc.addPage(); y = 18; }

                doc.setFontSize(6);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...RED);
                doc.text('DETALLE DEL SERVICIO', xI, y);
                y += 4;

                doc.setFontSize(T_BODY);
                // Máximo 3 líneas siempre — altura fija, no empuja tabla ni total
                const lineas = truncarLineas(doc, textoTrabajo, pageW - xI - 16, Math.min(cfg.maxLineas, 3));
                doc.setFont(undefined, 'normal');
                doc.setTextColor(55, 53, 50);
                doc.text(lineas, xI, y);
                y += lineas.length * 4 + 4;
            }

            // ── Tabla ─────────────────────────────────────────────────────
            const moVal = parseFloat(item.costoExtra || 0);
            let rows = [];
            if (moVal > 0) rows.push(['Mano de obra / Servicio técnico', '1', `$ ${moVal.toLocaleString('es-AR')}`]);
            (item.repuestosUsados || []).forEach(r => {
                rows.push([r.nombre, r.cantidad.toString(),
                           `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            });
            rows = limitarFilas(rows, cfg.maxTablaRows, moVal);

            if (rows.length > 0) {
                if (!esSolaHoja && y + 10 + rows.length * 5.5 > MARGEN_INF) { doc.addPage(); y = 18; }

                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Cant.', 'Importe']],
                    body: rows,
                    theme: 'plain',
                    headStyles: {
                        fillColor: false, textColor: [140, 135, 128], fontStyle: 'bold',
                        fontSize: 6, cellPadding: { top: 1.5, bottom: 2, left: 2, right: 2 },
                        lineColor: GRAY_MID, lineWidth: { bottom: 0.4 }
                    },
                    bodyStyles: {
                        fontSize: 7.5, textColor: DARK,
                        cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
                        lineColor: [238, 236, 233], lineWidth: { bottom: 0.2 }
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { halign: 'center', cellWidth: 13 },
                        2: { halign: 'right',  cellWidth: 26, fontStyle: 'bold' }
                    },
                    margin: { left: xI, right: 16 },
                    didParseCell: data => {
                        if (data.section === 'body' && data.row.index === 0 && moVal > 0)
                            data.cell.styles.textColor = RED;
                        if (data.section === 'body' && data.row.index % 2 === 0)
                            data.cell.styles.fillColor = ZEBRA;
                    }
                });
                y = doc.lastAutoTable.finalY + 5;
            }

            // ── TOTAL — inmediatamente después de la tabla, antes de fotos ──
            // Prioridad máxima: nunca se omite
            y += 3;
            doc.setDrawColor(...GRAY_MID);
            doc.setLineWidth(0.2);
            doc.line(xI, y, pageW - 16, y);
            y += 5;

            if (esSolaHoja) {
                // Total completo con desglose de descuento
                const tH = pctDesc > 0 ? 28 : 18;
                doc.setFillColor(...TOTAL_BG);
                doc.roundedRect(pageW - 82, y - 4, 66, tH, 3, 3, 'F');

                if (pctDesc > 0) {
                    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
                    doc.setTextColor(...META_TEXT);
                    doc.text('Subtotal', pageW - 78, y);
                    doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
                    y += 6;
                    doc.setTextColor(...RED);
                    doc.text(`Descuento (${pctDesc}%)`, pageW - 78, y);
                    doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
                    y += 4;
                    doc.setDrawColor(...GRAY_MID);
                    doc.line(pageW - 78, y, pageW - 16, y);
                    y += 5;
                }

                doc.setFontSize(7); doc.setFont(undefined, 'bold');
                doc.setTextColor(...META_TEXT);
                doc.text('TOTAL', pageW - 78, y);
                doc.setFontSize(18); doc.setFont(undefined, 'bold');
                doc.setTextColor(...DARK);
                doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, pageW - 16, y + 1, { align: 'right' });
                y += 8;
            } else {
                // Subtotal por equipo dentro de su card
                doc.setFontSize(7); doc.setFont(undefined, 'bold');
                doc.setTextColor(...META_TEXT);
                doc.text(`Subtotal equipo ${idx + 1}`, pageW - 78, y);
                doc.setFontSize(11); doc.setFont(undefined, 'bold');
                doc.setTextColor(...DARK);
                doc.text(`$ ${subtotalEquipo.toLocaleString('es-AR')}`, pageW - 16, y + 1, { align: 'right' });
                y += 8;
            }

            // ── Fotos — SIEMPRE al final del bloque, después del total ────
            const fotoA  = await cargarFoto(item.fotoAntes);
            const fotoD  = await cargarFoto(item.fotoDespues);
            const nFotos = (fotoA ? 1 : 0) + (fotoD ? 1 : 0);

            if (nFotos > 0) {
                if (!esSolaHoja && y + cfg.fotoH + 16 > MARGEN_INF) { doc.addPage(); y = 18; }

                doc.setFontSize(6);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...RED);
                doc.text('EVIDENCIA DEL SERVICIO', xI, y + 3);
                y += 9;

                if (nFotos === 2) {
                    const GAP    = 8;
                    const totalW = cfg.fotoW * 2 + GAP;
                    const xL     = (pageW - totalW) / 2;
                    dibujarFoto(doc, fotoA, xL,                    y, cfg.fotoW, cfg.fotoH, 'Estado inicial');
                    dibujarFoto(doc, fotoD, xL + cfg.fotoW + GAP,  y, cfg.fotoW, cfg.fotoH, 'Resultado final');
                } else {
                    const xSola = (pageW - cfg.fotoW) / 2;
                    dibujarFoto(doc, fotoA || fotoD, xSola, y, cfg.fotoW, cfg.fotoH,
                        fotoA ? 'Estado inicial' : 'Resultado final');
                }
                y += cfg.fotoH + 8;
            }

            // Separador entre equipos (multi-equipo)
            if (!esSolaHoja) {
                if (idx < ticketItems.length - 1) {
                    y += 4;
                    doc.setDrawColor(...GRAY_MID);
                    doc.setLineWidth(0.1);
                    doc.setLineDashPattern([1, 1.5], 0);
                    doc.line(14, y, pageW - 14, y);
                    doc.setLineDashPattern([], 0);
                    y += cfg.gap;
                } else {
                    y += cfg.gap;
                }
            }
        }

        // ── Total externo (múltiples equipos) — prioridad máxima ─────────
        if (!esSolaHoja) {
            const MARGEN_INF = pageH - MARGEN_SEG;
            const tH = pctDesc > 0 ? 30 : 20;
            if (y + tH > MARGEN_INF) { doc.addPage(); y = 18; }

            doc.setFillColor(...TOTAL_BG);
            doc.roundedRect(pageW - 82, y - 4, 66, tH, 3, 3, 'F');

            if (pctDesc > 0) {
                doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
                doc.setTextColor(...META_TEXT);
                doc.text('Subtotal', pageW - 78, y);
                doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
                y += 6;
                doc.setTextColor(...RED);
                doc.text(`Descuento (${pctDesc}%)`, pageW - 78, y);
                doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
                y += 4;
                doc.setDrawColor(...GRAY_MID);
                doc.line(pageW - 78, y, pageW - 16, y);
                y += 5;
            } else { y += 3; }

            doc.setFontSize(7); doc.setFont(undefined, 'bold');
            doc.setTextColor(...META_TEXT);
            doc.text('TOTAL', pageW - 78, y);
            doc.setFontSize(18); doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, pageW - 16, y + 1, { align: 'right' });
        }

    } else {
        // ── VENTA ─────────────────────────────────────────────────────────
        const MARGEN_INF = pageH - MARGEN_SEG;
        const PROD_IMG_W = 18;
        const PROD_IMG_H = 18;

        const filas = [];
        ticketItems.forEach(item => {
            (item.repuestosUsados || []).forEach(r => {
                filas.push({
                    fotoSrc: r.fotoUrl || null,
                    row: ['', r.nombre, r.sku || '—', r.cantidad.toString(),
                          `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                          `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`]
                });
            });
            if (item.costoExtra > 0) {
                filas.push({ fotoSrc: null,
                    row: ['', 'Envío / Logística', '—', '1', '—',
                          `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`] });
            }
        });

        if (filas.length > 0) {
            const fotosVenta = await Promise.all(filas.map(f => cargarFoto(f.fotoSrc)));
            autoTable(doc, {
                startY: y,
                head: [['', 'Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']],
                body: filas.map(f => f.row),
                theme: 'plain',
                headStyles: {
                    fillColor: false, textColor: [140, 135, 128], fontStyle: 'bold',
                    fontSize: 6.5, cellPadding: { top: 2, bottom: 3, left: 2, right: 2 },
                    lineColor: GRAY_MID, lineWidth: { bottom: 0.5 }
                },
                bodyStyles: {
                    fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
                    lineColor: [238, 236, 233], lineWidth: { bottom: 0.2 },
                    minCellHeight: PROD_IMG_H + 4, valign: 'middle',
                },
                columnStyles: {
                    0: { cellWidth: PROD_IMG_W + 4 },
                    1: { cellWidth: 'auto' },
                    2: { textColor: META_TEXT, fontSize: 7, cellWidth: 18 },
                    3: { halign: 'center', cellWidth: 13 },
                    4: { halign: 'right',  cellWidth: 23 },
                    5: { halign: 'right',  fontStyle: 'bold', cellWidth: 25 }
                },
                margin: { left: 14, right: 14 },
                didParseCell: data => {
                    if (data.section === 'body' && data.row.index % 2 === 0)
                        data.cell.styles.fillColor = ZEBRA;
                },
                didDrawCell: data => {
                    if (data.section === 'body' && data.column.index === 0) {
                        const foto = fotosVenta[data.row.index];
                        const ix = data.cell.x + (data.cell.width  - PROD_IMG_W) / 2;
                        const iy = data.cell.y + (data.cell.height - PROD_IMG_H) / 2;
                        if (foto) {
                            doc.addImage(foto.data, foto.format, ix, iy, PROD_IMG_W, PROD_IMG_H);
                            doc.setDrawColor(210, 207, 203); doc.setLineWidth(0.15);
                            doc.rect(ix, iy, PROD_IMG_W, PROD_IMG_H, 'S');
                        }
                    }
                }
            });
            y = doc.lastAutoTable.finalY + 10;
        }

        // Total venta
        const tH = pctDesc > 0 ? 30 : 20;
        if (y + tH > pageH - MARGEN_SEG) { doc.addPage(); y = 18; }
        doc.setFillColor(...TOTAL_BG);
        doc.roundedRect(pageW - 82, y - 4, 66, tH, 3, 3, 'F');
        if (pctDesc > 0) {
            doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
            doc.setTextColor(...META_TEXT);
            doc.text('Subtotal', pageW - 78, y);
            doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
            y += 6;
            doc.setTextColor(...RED);
            doc.text(`Descuento (${pctDesc}%)`, pageW - 78, y);
            doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, pageW - 16, y, { align: 'right' });
            y += 4;
            doc.setDrawColor(...GRAY_MID);
            doc.line(pageW - 78, y, pageW - 16, y);
            y += 5;
        } else { y += 3; }
        doc.setFontSize(7); doc.setFont(undefined, 'bold');
        doc.setTextColor(...META_TEXT);
        doc.text('TOTAL', pageW - 78, y);
        doc.setFontSize(18); doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, pageW - 16, y + 1, { align: 'right' });
    }

    // ── FOOTER EN TODAS LAS PÁGINAS ──────────────────────────────────────────
    // Prioridad de recorte: leyenda primero (nunca total ni header)
    const leyendaLimpia = sanitizarLeyenda(leyenda || '');
    const textoPieBase  = leyendaLimpia || (esTecnico
        ? 'Garantía: 90 días sobre mano de obra · Repuestos según fabricante'
        : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso');

    // Garantizar que cabe en 1 línea del footer
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        // Truncar leyenda si no entra en el ancho del footer
        doc.setFontSize(7);
        const maxFooterW = doc.internal.pageSize.getWidth() - 80; // espacio libre entre marca y paginación
        const linesFooter = doc.splitTextToSize(textoPieBase, maxFooterW);
        const textoPie = linesFooter[0] + (linesFooter.length > 1 ? ' ...' : '');
        dibujarFooterPDF(doc, i, totalPaginas, textoPie);
    }

    doc.save(`${esTecnico ? 'Servicio' : 'Venta'}_${cliente.nombre || 'Remito'}_${fecha.replace(/\//g, '-')}.pdf`);
};
