/**
 * index.js — Generador PDF corporativo para Dispenser La Tienda
 *
 * Tipos de documento:
 *   PRESUPUESTO        → 1 o multi equipo, técnico o venta
 *   ORDEN_SERVICIO     → servicio completado con firmas y garantía
 *   COMPROBANTE        → recibo de venta de productos
 *   INFORME_TECNICO    → servicio con checklist + próximo mantenimiento
 *   ANEXO_FOTOGRAFICO  → solo evidencia fotográfica
 *
 * API compatible con generadorPdfRemito (wrapper en ese archivo).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { C, M, T, procesarFecha, generarNroDocumento, HEADER_H } from './theme.js';
import { dibujarHeader, dibujarHeaderCompacto, dibujarFooter } from './layout.js';
import {
    dibujarBloqueCliente,
    dibujarBloqueEquipo,
    dibujarBloqueTotal,
    dibujarFormasDePago,
    dibujarFirmas,
    dibujarChecklist,
    dibujarProximoMantenimiento,
    dibujarGarantia,
    dibujarQRWhatsApp,
    dibujarQRGoogle,
    dibujarResumenEjecutivo,
} from './bloques.js';
import { cargarFoto, divisor, checkSalto } from './helpers.js';
import { dibujarPaginaEvidencia } from './fotos.js';

// ── Detección automática de tipo ──────────────────────────────────────────────
function detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado }) {
    if (tipo) return tipo;
    if (esPresupuesto) return 'PRESUPUESTO';
    const esTecnico = esTecnicoForzado !== null && esTecnicoForzado !== undefined
        ? esTecnicoForzado
        : ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
    return esTecnico ? 'ORDEN_SERVICIO' : 'COMPROBANTE';
}

function getLabelTipo(tipo, esMulti) {
    const multi = esMulti ? ' — MULTI EQUIPOS' : '';
    switch (tipo) {
        case 'PRESUPUESTO':       return `PRESUPUESTO DE SERVICIO TÉCNICO${multi}`;
        case 'ORDEN_SERVICIO':    return `ORDEN DE SERVICIO TÉCNICO${multi}`;
        case 'COMPROBANTE':       return 'COMPROBANTE DE VENTA';
        case 'INFORME_TECNICO':   return `INFORME TÉCNICO${multi}`;
        case 'ANEXO_FOTOGRAFICO': return 'ANEXO FOTOGRÁFICO';
        default:                  return tipo;
    }
}

function getPrefijoNro(tipo) {
    switch (tipo) {
        case 'PRESUPUESTO':    return 'PP';
        case 'ORDEN_SERVICIO': return 'OS';
        case 'COMPROBANTE':    return 'CV';
        case 'INFORME_TECNICO':return 'IT';
        default:               return 'DC';
    }
}

// ── Generador venta (tabla de productos) ─────────────────────────────────────
async function generarVenta(doc, { ticketItems, y, pageW, descuentoPct, esPresupuesto }) {
    const pageH = doc.internal.pageSize.getHeight();
    const PROD_W = 18;
    const PROD_H = 18;

    const filas = [];
    ticketItems.forEach(item => {
        (item.repuestosUsados || []).forEach(r => {
            filas.push({ fotoSrc: r.fotoUrl || null,
                row: ['', r.nombre, r.sku || '—', r.cantidad.toString(),
                      `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                      `$ ${Number(r.subtotal || r.precio * r.cantidad).toLocaleString('es-AR')}`] });
        });
        if (item.costoExtra > 0) {
            filas.push({ fotoSrc: null,
                row: ['', 'Envío / Logística', '—', '1', '—', `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`] });
        }
    });

    if (filas.length === 0) return y;

    const fotos = await Promise.all(filas.map(f => cargarFoto(f.fotoSrc)));

    autoTable(doc, {
        startY: y,
        head: [['', 'Producto', 'SKU', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: filas.map(f => f.row),
        theme: 'grid',
        headStyles: {
            fillColor: C.navy, textColor: C.white, fontStyle: 'bold',
            fontSize: T.xxs, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
        bodyStyles: {
            fontSize: T.xs, textColor: C.dark,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            minCellHeight: PROD_H + 4, valign: 'middle',
            lineColor: C.grayBorder, lineWidth: 0.1,
        },
        columnStyles: {
            0: { cellWidth: PROD_W + 4 },
            1: { cellWidth: 'auto' },
            2: { textColor: C.grayText, fontSize: T.xxs, cellWidth: 18 },
            3: { halign: 'center', cellWidth: 14 },
            4: { halign: 'right',  cellWidth: 24 },
            5: { halign: 'right',  fontStyle: 'bold', cellWidth: 26 },
        },
        margin: { left: M, right: M },
        didParseCell: data => {
            if (data.section === 'body' && data.row.index % 2 === 0)
                data.cell.styles.fillColor = C.grayZebra;
        },
        didDrawCell: data => {
            if (data.section === 'body' && data.column.index === 0) {
                const foto = fotos[data.row.index];
                if (foto) {
                    const ix = data.cell.x + (data.cell.width  - PROD_W) / 2;
                    const iy = data.cell.y + (data.cell.height - PROD_H) / 2;
                    doc.addImage(foto.data, foto.format, ix, iy, PROD_W, PROD_H);
                }
            }
        }
    });

    return doc.lastAutoTable.finalY + 8;
}

// ── Generador técnico (1 o multi equipos) ─────────────────────────────────────
async function generarTecnico(doc, {
    ticketItems, y, pageW, pageH, esPresupuesto,
    esInforme = false,
}) {
    const esSolaHoja = ticketItems.length === 1;

    for (const [idx, item] of ticketItems.entries()) {
        // Background card
        const estimadoH = 70 + (item.repuestosUsados?.length || 0) * 6;
        y = checkSalto(doc, y, estimadoH);

        const cardY = y - 3;
        doc.setFillColor(...C.grayBg);
        doc.roundedRect(M - 2, cardY, pageW - (M - 2) * 2, Math.min(estimadoH, pageH - 50 - cardY), 3, 3, 'F');

        y = await dibujarBloqueEquipo(doc, { item, idx, y, pageW, esPresupuesto, esSolaHoja });

        // Checklist para informes técnicos
        if (esInforme && item.checklist?.length > 0) {
            y = checkSalto(doc, y, 40);
            y = dibujarChecklist(doc, { y, items: item.checklist, pageW });
        }

        // Estado final (informe)
        if (esInforme && item.estadoFinal) {
            y = checkSalto(doc, y, 14);
            doc.setFontSize(T.label);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...C.navy);
            doc.text('ESTADO FINAL', M, y);
            y += 5;
            doc.setFontSize(T.xs);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(...C.dark);
            doc.text(item.estadoFinal, M, y);
            y += 8;
        }

        // Separador entre equipos
        if (!esSolaHoja && idx < ticketItems.length - 1) {
            y += 4;
            divisor(doc, y, C.grayBorder, pageW);
            y += 6;
        }
    }

    return y;
}

// ── GENERADOR PRINCIPAL ───────────────────────────────────────────────────────
export const generarPDF = async ({
    // Tipo de documento (si no se pasa, se detecta automáticamente)
    tipo = null,
    // Backward compat
    esPresupuesto = false,
    esTecnicoForzado = null,
    // Datos
    cliente,
    sede,
    tecnico,
    ticketItems = [],
    fechaServicio,
    descuentoPorcentaje = 0,
    leyenda = '',
    servicioId = null,
    firmaDataUrl = null,
    // Extras para INFORME_TECNICO
    proximoMantenimiento = null,
    garantiaTexto = null,
    estadoFinal = null,
    googleReviewLink = null,
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }

    const tipoDetectado = detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado });
    const esTecnico = tipoDetectado !== 'COMPROBANTE';
    const esMulti   = ticketItems.length > 1;
    const doc       = new jsPDF();
    const pageW     = doc.internal.pageSize.getWidth();
    const pageH     = doc.internal.pageSize.getHeight();
    const fecha     = procesarFecha(fechaServicio);
    const prefijo   = getPrefijoNro(tipoDetectado);
    const tipoLabel = getLabelTipo(tipoDetectado, esMulti);
    const nroDoc    = generarNroDocumento(prefijo, fecha, tecnico || 'TEC');

    // Guardar nroDoc en backend
    if (servicioId) {
        try {
            const { default: api } = await import('../../services/api');
            api.patch(`/servicios/${servicioId}/nro-doc`, { nroDocumento: nroDoc }).catch(() => {});
        } catch {}
        localStorage.setItem(`pdf_nro_${servicioId}`, nroDoc);
    }

    const estadoBadge = tipoDetectado === 'PRESUPUESTO' ? 'PRESUPUESTO'
        : tipoDetectado === 'ORDEN_SERVICIO' ? 'COMPLETADO'
        : tipoDetectado === 'INFORME_TECNICO' ? 'INFORME'
        : null;

    // ── HEADER ───────────────────────────────────────────────────────────────
    const headerFn = esMulti ? dibujarHeaderCompacto : dibujarHeader;
    headerFn(doc, { tipoLabel, fecha, tecnico: tecnico || null, nroDoc, estado: estadoBadge });
    let y = (esMulti ? HEADER_H.compact : HEADER_H.normal) + 8;

    // ── RESUMEN EJECUTIVO (3+ equipos) ────────────────────────────────────────
    if (ticketItems.length >= 3) {
        const subtotalTotal = ticketItems.reduce((a, b) =>
            a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
        y = dibujarResumenEjecutivo(doc, {
            y, cliente, cantEquipos: ticketItems.length,
            total: subtotalTotal, estado: estadoBadge, pageW,
        });
        y += 4;
    }

    // ── BLOQUE CLIENTE ───────────────────────────────────────────────────────
    y = dibujarBloqueCliente(doc, { cliente, sede, y, esCompacto: esMulti });

    // ── CONTENIDO PRINCIPAL ───────────────────────────────────────────────────
    const subtotalBruto = ticketItems.reduce((a, b) =>
        a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc = parseFloat(descuentoPorcentaje) || 0;

    if (esTecnico) {
        y = await generarTecnico(doc, {
            ticketItems, y, pageW, pageH,
            esPresupuesto: tipoDetectado === 'PRESUPUESTO',
            esInforme: tipoDetectado === 'INFORME_TECNICO',
        });
    } else {
        y = await generarVenta(doc, { ticketItems, y, pageW, pctDesc, esPresupuesto });
    }

    y += 4;

    // ── TOTAL ─────────────────────────────────────────────────────────────────
    y = checkSalto(doc, y, 30);
    y = dibujarBloqueTotal(doc, {
        y, subtotal: subtotalBruto, descuentoPct: pctDesc,
        esPresupuesto: tipoDetectado === 'PRESUPUESTO', pageW,
    });
    y += 6;

    // ── PRÓXIMO MANTENIMIENTO (informe / orden de servicio) ───────────────────
    if ((tipoDetectado === 'INFORME_TECNICO' || tipoDetectado === 'ORDEN_SERVICIO') && proximoMantenimiento) {
        y = checkSalto(doc, y, 28);
        y = dibujarProximoMantenimiento(doc, { y, fecha: proximoMantenimiento, pageW });
    }

    // ── GARANTÍA ─────────────────────────────────────────────────────────────
    if (tipoDetectado !== 'PRESUPUESTO' && tipoDetectado !== 'COMPROBANTE') {
        y = checkSalto(doc, y, 18);
        y = dibujarGarantia(doc, { y, texto: garantiaTexto, pageW });
    }

    // ── FORMA DE PAGO ─────────────────────────────────────────────────────────
    y = checkSalto(doc, y, 22);
    y = dibujarFormasDePago(doc, { y, pageW });

    // ── QR (presupuesto → aprobar por WhatsApp; orden → reseña Google) ────────
    const empresa = (await import('./theme.js')).getEmpresa();
    if (tipoDetectado === 'PRESUPUESTO' && empresa.whatsapp) {
        y = checkSalto(doc, y, 36);
        doc.setFontSize(T.label);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.navy);
        doc.text('APROBAR PRESUPUESTO', M, y);
        await dibujarQRWhatsApp(doc, {
            x: M, y: y + 4, telefono: empresa.whatsapp,
            mensaje: `Hola, quiero aprobar el presupuesto ${nroDoc}`,
        });
        y += 38;
    }

    if ((tipoDetectado === 'ORDEN_SERVICIO' || tipoDetectado === 'INFORME_TECNICO') && googleReviewLink) {
        y = checkSalto(doc, y, 36);
        await dibujarQRGoogle(doc, { x: M, y: y + 4, link: googleReviewLink });
        y += 38;
    }

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    y = checkSalto(doc, y, firmaDataUrl ? 38 : 28);
    dibujarFirmas(doc, {
        y, firmaDataUrl,
        esPresupuesto: tipoDetectado === 'PRESUPUESTO',
        esTecnico,
        pageW,
    });

    // ── EVIDENCIA FOTOGRÁFICA (solo servicios técnicos) ────────────────────────
    if (esTecnico && tipoDetectado !== 'PRESUPUESTO') {
        await dibujarPaginaEvidencia(doc, ticketItems, fecha, nroDoc);
    }

    // ── FOOTER EN TODAS LAS PÁGINAS ───────────────────────────────────────────
    const leyendaLimpia = (leyenda || '').replace(/[\r\n]+/g, ' ').trim().substring(0, 110);
    const textoPie = leyendaLimpia || (esTecnico
        ? 'Garantía: 90 días sobre mano de obra · Repuestos según fabricante'
        : 'Presupuesto válido 7 días · Precios sujetos a variación sin previo aviso');

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        dibujarFooter(doc, { pagina: i, totalPaginas, textoCentral: textoPie });
    }

    // ── GUARDAR ───────────────────────────────────────────────────────────────
    const nombreArchivo = `${tipoLabel.split(' ')[0]}_${(cliente.nombre || 'Cliente').replace(/\s+/g,'-')}_${fecha.replace(/\//g,'-')}.pdf`;
    doc.save(nombreArchivo);
};
