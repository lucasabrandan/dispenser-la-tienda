/**
 * fotos.js — Página(s) de evidencia fotográfica antes/después
 * Con paginación automática y etiquetas por equipo
 */
import { C, M, T } from './theme.js';
import { cargarFoto } from './helpers.js';
import { dibujarHeaderCompacto } from './layout.js';

const FOTO_W  = 82;
const FOTO_H  = 100;
const GAP     = 8;
const Y_INI   = 42;

// Dibuja una foto con sombra, borde y label
function dibujarFoto(doc, foto, x, y, w, h, labelTxt) {
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.grayText);
    doc.text(labelTxt, x + w / 2, y, { align: 'center' });

    const fy = y + 3;

    // Sombra
    doc.setFillColor(220, 220, 225);
    doc.roundedRect(x + 1.5, fy + 1.5, w, h, 1.5, 1.5, 'F');

    if (foto) {
        doc.addImage(foto.data, foto.format, x, fy, w, h);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.roundedRect(x, fy, w, h, 1.5, 1.5, 'S');
    } else {
        doc.setFillColor(...C.grayBg);
        doc.roundedRect(x, fy, w, h, 1.5, 1.5, 'F');
        doc.setFontSize(T.label);
        doc.setTextColor(...C.grayText);
        doc.text('Sin foto', x + w / 2, fy + h / 2, { align: 'center' });
    }
}

// Agrega páginas de evidencia al final del documento
export async function dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc) {
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    const Y_LIM = pageH - 26;

    const fotosItems = await Promise.all(
        ticketItems.map(async it => ({
            item: it,
            fotoA: await cargarFoto(it.fotoAntes),
            fotoD: await cargarFoto(it.fotoDespues),
        }))
    );

    const conFotos = fotosItems.filter(x => x.fotoA || x.fotoD);
    if (conFotos.length === 0) return;

    let y = Y_INI;
    let primeraHoja = true;

    const iniciarHoja = () => {
        doc.addPage();
        dibujarHeaderCompacto(doc, 'EVIDENCIA DEL SERVICIO', fecha, null, nroDoc);
        y = Y_INI;
        if (primeraHoja) primeraHoja = false;
    };

    iniciarHoja();

    for (const { item, fotoA, fotoD } of conFotos) {
        const seccionH = 16 + FOTO_H + 10;
        if (y + seccionH > Y_LIM) iniciarHoja();

        // Separador + etiqueta equipo
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(M, y, pageW - M, y);
        y += 6;

        const serialLabel = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial)
            ? `S/N: ${item.equipoSerial}` : '';
        const equipoLabel = [serialLabel, item.modeloEquipo || ''].filter(Boolean).join('  ·  ') || 'Equipo';

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('EQUIPO', M, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(equipoLabel, M + 22, y);
        y += 10;

        const nFotos = (fotoA ? 1 : 0) + (fotoD ? 1 : 0);
        if (nFotos === 2) {
            const totalW = FOTO_W * 2 + GAP;
            const xL = (pageW - totalW) / 2;
            dibujarFoto(doc, fotoA, xL, y, FOTO_W, FOTO_H, 'Estado inicial');
            dibujarFoto(doc, fotoD, xL + FOTO_W + GAP, y, FOTO_W, FOTO_H, 'Resultado final');
        } else {
            const xSola = (pageW - FOTO_W) / 2;
            dibujarFoto(doc, fotoA || fotoD, xSola, y, FOTO_W, FOTO_H,
                fotoA ? 'Estado inicial' : 'Resultado final');
        }
        y += FOTO_H + 12;
    }
}
