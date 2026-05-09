import React, { useState, useMemo } from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

function FotoRepuesto({ repuesto }) {
    const src = construirUrlFoto(repuesto.fotoUrl || repuesto.imagen);
    if (src) {
        return (
            <img
                src={src}
                alt={repuesto.nombre}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
        );
    }
    return null;
}

function CardRepuesto({ repuesto, cantidad, onSumar, onRestar, onCambiar }) {
    const tieneFoto = repuesto.fotoUrl || repuesto.imagen;
    const seleccionado = cantidad > 0;

    return (
        <div className={`relative rounded-2xl overflow-hidden border transition-all active:scale-[0.97] ${
            seleccionado
                ? 'border-[#D13A28] dark:border-[#E8422F] shadow-md'
                : 'border-black/[0.08] dark:border-white/[0.08]'
        } bg-[#EDEAE6] dark:bg-[#242424]`}>

            {/* Badge cantidad */}
            {seleccionado && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-[#D13A28] dark:bg-[#E8422F]">
                    {cantidad}
                </div>
            )}

            {/* Foto */}
            <div className="w-full aspect-square bg-[#D8D4CE] dark:bg-[#1C1C1C] flex items-center justify-center overflow-hidden">
                {tieneFoto
                    ? <>
                        <FotoRepuesto repuesto={repuesto} />
                        <span className="text-3xl hidden">📦</span>
                      </>
                    : <span className="text-3xl opacity-40">📦</span>
                }
            </div>

            {/* Info */}
            <div className="p-2">
                {repuesto.sku && (
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#D13A28] dark:text-[#E8422F] mb-0.5">
                        {repuesto.sku}
                    </p>
                )}
                <p className="text-[12px] font-bold leading-tight text-[#1C1917] dark:text-[#F0EEE9] line-clamp-2 mb-1">
                    {repuesto.nombre}
                </p>
                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-2">
                    ${Number(repuesto.precio || 0).toLocaleString()}
                </p>

                {/* Controles +/- */}
                {seleccionado ? (
                    <div className="flex items-center justify-between bg-[#D8D4CE] dark:bg-[#1C1C1C] rounded-xl px-2 py-1">
                        <button
                            type="button"
                            onClick={onRestar}
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-[#D13A28] dark:text-[#E8422F] active:scale-90 transition-all"
                        >−</button>
                        <input
                            type="number"
                            min="1"
                            value={cantidad}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                                const raw = e.target.value;
                                if (raw === '') { onCambiar(''); return; }
                                const val = Math.max(1, parseInt(raw) || 1);
                                onCambiar(val);
                            }}
                            onBlur={e => {
                                if (e.target.value === '' || Number(e.target.value) < 1) onCambiar(1);
                            }}
                            className="font-black text-[14px] w-10 text-center text-[#1C1917] dark:text-[#F0EEE9] bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={onSumar}
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-[#D13A28] dark:text-[#E8422F] active:scale-90 transition-all"
                        >+</button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onSumar}
                        className="w-full py-1.5 rounded-xl text-[11px] font-black text-white active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]"
                    >
                        + Agregar
                    </button>
                )}
            </div>
        </div>
    );
}

