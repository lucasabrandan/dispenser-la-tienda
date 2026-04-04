import React from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import { Label, NextBtn, BackBtn, DSCard, DSInput, DSTextarea, M } from './ServicioUI';

// Upload compacto de foto con preview portrait (formato celular)
function FotoUpload({ label, foto, onChange }) {
    const preview = foto ? URL.createObjectURL(foto) : null;
    return (
        <label className="cursor-pointer block">
            <div className="relative rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-[#C0BCB6] dark:bg-[#2E2E2E] aspect-[3/4] flex items-center justify-center">
                {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-2">
                        <p className="text-2xl mb-1">📷</p>
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">{label}</p>
                    </div>
                )}
                {/* Etiqueta siempre visible abajo */}
                <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-black uppercase text-white ${preview ? 'bg-black/50' : 'bg-[#D13A28]/80 dark:bg-[#E8422F]/80'}`}>
                    {preview ? `✓ ${label}` : `+ ${label}`}
                </div>
            </div>
            <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
        </label>
    );
}

export default function PasoEquipos({ hook, onNext, onBack, selectStyles }) {
    const {
        db, clienteId, ticketItems,
        itemActual, setItemActual,
        repuestoElegido, setRepuestoElegido,
        sumarRepuesto, actualizarCantidad, quitarRepuesto,
        agregarAlTicket, calcularGananciaRepuesto,
        consultarAntecedentes, historialEquipo,
    } = hook;

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
                                <M valor={it.totalCalculado} className="text-[13px] font-black flex-shrink-0 ml-2 text-[#1C1917] dark:text-[#F0EEE9]" />
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
                            options={opcionesSerial}
                            value={itemActual.equipoSerial ? { label: itemActual.equipoSerial, value: itemActual.equipoSerial } : null}
                            onChange={s => {
                                if (!s) { setItemActual({ ...itemActual, equipoSerial: '' }); return; }
                                setItemActual({ ...itemActual, equipoSerial: s.value });
                                consultarAntecedentes(s.value);
                            }}
                            onCreateOption={val => { setItemActual({ ...itemActual, equipoSerial: val }); consultarAntecedentes(val); }}
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

                    {/* Repuestos */}
                    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: '12px' }}>
                        <Label>Repuestos (opcional)</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select
                                    styles={selectStyles}
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
                                        <div className="flex justify-between">
                                            <span className="font-bold text-sm">{opt.nombre}</span>
                                            <span className="font-black text-xs text-[#1E8A4A]">${opt.precio}</span>
                                        </div>
                                    )}
                                    onChange={setRepuestoElegido}
                                    value={repuestoElegido}
                                    placeholder="Buscar repuesto..."
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

                    {/* Descripción */}
                    <div>
                        <Label>Descripción del trabajo</Label>
                        <textarea
                            className={`${inputClass} resize-none min-h-[80px]`}
                            placeholder="Describí el trabajo realizado o a realizar..."
                            value={itemActual.trabajo || ''}
                            onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                        />
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
                    <button onClick={agregarAlTicket}
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
        </div>
    );
}