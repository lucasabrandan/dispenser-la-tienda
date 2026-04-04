import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import { DARK, RED, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';

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
 * generarPDFListaPrecios — Opción B
 * 1 columna · foto al costado izquierdo · precio a la derecha · ~6 por hoja
 */
export async function generarPDFListaPrecios(productos) {
  const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const margin  = 12;
  const headerH = 36;
  const cardH   = 36;      // altura de cada card
  const cardGap = 4;       // espacio entre cards
  const fotoDim = 28;      // foto cuadrada

  const fecha = new Date().toLocaleDateString('es-AR');
  const dibujarHeader = () => dibujarHeaderPDF(doc, 'LISTA DE PRECIOS', fecha, 'Precios sujetos a variación');
  const dibujarFooter = (pag, total) => dibujarFooterPDF(doc, pag, total);

  // ── Primera página ────────────────────────────────────────────────────────
  dibujarHeader();
  let y = headerH + 6;

  for (const producto of productos) {
    // Nueva página si no entra
    if (y + cardH > pageH - 14) {
      doc.addPage();
      dibujarHeader();
      y = headerH + 6;
    }

    const costo        = parseFloat(producto.costo) || 0;
    const porcGanancia = parseFloat(producto.porcentajeGanancia) || 25;
    const porcMarkup   = parseFloat(producto.porcentajeMarkup)   || 15;
    const precioLista  = (costo * (1 + porcGanancia / 100)) * (1 + porcMarkup / 100);
    const precioFormato = `$${Math.round(precioLista).toLocaleString('es-AR')}`;

    // ── CARD ─────────────────────────────────────────────────────────────────
    // Fondo blanco con borde
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 3, 3, 'FD');

    // Acento rojo izquierdo
    doc.setFillColor(...RED);
    doc.rect(margin, y, 3, cardH, 'F');

    // ── FOTO ──────────────────────────────────────────────────────────────────
    const fotoX = margin + 6;
    const fotoY = y + (cardH - fotoDim) / 2;

    if (producto.fotoUrl) {
      const urlFoto = construirUrlFoto(producto.fotoUrl);
      const base64  = await imagenABase64(urlFoto);
      if (base64) {
        try {
          doc.setFillColor(248, 248, 248);
          doc.roundedRect(fotoX, fotoY, fotoDim, fotoDim, 2, 2, 'F');
          doc.addImage(base64, 'JPEG', fotoX, fotoY, fotoDim, fotoDim);
        } catch { }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(fotoX, fotoY, fotoDim, fotoDim, 2, 2, 'F');
      }
    } else {
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(fotoX, fotoY, fotoDim, fotoDim, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text('SIN FOTO', fotoX + fotoDim / 2, fotoY + fotoDim / 2 + 2, { align: 'center' });
    }

    // ── SEPARADOR VERTICAL ────────────────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.line(margin + 6 + fotoDim + 4, y + 4, margin + 6 + fotoDim + 4, y + cardH - 4);

    // ── TEXTO ─────────────────────────────────────────────────────────────────
    const xText  = margin + 6 + fotoDim + 8;
    const textW  = pageW - margin * 2 - fotoDim - 28 - 38; // dejar espacio para precio

    // SKU
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...RED);
    doc.text(`SKU: ${producto.sku || '—'}`, xText, y + 10);

    // Nombre
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    const nombreLines = doc.splitTextToSize(producto.nombre || '', textW);
    doc.text(nombreLines.slice(0, 1), xText, y + 17);

    // Descripción
    if (producto.descripcion) {
      doc.setFontSize(7.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(120, 120, 120);
      const descLines = doc.splitTextToSize(producto.descripcion, textW);
      doc.text(descLines.slice(0, 2), xText, y + 23);
    }

    // ── PRECIO (derecha) ──────────────────────────────────────────────────────
    const xPrecio = pageW - margin - 4;

    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Precio lista', xPrecio, y + 13, { align: 'right' });

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...DARK);
    doc.text(precioFormato, xPrecio, y + 23, { align: 'right' });

    y += cardH + cardGap;
  }

  // ── Footer en todas las páginas ───────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    dibujarFooter(i, totalPages);
  }

  doc.save('lista-precios-dispenser.pdf');
}