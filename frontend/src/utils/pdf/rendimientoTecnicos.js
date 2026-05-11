/**
 * rendimientoTecnicos.js — PDF de rendimiento mensual de técnicos (vista admin)
 */
import jsPDF    from 'jspdf';
import autoTable from 'jspdf-autotable';
import { C, M, CONTENT_W, T } from './theme.js';
import { dibujarHeader, dibujarFooter } from './layout.js';

function fmt(v) {
    return `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
}

function labelMes(periodo) {
    if (!periodo) return '';
    const [y, m] = periodo.split('-');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

export function generarPDFRendimientoTecnicos({ datos, periodo }) {
    if (!datos || datos.length === 0) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;

    // Header corporativo compacto
    const hy = dibujarHeader(doc, { compact: true });
    let y = hy + 6;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.navy);
    doc.text('RENDIMIENTO DE TÉCNICOS', M, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(T.sm);
    doc.setTextColor(...C.grayText);
    doc.text(labelMes(periodo), M, y);
    y += 8;

    // Tabla principal
    const rows = datos.map(d => [
        d.tecnicoNombre || '—',
        d.cantidadTrabajos,
        fmt(d.totalFacturado),
        fmt(d.totalRepuestos),
        fmt(d.gananciaNet),
        fmt(d.parteTecnico),
    ]);

    // Totales
    const totFact  = datos.reduce((s, d) => s + Number(d.totalFacturado  || 0), 0);
    const totRep   = datos.reduce((s, d) => s + Number(d.totalRepuestos  || 0), 0);
    const totGan   = datos.reduce((s, d) => s + Number(d.gananciaNet     || 0), 0);
    const totParte = datos.reduce((s, d) => s + Number(d.parteTecnico    || 0), 0);
    const totTrab  = datos.reduce((s, d) => s + (d.cantidadTrabajos || 0), 0);

    rows.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', textColor: C.navy } },
        { content: totTrab, styles: { fontStyle: 'bold' } },
        { content: fmt(totFact),  styles: { fontStyle: 'bold' } },
        { content: fmt(totRep),   styles: { fontStyle: 'bold' } },
        { content: fmt(totGan),   styles: { fontStyle: 'bold' } },
        { content: fmt(totParte), styles: { fontStyle: 'bold', textColor: C.gold } },
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Técnico', 'Trabajos', 'Facturado', 'Repuestos', 'Ganancia neta', 'Su parte']],
        body: rows,
        margin: { left: M, right: M },
        styles: { fontSize: T.sm, cellPadding: 3 },
        headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xs },
        alternateRowStyles: { fillColor: C.grayZebra },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 32, halign: 'right' },
            5: { cellWidth: 25, halign: 'right', textColor: C.gold },
        },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Nota al pie
    doc.setFontSize(T.xs);
    doc.setTextColor(...C.grayText);
    doc.text('* Ganancia neta = Facturado − 30% impuestos − repuestos. Su parte = 50% de la ganancia neta.', M, y);

    dibujarFooter(doc, doc.getNumberOfPages());

    const nombreArchivo = `rendimiento-tecnicos-${periodo || 'mes'}.pdf`;
    doc.save(nombreArchivo);
}
