import { C, M, T, CONTENT_W } from './theme.js';
import { cargarFoto } from './helpers.js';
import { dibujarHeaderCompacto } from './layout.js';

const Y_INI = 42;

// ── EVIDENCIA INLINE (columna derecha, 1 equipo) ──────────────────────────────
// x, y: esquina superior izquierda del área disponible
// w: ancho del área
// Devuelve la Y final
export async function dibujarEvidenciaInline(doc, { x, y, w, fotoA, fotoD, titulo = 'EVIDENCIA DEL SERVICIO' }) {
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, x, y);
    y += 6;

    const PH    = Math.floor((w * 3) / 4);   // altura proporcional 4:3
    const fotos = [
        { data: fotoA, label: 'ESTADO INICIAL' },
        { data: fotoD, label: 'ESTADO FINAL'   },
    ].filter(f => !!f.data);

    if (fotos.length === 0) {
        // Placeholder si no hay fotos
        doc.setFillColor(...C.grayBg);
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, w, PH, 2, 2, 'FD');
        doc.setFontSize(T.xxs);
        doc.setTextColor(...C.grayText);
        doc.text('Sin evidencia fotográfica', x + w / 2, y + PH / 2, { align: 'center' });
        return y + PH + 6;
    }

    fotos.forEach(({ data, label }) => {
        // Etiqueta
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(label, x + w / 2, y, { align: 'center' });
        y += 3;

        // Sombra
        doc.setFillColor(220, 220, 225);
        doc.roundedRect(x + 1.5, y + 1.5, w, PH, 2, 2, 'F');

        // Foto
        try {
            doc.addImage(data.data, data.format, x, y, w, PH);
        } catch {}
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, w, PH, 2, 2, 'S');

        y += PH + 6;
    });

    return y;
}

// ── PÁGINA(S) DE EVIDENCIA COMPLETA (multi-equipo) ───────────────────────────
export async function dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc) {
    const pageH = doc.internal.pageSize.getHeight();

    const fotosItems = await Promise.all(
        ticketItems.map(async it => ({
            item: it,
            fotoA: await cargarFoto(it.fotoAntes),
            fotoD: await cargarFoto(it.fotoDespues),
        }))
    );

    const conFotos = fotosItems.filter(x => x.fotoA || x.fotoD);
    if (conFotos.length === 0) return;

    doc.addPage();
    dibujarHeaderCompacto(doc, {
        tipoLabel: 'EVIDENCIA FOTOGRÁFICA',
        fecha,
        nroDoc,
    });

    // Título "ANTES Y DESPUÉS"
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text('ANTES Y DESPUÉS', M, Y_INI - 2);

    // Grilla 2 columnas (antes | después)
    const COL_W = (CONTENT_W - 6) / 2;
    const FOTO_H = Math.floor((COL_W * 3) / 4);
    const Y_LIM  = pageH - 26;
    let y = Y_INI + 2;

    // Encabezados columnas
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.grayText);
    doc.text('ESTADO INICIAL', M + COL_W / 2, y, { align: 'center' });
    doc.text('ESTADO FINAL',   M + COL_W + 6 + COL_W / 2, y, { align: 'center' });
    y += 5;

    for (const { item, fotoA, fotoD } of conFotos) {
        const blockH = FOTO_H + 16;
        if (y + blockH > Y_LIM) {
            doc.addPage();
            dibujarHeaderCompacto(doc, { tipoLabel: 'EVIDENCIA FOTOGRÁFICA', fecha, nroDoc });
            y = Y_INI + 2;
        }

        // Etiqueta equipo
        const eqLabel = [
            item.equipoSerial && !['SIN-SN','MOSTRADOR'].includes(item.equipoSerial) ? `S/N: ${item.equipoSerial}` : null,
            item.modeloEquipo || item.equipoModelo || null,
            item.ubicacionEquipo || item.equipoUbicacion || null,
        ].filter(Boolean).join('  ·  ') || 'Equipo';

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(eqLabel, M, y);
        y += 5;

        // Foto antes
        const dibujarFoto = (foto, x, fy, w, h) => {
            doc.setFillColor(220, 220, 225);
            doc.roundedRect(x + 1.5, fy + 1.5, w, h, 1.5, 1.5, 'F');
            if (foto) {
                try { doc.addImage(foto.data, foto.format, x, fy, w, h); } catch {}
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
        };

        dibujarFoto(fotoA, M,              y, COL_W, FOTO_H);
        dibujarFoto(fotoD, M + COL_W + 6, y, COL_W, FOTO_H);

        y += FOTO_H + 8;
    }
}
