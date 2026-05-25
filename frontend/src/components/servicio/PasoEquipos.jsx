import React, { useState, useRef, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import imageCompression from 'browser-image-compression';
import { Label, NextBtn, BackBtn, DSCard, DSInput, DSTextarea, M } from './ServicioUI';
import { construirUrlFoto } from '../../utils/construirUrlFoto';
import { useAuth } from '../../context/AuthContext';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import CargaRapidaSheet from './CargaRapidaSheet';

// Comprime la foto usando browser-image-compression (Web Worker) para no
// bloquear el hilo principal ni crashear por OOM en Android.
async function comprimirFoto(file) {
    try {
        return await imageCompression(file, {
            maxSizeMB:        0.3,
            maxWidthOrHeight: 900,
            useWebWorker:     false,
            fileType:         'image/jpeg',
        });
    } catch {
        return file; // si falla la compresión usamos el archivo original
    }
}

// Convierte un File a data URL (string estable que persiste en estado React).
// Guardar data URL en vez del File evita que el blob sea liberado por el GC
// antes de que jsPDF lo pueda leer al generar el PDF.
function fileADataUrl(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror  = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// Upload compacto de foto con preview portrait (formato celular).
// Dos inputs separados: uno con capture="environment" (cámara) y otro sin (galería).
// En Android, un solo input sin capture a veces no muestra la opción de cámara.
// foto puede ser: data URL (nuevo), filename del backend (edición) o null.
function FotoUpload({ label, foto, onChange }) {
    const refCamara  = useRef(null);
    const refGaleria = useRef(null);

    const preview = !foto ? null
        : foto.startsWith('data:') ? foto
        : construirUrlFoto(foto);

    const handleFile = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // permite re-seleccionar el mismo archivo
        const compressed = await comprimirFoto(file);
        const dataUrl    = await fileADataUrl(compressed);
        if (dataUrl) onChange(dataUrl);
    };

    return (
        <div className="flex flex-col gap-1">
            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-[#E8E5E0] dark:bg-[#2E2E2E] aspect-[3/4] flex items-center justify-center">
                {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-2">
                        <p className="text-2xl mb-1">📷</p>
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">{label}</p>
                    </div>
                )}
                <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-black uppercase text-white ${preview ? 'bg-black/50' : 'bg-[#D13A28]/80 dark:bg-[#E8422F]/80'}`}>
                    {preview ? `✓ ${label}` : `+ ${label}`}
                </div>
            </div>

            {/* Botones cámara / galería */}
            <div className="grid grid-cols-2 gap-1">
                <button type="button"
                    onClick={() => refCamara.current?.click()}
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
                    📷 Cámara
                </button>
                <button type="button"
                    onClick={() => refGaleria.current?.click()}
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95 transition-all">
                    🖼️ Galería
                </button>
            </div>

            {/* Inputs ocultos */}
            <input ref={refCamara}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input ref={refGaleria} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    );
}

export default function PasoEquipos({ hook, onNext, onBack, selectStyles }) {
    const {
        db, setDb, clienteId, ticketItems,
        itemActual, setItemActual,
        actualizarCantidad, quitarRepuesto,
        agregarAlTicket, calcularGananciaRepuesto,
        consultarAntecedentes, historialEquipo,
        configGlobal,
    } = hook;

    // Calcular precios de MO desde config
    const moBase = Number(configGlobal?.manoDeObraBase) || 60000;
    const pctImp = Number(configGlobal?.porcentajeImpuestos) || 30;
    const pctIVA = Number(configGlobal?.porcentajeIVA) || 21;
    const factor = (1 + pctIVA / 100) * (1 - pctImp / 100);
    const precioReparacion = Math.round(moBase / factor);
    const precioVisita = Math.round((moBase / 2) / factor);
    const [tipoMO, setTipoMO] = useState('REPARACION'); // 'REPARACION' | 'VISITA'
    const { esAdmin } = useAuth();
    const [desgloseAbierto, setDesgloseAbierto] = useState(false);
    const [modoReverso, setModoReverso] = useState(false);
    const [gananciaDeseada, setGananciaDeseada] = useState('');

    // Desglose calculado desde el precio al cliente
    const esVisitaActual = tipoMO === 'VISITA';
    const divisor = esVisitaActual ? 1 : 2; // visita = 1 tecnico, reparacion = 2
    const desglose = useMemo(() => {
        const precioCliente = parseFloat(itemActual.costoExtra) || 0;
        const conIVA = Math.round(precioCliente * (1 + pctIVA / 100));
        const netoFactura = Math.round(conIVA * (1 - pctImp / 100));
        return {
            precioCliente,
            efectivoTotal: precioCliente,
            efectivoCada: Math.round(precioCliente / divisor),
            facturaCliente: conIVA,
            facturaNeto: netoFactura,
            facturaCada: Math.round(netoFactura / divisor),
        };
    }, [itemActual.costoExtra, pctIVA, pctImp, divisor]);

    // Calculo reverso: cuanto cobrar para ganar X por tecnico
    const reverso = useMemo(() => {
        const deseada = parseFloat(gananciaDeseada) || 0;
        if (deseada <= 0) return null;
        const netoTotal = deseada * divisor; // visita=1 tecnico, reparacion=2
        const precioCliente = Math.round(netoTotal / factor);
        const conIVA = Math.round(precioCliente * (1 + pctIVA / 100));
        return { precioCliente, conIVA, netoTotal };
    }, [gananciaDeseada, factor, pctIVA]);

    const [modalRepuesto, setModalRepuesto]     = useState(false);
    const [nombreRepuesto, setNombreRepuesto]   = useState('');
    const [sheetRepuestos, setSheetRepuestos]   = useState(false);
    const [mostrarFotos,   setMostrarFotos]     = useState(false);
    const [mostrarEquipo,  setMostrarEquipo]    = useState(false);
    const [formVisible,    setFormVisible]      = useState(true);
    const [cargaRapida,    setCargaRapida]      = useState(false);

    // Si editarItem carga datos en itemActual, mostrar el form automáticamente
    // Solo si tiene serial o repuestos (no por costoExtra que se pre-llena)
    const prevSerial = useRef(itemActual.equipoSerial);
    React.useEffect(() => {
        const tieneContenido = itemActual.equipoSerial || itemActual.repuestosUsados?.length > 0;
        // Solo abrir si cambió el serial (edición), no por reset con costoExtra pre-llenado
        if (tieneContenido && itemActual.equipoSerial !== prevSerial.current) {
            setFormVisible(true);
        }
        prevSerial.current = itemActual.equipoSerial;
    }, [itemActual]);

    // Equipos del inventario del cliente
    const equiposInventario = (() => {
        if (!clienteId || !db.sedes?.length || !db.equipos?.length) return [];
        const ids = db.sedes
            .filter(s => s.cliente?.id?.toString() === clienteId)
            .map(s => s.id);
        return db.equipos.filter(e => ids.includes(e.sedeId));
    })();

    // Seriales del historial como fallback
    const serialesHistorial = (() => {
        if (!clienteId || !db.servicios?.length) return [];
        const clienteObj = db.clientes?.find(c => c.id?.toString() === clienteId);
        if (!clienteObj) return [];
        return [...new Set(
            db.servicios
                .filter(s => s.clienteNombre === clienteObj.nombre)
                .flatMap(s => s.items?.map(i => i.equipoSerial).filter(Boolean) || [])
                .filter(s => s !== 'MOSTRADOR')
        )];
    })();

    const opcionesSerial = [
        ...equiposInventario.map(e => ({
            value: e.numeroSerie,
            label: `S/N: ${e.numeroSerie}${e.modelo ? ` — ${e.modelo}` : ''}`,
        })),
        ...serialesHistorial
            .filter(s => !equiposInventario.some(e => e.numeroSerie === s))
            .map(s => ({ value: s, label: `S/N: ${s} (historial)` })),
    ];

    const inputClass = `
        w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
        bg-[#E8E5E0] dark:bg-[#1C1C1C]
        text-[#1C1917] dark:text-[#F0EEE9]
        border border-black/10 dark:border-white/[0.08]
        placeholder-[#A8A29E]
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20
        transition-all
    `;

    const { editarItem, eliminarItem } = hook;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* Equipos ya en el ticket */}
            {ticketItems.length > 0 && (
                <div>
                    <Label>{ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''} en el ticket</Label>
                    <div className="flex flex-col gap-2">
                        {ticketItems.map((it, idx) => (
                            <div key={idx}
                                className="flex items-center justify-between p-3 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 bg-[#D13A28] dark:bg-[#E8422F]">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold truncate text-[#1C1917] dark:text-[#F0EEE9]">
                                            {it.equipoSerial || 'Sin S/N'}
                                        </p>
                                        <p className="text-[10px] truncate text-[#A8A29E]">
                                            {it.resumenTexto}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <M valor={it.totalCalculado} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                                    {/* Editar item — vuelve al formulario con los datos cargados */}
                                    <button
                                        onClick={() => editarItem(idx)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D48800]/20 text-[#D48800] dark:text-[#F0A500] active:scale-90 transition-all"
                                        title="Editar equipo"
                                    >✏️</button>
                                    <button
                                        onClick={() => eliminarItem(idx)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F] active:scale-90 transition-all"
                                        title="Eliminar equipo"
                                    >✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Formulario equipo actual — colapsable cuando ya hay equipos en el ticket */}
            {!formVisible && ticketItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormVisible(true)}
                        className="py-3.5 rounded-2xl font-black text-[12px] uppercase border-2 border-dashed border-[#D13A28]/40 dark:border-[#E8422F]/40 text-[#D13A28] dark:text-[#E8422F] bg-transparent active:scale-[0.98] transition-all">
                        + Agregar equipo
                    </button>
                    <button type="button" onClick={() => setCargaRapida(true)}
                        className="py-3.5 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D48800] dark:bg-[#F0A500] active:scale-[0.98] transition-all">
                        ⚡ Carga rápida
                    </button>
                </div>
            ) : (
            <div className="rounded-2xl p-4 bg-[#EFEDEA] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black bg-[#D13A28] dark:bg-[#E8422F]">
                        {ticketItems.length + 1}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#A8A29E]">
                        Equipo {ticketItems.length + 1}
                    </p>
                </div>

                <div className="flex flex-col gap-3">

                    {/* ═══ ZONA OBLIGATORIA ═══ */}

                    {/* Descripción del trabajo */}
                    <div>
                        <Label>Descripción del trabajo</Label>
                        <textarea
                            className={`${inputClass} resize-none min-h-[80px]`}
                            placeholder="Describí el trabajo realizado o a realizar..."
                            maxLength={400}
                            autoFocus
                            value={itemActual.trabajo || ''}
                            onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                        />
                        <div className="flex justify-end mt-1">
                            <span className={`text-[10px] font-bold ${(itemActual.trabajo || '').length >= 380 ? 'text-[#D13A28]' : (itemActual.trabajo || '').length >= 300 ? 'text-[#D48800]' : 'text-[#A8A29E]'}`}>
                                {(itemActual.trabajo || '').length}/400
                            </span>
                        </div>
                    </div>

                    {/* Tipo + Mano de obra */}
                    <div className="rounded-2xl p-4 bg-[#1C1917] dark:bg-[#0F0F0F] space-y-3">
                        <div className="flex gap-2">
                            <button type="button"
                                onClick={() => { setTipoMO('REPARACION'); setItemActual({ ...itemActual, costoExtra: precioReparacion, esVisita: false }); }}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 ${tipoMO === 'REPARACION' ? 'bg-[#D13A28] text-white' : 'bg-[#2E2E2E] text-[#9E9A94]'}`}>
                                Reparación · ${precioReparacion.toLocaleString('es-AR')}
                            </button>
                            <button type="button"
                                onClick={() => { setTipoMO('VISITA'); setItemActual({ ...itemActual, costoExtra: precioVisita, esVisita: true }); }}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 ${tipoMO === 'VISITA' ? 'bg-[#D48800] text-white' : 'bg-[#2E2E2E] text-[#9E9A94]'}`}>
                                Visita · ${precioVisita.toLocaleString('es-AR')}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#5C5954] uppercase tracking-widest">MO $</span>
                            <input
                                type="number" min="0"
                                value={itemActual.costoExtra}
                                onChange={e => setItemActual({ ...itemActual, costoExtra: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0) })}
                                onFocus={e => e.target.select()}
                                placeholder="0"
                                className="flex-1 bg-transparent border-none text-white text-3xl font-black outline-none placeholder-[#666]"
                            />
                        </div>
                    </div>

                    {/* ═══ ZONA OPCIONAL — expandibles ═══ */}
                    <div className="border-t border-black/[0.07] dark:border-white/[0.07] pt-3 space-y-1.5">

                        {/* + Equipo (S/N, modelo, ubicación) */}
                        <button type="button" onClick={() => setMostrarEquipo(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{itemActual.equipoSerial ? `🔧 ${itemActual.equipoSerial}` : '🔧 Equipo (S/N, modelo, ubicación)'}</span>
                            <span className="text-[10px]">{mostrarEquipo ? '▲' : '▼'}</span>
                        </button>
                        {mostrarEquipo && (
                            <div className="space-y-3 p-3 rounded-xl bg-[#E8E5E0]/50 dark:bg-[#2E2E2E]/50">
                                <div>
                                    <Label>N/S Dispenser</Label>
                                    <CreatableSelect
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPlacement="auto"
                                        menuPortalTarget={document.body}
                                        options={opcionesSerial}
                                        value={itemActual.equipoSerial ? { label: itemActual.equipoSerial, value: itemActual.equipoSerial } : null}
                                        onChange={s => {
                                            if (!s) { setItemActual({ ...itemActual, equipoSerial: '', esNuevoEquipo: false }); return; }
                                            const equipoDB = db.equipos?.find(e => e.numeroSerie === s.value);
                                            setItemActual({
                                                ...itemActual,
                                                equipoSerial: s.value, esNuevoEquipo: false,
                                                modeloEquipo: itemActual.modeloEquipo || equipoDB?.modelo || '',
                                                ubicacionEquipo: itemActual.ubicacionEquipo || equipoDB?.ubicacion || '',
                                            });
                                            consultarAntecedentes(s.value);
                                        }}
                                        onCreateOption={val => {
                                            setItemActual({ ...itemActual, equipoSerial: val, esNuevoEquipo: true });
                                            consultarAntecedentes(val);
                                        }}
                                        isClearable
                                        placeholder="Buscar o escribir S/N..."
                                        noOptionsMessage={() => 'Escribí el S/N manualmente'}
                                    />
                                </div>
                                {historialEquipo && (
                                    <div className="p-2.5 rounded-xl bg-[#FFF4D6] dark:bg-[#2A1E00] border border-[#D48800]/30">
                                        <p className="text-[10px] font-bold text-[#D48800] dark:text-[#F0A500]">Último servicio</p>
                                        <p className="text-[10px] text-[#57534E] dark:text-[#9E9A94]">{historialEquipo.fecha} — {historialEquipo.items?.[0]?.trabajoRealizado}</p>
                                    </div>
                                )}
                                <input className={inputClass} value={itemActual.modeloEquipo || ''}
                                    onChange={e => setItemActual({ ...itemActual, modeloEquipo: e.target.value })}
                                    placeholder="Modelo (ej: Bacope frío/calor)" />
                                <input className={inputClass} value={itemActual.ubicacionEquipo || ''}
                                    onChange={e => setItemActual({ ...itemActual, ubicacionEquipo: e.target.value })}
                                    placeholder="Ubicación (ej: Piso 2, depósito)" />
                            </div>
                        )}

                        {/* + Repuestos */}
                        <button type="button" onClick={() => setSheetRepuestos(true)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{itemActual.repuestosUsados?.length > 0
                                ? `📦 ${itemActual.repuestosUsados.length} repuesto${itemActual.repuestosUsados.length > 1 ? 's' : ''}`
                                : '📦 Repuestos'
                            }</span>
                            <span className="text-[10px]">+</span>
                        </button>
                        {itemActual.repuestosUsados?.length > 0 && (
                            <div className="rounded-xl overflow-hidden bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                                {itemActual.repuestosUsados.map((r, i) => {
                                    const g = calcularGananciaRepuesto(r, r.cantidad);
                                    return (
                                        <div key={i} className="px-3 py-2 flex items-center gap-3"
                                             style={{ borderBottom: i < itemActual.repuestosUsados.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[11px] truncate text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</p>
                                            </div>
                                            <span className="text-[10px] font-black text-[#A8A29E]">{r.cantidad}x</span>
                                            <p className="font-black text-[12px] text-[#1C1917] dark:text-[#F0EEE9]">${Math.round(g.subtotal).toLocaleString('es-AR')}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* + Fotos */}
                        <button type="button" onClick={() => setMostrarFotos(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{(itemActual.fotoAntes || itemActual.fotoDespues) ? '📷 Fotos adjuntas' : '📷 Fotos'}</span>
                            <span className="text-[10px]">{mostrarFotos ? '▲' : '▼'}</span>
                        </button>
                        {mostrarFotos && (
                            <div className="grid grid-cols-2 gap-3">
                                <FotoUpload label="Antes" foto={itemActual.fotoAntes}
                                    onChange={f => setItemActual({ ...itemActual, fotoAntes: f })} />
                                <FotoUpload label="Después" foto={itemActual.fotoDespues}
                                    onChange={f => setItemActual({ ...itemActual, fotoDespues: f })} />
                            </div>
                        )}

                        {/* + Calculadora (admin) */}
                        {esAdmin && desglose.precioCliente > 0 && (
                            <>
                                <button type="button" onClick={() => setDesgloseAbierto(v => !v)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                                    <span>🧮 Calculadora</span>
                                    <span className="text-[10px]">{desgloseAbierto ? '▲' : '▼'}</span>
                                </button>
                                {desgloseAbierto && (
                                    <div className="p-3 rounded-xl bg-[#E8E5E0]/50 dark:bg-[#2E2E2E]/50 space-y-3">
                                        <div className="p-3 rounded-xl bg-[#FFFFFF]/50 dark:bg-[#242424]/50 space-y-1.5">
                                            <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-1">Al cliente</p>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-[#57534E] dark:text-[#9E9A94]">Efectivo</span>
                                                <span className="font-black text-[#16A34A]">${desglose.precioCliente.toLocaleString('es-AR')}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-[#57534E] dark:text-[#9E9A94]">Con factura</span>
                                                <span className="font-black text-[#8B5CF6]">${desglose.facturaCliente.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[#D48800]/10 space-y-1.5">
                                            <p className="text-[9px] font-black text-[#D48800] uppercase mb-1">{esVisitaActual ? 'Te queda' : 'Cada técnico'}</p>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-[#D48800]">Efectivo</span>
                                                <span className="font-black text-[#D48800]">${desglose.efectivoCada.toLocaleString('es-AR')}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-[#D48800]">Factura</span>
                                                <span className="font-black text-[#D48800]">${desglose.facturaCada.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setModoReverso(!modoReverso)}
                                            className="text-[10px] font-black text-[#D48800] dark:text-[#F0A500] uppercase">
                                            {modoReverso ? '▲ Cerrar' : '▼ Quiero ganar X → cuánto cobro?'}
                                        </button>
                                        {modoReverso && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-[#57534E] dark:text-[#9E9A94] whitespace-nowrap">Quiero {esVisitaActual ? '' : 'c/u '}mínimo:</span>
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <span className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">$</span>
                                                        <input type="number" min="0" value={gananciaDeseada}
                                                            onChange={e => setGananciaDeseada(e.target.value)} placeholder="30000"
                                                            className="flex-1 px-2 py-1.5 rounded-lg text-[13px] font-bold outline-none bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]" />
                                                    </div>
                                                </div>
                                                {reverso && (
                                                    <div className="p-2.5 rounded-xl bg-[#D48800]/10 space-y-1">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-[#D48800]">Al cliente:</span>
                                                            <span className="font-black text-[#D48800]">${reverso.precioCliente.toLocaleString('es-AR')}</span>
                                                        </div>
                                                        <button type="button"
                                                            onClick={() => { setItemActual({ ...itemActual, costoExtra: reverso.precioCliente }); setModoReverso(false); setGananciaDeseada(''); }}
                                                            className="w-full mt-1 py-2 rounded-lg text-[11px] font-black uppercase text-white bg-[#D48800] active:scale-95">
                                                            Usar ${reverso.precioCliente.toLocaleString('es-AR')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Botón agregar */}
                    <button onClick={() => { agregarAlTicket(); setMostrarFotos(false); setMostrarEquipo(false); setFormVisible(false); }}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                        + Agregar equipo al ticket
                    </button>
                </div>
            </div>
            )}

            {ticketItems.length > 0 && (
                <NextBtn onClick={onNext}>
                    Ver resumen ({ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''})
                </NextBtn>
            )}

            <BackBtn onClick={onBack} />

            {/* Carga rápida */}
            <CargaRapidaSheet
                isOpen={cargaRapida}
                onClose={() => setCargaRapida(false)}
                hook={hook}
            />

            {/* Bottom sheet de repuestos */}
            <RepuestosBottomSheet
                isOpen={sheetRepuestos}
                onClose={() => setSheetRepuestos(false)}
                repuestos={db.repuestos || []}
                seleccionados={itemActual.repuestosUsados || []}
                onChange={nuevos => setItemActual(prev => ({ ...prev, repuestosUsados: nuevos }))}
                onCrearNuevo={() => {
                    setSheetRepuestos(false);
                    setModalRepuesto(true);
                }}
            />

            {/* Modal creación rápida de repuesto */}
            <RepuestoRapidoModal
                isOpen={modalRepuesto}
                onClose={() => setModalRepuesto(false)}
                nombreInicial={nombreRepuesto}
                onCreado={repuesto => {
                    setDb(prev => ({ ...prev, repuestos: [...(prev.repuestos || []), repuesto] }));
                    setSheetRepuestos(true);
                }}
            />
        </div>
    );
}