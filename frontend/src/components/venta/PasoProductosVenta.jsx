import React from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label, NextBtn, BackBtn, buildSelectStyles } from '../servicio/ServicioUI';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoProductosVenta({ hook, onNext, onBack }) {
    const {
        repuestos,
        repuestoElegido, setRepuestoElegido,
        productos,
        costoEnvio, setCostoEnvio,
        envioNum,
        agregarProducto, actualizarCantidad, quitarProducto,
        modalRepuesto, setModalRepuesto, nombreRepuesto, repuestoCreado, abrirModalRepuesto,
    } = hook;

    const isDark = document.documentElement.classList.contains('dark');
    const selectStyles = buildSelectStyles(isDark);

    const puedeAvanzar = productos.length > 0;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Selector de repuesto (al vuelo con CreatableSelect) ── */}
            <div>
                <Label>Agregar producto</Label>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <CreatableSelect
                            styles={selectStyles}
                            options={repuestos.map(r => ({
                                ...r,
                                label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                                value: r.id
                            }))}
                            filterOption={(opt, input) => {
                                const v = input.toLowerCase();
                                return opt.data.nombre?.toLowerCase().includes(v)
                                    || opt.data.sku?.toLowerCase().includes(v);
                            }}
                            formatOptionLabel={opt => (
                                <div className="flex justify-between items-center">
                                    <div>
                                        {opt.sku && (
                                            <span className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F] mr-2">
                                                {opt.sku}
                                            </span>
                                        )}
                                        <span className="font-bold text-[13px]">{opt.nombre}</span>
                                    </div>
                                    {opt.precio > 0 && (
                                        <span className="font-black text-[12px] text-[#1E8A4A]">
                                            ${opt.precio}
                                        </span>
                                    )}
                                </div>
                            )}
                            onChange={setRepuestoElegido}
                            onCreateOption={abrirModalRepuesto}
                            value={repuestoElegido}
                            placeholder="Buscar o escribir para crear..."
                            isClearable
                            formatCreateLabel={val => `+ Crear "${val}"`}
                        />
                    </div>
                    <button
                        onClick={agregarProducto}
                        disabled={!repuestoElegido}
                        className="h-12 w-12 flex items-center justify-center rounded-xl text-xl font-black text-white active:scale-90 transition-transform disabled:opacity-40 bg-[#D13A28] dark:bg-[#E8422F]"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Lista de productos cargados ── */}
            {productos.length > 0 && (
                <div className="p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]">
                    {productos.map((p, i) => (
                        <div key={i} className={`py-2.5 ${i < productos.length - 1 ? 'border-b border-black/[0.07] dark:border-white/[0.07]' : ''}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[#1C1917] dark:text-[#F0EEE9] truncate">{p.nombre}</p>
                                    <p className="text-[10px] text-[#A8A29E]">${p.precio} c/u</p>
                                </div>
                                <input
                                    type="number" min="1" value={p.cantidad}
                                    onChange={e => actualizarCantidad(i, e.target.value)}
                                    className="w-11 h-9 rounded-lg text-center font-black text-sm text-[#1C1917] dark:text-[#F0EEE9] mr-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                                />
                                <p className="font-black text-sm w-16 text-right text-[#1C1917] dark:text-[#F0EEE9]">
                                    ${p.subtotal.toLocaleString()}
                                </p>
                                <button onClick={() => quitarProducto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Costo de envío ── */}
            <div>
                <Label>Envío (opcional)</Label>
                <div className="flex items-center gap-3">
                    <span className="text-xl">🚚</span>
                    <input
                        type="number" min="0" value={costoEnvio}
                        onChange={e => setCostoEnvio(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="flex-1 h-11 rounded-xl px-4 font-black text-xl text-[#1C1917] dark:text-[#F0EEE9] bg-[#C0BCB6] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10 outline-none focus:border-[#D13A28] focus:ring-2 focus:ring-[#D13A28]/20"
                    />
                    {envioNum > 0 && (
                        <button onClick={() => setCostoEnvio(0)} className="text-[#A8A29E] hover:text-[#D13A28] text-lg">
                            ✕
                        </button>
                    )}
                </div>
                {envioNum > 0 && (
                    <p className="text-[10px] text-[#A8A29E] font-bold mt-1.5">
                        +${envioNum.toLocaleString()} al total
                    </p>
                )}
            </div>

            <NextBtn onClick={onNext} disabled={!puedeAvanzar}>
                Siguiente — Resumen
            </NextBtn>
            <BackBtn onClick={onBack} />

            {/* Modal creación rápida de repuesto */}
            <RepuestoRapidoModal
                isOpen={modalRepuesto}
                onClose={() => setModalRepuesto(false)}
                nombreInicial={nombreRepuesto}
                onCreado={repuestoCreado}
            />
        </div>
    );
}
