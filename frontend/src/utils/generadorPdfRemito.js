import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import logoUrl from '../assets/logo-dispenser.png';

const DARK      = [35, 31, 32];
const RED       = [231, 76, 60];
const GOLD      = [246, 184, 26];
const WHITE     = [255, 255, 255];
const GRAY_LIGHT= [248, 248, 248];
const GRAY_MID  = [200, 200, 200];
const GRAY_TEXT = [100, 100, 100];
const WARM_BG   = [255, 248, 240];
const WARM_BORDER=[240, 224, 208];

function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

function label(doc, txt, x, y) {
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(txt.toUpperCase(), x, y);
}

function value(doc, txt, x, y, color = DARK) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...color);
    doc.text(txt, x, y);
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
    doc.setFillColor(...DARK);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setFillColor(...RED);
    doc.rect(0, 32, 210, 4, 'F');

    // Logo — mantener proporción 700x300 → aprox 2.33:1
    // A 48px de ancho → 48/2.33 = ~20px de alto
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 6, 6, 46, 20); } catch { }
    }

    // Badge tipo
    doc.setFillColor(...RED);
    doc.roundedRect(56, 13, 58, 9, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...WHITE);
    doc.text(tipoLabel, 85, 19, { align: 'center' });

    // Fecha + técnico
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(`Fecha: ${fecha}`, 196, 12, { align: 'right' });
    if (esTecnico && tecnico) doc.text(`Técnico: ${tecnico}`, 196, 20, { align: 'right' });

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    let y = 46;
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y - 2, 182, 34, 'F');
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.rect(14, y - 2, 182, 34, 'S');
    doc.setFillColor(...GOLD);
    doc.rect(14, y - 2, 3, 34, 'F');

    label(doc, 'Cliente', 22, y + 3);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(cliente.nombre?.toUpperCase() || 'PARTICULAR', 22, y + 10);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);

    const lineas = [
        [cliente.cuilDni ? `DNI/CUIT: ${cliente.cuilDni}` : null, `IVA: ${cliente.condicionIva || 'CONSUMIDOR FINAL'}`].filter(Boolean).join('   ·   '),
        [sede?.nombreSede, sede?.direccion].filter(Boolean).join(' — '),
        [cliente.telefono ? `Tel: ${cliente.telefono}` : null, cliente.email].filter(Boolean).join('   ·   ')
    ].filter(Boolean);

    lineas.forEach((l, i) => doc.text(l, 22, y + 17 + i * 5));

    y += 42;

    // ── ITEMS ────────────────────────────────────────────────────────────────
    if (esTecnico) {

        ticketItems.forEach((item, idx) => {
            if (y > 220) { doc.addPage(); y = 20; }

            const subtotalEquipo = parseFloat(item.totalCalculado || item.costo || 0);

            // ── TARJETA EQUIPO ────────────────────────────────────────────
            // Header tarjeta oscuro
            doc.setFillColor(...DARK);
            doc.rect(14, y, 182, 12, 'F');

            // Círculo rojo con número
            doc.setFillColor(...RED);
            doc.circle(22, y + 6, 5, 'F');
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...WHITE);
            doc.text(`${idx + 1}`, 22, y + 8.5, { align: 'center' });

            // Título equipo + S/N
            doc.setFontSize(10);
            doc.setTextColor(...WHITE);
            doc.text(`EQUIPO ${idx + 1}`, 30, y + 5.5);
            const sn = item.equipoSerial && item.equipoSerial !== 'MOSTRADOR' ? item.equipoSerial : null;
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text(sn ? `N/S: ${sn}` : 'Sin N/S registrado', 30, y + 10);

            // Subtotal en dorado (derecha)
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GOLD);
            doc.text(`$ ${subtotalEquipo.toLocaleString('es-AR')}`, 194, y + 8, { align: 'right' });

            y += 12;

            // ── Metadatos (modelo + ubicación) — fondo cálido ─────────────
            const modelo    = item.modeloEquipo    || null;
            const ubicacion = item.ubicacionEquipo || null;

            if (modelo || ubicacion) {
                doc.setFillColor(...WARM_BG);
                doc.rect(14, y, 182, 12, 'F');
                doc.setDrawColor(...WARM_BORDER);
                doc.line(14, y + 12, 196, y + 12);

                let xMeta = 18;
                if (modelo) {
                    label(doc, 'Modelo', xMeta, y + 5);
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(80, 80, 80);
                    doc.text(modelo, xMeta, y + 10);
                    xMeta += 90;
                }
                if (ubicacion) {
                    label(doc, 'Ubicación', xMeta, y + 5);
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(80, 80, 80);
                    doc.text(ubicacion, xMeta, y + 10);
                }
                y += 12;
            }

            // ── Descripción trabajo ───────────────────────────────────────
            const textoTrabajo = (item.trabajo || item.trabajoRealizado || item.resumenTexto || '')
                .replace(/\| MO:.*/, '').trim();

            if (textoTrabajo) {
                doc.setFillColor(252, 252, 252);
                const lines = doc.splitTextToSize(textoTrabajo, 172);
                const hDesc = lines.length * 4.5 + 8;
                doc.rect(14, y, 182, hDesc, 'F');
                doc.setDrawColor(...GRAY_MID);
                doc.line(14, y + hDesc, 196, y + hDesc);
                doc.setFontSize(8.5);
                doc.setFont(undefined, 'italic');
                doc.setTextColor(80, 80, 80);
                doc.text(lines, 18, y + 6);
                y += hDesc;
            }

            // ── Tabla desglose ────────────────────────────────────────────
            const rows = [];
            const moVal = parseFloat(item.costoExtra || 0);
            if (moVal > 0) {
                rows.push({
                    concepto: 'Mano de obra / Servicio técnico',
                    cant: '1',
                    importe: `$ ${moVal.toLocaleString('es-AR')}`,
                    esMO: true
                });
            }
            item.repuestosUsados?.forEach(r => {
                rows.push({
                    concepto: r.nombre,
                    cant: r.cantidad.toString(),
                    importe: `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`,
                    esMO: false
                });
            });

            if (rows.length > 0) {
                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Cant.', 'Importe']],
                    body: rows.map(r => [r.concepto, r.cant, r.importe]),
                    theme: 'plain',
                    headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: DARK,
                        fontStyle: 'bold',
                        fontSize: 8,
                        cellPadding: 4
                    },
                    bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
                    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
                    margin: { left: 14, right: 14 },
                    tableLineColor: GRAY_MID,
                    tableLineWidth: 0.2,
                    didParseCell: (data) => {
                        if (data.section === 'body' && rows[data.row.index]?.esMO) {
                            data.cell.styles.textColor = RED;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
                y = doc.lastAutoTable.finalY;
            }

            // ── Subtotal equipo ───────────────────────────────────────────
            doc.setFillColor(245, 245, 245);
            doc.rect(14, y, 182, 9, 'F');
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GRAY_TEXT);
            doc.text('Subtotal equipo:', 18, y + 6);
            doc.setTextColor(...DARK);
            doc.text(`$ ${subtotalEquipo.toLocaleString('es-AR')}`, 194, y + 6, { align: 'right' });
            y += 9;

            // Separador entre equipos
            if (idx < ticketItems.length - 1) {
                doc.setDrawColor(...GRAY_MID);
                doc.setLineDashPattern([2, 2], 0);
                doc.line(14, y + 4, 196, y + 4);
                doc.setLineDashPattern([], 0);
                y += 12;
            } else {
                y += 8;
            }
        });

    } else {
        // ── VENTA ─────────────────────────────────────────────────────────
        const rows = [];
        ticketItems.forEach(item => {
            item.repuestosUsados?.forEach(r => {
                rows.push([r.nombre, r.sku || '-', r.cantidad.toString(),
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`]);
            });
            if (item.costoExtra > 0)
                rows.push(['Envío / Logística', '-', '1', '-', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]);
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
                columnStyles: { 1: { textColor: GRAY_TEXT, fontSize: 7.5 }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
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
        doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(...GRAY_TEXT);
        doc.text('Subtotal:', 116, y + 8);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, 194, y + 8, { align: 'right' });
        doc.setTextColor(...RED);
        doc.text(`Descuento (${pctDesc}%):`, 116, y + 18);
        doc.text(`- $ ${montoDesc.toLocaleString('es-AR')}`, 194, y + 18, { align: 'right' });
        doc.setDrawColor(...GRAY_MID); doc.line(116, y + 22, 194, y + 22);
        doc.setFillColor(...DARK); doc.rect(110, y + 24, 86, 10, 'F');
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(...WHITE);
        doc.text('TOTAL', 116, y + 31);
        doc.setTextColor(...GOLD);
        doc.text(`$ ${totalFinal_.toLocaleString('es-AR')}`, 194, y + 31, { align: 'right' });
        y += 44;
    } else {
        doc.setFillColor(...DARK); doc.rect(110, y, 86, 14, 'F');
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(...WHITE);
        doc.text('TOTAL', 116, y + 9.5);
        doc.setTextColor(...GOLD);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, 194, y + 9.5, { align: 'right' });
        y += 24;
    }

    // ── LEYENDA ──────────────────────────────────────────────────────────────
    const leyendaTxt = (leyenda || '').trim();
    if (leyendaTxt) {
        if (y > 254) { doc.addPage(); y = 20; }
        doc.setDrawColor(...RED); doc.setLineWidth(0.5);
        doc.line(14, y, 196, y); doc.setLineWidth(0.2);
        y += 6;
        doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(...DARK);
        doc.text('OBSERVACIONES / CONDICIONES:', 14, y);
        y += 5;
        doc.setFont(undefined, 'normal'); doc.setTextColor(...GRAY_TEXT);
        const lines = doc.splitTextToSize(leyendaTxt, 180);
        doc.text(lines, 14, y);
    }

    // ── PIE ──────────────────────────────────────────────────────────────────
    doc.setFontSize(7.5); doc.setTextColor(150, 150, 150); doc.setFont(undefined, 'normal');
    doc.text(
        esTecnico ? 'Garantía: 30 días sobre mano de obra · Repuestos según fabricante'
                  : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso',
        105, 284, { align: 'center' }
    );
    doc.setFillColor(...DARK); doc.rect(0, 287, 210, 10, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, 287, 10, 10, 'F');
    doc.setFillColor(...RED); doc.rect(10, 287, 18, 10, 'F');

    doc.save(`${esTecnico ? 'Servicio' : 'Venta'}_${cliente.nombre || 'Remito'}_${fecha.replace(/\//g, '-')}.pdf`);
};