import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import logoUrl from '../assets/logo-dispenser.png';

// ── Colores de marca ───────────────────────────────────────────────────────
const DARK       = [35, 31, 32];    // #231f20
const RED        = [231, 76, 60];   // #e74c3c
const GOLD       = [246, 184, 26];  // #f6b81a
const WHITE      = [255, 255, 255];
const GRAY_LIGHT = [248, 248, 248];
const GRAY_MID   = [200, 200, 200];
const GRAY_TEXT  = [100, 100, 100];

function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

export const generarRemitoPDFPremium = ({
    esPresupuesto, cliente, sede, tecnico, ticketItems, totalFinal, fechaServicio,
    descuentoPorcentaje = 0,
    leyenda = ''
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('⚠️ Datos insuficientes para generar el PDF.');
    }

    const doc       = new jsPDF();
    const fecha     = procesarFecha(fechaServicio);
    const esTecnico = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
    const tipoLabel = esPresupuesto
        ? (esTecnico ? 'PRESUPUESTO TÉCNICO' : 'PRESUPUESTO VENTAS')
        : (esTecnico ? 'REMITO DE SERVICIO'  : 'COMPROBANTE DE VENTA');

    const subtotalBruto = ticketItems.reduce((a, b) => a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc       = parseFloat(descuentoPorcentaje) || 0;
    const montoDesc     = pctDesc > 0 ? (subtotalBruto * pctDesc / 100) : 0;
    const totalFinal_   = subtotalBruto - montoDesc;

    // ── HEADER ───────────────────────────────────────────────────────────────
    // Fondo negro marca
    doc.setFillColor(...DARK);
    doc.rect(0, 0, 210, 40, 'F');

    // Franja roja inferior del header
    doc.setFillColor(...RED);
    doc.rect(0, 36, 210, 4, 'F');

    // Logo PNG — fondo negro así se ve bien
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 6, 2, 58, 30); } catch { }
    }

    // Badge tipo documento
    doc.setFillColor(...RED);
    doc.roundedRect(68, 16, 58, 9, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...WHITE);
    doc.text(tipoLabel, 97, 22, { align: 'center' });

    // Fecha + técnico (derecha)
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(`Fecha: ${fecha}`, 196, 12, { align: 'right' });
    if (esTecnico && tecnico) {
        doc.text(`Técnico: ${tecnico}`, 196, 20, { align: 'right' });
    }

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    let y = 50;

    doc.setFillColor(245, 245, 245);
    doc.rect(14, y - 2, 182, 28, 'F');
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.rect(14, y - 2, 182, 28, 'S');

    // Acento dorado izquierdo
    doc.setFillColor(...GOLD);
    doc.rect(14, y - 2, 3, 28, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE', 22, y + 3);

    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(cliente.nombre?.toUpperCase() || 'PARTICULAR', 22, y + 10);

    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);

    const linea1 = [
        cliente.cuilDni ? `DNI/CUIT: ${cliente.cuilDni}` : null,
        `IVA: ${cliente.condicionIva || 'CONSUMIDOR FINAL'}`
    ].filter(Boolean).join('   ·   ');
    const linea2 = [sede?.nombreSede, sede?.direccion].filter(Boolean).join(' — ');
    const linea3 = [cliente.telefono, cliente.email].filter(Boolean).join('   ·   ');

    if (linea1) doc.text(linea1, 22, y + 16);
    if (linea2) doc.text(linea2, 22, y + 20);
    if (linea3) doc.text(linea3, 22, y + 24);

    y += 34;

    // ── ITEMS ────────────────────────────────────────────────────────────────
    if (esTecnico) {

        ticketItems.forEach((item, idx) => {
            if (y > 228) { doc.addPage(); y = 20; }

            // Header equipo — fondo oscuro
            doc.setFillColor(...DARK);
            doc.rect(14, y, 182, 10, 'F');

            // Número en círculo rojo
            doc.setFillColor(...RED);
            doc.circle(20, y + 5, 4, 'F');
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...WHITE);
            doc.text(`${idx + 1}`, 20, y + 6.5, { align: 'center' });

            // S/N
            doc.setFontSize(9);
            doc.setTextColor(...WHITE);
            doc.text(
                item.equipoSerial && item.equipoSerial !== 'MOSTRADOR'
                    ? `S/N: ${item.equipoSerial}`
                    : 'Sin N/S registrado',
                28, y + 6.5
            );

            // Subtotal dorado
            doc.setTextColor(...GOLD);
            doc.text(
                `$ ${Number(item.totalCalculado || item.costo || 0).toLocaleString('es-AR')}`,
                194, y + 6.5, { align: 'right' }
            );

            y += 14;

            // Descripción trabajo
            const textoTrabajo = (item.trabajo || item.trabajoRealizado || item.resumenTexto || '')
                .replace(/\| MO:.*/, '').trim();
            if (textoTrabajo) {
                doc.setFontSize(8.5);
                doc.setTextColor(...DARK);
                doc.setFont(undefined, 'normal');
                const lines = doc.splitTextToSize(textoTrabajo, 176);
                doc.text(lines, 14, y);
                y += lines.length * 5 + 4;
            }

            // Tabla desglose
            const rows = [];
            if (item.costoExtra > 0) {
                rows.push(['Mano de obra / Servicio técnico', '1', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]);
            }
            item.repuestosUsados?.forEach(r => {
                rows.push([r.nombre, r.cantidad.toString(), `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            });

            if (rows.length > 0) {
                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Cant.', 'Importe']],
                    body: rows,
                    theme: 'plain',
                    headStyles: { fillColor: [240, 240, 240], textColor: DARK, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
                    bodyStyles: { fontSize: 8, cellPadding: 3 },
                    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
                    margin: { left: 14, right: 14 },
                    tableLineColor: GRAY_MID,
                    tableLineWidth: 0.2,
                });
                y = doc.lastAutoTable.finalY + 6;
            }

            // Separador entre equipos
            if (idx < ticketItems.length - 1) {
                doc.setDrawColor(...GRAY_MID);
                doc.setLineDashPattern([2, 2], 0);
                doc.line(14, y, 196, y);
                doc.setLineDashPattern([], 0);
                y += 6;
            }
        });

    } else {

        // VENTA — tabla de productos
        const rows = [];
        ticketItems.forEach(item => {
            item.repuestosUsados?.forEach(r => {
                rows.push([
                    r.nombre,
                    r.sku || '-',
                    r.cantidad.toString(),
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`
                ]);
            });
            if (item.costoExtra > 0) {
                rows.push(['Envío / Logística', '-', '1', '-', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]);
            }
        });

        if (rows.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5, cellPadding: 5 },
                bodyStyles: { fontSize: 8.5, cellPadding: 4 },
                alternateRowStyles: { fillColor: GRAY_LIGHT },
                columnStyles: {
                    1: { textColor: GRAY_TEXT, fontSize: 7.5 },
                    2: { halign: 'center' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 8;
        }
    }

    // ── TOTALES ──────────────────────────────────────────────────────────────
    if (y > 248) { doc.addPage(); y = 20; }

    if (pctDesc > 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(110, y, 86, 34, 'F');
        doc.setDrawColor(...GRAY_MID);
        doc.rect(110, y, 86, 34, 'S');

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Subtotal:', 116, y + 8);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, 194, y + 8, { align: 'right' });

        doc.setTextColor(...RED);
        doc.text(`Descuento (${pctDesc}%):`, 116, y + 18);
        doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, 194, y + 18, { align: 'right' });

        doc.setDrawColor(...GRAY_MID);
        doc.line(116, y + 22, 194, y + 22);

        doc.setFillColor(...DARK);
        doc.rect(110, y + 24, 86, 10, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...WHITE);
        doc.text('TOTAL', 116, y + 31);
        doc.setTextColor(...GOLD);
        doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, 194, y + 31, { align: 'right' });
        y += 44;
    } else {
        doc.setFillColor(...DARK);
        doc.rect(110, y, 86, 14, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...WHITE);
        doc.text('TOTAL', 116, y + 9.5);
        doc.setTextColor(...GOLD);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, 194, y + 9.5, { align: 'right' });
        y += 24;
    }

    // ── LEYENDA ──────────────────────────────────────────────────────────────
    const leyendaTxt = (leyenda || '').trim();
    if (leyendaTxt) {
        if (y > 254) { doc.addPage(); y = 20; }
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.5);
        doc.line(14, y, 196, y);
        doc.setLineWidth(0.2);
        y += 6;
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        doc.text('OBSERVACIONES / CONDICIONES:', 14, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        const lines = doc.splitTextToSize(leyendaTxt, 180);
        doc.text(lines, 14, y);
    }

    // ── PIE ──────────────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text(
        esTecnico
            ? 'Garantía: 30 días sobre mano de obra · Repuestos según fabricante'
            : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso',
        105, 284, { align: 'center' }
    );

    // Franja final de marca
    doc.setFillColor(...DARK);
    doc.rect(0, 287, 210, 10, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 287, 10, 10, 'F');
    doc.setFillColor(...RED);
    doc.rect(10, 287, 18, 10, 'F');

    doc.save(`${esTecnico ? 'Servicio' : 'Venta'}_${cliente.nombre || 'Remito'}_${fecha.replace(/\//g, '-')}.pdf`);
};