// Condiciones de servicio/venta para PDFs
import { C, M, T, CONTENT_W } from '../theme.js';
import { checkSalto } from '../helpers.js';

export function dibujarCondiciones(doc, { y, pageW, texto = null }) {
    const condDefault = [
        '· Valido por 7 dias corridos.',
        '· Precios publicados incluyen IVA. Abonando en efectivo sin factura se aplica precio sin IVA.',
        '· Si solo se realiza visita/diagnostico sin reparacion, se cobra el 50% de la mano de obra.',
        '· Garantia: 90 dias sobre mano de obra. Repuestos segun fabricante.',
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

export function dibujarCondicionesYCTA(doc, { y, pageW, empresa, nroDoc, esVisita = false }) {
    const condsRep = [
        '· Valido por 7 dias corridos desde la fecha de emision.',
        '· Precios incluyen IVA. En efectivo sin factura se aplica precio sin IVA.',
        '· Visita/diagnostico sin reparacion: 50% de la mano de obra.',
        '· Garantia 90 dias mano de obra. Repuestos segun fabricante.',
    ];
    const condsVis = [
        '· Valido por 7 dias corridos desde la fecha de emision.',
        '· Precios incluyen IVA. En efectivo sin factura se aplica precio sin IVA.',
        '· Garantia 90 dias mano de obra.',
    ];
    const defaultConds = esVisita ? condsVis : condsRep;
    // Usar condiciones configuradas si existen
    const conds = empresa.condicionesPDF
        ? empresa.condicionesPDF.split(/[·\n]/).map(c => c.trim()).filter(Boolean).map(c => `· ${c}`)
        : defaultConds;

    const cardH = conds.length * 5 + 14;

    // Caja condiciones — ancho completo
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('CONDICIONES', M + 3, y + 6);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    conds.forEach((c, i) => doc.text(c, M + 3, y + 13 + i * 5));

    // Línea de referencia y contacto debajo de la caja
    const yRef = y + cardH + 5;
    const contacto = empresa.whatsapp || empresa.telefono || '';
    const partes = [];
    if (nroDoc) partes.push(`Ref: ${nroDoc}`);
    if (contacto) partes.push(`Contacto: ${contacto}`);
    if (partes.length > 0) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(partes.join('   ·   '), M + CONTENT_W / 2, yRef, { align: 'center' });
    }

    return yRef + 6;
}

export function dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc, esVisita = false }) {
    // Línea divisora sutil
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.15);
    doc.line(M, y, pageW - M, y);
    y += 4;

    // Condiciones configurables desde Usuarios > Config empresa
    const defaultRep = 'Precio incluye IVA (efectivo sin factura: precio sin IVA)  ·  Visita sin reparacion: 50% MO  ·  Garantia 90 dias MO  ·  Valido 7 dias';
    const defaultVis = 'Precio incluye IVA (efectivo sin factura: precio sin IVA)  ·  Garantia 90 dias MO  ·  Valido 7 dias';
    let textoCond = empresa.condicionesPDF || (esVisita ? defaultVis : defaultRep);
    // Si es visita, quitar mención de "50% MO" de condiciones custom también
    if (esVisita) textoCond = textoCond.replace(/[·\s]*Visita sin reparacion:?\s*50%\s*MO/gi, '');
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    // Si el texto es largo, splitear en líneas
    const lineas = doc.splitTextToSize(textoCond, CONTENT_W);
    lineas.slice(0, 3).forEach((l, i) => doc.text(l, M, y + i * 3.5));
    y += Math.min(lineas.length, 3) * 3.5 + 1;

    // Referencia y contacto
    const contacto = empresa.whatsapp || empresa.telefono || '';
    const partes = [];
    if (nroDoc) partes.push(`Ref: ${nroDoc}`);
    if (contacto) partes.push(`Contacto: ${contacto}`);
    if (partes.length > 0) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(partes.join('   ·   '), M, y);
    }

    return y + 5;
}

export function dibujarCondicionesVenta(doc, { y, pageW, empresa, nroDoc }) {
    const conds = [
        '· Valido por 7 dias corridos desde la fecha de emision.',
        '· Precios sujetos a disponibilidad de stock.',
        '· El pedido se prepara una vez confirmado el pago.',
        '· Forma de pago a coordinar al confirmar.',
    ];

    const cardH = conds.length * 5 + 14;

    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('CONDICIONES', M + 3, y + 6);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    conds.forEach((c, i) => doc.text(c, M + 3, y + 13 + i * 5));

    const yRef = y + cardH + 5;
    const contacto = empresa.whatsapp || empresa.telefono || '';
    const partes = [];
    if (nroDoc) partes.push(`Ref: ${nroDoc}`);
    if (contacto) partes.push(`Contacto: ${contacto}`);
    if (partes.length > 0) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(partes.join('   ·   '), M + CONTENT_W / 2, yRef, { align: 'center' });
    }

    return yRef + 6;
}
