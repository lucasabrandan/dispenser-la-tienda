import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import { DARK, RED, GOLD, GRAY_TEXT, WARM_BORDER, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';

// Descarga la imagen y la reescala a maxPx usando canvas
async function imagenComprimida(url, maxPx = 150) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, maxPx / Math.max(img.width || 1, img.height || 1));
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                URL.revokeObjectURL(blobUrl);
                resolve(compressed);
            };
            img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
            img.src = blobUrl;
        });
    } catch { return null; }
}

// Carga todas las fotos disponibles de un producto
async function cargarFotos(producto) {
    const urls = [producto.fotoUrl, producto.fotoUrl2, producto.fotoUrl3]
        .filter(Boolean)
        .map(u => construirUrlFoto(u));
    const fotos = await Promise.all(urls.map(u => imagenComprimida(u, 200)));
    return fotos.filter(Boolean);
}

const fmt = (v) => {
    const n = parseFloat(v);
    return n > 0 ? `$${Math.round(n).toLocaleString('es-AR')}` : '';
};

/**
 * generarPDFListaPrecios
 * 1 columna, foto(s) izquierda, info centro, precios derecha
 * @param {Array}  productos
 * @param {number} descuentoEfectivo — % descuento pago en efectivo (ej: 10)
 */
export async function generarPDFListaPrecios(productos, descuentoEfectivo = 0) {
    const doc          = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW        = doc.internal.pageSize.getWidth();
    const pageH        = doc.internal.pageSize.getHeight();
    const margin       = 12;
    const headerH      = 48;
    const cardH        = 44;
    const cardGap      = 3;
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

        const precioNegro    = parseFloat(producto.precio) || 0;
        const netoCliente    = parseFloat(producto.precioNetoCliente) || 0;
        const precioFact     = parseFloat(producto.precioFacturado) || 0;
        const precioLista    = parseFloat(producto.precioLista) || precioNegro;
        const precioEfectivo = tieneEfectivo
            ? Math.round(precioLista * (1 - descuentoEfectivo / 100))
            : null;

        // Card fondo
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...WARM_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, pageW - margin * 2, cardH, 3, 3, 'FD');

        // Acento rojo izquierdo
        doc.setFillColor(...RED);
        doc.rect(margin, y, 3, cardH, 'F');

        // Fotos (hasta 3 miniaturas)
        const fotos = await cargarFotos(producto);
        const fotoX = margin + 6;
        const numFotos = Math.max(1, fotos.length);
        // Si hay 1 foto: 30×30. Si hay 2-3: distribuir en el espacio
        const fotoTotalW = 30;
        const fotoGap = 1.5;

        if (fotos.length <= 1) {
            const fotoDim = 30;
            const fotoY = y + (cardH - fotoDim) / 2;
            if (fotos[0]) {
                doc.setFillColor(248, 248, 248);
                doc.rect(fotoX, fotoY, fotoDim, fotoDim, 'F');
                try { doc.addImage(fotos[0], 'JPEG', fotoX, fotoY, fotoDim, fotoDim); } catch {}
            } else {
                doc.setFillColor(240, 240, 240);
                doc.rect(fotoX, fotoY, fotoDim, fotoDim, 'F');
                doc.setFontSize(6);
                doc.setTextColor(180, 180, 180);
                doc.text('SIN FOTO', fotoX + fotoDim / 2, fotoY + fotoDim / 2 + 2, { align: 'center' });
            }
        } else {
            // Multi-foto: miniaturas apiladas verticalmente
            const miniH = (30 - (numFotos - 1) * fotoGap) / numFotos;
            const miniW = fotoTotalW;
            for (let f = 0; f < numFotos; f++) {
                const fY = y + (cardH - 30) / 2 + f * (miniH + fotoGap);
                doc.setFillColor(248, 248, 248);
                doc.rect(fotoX, fY, miniW, miniH, 'F');
                if (fotos[f]) {
                    try { doc.addImage(fotos[f], 'JPEG', fotoX, fY, miniW, miniH); } catch {}
                }
            }
        }

        // Separador vertical
        doc.setDrawColor(230, 230, 230);
        doc.line(fotoX + fotoTotalW + 4, y + 4, fotoX + fotoTotalW + 4, y + cardH - 4);

        // Columna texto (izquierda-centro)
        const precioColW = 50;
        const xText = fotoX + fotoTotalW + 8;
        const textW = pageW - margin * 2 - fotoTotalW - 20 - precioColW;

        // SKU
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...RED);
        doc.text(`SKU: ${producto.sku || '—'}`, xText, y + 9);

        // Nombre (hasta 2 lineas)
        doc.setFontSize(9.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...DARK);
        const nombreLines = doc.splitTextToSize(producto.nombre || '', textW);
        doc.text(nombreLines.slice(0, 2), xText, y + 16);

        // Descripcion
        const descTxt = (producto.descripcion || '').trim();
        if (descTxt) {
            const descY = y + 16 + nombreLines.slice(0, 2).length * 4.5;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY_TEXT);
            const descLines = doc.splitTextToSize(descTxt, textW);
            doc.text(descLines.slice(0, 2), xText, descY);
        }

        // Columna precios (derecha)
        const xPrecio = pageW - margin - 4;
        let precioY = y + 8;

        // Precio efectivo / lista
        if (precioNegro > 0) {
            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GRAY_TEXT);
            doc.text('EFECTIVO', xPrecio, precioY, { align: 'right' });
            precioY += 6;

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(16, 120, 60);
            doc.text(fmt(precioNegro), xPrecio, precioY, { align: 'right' });
            precioY += 5;
        }

        // Precio facturado
        if (netoCliente > 0) {
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(xPrecio - precioColW + 4, precioY, xPrecio, precioY);
            precioY += 4;

            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 64, 175);
            doc.text('FACTURADO', xPrecio, precioY, { align: 'right' });
            precioY += 5;

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 64, 175);
            doc.text(`${fmt(netoCliente)} + IVA`, xPrecio, precioY, { align: 'right' });
            precioY += 5;
        }

        // Precio efectivo con descuento
        if (tieneEfectivo && precioLista > 0) {
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.2);
            doc.line(xPrecio - precioColW + 4, precioY, xPrecio, precioY);
            precioY += 4;

            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...GOLD);
            doc.text(`CONTADO -${descuentoEfectivo}%`, xPrecio, precioY, { align: 'right' });
            precioY += 5;

            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...RED);
            doc.text(`${fmt(precioEfectivo)}`, xPrecio, precioY, { align: 'right' });
        }

        y += cardH + cardGap;
    }

    // Footer en todas las paginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarFooter(i, totalPages);
    }

    doc.save('lista-precios-dispenser.pdf');
}
