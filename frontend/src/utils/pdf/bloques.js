import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W } from './theme.js';
import { checkSalto } from './helpers.js';

// ── BLOQUE CLIENTE (con columna opcional de diagnóstico) ─────────────────────
// diagnostico: texto libre para mostrar en columna derecha (presupuesto)
// Si no se pasa diagnostico, el bloque ocupa full-width
export function dibujarBloqueClienteEquipo(doc, { cliente, sede, item = null, idx = 0, y, pageW, fotoEquipo = null, diagnostico = null, tituloDiag = 'DIAGNÓSTICO / SOLICITUD', conBullet = false }) {
    const tieneDiag = !!(diagnostico && diagnostico.trim());
    const LEFT_W  = tieneDiag ? CONTENT_W * 0.54 : CONTENT_W;
    const RIGHT_W = CONTENT_W - LEFT_W - 4;
    const RIGHT_X = M + LEFT_W + 4;

    // Altura dinámica según diagnóstico
    let cardH = 38;
    if (tieneDiag) {
        doc.setFontSize(T.xxs);
        const diagLines = doc.splitTextToSize(diagnostico.trim(), RIGHT_W - 4);
        cardH = Math.max(38, diagLines.length * 4.2 + 16);
    }

    // Fondo card
    doc.setFillColor(...C.grayLight);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'S');

    // Divisor vertical (solo si hay diagnóstico)
    if (tieneDiag) {
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(RIGHT_X - 2, y + 3, RIGHT_X - 2, y + cardH - 3);
    }

    // ── Columna izquierda: DATOS DEL CLIENTE ──
    let cy = y + 6;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${conBullet ? '• ' : ''}DATOS DEL CLIENTE`, M + 2, cy);
    cy += 5;

    const nombreCliente = (cliente?.nombre || 'PARTICULAR').toUpperCase();
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    const nombreLines = doc.splitTextToSize(nombreCliente, LEFT_W - 4);
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

    // ── Columna derecha: DIAGNÓSTICO (opcional) ──
    if (tieneDiag) {
        let dy = y + 6;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tituloDiag, RIGHT_X, dy);
        dy += 5;

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        const diagLines = doc.splitTextToSize(diagnostico.trim(), RIGHT_W - 4);
        diagLines.slice(0, 8).forEach(l => { doc.text(l, RIGHT_X, dy); dy += 4.2; });
    }

    return y + cardH + 4;
}

// ── BLOQUE DATOS DEL EQUIPO (separado, con foto ANTES a la derecha) ───────────
// Muestra: marca/modelo, N°serie, ubicación, piso, sector
// fotoAntes: objeto { data, format } o null
export function dibujarBloqueEquipoDetalle(doc, { item, y, pageW, fotoAntes = null, conBullet = false }) {
    if (!item) return y;

    const FOTO_W = 32;
    const FOTO_H = 28;
    const hasFoto = !!fotoAntes;
    const textW   = hasFoto ? CONTENT_W - FOTO_W - 6 : CONTENT_W;

    const serial  = item.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial) ? item.equipoSerial : null;
    const modelo  = item.modeloEquipo || item.equipoModelo || null;
    const marca   = item.marcaEquipo  || item.equipoMarca  || null;
    const ubic    = item.ubicacionEquipo || item.equipoUbicacion || null;
    const piso    = item.equipoPiso   || null;
    const sector  = item.equipoSector || null;

    const campos = [
        (modelo || marca) ? { l: 'EQUIPO', v: [marca, modelo].filter(Boolean).join(' · ') } : null,
        serial  ? { l: 'N° SERIE',  v: serial } : null,
        ubic    ? { l: 'UBICACIÓN', v: ubic   } : null,
        piso    ? { l: 'PISO',      v: piso   } : null,
        sector  ? { l: 'SECTOR',    v: sector  } : null,
    ].filter(Boolean);

    const cardH = Math.max(FOTO_H + 8, campos.length * 5.5 + 14);

    // Fondo card
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra de color izquierda (navy)
    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    // Título
    let ey = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${conBullet ? '• ' : ''}DATOS DEL EQUIPO`, M + 4, ey);
    ey += 5;

    // Foto ANTES a la derecha
    if (hasFoto) {
        try {
            doc.addImage(fotoAntes.data, fotoAntes.format, M + textW + 4, y + 4, FOTO_W, FOTO_H);
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.roundedRect(M + textW + 4, y + 4, FOTO_W, FOTO_H, 1, 1, 'S');
            // Etiqueta "ANTES"
            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.grayText);
            doc.text('ANTES', M + textW + 4 + FOTO_W / 2, y + FOTO_H + 6, { align: 'center' });
        } catch {}
    }

    // Campos del equipo
    campos.forEach(({ l, v }) => {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(l, M + 4, ey);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        const vLines = doc.splitTextToSize(String(v), textW - 24);
        doc.text(vLines[0], M + 28, ey);
        ey += 5.5;
    });

    return y + cardH + 4;
}

