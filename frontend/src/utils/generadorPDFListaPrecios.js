import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import logoUrl from '../assets/logo-dispenser.png';

const DARK      = [35, 31, 32];
const RED       = [231, 76, 60];
const GOLD      = [246, 184, 26];
const WHITE     = [255, 255, 255];

async function imagenABase64(url) {
  try {
    const res  = await fetch(url);
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

/**
 * generarPDFListaPrecios
 * Mismo estilo que el remito: header negro, logo, colores de marca.
 * 2 columnas con foto, SKU, nombre y precio lista.
 */
export async function generarPDFListaPrecios(productos) {
  const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW      = doc.internal.pageSize.getWidth();
  const pageH      = doc.internal.pageSize.getHeight();
  const margin     = 12;
  const colGap     = 6;
  const colWidth   = (pageW - margin * 2 - colGap) / 2;
  const cardHeight = 76;
  const fotoDim    = 40;
  const headerH    = 36;

  const dibujarHeader = () => {
    // Fondo negro
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, headerH, 'F');
    // Franja roja
    doc.setFillColor(...RED);
    doc.rect(0, headerH - 4, pageW, 4, 'F');

    // Logo — ratio 2.3:1
    if (logoUrl) {
      try { doc.addImage(logoUrl, 'PNG', margin, 7, 46, 20); } catch { }
    }

    // Badge
    doc.setFillColor(...RED);
    doc.roundedRect(62, 13, 44, 9, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...WHITE);
    doc.text('LISTA DE PRECIOS', 84, 19, { align: 'center' });

    // Fecha
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageW - margin, 16, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Precios sujetos a variación', pageW - margin, 22, { align: 'right' });
  };

  const dibujarFooter = (pag, total) => {
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, pageH - 10, 10, 10, 'F');
    doc.setFillColor(...RED);
    doc.rect(10, pageH - 10, 18, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Dispenser La Tienda', 32, pageH - 4);
    doc.text(`Página ${pag} de ${total}`, pageW - margin, pageH - 4, { align: 'right' });
  };

  // ── Primera página ────────────────────────────────────────────────────────
  dibujarHeader();

  let col       = 0;
  let yPosition = headerH + 6;

  for (const producto of productos) {
    const costo         = parseFloat(producto.costo) || 0;
    const porcGanancia  = parseFloat(producto.porcentajeGanancia) || 25;
    const porcMarkup    = parseFloat(producto.porcentajeMarkup)   || 15;
    const ganancia      = (costo * porcGanancia) / 100;
    const precioBase    = costo + ganancia;
    const precioLista   = precioBase * (1 + porcMarkup / 100);
    const precioFormato = `$${precioLista.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Nueva página si no entra
    if (yPosition + cardHeight > pageH - 14) {
      doc.addPage();
      dibujarHeader();
      yPosition = headerH + 6;
      col = 0;
    }

    const xCard = col === 0 ? margin : margin + colWidth + colGap;

    // ── CARD ─────────────────────────────────────────────────────────────────
    // Fondo blanco con borde
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(xCard, yPosition, colWidth, cardHeight, 3, 3, 'FD');

    // Acento rojo izquierdo
    doc.setFillColor(...RED);
    doc.rect(xCard, yPosition, 3, cardHeight, 'F');

    // ── FOTO ──────────────────────────────────────────────────────────────────
    if (producto.fotoUrl) {
      const urlFoto = construirUrlFoto(producto.fotoUrl);
      const base64  = await imagenABase64(urlFoto);
      if (base64) {
        try {
          doc.setFillColor(248, 248, 248);
          doc.roundedRect(xCard + 5, yPosition + 4, fotoDim, fotoDim, 2, 2, 'F');
          doc.addImage(base64, 'JPEG', xCard + 5, yPosition + 4, fotoDim, fotoDim);
        } catch { }
      }
    } else {
      // Placeholder foto
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(xCard + 5, yPosition + 4, fotoDim, fotoDim, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text('SIN FOTO', xCard + 5 + fotoDim / 2, yPosition + 4 + fotoDim / 2 + 2, { align: 'center' });
    }

    const xText    = xCard + fotoDim + 9;
    const textW    = colWidth - fotoDim - 14;

    // ── SKU ────────────────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text(`SKU: ${producto.sku || '—'}`, xText, yPosition + 10);

    // ── NOMBRE ────────────────────────────────────────────────────────────
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    const nombreLines = doc.splitTextToSize(producto.nombre || '', textW);
    doc.text(nombreLines.slice(0, 2), xText, yPosition + 17);

    // ── SEPARADOR ─────────────────────────────────────────────────────────
    doc.setDrawColor(220, 220, 220);
    doc.line(xText, yPosition + 50, xCard + colWidth - 4, yPosition + 50);

    // ── PRECIO ────────────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Precio lista', xText, yPosition + 57);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(precioFormato, xText, yPosition + 68);

    // Avanzar
    if (col === 0) { col = 1; }
    else { col = 0; yPosition += cardHeight + 5; }
  }

  if (col === 1) yPosition += cardHeight + 5;

  // ── Footer en todas las páginas ───────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    dibujarFooter(i, totalPages);
  }

  doc.save('lista-precios-dispenser.pdf');
}