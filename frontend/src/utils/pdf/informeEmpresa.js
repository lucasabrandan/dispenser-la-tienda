import jsPDF from 'jspdf';
import { C, M, T, CONTENT_W, HEADER_H } from './theme.js';
import { dibujarHeaderCompacto, dibujarFooter } from './layout.js';
import { cargarFoto, fitEnCaja } from './helpers.js';

// Portal Empresa — etapa 2 (7-oct-2026): informe de un pedido para la empresa.
// Sin precios: equipo, qué se hizo, repuestos, garantía y fotos antes/después.
const fmt = (iso) => {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

export async function generarInformeEmpresa({ pedido, items }) {
    const doc = new jsPDF();
    const pageH = doc.internal.pageSize.getHeight();
    const LIMITE = pageH - 24;
    const fecha = fmt(items[0]?.fecha) || new Date().toLocaleDateString('es-AR');
    const tecnico = [...new Set(items.map(i => i.tecnico).filter(Boolean))].join(', ');
    const header = () => dibujarHeaderCompacto(doc, { tipoLabel: 'Informe de servicio técnico', fecha, tecnico, nroDoc: `Pedido #${pedido.id}` });
    header();
    let y = HEADER_H.compact + 9;
    const nuevaPagina = () => { doc.addPage(); header(); y = HEADER_H.compact + 9; };
    const espacio = (h) => { if (y + h > LIMITE) nuevaPagina(); };

    // Datos del pedido
    doc.setFillColor(...C.grayBg);
    const datos = [
        ['Cliente', pedido.clienteNombre || ''],
        ['Lugar', [pedido.lugar && pedido.lugar !== pedido.direccion ? pedido.lugar : null, pedido.direccion].filter(Boolean).join(' · ')],
        ['Pedido', `${pedido.motivo || ''}${pedido.creadoEn ? ' — cargado el ' + fmt(pedido.creadoEn) : ''}`],
    ];
    doc.roundedRect(M, y, CONTENT_W, 7 + datos.length * 5.5, 2, 2, 'F');
    let yy = y + 6;
    datos.forEach(([k, v]) => {
        doc.setFontSize(T.xs); doc.setFont(undefined, 'bold'); doc.setTextColor(...C.grayText);
        doc.text(k.toUpperCase(), M + 4, yy);
        doc.setFont(undefined, 'normal'); doc.setTextColor(...C.dark); doc.setFontSize(T.sm);
        doc.text(doc.splitTextToSize(v, CONTENT_W - 32)[0] || '', M + 26, yy);
        yy += 5.5;
    });
    y += 11 + datos.length * 5.5;

    // Cargar fotos (en paralelo, reducidas)
    const fotos = await Promise.all(items.map(async it => ({
        antes: it.fotoAntes ? await cargarFoto(it.fotoAntes, 900, 0.78) : null,
        despues: it.fotoDespues ? await cargarFoto(it.fotoDespues, 900, 0.78) : null,
    })));

    items.forEach((it, i) => {
        const trabajo = doc.splitTextToSize(it.trabajo || 'Sin detalle', CONTENT_W - 8);
        const reps = (it.repuestos || []).map(r => `${r.cantidad || 1} × ${r.nombre}`).join('   ·   ');
        const repsLineas = reps ? doc.splitTextToSize(reps, CONTENT_W - 8) : [];
        const alto = 12 + trabajo.length * 4.4 + (repsLineas.length ? 6 + repsLineas.length * 4.2 : 0) + (it.garantiaHasta ? 6 : 0);
        espacio(alto + 4);

        doc.setDrawColor(...C.grayBorder); doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CONTENT_W, alto, 2, 2, 'S');
        doc.setFontSize(T.md); doc.setFont(undefined, 'bold'); doc.setTextColor(...C.navy);
        doc.text(it.serie ? `Equipo N/S ${it.serie}` : `Equipo ${i + 1}`, M + 4, y + 7);
        doc.setFontSize(T.xs); doc.setFont(undefined, 'normal'); doc.setTextColor(...C.grayText);
        doc.text([fmt(it.fecha), it.tecnico ? `Técnico: ${it.tecnico}` : null].filter(Boolean).join('   ·   '), M + CONTENT_W - 4, y + 7, { align: 'right' });
        let ty = y + 13;
        doc.setFontSize(T.sm); doc.setTextColor(...C.dark);
        doc.text(trabajo, M + 4, ty); ty += trabajo.length * 4.4;
        if (repsLineas.length) {
            ty += 2;
            doc.setFont(undefined, 'bold'); doc.setFontSize(T.xs); doc.setTextColor(...C.grayText);
            doc.text('REPUESTOS', M + 4, ty); ty += 4;
            doc.setFont(undefined, 'normal'); doc.setFontSize(T.sm); doc.setTextColor(...C.dark);
            doc.text(repsLineas, M + 4, ty); ty += repsLineas.length * 4.2;
        }
        if (it.garantiaHasta) {
            ty += 2;
            doc.setFont(undefined, 'bold'); doc.setFontSize(T.xs); doc.setTextColor(...C.green);
            doc.text(`En garantía hasta el ${fmt(it.garantiaHasta)}`, M + 4, ty);
        }
        y += alto + 4;

        // Fotos antes / después
        const f = fotos[i];
        if (f.antes || f.despues) {
            const w = (CONTENT_W - 4) / 2, h = 62;
            espacio(h + 9);
            [['ANTES', f.antes], ['DESPUÉS', f.despues]].forEach(([lab, foto], k) => {
                const x = M + k * (w + 4);
                doc.setFontSize(T.label); doc.setFont(undefined, 'bold'); doc.setTextColor(...C.grayText);
                doc.text(lab, x, y + 3);
                doc.setFillColor(...C.grayLight);
                doc.rect(x, y + 5, w, h, 'F');
                if (foto) {
                    const { w: fw, h: fh } = fitEnCaja(foto.w, foto.h, w, h);
                    try { doc.addImage(foto.data, foto.format, x + (w - fw) / 2, y + 5 + (h - fh) / 2, fw, fh); } catch { /* */ }
                } else {
                    doc.setFontSize(T.xs); doc.setFont(undefined, 'normal');
                    doc.text('Sin foto', x + w / 2, y + 5 + h / 2, { align: 'center' });
                }
            });
            y += h + 10;
        }
    });

    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        dibujarFooter(doc, { pagina: p, totalPaginas: total, textoCentral: 'Informe generado desde el portal de Dispenser La Tienda' });
    }
    doc.save(`Informe-pedido-${pedido.id}.pdf`);
}
