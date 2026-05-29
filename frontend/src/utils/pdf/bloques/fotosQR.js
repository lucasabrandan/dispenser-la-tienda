// Registro fotografico y QR WhatsApp para PDFs
import { C, M, T, CONTENT_W } from '../theme.js';
import { fitEnCaja } from '../helpers.js';

export async function dibujarQRWhatsApp(doc, { x, y, telefono, mensaje = '', titulo = '¿ESTÁ DE ACUERDO CON ESTE PRESUPUESTO?', nroDoc = '' }) {
    try {
        const QRCode = await import('qrcode').catch(() => null);
        if (!QRCode) return dibujarQRPlaceholder(doc, x, y);

        const waUrl  = `https://wa.me/${telefono.replace(/\D/g,'')}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
        const dataUrl = await QRCode.default.toDataURL(waUrl, { width: 140, margin: 1, color: { dark: '#0D2B5B', light: '#ffffff' } });

        const QR_W  = 28;
        const QR_H  = 28;

        // Card de fondo
        const cardW = CONTENT_W + 4;
        const cardH = 38;
        doc.setFillColor(...C.grayLight);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.25);
        doc.roundedRect(M - 2, y, cardW, cardH, 2, 2, 'FD');

        // QR
        doc.addImage(dataUrl, 'PNG', M + 2, y + 5, QR_W, QR_H);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.roundedRect(M + 2, y + 5, QR_W, QR_H, 1, 1, 'S');

        // Texto
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(titulo, M + QR_W + 8, y + 12);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text('Respondé por WhatsApp para coordinar el servicio.', M + QR_W + 8, y + 18);
        if (nroDoc) doc.text(`Nro. presupuesto: ${nroDoc}`, M + QR_W + 8, y + 23);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.green);
        doc.text('WhatsApp directo', M + QR_W + 8, y + 30);

        return y + cardH + 6;
    } catch {
        return dibujarQRPlaceholder(doc, x, y);
    }
}

function dibujarQRPlaceholder(doc, x, y) {
    doc.setFillColor(...C.grayBg);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, 38, 2, 2, 'FD');
    doc.setFontSize(T.xs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text('[QR WhatsApp]', M + 4, y + 20);
    return y + 44;
}

export function dibujarRegistroFotografico(doc, { y, fotoA = null, fotoD = null, esPresupuesto = false, compacto = false }) {
    if (!fotoA && !fotoD) return y;

    // Tamaños normales y compactos por orientación
    const esHz = (foto) => foto && foto.w && foto.h && foto.w > foto.h;
    const dims = (foto) => {
        if (compacto) return esHz(foto) ? { bw: 74, bh: 56 } : { bw: 42, bh: 56 };
        return esHz(foto) ? { bw: 88, bh: 66 } : { bw: 56, bh: 74 };
    };

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(esPresupuesto ? 'FOTOGRAFÍAS DEL EQUIPO' : 'REGISTRO FOTOGRÁFICO', M, y);
    y += 5;

    const dibujarCaja = (foto, x, bw, bh, label) => {
        const { w: fW, h: fH } = fitEnCaja(foto?.w, foto?.h, bw, bh);
        const offX = (bw - fW) / 2;
        const offY = (bh - fH) / 2;
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(x + 1, y + 1, bw, bh, 2, 2, 'F');
        if (foto) {
            try { doc.addImage(foto.data, foto.format, x + offX, y + offY, fW, fH); } catch {}
        } else {
            doc.setFillColor(...C.grayBg);
            doc.roundedRect(x, y, bw, bh, 2, 2, 'F');
        }
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, bw, bh, 2, 2, 'S');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + bw / 2, y + bh + 4.5, { align: 'center' });
    };

    if (fotoA && fotoD) {
        const lA = esPresupuesto ? 'FOTO 1' : 'ESTADO INICIAL';
        const lD = esPresupuesto ? 'FOTO 2' : 'ESTADO FINAL';
        const bA = dims(fotoA);
        const bD = dims(fotoD);
        const totalW = bA.bw + 6 + bD.bw;
        const xBase  = M + (CONTENT_W - totalW) / 2;
        dibujarCaja(fotoA, xBase,              bA.bw, bA.bh, lA);
        dibujarCaja(fotoD, xBase + bA.bw + 6, bD.bw, bD.bh, lD);
        return y + Math.max(bA.bh, bD.bh) + 10;
    } else {
        const foto = fotoA || fotoD;
        const b = dims(foto);
        const xCentro = M + (CONTENT_W - b.bw) / 2;
        dibujarCaja(foto, xCentro, b.bw, b.bh, esPresupuesto ? 'FOTO DEL EQUIPO' : (fotoA ? 'ESTADO INICIAL' : 'ESTADO FINAL'));
        return y + b.bh + 10;
    }
}
