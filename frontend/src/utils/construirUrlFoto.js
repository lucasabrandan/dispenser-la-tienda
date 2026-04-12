// URL base del backend — misma que usa la API (incluye /api)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Construye la URL completa para acceder a una foto desde el backend.
 * Funciona tanto en localhost como desde el celular por Tailscale.
 */
export function construirUrlFoto(nombreArchivo) {
  if (!nombreArchivo) return null;
  if (nombreArchivo.startsWith('http://') || nombreArchivo.startsWith('https://')) {
    return nombreArchivo;
  }
  return `${API_URL}/uploads/${nombreArchivo}`;
}

/**
 * Descarga una foto del backend por filename y la convierte a base64.
 * Usada para embeber fotos en PDFs generados desde servicios guardados.
 */
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
