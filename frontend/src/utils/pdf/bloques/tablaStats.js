// Tabla de detalle y resumen para PDFs
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W } from '../theme.js';

export function dibujarResumenServicio(doc, { y, stats = [] }) {
    if (!stats.length) return y;

    const n     = stats.length;
    const BOX_W = (CONTENT_W - (n - 1) * 3) / n;
    const BOX_H = 18;
    let x = M;

    doc.setFontSize(T.xxs);
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
        doc.setFontSize(T.md);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...color);
        doc.text(String(valor), x + 7, y + 8);

        // Etiqueta legible
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const etLines = doc.splitTextToSize(etiqueta, BOX_W - 9);
        doc.text(etLines[0], x + 7, y + 14);

        x += BOX_W + 3;
    });

    return y + BOX_H + 4;
}

export function dibujarTablaDetalle(doc, {
    rows,        // [{ concepto, cant, unitario, importe, esServicio }]
    y,
    leftX   = M,
    tableW  = CONTENT_W,
    titulo  = 'DETALLE DE TRABAJOS Y REPUESTOS',
    total   = null,
    labelTotal = 'TOTAL ESTIMADO DEL SERVICIO',
    sinPrecios = false,
}) {
    if (!rows || rows.length === 0) return y;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, leftX, y);
    y += 5;

    const tableData = sinPrecios
        ? rows.map(r => [r.concepto, String(r.cant)])
        : rows.map(r => [r.concepto, String(r.cant), r.unitario ? `$ ${r.unitario}` : '—', `$ ${r.importe}`]);

    const rightMargin = doc.internal.pageSize.getWidth() - leftX - tableW;

    autoTable(doc, {
        startY: y,
        head: [sinPrecios ? ['CONCEPTO', 'CANT'] : ['CONCEPTO', 'CANT', 'UNITARIO', 'IMPORTE']],
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
        columnStyles: sinPrecios ? {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 13 },
        } : {
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
    if (total !== null && !sinPrecios) {
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

export function dibujarResumenEjecutivo(doc, { y, cliente, fecha, cantEquipos, cantServicios = null, total, estado, pageW, sinPrecios = false }) {
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
        ...(sinPrecios ? [] : [{ l: 'Total facturado', v: `$ ${total}` }]),
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
