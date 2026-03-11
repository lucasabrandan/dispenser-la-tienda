/**
 * Construye la URL completa para acceder a una foto desde el backend
 * El backend sirve las fotos en: /uploads/{nombreArchivo}
 */
export function construirUrlFoto(nombreArchivo) {
  if (!nombreArchivo) return null;

  if (nombreArchivo.startsWith('http://') || nombreArchivo.startsWith('https://')) {
    return nombreArchivo;
  }

  return `http://localhost:8080/uploads/${nombreArchivo}`;
}