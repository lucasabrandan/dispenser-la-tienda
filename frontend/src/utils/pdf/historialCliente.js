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

// Total de un servicio
function calcTotal(s) {
    const sub = (s.items || []).reduce((acc, it) => acc + Number(it.costo || 0) + Number(it.costoExtra || 0), 0);
    const pct = Number(s.descuentoPorcentaje || 0);
    return pct > 0 ? Math.round(sub * (1 - pct / 100)) : Math.round(sub);
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
    doc.rect(0, 0, pageW, 40, 'F');

    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 5, 30, 12); } catch {}
    }

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text(empresa.nombre, M + 34, 10);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.text(empresa.eslogan, M + 34, 15);

    doc.setFontSize(T.xl);
    doc.setFont(undefined, 'bold');
    doc.text('HISTORIAL DE CLIENTE', M, 32);

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${hoy}`, pageW - M, 32, { align: 'right' });

    let y = 48;

    // ── FICHA DEL CLIENTE ──
    doc.setFillColor(...C.grayBg);
    doc.roundedRect(M, y, CONTENT_W, 28, 2, 2, 'F');

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(cliente.nombre?.toUpperCase() || 'SIN NOMBRE', M + 5, y + 8);

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    const direccion = [cliente.calle, cliente.numero, cliente.localidad].filter(Boolean).join(' ');
    if (direccion) doc.text(direccion, M + 5, y + 15);
    if (cliente.telefono) doc.text(`Tel: ${cliente.telefono}`, M + 5, y + 21);

    // Stats del cliente — lado derecho
    const realizados = servicios.filter(s => s.estado === 'REALIZADO').length;
    const presupuestos = servicios.filter(s => s.estado === 'PRESUPUESTO').length;
    const totalGeneral = servicios.reduce((acc, s) => acc + calcTotal(s), 0);

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${servicios.length} servicios`, pageW - M - 5, y + 8, { align: 'right' });

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`${realizados} realizados · ${presupuestos} presupuestos`, pageW - M - 5, y + 15, { align: 'right' });

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.green);
    doc.text(`Total: ${fmt(totalGeneral)}`, pageW - M - 5, y + 22, { align: 'right' });

    y += 36;

    // ── TABLA DE SERVICIOS ──
    // Cabecera
    y = checkSalto(doc, y, 15);
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, 8, 1.5, 1.5, 'F');

    const cols = [M + 3, M + 22, M + 52, M + 115, pageW - M - 3];
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('FECHA', cols[0], y + 5.5);
    doc.text('ESTADO', cols[1], y + 5.5);
    doc.text('TRABAJO REALIZADO', cols[2], y + 5.5);
    doc.text('TOTAL', cols[3], y + 5.5, { align: 'right' });

    y += 11;

    // Filas
    servicios.forEach((s, idx) => {
        const trabajos = (s.items || []).map(it => it.trabajoRealizado).filter(Boolean).join(' · ');
        const equipos = (s.items || []).map(it => it.equipoSerial).filter(Boolean).join(', ');
        const total = calcTotal(s);
        const necesita = equipos ? 16 : 11;

        y = checkSalto(doc, y, necesita);

        // Fondo zebra
        if (idx % 2 === 0) {
            doc.setFillColor(...C.grayZebra);
            doc.rect(M, y - 3, CONTENT_W, necesita, 'F');
        }

        // Indicador de estado (punto de color)
        const colorEstado = s.estado === 'REALIZADO' ? C.green : s.estado === 'PRESUPUESTO' ? C.gold : C.red;
        doc.setFillColor(...colorEstado);
        doc.circle(cols[1] + 2, y + 1, 1.5, 'F');

        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(formatFecha(s.fecha), cols[0], y + 2);

        // Estado label
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...colorEstado);
        const lbl = s.estado === 'REALIZADO' ? 'Realizado' : s.estado === 'PRESUPUESTO' ? 'Presupuesto' : 'Rechazado';
        doc.text(lbl, cols[1] + 6, y + 2);

        // Trabajo (truncado)
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        const maxW = cols[3] - cols[2] - 20;
        const textoTrab = trabajos || 'Sin detalle';
        doc.text(textoTrab, cols[2], y + 2, { maxWidth: maxW });

        // Total
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...(total > 0 ? C.dark : C.grayText));
        doc.text(total > 0 ? fmt(total) : '-', cols[3], y + 2, { align: 'right' });

        // Equipos (segunda línea, más chica)
        if (equipos) {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            doc.text(`Equipos: ${equipos}`, cols[0], y + 8, { maxWidth: CONTENT_W - 10 });
        }

        y += necesita;
    });

    // ── RESUMEN FINAL ──
    y = checkSalto(doc, y, 25);
    y += 5;
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, y, CONTENT_W, 18, 2, 2, 'F');

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.white);
    doc.text('RESUMEN', M + 5, y + 7);

    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    const primerServicio = servicios.length > 0 ? formatFechaLarga(servicios[servicios.length - 1].fecha) : '-';
    const ultimoServicio = servicios.length > 0 ? formatFechaLarga(servicios[0].fecha) : '-';
    doc.text(`Primer servicio: ${primerServicio}  ·  Último: ${ultimoServicio}`, M + 5, y + 13);

    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.text(`Total facturado: ${fmt(totalGeneral)}`, pageW - M - 5, y + 10, { align: 'right' });

    // ── FOOTER ──
    const totalPags = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
        doc.setPage(p);
        const pH = doc.internal.pageSize.getHeight();

        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(M, pH - 12, pageW - M, pH - 12);

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`${empresa.nombre}  ·  ${empresa.web}  ·  ${empresa.email}`, M, pH - 7);

        if (totalPags > 1) {
            doc.text(`${p} / ${totalPags}`, pageW - M, pH - 7, { align: 'right' });
        }
    }

    doc.save(`historial_${(cliente.nombre || 'cliente').replace(/\s+/g, '_')}.pdf`);
}
