import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useServicioForm } from '../../hooks/useServicioForm';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CrearClienteModal from '../cliente/CrearClienteModal';
import CrearSedeModal    from '../CrearSedeModal';
import { StepHeader, buildSelectStyles } from './ServicioUI';
import PasoCliente      from './PasoCliente';
import PasoEquipos      from './PasoEquipos';
import PasoResumen      from './PasoResumen';
import CerrarTicketSheet from './CerrarTicketSheet';

const TITULOS = [
    { titulo: 'Cliente',             subtitulo: '¿Para quién es el servicio?'         },
    { titulo: 'Equipos y trabajo',  subtitulo: 'Describí qué hay que hacer'         },
    { titulo: 'Resumen y cierre',   subtitulo: 'Planificación, descuento y condiciones' },
];

export default function ServicioForm({
    onSaved,
    servicioParaEditar = null,
    clienteInicialId   = null,
    presupuestoOrigen  = null,
    ordenOrigen        = null,
    modoEjecucion      = false,
}) {
    const hook = useServicioForm(servicioParaEditar, clienteInicialId, presupuestoOrigen, ordenOrigen);
    const {
        db, setDb, clienteId,
        ticketItems, idEdicion,
        itemActual, fechaServicio,
        descuentoPorcentaje, leyenda,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        modalSedeAbierto, setModalSedeAbierto,
        nombreSedePrellenado, setNombreSedePrellenado,
        finalizar, refrescarDatos, onClienteSeleccionado,
        calcularResumenGanancia, estaBloqueado,
        borradorDisponible, recuperarBorrador, descartarBorrador,
        duracionMinutos, fechaVisita,
    } = hook;

    const [paso, setPaso]               = useState(0);
    const [sheetVisible, setSheetVisible] = useState(false);
    // Snapshot para PDF post-guardado (finalizar vacía ticketItems)
    const snapshotRef = useRef(null);
    // nombreLibre y dirLibre ahora viven en el hook para persistir entre pasos
    const { nombreLibre, dirLibre: direccionLibre } = hook;

    // Cuando se recupera un borrador, avanzar al paso correcto
    const prevBorrador = useRef(borradorDisponible);
    useEffect(() => {
        if (prevBorrador.current && !borradorDisponible) {
            // Borrador recuperado — saltar al paso más avanzado posible
            if (ticketItems.length > 0) setPaso(2);      // tiene equipos → resumen
            else if (clienteId)         setPaso(1);       // tiene cliente → equipos
        }
        prevBorrador.current = borradorDisponible;
    }, [borradorDisponible, ticketItems.length, clienteId]);

    const { usuario } = useAuth();
    const { isDark } = useTheme();
    const { tecnicoSeleccionado } = hook;
    // Usar el técnico asignado si lo seleccionó el admin, si no el usuario logueado
    const tecnicoNombre = tecnicoSeleccionado?.nombre || usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Técnico';

    const selectStyles = buildSelectStyles(isDark);
    const clienteObj  = db.clientes?.find(c => c.id?.toString() === clienteId);

    // Genera PDF de previsualización (sin firmas — botón 📄 de la barra)
    // Si ticketItems está vacío (post-guardado), usa la snapshot guardada antes del reset
    const [generandoPDF, setGenerandoPDF] = useState(false);
    const dispararPDF = async () => {
        const items = ticketItems.length > 0 ? ticketItems : snapshotRef.current?.ticketItems;
        if (!items || items.length === 0) {
            toast.error('No hay datos para el PDF');
            return;
        }
        const snap = snapshotRef.current || {};
        const sedeObj = db.sedes?.find(s => s.id === (itemActual.sedeId || snap.sedeId));
        const totalFinal = ticketItems.length > 0 ? calcularResumenGanancia().totalConDescuento : snap.totalConDescuento;
        setGenerandoPDF(true);
        const loading = toast.loading('Generando PDF…');
        try {
            await generarRemitoPDFPremium({
                esPresupuesto:           !estaBloqueado,
                servicioId:              idEdicion || snap.servicioId || null,
                nroDocumentoExistente:   (idEdicion || snap.servicioId) ? (localStorage.getItem(`pdf_nro_${idEdicion || snap.servicioId}`) || null) : null,
                cliente:                 clienteObj || snap.cliente || { nombre: nombreLibre || 'Particular' },
                sede:                    sedeObj || snap.sede || { nombreSede: 'Mostrador' },
                tecnico:                 tecnicoNombre,
                ticketItems:             items,
                descuentoPorcentaje:     ticketItems.length > 0 ? descuentoPorcentaje : (snap.descuentoPorcentaje || 0),
                totalFinal,
                fechaServicio:           fechaServicio || snap.fechaServicio,
                leyenda:                 leyenda || snap.leyenda || '',
                fechaVisita:             fechaVisita || snap.fechaVisita || null,
                firmaTecnico:            null,
                firmaCliente:            null,
            });
            toast.success('PDF generado', { id: loading });
        } catch (e) {
            console.error('Error generando PDF:', e);
            toast.error('Error al generar el PDF', { id: loading });
        } finally {
            setGenerandoPDF(false);
        }
    };

    // Genera PDF con firmas (llamado desde CerrarTicketSheet al cobrar)
    const dispararPDFConFirmas = async ({ firmaTecnico, firmaCliente, incluirFirmas = true }) => {
        const items = ticketItems.length > 0 ? ticketItems : snapshotRef.current?.ticketItems;
        if (!items || items.length === 0) {
            toast.error('No hay datos para el PDF');
            return;
        }
        const snap = snapshotRef.current || {};
        const sedeObj = db.sedes?.find(s => s.id === (itemActual.sedeId || snap.sedeId));
        const totalFinal = ticketItems.length > 0 ? calcularResumenGanancia().totalConDescuento : snap.totalConDescuento;
        try {
            await generarRemitoPDFPremium({
                esPresupuesto:           false,
                servicioId:              idEdicion || snap.servicioId || null,
                nroDocumentoExistente:   (idEdicion || snap.servicioId) ? (localStorage.getItem(`pdf_nro_${idEdicion || snap.servicioId}`) || null) : null,
                cliente:                 clienteObj || snap.cliente || { nombre: nombreLibre || 'Particular' },
                sede:                    sedeObj || snap.sede || { nombreSede: 'Mostrador' },
                tecnico:                 tecnicoNombre,
                ticketItems:             items,
                descuentoPorcentaje:     ticketItems.length > 0 ? descuentoPorcentaje : (snap.descuentoPorcentaje || 0),
                totalFinal,
                fechaServicio:           fechaServicio || snap.fechaServicio,
                leyenda:                 leyenda || snap.leyenda || '',
                fechaVisita:             fechaVisita || snap.fechaVisita || null,
                firmaTecnico,
                firmaCliente,
                incluirFirmas,
            });
        } catch (e) {
            console.error('Error generando PDF con firmas:', e);
            toast.error('Error al generar el PDF');
        }
    };

    const buildOverrides = () => {
        if (!clienteId && nombreLibre.trim()) {
            const o = { clienteNombre: nombreLibre.trim() };
            if (direccionLibre?.calle?.trim()) o.direccionLibre = direccionLibre;
            return o;
        }
        return {};
    };

    // Cobrar ahora: guarda como REALIZADO, genera PDF con firmas
    const handleCobrar = async ({ firmaTecnico, firmaCliente, incluirFirmas = true }) => {
        // Snapshot ANTES del reset
        const sedeObj = db.sedes?.find(s => s.id === itemActual.sedeId);
        snapshotRef.current = {
            ticketItems: [...ticketItems],
            sedeId: itemActual.sedeId,
            sede: sedeObj || { nombreSede: 'Mostrador' },
            cliente: clienteObj || { nombre: nombreLibre || 'Particular' },
            descuentoPorcentaje,
            totalConDescuento: calcularResumenGanancia().totalConDescuento,
            fechaServicio,
            leyenda,
            duracionMinutos,
            fechaVisita,
            servicioId: idEdicion || null,
        };
        const result = await finalizar(true, buildOverrides());
        if (result?.ok) {
            snapshotRef.current.servicioId = result.id;
            await dispararPDFConFirmas({ firmaTecnico, firmaCliente, incluirFirmas });
            if (onSaved) onSaved();
        }
    };

    // Guardar presupuesto: guarda como PRESUPUESTO, devuelve datos para despacho
    const handleGuardar = async () => {
        // Snapshot ANTES del reset para que dispararPDF pueda usarla
        const sedeObj = db.sedes?.find(s => s.id === itemActual.sedeId);
        snapshotRef.current = {
            ticketItems: [...ticketItems],
            sedeId: itemActual.sedeId,
            sede: sedeObj || { nombreSede: 'Mostrador' },
            cliente: clienteObj || { nombre: nombreLibre || 'Particular' },
            descuentoPorcentaje,
            totalConDescuento: calcularResumenGanancia().totalConDescuento,
            fechaServicio,
            leyenda,
            duracionMinutos,
            fechaVisita,
            servicioId: idEdicion || null,
        };
        const result = await finalizar(false, buildOverrides());
        if (result?.ok) {
            snapshotRef.current.servicioId = result.id;
            if (onSaved) onSaved();
        }
        return result;
    };

    return (
        <div className="font-sans transition-colors bg-[#FFFFFF] dark:bg-[#141414] min-h-full">

            {/* Banner borrador */}
            {borradorDisponible && !servicioParaEditar && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-[#D48800]/10 border border-[#D48800]/30 flex items-center justify-between gap-3">
                    <p className="text-[13px] font-bold text-[#D48800] dark:text-[#F0A500]">
                        💾 Tenés un trabajo sin guardar
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={descartarBorrador}
                            className="text-[11px] font-bold text-[#A8A29E] px-2 py-1">
                            Descartar
                        </button>
                        <button onClick={recuperarBorrador}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white bg-[#D48800] dark:bg-[#F0A500] active:scale-95">
                            Recuperar
                        </button>
                    </div>
                </div>
            )}

            {estaBloqueado && (
                <div className="mx-5 mt-4 p-3 rounded-xl text-center font-bold text-[13px] bg-red-50 dark:bg-red-900/30 text-[#D13A28] dark:text-red-300">
                    🔒 Registro cobrado — solo lectura
                </div>
            )}

            <StepHeader paso={paso} total={3}
                titulo={TITULOS[paso].titulo}
                subtitulo={paso === 1 && ticketItems.length > 0
                    ? `${ticketItems.length} equipo${ticketItems.length > 1 ? 's' : ''} cargado${ticketItems.length > 1 ? 's' : ''}`
                    : TITULOS[paso].subtitulo}
            />

            {paso === 0 && <PasoCliente  hook={hook} onNext={() => setPaso(1)} selectStyles={selectStyles} />}
            {paso === 1 && <PasoEquipos  hook={hook} onNext={() => setPaso(2)} onBack={() => setPaso(0)} selectStyles={selectStyles} />}
            {paso === 2 && (
                <PasoResumen
                    hook={hook}
                    onBack={() => setPaso(1)}
                    onCerrarTicket={() => setSheetVisible(true)}
                    dispararPDF={dispararPDF}
                    modoEjecucion={modoEjecucion}
                />
            )}

            {/* Sheet de cierre */}
            {sheetVisible && (
                <CerrarTicketSheet
                    modoEjecucion={modoEjecucion}
                    totalFinal={(() => {
                        const { totalConDescuento } = calcularResumenGanancia();
                        return totalConDescuento;
                    })()}
                    descuentoPorcentaje={descuentoPorcentaje}
                    onCobrar={handleCobrar}
                    onGuardar={handleGuardar}
                    onGenerarPDF={dispararPDF}
                    onCerrar={() => setSheetVisible(false)}
                />
            )}

            <CrearClienteModal isOpen={modalClienteAbierto} onClose={() => setModalClienteAbierto(false)}
                clienteNombrePrellenado={nombreClientePrellenado}
                onClienteCreado={async c => {
                    setDb({ ...db, clientes: [...db.clientes, c] });
                    onClienteSeleccionado(c.id.toString());
                    setModalClienteAbierto(false);
                    await refrescarDatos();
                }}
            />
            <CrearSedeModal isOpen={modalSedeAbierto} onClose={() => setModalSedeAbierto(false)}
                clienteId={clienteId} nombreSedePrellenado={nombreSedePrellenado}
                onSedeCreada={async s => {
                    setDb({ ...db, sedes: [...db.sedes, s] });
                    hook.setItemActual({ ...itemActual, sedeId: s.id, sedeNombre: s.nombreSede });
                    setModalSedeAbierto(false);
                    await refrescarDatos();
                }}
            />
        </div>
    );
}
