// Firmas, garantia y checklist para PDFs
import { C, M, T, CONTENT_W } from '../theme.js';
import { checkSalto } from '../helpers.js';

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

export function dibujarFirmas(doc, { y, firmaCliente = null, firmaTecnico = null, aclaracionCliente = '', esPresupuesto = false }) {
    y = checkSalto(doc, y, 36);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('FIRMAS', M, y);
    y += 5;

    const FIRMA_W = (CONTENT_W - 6) / 2;
    const FIRMA_H = 22;
    const xDer    = M + FIRMA_W + 6;

    const dibujarCaja = (firma, x, label, aclaracion = '') => {
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

        // Aclaración (nombre) debajo de la firma
        let labelY = y + FIRMA_H + 2;
        if (aclaracion) {
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.dark);
            doc.text(aclaracion, x + FIRMA_W / 2, labelY + 2, { align: 'center' });
            labelY += 4;
        }
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + FIRMA_W / 2, labelY + 2, { align: 'center' });
    };

    const lblCliente = esPresupuesto ? 'Aceptación del presupuesto' : 'Firma del cliente';
    dibujarCaja(firmaCliente, M,    lblCliente, aclaracionCliente);
    dibujarCaja(firmaTecnico, xDer, 'Técnico responsable / Sello');

    return y + FIRMA_H + (aclaracionCliente ? 14 : 10);
}

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
