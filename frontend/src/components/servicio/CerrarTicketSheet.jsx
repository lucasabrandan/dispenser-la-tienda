import React, { useState, useEffect } from 'react';
import FirmaPad from '../ui/FirmaPad';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const PRIORIDADES = [
    { value: 'BAJA',    label: 'Baja'    },
    { value: 'NORMAL',  label: 'Normal'  },
    { value: 'ALTA',    label: 'Alta'    },
    { value: 'URGENTE', label: 'Urgente' },
];
const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D48800]/40 placeholder:text-[#A8A29E]';
const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

/**
 * CerrarTicketSheet
 *
 * Dos flujos claramente separados:
 * A) CREAR NUEVO (modoEjecucion=false) → guarda presupuesto → ofrece despachar
 * B) EJECUTAR EXISTENTE (modoEjecucion=true) → firmas → confirma cobro → PDF
 */
export default function CerrarTicketSheet({
    modoEjecucion = false,
    totalFinal,
    descuentoPorcentaje,
    onCobrar,     // async ({ firmaTecnico, firmaCliente, incluirFirmas }) → void
    onGuardar,    // async () → { ok, id, clienteId, clienteNombre, tecnicoId, fechaVisita } | null
    onCerrar,
}) {
    const { esAdmin } = useAuth();

    // Flujo A: crear nuevo → 'confirmar' → 'presupuesto_ok'
    // Flujo B: ejecutar → 'cobrar'
    const [paso, setPaso] = useState(modoEjecucion ? 'cobrar' : 'confirmar');

    // Firmas (solo para flujo B: ejecutar)
    const [firmaTecnico,   setFirmaTecnico]   = useState(null);
    const [firmaCliente,   setFirmaCliente]   = useState(null);
    const [editandoTecnico, setEditandoTecnico] = useState(false);
    const [guardandoFirma, setGuardandoFirma] = useState(false);
    const [incluirFirmas,  setIncluirFirmas]  = useState(true);

    // Post-guardado despacho (flujo A)
    const [savedResult,   setSavedResult]   = useState(null);
    const [creandoOrden,  setCreandoOrden]  = useState(false);
    const [ordenCreada,   setOrdenCreada]   = useState(false);

    // Formulario despacho rápido
    const [tecnicos,      setTecnicos]      = useState([]);
    const [dispTecnico,   setDispTecnico]   = useState('');
    const [dispFecha,     setDispFecha]     = useState('');
    const [dispHora,      setDispHora]      = useState('');
    const [dispPrioridad, setDispPrioridad] = useState('NORMAL');

    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        if (modoEjecucion) {
            // Cargar firma técnico guardada
            try {
                const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
                if (user.firma) setFirmaTecnico(user.firma);
                else            setEditandoTecnico(true);
            } catch {}
        }
        if (esAdmin) {
            api.get('/admin/usuarios')
                .then(r => setTecnicos((r.data || []).filter(u => u.activo)))
                .catch(() => {});
            setDispFecha(new Date().toISOString().split('T')[0]);
        }
    }, [esAdmin, modoEjecucion]);

    const tecnicoFirmaGuardada = !!firmaTecnico && !editandoTecnico;

    const guardarFirmaTecnico = async () => {
        if (!firmaTecnico) return;
        setGuardandoFirma(true);
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            setEditandoTecnico(false);
            if (user.id) {
                api.put(`/admin/usuarios/${user.id}/firma`, { firma: firmaTecnico }).catch(() => {});
            }
        } finally {
            setGuardandoFirma(false);
        }
    };

    // Flujo B: confirmar cobro con firmas
    const handleCobrar = async () => {
        setProcesando(true);
        try {
            await onCobrar({
                firmaTecnico: incluirFirmas ? firmaTecnico : null,
                firmaCliente: incluirFirmas ? firmaCliente : null,
                incluirFirmas,
            });
            onCerrar();
        } finally {
            setProcesando(false);
        }
    };

    // Flujo A: guardar presupuesto
    const handleGuardar = async () => {
        setProcesando(true);
        try {
            const result = await onGuardar();
            if (result?.ok) {
                setSavedResult(result);
                // Auto-despacho si técnico + fecha ya están
                if (result.tecnicoId && result.fechaVisita) {
                    setCreandoOrden(true);
                    try {
                        await api.post('/ordenes', {
                            titulo:          `Visita — ${result.clienteNombre || 'Cliente'}`,
                            clienteId:       result.clienteId ? parseInt(result.clienteId) : null,
                            clienteNombre:   result.clienteNombre || '',
                            presupuestoId:   result.id,
                            tecnicoId:       Number(result.tecnicoId),
                            fechaProgramada: result.fechaVisita,
                            prioridad:       'NORMAL',
                        });
                        setOrdenCreada(true);
                        toast.success('Presupuesto guardado y orden creada');
                    } catch {
                        toast.error('Presupuesto guardado, pero error al crear la orden');
                    } finally {
                        setCreandoOrden(false);
                    }
                } else if (result.tecnicoId) {
                    setDispTecnico(String(result.tecnicoId));
                }
                setPaso('presupuesto_ok');
            }
        } finally {
            setProcesando(false);
        }
    };

    const handleCrearOrden = async () => {
        if (!savedResult) return;
        if (!dispTecnico) { toast.error('Seleccioná un técnico'); return; }
        if (!dispFecha)   { toast.error('Ingresá una fecha');      return; }
        setCreandoOrden(true);
        try {
            await api.post('/ordenes', {
                titulo:          `Visita — ${savedResult.clienteNombre || 'Cliente'}`,
                clienteId:       savedResult.clienteId ? parseInt(savedResult.clienteId) : null,
                clienteNombre:   savedResult.clienteNombre || '',
                presupuestoId:   savedResult.id,
                tecnicoId:       Number(dispTecnico),
                fechaProgramada: dispFecha,
                horaEstimada:    dispHora || null,
                prioridad:       dispPrioridad,
                descripcion:     '',
            });
            setOrdenCreada(true);
            toast.success('Orden de visita creada');
        } catch {
            toast.error('No se pudo crear la orden');
        } finally {
            setCreandoOrden(false);
        }
    };

    const sheetCls = 'fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm';
    const panelCls = 'w-full max-w-lg bg-[#FFFFFF] dark:bg-[#242424] rounded-t-[2rem] shadow-2xl overflow-hidden';

    return (
        <div className={sheetCls} onClick={paso === 'confirmar' ? onCerrar : undefined}>
            <div className={panelCls} onClick={e => e.stopPropagation()}>

                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />

                {/* ═══ FLUJO A: CREAR NUEVO → Confirmar presupuesto ═══ */}
                {paso === 'confirmar' && (
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Total presupuesto</p>
                            <p className="text-[32px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                                ${(totalFinal || 0).toLocaleString('es-AR')}
                            </p>
                            {descuentoPorcentaje > 0 && (
                                <p className="text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] mt-0.5">
                                    Con {descuentoPorcentaje}% descuento aplicado
                                </p>
                            )}
                        </div>

                        <button onClick={handleGuardar} disabled={procesando}
                            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] bg-[#D48800] dark:bg-[#F0A500] text-white disabled:opacity-50">
                            <p className="text-[15px] font-black leading-none mb-1">
                                {procesando ? 'Guardando…' : '📋 Guardar presupuesto'}
                            </p>
                            <p className="text-[11px] opacity-80">Se guarda y podés despachar un técnico</p>
                        </button>

                        <button onClick={onCerrar}
                            className="w-full py-3 text-[11px] font-bold text-[#A8A29E] uppercase tracking-wide active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ═══ FLUJO A: Post-guardado → Despachar ═══ */}
                {paso === 'presupuesto_ok' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[24px]">✅</span>
                            <div>
                                <p className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">Presupuesto guardado</p>
                                {savedResult?.id && (
                                    <p className="text-[11px] text-[#A8A29E] mt-0.5">#{savedResult.id}</p>
                                )}
                            </div>
                        </div>

                        {!ordenCreada ? (
                            <>
                                <p className="text-[12px] font-black text-[#A8A29E] uppercase tracking-widest">
                                    ¿Despachar ahora? (opcional)
                                </p>

                                <div>
                                    <label className={labelCls}>Técnico *</label>
                                    {savedResult?.tecnicoId ? (
                                        <div className={`${inputCls} opacity-70`}>
                                            {tecnicos.find(t => String(t.id) === String(dispTecnico))?.nombre || `Técnico #${dispTecnico}`}
                                        </div>
                                    ) : (
                                        <select value={dispTecnico} onChange={e => setDispTecnico(e.target.value)} className={inputCls}>
                                            <option value="">Seleccionar técnico...</option>
                                            {tecnicos.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Fecha *</label>
                                        <input type="date" value={dispFecha} onChange={e => setDispFecha(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Hora est.</label>
                                        <input type="time" value={dispHora} onChange={e => setDispHora(e.target.value)} className={inputCls} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Prioridad</label>
                                    <select value={dispPrioridad} onChange={e => setDispPrioridad(e.target.value)} className={inputCls}>
                                        {PRIORIDADES.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={onCerrar}
                                        className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                        Ahora no
                                    </button>
                                    <button onClick={handleCrearOrden} disabled={creandoOrden || !dispTecnico || !dispFecha}
                                        className="flex-[2] py-3 rounded-2xl text-[11px] font-black uppercase text-white active:scale-95 bg-[#D48800] dark:bg-[#F0A500] disabled:opacity-40">
                                        {creandoOrden ? 'Creando…' : '🚀 Despachar'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                    <span className="text-[12px] font-bold text-[#1E8A4A]">✓ Orden de visita creada y asignada</span>
                                </div>
                                <button onClick={onCerrar}
                                    className="w-full py-3 rounded-2xl text-[11px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    Listo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ FLUJO B: EJECUTAR → Firmas + cobro ═══ */}
                {paso === 'cobrar' && (
                    <div className="p-6 space-y-4">
                        <div>
                            <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                                Confirmar trabajo
                            </h3>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">Firmas para el PDF</p>
                        </div>

                        {/* Firma técnico */}
                        {incluirFirmas && (tecnicoFirmaGuardada ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                <span className="text-[12px] font-bold text-[#1E8A4A]">✓ Firma técnico guardada</span>
                                <button onClick={() => setEditandoTecnico(true)}
                                    className="ml-auto text-[11px] text-[#A8A29E] hover:text-[#D13A28] transition-colors font-bold">
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div>
                                <FirmaPad label="Firma del técnico" value={firmaTecnico}
                                    onChange={v => setFirmaTecnico(v)} height={100} />
                                <div className="flex items-center gap-2 mt-1.5">
                                    <button onClick={guardarFirmaTecnico} disabled={!firmaTecnico || guardandoFirma}
                                        className="text-[11px] px-3 py-1 rounded-full bg-[#D13A28] text-white font-bold disabled:opacity-40">
                                        {guardandoFirma ? 'Guardando…' : 'Guardar mi firma'}
                                    </button>
                                    <span className="text-[10px] text-[#A8A29E]">Se usa automáticamente</span>
                                </div>
                            </div>
                        ))}

                        {/* Firma cliente */}
                        {incluirFirmas && (
                            <FirmaPad label="Firma del cliente" value={firmaCliente}
                                onChange={setFirmaCliente} height={tecnicoFirmaGuardada ? 160 : 120} />
                        )}

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

                        {/* Botones */}
                        <div className="flex gap-2 pt-1">
                            <button onClick={onCerrar}
                                className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                Cancelar
                            </button>
                            <button onClick={handleCobrar} disabled={procesando}
                                className="flex-[2] py-3 rounded-2xl text-[11px] font-black uppercase text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] disabled:opacity-50">
                                {procesando ? 'Procesando…' : '✓ Confirmar y PDF'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
