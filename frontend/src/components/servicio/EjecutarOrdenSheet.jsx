/**
 * EjecutarOrdenSheet
 * Vista simplificada para tecnicos al ejecutar un presupuesto asignado.
 * Flujo: detalle → firmas → cobro → resumen
 *
 * Pricing:
 *   Reparacion con factura:     MO base + 30% = $78.000
 *   Reparacion sin factura:     MO con factura - 10% = $70.200
 *   Visita con factura:         mitad MO facturada + 21% IVA = $50.700
 *   Visita sin factura:         mitad MO facturada = $39.000
 *   Tecnico siempre:            $30.000 (50% MO base)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import FirmaPad from '../ui/FirmaPad';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';

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
    const [modalidadCobro, setModalidadCobro] = useState(null); // 'EFECTIVO_SIN_FACTURA' | 'CON_FACTURA' | 'PENDIENTE'
    const [config, setConfig] = useState(null);
    const [costoMOExtra, setCostoMOExtra] = useState(0); // si el tecnico quiere subir la MO

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoFirma(true);
        } catch {}
        api.get('/repuestos', { params: { size: 1000 } })
            .then(r => setRepuestosDisponibles(r.data?.content || r.data || []))
            .catch(() => {});
        // Cargar config global (MO base, impuestos, descuento)
        api.get('/configuracion')
            .then(r => setConfig(r.data))
            .catch(() => setConfig({ manoDeObraBase: 60000, porcentajeImpuestos: 30, descuentoEfectivo: 10, porcentajeIVA: 21 }));
    }, []);

    // Calculos de pricing
    const pricing = useMemo(() => {
        if (!config) return null;
        const moBase = Number(config.manoDeObraBase) || 60000;
        const pctImp = Number(config.porcentajeImpuestos) || 30;
        const pctDesc = Number(config.descuentoEfectivo) || 10;
        const pctIVA = Number(config.porcentajeIVA) || 21;
        const esVisita = servicio.esVisita || false;

        // MO facturada = base + impuestos
        const moFacturada = Math.round(moBase * (1 + pctImp / 100));
        // MO efectivo = facturada - descuento
        const moEfectivo = Math.round(moFacturada * (1 - pctDesc / 100));
        // Tecnico siempre 50% de MO base
        const parteTecnico = Math.round(moBase / 2);

        let moVisitaBase, moVisitaFacturada;
        if (esVisita) {
            // Visita = mitad de MO facturada
            moVisitaBase = Math.round(moFacturada / 2);
            moVisitaFacturada = Math.round(moVisitaBase * (1 + pctIVA / 100));
        }

        // Repuestos originales del presupuesto
        const repuestosOriginales = (servicio.items || []).reduce((s, it) => {
            const reps = it.repuestosUsados || [];
            return s + reps.reduce((a, r) => a + (Number(r.precio || 0) * Number(r.cantidad || 1)), 0);
        }, 0);
        // Repuestos agregados por el tecnico
        const repuestosNuevos = repuestosAgregados.reduce((s, r) => s + (parseFloat(r.precio) || 0) * (r.cantidad || 1), 0);
        const totalRepuestos = repuestosOriginales + repuestosNuevos;

        // MO + extra (tecnico puede subir, nunca bajar)
        const moConExtra = moBase + Number(costoMOExtra || 0);
        const moConExtraFacturada = Math.round(moConExtra * (1 + pctImp / 100));
        const moConExtraEfectivo = Math.round(moConExtraFacturada * (1 - pctDesc / 100));

        return {
            moBase, moFacturada, moEfectivo, parteTecnico, pctImp, pctDesc, pctIVA,
            esVisita, moVisitaBase, moVisitaFacturada,
            repuestosOriginales, repuestosNuevos, totalRepuestos,
            moConExtra, moConExtraFacturada, moConExtraEfectivo,
            // Totales finales para cada modalidad
            totalEfectivo: esVisita ? moVisitaBase : (moConExtraEfectivo + totalRepuestos),
            totalFacturado: esVisita ? moVisitaFacturada : (moConExtraFacturada + totalRepuestos),
        };
    }, [config, servicio, repuestosAgregados, costoMOExtra]);

    // Total que se muestra en el header (depende de modalidad elegida)
    const totalHeader = useMemo(() => {
        if (!pricing) return 0;
        if (modalidadCobro === 'EFECTIVO_SIN_FACTURA') return pricing.totalEfectivo;
        if (modalidadCobro === 'CON_FACTURA') return pricing.totalFacturado;
        return pricing.moConExtraFacturada + pricing.totalRepuestos; // default: facturado
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
        if (!usuario?.id) {
            toast.error('No se pudo identificar tu usuario. Cerra sesion y volve a entrar.');
            return;
        }
        if (!modalidadCobro) {
            toast.error('Selecciona como paga el cliente');
            return;
        }
        setProcesando(true);
        const loading = toast.loading('Confirmando trabajo...');
        try {
            const itemsActualizados = (servicio.items || []).map((it, i) => ({
                equipoSerial:     it.equipoSerial || 'MOSTRADOR',
                tecnico:          it.tecnico || usuario?.nombre || 'Tecnico',
                costo:            Number(it.costo || 0),
                costoExtra:       Number(it.costoExtra || 0),
                metodoPago:       it.metodoPago || 'EFECTIVO',
                trabajoRealizado: it.trabajoRealizado || '',
                trabajoTipo:      it.trabajoTipo || 'REPARACION',
                garantiaHasta:    it.garantiaHasta || null,
                fotoAntes:        it.fotoAntes || null,
                fotoDespues:      it.fotoDespues || null,
                repuestosUsados: i === 0
                    ? [...(it.repuestosUsados || []), ...repuestosAgregados]
                    : (it.repuestosUsados || []),
            }));

            // Estado depende de la modalidad
            const nuevoEstado = modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'COBRADO' : 'COMPLETADO';
            const montoFinal = modalidadCobro === 'EFECTIVO_SIN_FACTURA'
                ? pricing.totalEfectivo
                : pricing.totalFacturado;

            await api.put(`/servicios/${servicio.id}`, {
                sedeId:              servicio.sedeId,
                usuarioId:           usuario?.id || servicio.usuarioId,
                fecha:               servicio.fecha,
                servicioTipo:        servicio.servicioTipo || 'TECNICA',
                estado:              nuevoEstado,
                clienteNombre:       servicio.clienteNombre,
                sedeNombre:          servicio.sedeNombre,
                descuentoPorcentaje: servicio.descuentoPorcentaje || 0,
                observaciones,
                items:               itemsActualizados,
                modalidadCobro:      modalidadCobro,
                montoFinal:          montoFinal,
                esVisita:            pricing.esVisita || false,
            });

            toast.success('Trabajo confirmado', { id: loading });

            // Resumen de ganancias para el tecnico
            setResumenGanancias({
                modalidadCobro,
                montoFinal,
                parteTecnico: pricing.parteTecnico,
                totalRepuestos: pricing.totalRepuestos,
                esVisita: pricing.esVisita,
            });

            // Generar PDF
            try {
                const ticketItems = itemsActualizados.map(it => ({
                    ...it,
                    totalCalculado:  it.costo,
                    modeloEquipo:    it.modeloEquipo || null,
                    ubicacionEquipo: it.ubicacionEquipo || null,
                    trabajo:         it.trabajoRealizado,
                }));

                await generarRemitoPDFPremium({
                    esPresupuesto:          false,
                    servicioId:             servicio.id,
                    nroDocumentoExistente:  servicio.nroDocumento
                        || localStorage.getItem(`pdf_nro_${servicio.id}`)
                        || null,
                    cliente: {
                        nombre:       servicio.clienteNombre,
                        telefono:     servicio.clienteTelefono,
                        email:        servicio.clienteEmail,
                        cuilDni:      servicio.clienteDni,
                        condicionIva: servicio.clienteCondicionIva,
                    },
                    sede: {
                        nombreSede: servicio.sedeNombre,
                        direccion:  servicio.sedeDireccion,
                    },
                    tecnico:             usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Tecnico',
                    ticketItems,
                    fechaServicio:       servicio.fecha,
                    descuentoPorcentaje: servicio.descuentoPorcentaje || 0,
                    leyenda:             observaciones,
                    esTecnicoForzado:    true,
                    firmaTecnico:        incluirFirmas ? (firmaTecnico || null) : null,
                    firmaCliente:        incluirFirmas ? (firmaCliente || null) : null,
                    incluirFirmas,
                });
            } catch (pdfErr) {
                console.warn('PDF no generado:', pdfErr);
                toast('Trabajo guardado. PDF no disponible', { icon: '⚠️' });
            }

            setPaso('resumen');
        } catch (e) {
            console.error('Error confirmando trabajo:', e);
            const detalle = e?.response?.data?.mensaje || e?.response?.data?.message || e?.message || '';
            toast.error(`Error al confirmar${detalle ? ': ' + detalle : ''}`, { id: loading });
        } finally {
            setProcesando(false);
        }
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
                        <h2 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                            Ejecutar trabajo
                        </h2>
                        <p className="text-[11px] text-[#A8A29E] truncate mt-0.5">
                            {servicio.clienteNombre} · {servicio.sedeNombre}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider">Total</p>
                        <p className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                            {fmt(totalHeader)}
                        </p>
                    </div>
                </div>
                {/* Steps */}
                <div className="flex gap-1 mt-3">
                    {PASOS.slice(0, 3).map((s, i) => {
                        const idx = PASOS.indexOf(paso);
                        return (
                            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= idx ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E]'}`} />
                        );
                    })}
                </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

                {/* PASO 1: DETALLE */}
                {paso === 'detalle' && (
                    <>
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                                Equipos y trabajo asignado
                            </p>
                            {servicio.items?.map((it, i) => (
                                <div key={i} className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06]">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-[13px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                            {it.equipoSerial}
                                        </p>
                                        {it.equipoModelo && (
                                            <p className="text-[10px] text-[#A8A29E] shrink-0">{it.equipoModelo}</p>
                                        )}
                                    </div>
                                    {it.equipoUbicacion && (
                                        <p className="text-[10px] text-[#A8A29E] mb-1">
                                            {[it.equipoUbicacion, it.equipoPiso && `P${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">
                                        {it.trabajoRealizado}
                                    </p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-black/[0.06]">
                                            {it.repuestosUsados.map((r, ri) => (
                                                <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                                    {r.cantidad}x {r.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>

                        {/* Repuestos adicionales */}
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                                Repuestos adicionales
                            </p>
                            <button
                                type="button"
                                onClick={() => setSheetRepuestosOpen(true)}
                                className="w-full py-3 px-4 rounded-xl flex items-center justify-between font-bold text-[13px] border border-dashed border-[#E8E5E0] dark:border-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] bg-[#FFFFFF] dark:bg-[#1C1C1C] active:scale-[0.98] transition-all"
                            >
                                <span>
                                    {repuestosAgregados.length > 0
                                        ? `${repuestosAgregados.length} repuesto${repuestosAgregados.length > 1 ? 's' : ''} seleccionado${repuestosAgregados.length > 1 ? 's' : ''}`
                                        : '+ Agregar repuestos'}
                                </span>
                                <span className="text-[#A8A29E]">▼</span>
                            </button>

                            {repuestosAgregados.length > 0 && (
                                <div className="rounded-xl overflow-hidden bg-[#EFEDEA] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]">
                                    {repuestosAgregados.map((r, i) => (
                                        <div key={r.id ?? i}
                                            className={`px-3 py-2.5 flex items-center gap-3 ${i < repuestosAgregados.length - 1 ? 'border-b border-black/[0.07] dark:border-white/[0.07]' : ''}`}>
                                            {r.fotoUrl && (
                                                <img src={r.fotoUrl} alt={r.nombre}
                                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#E8E5E0] dark:bg-[#242424]"
                                                    onError={e => { e.target.style.display = 'none'; }} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[13px] text-[#1C1917] dark:text-[#F0EEE9] truncate">{r.nombre}</p>
                                                <p className="text-[10px] text-[#A8A29E]">{fmt(Number(r.precio))} c/u</p>
                                            </div>
                                            <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0">x{r.cantidad}</span>
                                            <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] shrink-0 w-16 text-right">
                                                {fmt((parseFloat(r.precio) || 0) * (r.cantidad || 1))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <RepuestosBottomSheet
                                isOpen={sheetRepuestosOpen}
                                onClose={() => setSheetRepuestosOpen(false)}
                                repuestos={repuestosDisponibles}
                                seleccionados={repuestosAgregados}
                                onChange={nuevos => setRepuestosAgregados(nuevos)}
                            />
                        </section>

                        {/* Observaciones */}
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Observaciones</p>
                            <textarea
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                placeholder="Anota cualquier detalle del trabajo realizado..."
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl text-[13px] border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] outline-none resize-none"
                            />
                        </section>

                        <button onClick={() => setPaso('firmas')}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Firmas y cobro →
                        </button>
                    </>
                )}

                {/* PASO 2: FIRMAS */}
                {paso === 'firmas' && (
                    <>
                        <button onClick={() => setPaso('detalle')}
                            className="flex items-center gap-1 text-[12px] font-bold text-[#A8A29E] active:scale-95 mb-2">
                            ← Volver
                        </button>

                        <button
                            onClick={() => setIncluirFirmas(v => !v)}
                            className="flex items-center gap-2 text-[11px] text-[#A8A29E] font-bold active:scale-95 transition-all"
                        >
                            <span className={`w-8 h-4 rounded-full flex items-center transition-colors ${incluirFirmas ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E]'}`}>
                                <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${incluirFirmas ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                            Incluir firmas en el PDF
                        </button>

                        {incluirFirmas && (!editandoFirma ? (
                            <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[#FFFFFF] dark:bg-[#242424]">
                                <span className="text-[12px] font-bold text-[#16A34A]">✓ Firma del tecnico guardada</span>
                                <button onClick={() => setEditandoFirma(true)}
                                    className="ml-auto text-[11px] font-bold text-[#A8A29E]">Cambiar</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <FirmaPad label="Firma del tecnico" value={firmaTecnico} onChange={setFirmaTecnico} height={100} />
                                <div className="flex items-center gap-2">
                                    <button onClick={guardarFirma} disabled={!firmaTecnico}
                                        className="text-[11px] px-3 py-1.5 rounded-full bg-[#D13A28] text-white font-bold disabled:opacity-40 active:scale-95">
                                        Guardar mi firma
                                    </button>
                                    <span className="text-[10px] text-[#A8A29E]">Se recordara para proximas veces</span>
                                </div>
                            </div>
                        ))}

                        {incluirFirmas && (
                            <FirmaPad label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente} height={160} />
                        )}

                        <button onClick={() => setPaso('cobro')}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Definir cobro →
                        </button>
                    </>
                )}

                {/* PASO 3: COBRO */}
                {paso === 'cobro' && pricing && (
                    <>
                        <button onClick={() => setPaso('firmas')}
                            className="flex items-center gap-1 text-[12px] font-bold text-[#A8A29E] active:scale-95 mb-2">
                            ← Volver
                        </button>

                        <div className="text-center py-1">
                            <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                {pricing.esVisita ? 'Cobro de visita' : 'Cobro del servicio'}
                            </p>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">Selecciona como paga el cliente</p>
                        </div>

                        {/* Desglose MO + repuestos */}
                        <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06] p-4 space-y-2">
                            <div className="flex justify-between text-[12px]">
                                <span className="text-[#57534E] dark:text-[#9E9A94]">
                                    {pricing.esVisita ? 'Visita diagnostica' : 'Mano de obra'}
                                </span>
                                <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">
                                    {fmt(pricing.esVisita ? pricing.moVisitaBase : pricing.moFacturada)}
                                </span>
                            </div>
                            {!pricing.esVisita && pricing.totalRepuestos > 0 && (
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#57534E] dark:text-[#9E9A94]">Repuestos</span>
                                    <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">{fmt(pricing.totalRepuestos)}</span>
                                </div>
                            )}
                            {!pricing.esVisita && costoMOExtra > 0 && (
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-[#57534E] dark:text-[#9E9A94]">Ajuste MO extra</span>
                                    <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">+{fmt(costoMOExtra * (1 + pricing.pctImp / 100))}</span>
                                </div>
                            )}
                        </div>

                        {/* Ajuste MO (solo subir) */}
                        {!pricing.esVisita && (
                            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06] p-3">
                                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-2">Ajustar mano de obra (solo subir)</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-[#57534E] dark:text-[#9E9A94]">Extra:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={costoMOExtra || ''}
                                        onChange={e => setCostoMOExtra(Math.max(0, Number(e.target.value) || 0))}
                                        placeholder="0"
                                        className="flex-1 px-3 py-2 rounded-lg text-[13px] bg-[#F5F3F1] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Opciones de cobro */}
                        <div className="space-y-2">
                            {/* Efectivo sin factura */}
                            <button
                                onClick={() => setModalidadCobro('EFECTIVO_SIN_FACTURA')}
                                className={`w-full p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] ${
                                    modalidadCobro === 'EFECTIVO_SIN_FACTURA'
                                        ? 'border-[#D13A28] dark:border-[#E8422F] bg-[#D13A28]/5 dark:bg-[#E8422F]/5'
                                        : 'border-black/[0.06] dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#242424]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Efectivo sin factura</p>
                                        <p className="text-[10px] text-[#A8A29E] mt-0.5">
                                            {pricing.esVisita ? 'Mitad MO' : `${pricing.pctDesc}% descuento`} · Cobras en mano
                                        </p>
                                    </div>
                                    <p className="text-[20px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                        {fmt(pricing.totalEfectivo)}
                                    </p>
                                </div>
                            </button>

                            {/* Con factura */}
                            <button
                                onClick={() => setModalidadCobro('CON_FACTURA')}
                                className={`w-full p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] ${
                                    modalidadCobro === 'CON_FACTURA'
                                        ? 'border-[#D48800] dark:border-[#F0A500] bg-[#D48800]/5 dark:bg-[#F0A500]/5'
                                        : 'border-black/[0.06] dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#242424]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Con factura</p>
                                        <p className="text-[10px] text-[#A8A29E] mt-0.5">
                                            {pricing.esVisita ? `+${pricing.pctIVA}% IVA` : `+${pricing.pctImp}% impuestos`} · Admin gestiona cobro
                                        </p>
                                    </div>
                                    <p className="text-[20px] font-black text-[#D48800] dark:text-[#F0A500]">
                                        {fmt(pricing.totalFacturado)}
                                    </p>
                                </div>
                            </button>

                            {/* Definir despues */}
                            <button
                                onClick={() => setModalidadCobro('PENDIENTE')}
                                className={`w-full p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] ${
                                    modalidadCobro === 'PENDIENTE'
                                        ? 'border-[#A8A29E] bg-[#A8A29E]/5'
                                        : 'border-black/[0.06] dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#242424]'
                                }`}
                            >
                                <div>
                                    <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Definir despues</p>
                                    <p className="text-[10px] text-[#A8A29E] mt-0.5">El admin decide la modalidad</p>
                                </div>
                            </button>
                        </div>

                        <button onClick={confirmar} disabled={procesando || !modalidadCobro}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] disabled:opacity-50 transition-all">
                            {procesando ? 'Procesando...' : '✓ Confirmar trabajo'}
                        </button>
                    </>
                )}

                {/* PASO 4: RESUMEN */}
                {paso === 'resumen' && resumenGanancias && (
                    <div className="space-y-4">
                        <div className="text-center py-2">
                            <p className="text-[36px] mb-1">✅</p>
                            <p className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Trabajo confirmado</p>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' && 'Cobrado en efectivo'}
                                {resumenGanancias.modalidadCobro === 'CON_FACTURA' && 'Pendiente facturacion (admin)'}
                                {resumenGanancias.modalidadCobro === 'PENDIENTE' && 'Pendiente definir cobro (admin)'}
                            </p>
                        </div>

                        <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06]">
                            <div className="px-4 py-3 space-y-2.5">
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#57534E] dark:text-[#9E9A94]">
                                        {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'Cobrado' : 'Total servicio'}
                                    </span>
                                    <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                        {fmt(resumenGanancias.montoFinal)}
                                    </span>
                                </div>
                            </div>
                            {/* Tu parte destacada */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                                <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] uppercase tracking-wide">
                                    {resumenGanancias.esVisita ? 'Te llevas' : 'Tu parte (50% MO)'}
                                </p>
                                <p className="text-[24px] font-black text-[#D48800] dark:text-[#F0A500]">
                                    {fmt(resumenGanancias.parteTecnico)}
                                </p>
                            </div>
                        </div>

                        <button onClick={() => { if (onConfirmado) onConfirmado(); }}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Listo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
