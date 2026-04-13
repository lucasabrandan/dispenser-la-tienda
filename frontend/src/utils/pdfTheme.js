/**
 * pdfTheme.js — Sistema de diseño para PDFs
 * Principio: logo como única identidad de marca, tipografía clara, acento rojo.
 */
import logoUrl from '../assets/logo-dispenser.png';

// ── Paleta ────────────────────────────��──────────────────────────────────────
export const DARK       = [20,  18,  16 ];
export const RED        = [209, 58,  40 ];
export const GOLD       = [212, 136, 0  ];
export const WHITE      = [255, 255, 255];
export const GRAY_LIGHT = [245, 244, 242];
export const GRAY_MID   = [200, 196, 190];
export const GRAY_TEXT  = [120, 116, 110];
export const WARM_BG    = [250, 248, 245];
export const WARM_BORDER= [220, 212, 200];

// ── Fecha ─────────────────────────────��─────────────────────────���────────────
export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// ── Header normal (1 equipo) ──────────────────────────���──────────────────────
// Esquema: logo izquierda | fecha + nroDoc derecha | línea | tipo + técnico
export function dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo = null, nroDoc = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Banda superior roja
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 2.5, 'F');

    // Logo — única identidad de marca
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 8, 44, 19); } catch {}
    }

    // Fecha — vértice superior derecho (reemplaza nombre empresa)
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(155, 150, 144);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 14, { align: 'right' });

    // Número de documento — debajo de la fecha, en rojo
    if (nroDoc) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(nroDoc, pageW - 14, 21, { align: 'right' });
    }

    // Línea separadora
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.4);
    doc.line(14, 30, pageW - 14, 30);

    // Tipo de documento — izquierda, debajo de línea
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 42);

    // Técnico — derecha, debajo de línea
    if (subtitulo) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(subtitulo, pageW - 14, 42, { align: 'right' });
    }
}

// ── Header compacto (2+ equipos) ───────────────────────���─────────────────────
export function dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo = null, nroDoc = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Banda superior roja
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 2, 'F');

    // Logo
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 6, 28, 12); } catch {}
    }

    // Fecha — derecha
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(155, 150, 144);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 11, { align: 'right' });

    // Número de documento — debajo, en rojo
    if (nroDoc) {
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(nroDoc, pageW - 14, 17, { align: 'right' });
    }

    // Línea separadora
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, 22, pageW - 14, 22);

    // Tipo de documento
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 30);

    // Técnico
    if (subtitulo) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(subtitulo, pageW - 14, 30, { align: 'right' });
    }
}

// ── Footer ────────────────────────────────────��────────────────────────────��─
// Sin nombre de empresa — el logo en el header es suficiente identidad de marca
export function dibujarFooterPDF(doc, pagina = null, totalPaginas = null, textoCentral = null) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Banda inferior roja — espejo de la banda superior
    doc.setFillColor(...RED);
    doc.rect(0, pageH - 2, pageW, 2, 'F');

    // Línea sobre el footer
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);

    // Leyenda / garantía — centrada
    if (textoCentral) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(155, 150, 144);
        doc.text(textoCentral, pageW / 2, pageH - 9, { align: 'center' });
    }

    // Paginación — solo si hay más de 1 página
    if (pagina && totalPaginas && totalPaginas > 1) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(`${pagina} / ${totalPaginas}`, pageW - 14, pageH - 4, { align: 'right' });
    }
}

// ── Helpers ──────────────────────────��──────────────────────────────────��────
export function pdfLabel(doc, txt, x, y) {
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(txt.toUpperCase(), x, y);
}

export function pdfValue(doc, txt, x, y, color = DARK) {
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...color);
    doc.text(txt, x, y);
}
