/**
 * bloques.js — Bloques de contenido reutilizables
 * cliente · equipo · total · firmas · checklist · garantía · próximo mantenimiento · QR
 */
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W } from './theme.js';
import { label, value, divisor, truncarLineas, buildMetaLinea, checkSalto, sanitizarTexto } from './helpers.js';

// ── BLOQUE CLIENTE ────────────────────────────────────────────────────────────
export function dibujarBloqueCliente(doc, { cliente, sede, y, esCompacto = false }) {
    const pageW = doc.internal.pageSize.getWidth();
    const cardH = esCompacto ? 26 : 32;

    doc.setFillColor(...C.grayLight);
    doc.roundedRect(M - 2, y, pageW - (M - 2) * 2, cardH, 2, 2, 'F');

    // Acento navy izquierdo
    doc.setFillColor(...C.navy);
    doc.rect(M - 2, y, 3, cardH, 'F');

    let cy = y + 7;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('CLIENTE', M + 4, cy);
    cy += 5;

    // Nombre grande
    doc.setFontSize(esCompacto ? T.lg : T.xl);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text((cliente?.nombre || 'PARTICULAR').toUpperCase(), M + 4, cy);
    cy += 5;

    // Datos de contacto
    const condFiscal = cliente?.condicionFiscal || cliente?.condicionIva || null;
    const contacto = [
        cliente?.telefono  ? `Tel: ${cliente.telefono}`    : null,
        sede?.direccion    ? `Dir: ${sede.direccion}`      : (sede?.nombreSede || null),
        cliente?.cuilDni   ? `CUIT/DNI: ${cliente.cuilDni}` : null,
        condFiscal         ? `Condición: ${condFiscal}`    : null,
    ].filter(Boolean).slice(0, esCompacto ? 2 : 3);

    if (contacto.length > 0) {
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        contacto.forEach(l => { doc.text(l, M + 4, cy); cy += 4.5; });
    }

    return y + cardH + 4;
}

// ── BLOQUE EQUIPO (card por equipo) ──────────────────────────────────────────
export function dibujarBloqueEquipo(doc, { item, idx, y, pageW, esPresupuesto = false, esSolaHoja = true }) {
    const xI = M + 2;
    const moVal = parseFloat(item.costoExtra || 0);
    const subtotalEquipo = parseFloat(item.totalCalculado || item.costo || 0);
    const modelo   = item.modeloEquipo   || item.equipoModelo   || null;
    const serial   = (item.equipoSerial && !['MOSTRADOR','SIN-SN'].includes(item.equipoSerial)) ? item.equipoSerial : null;
    const ubicacion = item.ubicacionEquipo || item.equipoUbicacion || null;

    // Etiqueta numerada
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`EQUIPO ${idx + 1}`, xI, y);
    y += 5;

    // Modelo + precio en la misma línea
    const T_TITULO = esSolaHoja ? T.md : 9.5;
    const precioStr = `$ ${subtotalEquipo.toLocaleString('es-AR')}`;
    doc.setFontSize(T_TITULO);
    const precioW = doc.getStringUnitWidth(precioStr) * T_TITULO / doc.internal.scaleFactor + 6;
    const maxMetaW = pageW - xI - M - precioW;
    const metaTexto = buildMetaLinea(doc, modelo, serial, ubicacion, null, maxMetaW, T_TITULO);

    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(metaTexto, xI, y);
    doc.setTextColor(...C.navy);
    doc.text(precioStr, pageW - M, y, { align: 'right' });
    y += 8;

    // Detalle trabajo
    const textoTrabajo = sanitizarTexto((item.trabajo || item.trabajoRealizado || item.resumenTexto || '').replace(/\| MO:.*/, ''));
    if (textoTrabajo) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text('DETALLE DEL SERVICIO', xI, y);
        y += 4;

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        const lineas = truncarLineas(doc, textoTrabajo, pageW - xI - M, 3);
        doc.text(lineas, xI, y);
        y += lineas.length * 4 + 3;
    }

    // Tabla de ítems
    const rows = [];
    if (moVal > 0) rows.push(['Mano de obra / Servicio técnico', '1', `$ ${moVal.toLocaleString('es-AR')}`]);
    (item.repuestosUsados || []).forEach(r => {
        rows.push([r.nombre, r.cantidad.toString(), `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`]);
    });

    if (rows.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['Concepto', 'Cant.', 'Importe']],
            body: rows,
            theme: 'plain',
            headStyles: {
                fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
                fontSize: T.label, cellPadding: { top: 2, bottom: 2.5, left: 3, right: 3 },
            },
            bodyStyles: {
                fontSize: T.xs, textColor: C.dark,
                cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
                lineColor: C.grayBorder, lineWidth: { bottom: 0.15 }
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 14 },
                2: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' },
            },
            margin: { left: xI, right: M },
            didParseCell: data => {
                if (data.section === 'body' && data.row.index % 2 === 0)
                    data.cell.styles.fillColor = C.grayZebra;
                if (data.section === 'body' && data.row.index === 0 && moVal > 0)
                    data.cell.styles.textColor = C.navy;
            }
        });
        y = doc.lastAutoTable.finalY + 4;
    }

    return y;
}

