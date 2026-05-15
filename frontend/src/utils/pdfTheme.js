/**
 * pdfTheme.js — Sistema de diseño para PDFs
 * Principio: header ultra-compacto, logo única identidad, info derecha.
 */
import logoUrl from '../assets/logo-dispenser.png';

// ── Paleta ────────────────────────────────────────────────────────────────────
export const DARK       = [20,  18,  16 ];
export const RED        = [209, 58,  40 ];
export const GOLD       = [212, 136, 0  ];
export const WHITE      = [255, 255, 255];
export const GRAY_LIGHT = [245, 244, 242];
export const GRAY_MID   = [200, 196, 190];
export const GRAY_TEXT  = [120, 116, 110];
export const WARM_BORDER= [220, 212, 200];

// ── Datos empresa — se toman del perfil del usuario logueado ─────────────────
function getUsuario() {
    try { return JSON.parse(localStorage.getItem('auth_usuario') || '{}'); } catch { return {}; }
}
export function getEmpresa() {
    const u = getUsuario();
    return {
        contacto:  u.whatsapp || u.telefono || '',
        email:     'info@dispenserlatienda.com.ar',
        web:       'dispenserlatienda.com.ar',
        redes:     '@dispenserlatienda',
        tiktok:    '@dispenserlatienda',
    };
}

// ── Fecha ─────────────────────────────────────────────────────────────────────
export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// ── Header (todos los documentos) ─────────────────────────────────────────────
// Esquema:
//   [LOGO]               [Fecha: DD/MM/AAAA         ]
//   [Tel · WA]           [PP-DDMM-XX-01  (rojo bold) ]
//   [dirección]          [Téc: Nombre     (gris)      ]
//   ──────────────────────────────────────────────────
//   TÍTULO DEL DOCUMENTO (10pt, izquierda)
//
// Altura total del header normal  ≈ 46mm  → contenido empieza en y=46
// Altura total del header compacto ≈ 37mm → contenido empieza en y=37
export function dibujarHeaderPDF(doc, tipoLabel, fecha, subtitulo = null, nroDoc = null) {
    const pageW = doc.internal.pageSize.getWidth();

    // Banda superior roja
    doc.setFillColor(...RED);
    doc.rect(0, 0, pageW, 2.5, 'F');

    // Logo
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 6, 38, 15); } catch {}
    }

    // Datos de contacto de la empresa — debajo del logo
    const emp1 = getEmpresa();
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_TEXT);
    const linea1 = [emp1.contacto ? `WA: ${emp1.contacto}` : null, emp1.email ? `Email: ${emp1.email}` : null].filter(Boolean).join('  ·  ');
    const linea2 = [emp1.web ? `Web: ${emp1.web}` : null, emp1.redes ? `IG: ${emp1.redes}` : null].filter(Boolean).join('  ·  ');
    if (linea1) doc.text(linea1, 14, 27);
    if (linea2) doc.text(linea2, 14, 32);

    // Bloque derecho: fecha / nroDoc / técnico — alineados a la derecha
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(155, 150, 144);
    doc.text(`Fecha: ${fecha}`, pageW - 14, 12, { align: 'right' });

    if (nroDoc) {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RED);
        doc.text(nroDoc, pageW - 14, 20, { align: 'right' });
    }

    if (subtitulo) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(155, 150, 144);
        doc.text(subtitulo, pageW - 14, 27, { align: 'right' });
    }

    // Línea separadora fina
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, 36, pageW - 14, 36);

    // Título del documento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(tipoLabel, 14, 44);
}

// ── Footer ────────────────────────────────────────────────────────────────────
// Estructura (2 filas):
//   ────────────────────── línea separadora ──────────────────────
//   [leyenda/garantía centrada]
//   [Tel · WA  (izq)]                            [pág/total (der)]
//   ██████████████████████ banda roja ███████████████████████████
export function dibujarFooterPDF(doc, pagina = null, totalPaginas = null, textoCentral = null) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Banda inferior roja
    doc.setFillColor(...RED);
    doc.rect(0, pageH - 2, pageW, 2, 'F');

    // Línea sobre el footer (subida 2mm para dar espacio a 2 filas de texto)
    doc.setDrawColor(220, 216, 210);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);

    // Fila 1: leyenda / garantía — centrada
    if (textoCentral) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(155, 150, 144);
        doc.text(textoCentral, pageW / 2, pageH - 11, { align: 'center' });
    }

    // Fila 2: contacto izquierda + paginación derecha
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(155, 150, 144);
    const empF = getEmpresa();
    const footerContact = [empF.web, empF.email, empF.redes ? `IG: ${empF.redes}` : null].filter(Boolean).join('  ·  ');
    if (footerContact) doc.text(footerContact, 14, pageH - 5);

    if (pagina && totalPaginas && totalPaginas > 1) {
        doc.setFontSize(7);
        doc.text(`${pagina} / ${totalPaginas}`, pageW - 14, pageH - 5, { align: 'right' });
    }
}

