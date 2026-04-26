import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W } from './theme.js';
import { checkSalto } from './helpers.js';

// ── BLOQUE CLIENTE + EQUIPO (2 columnas) ──────────────────────────────────────
export function dibujarBloqueClienteEquipo(doc, { cliente, sede, item = null, idx = 0, y, pageW, fotoEquipo = null }) {
    const LEFT_W  = CONTENT_W * 0.54;
    const RIGHT_W = CONTENT_W - LEFT_W - 4;
    const RIGHT_X = M + LEFT_W + 4;
    const cardH   = 38;

    // Fondo card completo
    doc.setFillColor(...C.grayLight);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'S');

    // Divisor vertical
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.line(RIGHT_X - 2, y + 3, RIGHT_X - 2, y + cardH - 3);

    // ── Columna izquierda: DATOS DEL CLIENTE ──
    let cy = y + 6;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DATOS DEL CLIENTE', M + 2, cy);
    cy += 5;

    const nombreCliente = (cliente?.nombre || 'PARTICULAR').toUpperCase();
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    const maxNomW = LEFT_W - 4;
    const nombreLines = doc.splitTextToSize(nombreCliente, maxNomW);
    doc.text(nombreLines[0], M + 2, cy);
    cy += 5;

    const condFiscal = cliente?.condicionFiscal || cliente?.condicionIva || null;
    const datosCliente = [
        cliente?.telefono   ? `Tel: ${cliente.telefono}`            : null,
        sede?.direccion     ? `Dir: ${sede.direccion}`              : (sede?.nombreSede ? `Sede: ${sede.nombreSede}` : null),
        cliente?.cuilDni    ? `CUIT/DNI: ${cliente.cuilDni}`        : null,
        condFiscal          ? `Cond. fiscal: ${condFiscal}`         : null,
        cliente?.email      ? `Email: ${cliente.email}`             : null,
    ].filter(Boolean).slice(0, 4);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    datosCliente.forEach(l => { doc.text(l, M + 2, cy); cy += 4.2; });

    // ── Columna derecha: EQUIPO ──
    let ey = y + 6;
    const eLabel = item ? `EQUIPO ${idx + 1}` : 'EQUIPO';

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(eLabel, RIGHT_X, ey);
    ey += 5;

    if (item) {
        const tipo    = item.tipoEquipo    || item.equipoTipo    || 'Dispenser';
        const modelo  = item.modeloEquipo  || item.equipoModelo  || null;
        const serial  = item.equipoSerial && !['MOSTRADOR','SIN-SN'].includes(item.equipoSerial) ? item.equipoSerial : null;
        const ubic    = item.ubicacionEquipo || item.equipoUbicacion || null;

        const FOTO_W = 24;
        const FOTO_H = 22;
        const hasFoto = !!fotoEquipo;
        const textMaxW = hasFoto ? RIGHT_W - FOTO_W - 3 : RIGHT_W - 2;

        if (hasFoto) {
            try {
                doc.addImage(fotoEquipo.data, fotoEquipo.format, RIGHT_X + textMaxW + 3, ey - 4, FOTO_W, FOTO_H);
                doc.setDrawColor(...C.grayBorder);
                doc.setLineWidth(0.15);
                doc.roundedRect(RIGHT_X + textMaxW + 3, ey - 4, FOTO_W, FOTO_H, 1, 1, 'S');
            } catch {}
        }

        const campos = [
            { l: 'TIPO',    v: tipo },
            modelo ? { l: 'MODELO',  v: modelo } : null,
            serial ? { l: 'N° SERIE', v: serial } : null,
            ubic   ? { l: 'UBIC.',   v: ubic   } : null,
        ].filter(Boolean).slice(0, 4);

        campos.forEach(({ l, v }) => {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.grayText);
            doc.text(l, RIGHT_X, ey);

            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            const vLines = doc.splitTextToSize(String(v), textMaxW - 16);
            doc.text(vLines[0], RIGHT_X + 14, ey);
            ey += 4.5;
        });
    }

    return y + cardH + 4;
}

