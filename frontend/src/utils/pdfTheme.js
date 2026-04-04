/**
 * pdfTheme.js — Sistema de diseño compartido para todos los PDFs de la app
 * Paleta alineada con CLAUDE.md: brand #D13A28, gold #D48800, text #1C1917
 */
import logoUrl from '../assets/logo-dispenser.png';

// ── Paleta de marca ──────────────────────────────────────────────────────────
export const DARK        = [28,  25,  23 ];   // #1C1917
export const RED         = [209, 58,  40 ];   // #D13A28 — rojo principal
export const GOLD        = [212, 136, 0  ];   // #D48800 — acento dorado
export const WHITE       = [255, 255, 255];
export const GRAY_LIGHT  = [237, 234, 230];   // #EDEAE6 — bg-card
export const GRAY_MID    = [192, 188, 182];   // #C0BCB6 — bg-raised
export const GRAY_TEXT   = [100, 98,  94 ];   // texto muted
export const WARM_BG     = [250, 248, 245];
export const WARM_BORDER = [220, 212, 200];

// ── Procesador de fecha ──────────────────────────────────────────────────────
export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// ── Header premium ───────────────────────────────────────────────────────────
// Fondo oscuro · barra roja · logo · badge tipo · fecha + subtítulo opcionales
export function dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo = null) {
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFillColor(...RED);
    doc.rect(0, 32, pageW, 4, 'F');

    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 6, 6, 46, 20); } catch {}
    }

    // Badge tipo de documento
    doc.setFillColor(...RED);
    doc.roundedRect(56, 13, 62, 9, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...WHITE);
    doc.text(tipoLabel, 87, 19, { align: 'center' });

    // Fecha y subtítulo a la derecha
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(`Fecha: ${fecha}`, pageW - 6, 12, { align: 'right' });
    if (subtitulo) {
        doc.setFontSize(7);
        doc.setTextColor(140, 136, 130);
        doc.text(subtitulo, pageW - 6, 20, { align: 'right' });
    }
}

// ── Footer estándar ──────────────────────────────────────────────────────────
// Barra oscura + acento dorado + rojo + numeración de páginas
export function dibujarFooterPDF(doc, pagina = null, totalPaginas = null, textoCentral = null) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Texto legal sobre la barra
    if (textoCentral) {
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'normal');
        doc.text(textoCentral, pageW / 2, pageH - 12, { align: 'center' });
    }

    // Barra base
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, pageH - 10, 10, 10, 'F');
    doc.setFillColor(...RED);
    doc.rect(10, pageH - 10, 18, 10, 'F');

    // Branding
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Dispenser La Tienda', 32, pageH - 4);

    // Paginación
    if (pagina && totalPaginas) {
        doc.setTextColor(150, 150, 150);
        doc.text(`Pág. ${pagina} / ${totalPaginas}`, pageW - 6, pageH - 4, { align: 'right' });
    }
}

// ── Compresión de imágenes ───────────────────────────────────────────────────
/**
 * Recibe cualquier base64/data-URL y devuelve un JPEG comprimido
 * apto para jsPDF. Limita a 1200x900px y 80% de calidad.
 * Esto resuelve el fallo silencioso de addImage con fotos de celular (5-10MB).
 */
export function comprimirFoto(src) {
    return new Promise(resolve => {
        if (!src) { console.log('[comprimirFoto] src es null/undefined'); return resolve(null); }
        console.log('[comprimirFoto] procesando src length:', src.length, 'starts:', src.substring(0, 30));
        const img = new Image();
        img.onload = () => {
            console.log('[comprimirFoto] imagen cargada:', img.naturalWidth, 'x', img.naturalHeight);
            try {
                const MAX_W = 1200;
                const MAX_H = 900;
                const ratio = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.naturalWidth  * ratio);
                canvas.height = Math.round(img.naturalHeight * ratio);
                const ctx = canvas.getContext('2d');
                if (!ctx) { console.error('[comprimirFoto] canvas context null'); return resolve(null); }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const result = canvas.toDataURL('image/jpeg', 0.8);
                console.log('[comprimirFoto] comprimida OK, length:', result.length);
                resolve(result);
            } catch (e) {
                console.error('[comprimirFoto] error en canvas:', e);
                resolve(null);
            }
        };
        img.onerror = (e) => { console.error('[comprimirFoto] img.onerror:', e); resolve(null); };
        img.src = src;
    });
}

// ── Helpers de texto ─────────────────────────────────────────────────────────
export function pdfLabel(doc, txt, x, y) {
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(txt.toUpperCase(), x, y);
}

export function pdfValue(doc, txt, x, y, color = DARK) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...color);
    doc.text(txt, x, y);
}
