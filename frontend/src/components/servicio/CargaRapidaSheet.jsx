import React, { useState, useRef, useEffect, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';
import { buildSelectStyles } from './ServicioUI';

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
        db, clienteId,
    } = hook;

    const [serial, setSerial]         = useState('');
    const [esNuevo, setEsNuevo]       = useState(true);
    const [ubicacion, setUbicacion]   = useState('');
    const [trabajo, setTrabajo]       = useState('');
    const [costoExtra, setCostoExtra] = useState('');
    const [repuestos, setRepuestos]   = useState([]);
    const [fotoAntes, setFotoAntes]       = useState(null);
    const [fotoDespues, setFotoDespues]   = useState(null);
    const [guardando, setGuardando]       = useState(false);
    const [count, setCount]               = useState(0);
    const refCamaraAntes   = useRef(null);
    const refGaleriaAntes  = useRef(null);
    const refCamaraDespues = useRef(null);
    const refGaleriaDespues = useRef(null);
    const serialRef  = useRef(null);

    // Equipos del cliente para el selector
    const equiposInventario = useMemo(() => {
        if (!clienteId || !db.sedes?.length || !db.equipos?.length) return [];
        const ids = db.sedes.filter(s => s.cliente?.id?.toString() === clienteId).map(s => s.id);
        return db.equipos.filter(e => ids.includes(e.sedeId));
    }, [clienteId, db.sedes, db.equipos]);

    // Seriales ya cargados en el ticket (para no repetir)
    const serialesEnTicket = useMemo(() => new Set(ticketItems.map(t => t.equipoSerial)), [ticketItems]);

    const opcionesSerial = useMemo(() =>
        equiposInventario
            .filter(e => !serialesEnTicket.has(e.numeroSerie))
            .map(e => ({
                value: e.numeroSerie,
                label: `${e.numeroSerie}${e.modelo ? ` — ${e.modelo}` : ''}${e.ubicacion ? ` (${e.ubicacion})` : ''}`,
                equipo: e,
            }))
    , [equiposInventario, serialesEnTicket]);

    const selectStyles = useMemo(() => buildSelectStyles(document.documentElement.classList.contains('dark')), []);

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
        setEsNuevo(true);
        setUbicacion('');
        setFotoAntes(null);
        setFotoDespues(null);
        setTimeout(() => serialRef.current?.focus(), 300);
    }, [isOpen]); // eslint-disable-line

    const handleFoto = (setter) => async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const compressed = await comprimirFoto(file);
        const dataUrl = await fileADataUrl(compressed);
        if (dataUrl) setter(dataUrl);
    };

    const handleGuardar = async () => {
        if (!serial.trim() && !trabajo.trim()) {
            toast.error('Ingresá al menos el serial o el trabajo');
            return;
        }
        setGuardando(true);

        // Pasar overrides directamente — evita race condition con setItemActual
        await agregarAlTicket({
            equipoSerial: serial.trim() || 'SIN-SN',
            ubicacionEquipo: ubicacion.trim(),
            trabajo: trabajo.trim(),
            costoExtra: parseFloat(costoExtra) || 0,
            repuestosUsados: repuestos,
            fotoAntes: fotoAntes,
            fotoDespues: fotoDespues,
            esNuevoEquipo: esNuevo,
            modeloEquipo: '',
        });

        setCount(c => c + 1);
        setSerial('');
        setEsNuevo(true);
        setUbicacion('');
        setFotoAntes(null);
        setFotoDespues(null);
        setGuardando(false);
        if (onEquipoAgregado) onEquipoAgregado();
        setTimeout(() => serialRef.current?.focus(), 100);
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

                        {/* Fotos Antes / Después */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Antes */}
                            <div>
                                <label className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">Antes</label>
                                <div className="h-20 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center overflow-hidden relative">
                                    {fotoAntes
                                        ? <>
                                            <img src={fotoAntes} className="w-full h-full object-cover" alt="Antes" />
                                            <button onClick={() => setFotoAntes(null)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center">✕</button>
                                          </>
                                        : <span className="text-2xl opacity-30">📷</span>
                                    }
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <button onClick={() => refCamaraAntes.current?.click()}
                                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                        📷
                                    </button>
                                    <button onClick={() => refGaleriaAntes.current?.click()}
                                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95">
                                        🖼️
                                    </button>
                                </div>
                                <input ref={refCamaraAntes} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto(setFotoAntes)} />
                                <input ref={refGaleriaAntes} type="file" accept="image/*" className="hidden" onChange={handleFoto(setFotoAntes)} />
                            </div>
                            {/* Después */}
                            <div>
                                <label className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">Después</label>
                                <div className="h-20 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center overflow-hidden relative">
                                    {fotoDespues
                                        ? <>
                                            <img src={fotoDespues} className="w-full h-full object-cover" alt="Después" />
                                            <button onClick={() => setFotoDespues(null)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center">✕</button>
                                          </>
                                        : <span className="text-2xl opacity-30">📷</span>
                                    }
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <button onClick={() => refCamaraDespues.current?.click()}
                                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                        📷
                                    </button>
                                    <button onClick={() => refGaleriaDespues.current?.click()}
                                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95">
                                        🖼️
                                    </button>
                                </div>
                                <input ref={refCamaraDespues} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto(setFotoDespues)} />
                                <input ref={refGaleriaDespues} type="file" accept="image/*" className="hidden" onChange={handleFoto(setFotoDespues)} />
                            </div>
                        </div>

                        {/* Serial — selector con equipos del cliente */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider block mb-1">
                                Equipo *
                                {opcionesSerial.length > 0 && <span className="text-[#D48800] ml-1">({opcionesSerial.length} disponibles)</span>}
                            </label>
                            <CreatableSelect
                                ref={serialRef}
                                styles={selectStyles}
                                menuPosition="fixed"
                                menuPlacement="auto"
                                menuPortalTarget={document.body}
                                options={opcionesSerial}
                                value={serial ? { label: serial, value: serial } : null}
                                onChange={s => {
                                    if (!s) { setSerial(''); setUbicacion(''); setEsNuevo(true); return; }
                                    const eq = s.equipo || db.equipos?.find(e => e.numeroSerie === s.value);
                                    setSerial(s.value);
                                    setEsNuevo(false);
                                    if (eq?.ubicacion) setUbicacion(eq.ubicacion);
                                }}
                                onCreateOption={val => {
                                    setSerial(val);
                                    setEsNuevo(true);
                                }}
                                isClearable
                                placeholder="Buscar equipo o escribir S/N..."
                                noOptionsMessage={() => 'Escribí el S/N manualmente'}
                                formatCreateLabel={v => `Nuevo: ${v}`}
                            />
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