// ── BLOQUE TRABAJO A REALIZAR / SOLICITUD (presupuesto, sección separada) ──────
export function dibujarBloqueSolicitud(doc, { texto, y, pageW }) {
    if (!texto || !texto.trim()) return y;

    const lines = doc.splitTextToSize(texto.trim(), CONTENT_W - 12);
    const cardH = Math.max(20, lines.length * 4.5 + 16);

    // Fondo con borde izquierdo dorado/gold
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra izquierda gold
    doc.setFillColor(...(C.gold || [212, 136, 0]));
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    let dy = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...(C.gold || [212, 136, 0]));
    doc.text('TRABAJO A REALIZAR', M + 6, dy);
    dy += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    lines.slice(0, 8).forEach(l => { doc.text(l, M + 6, dy); dy += 4.5; });

    return y + cardH + 4;
}

// ── BLOQUE TRABAJO REALIZADO / A REALIZAR ────────────────────────────────────
export function dibujarBloqueDiagnosticoDetalle(doc, { texto, y, pageW, titulo = '• TRABAJO REALIZADO' }) {
    if (!texto || !texto.trim()) return y;

    const lines  = doc.splitTextToSize(texto.trim(), CONTENT_W - 8);
    const cardH  = Math.max(18, lines.length * 4.5 + 14);

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra izquierda navy
    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    let dy = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, M + 4, dy);
    dy += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    lines.forEach(l => { doc.text(l, M + 4, dy); dy += 4.5; });

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
// Si solo un lado tiene contenido, se dibuja a ancho completo automáticamente
export function dibujarSeccion2Col(doc, {
    y, pageW,
    tituloIzq, textoIzq,
    tituloDer,  textoDer,
    altoMin = 22,
}) {
    const tieneIzq = !!(tituloIzq || textoIzq);
    const tieneDer = !!(tituloDer  || textoDer);

    // Solo un lado → full width
    if (!tieneIzq || !tieneDer) {
        const titulo = tituloIzq || tituloDer;
        const texto  = textoIzq  || textoDer;
        if (!titulo && !texto) return y;

        doc.setFontSize(T.xxs);
        const lineas = texto ? doc.splitTextToSize(texto, CONTENT_W - 6) : [];
        const cardH  = Math.max(altoMin, lineas.length * 4 + 14);

        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.25);
        doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

        if (titulo) {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text(titulo, M + 2, y + 6);
        }
        if (lineas.length) {
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            lineas.slice(0, 8).forEach((l, i) => doc.text(l, M + 2, y + 12 + i * 4));
        }
        return y + cardH + 4;
    }

    // Ambos lados → 2 columnas
    const colW   = (CONTENT_W - 4) / 2;
    const rightX = M + colW + 4;

    doc.setFontSize(T.xxs);
    const linI  = textoIzq ? doc.splitTextToSize(textoIzq, colW - 6) : [];
    const linD  = textoDer  ? doc.splitTextToSize(textoDer,  colW - 6) : [];
    const cardH = Math.max(altoMin, Math.max(linI.length, linD.length) * 4 + 14);

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2,    y, colW + 4, cardH, 2, 2, 'FD');
    doc.roundedRect(rightX - 2, y, colW + 4, cardH, 2, 2, 'FD');

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
// firmaCliente: data URL de la firma del cliente (puede ser null)
// firmaTecnico: data URL de la firma del técnico (puede ser null)
export function dibujarFirmas(doc, { y, firmaCliente = null, firmaTecnico = null, esPresupuesto = false }) {
    y = checkSalto(doc, y, 36);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FIRMAS', M, y);
    y += 5;

    const FIRMA_W = (CONTENT_W - 6) / 2;
    const FIRMA_H = 22;
    const xDer    = M + FIRMA_W + 6;

    const dibujarCaja = (firma, x, label) => {
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y - 2, FIRMA_W, FIRMA_H, 2, 2, 'FD');

        if (firma) {
            try { doc.addImage(firma, 'PNG', x + 2, y, FIRMA_W - 4, FIRMA_H - 4); } catch {}
        } else {
            // Línea para firma en papel
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.5);
            doc.line(x + 4, y + FIRMA_H - 4, x + FIRMA_W - 4, y + FIRMA_H - 4);
        }

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + FIRMA_W / 2, y + FIRMA_H + 4, { align: 'center' });
    };

    const lblCliente = esPresupuesto ? 'Aceptación del presupuesto' : 'Firma del cliente';
    dibujarCaja(firmaCliente, M,    lblCliente);
    dibujarCaja(firmaTecnico, xDer, 'Técnico responsable / Sello');

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
        doc.text('* * * * *', M + QR_W + 6, y + 21);

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

