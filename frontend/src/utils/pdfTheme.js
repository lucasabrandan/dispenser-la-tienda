/**
 * pdfTheme.js — Sistema de diseño para PDFs
 * Principio: header ultra-compacto, logo única identidad, info derecha.
 */
import logoUrl from '../assets/logo-dispenser.png';

// ── Paleta ────────────────────────────────────────────────────────────────────
export const DARK       = [20,  18,  16 ];
export const RED        = [209, 58,  40 ];
export const GOLD       = [212, 136, 0  ];
export const WHITE      = [255, 255, 255];
export const GRAY_LIGHT = [245, 244, 242];
export const GRAY_MID   = [200, 196, 190];
export const GRAY_TEXT  = [120, 116, 110];
export const WARM_BG    = [250, 248, 245];
export const WARM_BORDER= [220, 212, 200];

// ── Fecha ─────────────────────────────────────────────────────────────────────
export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// ── Header (todos los documentos) ─────────────────────────────────────────────
// Esquema:
//   [LOGO]         [Fecha: DD/MM/AAAA         ]
//                  [PP-DDMM-XX-01  (rojo bold) ]
//                  [Téc: Nombre     (gris)      ]
//   ─────────────────────────────────────────────
//   TÍTULO DEL DOCUMENTO (10pt, izquierda)
//
// Altura total del header normal  ≈ 41mm  → contenido empieza en y=41
// Altura total del header compacto ≈ 35mm → contenido empieza en y=35
export function dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo = null, nroDoc = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Banda superior roja
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 2.5, 'F');

    // Logo — tamaño reducido para ahorrar espacio vertical
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 7, 38, 16); } catch {}
    }

    // Bloque derecho: fecha / nroDoc / técnico — alineados a la derecha
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(155, 150, 144);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 12, { align: 'right' });

    if (nroDoc) {
        doc.setFontSize(9.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(nroDoc, pageW - 14, 20, { align: 'right' });
    }

    if (subtitulo) {
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(subtitulo, pageW - 14, 26, { align: 'right' });
    }

    // Línea separadora fina
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, 30, pageW - 14, 30);

    // Título del documento — izquierda, tamaño moderado (no dominante)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 38);
}

// ── Header compacto (2+ equipos) ─────────────────────────────────────────────
// Idéntica estructura pero todo más pequeño para maximizar espacio de contenido
// Altura total ≈ 35mm → contenido empieza en y=35
export function dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo = null, nroDoc = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Banda superior roja
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 2, 'F');

    // Logo
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 5, 28, 11); } catch {}
    }

    // Bloque derecho: fecha / nroDoc / técnico
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(155, 150, 144);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 10, { align: 'right' });

    if (nroDoc) {
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(nroDoc, pageW - 14, 17, { align: 'right' });
    }

    if (subtitulo) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(subtitulo, pageW - 14, 22, { align: 'right' });
    }

    // Línea separadora
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, 25, pageW - 14, 25);

    // Título — izquierda, tamaño mínimo funcional
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 32);
}

// ── Footer ────────────────────────────────────────────────────────────────────
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

    // Leyenda / garantía — centrada, máximo 1 línea
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
