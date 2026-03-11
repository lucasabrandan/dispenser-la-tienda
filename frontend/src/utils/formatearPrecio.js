/**
 * Formatea un número como precio argentino
 * 100 → "100"
 * 1000 → "1.000"
 * 1234567 → "1.234.567"
 */
export function formatearPrecio(numero) {
  if (!numero) return "0";
  
  const num = parseFloat(numero);
  
  // Redondear sin decimales
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(num);
}