// ── REGISTRO FOTOGRÁFICO (sección dedicada, 2 fotos lado a lado) ─────────────
// fotoA / fotoD: objetos { data, format } o null
export function dibujarRegistroFotografico(doc, { y, fotoA = null, fotoD = null }) {
    if (!fotoA && !fotoD) return y;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('REGISTRO FOTOGRÁFICO', M, y);
    y += 5;

    const COL_W  = (CONTENT_W - 6) / 2;
    const FOTO_H = Math.round(COL_W * 3 / 4);

    const dibujarCaja = (foto, x, label) => {
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(x + 1, y + 1, COL_W, FOTO_H, 2, 2, 'F');
        if (foto) {
            try { doc.addImage(foto.data, foto.format, x, y, COL_W, FOTO_H); } catch {}
        } else {
            doc.setFillColor(...C.grayBg);
            doc.roundedRect(x, y, COL_W, FOTO_H, 2, 2, 'F');
        }
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, COL_W, FOTO_H, 2, 2, 'S');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + COL_W / 2, y + FOTO_H + 4.5, { align: 'center' });
    };

    if (fotoA && fotoD) {
        dibujarCaja(fotoA, M,              'ESTADO INICIAL');
        dibujarCaja(fotoD, M + COL_W + 6, 'ESTADO FINAL');
    } else {
        // Una sola foto centrada
        const xCentro = M + (CONTENT_W - COL_W) / 2;
        dibujarCaja(fotoA || fotoD, xCentro, fotoA ? 'ESTADO INICIAL' : 'ESTADO FINAL');
    }

    return y + FOTO_H + 10;
}

// ── CONDICIONES PRESUPUESTO (standalone, para multi-equipo) ───────────────────
export function dibujarCondiciones(doc, { y, pageW, texto = null }) {
    const condDefault = [
        '· Valido por 7 dias corridos.',
        '· El servicio se coordina una vez confirmado el presupuesto.',
        '· Garantia: 90 dias sobre mano de obra - repuestos segun fabricante.',
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

// ── CONDICIONES + CTA compacto (presupuesto single) ───────────────────────────
// Agrupa condiciones y llamada a la acción en un solo bloque para evitar página vacía
export function dibujarCondicionesYCTA(doc, { y, pageW, empresa, nroDoc }) {
    const pageH = doc.internal.pageSize.getHeight();

    // Card 2 columnas: izquierda condiciones, derecha CTA
    const COL_IZQ = CONTENT_W * 0.55;
    const COL_DER = CONTENT_W - COL_IZQ - 4;
    const X_DER   = M + COL_IZQ + 4;

    const conds = [
        '· Valido por 7 dias corridos desde la fecha de emision.',
        '· El servicio se coordina una vez aprobado.',
        '· Garantia 90 dias mano de obra.',
        '· Repuestos segun fabricante.',
    ];

    const cardH = Math.max(38, conds.length * 5 + 14);

    // Fondo izquierdo
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, COL_IZQ + 4, cardH, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('CONDICIONES', M + 3, y + 6);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    conds.forEach((c, i) => doc.text(c, M + 3, y + 13 + i * 5));

    // Fondo derecho — CTA verde
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(...C.green);
    doc.setLineWidth(0.3);
    doc.roundedRect(X_DER - 2, y, COL_DER + 4, cardH, 2, 2, 'FD');

    // Barra top verde
    doc.setFillColor(...C.green);
    doc.roundedRect(X_DER - 2, y, COL_DER + 4, 3, 2, 2, 'F');
    doc.rect(X_DER - 2, y + 1.5, COL_DER + 4, 1.5, 'F');

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.green);
    doc.text('Aprobar presupuesto', X_DER + COL_DER / 2, y + 10, { align: 'center' });

    const contacto = empresa.whatsapp || empresa.telefono || '';
    if (contacto) {
        const etiqueta = empresa.whatsapp ? 'WhatsApp / Tel:' : 'Tel:';
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(etiqueta, X_DER + COL_DER / 2, y + 19, { align: 'center' });
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(contacto, X_DER + COL_DER / 2, y + 26, { align: 'center' });
    } else {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Comunicate con nosotros', X_DER + COL_DER / 2, y + 20, { align: 'center' });
        doc.text('para confirmar.', X_DER + COL_DER / 2, y + 25, { align: 'center' });
    }

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`Ref: ${nroDoc}`, X_DER + COL_DER / 2, y + cardH - 5, { align: 'center' });

    return y + cardH + 6;
}
