import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import {
    DARK, RED, GRAY_LIGHT, GRAY_MID, GRAY_TEXT,
    procesarFecha, dibujarHeaderPDF, dibujarHeaderPDFCompacto, dibujarFooterPDF
} from './pdfTheme';
import { construirUrlFoto } from './construirUrlFoto';

// Carga una foto (data URL base64 o filename del backend) lista para doc.addImage
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
    const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format };
}

// Estima la altura en mm que ocupará un item técnico para anticipar saltos de página
function estimarAlturaItem(item, FOTO_W, FOTO_H, esCompacto) {
    let h = 14; // título + modelo + meta

    const texto = (item.trabajo || item.trabajoRealizado || item.resumenTexto || '')
        .replace(/\| MO:.*/, '').trim();
    if (texto) h += 10 + Math.ceil(texto.length / 80) * 4;

    const nRows = (parseFloat(item.costoExtra || 0) > 0 ? 1 : 0)
        + (item.repuestosUsados?.length || 0);
    if (nRows > 0) h += 8 + nRows * (esCompacto ? 6 : 7);

    if (item.fotoAntes || item.fotoDespues) h += FOTO_H + 14;

    return h;
}

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

    const esTecnico = esTecnicoForzado !== null
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');

    // Compacto a partir de 2 equipos para aprovechar mejor el espacio
    const esCompacto = ticketItems.length >= 2;

    const FOTO_W = esCompacto ? 58 : 82;
    const FOTO_H = esCompacto ? 44 : 62;
    const tblBodySize = esCompacto ? 7.5 : 8.5;
    const tblHeadSize = esCompacto ? 6.5 : 7;
    const tblBodyPad  = { top: esCompacto ? 1.5 : 2, bottom: esCompacto ? 1.5 : 2, left: 0, right: 0 };
    const tblHeadPad  = { top: 1.5, bottom: esCompacto ? 1.5 : 2, left: 0, right: 0 };
    const SEC_GAP     = esCompacto ? 5 : 8;   // espacio entre equipos — reducido
    const MARGEN_INF  = pageH - 18;            // límite inferior antes del footer

    const tipoLabel = esPresupuesto
        ? (esTecnico ? 'PRESUPUESTO DE SERVICIO TÉCNICO' : 'PRESUPUESTO DE VENTA')
        : (esTecnico ? 'REMITO DE SERVICIO TÉCNICO'      : 'COMPROBANTE DE VENTA');

    const subtotalBruto = ticketItems.reduce((a, b) => a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc       = parseFloat(descuentoPorcentaje) || 0;
    const montoDesc     = pctDesc > 0 ? subtotalBruto * pctDesc / 100 : 0;
    const totalFinal_   = subtotalBruto - montoDesc;

    // ── HEADER ───────────────────────────────────────────────────────────────
    const subtitulo = esTecnico && tecnico ? `Técnico: ${tecnico}` : null;
    if (esCompacto) {
        dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo);
    } else {
        dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo);
    }

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    let y = esCompacto ? 34 : 50;

    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text('PARA', 14, y);

    y += 4;
    doc.setFontSize(esCompacto ? 11 : 13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(cliente.nombre?.toUpperCase() || 'PARTICULAR', 14, y);

    // Datos en una sola línea compacta
    const contacto = [
        cliente.cuilDni  ? `DNI/CUIT: ${cliente.cuilDni}` : null,
        cliente.telefono ? `Tel: ${cliente.telefono}`      : null,
        sede?.direccion  || sede?.nombreSede               || null,
        cliente.email    || null,
    ].filter(Boolean).join('  ·  ');

    if (contacto) {
        y += 5;
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(contacto, 14, y, { maxWidth: pageW - 28 });
    }

    y += 3;
    doc.setLineWidth(0.2);
    doc.line(14, y + 3, pageW - 14, y + 3);
    y += 9;

    // ── ITEMS TÉCNICOS ───────────────────────────────────────────────────────
    if (esTecnico) {

        for (const [idx, item] of ticketItems.entries()) {

            // Salto de página inteligente: verificar si el item entra completo
            const alturaEstimada = estimarAlturaItem(item, FOTO_W, FOTO_H, esCompacto);
            if (y + alturaEstimada > MARGEN_INF) {
                doc.addPage();
                y = 18;
            }

            const subtotalEquipo = parseFloat(item.totalCalculado || item.costo || 0);
            const modelo    = item.modeloEquipo    || null;
            const serial    = (item.equipoSerial && item.equipoSerial !== 'MOSTRADOR' && item.equipoSerial !== 'SIN-SN')
                ? item.equipoSerial : null;
            const ubicacion = item.ubicacionEquipo || null;

            // Número de equipo en rojo
            doc.setFontSize(6.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...RED);
            doc.text(`EQUIPO ${idx + 1}`, 14, y);

            // Modelo / tipo
            doc.setFontSize(esCompacto ? 9 : 10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(modelo ? modelo.toUpperCase() : 'Dispenser', 14, y + 5);

            // Subtotal derecha
            doc.setFontSize(esCompacto ? 9 : 10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(`$ ${subtotalEquipo.toLocaleString('es-AR')}`, pageW - 14, y + 5, { align: 'right' });

            // Serial + ubicación en línea gris
            const metaLinea = [
                serial    ? `N/S: ${serial}`          : null,
                ubicacion ? `Ubic.: ${ubicacion}`     : null,
            ].filter(Boolean).join('  ·  ');

            if (metaLinea) {
                doc.setFontSize(7);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...GRAY_TEXT);
                doc.text(metaLinea, 14, y + 10);
                y += 15;
            } else {
                y += 10;
            }

            // ── Trabajo realizado ─────────────────────────────────────────
            const textoTrabajo = (item.trabajo || item.trabajoRealizado || item.resumenTexto || '')
                .replace(/\| MO:.*/, '').trim();

            if (textoTrabajo) {
                // Verificar si la descripción entra en la página actual
                const lineas = doc.splitTextToSize(textoTrabajo, pageW - 28);
                const altDesc = 4 + lineas.length * 4 + 3;
                if (y + altDesc > MARGEN_INF) { doc.addPage(); y = 18; }

                doc.setFontSize(6.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('TRABAJO REALIZADO', 14, y);
                y += 4;

                doc.setFontSize(esCompacto ? 8 : 8.5);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(60, 58, 56);
                doc.text(lineas, 14, y);
                y += lineas.length * 4 + 3;
            }

            // ── Tabla repuestos y mano de obra ────────────────────────────
            const rows = [];
            const moVal = parseFloat(item.costoExtra || 0);
            if (moVal > 0) {
                rows.push(['Mano de obra / Servicio técnico', '1', `$ ${moVal.toLocaleString('es-AR')}`]);
            }
            item.repuestosUsados?.forEach(r => {
                rows.push([
                    r.nombre,
                    r.cantidad.toString(),
                    `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`
                ]);
            });

            if (rows.length > 0) {
                const altTabla = 8 + rows.length * (esCompacto ? 6 : 7);
                if (y + altTabla > MARGEN_INF) { doc.addPage(); y = 18; }

                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Cant.', 'Importe']],
                    body: rows,
                    theme: 'plain',
                    headStyles: {
                        fillColor: false,
                        textColor: GRAY_TEXT,
                        fontStyle: 'bold',
                        fontSize: tblHeadSize,
                        cellPadding: tblHeadPad,
                        lineColor: GRAY_MID,
                        lineWidth: { bottom: 0.3 }
                    },
                    bodyStyles: {
                        fontSize: tblBodySize,
                        cellPadding: tblBodyPad,
                        textColor: DARK,
                        lineColor: GRAY_LIGHT,
                        lineWidth: { bottom: 0.2 }
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { halign: 'center', cellWidth: 15 },
                        2: { halign: 'right',  cellWidth: 28, fontStyle: 'bold' }
                    },
                    margin: { left: 14, right: 14 },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.row.index === 0 && moVal > 0) {
                            data.cell.styles.textColor = RED;
                        }
                    }
                });
                y = doc.lastAutoTable.finalY + 3;
            }

            // ── Fotos ─────────────────────────────────────────────────────
            const fotoA = await cargarFoto(item.fotoAntes);
            const fotoD = await cargarFoto(item.fotoDespues);

            if (fotoA || fotoD) {
                const BLOQUE_H = FOTO_H + 12;
                // Salto de página si las fotos no entran — siempre juntas
                if (y + BLOQUE_H > MARGEN_INF) { doc.addPage(); y = 18; }

                doc.setFontSize(6.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('REGISTRO FOTOGRÁFICO', 14, y + 3);
                y += 7;

                const GAP = 6;
                const xL  = 14;
                const xR  = xL + FOTO_W + GAP;

                doc.setFontSize(6.5);
                doc.setTextColor(...GRAY_TEXT);
                doc.text('Antes',   xL + FOTO_W / 2, y, { align: 'center' });
                doc.text('Después', xR + FOTO_W / 2, y, { align: 'center' });
                y += 2;

                if (fotoA) {
                    doc.addImage(fotoA.data, fotoA.format, xL, y, FOTO_W, FOTO_H);
                    doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'S');
                } else {
                    doc.setFillColor(...GRAY_LIGHT);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'F');
                    doc.setFontSize(6.5); doc.setTextColor(...GRAY_TEXT);
                    doc.text('Sin foto', xL + FOTO_W / 2, y + FOTO_H / 2, { align: 'center' });
                }

                if (fotoD) {
                    doc.addImage(fotoD.data, fotoD.format, xR, y, FOTO_W, FOTO_H);
                    doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                    doc.rect(xR, y, FOTO_W, FOTO_H, 'S');
                } else {
                    doc.setFillColor(...GRAY_LIGHT);
                    doc.rect(xR, y, FOTO_W, FOTO_H, 'F');
                    doc.setFontSize(6.5); doc.setTextColor(...GRAY_TEXT);
                    doc.text('Sin foto', xR + FOTO_W / 2, y + FOTO_H / 2, { align: 'center' });
                }

                y += FOTO_H + 4;
            }

            // Separador entre equipos (línea punteada fina)
            if (idx < ticketItems.length - 1) {
                y += 3;
                doc.setDrawColor(...GRAY_MID);
                doc.setLineWidth(0.15);
                doc.line(14, y, pageW - 14, y);
                y += SEC_GAP;
            } else {
                y += 6;
            }
        }

    } else {
        // ── VENTA ─────────────────────────────────────────────────────────
        const PROD_IMG_W = 18;
        const PROD_IMG_H = 18;

        const filas = [];
        ticketItems.forEach(item => {
            item.repuestosUsados?.forEach(r => {
                filas.push({
                    fotoSrc: r.fotoUrl || null,
                    row: [
                        '',
                        r.nombre,
                        r.sku || '—',
                        r.cantidad.toString(),
                        `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                        `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`
                    ]
                });
            });
            if (item.costoExtra > 0) {
                filas.push({
                    fotoSrc: null,
                    row: ['', 'Envío / Logística', '—', '1', '—', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]
                });
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
                    fillColor: false, textColor: GRAY_TEXT, fontStyle: 'bold',
                    fontSize: 7, cellPadding: { top: 2, bottom: 3, left: 2, right: 2 },
                    lineColor: DARK, lineWidth: { bottom: 0.4 }
                },
                bodyStyles: {
                    fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
                    lineColor: GRAY_LIGHT, lineWidth: { bottom: 0.2 },
                    minCellHeight: PROD_IMG_H + 6, valign: 'middle',
                },
                columnStyles: {
                    0: { cellWidth: PROD_IMG_W + 4 },
                    1: { cellWidth: 'auto' },
                    2: { textColor: GRAY_TEXT, fontSize: 7.5, cellWidth: 18 },
                    3: { halign: 'center', cellWidth: 14 },
                    4: { halign: 'right',  cellWidth: 24 },
                    5: { halign: 'right',  fontStyle: 'bold', cellWidth: 26 }
                },
                margin: { left: 14, right: 14 },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 0) {
                        const foto = fotosVenta[data.row.index];
                        const ix = data.cell.x + (data.cell.width  - PROD_IMG_W) / 2;
                        const iy = data.cell.y + (data.cell.height - PROD_IMG_H) / 2;
                        if (foto) {
                            doc.addImage(foto.data, foto.format, ix, iy, PROD_IMG_W, PROD_IMG_H);
                            doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                            doc.rect(ix, iy, PROD_IMG_W, PROD_IMG_H, 'S');
                        } else {
                            doc.setFillColor(...GRAY_LIGHT);
                            doc.rect(ix, iy, PROD_IMG_W, PROD_IMG_H, 'F');
                            doc.setFontSize(6); doc.setTextColor(...GRAY_TEXT);
                            doc.text('Sin foto', ix + PROD_IMG_W / 2, iy + PROD_IMG_H / 2, { align: 'center' });
                        }
                    }
                }
            });
            y = doc.lastAutoTable.finalY + 8;
        }
    }

    // ── TOTALES ──────────────────────────────────────────────────────────────
    if (y + 30 > MARGEN_INF) { doc.addPage(); y = 18; }

    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(pageW - 75, y, pageW - 14, y);
    y += 5;

    if (pctDesc > 0) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Subtotal', pageW - 75, y);
        doc.setTextColor(...DARK);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - 14, y, { align: 'right' });
        y += 6;

        doc.setTextColor(...RED);
        doc.text(`Descuento (${pctDesc}%)`, pageW - 75, y);
        doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, pageW - 14, y, { align: 'right' });
        y += 4;

        doc.setDrawColor(...GRAY_MID);
        doc.line(pageW - 75, y, pageW - 14, y);
        y += 5;
    }

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('TOTAL', pageW - 75, y);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, pageW - 14, y + 1, { align: 'right' });

    y += 3;
    doc.setFillColor(...RED);
    doc.rect(pageW - 75, y, 61, 0.7, 'F');

    // ── FOOTER EN TODAS LAS PÁGINAS ──────────────────────────────────────────
    // Si hay leyenda, usarla como pie; si no, usar el texto por defecto
    const leyendaTxt = (leyenda || '').trim();
    const textoPie = leyendaTxt || (esTecnico
        ? 'Garantía: 30 días sobre mano de obra · Repuestos según fabricante'
        : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso');

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        dibujarFooterPDF(doc, i, totalPaginas, textoPie);
    }

    doc.save(`${esTecnico ? 'Servicio' : 'Venta'}_${cliente.nombre || 'Remito'}_${fecha.replace(/\//g, '-')}.pdf`);
};
