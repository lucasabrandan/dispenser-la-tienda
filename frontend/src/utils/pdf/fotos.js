import { C, M, T, CONTENT_W } from './theme.js';
import { cargarFoto, fitEnCaja } from './helpers.js';
import { dibujarHeaderMini } from './layout.js';

// Header mini: 15mm, margen inferior: 20mm → 262mm útiles
const Y_INI_FOTOS = 17;

// Tamaños normales (≤4 equipos): 3 por página
const FOTO_V_W = 56, FOTO_V_H = 74;  // portrait
const FOTO_H_W = 88, FOTO_H_H = 66;  // landscape

// Tamaños compactos (>4 equipos): 4 por página
const FOTO_V_W_C = 42, FOTO_V_H_C = 56;  // portrait compacto
const FOTO_H_W_C = 74, FOTO_H_H_C = 56;  // landscape compacto

function esHorizontal(foto) {
    return foto && foto.w && foto.h && foto.w > foto.h;
}

function boxDims(foto, compacto) {
    if (compacto) {
        return esHorizontal(foto)
            ? { bw: FOTO_H_W_C, bh: FOTO_H_H_C }
            : { bw: FOTO_V_W_C, bh: FOTO_V_H_C };
    }
    return esHorizontal(foto)
        ? { bw: FOTO_H_W, bh: FOTO_H_H }
        : { bw: FOTO_V_W, bh: FOTO_V_H };
}

// ── EVIDENCIA INLINE (columna derecha, 1 equipo) ──────────────────────────────
export async function dibujarEvidenciaInline(doc, { x, y, w, fotoA, fotoD, titulo = 'EVIDENCIA DEL SERVICIO' }) {
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, x, y);
    y += 6;

    const inlineW = Math.min(w, FOTO_V_W);
    const inlineH = FOTO_V_H;
    const fotos = [
        { data: fotoA, label: 'ESTADO INICIAL' },
        { data: fotoD, label: 'ESTADO FINAL'   },
    ].filter(f => !!f.data);

    if (fotos.length === 0) {
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, inlineW, inlineH, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setTextColor(...C.grayText);
        doc.text('Sin evidencia fotográfica', x + inlineW / 2, y + inlineH / 2, { align: 'center' });
        return y + inlineH + 6;
    }

    fotos.forEach(({ data, label }) => {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + inlineW / 2, y, { align: 'center' });
        y += 3;

        const { w: fW, h: fH } = fitEnCaja(data?.w, data?.h, inlineW, inlineH);
        const offX = (inlineW - fW) / 2;

        doc.setFillColor(220, 220, 225);
        doc.roundedRect(x + offX + 1.5, y + 1.5, fW, fH, 2, 2, 'F');
        try { doc.addImage(data.data, data.format, x + offX, y, fW, fH); } catch {}
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x + offX, y, fW, fH, 2, 2, 'S');
        y += fH + 6;
    });

    return y;
}

// Carga fotos en lotes para no saturar memoria
async function cargarFotosEnLotes(ticketItems, soloAntes, tamLote = 5) {
    const resultado = [];
    for (let i = 0; i < ticketItems.length; i += tamLote) {
        const lote = ticketItems.slice(i, i + tamLote);
        const res = await Promise.all(
            lote.map(async it => ({
                item: it,
                fotoA: await cargarFoto(it.fotoAntes),
                fotoD: soloAntes ? null : await cargarFoto(it.fotoDespues),
            }))
        );
        resultado.push(...res);
    }
    return resultado;
}

// ── PÁGINA(S) DE EVIDENCIA COMPLETA (multi-equipo) ───────────────────────────
export async function dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc, {
    tipoLabel = 'EVIDENCIA FOTOGRÁFICA',
    subtitulo = 'ANTES Y DESPUÉS',
    soloAntes = false,
    esPresupuesto = false,
} = {}) {
    const pageH = doc.internal.pageSize.getHeight();

    // Presupuesto: cargar AMBAS fotos (son fotos del cliente, no antes/después)
    const cargaSoloAntes = soloAntes && !esPresupuesto;
    const fotosItems = await cargarFotosEnLotes(ticketItems, cargaSoloAntes, 5);

    const conFotos = fotosItems.filter(x => x.fotoA || x.fotoD);
    if (conFotos.length === 0) return;

    // Modo compacto: >4 equipos con fotos → fotos más chicas, 4 por página
    const compacto = conFotos.length > 4;
    const GAP = compacto ? 4 : 6;

    doc.addPage();
    dibujarHeaderMini(doc, { tipoLabel, nroDoc });

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(subtitulo, M, Y_INI_FOTOS + 1);

    const Y_LIM = pageH - 20;
    let y = Y_INI_FOTOS + 5;

    // Dibuja una foto respetando proporción real dentro de su caja fija
    const dibujarFoto = (foto, x, fy, bw, bh) => {
        const { w: fW, h: fH } = fitEnCaja(foto?.w, foto?.h, bw, bh);
        const offX = (bw - fW) / 2;
        const offY = (bh - fH) / 2;
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(x + 1, fy + 1, bw, bh, 1.5, 1.5, 'F');
        if (foto) {
            try { doc.addImage(foto.data, foto.format, x + offX, fy + offY, fW, fH); } catch {}
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.roundedRect(x + offX, fy + offY, fW, fH, 1.5, 1.5, 'S');
        } else {
            doc.setFillColor(...C.grayBg);
            doc.roundedRect(x, fy, bw, bh, 1.5, 1.5, 'F');
            doc.setFontSize(T.label);
            doc.setTextColor(...C.grayText);
            doc.text('Sin foto', x + bw / 2, fy + bh / 2, { align: 'center' });
        }
    };

    for (const { item, fotoA, fotoD } of conFotos) {
        const boxA = boxDims(fotoA, compacto);
        const boxD = boxDims(fotoD, compacto);
        const maxH = Math.max(boxA.bh, boxD.bh);
        const blockH = maxH + 4 + GAP; // label 4mm + foto + gap

        if (y + blockH > Y_LIM) {
            doc.addPage();
            dibujarHeaderMini(doc, { tipoLabel, nroDoc });
            y = Y_INI_FOTOS + 2;
        }

        // Etiqueta equipo
        const eqLabel = [
            item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? `S/N: ${item.equipoSerial}` : null,
            item.modeloEquipo || item.equipoModelo || null,
            item.ubicacionEquipo || item.equipoUbicacion || null,
        ].filter(Boolean).join('  ·  ') || 'Equipo';

        doc.setFontSize(compacto ? T.label : T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(eqLabel, M, y);
        y += 4;

        if (fotoA && fotoD) {
            const totalW = boxA.bw + 6 + boxD.bw;
            const xBase  = M + (CONTENT_W - totalW) / 2;
            dibujarFoto(fotoA, xBase, y, boxA.bw, boxA.bh);
            dibujarFoto(fotoD, xBase + boxA.bw + 6, y, boxD.bw, boxD.bh);
        } else {
            const foto = fotoA || fotoD;
            const box  = boxDims(foto, compacto);
            const xCentro = M + (CONTENT_W - box.bw) / 2;
            dibujarFoto(foto, xCentro, y, box.bw, box.bh);
        }
        y += maxH + GAP;
    }
}
