/**
 * helpers.js — Utilidades puras de rendering para jsPDF
 */
// En dev: URL relativa → proxy CRA a localhost:8080
// En prod (Vercel): REACT_APP_API_URL apunta al backend real
// REACT_APP_API_URL termina en /api (ej: https://api.gestiondlt.com/api)
// Subimos un nivel para construir la URL de uploads
const API_BASE     = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');
const UPLOADS_BASE = `${API_BASE}/api/uploads`;

// Contador de fotos que fallaron al cargar (reseteado por cada generación de PDF)
let _fotosConError = 0;
export function resetFotosConError() { _fotosConError = 0; }
export function getFotosConError()   { return _fotosConError; }

// ── Texto ─────────────────────────────────────────────────────────────────────

// Elimina patrones internos del sistema que no deben verse en el PDF
// Ej: "| MO: $60000" es formato interno de costoExtra, ya se muestra en tabla de precios
function limpiarInterno(texto) {
    if (!texto) return '';
    return texto
        .replace(/\|\s*MO:\s*\$[\d.,]+/gi, '')
        .replace(/^\s*\|\s*/, '')
        .trim();
}

export function sanitizarTexto(texto, maxLen = 400) {
    if (!texto) return '';
    return limpiarInterno(texto)
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

// Resolución máxima para fotos en PDF (reduce tamaño y memoria significativamente)
const PDF_MAX_W = 1200;
const PDF_MAX_H = 900;

function resolverDimensiones(nw, nh) {
    let w = nw || PDF_MAX_W;
    let h = nh || PDF_MAX_H;
    if (w > PDF_MAX_W) { h = Math.round(h * PDF_MAX_W / w); w = PDF_MAX_W; }
    if (h > PDF_MAX_H) { w = Math.round(w * PDF_MAX_H / h); h = PDF_MAX_H; }
    return { w, h };
}

// Convierte cualquier blob/File a JPEG via canvas (soporta WebP, HEIC, etc.)
// Limita la resolución a PDF_MAX_W × PDF_MAX_H para no saturar memoria
async function blobAJpeg(blob) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            try {
                const { w, h } = resolverDimensiones(img.naturalWidth, img.naturalHeight);
                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                URL.revokeObjectURL(url);
                resolve({ dataUrl, w, h });
            } catch { URL.revokeObjectURL(url); resolve(null); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// Ajusta dimensiones de imagen para caber en una caja máxima manteniendo proporción
export function fitEnCaja(imgW, imgH, maxW, maxH) {
    if (!imgW || !imgH) return { w: maxW, h: maxH };
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    return { w: imgW * ratio, h: imgH * ratio };
}

export async function cargarFoto(src) {
    if (!src) return null;

    // Data URL → cargar directo en canvas sin pasar por fetch/blob.
    // fetch('data:...') puede fallar en móviles (Chrome Android) sin lanzar excepción
    // pero devolviendo un blob sin tipo MIME, lo que rompe el render en canvas.
    if (typeof src === 'string' && src.startsWith('data:')) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                try {
                    const { w, h } = resolverDimensiones(img.naturalWidth, img.naturalHeight);
                    const canvas = document.createElement('canvas');
                    canvas.width  = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve({ data: canvas.toDataURL('image/jpeg', 0.82), format: 'JPEG', w, h });
                } catch { resolve(null); }
            };
            img.onerror = () => { _fotosConError++; resolve(null); };
            img.src = src;
        });
    }

    let blob = null;

    if (src instanceof File) {
        blob = src;
    } else {
        try {
            // Filename o URL → proxy del backend (evita CORS con R2)
            const filename = typeof src === 'string' && src.startsWith('http')
                ? src.split('/').pop()
                : src;
            const res = await fetch(`${UPLOADS_BASE}/${filename}`);
            if (!res.ok) { _fotosConError++; return null; }
            blob = await res.blob();
        } catch { _fotosConError++; return null; }
    }

    if (!blob) return null;

    // Convertir siempre a JPEG via canvas (jsPDF no soporta WebP/HEIC/etc.)
    const result = await blobAJpeg(blob);
    if (!result) return null;
    return { data: result.dataUrl, format: 'JPEG', w: result.w, h: result.h };
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
