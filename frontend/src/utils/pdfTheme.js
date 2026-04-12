/**
 * pdfTheme.js — Sistema de diseño para PDFs
 * Principio: tipografía clara, fondo blanco, color de marca como acento único
 */
import logoUrl from '../assets/logo-dispenser.png';

// ── Paleta ───────────────────────────────────────────────────────────────────
export const DARK       = [20,  18,  16 ];
export const RED        = [209, 58,  40 ];
export const GOLD       = [212, 136, 0  ];
export const WHITE      = [255, 255, 255];
export const GRAY_LIGHT = [245, 244, 242];
export const GRAY_MID   = [200, 196, 190];
export const GRAY_TEXT  = [120, 116, 110];
export const WARM_BG    = [250, 248, 245];
export const WARM_BORDER= [220, 212, 200];

// ── Fecha ────────────────────────────────────────────────────────────────────
export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// ── Header ───────────────────────────────────────────────────────────────────
// Logo izquierda · empresa derecha · línea roja fina abajo
export function dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Logo — grande, izquierda
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 8, 44, 19); } catch {}
    }

    // Nombre empresa — derecha, alineado arriba
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text('DISPENSER LA TIENDA', pageW - 14, 13, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Servicio técnico de dispensers de agua', pageW - 14, 19, { align: 'right' });

    // Línea roja separadora — el único elemento de color del header
    doc.setFillColor(...RED);
    doc.rect(14, 30, pageW - 28, 1.2, 'F');

    // Tipo de documento — grande, izquierda, debajo de la línea
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 41);

    // Fecha y técnico — derecha, misma altura
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 37, { align: 'right' });
    if (subtitulo) {
        doc.text(subtitulo, pageW - 14, 43, { align: 'right' });
    }
}

// ── Header compacto (para 2+ equipos — ahorra ~18mm vs el completo) ──────────
// El contenido debe empezar en y=36 después de llamar esta función.
export function dibujarHeaderPDFCompacto(doc, tipoLabel, fecha, subtitulo = null) {
    const pageW = doc.internal.pageSize.getWidth();

    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 6, 28, 12); } catch {}
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text('DISPENSER LA TIENDA', pageW - 14, 11, { align: 'right' });

    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Servicio técnico de dispensers de agua', pageW - 14, 16, { align: 'right' });

    doc.setFillColor(...RED);
    doc.rect(14, 21, pageW - 28, 0.8, 'F');

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 29);

    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 25, { align: 'right' });
    if (subtitulo) doc.text(subtitulo, pageW - 14, 31, { align: 'right' });
}

// ── Footer ───────────────────────────────────────────────────────────────────
export function dibujarFooterPDF(doc, pagina = null, totalPaginas = null, textoCentral = null) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Línea superior del footer
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);

    // Texto legal centrado
    if (textoCentral) {
        doc.setFontSize(7);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(textoCentral, pageW / 2, pageH - 9, { align: 'center' });
    }

    // Nombre empresa izquierda
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text('Dispenser La Tienda', 14, pageH - 4);

    // Paginación derecha
    if (pagina && totalPaginas) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Pág. ${pagina} / ${totalPaginas}`, pageW - 14, pageH - 4, { align: 'right' });
    }
}

// ── Compresión de fotos ──────────────────────────────────────────────────────
export function comprimirFoto(src) {
    return new Promise(resolve => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => {
            try {
                const ratio = Math.min(1200 / img.naturalWidth, 900 / img.naturalHeight, 1);
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.naturalWidth  * ratio);
                canvas.height = Math.round(img.naturalHeight * ratio);
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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
