import { C, M, T, CONTENT_W } from './theme.js';
import { cargarFoto, fitEnCaja } from './helpers.js';
import { dibujarHeaderMini } from './layout.js';

const Y_INI_FOTOS = 17;

// Resolución por tier para optimizar peso del PDF
const TIER_QUALITY = {
    1: { maxPx: 900, quality: 0.82 },
    2: { maxPx: 700, quality: 0.78 },
    3: { maxPx: 600, quality: 0.75 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function equipoLabel(item) {
    return [
        item.modeloEquipo || item.equipoModelo || null,
        item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? item.equipoSerial : null,
    ].filter(Boolean).join(' · ') || 'Equipo';
}

function equipoUbic(item) {
    return item.ubicacionEquipo || item.equipoUbicacion || '';
}

// Cover con crop desde el centro: escala para llenar la celda y recorta lo que sobra
function dibujarFotoEnCelda(doc, foto, x, y, bw, bh) {
    if (!foto) {
        doc.setFillColor(248, 248, 249);
        doc.rect(x, y, bw, bh, 'F');
        doc.setFontSize(5);
        doc.setTextColor(...C.grayText);
        doc.text('Sin foto', x + bw / 2, y + bh / 2, { align: 'center' });
        return;
    }
    const imgW = foto.w || bw;
    const imgH = foto.h || bh;
    // Escalar al ratio mayor para que cubra toda la celda
    const ratio = Math.max(bw / imgW, bh / imgH);
    const drawW = imgW * ratio;
    const drawH = imgH * ratio;
    // Centrar (lo que sobra se recorta con clip)
    const drawX = x + (bw - drawW) / 2;
    const drawY = y + (bh - drawH) / 2;

    doc.internal.write('q'); // save graphics state
    // Definir rectángulo de recorte
    const k = doc.internal.scaleFactor;
    const pageH = doc.internal.pageSize.getHeight();
    doc.internal.write(
        `${(x * k).toFixed(2)} ${((pageH - y - bh) * k).toFixed(2)} ${(bw * k).toFixed(2)} ${(bh * k).toFixed(2)} re W n`
    );
    try { doc.addImage(foto.data, foto.format, drawX, drawY, drawW, drawH); } catch {}
    doc.internal.write('Q'); // restore graphics state
}

async function cargarFotosEnLotes(ticketItems, soloAntes, tier = 1, tamLote = 5) {
    const { maxPx, quality } = TIER_QUALITY[tier] || TIER_QUALITY[1];
    const resultado = [];
    for (let i = 0; i < ticketItems.length; i += tamLote) {
        const lote = ticketItems.slice(i, i + tamLote);
        const res = await Promise.all(
            lote.map(async it => ({
                item: it,
                fotoA: await cargarFoto(it.fotoAntes, maxPx, quality),
                fotoD: soloAntes ? null : await cargarFoto(it.fotoDespues, maxPx, quality),
            }))
        );
        resultado.push(...res);
    }
    return resultado;
}

// ── EVIDENCIA INLINE (columna derecha, 1 equipo) ────────────────────────────
export async function dibujarEvidenciaInline(doc, { x, y, w, fotoA, fotoD, titulo = 'EVIDENCIA DEL SERVICIO' }) {
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, x, y);
    y += 6;

    const inlineW = Math.min(w, 56);
    const inlineH = 74;
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

        doc.setFillColor(245, 245, 247);
        doc.roundedRect(x, y, inlineW, inlineH, 1.5, 1.5, 'F');
        if (data) {
            const { w: fW, h: fH } = fitEnCaja(data.w, data.h, inlineW, inlineH);
            const offX = (inlineW - fW) / 2;
            const offY = (inlineH - fH) / 2;
            try { doc.addImage(data.data, data.format, x + offX, y + offY, fW, fH); } catch {}
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.roundedRect(x + offX, y + offY, fW, fH, 1.5, 1.5, 'S');
        }
        y += inlineH + 6;
    });

    return y;
}

// ── Tabla header — se repite en cada página ─────────────────────────────────
function dibujarTablaHeader(doc, y, colDefs, soloUnaFoto) {
    const headerH = 7;
    // Fondo header
    doc.setFillColor(...C.navy);
    doc.rect(M, y, CONTENT_W, headerH, 'F');
    // Texto header
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('#', colDefs.num.x + colDefs.num.w / 2, y + headerH / 2 + 1.8, { align: 'center' });
    doc.text('EQUIPO', colDefs.equipo.x + 2, y + headerH / 2 + 1.8);
    if (soloUnaFoto) {
        doc.text('EVIDENCIA', colDefs.fotoA.x + (colDefs.fotoA.w + colDefs.fotoD.w) / 2, y + headerH / 2 + 1.8, { align: 'center' });
    } else {
        doc.text('ESTADO INICIAL', colDefs.fotoA.x + colDefs.fotoA.w / 2, y + headerH / 2 + 1.8, { align: 'center' });
        doc.text('ESTADO FINAL', colDefs.fotoD.x + colDefs.fotoD.w / 2, y + headerH / 2 + 1.8, { align: 'center' });
    }
    return y + headerH;
}

