import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import { DARK, RED, GOLD, GRAY_TEXT, WARM_BORDER, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';

// Descarga imagen, comprime y devuelve { data, w, h } con dimensiones reales
async function cargarImagen(url, maxPx = 500) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const naturalW = img.width;
                const naturalH = img.height;
                const ratio = Math.min(1, maxPx / Math.max(naturalW, naturalH));
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(naturalW * ratio);
                canvas.height = Math.round(naturalH * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                const data = canvas.toDataURL('image/jpeg', 0.85);
                URL.revokeObjectURL(blobUrl);
                resolve({ data, w: naturalW, h: naturalH });
            };
            img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
            img.src = blobUrl;
        });
    } catch { return null; }
}

// Carga todas las fotos de un producto (hasta 3)
async function cargarFotosProducto(producto) {
    const urls = [producto.fotoUrl, producto.fotoUrl2, producto.fotoUrl3]
        .filter(Boolean)
        .map(u => construirUrlFoto(u));
    const fotos = await Promise.all(urls.map(u => cargarImagen(u, 500)));
    return fotos.filter(Boolean);
}

// Dibuja imagen centrada dentro de un box sin deformar (object-fit: contain)
function dibujarImagenContenida(doc, img, boxX, boxY, boxW, boxH) {
    const imgRatio = img.w / img.h;
    const boxRatio = boxW / boxH;

    let drawW, drawH;
    if (imgRatio > boxRatio) {
        // Imagen mas ancha que el box: ajustar por ancho
        drawW = boxW;
        drawH = boxW / imgRatio;
    } else {
        // Imagen mas alta que el box: ajustar por alto
        drawH = boxH;
        drawW = boxH * imgRatio;
    }

    // Centrar dentro del box
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH) / 2;

    try {
        doc.addImage(img.data, 'JPEG', drawX, drawY, drawW, drawH);
    } catch { /* imagen corrupta, ignorar */ }
}

const fmt = (v) => {
    const n = parseFloat(v);
    return n > 0 ? `$${Math.round(n).toLocaleString('es-AR')}` : '';
};

/**
 * generarPDFCatalogo
 * 2 productos por pagina, fotos grandes sin deformar, precios completos
 */
export async function generarPDFCatalogo(productos) {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 12;
    const headerH = 48;
    const footerH = 18;
    const contentW = pageW - margin * 2;

    // Cada producto ocupa la mitad de la pagina util
    const slotH = (pageH - headerH - footerH - 6) / 2; // ~108mm
    const infoH = 28; // espacio para texto/precios debajo de fotos
    const fotoH = slotH - infoH - 6; // ~74mm para fotos
    const fotoGap = 3;

    const fecha = new Date().toLocaleDateString('es-AR');

    let paginaNum = 0;
    const nuevaPagina = () => {
        if (paginaNum > 0) doc.addPage();
        paginaNum++;
        dibujarHeaderPDF(doc, 'CATALOGO DE PRODUCTOS', fecha, 'Precios sujetos a modificacion');
    };

    for (let i = 0; i < productos.length; i += 2) {
        nuevaPagina();

        for (let j = 0; j < 2 && (i + j) < productos.length; j++) {
            const producto = productos[i + j];
            const baseY = headerH + j * (slotH + 6);

            const fotos = await cargarFotosProducto(producto);

            // ── Card fondo ──
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...WARM_BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, baseY, contentW, slotH, 3, 3, 'FD');

            // Acento rojo superior
            doc.setFillColor(...RED);
            doc.rect(margin, baseY, contentW, 2, 'F');

            // ── Fotos ──
            const fotoY = baseY + 4;
            const numSlots = Math.max(1, fotos.length);

            // Calcular ancho de cada slot de foto
            const totalGaps = (numSlots - 1) * fotoGap;
            const slotW = (contentW - 4 - totalGaps) / numSlots;

            for (let f = 0; f < numSlots; f++) {
                const fX = margin + 2 + f * (slotW + fotoGap);

                // Fondo gris claro del slot
                doc.setFillColor(248, 246, 244);
                doc.roundedRect(fX, fotoY, slotW, fotoH, 2, 2, 'F');

                if (fotos[f]) {
                    dibujarImagenContenida(doc, fotos[f], fX, fotoY, slotW, fotoH);
                } else {
                    doc.setFontSize(8);
                    doc.setTextColor(180, 180, 180);
                    doc.text('SIN FOTO', fX + slotW / 2, fotoY + fotoH / 2 + 2, { align: 'center' });
                }
            }

            // ── Info debajo de fotos ──
            const infoY = fotoY + fotoH + 4;

            // SKU
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...RED);
            doc.text(`SKU: ${producto.sku || '—'}`, margin + 4, infoY);

            // Nombre
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            const nombreLines = doc.splitTextToSize(producto.nombre || '', contentW * 0.55);
            doc.text(nombreLines.slice(0, 1), margin + 4, infoY + 6);

            // Descripcion
            if (producto.descripcion) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...GRAY_TEXT);
                const descLines = doc.splitTextToSize(producto.descripcion, contentW * 0.5);
                doc.text(descLines.slice(0, 2), margin + 4, infoY + 12);
            }

            // ── Precios (columna derecha) ──
            const precioX = pageW - margin - 4;
            const precioNegro = parseFloat(producto.precio) || 0;
            const netoCliente = parseFloat(producto.precioNetoCliente) || 0;
            const precioCant  = parseFloat(producto.precioCantidad) || 0;
            const cantMin     = parseInt(producto.cantidadMinima) || 0;

            // Precio efectivo
            if (precioNegro > 0) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('EFECTIVO', precioX, infoY, { align: 'right' });

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(16, 120, 60);
                doc.text(fmt(precioNegro), precioX, infoY + 7, { align: 'right' });
            }

            // Precio facturado (neto + IVA)
            if (netoCliente > 0) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text('FACTURADO', precioX, infoY + 13, { align: 'right' });

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 64, 175);
                doc.text(`${fmt(netoCliente)} + IVA`, precioX, infoY + 19, { align: 'right' });
            }

            // Precio por cantidad
            if (precioCant > 0 && cantMin > 0) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...GOLD);
                doc.text(`Desde ${cantMin} unid: ${fmt(precioCant)} c/u`, precioX, infoY + 25, { align: 'right' });
            }
        }
    }

    // Footer en todas las paginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarFooterPDF(doc, i, totalPages);
    }

    doc.save('catalogo-productos-dispenser.pdf');
}