// ── BLOQUE RESUMEN DEL SERVICIO (fila de stats) ───────────────────────────────
// Sin emojis: barra de color izquierda + valor grande + etiqueta chica
export function dibujarResumenServicio(doc, { y, stats = [] }) {
    if (!stats.length) return y;

    const n     = stats.length;
    const BOX_W = (CONTENT_W - (n - 1) * 3) / n;
    const BOX_H = 16;
    let x = M;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('RESUMEN DEL SERVICIO', M, y);
    y += 4;

    stats.forEach(({ valor, etiqueta, colorValor }) => {
        const color = colorValor || C.navy;

        // Fondo blanco con borde
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, BOX_W, BOX_H, 2, 2, 'FD');

        // Barra de color izquierda
        doc.setFillColor(...color);
        doc.roundedRect(x, y, 3, BOX_H, 2, 2, 'F');
        doc.rect(x + 1.5, y, 1.5, BOX_H, 'F');

        // Valor (grande, bold)
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...color);
        doc.text(String(valor), x + 7, y + 6.5);

        // Etiqueta (pequeña, gris)
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const etLines = doc.splitTextToSize(etiqueta, BOX_W - 9);
        doc.text(etLines[0], x + 7, y + 12.5);

        x += BOX_W + 3;
    });

    return y + BOX_H + 5;
}

// ── TABLA DETALLE TRABAJOS Y REPUESTOS ────────────────────────────────────────
// 4 columnas: CONCEPTO · CANT · UNITARIO · IMPORTE
export function dibujarTablaDetalle(doc, {
    rows,        // [{ concepto, cant, unitario, importe, esServicio }]
    y,
    leftX   = M,
    tableW  = CONTENT_W,
    titulo  = 'DETALLE DE TRABAJOS Y REPUESTOS',
    total   = null,
    labelTotal = 'TOTAL ESTIMADO DEL SERVICIO',
}) {
    if (!rows || rows.length === 0) return y;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, leftX, y);
    y += 5;

    const tableData = rows.map(r => [
        r.concepto,
        String(r.cant),
        r.unitario ? `$ ${r.unitario}` : '—',
        `$ ${r.importe}`,
    ]);

    const rightMargin = doc.internal.pageSize.getWidth() - leftX - tableW;

    autoTable(doc, {
        startY: y,
        head: [['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: C.navy,
            textColor: C.white,
            fontStyle: 'bold',
            fontSize: T.xxs,
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs,
            textColor: C.dark,
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            lineColor: C.grayBorder,
            lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
            2: { halign: 'right',  cellWidth: 28 },
            3: { halign: 'right',  cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { left: leftX, right: rightMargin },
        didParseCell: data => {
            if (data.section === 'body') {
                if (data.row.index % 2 === 0) data.cell.styles.fillColor = C.grayZebra;
                if (rows[data.row.index]?.esServicio) data.cell.styles.textColor = C.navy;
            }
        },
    });

    y = doc.lastAutoTable.finalY + 3;

    // Fila total
    if (total !== null) {
        const totalW = tableW;
        doc.setFillColor(...C.redLight);
        doc.setDrawColor(...C.red);
        doc.setLineWidth(0.3);
        doc.roundedRect(leftX, y, totalW, 10, 1.5, 1.5, 'FD');

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(labelTotal, leftX + 4, y + 6.5);

        doc.setFontSize(T.md);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(`$ ${total}`, leftX + totalW - 4, y + 7, { align: 'right' });

        y += 15;
    }

    return y;
}

// ── SECCIÓN 2 COLUMNAS (texto libre) ─────────────────────────────────────────
export function dibujarSeccion2Col(doc, {
    y, pageW,
    tituloIzq, textoIzq,
    tituloDer,  textoDer,
    altoMin = 24,
}) {
    const colW  = (CONTENT_W - 4) / 2;
    const rightX = M + colW + 4;

    // Calcular altura necesaria
    doc.setFontSize(T.xxs);
    const linI = textoIzq ? doc.splitTextToSize(textoIzq, colW - 6) : [];
    const linD = textoDer  ? doc.splitTextToSize(textoDer,  colW - 6) : [];
    const cardH = Math.max(altoMin, (Math.max(linI.length, linD.length)) * 4 + 14);

    // Card izquierda
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, colW + 4, cardH, 2, 2, 'FD');

    // Card derecha
    doc.roundedRect(rightX - 2, y, colW + 4, cardH, 2, 2, 'FD');

    // Contenidos izquierda
    if (tituloIzq) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tituloIzq, M + 2, y + 6);
    }
    if (linI.length) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        linI.slice(0, 6).forEach((l, i) => doc.text(l, M + 2, y + 12 + i * 4));
    }

    // Contenidos derecha
    if (tituloDer) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tituloDer, rightX, y + 6);
    }
    if (linD.length) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        linD.slice(0, 6).forEach((l, i) => doc.text(l, rightX, y + 12 + i * 4));
    }

    return y + cardH + 4;
}

