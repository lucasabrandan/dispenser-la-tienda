import React, { useState, useMemo } from 'react';
import { Label, NextBtn, BackBtn } from '../servicio/ServicioUI';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';
import { LuTruck } from 'react-icons/lu';

// Productos frecuentes basados en historial local
const FREQ_KEY = 'venta_productos_frecuentes';
function getProductosFrecuentes() {
    try {
        const data = JSON.parse(localStorage.getItem(FREQ_KEY) || '{}');
        return Object.entries(data)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([, v]) => v);
    } catch { return []; }
}
export function registrarProductosVendidos(productos) {
    try {
        const data = JSON.parse(localStorage.getItem(FREQ_KEY) || '{}');
        productos.forEach(p => {
            const key = String(p.id);
            if (!data[key]) data[key] = { id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio, fotoUrl: p.fotoUrl, count: 0 };
            data[key].count += p.cantidad || 1;
            data[key].precio = p.precio; // actualizar precio
        });
        localStorage.setItem(FREQ_KEY, JSON.stringify(data));
    } catch (err) { console.warn('Productos: error guardando frecuentes', err); }
}

export default function PasoProductosVenta({ hook, onNext, onBack }) {
    const {
        repuestos,
        productos, setProductos,
        costoEnvio, setCostoEnvio,
        envioNum,
        modalRepuesto, setModalRepuesto, nombreRepuesto, repuestoCreado, abrirModalRepuesto,
    } = hook;

    const [sheetOpen, setSheetOpen] = useState(false);
    const frecuentes = useMemo(() => getProductosFrecuentes(), []);

    const agregarFrecuente = (p) => {
        setProductos(prev => {
            const idx = prev.findIndex(x => x.id === p.id);
            if (idx > -1) {
                const nuevos = [...prev];
                nuevos[idx] = { ...nuevos[idx], cantidad: nuevos[idx].cantidad + 1, subtotal: (nuevos[idx].cantidad + 1) * nuevos[idx].precio };
                return nuevos;
            }
            // Costo/ganancia se toman del catálogo vivo (repuestos), no del caché de
            // "frecuentes" (que no los guarda) — mismo dato que ya usa RepuestosBottomSheet
            // al agregar un producto, para que el panel de rentabilidad no quede en $0
            // cuando el producto se agrega desde acá en vez del selector.
            const full = repuestos.find(r => r.id === p.id);
            return [...prev, {
                id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio, cantidad: 1, subtotal: p.precio, fotoUrl: p.fotoUrl || null,
                costo: parseFloat(full?.costo) || 0,
                porcentajeGanancia: parseFloat(full?.porcentajeGanancia) || 0,
            }];
        });
    };

    const puedeAvanzar = productos.length > 0;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Productos frecuentes ── */}
            {frecuentes.length > 0 && (
                <div>
                    <Label>Frecuentes</Label>
                    <div className="flex flex-wrap gap-2">
                        {frecuentes.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => agregarFrecuente(p)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-label font-bold active:scale-95 transition-all bg-panel text-ink border border-black/[0.07] dark:border-white/[0.07]"
                            >
                                <span className="text-brand-red">+</span>
                                {p.nombre}
                                <span className="text-caption text-muted">${Math.round(p.precio).toLocaleString('es-AR')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Botón abrir selector de productos ── */}
            <div>
                <Label>Productos</Label>
                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    className="w-full py-3 px-4 rounded-xl flex items-center justify-between font-bold text-body border border-dashed border-chip text-ink bg-panel active:scale-[0.98] transition-all"
                >
                    <span>
                        {productos.length > 0
                            ? `${productos.length} producto${productos.length > 1 ? 's' : ''} seleccionado${productos.length > 1 ? 's' : ''}`
                            : '+ Seleccionar productos'}
                    </span>
                    <span className="text-muted">▼</span>
                </button>
            </div>

            {/* ── Lista de productos seleccionados ── */}
            {productos.length > 0 && (
                <div className="rounded-xl overflow-hidden bg-chip border border-black/[0.07] dark:border-white/[0.07]">
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
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#E8E5E0] dark:bg-[#242424]"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                {p.sku && (
                                    <p className="text-label font-black uppercase tracking-wider text-brand-red">
                                        {p.sku}
                                    </p>
                                )}
                                <p className="font-bold text-sm text-ink truncate">{p.nombre}</p>
                                <p className="text-caption text-muted">${Math.round(Number(p.precio)).toLocaleString('es-AR')} c/u</p>
                            </div>
                            <div className="flex items-center gap-1 bg-[#E8E5E0] dark:bg-[#1C1C1C] rounded-xl px-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nuevos = productos.map((x, j) => j === i
                                            ? { ...x, cantidad: Math.max(1, x.cantidad - 1), subtotal: Math.max(1, x.cantidad - 1) * x.precio }
                                            : x
                                        );
                                        setProductos(nuevos);
                                    }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90"
                                >−</button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={p.cantidad}
                                    onFocus={e => e.target.select()}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        // Permitir vacío mientras escribe
                                        if (raw === '') {
                                            setProductos(productos.map((x, j) => j === i ? { ...x, cantidad: '' } : x));
                                            return;
                                        }
                                        const val = Math.max(1, parseInt(raw) || 1);
                                        setProductos(productos.map((x, j) => j === i
                                            ? { ...x, cantidad: val, subtotal: val * x.precio }
                                            : x
                                        ));
                                    }}
                                    onBlur={e => {
                                        // Al salir del campo, asegurar valor válido
                                        if (p.cantidad === '' || Number(p.cantidad) < 1) {
                                            setProductos(productos.map((x, j) => j === i
                                                ? { ...x, cantidad: 1, subtotal: x.precio }
                                                : x
                                            ));
                                        }
                                    }}
                                    className="font-black text-body-lg w-14 text-center text-ink bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nuevos = productos.map((x, j) => j === i
                                            ? { ...x, cantidad: x.cantidad + 1, subtotal: (x.cantidad + 1) * x.precio }
                                            : x
                                        );
                                        setProductos(nuevos);
                                    }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90"
                                >+</button>
                            </div>
                            <p className="font-black text-sm w-16 text-right text-ink">
                                ${Math.round(Number(p.subtotal)).toLocaleString('es-AR')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setProductos(productos.filter((_, j) => j !== i))}
                                className="ml-1 text-muted hover:text-[#D13A28] text-lg active:scale-90"
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Costo de envío ── */}
            <div>
                <Label>Envío (opcional)</Label>
                <div className="flex items-center gap-3">
                    <LuTruck size={19} />
                    <input
                        type="text" inputMode="decimal" value={costoEnvio}
                        onChange={e => setCostoEnvio(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                        onFocus={e => e.target.select()}
                        placeholder="0"
                        className="flex-1 h-11 rounded-xl px-4 font-black text-xl text-ink bg-chip border border-black/10 dark:border-white/10 outline-none focus:border-[#D13A28] focus:ring-2 focus:ring-[#D13A28]/20"
                    />
                    {envioNum > 0 && (
                        <button type="button" onClick={() => setCostoEnvio('')} className="text-muted hover:text-[#D13A28] text-lg">
                            ✕
                        </button>
                    )}
                </div>
                {envioNum > 0 && (
                    <p className="text-caption text-muted font-bold mt-1.5">
                        +${Math.round(envioNum).toLocaleString('es-AR')} al total
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
                onCrearNuevo={(nombre) => {
                    setSheetOpen(false);
                    abrirModalRepuesto(nombre || '');
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
