import React, { useState, useRef } from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import imageCompression from 'browser-image-compression';
import { Label, NextBtn, BackBtn, DSCard, DSInput, DSTextarea, M } from './ServicioUI';
import { construirUrlFoto } from '../../utils/construirUrlFoto';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';

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
            <div className="relative rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-[#C0BCB6] dark:bg-[#2E2E2E] aspect-[3/4] flex items-center justify-center">
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
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-95 transition-all">
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
        repuestoElegido, setRepuestoElegido,
        sumarRepuesto, actualizarCantidad, quitarRepuesto,
        agregarAlTicket, calcularGananciaRepuesto,
        consultarAntecedentes, historialEquipo,
    } = hook;

    // Estado del modal de creación rápida de repuesto
    const [modalRepuesto, setModalRepuesto]   = useState(false);
    const [nombreRepuesto, setNombreRepuesto] = useState('');

    // Equipos del inventario del cliente
    const equiposInventario = (() => {
        if (!clienteId || !db.sedes?.length || !db.equipos?.length) return [];
        const ids = db.sedes
            .filter(s => s.cliente?.id?.toString() === clienteId)
            .map(s => s.id);
        return db.equipos.filter(e => ids.includes(e.sede?.id));
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
        bg-[#C0BCB6] dark:bg-[#1C1C1C]
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
                                className="flex items-center justify-between p-3 rounded-xl bg-[#C0BCB6] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
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

            {/* Formulario equipo actual */}
            <div className="rounded-2xl p-4 bg-[#D8D4CE] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black bg-[#D13A28] dark:bg-[#E8422F]">
                        {ticketItems.length + 1}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#A8A29E]">
                        Equipo {ticketItems.length + 1}
                    </p>
                </div>

                <div className="flex flex-col gap-3">

                    {/* S/N */}
                    <div>
                        <Label>N/S Dispenser (opcional)</Label>
                        <CreatableSelect
                            styles={selectStyles}
                            menuPosition="fixed"
                            menuPlacement="auto"
                            options={opcionesSerial}
                            value={itemActual.equipoSerial ? { label: itemActual.equipoSerial, value: itemActual.equipoSerial } : null}
                            onChange={s => {
                                if (!s) { setItemActual({ ...itemActual, equipoSerial: '', esNuevoEquipo: false }); return; }
                                // Auto-rellenar modelo y ubicación desde el inventario si existen
                                const equipoDB = db.equipos?.find(e => e.numeroSerie === s.value);
                                setItemActual({
                                    ...itemActual,
                                    equipoSerial:    s.value,
                                    esNuevoEquipo:   false,
                                    modeloEquipo:    itemActual.modeloEquipo    || equipoDB?.modelo    || '',
                                    ubicacionEquipo: itemActual.ubicacionEquipo || equipoDB?.ubicacion || '',
                                });
                                consultarAntecedentes(s.value);
                            }}
                            onCreateOption={val => {
                                // Marcar como nuevo para guardarlo en la BD al agregar al ticket
                                setItemActual({ ...itemActual, equipoSerial: val, esNuevoEquipo: true });
                                consultarAntecedentes(val);
                            }}
                            isClearable
                            placeholder="Buscar o escribir S/N..."
                            noOptionsMessage={() => 'Escribí el S/N manualmente'}
                        />
                    </div>

                    {/* Antecedente */}
                    {historialEquipo && (
                        <div className="p-3 rounded-xl bg-[#FFF4D6] dark:bg-[#2A1E00] border border-[#D48800]/30">
                            <p className="text-[10px] font-bold mb-1 text-[#D48800] dark:text-[#F0A500]">
                                Último servicio registrado
                            </p>
                            <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94]">
                                {historialEquipo.fecha} — {historialEquipo.items?.[0]?.trabajoRealizado}
                            </p>
                        </div>
                    )}

                    {/* Modelo */}
                    <div>
                        <Label>Modelo (opcional)</Label>
                        <input
                            className={inputClass}
                            value={itemActual.modeloEquipo || ''}
                            onChange={e => setItemActual({ ...itemActual, modeloEquipo: e.target.value })}
                            placeholder="Ej: Bacope frío/calor..."
                        />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <Label>Ubicación dentro del local (opcional)</Label>
                        <input
                            className={inputClass}
                            value={itemActual.ubicacionEquipo || ''}
                            onChange={e => setItemActual({ ...itemActual, ubicacionEquipo: e.target.value })}
                            placeholder="Ej: Piso 2, depósito..."
                        />
                    </div>

                    {/* Repuestos — CreatableSelect permite crear al vuelo */}
                    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: '12px' }}>
                        <Label>Repuestos (opcional)</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <CreatableSelect
                                    styles={selectStyles}
                                    menuPosition="fixed"
                                    menuPlacement="auto"
                                    options={db.repuestos?.map(r => ({
                                        ...r,
                                        label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                                        value: r.id
                                    }))}
                                    filterOption={(opt, input) => {
                                        const v = input.toLowerCase();
                                        return opt.data.nombre?.toLowerCase().includes(v) || opt.data.sku?.toLowerCase().includes(v);
                                    }}
                                    formatOptionLabel={opt => (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                {opt.sku && (
                                                    <span className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F] mr-1">
                                                        {opt.sku}
                                                    </span>
                                                )}
                                                <span className="font-bold text-[13px]">{opt.nombre}</span>
                                            </div>
                                            {opt.precio > 0 && (
                                                <span className="font-black text-xs text-[#1E8A4A]">${opt.precio}</span>
                                            )}
                                        </div>
                                    )}
                                    onChange={setRepuestoElegido}
                                    onCreateOption={nombre => {
                                        // Abrir mini-modal con el nombre pre-llenado
                                        setNombreRepuesto(nombre);
                                        setModalRepuesto(true);
                                    }}
                                    value={repuestoElegido}
                                    placeholder="Buscar o crear repuesto..."
                                    formatCreateLabel={v => `+ Crear "${v}"`}
                                    isClearable
                                />
                            </div>
                            <button onClick={sumarRepuesto}
                                className="w-11 h-11 rounded-xl text-xl font-black text-white flex-shrink-0 active:scale-90 bg-[#D13A28] dark:bg-[#E8422F]">
                                +
                            </button>
                        </div>
                    </div>

                    {/* Lista repuestos */}
                    {itemActual.repuestosUsados?.length > 0 && (
                        <div className="rounded-xl overflow-hidden bg-[#C0BCB6] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                            {itemActual.repuestosUsados.map((r, i) => {
                                const g = calcularGananciaRepuesto(r, r.cantidad);
                                return (
                                    <div key={i} className="px-3 py-2.5 flex items-center gap-3"
                                         style={{ borderBottom: i < itemActual.repuestosUsados.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[13px] truncate text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</p>
                                            {g.ganancia > 0 && (
                                                <p className="text-[10px] font-bold text-[#1E8A4A]">+${g.ganancia.toFixed(0)} margen</p>
                                            )}
                                        </div>
                                        <input type="number" min="1" value={r.cantidad}
                                            onChange={e => actualizarCantidad(i, e.target.value)}
                                            className="w-10 h-8 rounded-lg text-center font-black text-sm bg-[#EDEAE6] dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9] border border-black/10 dark:border-white/10 outline-none"
                                        />
                                        <p className="font-black text-[13px] w-16 text-right text-[#1C1917] dark:text-[#F0EEE9]">
                                            ${g.subtotal.toLocaleString()}
                                        </p>
                                        <button onClick={() => quitarRepuesto(i)} className="text-rose-500 text-base ml-1">✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Descripción con contador de caracteres */}
                    <div>
                        <Label>Descripción del trabajo</Label>
                        <textarea
                            className={`${inputClass} resize-none min-h-[80px]`}
                            placeholder="Describí el trabajo realizado o a realizar..."
                            maxLength={400}
                            value={itemActual.trabajo || ''}
                            onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                        />
                        <div className="flex justify-end mt-1">
                            {(() => {
                                const n = (itemActual.trabajo || '').length;
                                return (
                                    <span className={`text-[10px] font-bold transition-colors ${
                                        n >= 380 ? 'text-[#D13A28] dark:text-[#E8422F]' :
                                        n >= 300 ? 'text-[#D48800] dark:text-[#F0A500]' :
                                        'text-[#A8A29E]'
                                    }`}>
                                        {n}/400
                                    </span>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Fotos antes / después */}
                    <div>
                        <Label>Fotos (opcional)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <FotoUpload label="Antes" foto={itemActual.fotoAntes}
                                onChange={f => setItemActual({ ...itemActual, fotoAntes: f })} />
                            <FotoUpload label="Después" foto={itemActual.fotoDespues}
                                onChange={f => setItemActual({ ...itemActual, fotoDespues: f })} />
                        </div>
                    </div>

                    {/* Mano de obra */}
                    <div className="rounded-2xl p-4 bg-[#1C1917] dark:bg-[#0F0F0F]">
                        <Label>Mano de obra ($)</Label>
                        <input
                            type="number" min="0"
                            value={itemActual.costoExtra}
                            onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
                        />
                    </div>

                    {/* Botón agregar */}
                    <button onClick={() => agregarAlTicket()}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                        + Agregar equipo al ticket
                    </button>
                </div>
            </div>

            {ticketItems.length > 0 && (
                <NextBtn onClick={onNext}>
                    Ver resumen ({ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''})
                </NextBtn>
            )}

            <BackBtn onClick={onBack} />

            {/* Modal creación rápida de repuesto */}
            <RepuestoRapidoModal
                isOpen={modalRepuesto}
                onClose={() => setModalRepuesto(false)}
                nombreInicial={nombreRepuesto}
                onCreado={repuesto => {
                    // Agregar al listado local y seleccionarlo automáticamente
                    setDb(prev => ({ ...prev, repuestos: [...(prev.repuestos || []), repuesto] }));
                    setRepuestoElegido({ ...repuesto, label: `[${repuesto.sku}] ${repuesto.nombre}`, value: repuesto.id });
                }}
            />
        </div>
    );
}