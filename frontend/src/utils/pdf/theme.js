import logoUrl from '../../assets/logo-dispenser.png';

export const C = {
    navy:       [13,  43,  91 ],
    navyLight:  [30,  65,  120],
    red:        [217, 30,  24 ],
    redLight:   [254, 242, 242],
    white:      [255, 255, 255],
    grayBg:     [245, 246, 248],
    grayText:   [75,  85,  99 ],
    grayBorder: [209, 213, 219],
    grayZebra:  [249, 250, 251],
    grayLight:  [248, 249, 250],
    dark:       [17,  24,  39 ],
    green:      [31,  157, 85 ],
    greenLight: [240, 253, 244],
    gold:       [180, 120, 0  ],
};

export const LOGO_URL = logoUrl;
export const M          = 14;
export const PAGE_W     = 210;
export const PAGE_H     = 297;
export const FOOTER_SAFE = 22;
export const CONTENT_W  = PAGE_W - M * 2;

export const HEADER_H = {
    normal:  52,
    compact: 32,
};

export const T = {
    xxl:   22,
    xl:    16,
    lg:    13,
    md:    10,
    sm:    8.5,
    xs:    7.5,
    xxs:   6.5,
    label: 6,
};

export function getEmpresa() {
    try {
        const u = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
        return {
            nombre:           'DISPENSER LA TIENDA',
            eslogan:          'SERVICIO TÉCNICO ESPECIALIZADO',
            telefono:         u.telefono         || '',
            whatsapp:         u.whatsapp         || '',
            web:              'www.dispenserlatienda.com.ar',
            email:            'info@dispenserlatienda.com.ar',
            instagram:        '@dispenserlatienda',
            tiktok:           '@dispenserlatienda',
            googleReviewLink: localStorage.getItem('empresa_google_review') || '',
            condicionesPDF:   localStorage.getItem('empresa_condiciones_pdf') || '',
        };
    } catch {
        return {
            nombre: 'DISPENSER LA TIENDA', eslogan: 'SERVICIO TÉCNICO ESPECIALIZADO',
            telefono: '', whatsapp: '', web: 'www.dispenserlatienda.com.ar', email: 'info@dispenserlatienda.com.ar', instagram: '@dispenserlatienda', tiktok: '@dispenserlatienda', googleReviewLink: '', condicionesPDF: '',
        };
    }
}

export function procesarFecha(f) {
    try {
        if (!f) return new Date().toLocaleDateString('es-AR');
        const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
    } catch { return new Date().toLocaleDateString('es-AR'); }
}

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
