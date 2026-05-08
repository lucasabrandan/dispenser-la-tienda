import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import { DARK, RED, GOLD, GRAY_TEXT, WARM_BORDER, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';

async function imagenABase64(url) {
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

/**
 * generarPDFListaPrecios
 * 1 columna · foto izquierda · info centro · precios derecha (~5 por hoja)
 * @param {Array}  productos
 * @param {number} descuentoEfectivo — % descuento pago en efectivo (ej: 10)
 */
export async function generarPDFListaPrecios(productos, descuentoEfectivo = 0) {
    const doc          = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW        = doc.internal.pageSize.getWidth();
    const pageH        = doc.internal.pageSize.getHeight();
    const margin       = 12;
    const headerH      = 48;
    const cardH        = 40;   // más alto para descripción + precio efectivo
    const cardGap      = 3;
    const fotoDim      = 30;
    const footerMargin = 18;
    const tieneEfectivo = descuentoEfectivo > 0;

    const fecha = new Date().toLocaleDateString('es-AR');
    const dibujarHeader = () => dibujarHeaderPDF(doc, 'LISTA DE PRECIOS', fecha, 'Precios sujetos a variacion');
    const dibujarFooter = (pag, total) => dibujarFooterPDF(doc, pag, total);

    dibujarHeader();
    let y = headerH;

    for (const producto of productos) {
        if (y + cardH > pageH - footerMargin) {
            doc.addPage();
            dibujarHeader();
            y = headerH;
        }

        const costo        = parseFloat(producto.costo)             || 0;
        const porcGanancia = parseFloat(producto.porcentajeGanancia) || 25;
        const porcMarkup   = parseFloat(producto.porcentajeMarkup)   || 15;
        const precioLista  = producto.precioLista
            ? parseFloat(producto.precioLista)
            : (costo * (1 + porcGanancia / 100)) * (1 + porcMarkup / 100);
        const precioEfectivo = tieneEfectivo
            ? Math.round(precioLista * (1 - descuentoEfectivo / 100))
            : null;

        // ── Card fondo ────────────────────────────────────────────────────────
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...WARM_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, pageW - margin * 2, cardH, 3, 3, 'FD');

        // Acento rojo izquierdo
        doc.setFillColor(...RED);
        doc.rect(margin, y, 3, cardH, 'F');

        // ── Foto ─────────────────────────────────────────────────────────────
        const fotoX = margin + 6;
        const fotoY = y + (cardH - fotoDim) / 2;

        if (producto.fotoUrl) {
            const urlFoto = construirUrlFoto(producto.fotoUrl);
            const base64  = await imagenABase64(urlFoto);
            if (base64) {
                try {
                    doc.setFillColor(248, 248, 248);
                    doc.rect(fotoX, fotoY, fotoDim, fotoDim, 'F');
                    doc.addImage(base64, 'JPEG', fotoX, fotoY, fotoDim, fotoDim);
                } catch {}
            } else {
                doc.setFillColor(240, 240, 240);
                doc.rect(fotoX, fotoY, fotoDim, fotoDim, 'F');
            }
        } else {
            doc.setFillColor(240, 240, 240);
            doc.rect(fotoX, fotoY, fotoDim, fotoDim, 'F');
            doc.setFontSize(6);
            doc.setTextColor(180, 180, 180);
            doc.text('SIN FOTO', fotoX + fotoDim / 2, fotoY + fotoDim / 2 + 2, { align: 'center' });
        }

        // Separador vertical
        doc.setDrawColor(230, 230, 230);
        doc.line(fotoX + fotoDim + 4, y + 4, fotoX + fotoDim + 4, y + cardH - 4);

        // ── Columna texto (izquierda-centro) ─────────────────────────────────
        // Ancho: desde texto hasta columna de precios
        const precioColW = tieneEfectivo ? 46 : 34;
        const xText = fotoX + fotoDim + 8;
        const textW = pageW - margin * 2 - fotoDim - 20 - precioColW;

        // SKU
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(`SKU: ${producto.sku || '—'}`, xText, y + 9);

        // Nombre (hasta 2 líneas)
        doc.setFontSize(9.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        const nombreLines = doc.splitTextToSize(producto.nombre || '', textW);
        doc.text(nombreLines.slice(0, 2), xText, y + 16);

        // Descripción (hasta 2 líneas, solo si hay espacio)
        if (producto.descripcion) {
            const descY = y + 16 + nombreLines.slice(0, 2).length * 4.5;
            doc.setFontSize(7.5);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...GRAY_TEXT);
            const descLines = doc.splitTextToSize(producto.descripcion, textW);
            doc.text(descLines.slice(0, 2), xText, descY);
        }

        // ── Columna precios (derecha) ─────────────────────────────────────────
        const xPrecio = pageW - margin - 4;

        // Precio lista
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Precio lista', xPrecio, y + (tieneEfectivo ? 11 : 15), { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        doc.text(`$${Math.round(precioLista).toLocaleString('es-AR')}`, xPrecio, y + (tieneEfectivo ? 19 : 25), { align: 'right' });

        // Precio efectivo
        if (tieneEfectivo) {
            // Separador
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(xPrecio - precioColW + 4, y + 22, xPrecio, y + 22);

            doc.setFontSize(6.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GOLD);
            doc.text(`Efectivo -${descuentoEfectivo}%`, xPrecio, y + 27, { align: 'right' });

            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...RED);
            doc.text(`$${precioEfectivo.toLocaleString('es-AR')}`, xPrecio, y + 36, { align: 'right' });
        }

        y += cardH + cardGap;
    }

    // Footer en todas las páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarFooter(i, totalPages);
    }

    doc.save('lista-precios-dispenser.pdf');
}
