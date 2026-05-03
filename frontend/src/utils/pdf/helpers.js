/**
 * helpers.js — Utilidades puras de rendering para jsPDF
 */
// Usar URL relativa para que el proxy del dev server (o el mismo origen en prod) maneje el request
const UPLOADS_BASE = '/api/uploads';

// ── Texto ─────────────────────────────────────────────────────────────────────

export function sanitizarTexto(texto, maxLen = 400) {
    if (!texto) return '';
    return texto
        .replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
        .substring(0, maxLen)
        .split(' ').map(w => w.length > 30 ? w.substring(0, 28) + '…' : w).join(' ');
}

export function sanitizarCorto(texto, maxLen = 110) {
    if (!texto) return '';
    return texto.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, maxLen);
}

export function truncarLineas(doc, texto, maxWidth, maxLineas) {
    if (!texto) return [];
    const todas = doc.splitTextToSize(texto, maxWidth);
    if (todas.length <= maxLineas) return todas;
    const cortadas = todas.slice(0, maxLineas);
    const ultima = cortadas[maxLineas - 1];
    cortadas[maxLineas - 1] = ultima.length > 4 ? ultima.substring(0, ultima.length - 3) + '...' : '...';
    return cortadas;
}

// Construye línea de metadata con prioridad sin superponer precio
export function buildMetaLinea(doc, modelo, serial, ubicacion, garantia, maxW, fontSize) {
    doc.setFontSize(fontSize);
    const mide = s => doc.getStringUnitWidth(s) * fontSize / doc.internal.scaleFactor;
    const base = modelo || 'Dispenser';
    const partes = [
        serial    ? `N/S: ${serial}`      : null,
        ubicacion ? `Ubic.: ${ubicacion}` : null,
        garantia  ? `Gta: ${garantia}`    : null,
    ].filter(Boolean);
    let linea = base;
    for (const p of partes) {
        const candidato = linea + '  ·  ' + p;
        if (mide(candidato) <= maxW) linea = candidato;
        else break;
    }
    if (mide(linea) > maxW) {
        let s = linea;
        while (s.length > 4 && mide(s + '...') > maxW) s = s.slice(0, -1);
        linea = s + '...';
    }
    return linea;
}

// ── Fotos ─────────────────────────────────────────────────────────────────────

export async function cargarFoto(src) {
    if (!src) return null;
    let dataUrl = null;
    if (src instanceof File) {
        dataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror  = () => resolve(null);
            reader.readAsDataURL(src);
        });
    } else if (typeof src === 'string' && src.startsWith('data:')) {
        dataUrl = src;
    } else {
        try {
            // URL relativa → proxy del dev server o mismo origen en prod (evita CORS con R2)
            const filename = src.startsWith('http') ? src.split('/').pop() : src;
            const res = await fetch(`${UPLOADS_BASE}/${filename}`);
            if (!res.ok) return null;
            const blob = await res.blob();
            dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror  = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    }
    if (!dataUrl) return null;
    return { data: dataUrl, format: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG' };
}

// ── Drawing primitives ────────────────────────────────────────────────────────

export function label(doc, txt, x, y, color = [75, 85, 99]) {
    doc.setFontSize(6);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...color);
    doc.text(txt.toUpperCase(), x, y);
}

export function value(doc, txt, x, y, size = 9.5, color = [17, 24, 39]) {
    doc.setFontSize(size);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...color);
    doc.text(String(txt), x, y);
}

// Chip / badge de estado
export function dibujarBadge(doc, texto, x, y, bgColor, textColor = [255,255,255]) {
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    const w = doc.getStringUnitWidth(texto) * 6.5 / doc.internal.scaleFactor + 8;
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y - 4.5, w, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(...textColor);
    doc.text(texto, x + w / 2, y, { align: 'center' });
    return w;
}

// Línea divisoria con estilo
export function divisor(doc, y, color = [209, 213, 219], pageW = 210, margin = 14) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageW - margin, y);
}

// Verificar y saltar de página
export function checkSalto(doc, y, needed, yStart = 18) {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - 25) {
        doc.addPage();
        return yStart;
    }
    return y;
}
