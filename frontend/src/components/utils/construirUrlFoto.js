// URL base del backend — misma IP que usa la API
const BACKEND_URL = 'http://100.72.16.36:8080';

/**
 * Construye la URL completa para acceder a una foto desde el backend.
 * Funciona tanto en localhost como desde el celular por Tailscale.
 */
export function construirUrlFoto(nombreArchivo) {
  if (!nombreArchivo) return null;

  if (nombreArchivo.startsWith('http://') || nombreArchivo.startsWith('https://')) {
    return nombreArchivo;
  }

  return `${BACKEND_URL}/uploads/${nombreArchivo}`;
}
