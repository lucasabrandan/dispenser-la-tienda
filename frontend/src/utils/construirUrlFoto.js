const API_URL   = process.env.REACT_APP_API_URL    || 'http://localhost:8080/api';
const R2_URL    = process.env.REACT_APP_R2_PUBLIC_URL || '';

// Detecta si un filename ya está en R2 (tiene prefijo UUID v4)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

export function construirUrlFoto(nombreArchivo) {
    if (!nombreArchivo) return null;
    if (nombreArchivo.startsWith('http://') || nombreArchivo.startsWith('https://')) {
        return nombreArchivo;
    }
    // Archivos nuevos van directo a R2 (no pasan por el backend)
    if (R2_URL && UUID_RE.test(nombreArchivo)) {
        return `${R2_URL}/${nombreArchivo}`;
    }
    // Archivos viejos siguen usando el endpoint del backend
    return `${API_URL}/uploads/${nombreArchivo}`;
}

export async function fotoUrlABase64(filename) {
    const url = construirUrlFoto(filename);
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror  = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}
