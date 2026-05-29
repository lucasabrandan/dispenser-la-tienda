// Bloques de cliente y equipo para PDFs
import { C, M, T, CONTENT_W } from '../theme.js';
import { fitEnCaja } from '../helpers.js';

export function dibujarBloqueClienteEquipo(doc, { cliente, sede, item = null, idx = 0, y, pageW, fotoEquipo = null, diagnostico = null, tituloDiag = 'DIAGNÓSTICO / SOLICITUD', conBullet = false }) {
    const tieneDiag = !!(diagnostico && diagnostico.trim());

    // Equipo en columna derecha cuando item tiene datos reales y no hay diagnostico
    const serialItem = item?.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial) ? item.equipoSerial : null;
    const modeloItem = item?.modeloEquipo || item?.equipoModelo || null;
    const marcaItem  = item?.marcaEquipo  || item?.equipoMarca  || null;
    const ubicItem   = item?.ubicacionEquipo || item?.equipoUbicacion || null;
    const pisoItem   = item?.equipoPiso   || null;
    const sectorItem = item?.equipoSector || null;
    const camposEquipo = [
        (modeloItem || marcaItem) ? { l: 'EQUIPO',    v: [marcaItem, modeloItem].filter(Boolean).join(' · ') } : null,
        serialItem               ? { l: 'N° SERIE',  v: serialItem } : null,
        ubicItem                 ? { l: 'UBICACIÓN', v: ubicItem   } : null,
        pisoItem                 ? { l: 'PISO',      v: pisoItem   } : null,
        sectorItem               ? { l: 'SECTOR',    v: sectorItem  } : null,
    ].filter(Boolean);
    const tieneEquipoDer = !tieneDiag && camposEquipo.length > 0;
    const tieneDer = tieneDiag || tieneEquipoDer;

    const LEFT_W  = tieneDer ? CONTENT_W * 0.54 : CONTENT_W;
    const RIGHT_W = CONTENT_W - LEFT_W - 4;
    const RIGHT_X = M + LEFT_W + 4;

    // Pre-calcular datos para altura dinámica (sin espacio vacío excesivo)
    const condFiscal = cliente?.condicionFiscal || cliente?.condicionIva || null;
    const datosCliente = [
        cliente?.telefono   ? `Tel: ${cliente.telefono}`            : null,
        sede?.nombreSede    ? `Sede: ${sede.nombreSede}`             : null,
        sede?.direccion     ? `Dir: ${sede.direccion}`              : null,
        cliente?.cuilDni    ? `CUIT/DNI: ${cliente.cuilDni}`        : null,
        condFiscal          ? `Cond. fiscal: ${condFiscal}`         : null,
        cliente?.email      ? `Email: ${cliente.email}`             : null,
    ].filter(Boolean).slice(0, 4);

    const textH = 6 + 5 + 5 + datosCliente.length * 4.2 + 4; // padding top + label + nombre + líneas + padding bottom
    let cardH;
    if (tieneDiag) {
        doc.setFontSize(T.xxs);
        const diagLines = doc.splitTextToSize(diagnostico.trim(), RIGHT_W - 4);
        cardH = Math.max(textH, diagLines.length * 4.2 + 16);
    } else if (tieneEquipoDer) {
        const equipoH = camposEquipo.length * 4.2 + 11;
        cardH = Math.max(textH, equipoH);
    } else {
        cardH = Math.max(textH, 22);
    }

    // Fondo card
    doc.setFillColor(...C.grayLight);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'S');

    // Divisor vertical (si hay columna derecha)
    if (tieneDer) {
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.2);
        doc.line(RIGHT_X - 2, y + 3, RIGHT_X - 2, y + cardH - 3);
    }

    // ── Columna izquierda: DATOS DEL CLIENTE ──
    let cy = y + 6;

    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${conBullet ? '• ' : ''}DATOS DEL CLIENTE`, M + 2, cy);
    cy += 5;

    const nombreCliente = (cliente?.nombre || 'PARTICULAR').toUpperCase();
    doc.setFontSize(T.md);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    const nombreLines = doc.splitTextToSize(nombreCliente, LEFT_W - 4);
    doc.text(nombreLines[0], M + 2, cy);
    cy += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    datosCliente.forEach(l => { doc.text(l, M + 2, cy); cy += 4.2; });

    // ── Columna derecha: DIAGNÓSTICO o DATOS DEL EQUIPO ──
    if (tieneDiag) {
        let dy = y + 6;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(tituloDiag, RIGHT_X, dy);
        dy += 5;

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        const diagLines = doc.splitTextToSize(diagnostico.trim(), RIGHT_W - 4);
        diagLines.slice(0, 8).forEach(l => { doc.text(l, RIGHT_X, dy); dy += 4.2; });
    } else if (tieneEquipoDer) {
        let dy = y + 6;
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('DATOS DEL EQUIPO', RIGHT_X, dy);
        dy += 5;

        camposEquipo.forEach(({ l, v }) => {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.grayText);
            doc.text(l, RIGHT_X, dy);
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            const vLines = doc.splitTextToSize(String(v), RIGHT_W - 22);
            doc.text(vLines[0], RIGHT_X + 20, dy);
            dy += 4.2;
        });
    }

    return y + cardH + 3;
}

// ── BLOQUE DATOS DEL EQUIPO (separado, con foto ANTES a la derecha) ───────────
// Muestra: marca/modelo, N°serie, ubicación, piso, sector

export function dibujarBloqueEquipoDetalle(doc, { item, y, pageW, fotoAntes = null, conBullet = false }) {
    if (!item) return y;

    const FOTO_W = 32;
    const FOTO_H = 28;
    const hasFoto = !!fotoAntes;
    const textW   = hasFoto ? CONTENT_W - FOTO_W - 6 : CONTENT_W;

    const serial  = item.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial) ? item.equipoSerial : null;
    const modelo  = item.modeloEquipo || item.equipoModelo || null;
    const marca   = item.marcaEquipo  || item.equipoMarca  || null;
    const ubic    = item.ubicacionEquipo || item.equipoUbicacion || null;
    const piso    = item.equipoPiso   || null;
    const sector  = item.equipoSector || null;

    const campos = [
        (modelo || marca) ? { l: 'EQUIPO', v: [marca, modelo].filter(Boolean).join(' · ') } : null,
        serial  ? { l: 'N° SERIE',  v: serial } : null,
        ubic    ? { l: 'UBICACIÓN', v: ubic   } : null,
        piso    ? { l: 'PISO',      v: piso   } : null,
        sector  ? { l: 'SECTOR',    v: sector  } : null,
    ].filter(Boolean);

    const cardH = Math.max(FOTO_H + 6, campos.length * 5.5 + 10);

    // Fondo card
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra de color izquierda (navy)
    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    // Título
    let ey = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(`${conBullet ? '• ' : ''}DATOS DEL EQUIPO`, M + 4, ey);
    ey += 5;

    // Foto ANTES a la derecha
    if (hasFoto) {
        try {
            doc.addImage(fotoAntes.data, fotoAntes.format, M + textW + 4, y + 4, FOTO_W, FOTO_H);
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.roundedRect(M + textW + 4, y + 4, FOTO_W, FOTO_H, 1, 1, 'S');
            // Etiqueta "ANTES"
            doc.setFontSize(6);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.grayText);
            doc.text('ANTES', M + textW + 4 + FOTO_W / 2, y + FOTO_H + 6, { align: 'center' });
        } catch {}
    }

    // Campos del equipo
    campos.forEach(({ l, v }) => {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(l, M + 4, ey);

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        const vLines = doc.splitTextToSize(String(v), textW - 24);
        doc.text(vLines[0], M + 28, ey);
        ey += 5.5;
    });

    return y + cardH + 3;
}

export function dibujarBloqueEquipoYTrabajo(doc, { item, trabajo, y, pageW, fotoAntes = null, tituloTrabajo = 'TRABAJO A REALIZAR', barraColor = C.gold || [212, 136, 0] }) {
    if (!item) return y;

    // Con foto → bloques separados (foto necesita espacio lateral del equipo)
    if (fotoAntes) {
        y = dibujarBloqueEquipoDetalle(doc, { item, y, pageW, fotoAntes });
        if (trabajo?.trim()) y = dibujarBloqueSolicitud(doc, { texto: trabajo, y, pageW });
        return y;
    }

    const serial = item.equipoSerial && !['MOSTRADOR', 'SIN-SN'].includes(item.equipoSerial) ? item.equipoSerial : null;
    const modelo = item.modeloEquipo || item.equipoModelo || null;
    const marca  = item.marcaEquipo  || item.equipoMarca  || null;
    const ubic   = item.ubicacionEquipo || item.equipoUbicacion || null;
    const piso   = item.equipoPiso   || null;
    const sector = item.equipoSector || null;

    const campos = [
        (modelo || marca) ? { l: 'EQUIPO',     v: [marca, modelo].filter(Boolean).join(' · ') } : null,
        serial            ? { l: 'N° SERIE',   v: serial } : null,
        ubic              ? { l: 'UBICACIÓN',  v: ubic   } : null,
        piso              ? { l: 'PISO',       v: piso   } : null,
        sector            ? { l: 'SECTOR',     v: sector  } : null,
    ].filter(Boolean);

    const tieneEquipo = campos.length > 0;
    const tieneTrabajo = !!(trabajo?.trim());

    // Alturas compactas: top5 + título4 + N*campo + bottom3
    const equipoH  = tieneEquipo  ? campos.length * 4.5 + 12 : 0;
    const trabajoH = tieneTrabajo ? Math.max(0, doc.splitTextToSize(trabajo.trim(), CONTENT_W - 12).slice(0, 6).length * 4 + 11) : 0;
    const sepH     = (tieneEquipo && tieneTrabajo) ? 4 : 0;
    const cardH    = Math.max(14, equipoH + sepH + trabajoH);

    // Card único
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra navy para sección equipo
    if (tieneEquipo) {
        doc.setFillColor(...C.navy);
        doc.roundedRect(M - 2, y, 3, tieneEquipo ? equipoH : cardH, 2, 2, 'F');
        doc.rect(M - 0.5, y, 1.5, tieneEquipo ? equipoH : cardH, 'F');
    }

    let ey = y + 5;
    if (tieneEquipo) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('DATOS DEL EQUIPO', M + 4, ey);
        ey += 4;
        campos.forEach(({ l, v }) => {
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.grayText);
            doc.text(l, M + 4, ey);
            doc.setFontSize(T.xxs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            const vLines = doc.splitTextToSize(String(v), CONTENT_W - 26);
            doc.text(vLines[0], M + 28, ey);
            ey += 4.5;
        });
    }

    if (tieneEquipo && tieneTrabajo) {
        // Línea divisora entre secciones
        const lineY = y + equipoH;
        doc.setDrawColor(...C.grayBorder);
        doc.setLineWidth(0.15);
        doc.line(M + 2, lineY, M + CONTENT_W - 2, lineY);
        ey = lineY + 4;
        // Barra gold para sección trabajo
        doc.setFillColor(...barraColor);
        const restH = cardH - equipoH;
        doc.roundedRect(M - 2, lineY, 3, restH, 2, 2, 'F');
        doc.rect(M - 0.5, lineY, 1.5, restH, 'F');
    }

    if (tieneTrabajo) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...barraColor);
        doc.text(tituloTrabajo, M + 6, ey);
        ey += 4;
        const lines = doc.splitTextToSize(trabajo.trim(), CONTENT_W - 12);
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.dark);
        lines.slice(0, 6).forEach(l => { doc.text(l, M + 6, ey); ey += 4; });
    }

    return y + cardH + 3;
}

export function dibujarBloqueSolicitud(doc, { texto, y, pageW }) {
    if (!texto || !texto.trim()) return y;

    const lines = doc.splitTextToSize(texto.trim(), CONTENT_W - 12);
    const cardH = Math.max(14, lines.length * 4.5 + 11);

    // Fondo con borde izquierdo dorado/gold
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra izquierda gold
    doc.setFillColor(...(C.gold || [212, 136, 0]));
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    let dy = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...(C.gold || [212, 136, 0]));
    doc.text('TRABAJO A REALIZAR', M + 6, dy);
    dy += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    lines.slice(0, 8).forEach(l => { doc.text(l, M + 6, dy); dy += 4.5; });

    return y + cardH + 3;
}

export function dibujarBloqueDiagnosticoDetalle(doc, { texto, y, pageW, titulo = '• TRABAJO REALIZADO' }) {
    if (!texto || !texto.trim()) return y;

    const lines  = doc.splitTextToSize(texto.trim(), CONTENT_W - 8);
    const cardH  = Math.max(18, lines.length * 4.5 + 14);

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.25);
    doc.roundedRect(M - 2, y, CONTENT_W + 4, cardH, 2, 2, 'FD');

    // Barra izquierda navy
    doc.setFillColor(...C.navy);
    doc.roundedRect(M - 2, y, 3, cardH, 2, 2, 'F');
    doc.rect(M - 0.5, y, 1.5, cardH, 'F');

    let dy = y + 7;
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(titulo, M + 4, dy);
    dy += 5;

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.dark);
    lines.forEach(l => { doc.text(l, M + 4, dy); dy += 4.5; });

    return y + cardH + 4;
}
