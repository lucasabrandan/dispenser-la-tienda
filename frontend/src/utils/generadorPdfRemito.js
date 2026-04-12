import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import {
    DARK, RED, GOLD, WHITE, GRAY_LIGHT, GRAY_MID, GRAY_TEXT,
    procesarFecha, dibujarHeaderPDF, dibujarHeaderPDFCompacto, dibujarFooterPDF
} from './pdfTheme';
import { construirUrlFoto } from './construirUrlFoto';

// Carga una foto (data URL base64 o filename del backend) y la devuelve
// como { data, format } lista para doc.addImage.
// Las fotos nuevas ya llegan como JPEG comprimido desde FotoUpload.
// Las fotos del backend se buscan por filename.
async function cargarFoto(src) {
    if (!src) return null;

    let dataUrl = null;

    if (src instanceof File) {
        // File object en memoria (foto nueva antes de guardar)
        dataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror  = () => resolve(null);
            reader.readAsDataURL(src);
        });
    } else if (typeof src === 'string' && src.startsWith('data:')) {
        // Ya es data URL (foto convertida previamente)
        dataUrl = src;
    } else {
        // Es filename — buscar en el backend
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

    // Detectar formato: fotos nuevas son JPEG (comprimidas por FotoUpload)
    // Las del backend también deberían ser JPEG, pero soportamos PNG como fallback
    const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format };
}

