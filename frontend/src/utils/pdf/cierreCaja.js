/**
 * cierreCaja.js — Genera el PDF de cierre de caja con liquidación
 */
import jsPDF     from 'jspdf';
import autoTable from 'jspdf-autotable';
import { C, M, T, CONTENT_W, HEADER_H, getEmpresa } from './theme.js';
import { dibujarHeader, dibujarFooter }               from './layout.js';
import { checkSalto }                                 from './helpers.js';

const PCT_IMPUESTOS = 30;

function fmtMonto(v) {
    return `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
}

function fmtFecha(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function liquidacion(total, repuestos) {
    const impuestos = Math.round(total * PCT_IMPUESTOS / 100);
    const ganancia  = total - impuestos - repuestos;
    const porPartes = Math.round(ganancia / 2);
    return { impuestos, ganancia, porPartes };
}

export function generarPDFCierreCaja({ servicios, porTecnico, totalGeneral, moGeneral, repuestosGeneral = 0, desde, hasta }) {
    if (!servicios || servicios.length === 0) return;

    const doc     = new jsPDF();
    const pageW   = doc.internal.pageSize.getWidth();
    const hoy     = new Date().toLocaleDateString('es-AR');
    const rango   = `${fmtFecha(desde)} al ${fmtFecha(hasta)}`;

    // ── Header ────────────────────────────────────────────────────────────────
    dibujarHeader(doc, {
        tipoLabel: 'CIERRE DE CAJA',
        fecha:     hoy,
        nroDoc:    `Período: ${rango}`,
    });

    let y = HEADER_H.normal + 10;

    // ── Bloque resumen general ────────────────────────────────────────────────
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, 22, 2, 2, 'F');

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(200, 210, 230);
    doc.text('SERVICIOS', M + 5, y + 7);
    doc.setFontSize(T.xl);
    doc.setTextColor(...C.white);
    doc.text(String(servicios.length), M + 5, y + 18);

    const colMid = M + CONTENT_W / 3;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('MANO DE OBRA', colMid, y + 7);
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text(fmtMonto(moGeneral), colMid, y + 18);

    const colDer = M + (CONTENT_W * 2) / 3;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('TOTAL COBRADO', colDer, y + 7);
    doc.setFontSize(T.lg);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text(fmtMonto(totalGeneral), colDer, y + 18);

    y += 30;

    // ── Tabla resumen por técnico ─────────────────────────────────────────────
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('RESUMEN POR TÉCNICO', M, y);
    y += 4;

    const tecRows = porTecnico.map(t => [
        t.nombre,
        String(t.servicios.length),
        t.repuestos > 0 ? fmtMonto(t.repuestos) : '—',
        t.mo > 0 ? fmtMonto(t.mo) : '—',
        fmtMonto(t.total),
    ]);

    autoTable(doc, {
        startY: y,
        head:   [['TÉCNICO', 'SERV.', 'REPUESTOS', 'M.O.', 'TOTAL']],
        body:   tecRows,
        theme:  'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.15,
        },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 16, halign: 'center' },
            2: { cellWidth: 30, halign: 'right', textColor: C.red },
            3: { cellWidth: 30, halign: 'right', textColor: C.gold },
            4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: C.navy },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section === 'body' && data.row.index % 2 === 0)
                data.cell.styles.fillColor = C.grayZebra;
        },
    });

    y = doc.lastAutoTable.finalY + 10;

    // ── Liquidación por técnico ───────────────────────────────────────────────
    y = checkSalto(doc, y, 30);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`LIQUIDACIÓN — ${PCT_IMPUESTOS}% IMPUESTOS · SPLIT 50/50`, M, y);
    y += 5;

    porTecnico.forEach(tec => {
        const { impuestos, ganancia, porPartes } = liquidacion(tec.total, tec.repuestos);
        const CARD_H = tec.repuestos > 0 ? 42 : 36;

        y = checkSalto(doc, y, CARD_H + 4);

        // Fondo card
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(M, y, CONTENT_W, CARD_H, 2, 2, 'FD');

        // Barra superior navy con nombre
        doc.setFillColor(...C.navy);
        doc.roundedRect(M, y, CONTENT_W, 8, 2, 2, 'F');
        doc.rect(M, y + 4, CONTENT_W, 4, 'F');

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(tec.nombre, M + 4, y + 5.5);
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text(`cobrado: ${fmtMonto(tec.total)}`, pageW - M - 2, y + 5.5, { align: 'right' });

        let ly = y + 12;

        // Desglose
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`− Impuestos ${PCT_IMPUESTOS}%`, M + 4, ly);
        doc.setTextColor(...C.red);
        doc.text(fmtMonto(impuestos), pageW - M - 2, ly, { align: 'right' });
        ly += 5;

        if (tec.repuestos > 0) {
            doc.setTextColor(...C.grayText);
            doc.text('− Repuestos', M + 4, ly);
            doc.setTextColor(...C.red);
            doc.text(fmtMonto(tec.repuestos), pageW - M - 2, ly, { align: 'right' });
            ly += 5;
        }

        // Línea divisora
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(M + 3, ly, pageW - M - 3, ly);
        ly += 4;

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text('= Ganancia neta', M + 4, ly);
        doc.setFontSize(T.sm);
        doc.setTextColor(...C.navy);
        doc.text(fmtMonto(ganancia), pageW - M - 2, ly, { align: 'right' });
        ly += 6;

        // Split 50/50 — dos cajas
        const halfW = (CONTENT_W - 3) / 2;

        doc.setFillColor(230, 240, 255);
        doc.roundedRect(M, ly, halfW, 10, 1.5, 1.5, 'F');
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(M + halfW + 3, ly, halfW, 10, 1.5, 1.5, 'F');

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tec.nombre.split(' ')[0], M + 4, ly + 4.5);
        doc.setFontSize(T.xs);
        doc.text(fmtMonto(porPartes), M + halfW - 2, ly + 7, { align: 'right' });

        doc.setTextColor(...C.green);
        doc.setFontSize(T.label);
        doc.text('Empresa', M + halfW + 7, ly + 4.5);
        doc.setFontSize(T.xs);
        doc.text(fmtMonto(porPartes), M + CONTENT_W - 2, ly + 7, { align: 'right' });

        y += CARD_H + 4;
    });

    // ── Resumen total liquidación (solo si hay más de un técnico) ─────────────
    if (porTecnico.length > 1) {
        const { impuestos, ganancia, porPartes } = liquidacion(totalGeneral, repuestosGeneral);
        y = checkSalto(doc, y, 36);

        doc.setFillColor(...C.navy);
        doc.roundedRect(M, y, CONTENT_W, 32, 2, 2, 'F');

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(180, 200, 230);
        doc.text('TOTAL LIQUIDADO — TODOS LOS TÉCNICOS', M + 4, y + 6);

        let ry = y + 12;
        const col2 = pageW - M - 2;

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text(`Impuestos ${PCT_IMPUESTOS}%`, M + 4, ry);
        doc.setTextColor(255, 120, 100);
        doc.text(fmtMonto(impuestos), col2, ry, { align: 'right' });
        ry += 4.5;

        if (repuestosGeneral > 0) {
            doc.setTextColor(180, 200, 230);
            doc.text('Repuestos', M + 4, ry);
            doc.setTextColor(255, 120, 100);
            doc.text(fmtMonto(repuestosGeneral), col2, ry, { align: 'right' });
            ry += 4.5;
        }

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text('Ganancia neta total', M + 4, ry);
        doc.text(fmtMonto(ganancia), col2, ry, { align: 'right' });
        ry += 6;

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text('Técnicos (total)', M + 4, ry);
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(fmtMonto(porPartes), M + CONTENT_W / 2 - 2, ry, { align: 'right' });

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text('Empresa', M + CONTENT_W / 2 + 4, ry);
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(fmtMonto(porPartes), col2, ry, { align: 'right' });

        y += 38;
    }

    // ── Listado detallado ─────────────────────────────────────────────────────
    const calcTotal = s => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;
    y = checkSalto(doc, y, 30);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text('DETALLE DE SERVICIOS', M, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head:   [['CLIENTE', 'TÉCNICO', 'FECHA', 'TOTAL']],
        body:   servicios.map(s => [
            s.clienteNombre || '—',
            s.usuarioNombre || 'Sin asignar',
            s.fechaServicio ? fmtFecha(s.fechaServicio.split('T')[0]) : '—',
            fmtMonto(calcTotal(s)),
        ]),
        theme:  'grid',
        headStyles: {
            fillColor: C.navyLight, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
            lineColor: C.grayBorder, lineWidth: 0.1,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 38 },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section === 'body' && data.row.index % 2 === 0)
                data.cell.styles.fillColor = C.grayZebra;
        },
    });

    // ── Footer todas las páginas ──────────────────────────────────────────────
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        dibujarFooter(doc, { pagina: i, totalPaginas: total });
    }

    const fecha = hoy.replace(/\//g, '-');
    doc.save(`CierreCaja_${fecha}_${rango.replace(/\//g, '-').replace(/ /g, '')}.pdf`);
}
