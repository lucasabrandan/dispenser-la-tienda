/**
 * Formatea un número como precio argentino (sin decimales, punto separador de miles)
 * 100 → "100"
 * 1000 → "1.000"
 * 1234567 → "1.234.567"
 */
export function formatearPrecio(numero) {
  if (!numero && numero !== 0) return "0";
  return Math.round(Number(numero)).toLocaleString('es-AR');
}

/**
 * Formato compacto para mobile (números grandes)
 * 999 → "999"
 * 1500 → "1.500"
 * 150000 → "150K"
 * 1234567 → "1,2M"
 */
export function formatearPrecioCompacto(numero) {
  if (!numero && numero !== 0) return "0";
  const n = Math.round(Number(numero));
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${signo}${(abs / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 100_000)   return `${signo}${Math.round(abs / 1000)}K`;
  return n.toLocaleString('es-AR');
}
