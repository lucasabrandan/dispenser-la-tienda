/**
 * informeTecnico.js — Informe por técnico (9-oct-2026).
 * Los trabajos elegidos de un técnico en un período: qué se hizo, dónde, con qué
 * repuestos y las fotos de antes/después. Opcional: montos y ganancia del negocio.
 * Ganancia = parte del negocio de la mano de obra + margen de los productos.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { C, M, T } from './theme.js';
import { dibujarHeaderCompacto, dibujarFooter } from './layout.js';
import { dibujarPaginaEvidencia } from './fotos.js';
import { resetFotosConError } from './helpers.js';

const fmt = v => `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const fecha = f => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');
const fechaCorta = f => fecha(f).slice(0, 5);
const ESTADO = {
    PRESUPUESTO: 'Presupuesto', APROBADO: 'Aprobado', EN_PROGRESO: 'En curso', COMPLETADO: 'Hecho',
    PENDIENTE_FACTURACION: 'A facturar', FACTURADO: 'Facturado', COBRADO: 'Cobrado', REALIZADO: 'Cobrado', ARCHIVADO: 'Cobrado',
};
export const estadoTexto = e => ESTADO[e] || e;

// Texto del trabajo: "N/S 123 · Cambio de filtro" por equipo + repuestos
export const textoTrabajo = t => (t.equipos || []).map(e =>
    [e.serie ? `N/S ${e.serie}` : null, e.trabajo].filter(Boolean).join(' · ')).join('\n') || 'Servicio técnico';
export const textoRepuestos = t => (t.equipos || []).flatMap(e => e.repuestos || [])
    .map(r => `${Number(r.cantidad || 1)} × ${r.nombre}`).join(', ');

// Quién tiene la plata de cada trabajo
export function textoCobro(t, tecnico = 'Técnico') {
    if (!t.cobrado) return 'Sin cobrar';
    if (t.cobradoPor === 'TECNICO') return `Cobró ${tecnico}`;
    if (t.cobradoPor === 'NEGOCIO') return 'Te pagaron a vos';
    return 'Cobrado (¿quién?)';
}

// Cuentas con el técnico: lo que le toca de lo ya cobrado contra la plata que tiene él.
// Lo cobrado sin dato de quién se toma como que te lo pagaron a vos (se avisa).
export function balanceInforme(trabajos, rendido = 0) {
    const s = (f, k = 'total') => trabajos.filter(f).reduce((a, t) => a + Number(t[k] || 0), 0);
    const cobroTecnico = s(t => t.cobrado && t.cobradoPor === 'TECNICO');
    const cobroNegocio = s(t => t.cobrado && t.cobradoPor === 'NEGOCIO');
    const sinDato = s(t => t.cobrado && !t.cobradoPor);
    const sinCobrar = s(t => !t.cobrado);
    const parteTecnico = s(t => t.cobrado, 'parteTecnico');
    const parteSinCobrar = s(t => !t.cobrado, 'parteTecnico');
    const enMano = cobroTecnico - Number(rendido || 0);
    const diferencia = parteTecnico - enMano; // > 0: le pagás vos · < 0: te da él
    return { cobroTecnico, cobroNegocio, sinDato, sinCobrar, parteTecnico, parteSinCobrar, rendido: Number(rendido || 0), enMano, diferencia,
        hayDudosos: trabajos.some(t => t.cobrado && !t.cobradoPor) };
}

export const textoDiferencia = (b, tecnico) => Math.round(b.diferencia) === 0 ? 'Están a mano'
    : b.diferencia > 0 ? `Le tenés que pagar a ${tecnico}` : `${tecnico} te tiene que dar`;

// Totales de los trabajos elegidos
export function totalesInforme(trabajos) {
    const s = k => trabajos.reduce((a, t) => a + Number(t[k] || 0), 0);
    const total = s('total'), ganancia = s('gananciaNegocio');
    return {
        cantidad: trabajos.length, total, productosVenta: s('productosVenta'), productosCosto: s('productosCosto'),
        impuestos: s('impuestos'), manoObraNeta: s('manoObraNeta'), parteTecnico: s('parteTecnico'),
        parteNegocio: s('parteNegocio'), margenProductos: s('margenProductos'), ganancia,
        margen: total > 0 ? (ganancia / total) * 100 : 0,
        costoIncompleto: trabajos.some(t => t.costoIncompleto),
    };
}

const nombreArchivo = (inf, ext) =>
    `informe-${(inf.tecnicoNombre || 'tecnico').toLowerCase().replace(/\s+/g, '-')}-${inf.desde}-al-${inf.hasta}.${ext}`;

export async function generarPDFInformeTecnico(inf, trabajos, { precios = true, ganancia = false } = {}) {
    if (!inf || !trabajos?.length) return;
    const loading = toast.loading('Generando PDF…');
    try {
        resetFotosConError();
        const conGanancia = precios && ganancia;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        dibujarHeaderCompacto(doc, { tipoLabel: 'Informe de trabajos', fecha: new Date().toLocaleDateString('es-AR'), tecnico: inf.tecnicoNombre });
        let y = 47;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(T.lg); doc.setTextColor(...C.navy);
        doc.text(`${inf.tecnicoNombre} — del ${fecha(inf.desde)} al ${fecha(inf.hasta)}`, M, y);
        y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(T.sm); doc.setTextColor(...C.grayText);
        doc.text(`${trabajos.length} trabajo${trabajos.length !== 1 ? 's' : ''}`, M, y);
        y += 4;

        // Resumen de plata (solo si se pide)
        const tot = totalesInforme(trabajos);
        if (precios) {
            const filas = [['Total de los trabajos', fmt(tot.total)]];
            if (conGanancia) {
                filas.push(
                    ['- Productos (precio de venta)', fmt(tot.productosVenta)],
                    [`- Impuestos ${inf.porcentajeImpuestos}% (solo con factura)`, fmt(tot.impuestos)],
                    ['= Mano de obra neta', fmt(tot.manoObraNeta)],
                    [`Parte ${inf.tecnicoNombre} (${inf.porcentajeTecnico}%)`, fmt(tot.parteTecnico)],
                    [`Parte del negocio (${100 - inf.porcentajeTecnico}%)`, fmt(tot.parteNegocio)],
                    ['+ Ganancia en productos (venta - costo)', fmt(tot.margenProductos)],
                    [`Ganancia del negocio · margen ${tot.margen.toFixed(1)}%`, fmt(tot.ganancia)],
                );
            }
            autoTable(doc, {
                startY: y, body: filas, theme: 'plain', margin: { left: M }, tableWidth: 120,
                styles: { fontSize: T.md, cellPadding: 1.5 },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: d => { if (d.row.index === filas.length - 1 && conGanancia) { d.cell.styles.textColor = C.gold; d.cell.styles.fontStyle = 'bold'; } },
            });
            y = doc.lastAutoTable.finalY + 4;

            // Cuentas con el técnico: quién cobró y la diferencia
            const nom = (inf.tecnicoNombre || 'Técnico').split(' ')[0];
            const b = balanceInforme(trabajos, inf.rendido);
            const cuentas = [
                [`Cobró ${nom} (la plata la tiene él)`, fmt(b.cobroTecnico)],
                ['Te pagaron a vos', fmt(b.cobroNegocio)],
            ];
            if (b.sinDato > 0) cuentas.push(['Cobrado sin saber quién (se toma como tuyo)', fmt(b.sinDato)]);
            if (b.sinCobrar > 0) cuentas.push(['Todavía sin cobrar (no entra en la cuenta)', fmt(b.sinCobrar)]);
            cuentas.push([`Le corresponde a ${nom} (${inf.porcentajeTecnico}% de la MO de lo cobrado)`, fmt(b.parteTecnico)]);
            if (b.rendido > 0) cuentas.push([`- Ya te rindió ${nom} (cierres del día)`, fmt(b.rendido)]);
            cuentas.push([`Diferencia: ${textoDiferencia(b, nom)}`, fmt(Math.abs(b.diferencia))]);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(T.md); doc.setTextColor(...C.navy);
            doc.text('Cuentas', M, y + 2);
            autoTable(doc, {
                startY: y + 4, body: cuentas, theme: 'plain', margin: { left: M }, tableWidth: 140,
                styles: { fontSize: T.sm + 0.5, cellPadding: 1.4 },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: d => { if (d.row.index === cuentas.length - 1) { d.cell.styles.textColor = C.gold; d.cell.styles.fontStyle = 'bold'; } },
            });
            y = doc.lastAutoTable.finalY + 5;
        }

        // Tabla de trabajos
        const head = ['Fecha', 'Cliente / dirección', 'Trabajo', 'Estado'];
        if (precios) head.push('Cobro', 'Total');
        if (conGanancia) head.push('Técnico', 'Ganancia', '%');
        const body = trabajos.map(t => {
            const rep = textoRepuestos(t);
            const fila = [fechaCorta(t.fecha), `${t.cliente}${t.direccion ? '\n' + t.direccion : ''}`,
                textoTrabajo(t) + (rep ? `\nRepuestos: ${rep}` : ''), estadoTexto(t.estado)];
            if (precios) fila.push(textoCobro(t, (inf.tecnicoNombre || '').split(' ')[0]), fmt(t.total));
            if (conGanancia) fila.push(fmt(t.parteTecnico), fmt(t.gananciaNegocio) + (t.costoIncompleto ? ' *' : ''), `${Number(t.margenPorcentaje || 0).toFixed(0)}%`);
            return fila;
        });
        if (precios) {
            const pie = [{ content: `TOTAL (${trabajos.length})`, colSpan: 5, styles: { fontStyle: 'bold' } }, { content: fmt(tot.total), styles: { fontStyle: 'bold' } }];
            if (conGanancia) pie.push({ content: fmt(tot.parteTecnico), styles: { fontStyle: 'bold' } },
                { content: fmt(tot.ganancia), styles: { fontStyle: 'bold', textColor: C.gold } },
                { content: `${tot.margen.toFixed(0)}%`, styles: { fontStyle: 'bold' } });
            body.push(pie);
        }
        const cols = { 0: { cellWidth: 11 }, 1: { cellWidth: conGanancia ? 32 : 44 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 15 } };
        if (precios) Object.assign(cols, { 4: { cellWidth: 18 }, 5: { cellWidth: 19, halign: 'right' } });
        if (conGanancia) Object.assign(cols, { 6: { cellWidth: 18, halign: 'right' }, 7: { cellWidth: 19, halign: 'right', textColor: C.gold }, 8: { cellWidth: 9, halign: 'right' } });
        autoTable(doc, {
            startY: y, head: [head], body,
            margin: { left: M, right: M, top: 20 },
            styles: { fontSize: T.xs + 0.5, cellPadding: 1.8, overflow: 'linebreak', valign: 'top' },
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: T.xs },
            alternateRowStyles: { fillColor: C.grayZebra },
            columnStyles: cols,
        });
        y = doc.lastAutoTable.finalY + 5;
        if (conGanancia && tot.costoIncompleto) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(T.xs); doc.setTextColor(...C.grayText);
            doc.text('* Algún producto no tiene costo cargado: la ganancia de ese trabajo puede ser menor.', M, Math.min(y, doc.internal.pageSize.getHeight() - 18), { maxWidth: pageW - M * 2 });
        }

        // Fotos de antes y después (una fila por equipo que tenga fotos)
        const items = trabajos.flatMap(t => (t.equipos || []).map(e => ({
            fotoAntes: e.fotoAntes, fotoDespues: e.fotoDespues,
            equipoSerial: e.serie || '',
            modeloEquipo: `${fechaCorta(t.fecha)} · ${t.cliente}`,
            ubicacionEquipo: e.trabajo || '',
        })));
        if (items.some(i => i.fotoAntes || i.fotoDespues)) {
            await dibujarPaginaEvidencia(doc, items, new Date().toLocaleDateString('es-AR'), null, {
                tipoLabel: 'FOTOS DE LOS TRABAJOS', subtitulo: 'ANTES Y DESPUÉS',
            });
        }

        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) { doc.setPage(i); dibujarFooter(doc, { pagina: i, totalPaginas: total }); }
        doc.save(nombreArchivo(inf, 'pdf'));
        toast.success('PDF generado', { id: loading });
    } catch (e) {
        console.error('Error generando informe por técnico:', e);
        toast.error('No se pudo generar el PDF', { id: loading });
    }
}

export async function generarExcelInformeTecnico(inf, trabajos, { precios = true, ganancia = false } = {}) {
    if (!inf || !trabajos?.length) return;
    const XLSX = await import('xlsx');
    const conGanancia = precios && ganancia;
    const filas = trabajos.map(t => {
        const f = {
            Fecha: fecha(t.fecha), Cliente: t.cliente, Dirección: t.direccion || '',
            'N/S': (t.equipos || []).map(e => e.serie).filter(Boolean).join(', '),
            Trabajo: (t.equipos || []).map(e => e.trabajo).filter(Boolean).join(' / '),
            Repuestos: textoRepuestos(t), Estado: estadoTexto(t.estado), Modalidad: t.cobro,
        };
        if (precios) { f['Quién cobró'] = textoCobro(t, (inf.tecnicoNombre || '').split(' ')[0]); f.Total = Number(t.total); }
        if (conGanancia) Object.assign(f, {
            'Productos (venta)': Number(t.productosVenta), 'Productos (costo)': Number(t.productosCosto),
            Impuestos: Number(t.impuestos), 'Mano de obra neta': Number(t.manoObraNeta),
            [`Parte ${inf.tecnicoNombre}`]: Number(t.parteTecnico), 'Parte negocio': Number(t.parteNegocio),
            'Ganancia productos': Number(t.margenProductos), 'Ganancia negocio': Number(t.gananciaNegocio),
            'Margen %': Number(t.margenPorcentaje), 'Falta costo': t.costoIncompleto ? 'Sí' : '',
        });
        return f;
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = Object.keys(filas[0]).map(k => ({ wch: ['Trabajo', 'Repuestos'].includes(k) ? 45 : ['Cliente', 'Dirección'].includes(k) ? 28 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trabajos');
    if (precios) {
        const nom = (inf.tecnicoNombre || 'Técnico').split(' ')[0];
        const b = balanceInforme(trabajos, inf.rendido);
        const c = [
            { Concepto: `Cobró ${nom}`, Monto: b.cobroTecnico },
            { Concepto: 'Te pagaron a vos', Monto: b.cobroNegocio },
            { Concepto: 'Cobrado sin saber quién (se toma como tuyo)', Monto: b.sinDato },
            { Concepto: 'Sin cobrar (no entra)', Monto: b.sinCobrar },
            { Concepto: `Le corresponde a ${nom}`, Monto: b.parteTecnico },
            { Concepto: `Ya te rindió ${nom}`, Monto: b.rendido },
            { Concepto: `Diferencia: ${textoDiferencia(b, nom)}`, Monto: Math.abs(b.diferencia) },
        ];
        const wc = XLSX.utils.json_to_sheet(c);
        wc['!cols'] = [{ wch: 48 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, wc, 'Cuentas');
    }
    XLSX.writeFile(wb, nombreArchivo(inf, 'xlsx'));
}