// ── CHECKLIST TÉCNICO ─────────────────────────────────────────────────────────
export function dibujarChecklist(doc, { y, items, pageW, titulo = 'CHECKLIST TÉCNICO' }) {
    if (!items || items.length === 0) return y;
    y = checkSalto(doc, y, items.length * 5 + 16);

    const cardH = Math.ceil(items.length / 2) * 5.5 + 14;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, M + 2, y + 6);

    const colW = (CONTENT_W - 4) / 2;
    let itemY  = y + 12;
    items.forEach((item, i) => {
        const col  = i % 2;
        const row  = Math.floor(i / 2);
        const ix   = M + 2 + col * (colW + 4);
        const iy   = itemY + row * 5.5;

        // Checkbox
        doc.setFillColor(...(item.ok ? C.green : C.white));
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(ix, iy - 3.5, 5, 5, 0.8, 0.8, 'FD');

        if (item.ok) {
            doc.setFontSize(7.5);
            doc.setTextColor(...C.white);
            doc.text('✓', ix + 2.5, iy, { align: 'center' });
        }

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        doc.text(item.label || item, ix + 7, iy);
    });

    return y + cardH + 4;
}

// ── FIRMAS ────────────────────────────────────────────────────────────────────
export function dibujarFirmas(doc, { y, firmaDataUrl = null, esPresupuesto = false, pageW }) {
    y = checkSalto(doc, y, 36);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FIRMAS', M, y);
    y += 5;

    const FIRMA_W = (CONTENT_W - 6) / 2;
    const FIRMA_H = 22;

    if (firmaDataUrl) {
        // Firma digital del cliente
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');
        try { doc.addImage(firmaDataUrl, 'PNG', M, y - 2, FIRMA_W, FIRMA_H); } catch {}
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text('Firma digital del cliente', M + FIRMA_W / 2, y + FIRMA_H + 4, { align: 'center' });

        // Técnico
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.roundedRect(M + FIRMA_W + 6, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text('Técnico responsable / Sello', M + FIRMA_W + 6 + FIRMA_W / 2, y + FIRMA_H + 4, { align: 'center' });

        return y + FIRMA_H + 10;
    }

    // Sin firma digital — líneas para papel
    const lIzqX1 = M, lIzqX2 = M + FIRMA_W;
    const lDerX1 = M + FIRMA_W + 6, lDerX2 = M + CONTENT_W;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');
    doc.roundedRect(lDerX1, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');

    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.5);
    doc.line(lIzqX1 + 4, y + FIRMA_H - 4, lIzqX2 - 4, y + FIRMA_H - 4);
    doc.line(lDerX1 + 4, y + FIRMA_H - 4, lDerX2 - 4, y + FIRMA_H - 4);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    const lblC = esPresupuesto ? 'Aceptación del presupuesto' : 'Firma del cliente';
    doc.text(lblC,                        (lIzqX1 + lIzqX2) / 2, y + FIRMA_H + 4, { align: 'center' });
    doc.text('Técnico responsable / Sello', (lDerX1 + lDerX2) / 2, y + FIRMA_H + 4, { align: 'center' });

    return y + FIRMA_H + 10;
}

// ── GARANTÍA ─────────────────────────────────────────────────────────────────
export function dibujarGarantia(doc, { y, texto = null, pageW }) {
    y = checkSalto(doc, y, 14);

    const textoG = texto || '90 días sobre mano de obra  ·  Repuestos según fabricante';

    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, 12, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('GARANTÍA:', M + 2, y + 7.5);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(textoG, M + 22, y + 7.5);

    return y + 17;
}

// ── QR WHATSAPP ───────────────────────────────────────────────────────────────
export async function dibujarQRWhatsApp(doc, { x, y, telefono, mensaje = '', titulo = '¿ESTÁ DE ACUERDO CON ESTE PRESUPUESTO?', nroDoc = '' }) {
    try {
        const QRCode = await import('qrcode').catch(() => null);
        if (!QRCode) return dibujarQRPlaceholder(doc, x, y);

        const waUrl  = `https://wa.me/${telefono.replace(/\D/g,'')}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
        const dataUrl = await QRCode.default.toDataURL(waUrl, { width: 140, margin: 1, color: { dark: '#0D2B5B', light: '#ffffff' } });

        const QR_W  = 28;
        const QR_H  = 28;

        // Card de fondo
        const cardW = CONTENT_W + 4;
        const cardH = 38;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.25);
        doc.roundedRect(M - 2, y, cardW, cardH, 2, 2, 'FD');

        // QR
        doc.addImage(dataUrl, 'PNG', M + 2, y + 5, QR_W, QR_H);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.roundedRect(M + 2, y + 5, QR_W, QR_H, 1, 1, 'S');

        // Texto
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(titulo, M + QR_W + 8, y + 12);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Respondé por WhatsApp para coordinar el servicio.', M + QR_W + 8, y + 18);
        if (nroDoc) doc.text(`Nro. presupuesto: ${nroDoc}`, M + QR_W + 8, y + 23);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.green);
        doc.text('WhatsApp directo', M + QR_W + 8, y + 30);

        return y + cardH + 6;
    } catch {
        return dibujarQRPlaceholder(doc, x, y);
    }
}

export async function dibujarQRGoogle(doc, { y, link }) {
    try {
        const QRCode = await import('qrcode').catch(() => null);
        if (!QRCode) return dibujarQRPlaceholderSimple(doc, M, y);

        const dataUrl = await QRCode.default.toDataURL(link, { width: 140, margin: 1, color: { dark: '#1F9D55', light: '#ffffff' } });

        const QR_W = 24;
        const QR_H = 24;

        doc.addImage(dataUrl, 'PNG', M, y, QR_W, QR_H);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.roundedRect(M, y, QR_W, QR_H, 1, 1, 'S');

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text('¡Dejanos tu reseña en Google!', M + QR_W + 6, y + 8);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Tu opinión nos ayuda a mejorar.', M + QR_W + 6, y + 14);

        doc.setFontSize(9);
        doc.setTextColor(255, 180, 0);
        doc.text('★ ★ ★ ★ ★', M + QR_W + 6, y + 21);

        return y + QR_H + 8;
    } catch {
        return dibujarQRPlaceholderSimple(doc, M, y);
    }
}

function dibujarQRPlaceholder(doc, x, y) {
    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, 38, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text('[QR WhatsApp]', M + 4, y + 20);
    return y + 44;
}

function dibujarQRPlaceholderSimple(doc, x, y) {
    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, 24, 24, 1.5, 1.5, 'FD');
    doc.setFontSize(T.label);
    doc.setTextColor(...C.grayText);
    doc.text('QR', x + 12, y + 14, { align: 'center' });
    return y + 32;
}

// ── RESUMEN EJECUTIVO (multi-equipo, página 1) ────────────────────────────────
export function dibujarResumenEjecutivo(doc, { y, cliente, fecha, cantEquipos, cantServicios = null, total, estado, pageW }) {
    const cardH = 42;

    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 3, 3, 'F');

    // Título
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('RESUMEN EJECUTIVO', M + 4, y + 9);

    // Subtítulo
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayBorder);
    const estadoTexto = estado === 'COMPLETADO' ? 'Trabajo completamente exitoso' : (estado || '');
    doc.text(estadoTexto.toUpperCase(), M + 4, y + 14);

    // Stats
    const stats = [
        { l: 'Total facturado', v: `$ ${total}` },
        { l: 'Equipos',          v: String(cantEquipos)  },
        cantServicios ? { l: 'Servicios', v: String(cantServicios) } : { l: 'Fecha',  v: fecha },
        { l: 'Estado', v: estado === 'COMPLETADO' ? 'ÓPTIMO' : (estado || '—') },
    ];

    const colW  = (CONTENT_W) / stats.length;
    stats.forEach(({ l, v }, i) => {
        const cx = M + 4 + i * colW;
        const cy = y + 22;

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayBorder);
        doc.text(l, cx, cy);

        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(v, cx, cy + 7);
    });

    return y + cardH + 6;
}

// ── CONDICIONES PRESUPUESTO ───────────────────────────────────────────────────
export function dibujarCondiciones(doc, { y, pageW, texto = null }) {
    const condDefault = [
        '· Presupuesto válido por 7 días corridos.',
        '· El servicio se coordinará una vez aceptado este presupuesto.',
        '· Los repuestos cotizados son originales o de primera marca.',
        '· Incluye traslado dentro del área metropolitana.',
        '· Garantía: 90 días sobre mano de obra — repuestos según fabricante.',
    ].join('\n');

    const textoCond = texto || condDefault;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('CONDICIONES DEL PRESUPUESTO', M, y);
    y += 5;

    const lines = doc.splitTextToSize(textoCond, CONTENT_W);
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    lines.forEach((l, i) => doc.text(l, M, y + i * 4.2));

    return y + lines.length * 4.2 + 4;
}
