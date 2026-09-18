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

export function dibujarCondicionesCompactas(doc, { y, pageW, empresa, nroDoc, esVisita = false, sinPrecios = false }) {
    // Línea divisora sutil
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.15);
    doc.line(M, y, pageW - M, y);
    y += 5;

    // Condiciones configurables desde Usuarios > Config empresa. Lucas,
    // 15-sep-2026: el precio con IVA es el de referencia, y pagando en
    // efectivo sin factura se aplica un 10% de descuento sobre ese precio
    // (antes decia "precio sin IVA", que era el 21%, no lo que se cobra hoy).
    const defaultRep = 'Precio incluye IVA. Pagando en efectivo y sin factura: 10% de descuento.  ·  Visita sin reparacion: 50% de la mano de obra.  ·  Garantia 90 dias sobre mano de obra.  ·  Valido 7 dias.';
    const defaultVis = 'Precio incluye IVA. Pagando en efectivo y sin factura: 10% de descuento.  ·  Garantia 90 dias sobre mano de obra.  ·  Valido 7 dias.';
    // Sin precios: es un documento informativo (ej. remito de informacion tecnica
    // para un tercero, como el detalle de repuestos que se manda sin el costo de
    // Lucas) -- la leyenda de IVA/efectivo/descuento no tiene sentido ahi porque
    // no hay ningun precio al que aplicarle nada. Se ignora tambien el texto
    // personalizado (empresa.condicionesPDF), que esta pensado para presupuestos
    // con precio. (Lucas, 18-sep-2026)
    const defaultSinPreciosRep = 'Documento informativo, sin precios ni validez como presupuesto formal.  ·  Garantia 90 dias sobre mano de obra en las reparaciones que se realicen.  ·  Valido 7 dias.';
    const defaultSinPreciosVis = 'Documento informativo, sin precios ni validez como presupuesto formal.  ·  Valido 7 dias.';
    let textoCond = sinPrecios
        ? (esVisita ? defaultSinPreciosVis : defaultSinPreciosRep)
        : (empresa.condicionesPDF || (esVisita ? defaultVis : defaultRep));
    // Si es visita, quitar mención de "50% de la mano de obra" de condiciones custom también
    // (soporta tanto la redaccion nueva como la vieja "50% MO")
    if (esVisita && !sinPrecios) textoCond = textoCond.replace(/[·\s]*Visita sin reparacion:?\s*50%\s*(de la )?\s*(mano de obra|MO)\.?/gi, '');
    // Texto mas grande y mas oscuro -- a 6pt no se distinguia (Lucas, 15-sep-2026)
    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    // Si el texto es largo, splitear en líneas
    const lineas = doc.splitTextToSize(textoCond, CONTENT_W);
    lineas.slice(0, 3).forEach((l, i) => doc.text(l, M, y + i * 4.5));
    y += Math.min(lineas.length, 3) * 4.5 + 1.5;

    // Referencia y contacto
    const contacto = empresa.whatsapp || empresa.telefono || '';
    const partes = [];
    if (nroDoc) partes.push(`Ref: ${nroDoc}`);
    if (contacto) partes.push(`Contacto: ${contacto}`);
    if (partes.length > 0) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(partes.join('   ·   '), M, y);
    }

    return y + 6;
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