// ── BLOQUE TOTAL ──────────────────────────────────────────────────────────────
export function dibujarBloqueTotal(doc, { y, subtotal, descuentoPct = 0, esPresupuesto = false, pageW }) {
    const monto_desc = descuentoPct > 0 ? subtotal * descuentoPct / 100 : 0;
    const total = subtotal - monto_desc;
    const tH = descuentoPct > 0 ? 34 : 22;

    doc.setFillColor(...C.grayBg);
    doc.roundedRect(M - 2, y - 4, pageW - (M - 2) * 2, tH, 3, 3, 'F');
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.3);
    doc.roundedRect(M - 2, y - 4, pageW - (M - 2) * 2, tH, 3, 3, 'S');

    if (descuentoPct > 0) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Subtotal', M + 4, y);
        doc.text(`$ ${subtotal.toLocaleString('es-AR')}`, pageW - M, y, { align: 'right' });
        y += 7;

        doc.setTextColor(...C.red);
        doc.text(`Descuento (${descuentoPct}%)`, M + 4, y);
        doc.text(`- $ ${monto_desc.toLocaleString('es-AR')}`, pageW - M, y, { align: 'right' });
        y += 5;
        divisor(doc, y - 1, C.grayBorder, pageW);
        y += 4;
    } else {
        y += 3;
    }

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.red);
    doc.text('TOTAL', M + 4, y);

    doc.setFontSize(T.xxl);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`$ ${total.toLocaleString('es-AR')}`, pageW - M, y + 1, { align: 'right' });
    y += 10;

    if (esPresupuesto) {
        const validez = new Date();
        validez.setDate(validez.getDate() + 7);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(`Válido hasta: ${validez.toLocaleDateString('es-AR')}`, pageW - M, y, { align: 'right' });
        y += 6;
    }

    return y;
}

// ── FORMAS DE PAGO ────────────────────────────────────────────────────────────
export function dibujarFormasDePago(doc, { y, pageW }) {
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FORMA DE PAGO', M, y);
    y += 5;

    const medios = ['Efectivo', 'Transferencia', 'Cuenta corriente'];
    let xP = M;
    medios.forEach(m => {
        const w = 43;
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.navy);
        doc.setLineWidth(0.2);
        doc.roundedRect(xP, y - 4, w, 7, 1.5, 1.5, 'FD');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.navy);
        doc.text(m, xP + w / 2, y, { align: 'center' });
        xP += w + 3;
    });
    return y + 10;
}

// ── FIRMAS ────────────────────────────────────────────────────────────────────
export function dibujarFirmas(doc, { y, firmaDataUrl = null, esPresupuesto = false, esTecnico = true, pageW }) {
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FIRMAS', M, y);
    y += 5;

    const FIRMA_W = 76;
    const FIRMA_H = 24;

    if (firmaDataUrl) {
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');
        try { doc.addImage(firmaDataUrl, 'PNG', M, y - 2, FIRMA_W, FIRMA_H); } catch {}
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text('Firma digital del cliente', M + FIRMA_W / 2, y + FIRMA_H + 3, { align: 'center' });
    } else {
        // Líneas para firma en papel — 2 columnas
        const lIzqX1 = M, lIzqX2 = 90;
        const lDerX1 = 108, lDerX2 = pageW - M;
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.4);
        doc.line(lIzqX1, y + 12, lIzqX2, y + 12);
        doc.line(lDerX1, y + 12, lDerX2, y + 12);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const lblC = esPresupuesto ? 'Aceptación del presupuesto' : 'Firma y aclaración del cliente';
        const lblT = esTecnico ? 'Técnico responsable / Sello' : 'Vendedor / Sello';
        doc.text(lblC, (lIzqX1 + lIzqX2) / 2, y + 17, { align: 'center' });
        doc.text(lblT, (lDerX1 + lDerX2) / 2, y + 17, { align: 'center' });
    }

    return y + (firmaDataUrl ? FIRMA_H + 8 : 22);
}

// ── CHECKLIST TÉCNICO ─────────────────────────────────────────────────────────
export function dibujarChecklist(doc, { y, items, titulo = 'CHECKLIST TÉCNICO', pageW }) {
    y = checkSalto(doc, y, items.length * 7 + 20);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, M, y);
    y += 5;

    const colW = (CONTENT_W - 4) / 2;
    items.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        if (col === 0 && row > 0) y += 6;
        const x = M + col * (colW + 4);
        const cy = y;

        // Checkbox
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, cy - 3.5, 5, 5, 0.8, 0.8, 'FD');

        if (item.ok) {
            doc.setFontSize(8);
            doc.setTextColor(...C.green);
            doc.text('✓', x + 2.5, cy, { align: 'center' });
        }

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        doc.text(item.label, x + 7, cy);
    });

    return y + 10;
}

