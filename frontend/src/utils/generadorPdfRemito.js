import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import {
    DARK, RED, GOLD, WHITE, GRAY_LIGHT, GRAY_MID, GRAY_TEXT,
    procesarFecha, dibujarHeaderPDF, dibujarFooterPDF
} from './pdfTheme';
import { construirUrlFoto } from './construirUrlFoto';

// Carga una foto desde el backend y la convierte a base64 para embeber en el PDF
async function cargarFoto(src) {
    if (!src) return null;
    // Si ya es base64 la usamos directo
    if (src.startsWith('data:')) return src;
    // Si es filename, la bajamos del backend
    try {
        const url = construirUrlFoto(src);
        if (!url) return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror  = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

export const generarRemitoPDFPremium = async ({
    esPresupuesto, cliente, sede, tecnico, ticketItems, fechaServicio,
    descuentoPorcentaje = 0,
    leyenda = ''
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }

    const doc   = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const fecha = procesarFecha(fechaServicio);
    const esTecnico = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');

    const tipoLabel = esPresupuesto
        ? (esTecnico ? 'PRESUPUESTO DE SERVICIO TÉCNICO' : 'PRESUPUESTO DE VENTA')
        : (esTecnico ? 'REMITO DE SERVICIO TÉCNICO'      : 'COMPROBANTE DE VENTA');

    const subtotalBruto = ticketItems.reduce((a, b) => a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc       = parseFloat(descuentoPorcentaje) || 0;
    const montoDesc     = pctDesc > 0 ? subtotalBruto * pctDesc / 100 : 0;
    const totalFinal_   = subtotalBruto - montoDesc;

    // ── HEADER ───────────────────────────────────────────────────────────────
    dibujarHeaderPDF(
        doc, tipoLabel, fecha,
        esTecnico && tecnico ? `Técnico: ${tecnico}` : null
    );

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    // Sin cajas decorativas — solo texto con jerarquía clara
    let y = 52;

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
                        fontSize: 7,
                        cellPadding: { top: 2, bottom: 3, left: 0, right: 0 },
                        lineColor: GRAY_MID,
                        lineWidth: { bottom: 0.3 }
                    },
                    bodyStyles: {
                        fontSize: 8.5,
                        cellPadding: { top: 2.5, bottom: 2.5, left: 0, right: 0 },
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
            // Acepta base64 ya convertido (fotoAntesB64) o filename directo (fotoAntes)
            const fotoA = await cargarFoto(item.fotoAntesB64 || item.fotoAntes);
            const fotoD = await cargarFoto(item.fotoDespuesB64 || item.fotoDespues);

            if (fotoA || fotoD) {
                const FOTO_W = 84, FOTO_H = 64, GAP = 10;
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
                    doc.addImage(fotoA, 'JPEG', xL, y, FOTO_W, FOTO_H);
                    doc.setDrawColor(...GRAY_MID); doc.setLineWidth(0.2);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'S');
                } else {
                    doc.setFillColor(...GRAY_LIGHT);
                    doc.rect(xL, y, FOTO_W, FOTO_H, 'F');
                    doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
                    doc.text('Sin foto', xL + FOTO_W / 2, y + FOTO_H / 2, { align: 'center' });
                }

                if (fotoD) {
                    doc.addImage(fotoD, 'JPEG', xR, y, FOTO_W, FOTO_H);
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
                y += 14;
            } else {
                y += 8;
            }
        }

    } else {
        // ── VENTA ─────────────────────────────────────────────────────────
        const rows = [];
        ticketItems.forEach(item => {
            item.repuestosUsados?.forEach(r => {
                rows.push([
                    r.nombre,
                    r.sku || '—',
                    r.cantidad.toString(),
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`
                ]);
            });
            if (item.costoExtra > 0) {
                rows.push(['Envío / Logística', '—', '1', '—', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]);
            }
        });

        if (rows.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Producto', 'SKU', 'Cant.', 'P. Unitario', 'Subtotal']],
                body: rows,
                theme: 'plain',
                headStyles: {
                    fillColor: false,
                    textColor: GRAY_TEXT,
                    fontStyle: 'bold',
                    fontSize: 7,
                    cellPadding: { top: 2, bottom: 3, left: 0, right: 0 },
                    lineColor: DARK,
                    lineWidth: { bottom: 0.4 }
                },
                bodyStyles: {
                    fontSize: 8.5,
                    cellPadding: { top: 3, bottom: 3, left: 0, right: 0 },
                    lineColor: GRAY_LIGHT,
                    lineWidth: { bottom: 0.2 }
                },
                columnStyles: {
                    1: { textColor: GRAY_TEXT, fontSize: 7.5 },
                    2: { halign: 'center' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 },
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
