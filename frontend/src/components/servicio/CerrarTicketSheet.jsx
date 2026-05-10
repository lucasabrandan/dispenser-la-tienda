import React, { useState, useEffect } from 'react';
import FirmaPad from '../ui/FirmaPad';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

/**
 * CerrarTicketSheet
 * Bottom sheet que reemplaza los botones Guardar/Confirmar.
 * Paso 1 → dos opciones: Cobrar ahora / Guardar presupuesto
 * Paso 2a (cobrar)       → firmas → confirma cobro → genera PDF
 * Paso 2b (presupuesto)  → guarda → ofrece crear orden de despacho
 */
export default function CerrarTicketSheet({
    modoEjecucion = false,
    totalFinal,
    descuentoPorcentaje,
    onCobrar,     // async ({ firmaTecnico, firmaCliente }) → void
    onGuardar,    // async () → { ok, id, clienteId, clienteNombre, tecnicoId } | null
    onCerrar,
}) {
    // 'menu' | 'cobrar' | 'presupuesto_ok'
    const [paso, setPaso] = useState(modoEjecucion ? 'cobrar' : 'menu');

    // Firmas
    const [firmaTecnico,   setFirmaTecnico]   = useState(null);
    const [firmaCliente,   setFirmaCliente]   = useState(null);
    const [editandoTecnico, setEditandoTecnico] = useState(false);
    const [guardandoFirma, setGuardandoFirma] = useState(false);

    // Post-guardado despacho
    const [savedResult,   setSavedResult]   = useState(null); // { id, clienteId, clienteNombre, tecnicoId }
    const [creandoOrden,  setCreandoOrden]  = useState(false);
    const [ordenCreada,   setOrdenCreada]   = useState(false);

    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else            setEditandoTecnico(true);
        } catch {}
    }, []);

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

    const handleCobrar = async () => {
        setProcesando(true);
        try {
            await onCobrar({
                firmaTecnico: tecnicoFirmaGuardada ? firmaTecnico : firmaTecnico,
                firmaCliente,
            });
            onCerrar();
        } finally {
            setProcesando(false);
        }
    };

    const handleGuardar = async () => {
        setProcesando(true);
        try {
            const result = await onGuardar();
            if (result?.ok) {
                setSavedResult(result);
                setPaso('presupuesto_ok');
            }
        } finally {
            setProcesando(false);
        }
    };

    const handleCrearOrden = async () => {
        if (!savedResult) return;
        setCreandoOrden(true);
        try {
            await api.post('/ordenes', {
                titulo:          `Visita - ${savedResult.clienteNombre || 'Cliente'}`,
                clienteId:       savedResult.clienteId ? parseInt(savedResult.clienteId) : null,
                clienteNombre:   savedResult.clienteNombre || '',
                presupuestoId:   savedResult.id,
                prioridad:       'NORMAL',
                descripcion:     '',
                tecnicoId:       savedResult.tecnicoId || null,
            });
            setOrdenCreada(true);
            toast.success('Orden de visita creada');
        } catch {
            toast.error('No se pudo crear la orden');
        } finally {
            setCreandoOrden(false);
        }
    };

    // ── Estilos compartidos ───────────────────────────────────────────────────
    const sheetCls = `
        fixed inset-0 z-[200] flex items-end justify-center
        bg-black/60 backdrop-blur-sm
    `;
    const panelCls = `
        w-full max-w-lg bg-[#EDEAE6] dark:bg-[#242424]
        rounded-t-[2rem] shadow-2xl overflow-hidden
    `;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={sheetCls} onClick={paso === 'menu' ? onCerrar : undefined}>
            <div className={panelCls} onClick={e => e.stopPropagation()}>

                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />

                {/* ── PASO MENU ──────────────────────────────────────────── */}
                {paso === 'menu' && (
                    <div className="p-6 space-y-3">
                        <div className="mb-4">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Total</p>
                            <p className="text-[32px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                                ${(totalFinal || 0).toLocaleString('es-AR')}
                            </p>
                            {descuentoPorcentaje > 0 && (
                                <p className="text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] mt-0.5">
                                    Con {descuentoPorcentaje}% descuento aplicado
                                </p>
                            )}
                        </div>

                        {/* Cobrar ahora */}
                        <button onClick={() => setPaso('cobrar')}
                            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] bg-[#D13A28] dark:bg-[#E8422F] text-white">
                            <p className="text-[15px] font-black leading-none mb-1">💰 Cobrar ahora</p>
                            <p className="text-[11px] opacity-80">Firma del cliente, PDF y cierre del ticket</p>
                        </button>

                        {/* Guardar presupuesto */}
                        <button onClick={handleGuardar} disabled={procesando}
                            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] bg-[#EDEAE6] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07] disabled:opacity-50">
                            <p className="text-[15px] font-black leading-none mb-1 text-[#1C1917] dark:text-[#F0EEE9]">
                                {procesando ? 'Guardando…' : '📋 Guardar presupuesto'}
                            </p>
                            <p className="text-[11px] text-[#A8A29E]">Quedará pendiente para confirmar después</p>
                        </button>

                        <button onClick={onCerrar}
                            className="w-full py-3 text-[11px] font-bold text-[#A8A29E] uppercase tracking-wide active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ── PASO COBRAR ────────────────────────────────────────── */}
                {paso === 'cobrar' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            {!modoEjecucion && (
                                <button onClick={() => setPaso('menu')}
                                    className="w-8 h-8 rounded-xl bg-[#C0BCB6] dark:bg-[#2E2E2E] flex items-center justify-center text-[#57534E] dark:text-[#9E9A94] text-sm font-bold">
                                    ←
                                </button>
                            )}
                            <div>
                                <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                                    {modoEjecucion ? 'Confirmar trabajo' : 'Cobrar ahora'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">Firmas para el PDF</p>
                            </div>
                        </div>

                        {/* Firma técnico */}
                        {tecnicoFirmaGuardada ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
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
                        )}

                        {/* Firma cliente */}
                        <FirmaPad label="Firma del cliente" value={firmaCliente}
                            onChange={setFirmaCliente} height={tecnicoFirmaGuardada ? 160 : 120} />

                        {/* Botones */}
                        <div className="flex gap-2 pt-1">
                            {!modoEjecucion && (
                                <button onClick={() => setPaso('menu')}
                                    className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Volver
                                </button>
                            )}
                            <button onClick={handleCobrar} disabled={procesando}
                                className="flex-[2] py-3 rounded-2xl text-[11px] font-black uppercase text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] disabled:opacity-50">
                                {procesando ? 'Procesando…' : modoEjecucion ? '✓ Confirmar y PDF' : '✓ Cobrar y PDF'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO PRESUPUESTO GUARDADO ──────────────────────────── */}
                {paso === 'presupuesto_ok' && (
                    <div className="p-6 space-y-4">
                        <div className="text-center py-2">
                            <p className="text-[32px] mb-1">✅</p>
                            <p className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Presupuesto guardado</p>
                            {savedResult?.id && (
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">#{savedResult.id}</p>
                            )}
                        </div>

                        {!ordenCreada ? (
                            <>
                                <div className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.06]">
                                    <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-1">
                                        ¿Crear orden de visita?
                                    </p>
                                    <p className="text-[11px] text-[#A8A29E]">
                                        Aparece en Despacho para asignar fecha y técnico
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={onCerrar}
                                        className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                        No, listo
                                    </button>
                                    <button onClick={handleCrearOrden} disabled={creandoOrden}
                                        className="flex-[2] py-3 rounded-2xl text-[11px] font-black uppercase text-white active:scale-95 bg-[#D48800] dark:bg-[#F0A500] disabled:opacity-50">
                                        {creandoOrden ? 'Creando…' : '+ Crear orden'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                                    <span className="text-[12px] font-bold text-[#1E8A4A]">✓ Orden de visita creada</span>
                                </div>
                                <button onClick={onCerrar}
                                    className="w-full py-3 rounded-2xl text-[11px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    Listo
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
