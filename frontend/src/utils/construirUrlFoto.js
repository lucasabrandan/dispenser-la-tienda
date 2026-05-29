const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Siempre pasa por el proxy del backend.
// El backend decide si sirve desde disco (fotos viejas) o desde R2 (fotos nuevas).
export function construirUrlFoto(nombreArchivo) {
    if (!nombreArchivo) return null;
    if (nombreArchivo.startsWith('http://') || nombreArchivo.startsWith('https://')) {
        return nombreArchivo;
    }
    return `${API_URL}/uploads/${nombreArchivo}`;
}

