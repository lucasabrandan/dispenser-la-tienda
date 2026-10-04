/**
 * liquidacion.js — PDF de la liquidación mensual del técnico/socio (4-oct-2026).
 * Mismo desglose que la pantalla: cobrado − productos − impuestos (solo con
 * factura) = mano de obra neta → parte técnico / parte negocio.
 * No incluye costos internos de productos.
 */
import jsPDF    from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { C, M, T } from './theme.js';
import { dibujarHeaderCompacto, dibujarFooter } from './layout.js';
import { formatMesLargo } from '../dateUtils';

const fmt = v => `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const menos = v => (Number(v) > 0 ? `- ${fmt(v)}` : '-');
const fechaCorta = f => (f ? f.split('-').reverse().slice(0, 2).join('/') : '');

export function generarPDFLiquidacion(liq, completa = null) {
    if (!liq) return;
    const loading = toast.loading('Generando PDF…');
    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
        const pageW = doc.internal.pageSize.getWidth();
        dibujarHeaderCompacto(doc, { tipoLabel: 'Liquidación mensual', fecha: new Date().toLocaleDateString('es-AR'), tecnico: liq.tecnicoNombre });
        let y = 47;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(T.lg);
        doc.setTextColor(...C.navy);
        doc.text(`${liq.tecnicoNombre} — ${formatMesLargo(liq.mes)}`, M, y);
        y += 6;

        // Resumen
        const pctNeg = 100 - liq.porcentajeTecnico;
        const resumen = [
            ['Cobrado a clientes', fmt(liq.totalCobrado)],
            ['- Productos (precio de venta)', menos(liq.totalProductos)],
            [`- Impuestos ${liq.porcentajeImpuestos}% (solo trabajos con factura)`, menos(liq.totalImpuestos)],
            ['= Mano de obra neta', fmt(liq.totalNeto)],
            [`Parte ${liq.tecnicoNombre} (${liq.porcentajeTecnico}%)`, fmt(liq.parteTecnico)],
            [`Parte Dispenser La Tienda (${pctNeg}%)`, fmt(liq.parteNegocio)],
        ];
        autoTable(doc, {
            startY: y, body: resumen, theme: 'plain',
            margin: { left: M }, tableWidth: 120,
            styles: { fontSize: T.md, cellPadding: 1.6 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (d) => {
                if (d.row.index === 4) { d.cell.styles.textColor = C.gold; d.cell.styles.fontStyle = 'bold'; }
                if (d.row.index === 3) d.cell.styles.fontStyle = 'bold';
            },
        });
        y = doc.lastAutoTable.finalY + 6;

        // Detalle por trabajo
        const filas = liq.trabajos.map(t => [
            fechaCorta(t.fecha), t.cliente, t.detalle, t.cobro,
            fmt(t.cobrado), menos(t.productos), menos(t.impuestos), fmt(t.neto), fmt(t.parteTecnico),
        ]);
        filas.push([
            { content: `TOTAL (${liq.trabajos.length} trabajos)`, colSpan: 4, styles: { fontStyle: 'bold' } },
            { content: fmt(liq.totalCobrado), styles: { fontStyle: 'bold' } },
            { content: menos(liq.totalProductos), styles: { fontStyle: 'bold' } },
            { content: menos(liq.totalImpuestos), styles: { fontStyle: 'bold' } },
            { content: fmt(liq.totalNeto), styles: { fontStyle: 'bold' } },
            { content: fmt(liq.parteTecnico), styles: { fontStyle: 'bold', textColor: C.gold } },
        ]);
        autoTable(doc, {
            startY: y,
            head: [['Fecha', 'Cliente', 'Trabajo', 'Cobro', 'Cobrado', 'Productos', 'Impuestos', 'Neto MO', `Parte ${liq.porcentajeTecnico}%`]],
            body: filas,
            margin: { left: M, right: M },
            styles: { fontSize: T.sm, cellPadding: 2.2, overflow: 'linebreak' },
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xs },
            alternateRowStyles: { fillColor: C.grayZebra },
            columnStyles: {
                0: { cellWidth: 14 }, 1: { cellWidth: 42 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 22 },
                4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'right' }, 7: { cellWidth: 25, halign: 'right' },
                8: { cellWidth: 25, halign: 'right', textColor: C.gold },
            },
        });
        y = doc.lastAutoTable.finalY + 8;

        // Cuentas del mes: saldo entre DLT y el técnico (5-oct-2026)
        if (completa?.cuentas) {
            const c = completa.cuentas;
            const saldo = Number(c.saldo) || 0;
            const filasC = [[`Parte ${liq.tecnicoNombre}`, fmt(c.parteTecnico)]];
            if (Number(c.efectivoCobrado) > 0) filasC.push(['- Efectivo de DLT que cobró', fmt(c.efectivoCobrado)]);
            if (Number(c.rendido) > 0) filasC.push(['+ Ya rendido (cierres del día recibidos)', fmt(c.rendido)]);
            if (Number(c.entregado) > 0) filasC.push(['+ Otras entregas a DLT', fmt(c.entregado)]);
            if (Number(c.pagado) > 0) filasC.push(['- Ya pagado por DLT', fmt(c.pagado)]);
            (completa.movimientos || []).forEach(mv => filasC.push([
                `   ${String(mv.fecha).split('-').reverse().slice(0, 2).join('/')} ${mv.tipo === 'PAGO' ? 'Pago' : 'Entrega'}${mv.nota ? ' - ' + mv.nota : ''}`, fmt(mv.monto)]));
            filasC.push([saldo > 0 ? `Saldo: DLT le debe a ${liq.tecnicoNombre}` : saldo < 0 ? `Saldo: ${liq.tecnicoNombre} le debe a DLT` : 'Saldo: cuentas saldadas', fmt(Math.abs(saldo))]);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(T.md); doc.setTextColor(...C.navy);
            doc.text('Cuentas del mes', M, y);
            autoTable(doc, {
                startY: y + 2, body: filasC, theme: 'plain', margin: { left: M }, tableWidth: 140,
                styles: { fontSize: T.sm, cellPadding: 1.4 },
                columnStyles: { 1: { halign: 'right' } },
                didParseCell: (d) => { if (d.row.index === filasC.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = C.gold; } },
            });
            y = doc.lastAutoTable.finalY + 4;
            const ci = completa.cierre;
            if (ci?.cerrado) {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(T.xs); doc.setTextColor(...C.grayText);
                doc.text(`Mes cerrado el ${String(ci.cerradoEn).slice(0, 10).split('-').reverse().join('/')}`
                    + (ci.aceptadoEn ? ` · aceptado por ${liq.tecnicoNombre} el ${String(ci.aceptadoEn).slice(0, 10).split('-').reverse().join('/')}` : ' · pendiente de aceptación'), M, y);
                y += 6;
            } else { y += 2; }
        }

        // Pendientes de cobro (no suman)
        if (liq.pendientes?.length) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(T.md);
            doc.setTextColor(...C.navy);
            doc.text('Pendientes de cobro (se liquidan cuando se cobren)', M, y);
            autoTable(doc, {
                startY: y + 2,
                head: [['Fecha', 'Cliente', 'Trabajo', 'Monto']],
                body: liq.pendientes.map(p => [fechaCorta(p.fecha), p.cliente, p.detalle, fmt(p.monto)]),
                margin: { left: M, right: M },
                styles: { fontSize: T.sm, cellPadding: 2 },
                headStyles: { fillColor: C.navyLight, textColor: C.white, fontSize: T.xs },
                columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 42 }, 3: { cellWidth: 30, halign: 'right' } },
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(T.xs);
        doc.setTextColor(...C.grayText);
        doc.text(`Neto MO = cobrado - productos a precio de venta - ${liq.porcentajeImpuestos}% de impuestos (solo si el trabajo se facturó). `
            + `Solo trabajos asignados por Dispenser La Tienda y ya cobrados.`, M, Math.min(y, doc.internal.pageSize.getHeight() - 18), { maxWidth: pageW - M * 2 });

        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) { doc.setPage(i); dibujarFooter(doc, { pagina: i, totalPaginas: total }); }

        const slug = (liq.tecnicoNombre || 'tecnico').toLowerCase().replace(/\s+/g, '-');
        doc.save(`liquidacion-${slug}-${liq.mes}.pdf`);
        toast.success('PDF generado', { id: loading });
    } catch (e) {
        console.error('Error generando PDF liquidación:', e);
        toast.error('Error al generar el PDF', { id: loading });
    }
}
