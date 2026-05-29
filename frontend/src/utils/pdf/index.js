/**
 * index.js — Entry point del generador PDF corporativo
 *
 * Tipos: PRESUPUESTO, ORDEN_SERVICIO, INFORME_TECNICO, COMPROBANTE, PRESUPUESTO_VENTA
 * API: generarPDF({ tipo, cliente, sede, tecnico, ticketItems, ... })
 */
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';
import { procesarFecha, generarNroDocumento, HEADER_H } from './theme.js';
import { dibujarHeaderCompacto, dibujarHeader, dibujarFooter } from './layout.js';
import { resetFotosConError, getFotosConError } from './helpers.js';
import { detectarTipo, getLabelTipo, getPrefijoNro, getEstadoBadge } from './pdfShared.js';
import { generarSingleTecnico, generarMultiTecnico } from './generarTecnico.js';
import { generarSinglePresupuesto, generarMultiPresupuesto } from './generarPresupuesto.js';
import { generarPresupuestoVenta, generarComprobante } from './generarVenta.js';

export const generarPDF = async ({
    tipo               = null,
    esPresupuesto      = false,
    esTecnicoForzado   = null,
    cliente,
    sede,
    tecnico,
    ticketItems        = [],
    fechaServicio,
    descuentoPorcentaje = 0,
    leyenda            = '',
    servicioId         = null,
    nroDocumentoExistente = null,
    firmaCliente       = null,
    firmaTecnico       = null,
    proximoMantenimiento = null,
    garantiaTexto      = null,
    estadoFinal        = null,
    incluirFirmas      = true,
    aclaracionCliente  = '',
    sinPrecios         = false,
    fechaVisita        = null,
}) => {
    if (!cliente || ticketItems.length === 0) {
        return toast.error('Datos insuficientes para generar el PDF.');
    }
    resetFotosConError();

    const tipoDetectado = detectarTipo({ tipo, esPresupuesto, ticketItems, esTecnicoForzado });
    const esMulti       = ticketItems.length > 1;
    const doc           = new jsPDF();
    const fecha         = procesarFecha(fechaServicio);
    const prefijo       = getPrefijoNro(tipoDetectado);
    const tipoLabel     = getLabelTipo(tipoDetectado, esMulti);

    // Reusar numero existente
    const nroDocGuardado = nroDocumentoExistente
        || (servicioId ? localStorage.getItem(`pdf_nro_${servicioId}`) : null);
    const nroDoc = nroDocGuardado || generarNroDocumento(prefijo, fecha, tecnico || 'TEC');

    if (servicioId && !nroDocGuardado) {
        try {
            const { default: api } = await import('../../services/api');
            api.patch(`/servicios/${servicioId}/nro-doc`, { nroDocumento: nroDoc }).catch(() => {});
        } catch {}
        localStorage.setItem(`pdf_nro_${servicioId}`, nroDoc);
    }

    // Header primera pagina
    dibujarHeaderCompacto(doc, { tipoLabel, fecha, tecnico: tecnico || null, nroDoc });
    let y = HEADER_H.compact + 8;

    // Dispatch por tipo
    const commonArgs = {
        cliente, sede, tecnico, fecha, nroDoc,
        firmaCliente:  incluirFirmas ? firmaCliente  : null,
        firmaTecnico:  incluirFirmas ? firmaTecnico  : null,
        incluirFirmas, aclaracionCliente,
        descuentoPorcentaje, garantiaTexto,
        proximoMantenimiento, leyenda, sinPrecios, fechaVisita,
    };

    if (tipoDetectado === 'COMPROBANTE') {
        await generarComprobante(doc, { ...commonArgs, ticketItems, y });
    } else if (tipoDetectado === 'PRESUPUESTO_VENTA') {
        await generarPresupuestoVenta(doc, { ...commonArgs, ticketItems, y, nroDoc });
    } else if (tipoDetectado === 'PRESUPUESTO') {
        if (esMulti) await generarMultiPresupuesto(doc, { ...commonArgs, ticketItems, y });
        else         await generarSinglePresupuesto(doc, { ...commonArgs, item: ticketItems[0], y });
    } else {
        if (esMulti) await generarMultiTecnico(doc, { ...commonArgs, ticketItems, tipo: tipoDetectado, y });
        else         await generarSingleTecnico(doc, { ...commonArgs, item: ticketItems[0], tipo: tipoDetectado, y });
    }

    // Footer en todas las paginas
    const esOrdenFinal      = tipoDetectado === 'ORDEN_SERVICIO';
    const esTipoPresupuesto = tipoDetectado === 'PRESUPUESTO';
    const esVentaTipo       = tipoDetectado === 'PRESUPUESTO_VENTA' || tipoDetectado === 'COMPROBANTE';
    const leyendaLimpia = (esOrdenFinal || esTipoPresupuesto || esVentaTipo)
        ? null
        : (leyenda || '').replace(/[\r\n]+/g, ' ').trim().substring(0, 110) || null;
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        dibujarFooter(doc, { pagina: i, totalPaginas: total, textoCentral: leyendaLimpia, conEstrellas: esOrdenFinal });
    }

    // Guardar
    const nombreBase = tipoLabel.split(' ')[0];
    const nombreCliente = (cliente.nombre || 'Cliente').replace(/\s+/g, '-');
    const fechaStr = fecha.replace(/\//g, '-');
    const fileName = `${nombreBase}_${nombreCliente}_${fechaStr}.pdf`;

    const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
    if (isIOS) window.open(doc.output('datauristring'), '_blank');
    else       doc.save(fileName);

    const fotosErr = getFotosConError();
    if (fotosErr > 0) {
        toast.error(`⚠ ${fotosErr} foto${fotosErr > 1 ? 's' : ''} no se ${fotosErr > 1 ? 'pudieron' : 'pudo'} incluir en el PDF`, { duration: 5000 });
    }
};
