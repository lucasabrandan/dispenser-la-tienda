/**
 * EjecutarOrdenSheet
 * Vista simplificada para tecnicos al ejecutar un presupuesto asignado.
 * Flujo: detalle → firmas → cobro → resumen
 */
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import PasoDetalle from './ejecutar/PasoDetalle';
import PasoFirmas from './ejecutar/PasoFirmas';
import PasoCobro from './ejecutar/PasoCobro';
import PasoResumenEjecutar from './ejecutar/PasoResumenEjecutar';

const PASOS = ['detalle', 'firmas', 'cobro', 'resumen'];

export default function EjecutarOrdenSheet({ servicio, onConfirmado, onCerrar }) {
    const { usuario } = useAuth();

    const [paso, setPaso] = useState('detalle');
    const [resumenGanancias, setResumenGanancias] = useState(null);
    const [observaciones, setObservaciones] = useState(servicio.observaciones || '');
    const [repuestosAgregados, setRepuestosAgregados] = useState([]);
    const [repuestosDisponibles, setRepuestosDisponibles] = useState([]);
    const [sheetRepuestosOpen, setSheetRepuestosOpen] = useState(false);
    const [firmaTecnico, setFirmaTecnico] = useState(null);
    const [editandoFirma, setEditandoFirma] = useState(false);
    const [firmaCliente, setFirmaCliente] = useState(null);
    const [incluirFirmas, setIncluirFirmas] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [modalidadCobro, setModalidadCobro] = useState(null);
    const [config, setConfig] = useState(null);
    const [costoMOExtra, setCostoMOExtra] = useState(0);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoFirma(true);
        } catch {}
        api.get('/repuestos', { params: { size: 1000 } })
            .then(r => setRepuestosDisponibles(r.data?.content || r.data || []))
            .catch(() => {});
        api.get('/configuracion')
            .then(r => setConfig(r.data))
            .catch(() => setConfig({ manoDeObraBase: 60000, porcentajeImpuestos: 30, descuentoEfectivo: 10, porcentajeIVA: 21 }));
    }, []);

    const pricing = useMemo(() => {
        if (!config) return null;
        const moBase = Number(config.manoDeObraBase) || 60000;
        const pctImp = Number(config.porcentajeImpuestos) || 30;
        const pctIVA = Number(config.porcentajeIVA) || 21;
        const esVisita = servicio.esVisita || false;
        const factor = (1 + pctIVA / 100) * (1 - pctImp / 100);
        const precioCliente = Math.round(moBase / factor);
        const parteTecnico = Math.round(moBase / 2);
        const visitaPrecio = Math.round((moBase / 2) / factor);
        const repuestosOriginales = (servicio.items || []).reduce((s, it) =>
            s + (it.repuestosUsados || []).reduce((a, r) => a + (Number(r.precio || 0) * Number(r.cantidad || 1)), 0), 0);
        const repuestosNuevos = repuestosAgregados.reduce((s, r) => s + (parseFloat(r.precio) || 0) * (r.cantidad || 1), 0);
        const totalRepuestos = repuestosOriginales + repuestosNuevos;
        const extraNeto = Number(costoMOExtra || 0);
        const precioConExtra = Math.round((moBase + extraNeto) / factor);
        return {
            moBase, precioCliente, parteTecnico, pctImp, pctIVA,
            esVisita, visitaPrecio,
            repuestosOriginales, repuestosNuevos, totalRepuestos, precioConExtra,
            totalEfectivo: esVisita ? visitaPrecio : (precioConExtra + totalRepuestos),
            totalFacturado: esVisita
                ? Math.round(visitaPrecio * (1 + pctIVA / 100))
                : Math.round((precioConExtra + totalRepuestos) * (1 + pctIVA / 100)),
        };
    }, [config, servicio, repuestosAgregados, costoMOExtra]);

    const totalHeader = useMemo(() => {
        if (!pricing) return 0;
        if (modalidadCobro === 'EFECTIVO_SIN_FACTURA') return pricing.totalEfectivo;
        return pricing.totalFacturado;
    }, [pricing, modalidadCobro]);

    const guardarFirma = async () => {
        if (!firmaTecnico) return;
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            api.patch('/auth/mi-firma', { firma: firmaTecnico }).catch(() => {});
            setEditandoFirma(false);
        } catch {}
    };

    const confirmar = async () => {
        if (!usuario?.id) { toast.error('No se pudo identificar tu usuario. Cerra sesion y volve a entrar.'); return; }
        if (!modalidadCobro) { toast.error('Selecciona como paga el cliente'); return; }
        setProcesando(true);
        const loading = toast.loading('Confirmando trabajo...');
        try {
            const itemsActualizados = (servicio.items || []).map((it, i) => ({
                equipoSerial: it.equipoSerial || 'MOSTRADOR',
                tecnico: it.tecnico || usuario?.nombre || 'Tecnico',
                costo: Number(it.costo || 0), costoExtra: Number(it.costoExtra || 0),
                metodoPago: it.metodoPago || 'EFECTIVO',
                trabajoRealizado: it.trabajoRealizado || '',
                trabajoTipo: it.trabajoTipo || 'REPARACION',
                garantiaHasta: it.garantiaHasta || null,
                fotoAntes: it.fotoAntes || null, fotoDespues: it.fotoDespues || null,
                repuestosUsados: i === 0
                    ? [...(it.repuestosUsados || []), ...repuestosAgregados]
                    : (it.repuestosUsados || []),
            }));
            const nuevoEstado = modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'COBRADO' : 'COMPLETADO';
            const montoFinal = modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? pricing.totalEfectivo : pricing.totalFacturado;

            await api.put(`/servicios/${servicio.id}`, {
                sedeId: servicio.sedeId, usuarioId: usuario?.id || servicio.usuarioId,
                fecha: servicio.fecha, servicioTipo: servicio.servicioTipo || 'TECNICA',
                estado: nuevoEstado, clienteNombre: servicio.clienteNombre,
                sedeNombre: servicio.sedeNombre, descuentoPorcentaje: servicio.descuentoPorcentaje || 0,
                observaciones, items: itemsActualizados,
                modalidadCobro, montoFinal, esVisita: pricing.esVisita || false,
            });
            toast.success('Trabajo confirmado', { id: loading });

            const extraNeto = Number(costoMOExtra || 0);
            const netoBase = pricing.esVisita ? (pricing.moBase / 2) : (pricing.moBase + extraNeto);
            const divisor = pricing.esVisita ? 1 : 2;
            const neto = Math.round(netoBase / divisor);
            setResumenGanancias({
                modalidadCobro, montoFinal, parteTecnico: neto,
                totalRepuestos: pricing.totalRepuestos, esVisita: pricing.esVisita,
            });

            try {
                const ticketItems = itemsActualizados.map(it => ({
                    ...it, totalCalculado: it.costo, trabajo: it.trabajoRealizado,
                }));
                await generarRemitoPDFPremium({
                    esPresupuesto: false, servicioId: servicio.id,
                    nroDocumentoExistente: servicio.nroDocumento || localStorage.getItem(`pdf_nro_${servicio.id}`) || null,
                    cliente: { nombre: servicio.clienteNombre, telefono: servicio.clienteTelefono, email: servicio.clienteEmail, cuilDni: servicio.clienteDni, condicionIva: servicio.clienteCondicionIva },
                    sede: { nombreSede: servicio.sedeNombre, direccion: servicio.sedeDireccion },
                    tecnico: usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Tecnico',
                    ticketItems, fechaServicio: servicio.fecha,
                    descuentoPorcentaje: servicio.descuentoPorcentaje || 0, leyenda: observaciones,
                    esTecnicoForzado: true,
                    firmaTecnico: incluirFirmas ? (firmaTecnico || null) : null,
                    firmaCliente: incluirFirmas ? (firmaCliente || null) : null, incluirFirmas,
                });
            } catch (pdfErr) {
                console.warn('PDF no generado:', pdfErr);
                toast('Trabajo guardado. PDF no disponible', { icon: '⚠️' });
            }
            setPaso('resumen');
        } catch (e) {
            const detalle = e?.response?.data?.mensaje || e?.response?.data?.message || e?.message || '';
            toast.error(`Error al confirmar${detalle ? ': ' + detalle : ''}`, { id: loading });
        } finally { setProcesando(false); }
    };

    const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;

    return (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-[#F5F3F1] dark:bg-[#141414]">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                <div className="flex items-center gap-3">
                    <button onClick={onCerrar}
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-90">
                        ←
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">Ejecutar trabajo</h2>
                        <p className="text-[11px] text-[#A8A29E] truncate mt-0.5">{servicio.clienteNombre} · {servicio.sedeNombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider">Total</p>
                        <p className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">{fmt(totalHeader)}</p>
                    </div>
                </div>
                <div className="flex gap-1 mt-3">
                    {PASOS.slice(0, 3).map((s, i) => (
                        <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= PASOS.indexOf(paso) ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E]'}`} />
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
                {paso === 'detalle' && (
                    <PasoDetalle
                        servicio={servicio} observaciones={observaciones} setObservaciones={setObservaciones}
                        repuestosAgregados={repuestosAgregados} setRepuestosAgregados={setRepuestosAgregados}
                        repuestosDisponibles={repuestosDisponibles}
                        sheetRepuestosOpen={sheetRepuestosOpen} setSheetRepuestosOpen={setSheetRepuestosOpen}
                        onNext={() => setPaso('firmas')}
                    />
                )}
                {paso === 'firmas' && (
                    <PasoFirmas
                        firmaTecnico={firmaTecnico} setFirmaTecnico={setFirmaTecnico}
                        editandoFirma={editandoFirma} setEditandoFirma={setEditandoFirma}
                        firmaCliente={firmaCliente} setFirmaCliente={setFirmaCliente}
                        incluirFirmas={incluirFirmas} setIncluirFirmas={setIncluirFirmas}
                        guardarFirma={guardarFirma}
                        onBack={() => setPaso('detalle')} onNext={() => setPaso('cobro')}
                    />
                )}
                {paso === 'cobro' && pricing && (
                    <PasoCobro
                        pricing={pricing} modalidadCobro={modalidadCobro} setModalidadCobro={setModalidadCobro}
                        costoMOExtra={costoMOExtra} setCostoMOExtra={setCostoMOExtra}
                        procesando={procesando}
                        onBack={() => setPaso('firmas')} onConfirmar={confirmar}
                    />
                )}
                {paso === 'resumen' && resumenGanancias && (
                    <PasoResumenEjecutar resumenGanancias={resumenGanancias} onConfirmado={onConfirmado} />
                )}
            </div>
        </div>
    );
}
