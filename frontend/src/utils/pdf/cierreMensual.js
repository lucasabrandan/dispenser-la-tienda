import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { C, M, T, CONTENT_W, PAGE_H, FOOTER_SAFE, HEADER_H } from './theme.js';
import { dibujarHeader, dibujarFooter } from './layout.js';

// Cierre mensual por cliente con tarifa por volumen (2-oct-2026, MODO AGUA).
// Recibe la respuesta de GET /api/clientes/{id}/cierre-mensual tal cual.
// Todos los importes van SIN IVA; el IVA se discrimina recién en el bloque de totales.

const IVA = 0.21;
const fmt = v => `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const fmtFecha = f => {
    if (!f) return '-';
    const [a, m, d] = String(f).slice(0, 10).split('-');
    return `${d}/${m}/${a.slice(2)}`;
};

export function nombreMes(mes) {
    const [a, m] = mes.split('-').map(Number);
    const n = new Date(a, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return n.charAt(0).toUpperCase() + n.slice(1);
}

export function rangoTramo(tramos, tramo) {
    if (!tramo) return '';
    const i = tramos.findIndex(t => t.desde === tramo.desde);
    const sig = tramos[i + 1];
    return sig ? `${tramo.desde} a ${sig.desde - 1} equipos` : `${tramo.desde} o más equipos`;
}

export function generarPDFCierreMensual(data) {
    const loading = toast.loading('Generando PDF…');
    try {
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const mesTxt = nombreMes(data.mes);

        dibujarHeader(doc, {
            tipoLabel: `Cierre mensual — ${mesTxt}`,
            fecha: new Date().toLocaleDateString('es-AR'),
            estado: 'RESUMEN DEL MES',
        });

        let y = HEADER_H.normal + 11;

        // ── Ficha cliente + resumen ──
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, 20, 2, 2, 'FD');
        doc.setFontSize(T.md);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text((data.cliente?.nombre || '').toUpperCase(), M + 4, y + 7);
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const cuit = data.cliente?.cuit ? `CUIT: ${data.cliente.cuit}` : '';
        doc.text([cuit, `Período: ${fmtFecha(data.desde)} al ${fmtFecha(data.hasta)}`].filter(Boolean).join('   ·   '), M + 4, y + 13);

        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(`${data.cantidadEquipos} equipos · ${data.cantidadServicios} visitas`, pageW - M - 4, y + 7, { align: 'right' });
        if (data.tramoAplicado) {
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text(`Tramo ${rangoTramo(data.tramos, data.tramoAplicado)}: ${fmt(data.precioUnitario)} + IVA por equipo`,
                pageW - M - 4, y + 13, { align: 'right' });
        }
        y += 26;

        // ── Planilla: una fila por equipo ──
        const body = data.filas.map((f, i) => {
            const equipo = [f.serie ? `N/S ${f.serie}` : 'Sin N/S', f.equipo, f.ubicacion].filter(Boolean).join('\n');
            const lugar = [f.sede, f.direccion].filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join('\n');
            const reps = (f.repuestos || []).length
                ? f.repuestos.map(r => `${Number(r.cantidad)}x ${r.nombre}`).join('\n')
                : '—';
            const repNeto = Number(f.repuestosTotal || 0) / (1 + IVA);
            return [
                String(i + 1),
                fmtFecha(f.fecha),
                equipo,
                lugar || '—',
                (f.trabajo || '—').trim(),
                reps,
                repNeto > 0 ? fmt(repNeto) : '—',
                f.nroDocumento || `#${f.servicioId}`,
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['#', 'FECHA', 'EQUIPO', 'SEDE / DIRECCIÓN', 'TRABAJO', 'REPUESTOS', 'REP. $', 'REPORTE']],
            body,
            theme: 'grid',
            margin: { left: M, right: M, bottom: FOOTER_SAFE },
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xxs, cellPadding: 2 },
            bodyStyles: { fontSize: T.xxs, textColor: C.dark, cellPadding: 1.8, lineColor: C.grayBorder, lineWidth: 0.15, valign: 'top' },
            alternateRowStyles: { fillColor: C.grayLight },
            columnStyles: {
                0: { cellWidth: 7, halign: 'center' },
                1: { cellWidth: 14 },
                2: { cellWidth: 30 },
                3: { cellWidth: 34 },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 30 },
                6: { cellWidth: 17, halign: 'right' },
                7: { cellWidth: 17 },
            },
            rowPageBreak: 'avoid',
        });

        y = doc.lastAutoTable.finalY + 6;

        // ── Totales ──
        const filasTot = [
            [`Mano de obra (${data.cantidadEquipos} × ${data.precioUnitario ? fmt(data.precioUnitario) : 'sin tarifa'})`, fmt(data.manoDeObra)],
            ['Repuestos', fmt(data.repuestosNeto)],
            ['Subtotal', fmt(data.subtotal)],
            ['IVA 21%', fmt(data.iva)],
        ];
        const BOX_W = 92, BOX_X = pageW - M - BOX_W, ROW = 6.5;
        const boxH = filasTot.length * ROW + 11;
        if (y + boxH > PAGE_H - FOOTER_SAFE) { doc.addPage(); y = 18; }

        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.3);
        doc.setFillColor(...C.white);
        doc.roundedRect(BOX_X, y, BOX_W, boxH, 2, 2, 'FD');
        filasTot.forEach(([l, v], i) => {
            const ry = y + 5 + i * ROW;
            const fuerte = l === 'Subtotal';
            doc.setFontSize(T.xs);
            doc.setFont(undefined, fuerte ? 'bold' : 'normal');
            doc.setTextColor(...C.grayText);
            doc.text(l, BOX_X + 4, ry);
            doc.setTextColor(...C.dark);
            doc.text(v, BOX_X + BOX_W - 4, ry, { align: 'right' });
        });
        const ty = y + filasTot.length * ROW + 1.5;
        doc.setFillColor(...C.navy);
        doc.roundedRect(BOX_X, ty, BOX_W, 9, 2, 2, 'F');
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text('TOTAL A FACTURAR', BOX_X + 4, ty + 6);
        doc.text(fmt(data.total), BOX_X + BOX_W - 4, ty + 6, { align: 'right' });

        // Nota al costado de los totales
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const nota = doc.splitTextToSize(
            'Importes sin IVA. El precio por equipo corresponde al tramo alcanzado en el mes y se aplica a todos los equipos del período. '
            + 'El detalle técnico de cada equipo figura en su reporte individual (columna REPORTE).',
            CONTENT_W - BOX_W - 8);
        doc.text(nota, M, y + 4);

        const total = doc.internal.getNumberOfPages();
        for (let p = 1; p <= total; p++) {
            doc.setPage(p);
            dibujarFooter(doc, { pagina: p, totalPaginas: total });
        }

        const nombre = (data.cliente?.nombre || 'cliente').replace(/[^A-Za-z0-9]+/g, '-');
        doc.save(`cierre-${nombre}-${data.mes}.pdf`);
        toast.success('PDF generado', { id: loading });
    } catch (e) {
        console.error(e);
        toast.error('No se pudo generar el PDF', { id: loading });
    }
}
