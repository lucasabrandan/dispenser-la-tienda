import jsPDF from 'jspdf';
import { C, LOGO_URL, M, T, CONTENT_W, PAGE_H, FOOTER_SAFE, getEmpresa } from './theme.js';

const fmt = v => `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;

function formatFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatFechaLarga(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcTotal(s) {
    const sub = (s.items || []).reduce((acc, it) => acc + Number(it.costo || 0) + Number(it.costoExtra || 0), 0);
    const pct = Number(s.descuentoPorcentaje || 0);
    return pct > 0 ? Math.round(sub * (1 - pct / 100)) : Math.round(sub);
}

// Trunca texto para que no exceda un ancho máximo
function truncar(doc, texto, maxW) {
    if (!texto) return '';
    if (doc.getTextWidth(texto) <= maxW) return texto;
    let t = texto;
    while (t.length > 0 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
}

function checkSalto(doc, y, necesita) {
    if (y + necesita > PAGE_H - FOOTER_SAFE) {
        doc.addPage();
        return 15;
    }
    return y;
}

export function generarPDFHistorialCliente({ cliente, servicios }) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();
    const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── HEADER ──
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, pageW, 38, 'F');

    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 4, 28, 11); } catch {}
    }

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text(empresa.nombre, M + 32, 9);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.text(empresa.eslogan, M + 32, 14);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('HISTORIAL DE CLIENTE', M, 30);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${hoy}`, pageW - M, 30, { align: 'right' });

    let y = 46;

    // ── FICHA DEL CLIENTE ──
    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CONTENT_W, 24, 2, 2, 'FD');

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(cliente.nombre?.toUpperCase() || 'SIN NOMBRE', M + 4, y + 7);

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    const infoCli = [
        [cliente.calle, cliente.numero, cliente.localidad].filter(Boolean).join(' '),
        cliente.telefono ? `Tel: ${cliente.telefono}` : null,
    ].filter(Boolean).join('  ·  ');
    if (infoCli) doc.text(infoCli, M + 4, y + 14);

    // Stats lado derecho
    const realizados = servicios.filter(s => s.estado === 'REALIZADO').length;
    const presupuestos = servicios.filter(s => s.estado === 'PRESUPUESTO').length;
    const totalGeneral = servicios.reduce((acc, s) => acc + calcTotal(s), 0);

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${servicios.length} servicios  ·  ${realizados} realizados  ·  ${presupuestos} presupuestos`, pageW - M - 4, y + 7, { align: 'right' });

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.green);
    doc.text(`Total facturado: ${fmt(totalGeneral)}`, pageW - M - 4, y + 14, { align: 'right' });

    y += 30;

    // ── TABLA DE SERVICIOS ──
    const COL_FECHA = M + 2;
    const COL_ESTADO = M + 24;
    const COL_TRABAJO = M + 52;
    const COL_TOTAL = pageW - M - 2;
    const TRABAJO_MAX_W = COL_TOTAL - COL_TRABAJO - 25;
    const ROW_H = 9;

    // Cabecera
    y = checkSalto(doc, y, 12);
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, 7, 1.5, 1.5, 'F');
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('FECHA', COL_FECHA, y + 5);
    doc.text('ESTADO', COL_ESTADO, y + 5);
    doc.text('TRABAJO REALIZADO', COL_TRABAJO, y + 5);
    doc.text('TOTAL', COL_TOTAL, y + 5, { align: 'right' });
    y += 10;

    // Filas
    servicios.forEach((s, idx) => {
        const trabajos = (s.items || []).map(it => it.trabajoRealizado).filter(Boolean).join(' · ');
        const equiposTxt = (s.items || []).map(it => it.equipoSerial).filter(Boolean).join(', ');
        const total = calcTotal(s);
        const tieneEquipos = equiposTxt.length > 0;
        const alturaFila = tieneEquipos ? ROW_H + 5 : ROW_H;

        y = checkSalto(doc, y, alturaFila);

        // Zebra
        if (idx % 2 === 0) {
            doc.setFillColor(...C.grayZebra);
            doc.rect(M, y - 2, CONTENT_W, alturaFila, 'F');
        }

        // Línea separadora sutil
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.1);
        doc.line(M, y - 2, M + CONTENT_W, y - 2);

        // Fecha
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(formatFecha(s.fecha), COL_FECHA, y + 3);

        // Estado — punto de color + label
        const colorEstado = s.estado === 'REALIZADO' ? C.green
            : s.estado === 'PRESUPUESTO' ? C.gold : C.red;
        doc.setFillColor(...colorEstado);
        doc.circle(COL_ESTADO + 2, y + 2, 1.5, 'F');
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...colorEstado);
        const lbl = s.estado === 'REALIZADO' ? 'Realizado'
            : s.estado === 'PRESUPUESTO' ? 'Presupuesto' : 'Rechazado';
        doc.text(lbl, COL_ESTADO + 6, y + 3);

        // Trabajo — truncado a 1 línea
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(truncar(doc, trabajos || 'Sin detalle', TRABAJO_MAX_W), COL_TRABAJO, y + 3);

        // Total
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...(total > 0 ? C.dark : C.grayText));
        doc.text(total > 0 ? fmt(total) : '-', COL_TOTAL, y + 3, { align: 'right' });

        // Equipos (segunda línea)
        if (tieneEquipos) {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text(truncar(doc, `Eq: ${equiposTxt}`, CONTENT_W - 10), COL_FECHA, y + 9);
        }

        y += alturaFila;
    });

    // ── RESUMEN FINAL ──
    y = checkSalto(doc, y, 22);
    y += 4;

    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, 'F');

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('RESUMEN', M + 4, y + 6);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    const primerSvc = servicios.length > 0 ? formatFechaLarga(servicios[servicios.length - 1].fecha) : '-';
    const ultimoSvc = servicios.length > 0 ? formatFechaLarga(servicios[0].fecha) : '-';
    doc.text(`Primer servicio: ${primerSvc}  ·  Último: ${ultimoSvc}`, M + 4, y + 12);

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${fmt(totalGeneral)}`, pageW - M - 4, y + 10, { align: 'right' });

    // ── FOOTER en todas las páginas ──
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
        doc.setPage(p);
        const pH = doc.internal.pageSize.getHeight();

        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(M, pH - 10, pageW - M, pH - 10);

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`${empresa.nombre}  ·  ${empresa.web}`, M, pH - 5);

        if (totalPags > 1) {
            doc.text(`${p} / ${totalPags}`, pageW - M, pH - 5, { align: 'right' });
        }
    }

    doc.save(`historial_${(cliente.nombre || 'cliente').replace(/\s+/g, '_')}.pdf`);
}