// ── PÁGINA(S) DE EVIDENCIA — FORMATO TABLA ──────────────────────────────────
export async function dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc, {
    tipoLabel = 'EVIDENCIA FOTOGRÁFICA',
    subtitulo = 'ANTES Y DESPUÉS',
    soloAntes = false,
    esPresupuesto = false,
    yActual = null,
} = {}) {
    const pageH = doc.internal.pageSize.getHeight();
    const Y_LIM = pageH - 18;

    const cargaSoloAntes = soloAntes && !esPresupuesto;
    const totalItems = ticketItems.filter(it => it.fotoAntes || it.fotoDespues).length;
    const tier = totalItems <= 4 ? 1 : totalItems <= 20 ? 2 : 3;
    const fotosItems = await cargarFotosEnLotes(ticketItems, cargaSoloAntes, tier, 5);
    const conFotos = fotosItems.filter(x => x.fotoA || x.fotoD);
    if (conFotos.length === 0) return;

    // ¿Todos tienen solo 1 foto?
    const soloUnaFoto = conFotos.every(({ fotoA, fotoD }) => !(fotoA && fotoD));

    // ── Definir columnas de la tabla ─────────────────────────────────────
    const numW = 7;
    const equipoW = tier === 1 ? 38 : tier === 2 ? 32 : 28;
    const fotosW = CONTENT_W - numW - equipoW;
    const fotoAW = soloUnaFoto ? fotosW : fotosW / 2;
    const fotoDW = soloUnaFoto ? 0 : fotosW / 2;

    const colDefs = {
        num:    { x: M, w: numW },
        equipo: { x: M + numW, w: equipoW },
        fotoA:  { x: M + numW + equipoW, w: fotoAW },
        fotoD:  { x: M + numW + equipoW + fotoAW, w: fotoDW },
    };

    // Altura de cada fila según tier
    const rowH = tier === 1 ? 55 : tier === 2 ? 48 : 46;
    const lineW = 0.2;

    // ── Primera página ───────────────────────────────────────────────────
    doc.addPage();
    dibujarHeaderMini(doc, { tipoLabel, nroDoc });
    let y = Y_INI_FOTOS + 2;
    y = dibujarTablaHeader(doc, y, colDefs, soloUnaFoto);

    // ── Filas ────────────────────────────────────────────────────────────
    conFotos.forEach(({ item, fotoA, fotoD }, idx) => {
        // Salto de página
        if (y + rowH > Y_LIM) {
            doc.addPage();
            dibujarHeaderMini(doc, { tipoLabel, nroDoc });
            y = Y_INI_FOTOS + 2;
            y = dibujarTablaHeader(doc, y, colDefs, soloUnaFoto);
        }

        // Fondo zebra
        if (idx % 2 === 0) {
            doc.setFillColor(...C.grayZebra);
            doc.rect(M, y, CONTENT_W, rowH, 'F');
        }

        // Número
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(String(idx + 1), colDefs.num.x + colDefs.num.w / 2, y + rowH / 2 + 2, { align: 'center' });

        // Datos equipo
        const eqX = colDefs.equipo.x + 2;
        const eqMaxW = colDefs.equipo.w - 4;
        const serial = item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? item.equipoSerial : '';
        const modelo = item.modeloEquipo || item.equipoModelo || '';
        const ubic = equipoUbic(item);

        let ey = y + 4;
        if (serial) {
            doc.setFontSize(tier === 3 ? 7 : 7.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            const serialLines = doc.splitTextToSize(serial, eqMaxW);
            serialLines.slice(0, 2).forEach((line, li) => {
                doc.text(line, eqX, ey + 3.5 + li * 3.5);
            });
            ey += 3.5 + Math.min(serialLines.length, 2) * 3.5;
        }
        if (modelo) {
            doc.setFontSize(tier === 3 ? 5.5 : 6);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            const modeloLines = doc.splitTextToSize(modelo, eqMaxW);
            modeloLines.slice(0, 2).forEach((line, li) => {
                doc.text(line, eqX, ey + 2.5 + li * 3);
            });
            ey += 2 + Math.min(modeloLines.length, 2) * 3;
        }
        if (ubic) {
            doc.setFontSize(tier === 3 ? 5 : 5.5);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.grayText);
            const ubicLines = doc.splitTextToSize(ubic, eqMaxW);
            ubicLines.slice(0, 2).forEach((line, li) => {
                doc.text(line, eqX, ey + 2.5 + li * 3);
            });
        }

        // Foto antes
        const fotoPad = 1;
        dibujarFotoEnCelda(doc, fotoA, colDefs.fotoA.x + fotoPad, y + fotoPad,
            (soloUnaFoto ? fotoAW + fotoDW : fotoAW) - fotoPad * 2, rowH - fotoPad * 2);

        // Foto después
        if (!soloUnaFoto) {
            dibujarFotoEnCelda(doc, fotoD, colDefs.fotoD.x + fotoPad, y + fotoPad,
                fotoDW - fotoPad * 2, rowH - fotoPad * 2);
        }

        // Líneas de celda
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(lineW);
        // Horizontal inferior
        doc.line(M, y + rowH, M + CONTENT_W, y + rowH);
        // Verticales
        doc.line(colDefs.equipo.x, y, colDefs.equipo.x, y + rowH);
        doc.line(colDefs.fotoA.x, y, colDefs.fotoA.x, y + rowH);
        if (!soloUnaFoto) {
            doc.line(colDefs.fotoD.x, y, colDefs.fotoD.x, y + rowH);
        }
        // Borde derecho
        doc.line(M + CONTENT_W, y, M + CONTENT_W, y + rowH);
        // Borde izquierdo
        doc.line(M, y, M, y + rowH);

        y += rowH;
    });
}
