import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import logo from '../utils/logo.svg';

/**
 * Convierte una URL de imagen a base64 para jsPDF
 */
async function imagenABase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Genera PDF catálogo de lista de precios
 * 2 columnas, estilo minimalista profesional
 */
export async function generarPDFListaPrecios(productos) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const colGap = 6;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2; // ~90mm por columna
  const cardHeight = 72;
  const fotoDim = 38;

  // ==========================================
  // HEADER
  // ==========================================
  const headerH = 38;

  // Fondo gris claro
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.rect(0, 0, pageWidth, headerH, 'F');

  // Línea inferior sutil
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(0, headerH, pageWidth, headerH);

  // Logo — más grande y centrado verticalmente
  const logoW = 60;
  const logoH = 25;
  const logoY = (headerH - logoH) / 2;
  try {
    doc.addImage(logo, 'PNG', margin, logoY, logoW, logoH);
  } catch {
    // si falla el logo, continuar
  }

  // Fecha alineada a la derecha en texto oscuro
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - margin, headerH / 2 + 2, { align: 'right' });

  // Subtítulo "Lista de Precios"
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Lista de Precios', pageWidth - margin, headerH / 2 + 7, { align: 'right' });

  // ==========================================
  // GRILLA 2 COLUMNAS
  // ==========================================
  let col = 0; // 0 = izquierda, 1 = derecha
  let yPosition = headerH + 6;

  for (const producto of productos) {
    const costo = parseFloat(producto.costo) || 0;
    const porcGanancia = parseFloat(producto.porcentajeGanancia) || 25;
    const porcMarkup = parseFloat(producto.porcentajeMarkup) || 15;
    const gananciaUnidad = (costo * porcGanancia) / 100;
    const precioBase = costo + gananciaUnidad;
    const precioLista = precioBase * (1 + porcMarkup / 100);
    const precioFormato = `$${precioLista.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Salto de página si no entra la fila completa
    if (yPosition + cardHeight > pageHeight - 14) {
      doc.addPage();
      yPosition = 14;
    }

    const xCard = col === 0 ? margin : margin + colWidth + colGap;

    // --- CARD FONDO ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(xCard, yPosition, colWidth, cardHeight, 3, 3, 'FD');

    // --- FOTO ---
    if (producto.fotoUrl) {
      const urlFoto = construirUrlFoto(producto.fotoUrl);
      const base64 = await imagenABase64(urlFoto);
      if (base64) {
        try {
          // Fondo blanco para la foto
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(xCard + 4, yPosition + 4, fotoDim, fotoDim, 2, 2, 'F');
          doc.addImage(base64, 'JPEG', xCard + 4, yPosition + 4, fotoDim, fotoDim);
        } catch {
          // sin foto
        }
      }
    }

    const xText = xCard + fotoDim + 8;
    const textWidth = colWidth - fotoDim - 12;

    // --- SKU ---
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`SKU: ${producto.sku || '-'}`, xText, yPosition + 11);

    // --- NOMBRE ---
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    const nombreLines = doc.splitTextToSize(producto.nombre || '', textWidth);
    doc.text(nombreLines.slice(0, 2), xText, yPosition + 18);

    // --- SEPARADOR ---
    doc.setDrawColor(226, 232, 240);
    doc.line(xText, yPosition + 48, xCard + colWidth - 4, yPosition + 48);

    // --- PRECIO LISTA ---
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Precio Lista', xText, yPosition + 55);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(precioFormato, xText, yPosition + 64);

    // Avanzar columna / fila
    if (col === 0) {
      col = 1;
    } else {
      col = 0;
      yPosition += cardHeight + 5;
    }
  }

  // Si quedó una card en col izquierda sin par, bajar igual
  if (col === 1) {
    yPosition += cardHeight + 5;
  }

  // ==========================================
  // FOOTER en cada página
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249); // gris claro igual que el header
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Dispenser La Tienda', margin, pageHeight - 4);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  doc.save('lista-precios-dispenser.pdf');
}
