import { C, M, T, CONTENT_W } from './theme.js';
import { cargarFoto, fitEnCaja } from './helpers.js';
import { dibujarHeaderMini } from './layout.js';

// Header mini: 15mm, margen inferior: 20mm → 262mm útiles
const Y_INI_FOTOS = 17;

// Tamaños normales (≤4 equipos): 3 por página, 1 equipo por fila
const FOTO_V_W = 56, FOTO_V_H = 74;  // portrait
const FOTO_H_W = 88, FOTO_H_H = 66;  // landscape

// Tamaños compactos (>4 equipos): grid 4 columnas
const FOTO_V_W_C = 42, FOTO_V_H_C = 56;  // portrait compacto
const FOTO_H_W_C = 74, FOTO_H_H_C = 56;  // landscape compacto

// Grid: 4 columnas, fotos apiladas verticalmente
const GRID_COLS = 4;
const GRID_GAP  = 3;  // mm entre columnas
const GRID_COL_W = (CONTENT_W - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS; // ~43mm
const GRID_FOTO_H = 30; // altura de cada foto en grid

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
    yActual = null, // si se pasa, intenta dibujar inline sin nueva página
} = {}) {
    const pageH = doc.internal.pageSize.getHeight();

    // Presupuesto: cargar AMBAS fotos (son fotos del cliente, no antes/después)
    const cargaSoloAntes = soloAntes && !esPresupuesto;
    const fotosItems = await cargarFotosEnLotes(ticketItems, cargaSoloAntes, 5);

    const conFotos = fotosItems.filter(x => x.fotoA || x.fotoD);
    if (conFotos.length === 0) return;

    // Modo compacto: >4 equipos con fotos → grid de 4 columnas
    const compacto = conFotos.length > 4;

    const Y_LIM = pageH - 18;

    // ── Intentar dibujar inline si cabe ────────────────────────────────────
    let y;
    // ¿Pocas fotos con 1 sola foto por equipo? → layout lado a lado (compacto inline)
    const soloUnaFoto = conFotos.every(({ fotoA, fotoD }) => !(fotoA && fotoD));
    const puedenLadoALado = !compacto && soloUnaFoto && conFotos.length <= 4;
    const INLINE_FOTO_H = 50; // altura reducida para inline
    const espacioInline = puedenLadoALado
        ? 12 + INLINE_FOTO_H + 10 // 1 fila lado a lado
        : compacto ? 999
        : conFotos.reduce((h, { fotoA, fotoD }) => {
            const maxH = Math.max(fotoA ? FOTO_V_H : 0, fotoD ? FOTO_V_H : 0);
            return h + maxH + 10 + (fotoA && fotoD ? 3 : 0);
        }, 12);

    if (yActual && yActual + espacioInline < Y_LIM) {
        // Cabe en la página actual — dibujar inline
        y = yActual;
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tipoLabel.toUpperCase(), M, y);
        y += 4;
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(subtitulo, M, y);
        y += 5;

        if (puedenLadoALado) {
            // Dibujar fotos lado a lado en una fila
            const colW = (CONTENT_W - (conFotos.length - 1) * 4) / conFotos.length;
            conFotos.forEach(({ item, fotoA, fotoD }, idx) => {
                const foto = fotoA || fotoD;
                const x = M + idx * (colW + 4);
                // Label equipo
                const parts = [
                    item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? `S/N: ${item.equipoSerial}` : null,
                    item.modeloEquipo || item.equipoModelo || null,
                ].filter(Boolean);
                doc.setFontSize(T.label);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...C.navy);
                const lbl = doc.splitTextToSize(parts.join(' · ') || 'Equipo', colW);
                doc.text(lbl[0], x + colW / 2, y, { align: 'center' });
                // Foto
                dibujarFoto(foto, x + (colW - Math.min(colW, INLINE_FOTO_H * 0.75)) / 2, y + 4, Math.min(colW, INLINE_FOTO_H * 0.75), INLINE_FOTO_H);
            });
            y += INLINE_FOTO_H + 10;
            return; // terminó inline, no seguir con el flujo normal
        }
    } else {
        // Nueva página con header mini
        doc.addPage();
        dibujarHeaderMini(doc, { tipoLabel, nroDoc });
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(subtitulo, M, Y_INI_FOTOS + 1);
        y = Y_INI_FOTOS + 5;
    }

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

    if (compacto) {
        // ── GRID 4 COLUMNAS — cada equipo en card con fondo ─────────────────
        const CARD_PAD = 2.5; // padding interno de la card
        for (let i = 0; i < conFotos.length; i += GRID_COLS) {
            const fila = conFotos.slice(i, i + GRID_COLS);
            const tieneDos = fila.some(({ fotoA, fotoD }) => fotoA && fotoD);
            // Altura interna: label(8) + fotos + labels antes/después
            const innerH = 8 + GRID_FOTO_H * (tieneDos ? 2 : 1) + (tieneDos ? 8 : 0);
            const cardH  = innerH + CARD_PAD * 2;
            const blockH = cardH + 3; // gap entre filas

            if (y + blockH > Y_LIM) {
                doc.addPage();
                dibujarHeaderMini(doc, { tipoLabel, nroDoc });
                y = Y_INI_FOTOS + 2;
            }

            fila.forEach(({ item, fotoA, fotoD }, col) => {
                const x = M + col * (GRID_COL_W + GRID_GAP);

                // Card de fondo para agrupar visualmente
                doc.setFillColor(...C.grayBg);
                doc.setDrawColor(...C.grayBorder);
                doc.setLineWidth(0.15);
                doc.roundedRect(x - CARD_PAD, y, GRID_COL_W + CARD_PAD * 2, cardH, 1.5, 1.5, 'FD');

                let fy = y + CARD_PAD;

                // Etiqueta equipo
                const parts = [
                    item.modeloEquipo || item.equipoModelo || null,
                    item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? item.equipoSerial : null,
                ].filter(Boolean);
                const eqLabel = parts.join(' · ') || 'Equipo';
                const ubicLabel = item.ubicacionEquipo || item.equipoUbicacion || '';

                doc.setFontSize(5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...C.navy);
                const labelLines = doc.splitTextToSize(eqLabel, GRID_COL_W);
                doc.text(labelLines[0], x, fy + 3);
                if (ubicLabel) {
                    doc.setFontSize(4.5);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(...C.grayText);
                    const ubicLines = doc.splitTextToSize(ubicLabel, GRID_COL_W);
                    doc.text(ubicLines[0], x, fy + 6);
                }
                fy += 8;

                // Fotos apiladas con etiqueta antes/después
                if (fotoA) {
                    if (fotoD) { doc.setFontSize(4); doc.setFont(undefined, 'bold'); doc.setTextColor(...C.grayText); doc.text('ANTES', x + GRID_COL_W / 2, fy, { align: 'center' }); fy += 3; }
                    dibujarFoto(fotoA, x, fy, GRID_COL_W, GRID_FOTO_H);
                    fy += GRID_FOTO_H + 2;
                }
                if (fotoD) {
                    doc.setFontSize(4); doc.setFont(undefined, 'bold'); doc.setTextColor(...C.grayText); doc.text('DESPUÉS', x + GRID_COL_W / 2, fy, { align: 'center' }); fy += 3;
                    dibujarFoto(fotoD, x, fy, GRID_COL_W, GRID_FOTO_H);
                }
            });

            y += blockH;
        }
    } else {
        // ── MODO NORMAL: 1 equipo por fila (≤4 equipos) ─────────────────────
        const GAP = 6;
        for (const { item, fotoA, fotoD } of conFotos) {
            const boxA = boxDims(fotoA, false);
            const boxD = boxDims(fotoD, false);
            const maxH = Math.max(boxA.bh, boxD.bh);
            const tieneAmbas = fotoA && fotoD;
            const blockH = maxH + 4 + (tieneAmbas ? 3 : 0) + GAP;

            if (y + blockH > Y_LIM) {
                doc.addPage();
                dibujarHeaderMini(doc, { tipoLabel, nroDoc });
                y = Y_INI_FOTOS + 2;
            }

            const eqLabel = [
                item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? `S/N: ${item.equipoSerial}` : null,
                item.modeloEquipo || item.equipoModelo || null,
                item.ubicacionEquipo || item.equipoUbicacion || null,
            ].filter(Boolean).join('  ·  ') || 'Equipo';

            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text(eqLabel, M, y);
            y += 4;

            if (fotoA && fotoD) {
                const totalW = boxA.bw + 6 + boxD.bw;
                const xBase  = M + (CONTENT_W - totalW) / 2;
                // Labels ANTES / DESPUÉS centrados sobre cada foto
                doc.setFontSize(T.label);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...C.grayText);
                doc.text('ANTES', xBase + boxA.bw / 2, y, { align: 'center' });
                doc.text('DESPUÉS', xBase + boxA.bw + 6 + boxD.bw / 2, y, { align: 'center' });
                y += 3;
                dibujarFoto(fotoA, xBase, y, boxA.bw, boxA.bh);
                dibujarFoto(fotoD, xBase + boxA.bw + 6, y, boxD.bw, boxD.bh);
            } else {
                const foto = fotoA || fotoD;
                const box  = boxDims(foto, false);
                const xCentro = M + (CONTENT_W - box.bw) / 2;
                dibujarFoto(foto, xCentro, y, box.bw, box.bh);
            }
            y += maxH + GAP;
        }
    }
}