// ── PRÓXIMO MANTENIMIENTO ─────────────────────────────────────────────────────
export function dibujarProximoMantenimiento(doc, { y, fecha = null, observaciones = null, pageW }) {
    y = checkSalto(doc, y, 24);

    doc.setFillColor(...C.greenLight);
    doc.setDrawColor(...C.green);
    doc.setLineWidth(0.3);
    doc.roundedRect(M - 2, y - 2, pageW - (M - 2) * 2, fecha ? 20 : 14, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.green);
    doc.text('⚙  PRÓXIMO MANTENIMIENTO SUGERIDO', M + 4, y + 4);

    if (fecha) {
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(fecha, pageW - M, y + 4, { align: 'right' });
    }

    if (observaciones) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(observaciones, M + 4, y + 11);
    }

    return y + (fecha ? 26 : 20);
}

// ── GARANTÍA ─────────────────────────────────────────────────────────────────
export function dibujarGarantia(doc, { y, texto = null, meses = 3, pageW }) {
    y = checkSalto(doc, y, 16);
    const textoGarantia = texto || `Garantía: ${meses} meses sobre mano de obra · Repuestos según fabricante`;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('GARANTÍA', M, y);
    y += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(textoGarantia, M, y);

    return y + 8;
}

// ── QR WHATSAPP ───────────────────────────────────────────────────────────────
export async function dibujarQRWhatsApp(doc, { x, y, telefono, mensaje = '' }) {
    try {
        // Usar qrcode si está disponible (npm install qrcode)
        const QRCode = await import('qrcode').catch(() => null);
        if (!QRCode) return dibujarQRPlaceholder(doc, x, y, 'WhatsApp');

        const waUrl = `https://wa.me/${telefono.replace(/\D/g,'')}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
        const dataUrl = await QRCode.default.toDataURL(waUrl, { width: 120, margin: 1, color: { dark: '#0D2B5B', light: '#ffffff' } });
        doc.addImage(dataUrl, 'PNG', x, y, 20, 20);

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('Aprobar por', x + 10, y + 22, { align: 'center' });
        doc.setTextColor(...C.green);
        doc.text('WhatsApp', x + 10, y + 27, { align: 'center' });
    } catch {
        dibujarQRPlaceholder(doc, x, y, 'WhatsApp');
    }
}

export async function dibujarQRGoogle(doc, { x, y, link }) {
    try {
        const QRCode = await import('qrcode').catch(() => null);
        if (!QRCode) return dibujarQRPlaceholder(doc, x, y, 'Reseña');

        const dataUrl = await QRCode.default.toDataURL(link, { width: 120, margin: 1, color: { dark: '#0D2B5B', light: '#ffffff' } });
        doc.addImage(dataUrl, 'PNG', x, y, 20, 20);

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('Dejanos tu', x + 10, y + 22, { align: 'center' });
        doc.setTextColor(...C.gold);
        doc.text('Reseña ★', x + 10, y + 27, { align: 'center' });
    } catch {
        dibujarQRPlaceholder(doc, x, y, 'Reseña');
    }
}

function dibujarQRPlaceholder(doc, x, y, label) {
    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, 20, 20, 2, 2, 'FD');
    doc.setFontSize(5);
    doc.setTextColor(...C.grayText);
    doc.text('QR', x + 10, y + 10, { align: 'center' });
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.navy);
    doc.text(label, x + 10, y + 24, { align: 'center' });
}

// ── BLOQUE CTA (resumen ejecutivo multi-equipo) ───────────────────────────────
export function dibujarResumenEjecutivo(doc, { y, cliente, cantEquipos, total, estado, pageW }) {
    const cardH = 40;
    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, pageW - (M - 2) * 2, cardH, 3, 3, 'F');

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('RESUMEN EJECUTIVO', M + 4, y + 10);

    const datos = [
        { l: 'Cliente',  v: (cliente?.nombre || '').toUpperCase() },
        { l: 'Equipos',  v: `${cantEquipos} unidades` },
        { l: 'Total',    v: `$ ${total.toLocaleString('es-AR')}` },
        { l: 'Estado',   v: estado || 'COMPLETADO' },
    ];

    const colW = (CONTENT_W - 8) / 2;
    datos.forEach(({ l, v }, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = M + 4 + col * (colW + 4);
        const cy = y + 18 + row * 11;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayBorder);
        doc.text(l, cx, cy);
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(v, cx, cy + 5);
    });

    return y + cardH + 6;
}
