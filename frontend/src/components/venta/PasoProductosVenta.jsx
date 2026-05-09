import React, { useState } from 'react';
import { Label, NextBtn, BackBtn } from '../servicio/ServicioUI';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';

export default function PasoProductosVenta({ hook, onNext, onBack }) {
    const {
        repuestos,
        productos, setProductos,
        costoEnvio, setCostoEnvio,
        envioNum,
        modalRepuesto, setModalRepuesto, nombreRepuesto, repuestoCreado, abrirModalRepuesto,
    } = hook;

    const [sheetOpen, setSheetOpen] = useState(false);

    const puedeAvanzar = productos.length > 0;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Botón abrir selector de productos ── */}
            <div>
                <Label>Productos</Label>
                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    className="w-full py-3 px-4 rounded-xl flex items-center justify-between font-bold text-[13px] border border-dashed border-[#C0BCB6] dark:border-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] bg-[#D8D4CE] dark:bg-[#1C1C1C] active:scale-[0.98] transition-all"
                >
                    <span>
                        {productos.length > 0
                            ? `${productos.length} producto${productos.length > 1 ? 's' : ''} seleccionado${productos.length > 1 ? 's' : ''}`
                            : '+ Seleccionar productos'}
                    </span>
                    <span className="text-[#A8A29E]">▼</span>
                </button>
            </div>

            {/* ── Lista de productos seleccionados ── */}
            {productos.length > 0 && (
                <div className="rounded-xl overflow-hidden bg-[#D8D4CE] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]">
                    {productos.map((p, i) => (
                        <div
                            key={p.id ?? i}
                            className={`px-3 py-2.5 flex items-center gap-3 ${i < productos.length - 1 ? 'border-b border-black/[0.07] dark:border-white/[0.07]' : ''}`}
                        >
                            {/* Foto miniatura si existe */}
                            {p.fotoUrl && (
                                <img
                                    src={p.fotoUrl}
                                    alt={p.nombre}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#C0BCB6] dark:bg-[#242424]"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                {p.sku && (
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#D13A28] dark:text-[#E8422F]">
                                        {p.sku}
                                    </p>
                                )}
                                <p className="font-bold text-sm text-[#1C1917] dark:text-[#F0EEE9] truncate">{p.nombre}</p>
                                <p className="text-[10px] text-[#A8A29E]">${Number(p.precio).toLocaleString()} c/u</p>
                            </div>
                            <div className="flex items-center gap-1 bg-[#C0BCB6] dark:bg-[#1C1C1C] rounded-xl px-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nuevos = productos.map((x, j) => j === i
                                            ? { ...x, cantidad: Math.max(1, x.cantidad - 1), subtotal: Math.max(1, x.cantidad - 1) * x.precio }
                                            : x
                                        );
                                        setProductos(nuevos);
                                    }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-[#D13A28] dark:text-[#E8422F] active:scale-90"
                                >−</button>
                                <span className="font-black text-[13px] w-5 text-center text-[#1C1917] dark:text-[#F0EEE9]">{p.cantidad}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nuevos = productos.map((x, j) => j === i
                                            ? { ...x, cantidad: x.cantidad + 1, subtotal: (x.cantidad + 1) * x.precio }
                                            : x
                                        );
                                        setProductos(nuevos);
                                    }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-[#D13A28] dark:text-[#E8422F] active:scale-90"
                                >+</button>
                            </div>
                            <p className="font-black text-sm w-16 text-right text-[#1C1917] dark:text-[#F0EEE9]">
                                ${Number(p.subtotal).toLocaleString()}
                            </p>
                            <button
                                type="button"
                                onClick={() => setProductos(productos.filter((_, j) => j !== i))}
                                className="ml-1 text-[#A8A29E] hover:text-[#D13A28] text-lg active:scale-90"
                            >✕</button>
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
                        <button type="button" onClick={() => setCostoEnvio(0)} className="text-[#A8A29E] hover:text-[#D13A28] text-lg">
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

            {/* Bottom sheet de productos */}
            <RepuestosBottomSheet
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                repuestos={repuestos || []}
                seleccionados={productos}
                onChange={nuevos => setProductos(nuevos)}
                onCrearNuevo={() => {
                    setSheetOpen(false);
                    abrirModalRepuesto('');
                }}
            />

            {/* Modal creación rápida de repuesto */}
            <RepuestoRapidoModal
                isOpen={modalRepuesto}
                onClose={() => setModalRepuesto(false)}
                nombreInicial={nombreRepuesto}
                onCreado={repuesto => {
                    repuestoCreado(repuesto);
                    setSheetOpen(true);
                }}
            />
        </div>
    );
}
