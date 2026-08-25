import React, { useState, useMemo } from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

function FotoRepuesto({ repuesto }) {
    const src = construirUrlFoto(repuesto.fotoUrl);
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
    const tieneFoto = !!repuesto.fotoUrl;
    const seleccionado = cantidad > 0;
    const [inputVal, setInputVal] = React.useState(String(cantidad || ''));
    React.useEffect(() => { setInputVal(String(cantidad || '')); }, [cantidad]);

    return (
        <div className={`relative rounded-2xl overflow-hidden border transition-all active:scale-[0.97] ${
            seleccionado
                ? 'border-brand-red shadow-md'
                : 'border-black/[0.08] dark:border-white/[0.08]'
        } bg-card`}>

            {/* Badge cantidad */}
            {seleccionado && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center text-label font-black text-white bg-brand-red">
                    {cantidad}
                </div>
            )}

            {/* Foto */}
            <div className="w-full aspect-square bg-panel flex items-center justify-center overflow-hidden">
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
                    <p className="text-label font-black uppercase tracking-wider text-brand-red mb-0.5">
                        {repuesto.sku}
                    </p>
                )}
                <p className="text-body font-bold leading-tight text-ink line-clamp-2 mb-1">
                    {repuesto.nombre}
                </p>
                <p className="text-body font-black text-ink mb-2">
                    ${Math.round(Number(repuesto.precio || 0)).toLocaleString('es-AR')}
                </p>

                {/* Controles +/- */}
                {seleccionado ? (
                    <div className="flex items-center justify-between bg-panel rounded-xl px-2 py-1">
                        <button
                            type="button"
                            onClick={onRestar}
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
                        >−</button>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={inputVal}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                                setInputVal(e.target.value);
                                if (e.target.value === '') return;
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                onCambiar(val);
                            }}
                            onBlur={() => {
                                const val = Math.max(1, parseInt(inputVal) || 1);
                                onCambiar(val);
                                setInputVal(String(val));
                            }}
                            className="font-black text-body-lg w-14 text-center text-ink bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={onSumar}
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
                        >+</button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onSumar}
                        className="w-full py-1.5 rounded-xl text-label font-black text-white active:scale-95 transition-all bg-brand-red"
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
    // orden de inserción para preservar el orden del PDF (Object.entries ordena keys numéricos)
    const [orden, setOrden] = useState(() => seleccionados.map(r => r.id));

    // Resetear cantidades cuando se abre con nuevos seleccionados
    React.useEffect(() => {
        if (isOpen) {
            const init = {};
            seleccionados.forEach(r => { init[r.id] = r.cantidad || 1; });
            setCantidades(init);
            setOrden(seleccionados.map(r => r.id));
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

    const sumar = (r) => {
        setCantidades(prev => ({ ...prev, [r.id]: (prev[r.id] || 0) + 1 }));
        setOrden(prev => prev.includes(r.id) ? prev : [...prev, r.id]);
    };
    const restar = (r) => {
        if ((cantidades[r.id] || 0) <= 1) {
            setCantidades(prev => { const n = { ...prev }; delete n[r.id]; return n; });
            setOrden(prev => prev.filter(id => id !== r.id));
        } else {
            setCantidades(prev => ({ ...prev, [r.id]: prev[r.id] - 1 }));
        }
    };
    const cambiar = (r, val) => setCantidades(prev => {
        if (val === '' || val < 1) return prev;
        return { ...prev, [r.id]: val };
    });

    const totalSeleccionados = Object.values(cantidades).filter(c => c > 0).length;

    const confirmar = () => {
        // Usar `orden` para preservar el orden de inserción (Object.entries ordena keys numéricos)
        const resultado = orden
            .filter(id => (cantidades[id] || 0) > 0)
            .map(id => {
                const r = repuestos.find(x => x.id === id);
                if (!r) return null;
                const cantidad = cantidades[id];
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
            className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/60 md:backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full md:max-w-lg md:rounded-3xl rounded-t-3xl flex flex-col bg-[#FFFFFF] dark:bg-[#1C1C1C] max-h-[88vh] md:max-h-[80vh] border-[0.5px] border-white/[0.08] md:shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 bg-chip" />

                {/* Header */}
                <div className="px-4 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-[15px] font-black text-ink">Repuestos</h3>
                        {totalSeleccionados > 0 && (
                            <p className="text-caption text-brand-red font-bold">
                                {totalSeleccionados} seleccionado{totalSeleccionados > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted bg-[#EFEDEA] dark:bg-[#2E2E2E] active:scale-90"
                    >✕</button>
                </div>

                {/* Buscador */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-body font-medium outline-none bg-[#EFEDEA] dark:bg-[#2E2E2E] text-ink placeholder-muted focus:ring-2 focus:ring-[#D13A28]/20 border border-black/[0.07] dark:border-white/[0.07]"
                        />
                    </div>
                </div>

                {/* Grid repuestos */}
                <div className="flex-1 overflow-y-auto px-4 pb-2">
                    {repuestosFiltrados.length === 0 ? (
                        <div className="text-center py-10 text-muted font-bold text-sm">
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
                            className="w-full py-3 rounded-xl text-label font-black uppercase text-muted border border-dashed border-chip active:scale-95 transition-all mt-1 mb-3"
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
                        className="w-full py-4 rounded-2xl font-black text-body-lg text-white active:scale-[0.98] transition-all bg-brand-red"
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
