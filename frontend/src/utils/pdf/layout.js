/**
 * layout.js — Header, footer y gestión de páginas
 * Dos variantes: normal (1 equipo) y compact (multi-equipo)
 */
import { C, LOGO_URL, M, T, getEmpresa, HEADER_H } from './theme.js';

// ── HEADER NORMAL ─────────────────────────────────────────────────────────────
// Columna izquierda: logo + eslogan
// Columna derecha: caja resumen (fecha, nroDoc, técnico, estado)
// Separador horizontal navy al final
export function dibujarHeader(doc, { tipoLabel, fecha, tecnico = null, nroDoc = null, estado = null }) {
    const pageW = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Banda superior navy
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, pageW, 3, 'F');

    // Logo
    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 7, 40, 16); } catch {}
    }

    // Nombre empresa + eslogan bajo el logo
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(empresa.nombre, M, 29);
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(empresa.eslogan, M, 34);
    doc.text(`Tel: ${empresa.telefono}  ·  WA: ${empresa.whatsapp}`, M, 39);

    // Caja resumen — derecha
    const cajaX = pageW - M - 72;
    const cajaW = 72;
    const cajaY = 5;
    const cajaH = 34;
    doc.setFillColor(...C.grayBg);
    doc.roundedRect(cajaX, cajaY, cajaW, cajaH, 2, 2, 'F');
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(cajaX, cajaY, cajaW, cajaH, 2, 2, 'S');

    let cy = cajaY + 7;
    // Fila: Fecha
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.grayText);
    doc.text('Fecha', cajaX + 4, cy);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    doc.text(fecha, cajaX + cajaW - 4, cy, { align: 'right' });
    cy += 7;

    // Fila: Nro documento
    if (nroDoc) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text('Documento', cajaX + 4, cy);
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(nroDoc, cajaX + cajaW - 4, cy, { align: 'right' });
        cy += 7;
    }

    // Fila: Técnico
    if (tecnico) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text('Técnico', cajaX + 4, cy);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        doc.text(tecnico, cajaX + cajaW - 4, cy, { align: 'right' });
        cy += 7;
    }

    // Badge estado
    if (estado) {
        const badgeColor = estado === 'COMPLETADO' ? C.green
            : estado === 'PRESUPUESTO' ? C.navy
            : C.gold;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setFillColor(...badgeColor);
        const bW = 55;
        doc.roundedRect(cajaX + (cajaW - bW) / 2, cy - 4, bW, 6.5, 1.5, 1.5, 'F');
        doc.setTextColor(...C.white);
        doc.text(estado, cajaX + cajaW / 2, cy, { align: 'center' });
    }

    // Línea separadora navy
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.6);
    doc.line(M, HEADER_H.normal - 2, pageW - M, HEADER_H.normal - 2);

    // Título del documento (izquierda, bajo la línea)
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(tipoLabel, M, HEADER_H.normal + 4);
}

// ── HEADER COMPACTO ───────────────────────────────────────────────────────────
// Más pequeño, para multi-equipo donde el contenido ocupa más espacio
export function dibujarHeaderCompacto(doc, { tipoLabel, fecha, tecnico = null, nroDoc = null }) {
    const pageW = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Banda navy
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, pageW, 2.5, 'F');

    // Logo pequeño
    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 5, 28, 11); } catch {}
    }

    // Contacto en 1 línea
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`${empresa.nombre}  ·  Tel: ${empresa.telefono}  ·  WA: ${empresa.whatsapp}`, M, 21);

    // Bloque derecho: fecha / nroDoc / técnico
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`Fecha: ${fecha}`, pageW - M, 10, { align: 'right' });

    if (nroDoc) {
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.red);
        doc.text(nroDoc, pageW - M, 17, { align: 'right' });
    }

    if (tecnico) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`Téc: ${tecnico}`, pageW - M, 23, { align: 'right' });
    }

    // Línea separadora
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.4);
    doc.line(M, HEADER_H.compact - 2, pageW - M, HEADER_H.compact - 2);

    // Título
    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(tipoLabel, M, HEADER_H.compact + 3);
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
export function dibujarFooter(doc, { pagina = null, totalPaginas = null, textoCentral = null }) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const empresa = getEmpresa();

    // Banda navy inferior
    doc.setFillColor(...C.navy);
    doc.rect(0, pageH - 2.5, pageW, 2.5, 'F');

    // Línea separadora
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.line(M, pageH - 17, pageW - M, pageH - 17);

    // Leyenda central
    if (textoCentral) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        // Truncar si no entra
        const maxW = pageW - 80;
        const lines = doc.splitTextToSize(textoCentral, maxW);
        doc.text(lines[0] + (lines.length > 1 ? ' …' : ''), pageW / 2, pageH - 11, { align: 'center' });
    }

    // Contacto izquierda
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`Tel: ${empresa.telefono}  ·  WA: ${empresa.whatsapp}  ·  ${empresa.web}`, M, pageH - 5);

    // Paginación derecha
    if (pagina && totalPaginas && totalPaginas > 1) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(`Página ${pagina} de ${totalPaginas}`, pageW - M, pageH - 5, { align: 'right' });
    }
}
