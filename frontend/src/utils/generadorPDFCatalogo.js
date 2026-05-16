import jsPDF from 'jspdf';
import { construirUrlFoto } from './construirUrlFoto';
import { DARK, RED, GOLD, GRAY_TEXT, GRAY_LIGHT, WARM_BORDER, WHITE, dibujarHeaderPDF, dibujarFooterPDF } from './pdfTheme';

// ── Helpers de imagen ────────────────────────────────────────────────────────

async function cargarImagen(url, maxPx = 600) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                const data = canvas.toDataURL('image/jpeg', 0.85);
                URL.revokeObjectURL(blobUrl);
                resolve({ data, w: img.width, h: img.height });
            };
            img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
            img.src = blobUrl;
        });
    } catch { return null; }
}

async function cargarFotosProducto(producto) {
    const urls = [producto.fotoUrl, producto.fotoUrl2, producto.fotoUrl3]
        .filter(Boolean)
        .map(u => construirUrlFoto(u));
    const fotos = await Promise.all(urls.map(u => cargarImagen(u, 600)));
    return fotos.filter(Boolean);
}

// Dibuja imagen centrada sin deformar (object-fit: contain)
function dibujarImg(doc, img, bx, by, bw, bh) {
    const ir = img.w / img.h;
    const br = bw / bh;
    let dw, dh;
    if (ir > br) { dw = bw; dh = bw / ir; }
    else         { dh = bh; dw = bh * ir; }
    try {
        doc.addImage(img.data, 'JPEG', bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
    } catch {}
}

// Fondo gris para slot de foto
function fondoSlot(doc, x, y, w, h) {
    doc.setFillColor(248, 246, 244);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
}

// Badge con fondo redondeado
function badge(doc, text, x, y, w, h, bgColor, textColor, fontSize = 7) {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(text, x + w / 2, y + h / 2 + fontSize * 0.12, { align: 'center' });
}

const fmt = (v) => {
    const n = parseFloat(v);
    return n > 0 ? `$${Math.round(n).toLocaleString('es-AR')}` : '';
};

// ── Layouts de fotos ─────────────────────────────────────────────────────────

// 1 foto: hero full width
function layoutFoto1(doc, fotos, x, y, w, h) {
    fondoSlot(doc, x, y, w, h);
    if (fotos[0]) dibujarImg(doc, fotos[0], x, y, w, h);
    else {
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text('SIN FOTO', x + w / 2, y + h / 2 + 3, { align: 'center' });
    }
}

// 2 fotos: grande izquierda (65%) + chica derecha (35%)
function layoutFoto2(doc, fotos, x, y, w, h) {
    const gap = 3;
    const wGrande = w * 0.63;
    const wChica  = w - wGrande - gap;

    fondoSlot(doc, x, y, wGrande, h);
    if (fotos[0]) dibujarImg(doc, fotos[0], x, y, wGrande, h);

    fondoSlot(doc, x + wGrande + gap, y, wChica, h);
    if (fotos[1]) dibujarImg(doc, fotos[1], x + wGrande + gap, y, wChica, h);
}

// 3 fotos: 1 grande arriba + 2 chicas abajo (galeria)
function layoutFoto3(doc, fotos, x, y, w, h) {
    const gap = 3;
    const hGrande = h * 0.6;
    const hChica  = h - hGrande - gap;
    const wChica  = (w - gap) / 2;

    // Grande arriba
    fondoSlot(doc, x, y, w, hGrande);
    if (fotos[0]) dibujarImg(doc, fotos[0], x, y, w, hGrande);

    // Chica izquierda abajo
    fondoSlot(doc, x, y + hGrande + gap, wChica, hChica);
    if (fotos[1]) dibujarImg(doc, fotos[1], x, y + hGrande + gap, wChica, hChica);

    // Chica derecha abajo
    fondoSlot(doc, x + wChica + gap, y + hGrande + gap, wChica, hChica);
    if (fotos[2]) dibujarImg(doc, fotos[2], x + wChica + gap, y + hGrande + gap, wChica, hChica);
}

// ── Bloque de precios con badges ─────────────────────────────────────────────

function dibujarPrecios(doc, producto, x, y, w) {
    const precioNegro = parseFloat(producto.precio) || parseFloat(producto.precioLista) || 0;
    const netoCliente = parseFloat(producto.precioNetoCliente) || 0;
    const precioFact  = parseFloat(producto.precioFacturado) || 0;
    const precioCant  = parseFloat(producto.precioCantidad) || 0;
    const cantMin     = parseInt(producto.cantidadMinima) || 0;
    const cuotas3pct  = parseFloat(producto.porcentajeCuotas3) || 0;
    const cuotas6pct  = parseFloat(producto.porcentajeCuotas6) || 0;

    let cy = y;
    const badgeW = w;
    const badgeH = 14;
    const gap = 3;

    // Precio efectivo (negro) — badge verde
    if (precioNegro > 0) {
        doc.setFillColor(240, 253, 244); // green-50
        doc.roundedRect(x, cy, badgeW, badgeH, 3, 3, 'F');
        doc.setFillColor(220, 252, 231); // green-100
        doc.roundedRect(x, cy, badgeW, 5, 3, 3, 'F');
        doc.rect(x, cy + 2.5, badgeW, 2.5, 'F'); // tapar bordes inferiores del mini header

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52); // green-800
        doc.text('EFECTIVO', x + badgeW / 2, cy + 3.5, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text(fmt(precioNegro), x + badgeW / 2, cy + 11, { align: 'center' });
        cy += badgeH + gap;
    }

    // Precio facturado — badge azul
    if (netoCliente > 0) {
        doc.setFillColor(239, 246, 255); // blue-50
        doc.roundedRect(x, cy, badgeW, badgeH + 3, 3, 3, 'F');
        doc.setFillColor(219, 234, 254); // blue-100
        doc.roundedRect(x, cy, badgeW, 5, 3, 3, 'F');
        doc.rect(x, cy + 2.5, badgeW, 2.5, 'F');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175); // blue-800
        doc.text('FACTURADO', x + badgeW / 2, cy + 3.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(`${fmt(netoCliente)} + IVA`, x + badgeW / 2, cy + 10.5, { align: 'center' });

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Total: ${fmt(precioFact)}`, x + badgeW / 2, cy + 15, { align: 'center' });
        cy += badgeH + 3 + gap;
    }

    // Precio por cantidad — badge dorado
    if (precioCant > 0 && cantMin > 0) {
        doc.setFillColor(255, 251, 235); // amber-50
        doc.roundedRect(x, cy, badgeW, badgeH, 3, 3, 'F');
        doc.setFillColor(254, 243, 199); // amber-100
        doc.roundedRect(x, cy, badgeW, 5, 3, 3, 'F');
        doc.rect(x, cy + 2.5, badgeW, 2.5, 'F');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14); // amber-800
        doc.text(`DESDE ${cantMin} UNID.`, x + badgeW / 2, cy + 3.5, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text(`${fmt(precioCant)} c/u`, x + badgeW / 2, cy + 11, { align: 'center' });
        cy += badgeH + gap;
    }

    // Cuotas — badge violeta compacto
    if (precioFact > 0 && (cuotas3pct > 0 || cuotas6pct > 0)) {
        doc.setFillColor(250, 245, 255); // purple-50
        doc.roundedRect(x, cy, badgeW, 10, 3, 3, 'F');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 33, 168); // purple-800

        const partes = [];
        if (cuotas3pct > 0) {
            const val3 = precioFact * (1 + cuotas3pct / 100);
            partes.push(`3x ${fmt(Math.round(val3 / 3))}`);
        }
        if (cuotas6pct > 0) {
            const val6 = precioFact * (1 + cuotas6pct / 100);
            partes.push(`6x ${fmt(Math.round(val6 / 6))}`);
        }
        doc.text(partes.join('  |  '), x + badgeW / 2, cy + 6.5, { align: 'center' });
    }
}

// ── Generador principal ──────────────────────────────────────────────────────

/**
 * generarPDFCatalogo
 * Layout dinamico: multi-foto → 1 por pagina, 1 foto → 2 por pagina
 * Fotos inteligentes, badges de precios, numeracion de producto
 */
export async function generarPDFCatalogo(productos) {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 12;
    const headerH = 48;
    const footerH = 18;
    const contentW = pageW - margin * 2;
    const usableH = pageH - headerH - footerH;

    const fecha = new Date().toLocaleDateString('es-AR');

    let paginaNum = 0;
    const nuevaPagina = () => {
        if (paginaNum > 0) doc.addPage();
        paginaNum++;
        dibujarHeaderPDF(doc, 'CATALOGO DE PRODUCTOS', fecha, 'Precios sujetos a modificacion sin previo aviso');
    };

    // Pre-cargar todas las fotos para saber cuantas tiene cada producto
    const fotosMap = [];
    for (const p of productos) {
        fotosMap.push(await cargarFotosProducto(p));
    }

    // Agrupar: productos con multi-foto van solos, con 1 foto se agrupan de a 2
    let idx = 0;
    let productoNum = 0;

    while (idx < productos.length) {
        const fotos = fotosMap[idx];
        const esMultiFoto = fotos.length > 1;
        const tieneDescLarga = (productos[idx].descripcion || '').length > 80;
        const ocupaPaginaCompleta = esMultiFoto || tieneDescLarga;

        if (ocupaPaginaCompleta) {
            // ── 1 producto por pagina (layout grande) ──
            nuevaPagina();
            productoNum++;
            dibujarProductoGrande(doc, productos[idx], fotos, productoNum, margin, headerH, contentW, usableH, pageW);
            idx++;
        } else {
            // ── 2 productos por pagina (layout compacto) ──
            nuevaPagina();
            const slotH = (usableH - 6) / 2;

            // Producto 1
            productoNum++;
            dibujarProductoCompacto(doc, productos[idx], fotos, productoNum, margin, headerH, contentW, slotH, pageW);
            idx++;

            // Producto 2 (si hay)
            if (idx < productos.length && fotosMap[idx].length <= 1 && (productos[idx].descripcion || '').length <= 80) {
                productoNum++;
                dibujarProductoCompacto(doc, productos[idx], fotosMap[idx], productoNum, margin, headerH + slotH + 6, contentW, slotH, pageW);
                idx++;
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

// ── Layout grande: 1 producto por pagina ─────────────────────────────────────

function dibujarProductoGrande(doc, producto, fotos, num, margin, baseY, contentW, usableH, pageW) {
    const pad = 4;
    const precioW = 48;
    const infoW = contentW - precioW - pad * 2;
    const fotoH = usableH * 0.6;
    const infoY = baseY + fotoH + 6;

    // Card fondo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...WARM_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, baseY, contentW, usableH, 4, 4, 'FD');

    // Acento rojo superior
    doc.setFillColor(...RED);
    doc.roundedRect(margin, baseY, contentW, 3, 4, 4, 'F');
    doc.rect(margin, baseY + 1.5, contentW, 1.5, 'F');

    // Numero de producto (badge rojo arriba derecha)
    const numTxt = `#${num}`;
    doc.setFillColor(...RED);
    doc.roundedRect(margin + contentW - 16, baseY + 6, 12, 7, 3.5, 3.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(numTxt, margin + contentW - 10, baseY + 10.8, { align: 'center' });

    // Fotos
    const fotoX = margin + pad;
    const fotoY = baseY + 6;
    const fotoW = contentW - pad * 2;

    if (fotos.length === 0)      layoutFoto1(doc, fotos, fotoX, fotoY, fotoW, fotoH);
    else if (fotos.length === 1) layoutFoto1(doc, fotos, fotoX, fotoY, fotoW, fotoH);
    else if (fotos.length === 2) layoutFoto2(doc, fotos, fotoX, fotoY, fotoW, fotoH);
    else                         layoutFoto3(doc, fotos, fotoX, fotoY, fotoW, fotoH);

    // Separador horizontal
    doc.setDrawColor(235, 232, 228);
    doc.setLineWidth(0.3);
    doc.line(margin + pad, infoY - 2, margin + contentW - pad, infoY - 2);

    // Info izquierda
    const textX = margin + pad;

    // SKU badge
    const skuTxt = producto.sku || '—';
    doc.setFillColor(...RED);
    const skuW = doc.getTextWidth(skuTxt) * 0.35 + 6;
    doc.roundedRect(textX, infoY, skuW > 14 ? skuW : 14, 5, 2.5, 2.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(skuTxt, textX + (skuW > 14 ? skuW : 14) / 2, infoY + 3.5, { align: 'center' });

    // Nombre
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const nombreLines = doc.splitTextToSize(producto.nombre || '', infoW - 4);
    doc.text(nombreLines.slice(0, 2), textX, infoY + 12);

    // Descripcion
    if (producto.descripcion) {
        const descY = infoY + 12 + Math.min(nombreLines.length, 2) * 6;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        const descLines = doc.splitTextToSize(producto.descripcion, infoW - 4);
        doc.text(descLines.slice(0, 4), textX, descY);
    }

    // Precios (columna derecha)
    dibujarPrecios(doc, producto, margin + contentW - precioW - pad, infoY, precioW);
}

// ── Layout compacto: 2 productos por pagina ──────────────────────────────────

function dibujarProductoCompacto(doc, producto, fotos, num, margin, baseY, contentW, slotH, pageW) {
    const pad = 4;
    const precioW = 46;
    const fotoH = slotH - 30;
    const infoY = baseY + fotoH + 6;

    // Card fondo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...WARM_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, baseY, contentW, slotH, 3, 3, 'FD');

    // Acento rojo superior
    doc.setFillColor(...RED);
    doc.roundedRect(margin, baseY, contentW, 2.5, 3, 3, 'F');
    doc.rect(margin, baseY + 1, contentW, 1.5, 'F');

    // Numero de producto
    const numTxt = `#${num}`;
    doc.setFillColor(...RED);
    doc.roundedRect(margin + contentW - 14, baseY + 5, 10, 6, 3, 3, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(numTxt, margin + contentW - 9, baseY + 9, { align: 'center' });

    // Foto (siempre 1 en compacto)
    layoutFoto1(doc, fotos, margin + pad, baseY + 5, contentW - pad * 2, fotoH);

    // Separador
    doc.setDrawColor(235, 232, 228);
    doc.setLineWidth(0.2);
    doc.line(margin + pad, infoY - 2, margin + contentW - pad, infoY - 2);

    // SKU badge
    const skuTxt = producto.sku || '—';
    doc.setFillColor(...RED);
    const skuW = Math.max(14, doc.getTextWidth(skuTxt) * 0.35 + 6);
    doc.roundedRect(margin + pad, infoY, skuW, 4.5, 2, 2, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(skuTxt, margin + pad + skuW / 2, infoY + 3.2, { align: 'center' });

    // Nombre
    const infoW = contentW - precioW - pad * 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const nombreLines = doc.splitTextToSize(producto.nombre || '', infoW - 4);
    doc.text(nombreLines.slice(0, 2), margin + pad, infoY + 10);

    // Descripcion
    if (producto.descripcion) {
        const descY = infoY + 10 + Math.min(nombreLines.length, 2) * 5;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        const descLines = doc.splitTextToSize(producto.descripcion, infoW - 4);
        doc.text(descLines.slice(0, 2), margin + pad, descY);
    }

    // Precios
    dibujarPrecios(doc, producto, margin + contentW - precioW - pad, infoY, precioW);
}
