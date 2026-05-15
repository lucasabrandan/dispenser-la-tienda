/**
 * EjecutarOrdenSheet
 * Vista simplificada para técnicos al ejecutar un presupuesto asignado.
 * - Muestra los equipos y trabajo (read-only)
 * - Permite agregar repuestos (solo ve nombre + precio de venta)
 * - Permite escribir observaciones
 * - Captura firmas (opcionales)
 * - Confirma → PUT /servicios/:id con estado REALIZADO + genera PDF
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FirmaPad from '../ui/FirmaPad';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';

export default function EjecutarOrdenSheet({ servicio, onConfirmado, onCerrar }) {
    const { usuario } = useAuth();

    const [paso, setPaso] = useState('detalle'); // 'detalle' | 'firmas' | 'resumen'
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

    useEffect(() => {
        // Cargar firma guardada del técnico
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoFirma(true);
        } catch {}
        // Cargar lista de repuestos disponibles — endpoint devuelve Page<Repuesto>
        api.get('/repuestos', { params: { size: 1000 } })
            .then(r => setRepuestosDisponibles(r.data?.content || r.data || []))
            .catch(() => {});
    }, []);

    // Total original de la orden
    const totalOriginal = servicio.items?.reduce((s, it) => s + Number(it.costo || 0), 0) || 0;
    // Total de repuestos nuevos que agregó el técnico
    const totalRepuestosNuevos = repuestosAgregados.reduce((s, r) => s + (parseFloat(r.precio) || 0) * (r.cantidad || 1), 0);
    const descPct = servicio.descuentoPorcentaje || 0;
    const totalFinal = Math.round((totalOriginal + totalRepuestosNuevos) * (1 - descPct / 100));

    const guardarFirma = async () => {
        if (!firmaTecnico) return;
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            // Usar el endpoint propio del usuario (no el de admin, que podría causar 401→reload)
            api.patch('/auth/mi-firma', { firma: firmaTecnico }).catch(() => {});
            setEditandoFirma(false);
        } catch {}
    };

    const confirmar = async () => {
        if (!usuario?.id) {
            toast.error('No se pudo identificar tu usuario. Cerrá sesión y volvé a entrar.');
            return;
        }
        setProcesando(true);
        const loading = toast.loading('Confirmando trabajo...');
        try {
            // Merge repuestos nuevos en el primer ítem
            const itemsActualizados = (servicio.items || []).map((it, i) => ({
                equipoSerial:     it.equipoSerial || 'MOSTRADOR',
                tecnico:          it.tecnico || usuario?.nombre || 'Técnico',
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

            await api.put(`/servicios/${servicio.id}`, {
                sedeId:              servicio.sedeId,
                usuarioId:           usuario?.id || servicio.usuarioId,
                fecha:               servicio.fecha,
                servicioTipo:        servicio.servicioTipo || 'TECNICA',
                estado:              'REALIZADO',
                clienteNombre:       servicio.clienteNombre,
                sedeNombre:          servicio.sedeNombre,
                descuentoPorcentaje: descPct,
                totalConDescuento:   totalFinal,
                observaciones,
                items:               itemsActualizados,
            });

            toast.success('Trabajo confirmado', { id: loading });

            // Calcular resumen de ganancias para mostrar al técnico
            const totalRepuestosOriginales = (servicio.items || []).reduce((s, it) => {
                const reps = it.repuestosUsados || [];
                return s + reps.reduce((a, r) => a + (Number(r.precio || 0) * Number(r.cantidad || 1)), 0);
            }, 0);
            const totalRepuestosTodos = totalRepuestosOriginales + totalRepuestosNuevos;
            const impuestos  = Math.round(totalFinal * 0.30);
            const gananciaNet = Math.max(0, totalFinal - impuestos - totalRepuestosTodos);
            const parteTecnico = Math.round(gananciaNet / 2);
            setResumenGanancias({ totalFinal, impuestos, totalRepuestos: totalRepuestosTodos, gananciaNet, parteTecnico });

            // Generar PDF — si falla (popup blocker, etc.) el trabajo ya está guardado
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
                    tecnico:             usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Técnico',
                    ticketItems,
                    fechaServicio:       servicio.fecha,
                    descuentoPorcentaje: descPct,
                    leyenda:             observaciones,
                    esTecnicoForzado:    true,
                    firmaTecnico:        incluirFirmas ? (firmaTecnico || null) : null,
                    firmaCliente:        incluirFirmas ? (firmaCliente || null) : null,
                    incluirFirmas,
                });
            } catch (pdfErr) {
                // PDF no bloqueante: el trabajo ya está guardado aunque el PDF falle
                console.warn('PDF no generado:', pdfErr);
                toast('Trabajo guardado. PDF no disponible (bloqueado por el navegador)', { icon: '⚠️' });
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
                            ${totalFinal.toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>
                {/* Steps */}
                <div className="flex gap-1 mt-3">
                    {['detalle', 'firmas'].map((s, i) => (
                        <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${paso === s || (i === 0) ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E]'} ${paso === 'firmas' && s === 'firmas' ? 'bg-[#D13A28] dark:bg-[#E8422F]' : ''}`} />
                    ))}
                </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

                {/* ── PASO 1: DETALLE ──────────────────────────────────────── */}
                {paso === 'detalle' && (
                    <>
                        {/* Equipos y trabajo (read-only) */}
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
                                                    {r.cantidad}× {r.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>

                        {/* Repuestos adicionales — usa el mismo selector visual que VentaManager */}
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

                            {/* Lista de repuestos seleccionados con miniatura */}
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
                                                <p className="text-[10px] text-[#A8A29E]">${Number(r.precio).toLocaleString('es-AR')} c/u</p>
                                            </div>
                                            <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0">×{r.cantidad}</span>
                                            <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] shrink-0 w-16 text-right">
                                                ${((parseFloat(r.precio) || 0) * (r.cantidad || 1)).toLocaleString('es-AR')}
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
                                placeholder="Anotá cualquier detalle del trabajo realizado..."
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl text-[13px] border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] outline-none resize-none"
                            />
                        </section>

                        <button onClick={() => setPaso('firmas')}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Firmas y confirmar →
                        </button>
                    </>
                )}

                {/* ── PASO 3: RESUMEN GANANCIAS ────────────────────────────── */}
                {paso === 'resumen' && resumenGanancias && (
                    <div className="space-y-4">
                        <div className="text-center py-2">
                            <p className="text-[36px] mb-1">✅</p>
                            <p className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Trabajo confirmado</p>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">Tu resumen de este trabajo</p>
                        </div>

                        {/* Desglose */}
                        <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424]"
                            style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                            <div className="px-4 py-3 space-y-2.5">
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#57534E] dark:text-[#9E9A94]">Total cobrado</span>
                                    <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                        ${resumenGanancias.totalFinal.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#A8A29E]">− Impuestos (30%)</span>
                                    <span className="font-bold text-[#D13A28] dark:text-[#E8422F]">
                                        −${resumenGanancias.impuestos.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                {resumenGanancias.totalRepuestos > 0 && (
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#A8A29E]">− Repuestos</span>
                                        <span className="font-bold text-[#D13A28] dark:text-[#E8422F]">
                                            −${resumenGanancias.totalRepuestos.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[13px] pt-2 border-t border-black/[0.07] dark:border-white/[0.07]">
                                    <span className="text-[#57534E] dark:text-[#9E9A94]">Ganancia neta</span>
                                    <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                        ${resumenGanancias.gananciaNet.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                            {/* Tu parte destacada */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                                <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] uppercase tracking-wide">
                                    Tu parte (50%)
                                </p>
                                <p className="text-[24px] font-black text-[#D48800] dark:text-[#F0A500]">
                                    ${resumenGanancias.parteTecnico.toLocaleString('es-AR')}
                                </p>
                            </div>
                        </div>

                        <button onClick={() => { if (onConfirmado) onConfirmado(); }}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Listo
                        </button>
                    </div>
                )}

                {/* ── PASO 2: FIRMAS ───────────────────────────────────────── */}
                {paso === 'firmas' && (
                    <>
                        <button onClick={() => setPaso('detalle')}
                            className="flex items-center gap-1 text-[12px] font-bold text-[#A8A29E] active:scale-95 mb-2">
                            ← Volver
                        </button>

                        {/* Toggle firmas */}
                        <button
                            onClick={() => setIncluirFirmas(v => !v)}
                            className="flex items-center gap-2 text-[11px] text-[#A8A29E] font-bold active:scale-95 transition-all"
                        >
                            <span className={`w-8 h-4 rounded-full flex items-center transition-colors ${incluirFirmas ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E]'}`}>
                                <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${incluirFirmas ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                            Incluir firmas en el PDF
                        </button>

                        {/* Firma técnico */}
                        {incluirFirmas && (!editandoFirma ? (
                            <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[#FFFFFF] dark:bg-[#242424]">
                                <span className="text-[12px] font-bold text-[#16A34A]">✓ Firma del técnico guardada</span>
                                <button onClick={() => setEditandoFirma(true)}
                                    className="ml-auto text-[11px] font-bold text-[#A8A29E]">Cambiar</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <FirmaPad label="Firma del técnico" value={firmaTecnico} onChange={setFirmaTecnico} height={100} />
                                <div className="flex items-center gap-2">
                                    <button onClick={guardarFirma} disabled={!firmaTecnico}
                                        className="text-[11px] px-3 py-1.5 rounded-full bg-[#D13A28] text-white font-bold disabled:opacity-40 active:scale-95">
                                        Guardar mi firma
                                    </button>
                                    <span className="text-[10px] text-[#A8A29E]">Se recordará para próximas veces</span>
                                </div>
                            </div>
                        ))}

                        {/* Firma cliente — height fijo para evitar que el canvas se limpie al guardar la firma técnico */}
                        {incluirFirmas && (
                            <FirmaPad label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente}
                                height={160} />
                        )}

                        <button onClick={confirmar} disabled={procesando}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] disabled:opacity-50 transition-all">
                            {procesando ? 'Procesando...' : '✓ Confirmar y PDF'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
