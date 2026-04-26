/**
 * theme.js — Tokens del sistema de diseño corporativo para PDFs
 * Paleta: Navy #0D2B5B + Red #D91E18
 */
import logoUrl from '../../assets/logo-dispenser.png';

export const C = {
    navy:       [13,  43,  91 ],  // #0D2B5B — header, tabla header
    navyLight:  [30,  65,  120],  // hover / secondary navy
    red:        [217, 30,  24 ],  // #D91E18 — acento, totales, labels
    redLight:   [254, 242, 242],  // fondo sutil rojo
    white:      [255, 255, 255],
    grayBg:     [245, 246, 248],  // #F5F6F8 — fondo cards
    grayText:   [75,  85,  99 ],  // #4B5563 — texto secundario
    grayBorder: [209, 213, 219],  // #D1D5DB — bordes
    grayZebra:  [249, 250, 251],  // filas alternas tabla
    grayLight:  [248, 249, 250],  // fondo bloque cliente
    dark:       [17,  24,  39 ],  // #111827 — texto principal
    green:      [31,  157, 85 ],  // #1F9D55 — estado "completado"
    greenLight: [240, 253, 244],  // fondo verde sutil
    gold:       [180, 120, 0  ],  // acento dorado (garantía)
};

export const LOGO_URL = logoUrl;

// Márgenes y geometría A4
export const M    = 14;          // margen horizontal
export const PAGE_W = 210;
export const PAGE_H = 297;
export const FOOTER_SAFE = 25;   // zona reservada abajo (footer + buffer)
export const CONTENT_W = PAGE_W - M * 2;  // 182mm

// Alturas de header según modo
export const HEADER_H = {
    normal:  46,
    compact: 38,
};

// Tipografía — tamaños usados en todo el sistema
export const T = {
    xxl:    22,
    xl:     16,
    lg:     13,
    md:     10,
    sm:     8.5,
    xs:     7.5,
    xxs:    6.5,
    label:  6,
};

// Datos de la empresa — desde el perfil del usuario logueado
export function getEmpresa() {
    try {
        const u = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
        return {
            nombre:            'DISPENSER LA TIENDA',
            eslogan:           'SERVICIO TÉCNICO ESPECIALIZADO',
            telefono:          u.telefono          || '',
            whatsapp:          u.whatsapp          || '',
            direccion:         'Buenos Aires, Argentina',
            web:               'www.dispenserlatienda.com',
            googleReviewLink:  localStorage.getItem('empresa_google_review') || '',
        };
    } catch { return { nombre: 'DISPENSER LA TIENDA', eslogan: 'SERVICIO TÉCNICO ESPECIALIZADO', telefono: '', whatsapp: '', direccion: '', web: '', googleReviewLink: '' }; }
}

export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

// Número de documento único por día
export function generarNroDocumento(prefijo, fecha, tecnico) {
    const p = (fecha || '').split('/');
    const ddmm = p.length >= 2 ? `${p[0].padStart(2,'0')}${p[1].padStart(2,'0')}` : '0101';
    const palabras = (tecnico || 'TEC').trim().split(/\s+/);
    const ini = palabras.length >= 2
        ? (palabras[0][0] + palabras[1][0]).toUpperCase()
        : palabras[0].substring(0, 3).toUpperCase();
    const key = `pdf_counter_${prefijo}_${ddmm}`;
    const n = (parseInt(localStorage.getItem(key) || '0')) + 1;
    localStorage.setItem(key, n.toString());
    return `${prefijo}-${ddmm}-${ini}-${String(n).padStart(2,'0')}`;
}