export default function RepuestosBottomSheet({ isOpen, onClose, repuestos = [], seleccionados = [], onChange, onCrearNuevo }) {
    const [busqueda, setBusqueda] = useState('');

    // cantidades locales: { [repuestoId]: cantidad }
    const [cantidades, setCantidades] = useState(() => {
        const init = {};
        seleccionados.forEach(r => { init[r.id] = r.cantidad || 1; });
        return init;
    });

    // Resetear cantidades cuando se abre con nuevos seleccionados
    React.useEffect(() => {
        if (isOpen) {
            const init = {};
            seleccionados.forEach(r => { init[r.id] = r.cantidad || 1; });
            setCantidades(init);
            setBusqueda('');
        }
    }, [isOpen]);

    const repuestosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        if (!q) return repuestos;
        return repuestos.filter(r =>
            r.nombre?.toLowerCase().includes(q) ||
            r.sku?.toLowerCase().includes(q)
        );
    }, [repuestos, busqueda]);

    const sumar = (r) => setCantidades(prev => ({ ...prev, [r.id]: (prev[r.id] || 0) + 1 }));
    const restar = (r) => setCantidades(prev => {
        const nueva = { ...prev };
        if ((nueva[r.id] || 0) <= 1) delete nueva[r.id];
        else nueva[r.id] -= 1;
        return nueva;
    });
    const cambiar = (r, val) => setCantidades(prev => {
        if (val === '' || val < 1) return prev;
        return { ...prev, [r.id]: val };
    });

    const totalSeleccionados = Object.values(cantidades).filter(c => c > 0).length;

    const confirmar = () => {
        const resultado = Object.entries(cantidades)
            .filter(([, c]) => c > 0)
            .map(([id, cantidad]) => {
                const r = repuestos.find(x => x.id === Number(id));
                if (!r) return null;
                return {
                    id: r.id,
                    nombre: r.nombre,
                    sku: r.sku,
                    descripcion: r.descripcion || null,
                    fotoUrl: r.fotoUrl || null,
                    precio: parseFloat(r.precio) || 0,
                    costo: parseFloat(r.costo) || 0,
                    porcentajeGanancia: parseFloat(r.porcentajeGanancia) || 0,
                    cantidad,
                    subtotal: (parseFloat(r.precio) || 0) * cantidad,
                };
            })
            .filter(Boolean);
        onChange(resultado);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-end"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
        >
            <div
                className="w-full rounded-t-3xl flex flex-col bg-[#EDEAE6] dark:bg-[#1C1C1C]"
                style={{ maxHeight: '88vh', border: '0.5px solid rgba(255,255,255,0.08)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />

                {/* Header */}
                <div className="px-4 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Repuestos</h3>
                        {totalSeleccionados > 0 && (
                            <p className="text-[11px] text-[#D13A28] dark:text-[#E8422F] font-bold">
                                {totalSeleccionados} seleccionado{totalSeleccionados > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#D8D4CE] dark:bg-[#2E2E2E] active:scale-90"
                    >✕</button>
                </div>

                {/* Buscador */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm">🔍</span>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] font-medium outline-none bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder-[#A8A29E] focus:ring-2 focus:ring-[#D13A28]/20 border border-black/[0.07] dark:border-white/[0.07]"
                        />
                    </div>
                </div>

                {/* Grid repuestos */}
                <div className="flex-1 overflow-y-auto px-4 pb-2">
                    {repuestosFiltrados.length === 0 ? (
                        <div className="text-center py-10 text-[#A8A29E] font-bold text-sm">
                            {busqueda ? 'Sin resultados' : 'No hay repuestos cargados'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-2">
                            {repuestosFiltrados.map(r => (
                                <CardRepuesto
                                    key={r.id}
                                    repuesto={r}
                                    cantidad={cantidades[r.id] || 0}
                                    onSumar={() => sumar(r)}
                                    onRestar={() => restar(r)}
                                    onCambiar={val => cambiar(r, val)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Crear nuevo repuesto */}
                    {onCrearNuevo && (
                        <button
                            type="button"
                            onClick={onCrearNuevo}
                            className="w-full py-3 rounded-xl text-[12px] font-black uppercase text-[#A8A29E] border border-dashed border-[#C0BCB6] dark:border-[#2E2E2E] active:scale-95 transition-all mt-1 mb-3"
                        >
                            + Crear repuesto nuevo
                        </button>
                    )}
                </div>

                {/* Footer confirmar */}
                <div className="px-4 pt-3 pb-6 border-t border-black/[0.07] dark:border-white/[0.07]">
                    <button
                        type="button"
                        onClick={confirmar}
                        className="w-full py-4 rounded-2xl font-black text-[15px] text-white active:scale-[0.98] transition-all bg-[#D13A28] dark:bg-[#E8422F]"
                    >
                        {totalSeleccionados > 0
                            ? `Confirmar ${totalSeleccionados} repuesto${totalSeleccionados > 1 ? 's' : ''}`
                            : 'Confirmar sin repuestos'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