export const generarRemitoPDFPremium = async ({
    esPresupuesto, cliente, sede, tecnico, ticketItems, fechaServicio,
    descuentoPorcentaje = 0,
    leyenda = '',
    // Override para cuando equipoSerial es 'MOSTRADOR' por no estar en el inventario
    // (pasa al generar PDF desde la lista para servicios con equipos sin S/N registrado)
    esTecnicoForzado = null
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }

    const doc   = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const fecha = procesarFecha(fechaServicio);
    // Si viene forzado, usar ese valor; si no, detectar por equipoSerial
    const esTecnico = esTecnicoForzado !== null
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');

    // Modo compacto: 3+ equipos → header más chico, fotos y tablas reducidas
    const esCompacto = ticketItems.length >= 3;

    // Dimensiones adaptivas
    const FOTO_W = esCompacto ? 62 : 84;
    const FOTO_H = esCompacto ? 46 : 64;
    const tblBodySize  = esCompacto ? 7.5 : 8.5;
    const tblHeadSize  = esCompacto ? 6.5 : 7;
    const tblBodyPad   = { top: esCompacto ? 2 : 2.5,  bottom: esCompacto ? 2 : 2.5,  left: 0, right: 0 };
    const tblHeadPad   = { top: 2, bottom: esCompacto ? 2 : 3, left: 0, right: 0 };
    const secGap       = esCompacto ? 10 : 14; // espacio entre equipos

    const tipoLabel = esPresupuesto
        ? (esTecnico ? 'PRESUPUESTO DE SERVICIO TÉCNICO' : 'PRESUPUESTO DE VENTA')
        : (esTecnico ? 'REMITO DE SERVICIO TÉCNICO'      : 'COMPROBANTE DE VENTA');

    const subtotalBruto = ticketItems.reduce((a, b) => a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc       = parseFloat(descuentoPorcentaje) || 0;
    const montoDesc     = pctDesc > 0 ? subtotalBruto * pctDesc / 100 : 0;
    const totalFinal_   = subtotalBruto - montoDesc;

    // ── HEADER ───────────────────────────────────────────────────────────────
    // Con 3+ equipos usamos el header compacto para ganar ~18mm de espacio
    const subtitulo = esTecnico && tecnico ? `Técnico: ${tecnico}` : null;

    if (esCompacto) {
        dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo);
    } else {
        dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo);
    }

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    // Sin cajas decorativas — solo texto con jerarquía clara
    let y = esCompacto ? 36 : 52;

    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(14, y, pageW - 14, y);

    y += 7;

    // Label "Para:"
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text('PARA', 14, y);

    // Nombre del cliente — grande y en negrita
    y += 5;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(cliente.nombre?.toUpperCase() || 'PARTICULAR', 14, y);

    // Datos de contacto — una línea discreta
    y += 6;
    const contacto = [
        cliente.cuilDni  ? `DNI/CUIT: ${cliente.cuilDni}` : null,
        cliente.telefono ? `Tel: ${cliente.telefono}`      : null,
        sede?.direccion  || null,
        cliente.email    || null
    ].filter(Boolean).join('   ·   ');

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(contacto, 14, y, { maxWidth: pageW - 28 });

    y += 3;
    doc.setLineWidth(0.2);
    doc.line(14, y + 4, pageW - 14, y + 4);
    y += 12;

    // ── ITEMS ────────────────────────────────────────────────────────────────
    if (esTecnico) {

        for (const [idx, item] of ticketItems.entries()) {
            if (y > 230) { doc.addPage(); y = 20; }

            const subtotalEquipo = parseFloat(item.totalCalculado || item.costo || 0);
            const modelo   = item.modeloEquipo    || null;
            const serial   = (item.equipoSerial && item.equipoSerial !== 'MOSTRADOR') ? item.equipoSerial : null;
            const ubicacion = item.ubicacionEquipo || null;

            // ── Título del equipo ─────────────────────────────────────────
            // Número en rojo + nombre/modelo en negrita
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...RED);
            doc.text(`EQUIPO ${idx + 1}`, 14, y);

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(modelo ? modelo.toUpperCase() : 'Dispenser', 14, y + 6);

            // Serial y ubicación
            const metaLinea = [
                serial     ? `N/S: ${serial}`        : null,
                ubicacion  ? `Ubicación: ${ubicacion}` : null
            ].filter(Boolean).join('   ·   ');

            if (metaLinea) {
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...GRAY_TEXT);
                doc.text(metaLinea, 14, y + 12);
            }

            // Subtotal del equipo — derecha, mismo nivel que el título
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...DARK);
            doc.text(`$ ${subtotalEquipo.toLocaleString('es-AR')}`, pageW - 14, y + 6, { align: 'right' });

            y += metaLinea ? 18 : 12;

            // ── Trabajo realizado ─────────────────────────────────────────
            const textoTrabajo = (item.trabajo || item.trabajoRealizado || item.resumenTexto || '')
                .replace(/\| MO:.*/, '').trim();

            if (textoTrabajo) {
                doc.setFontSize(7);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('TRABAJO REALIZADO', 14, y);
                y += 4;

                const lines = doc.splitTextToSize(textoTrabajo, pageW - 28);
                doc.setFontSize(8.5);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(60, 58, 56);
                doc.text(lines, 14, y);
                y += lines.length * 4.5 + 4;
            }

            // ── Tabla de repuestos y mano de obra ─────────────────────────
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
                        1: { halign: 'center', cellWidth: 16 },
                        2: { halign: 'right',  cellWidth: 30, fontStyle: 'bold' }
                    },
                    margin: { left: 14, right: 14 },
                    // MO en rojo
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.row.index === 0 && moVal > 0) {
                            data.cell.styles.textColor = RED;
                        }
                    }
                });
                y = doc.lastAutoTable.finalY + 4;
            }

            // ── Fotos ─────────────────────────────────────────────────────
            // cargarFoto acepta: File (nueva), filename (guardada), data URL
            const fotoA = await cargarFoto(item.fotoAntes);
            const fotoD = await cargarFoto(item.fotoDespues);

            if (fotoA || fotoD) {
                const GAP = esCompacto ? 8 : 10;
                const BLOQUE_H = FOTO_H + 14;

                if (y + BLOQUE_H > 262) { doc.addPage(); y = 20; }

                doc.setFontSize(7);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('REGISTRO FOTOGRÁFICO', 14, y + 4);
                y += 8;

                const xL = 14;
                const xR = xL + FOTO_W + GAP;

                // Labels
                doc.setFontSize(7);
                doc.setTextColor(...GRAY_TEXT);
                doc.text('Antes', xL + FOTO_W / 2, y, { align: 'center' });
                doc.text('Después', xR + FOTO_W / 2, y, { align: 'center' });
                y += 3;

                if (fotoA) {
                    doc.addImage(fotoA.data, fotoA.format, xL, y, FOTO_W, FOTO_H);
                    doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'S');
                } else {
                    doc.setFillColor(...GRAY_LIGHT);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'F');
                    doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
                    doc.text('Sin foto', xL + FOTO_W / 2, y + FOTO_H / 2, { align: 'center' });
                }

                if (fotoD) {
                    doc.addImage(fotoD.data, fotoD.format, xR, y, FOTO_W, FOTO_H);
                    doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                    doc.rect(xR, y, FOTO_W, FOTO_H, 'S');
                } else {
                    doc.setFillColor(...GRAY_LIGHT);
                    doc.rect(xR, y, FOTO_W, FOTO_H, 'F');
                    doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
                    doc.text('Sin foto', xR + FOTO_W / 2, y + FOTO_H / 2, { align: 'center' });
                }

                y += FOTO_H + 6;
            }

            // Separador entre equipos
            if (idx < ticketItems.length - 1) {
                doc.setDrawColor(...GRAY_MID);
                doc.setLineWidth(0.2);
                doc.line(14, y + 4, pageW - 14, y + 4);
                y += secGap;
            } else {
                y += 8;
            }
        }

    } else {
        // ── VENTA ─────────────────────────────────────────────────────────
        const PROD_IMG_W = 18;
        const PROD_IMG_H = 18;

        // Armar filas y precargar fotos en paralelo
        const filas = [];
        ticketItems.forEach(item => {
            item.repuestosUsados?.forEach(r => {
                filas.push({
                    fotoSrc: r.fotoUrl || null,
                    row: [
                        '',   // col 0: imagen (se dibuja en didDrawCell)
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
                    fillColor: false,
                    textColor: GRAY_TEXT,
                    fontStyle: 'bold',
                    fontSize: 7,
                    cellPadding: { top: 2, bottom: 3, left: 2, right: 2 },
                    lineColor: DARK,
                    lineWidth: { bottom: 0.4 }
                },
                bodyStyles: {
                    fontSize: 8.5,
                    cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
                    lineColor: GRAY_LIGHT,
                    lineWidth: { bottom: 0.2 },
                    minCellHeight: PROD_IMG_H + 6,
                    valign: 'middle',
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
            y = doc.lastAutoTable.finalY + 10;
        }
    }

    // ── TOTALES ──────────────────────────────────────────────────────────────
    if (y > 248) { doc.addPage(); y = 20; }

    // Línea antes de totales
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.2);
    doc.line(pageW - 80, y, pageW - 14, y);
    y += 6;

    if (pctDesc > 0) {
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Subtotal', pageW - 80, y);
        doc.setTextColor(...DARK);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, pageW - 14, y, { align: 'right' });
        y += 7;

        doc.setTextColor(...RED);
        doc.text(`Descuento (${pctDesc}%)`, pageW - 80, y);
        doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, pageW - 14, y, { align: 'right' });
        y += 5;

        doc.setDrawColor(...GRAY_MID);
        doc.line(pageW - 80, y, pageW - 14, y);
        y += 6;
    }

    // Total final — tipografía grande, sin caja
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('TOTAL', pageW - 80, y);

    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, pageW - 14, y + 1, { align: 'right' });

    // Subrayado dorado bajo el total
    y += 4;
    doc.setFillColor(...RED);
    doc.rect(pageW - 80, y, 66, 0.8, 'F');
    y += 12;

    // ── LEYENDA ──────────────────────────────────────────────────────────────
    const leyendaTxt = (leyenda || '').trim();
    if (leyendaTxt) {
        if (y > 254) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('OBSERVACIONES', 14, y);
        y += 5;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 78, 76);
        doc.text(doc.splitTextToSize(leyendaTxt, pageW - 28), 14, y);
    }

    // ── FOOTER EN TODAS LAS PÁGINAS ──────────────────────────────────────────
    const textoPie = esTecnico
        ? 'Garantía: 30 días sobre mano de obra · Repuestos según fabricante'
        : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso';

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        dibujarFooterPDF(doc, i, totalPaginas, textoPie);
    }

    doc.save(`${esTecnico ? 'Servicio' : 'Venta'}_${cliente.nombre || 'Remito'}_${fecha.replace(/\//g, '-')}.pdf`);
};
