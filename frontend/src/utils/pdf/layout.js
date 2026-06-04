import { C, LOGO_URL, M, T, getEmpresa, HEADER_H } from './theme.js';

// ── HEADER PRINCIPAL ──────────────────────────────────────────────────────────
// Logo + empresa izquierda, info boxes + badge derecha, divisor rojo, título
export function dibujarHeader(doc, { tipoLabel, fecha, tecnico = null, nroDoc = null, estado = null }) {
    const pageW  = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Logo
    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 5, 36, 14); } catch {}
    }

    // Nombre y eslogan
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(empresa.nombre, M, 24);

    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(empresa.eslogan, M, 29);

    const lineas = [
        [empresa.telefono, empresa.whatsapp].filter(Boolean).map((v, i) => i === 0 ? `Tel: ${v}` : `WA: ${v}`).join('  ·  '),
        [empresa.web, empresa.email].filter(Boolean).join('  ·  '),
    ].filter(Boolean);
    lineas.forEach((l, i) => {
        doc.setFontSize(T.label);
        doc.text(l, M, 34 + i * 5);
    });

    // ── Info boxes derecha ──
    const BOX_W = 70;
    const BOX_X = pageW - M - BOX_W;
    const ROW_H = 8;

    const infoRows = [
        { l: 'FECHA',        v: fecha             },
        ...(nroDoc   ? [{ l: 'N° DOCUMENTO', v: nroDoc   }] : []),
        ...(tecnico  ? [{ l: 'TÉCNICO',      v: tecnico  }] : []),
    ];
    const boxH = infoRows.length * ROW_H;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(BOX_X, 5, BOX_W, boxH, 2, 2, 'FD');

    infoRows.forEach(({ l, v }, i) => {
        const ry = 5 + i * ROW_H;
        if (i > 0) {
            doc.setDrawColor(...C.grayBorder);
            doc.setLineWidth(0.15);
            doc.line(BOX_X, ry, BOX_X + BOX_W, ry);
        }
        // Fondo etiqueta
        doc.setFillColor(...C.grayBg);
        doc.rect(BOX_X + 0.3, ry + (i === 0 ? 0.3 : 0), 28, ROW_H - (i === infoRows.length - 1 ? 0.3 : 0), 'F');

        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(l, BOX_X + 3, ry + 5.2);

        // Valor (truncar si no entra)
        const maxVW = BOX_W - 33;
        let vStr = String(v || '');
        const scaleFactor = doc.internal.scaleFactor;
        while (vStr.length > 3 && doc.getStringUnitWidth(vStr) * T.xxs / scaleFactor > maxVW) {
            vStr = vStr.slice(0, -1);
        }
        if (String(v || '').length > vStr.length) vStr = vStr.slice(0, -1) + '…';

        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.dark);
        doc.text(vStr, BOX_X + BOX_W - 3, ry + 5.2, { align: 'right' });
    });

    // Badge estado
    if (estado) {
        const badgeY = 5 + boxH + 3;
        const LABELS = {
            COMPLETADO:  'SERVICIO COMPLETADO',
            PRESUPUESTO: 'PRESUPUESTO',
            INFORME:     'INFORME TÉCNICO',
        };
        const COLORS = {
            COMPLETADO:  C.green,
            PRESUPUESTO: C.gold,
            INFORME:     C.navy,
        };
        const bText  = LABELS[estado]  || estado;
        const bColor = COLORS[estado]  || C.navy;

        doc.setFillColor(...bColor);
        doc.roundedRect(BOX_X, badgeY, BOX_W, 7, 1.5, 1.5, 'F');
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.white);
        doc.text(bText, BOX_X + BOX_W / 2, badgeY + 4.7, { align: 'center' });
    }

    // Línea roja divisora
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.9);
    doc.line(M, HEADER_H.normal - 2, pageW - M, HEADER_H.normal - 2);

    // Título documento
    doc.setFontSize(T.lg);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(tipoLabel.toUpperCase(), M, HEADER_H.normal + 5);
}

// ── HEADER COMPACTO (todas las páginas) ──────────────────────────────────────
export function dibujarHeaderCompacto(doc, { tipoLabel, fecha, tecnico = null, nroDoc = null }) {
    const pageW   = doc.internal.pageSize.getWidth();
    const empresa = getEmpresa();

    // Logo grande — presencia de marca
    if (LOGO_URL) {
        try { doc.addImage(LOGO_URL, 'PNG', M, 3, 32, 13); } catch {}
    }

    // Nombre empresa — bold, grande
    const textX = M + 35;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.dark);
    doc.text(empresa.nombre, textX, 8);

    // Eslogan
    doc.setFontSize(T.xxs);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(empresa.eslogan, textX, 13);

    // Contacto
    const contactLine = [empresa.web, empresa.email].filter(Boolean).join('  ·  ');
    doc.setFontSize(T.label);
    doc.text(contactLine, textX, 17.5);

    // Info derecha — fecha + nroDoc + técnico
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    doc.text(`Fecha: ${fecha}`, pageW - M, 7, { align: 'right' });

    if (nroDoc) {
        doc.setFontSize(T.sm);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(nroDoc, pageW - M, 13, { align: 'right' });
    }

    if (tecnico) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.grayText);
        doc.text(`Téc: ${tecnico}`, pageW - M, 18.5, { align: 'right' });
    }

    // Línea roja marca — más gruesa, más presencia
    doc.setDrawColor(...C.red);
    doc.setLineWidth(1.2);
    doc.line(M, HEADER_H.compact - 3, pageW - M, HEADER_H.compact - 3);

    // Título del documento
    doc.setFontSize(T.sm + 0.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(tipoLabel.toUpperCase(), M, HEADER_H.compact + 2);
}

// ── HEADER MINI (página de fotos — solo título + nroDoc + línea) ──────────────
export function dibujarHeaderMini(doc, { tipoLabel, nroDoc = null }) {
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(T.sm);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.navy);
    doc.text(tipoLabel.toUpperCase(), M, 9);

    if (nroDoc) {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.grayText);
        doc.text(nroDoc, pageW - M, 9, { align: 'right' });
    }

    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.4);
    doc.line(M, 13, pageW - M, 13);
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
export function dibujarFooter(doc, { pagina = null, totalPaginas = null, textoCentral = null, conEstrellas = false }) {
    const pageW   = doc.internal.pageSize.getWidth();
    const pageH   = doc.internal.pageSize.getHeight();
    const empresa = getEmpresa();

    // Línea roja sutil (consistente con header)
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.5);
    doc.line(M, pageH - 15, pageW - M, pageH - 15);

    // Fila 1: mensaje o texto central
    if (textoCentral) {
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.grayText);
        doc.text(textoCentral, pageW / 2, pageH - 10, { align: 'center' });
    } else {
        doc.setFontSize(T.xs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('Gracias por confiar en nosotros', pageW / 2, pageH - 10, { align: 'center' });
    }

    // Fila 2: web + redes centradas
    doc.setFontSize(T.label);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.grayText);
    const contacto = [
        empresa.web,
        empresa.email,
        empresa.instagram ? `IG: ${empresa.instagram}` : null,
        empresa.tiktok ? `TikTok: ${empresa.tiktok}` : null,
    ].filter(Boolean).join('    ·    ');
    doc.text(contacto, pageW / 2, pageH - 5, { align: 'center' });

    // Paginación derecha
    if (pagina && totalPaginas) {
        doc.setFontSize(T.xxs);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text(`${pagina} / ${totalPaginas}`, pageW - M, pageH - 5, { align: 'right' });
    }
}
