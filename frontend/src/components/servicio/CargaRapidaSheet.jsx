import React, { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';

async function comprimirFoto(file) {
    try {
        return await imageCompression(file, {
            maxSizeMB: 0.3, maxWidthOrHeight: 900, useWebWorker: false, fileType: 'image/jpeg',
        });
    } catch { return file; }
}

function fileADataUrl(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror  = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

/**
 * CargaRapidaSheet — modo ráfaga para cargar muchos equipos rápido.
 * Copia trabajo, MO y repuestos del último equipo cargado.
 * Solo pide: foto + serial + ubicación (lo que cambia por equipo).
 */
export default function CargaRapidaSheet({ isOpen, onClose, hook, onEquipoAgregado }) {
    const {
        ticketItems, itemActual, setItemActual, agregarAlTicket,
    } = hook;

    const [serial, setSerial]         = useState('');
    const [ubicacion, setUbicacion]   = useState('');
    const [trabajo, setTrabajo]       = useState('');
    const [costoExtra, setCostoExtra] = useState('');
    const [repuestos, setRepuestos]   = useState([]);
    const [foto, setFoto]             = useState(null);
    const [guardando, setGuardando]   = useState(false);
    const [count, setCount]           = useState(0);
    const refCamara  = useRef(null);
    const refGaleria = useRef(null);
    const serialRef  = useRef(null);

    // Al abrir, copiar datos del último equipo cargado
    useEffect(() => {
        if (!isOpen) return;
        const ultimo = ticketItems[ticketItems.length - 1];
        if (ultimo) {
            setTrabajo(ultimo.trabajo || ultimo.resumenTexto || '');
            setCostoExtra(ultimo.costoExtra || '');
            setRepuestos(ultimo.repuestosUsados || []);
        }
        setCount(0);
        setSerial('');
        setUbicacion('');
        setFoto(null);
        setTimeout(() => serialRef.current?.focus(), 300);
    }, [isOpen]); // eslint-disable-line

    const handleFoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const compressed = await comprimirFoto(file);
        const dataUrl = await fileADataUrl(compressed);
        if (dataUrl) setFoto(dataUrl);
    };

    const handleGuardar = async () => {
        if (!serial.trim() && !trabajo.trim()) {
            toast.error('Ingresá al menos el serial o el trabajo');
            return;
        }
        setGuardando(true);

        // Setear itemActual con los datos y llamar agregarAlTicket
        setItemActual(prev => ({
            ...prev,
            equipoSerial: serial.trim() || 'SIN-SN',
            ubicacionEquipo: ubicacion.trim(),
            trabajo: trabajo.trim(),
            costoExtra: parseFloat(costoExtra) || 0,
            repuestosUsados: repuestos,
            fotoAntes: foto,
            fotoDespues: null,
            esNuevoEquipo: true,
            modeloEquipo: '',
        }));

        // Esperar a que el state se actualice y luego agregar
        setTimeout(async () => {
            await agregarAlTicket();
            setCount(c => c + 1);
            // Limpiar solo lo que cambia por equipo
            setSerial('');
            setUbicacion('');
            setFoto(null);
            setGuardando(false);
            if (onEquipoAgregado) onEquipoAgregado();
            // Focus al serial para el siguiente
            setTimeout(() => serialRef.current?.focus(), 100);
        }, 50);
    };

    const totalCargado = ticketItems.reduce((a, b) => a + (b.totalCalculado || 0), 0);

    if (!isOpen) return null;

    const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/10 dark:border-white/10 placeholder:text-[#A8A29E] transition-all';

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[301] flex items-end md:items-center justify-center">
                <div className="w-full md:max-w-md bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">

                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-[#FFFFFF] dark:bg-[#242424] px-5 pt-4 pb-3 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-[#E8E5E0] dark:bg-[#2E2E2E] md:hidden" />
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">⚡ Carga Rápida</h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">Copiando trabajo del equipo anterior</p>
                            </div>
                            <button onClick={onClose}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90">✕</button>
                        </div>
                    </div>

                    <div className="px-5 py-4 space-y-3">

                        {/* Foto */}
                        <div className="flex gap-2">
                            <div className="flex-1 h-20 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center overflow-hidden">
                                {foto
                                    ? <img src={foto} className="w-full h-full object-cover" alt="Foto" />
                                    : <span className="text-2xl opacity-30">📷</span>
                                }
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <button onClick={() => refCamara.current?.click()}
                                    className="flex-1 px-3 rounded-xl text-[10px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    📷 Cámara
                                </button>
                                <button onClick={() => refGaleria.current?.click()}
                                    className="flex-1 px-3 rounded-xl text-[10px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95">
                                    🖼️ Galería
                                </button>
                            </div>
                            <input ref={refCamara} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                            <input ref={refGaleria} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                        </div>

                        {/* Serial */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">Serial *</label>
                            <input ref={serialRef} value={serial} onChange={e => setSerial(e.target.value)}
                                placeholder="Número de serie del equipo"
                                className={inputCls} />
                        </div>

                        {/* Ubicación */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">Ubicación</label>
                            <input value={ubicacion} onChange={e => setUbicacion(e.target.value)}
                                placeholder="Ej: Piso 2 - Consultorio B"
                                className={inputCls} />
                        </div>

                        {/* Trabajo (copiado, editable) */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">
                                Trabajo <span className="text-[#D48800]">(copiado)</span>
                            </label>
                            <textarea value={trabajo} onChange={e => setTrabajo(e.target.value)}
                                rows={2} className={`${inputCls} resize-none`} />
                        </div>

                        {/* MO (copiado) */}
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#1C1917] dark:bg-[#0F0F0F]">
                            <span className="text-[10px] font-black text-[#5C5954] uppercase">MO $</span>
                            <input type="number" value={costoExtra} onChange={e => setCostoExtra(e.target.value)}
                                className="flex-1 bg-transparent text-white text-xl font-black outline-none" />
                        </div>

                        {/* Repuestos (copiados) */}
                        {repuestos.length > 0 && (
                            <div className="rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] p-3">
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-1.5">
                                    Repuestos <span className="text-[#D48800]">(copiados)</span>
                                </p>
                                {repuestos.map((r, i) => (
                                    <div key={i} className="flex justify-between text-[11px] py-0.5">
                                        <span className="text-[#57534E] dark:text-[#9E9A94]">{r.cantidad}x {r.nombre}</span>
                                        <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${Math.round(r.subtotal).toLocaleString('es-AR')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer fijo */}
                    <div className="sticky bottom-0 px-5 pb-5 pt-3 bg-[#FFFFFF] dark:bg-[#242424] border-t border-black/[0.07] dark:border-white/[0.07]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-[#A8A29E]">
                                {ticketItems.length} cargados
                            </span>
                            <span className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                ${Math.round(totalCargado).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <button onClick={handleGuardar} disabled={guardando}
                            className="w-full py-3.5 rounded-2xl font-black text-[13px] text-white active:scale-[0.98] transition-all disabled:opacity-50 bg-[#D13A28] dark:bg-[#E8422F]">
                            {guardando ? 'Guardando...' : '✓ Guardar y siguiente →'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
