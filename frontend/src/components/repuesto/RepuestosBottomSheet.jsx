import React, { useState, useMemo } from 'react';
import { LuPackage, LuSearch } from 'react-icons/lu';
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
                        <LuPackage size={28} className="hidden" />
                      </>
                    : <LuPackage size={28} className="opacity-40" />
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
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
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
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
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

// Arma la entrada que se guarda en `seleccionados` (misma forma que ya esperaban
// PasoProductosVenta.jsx/PasoEquipos.jsx: id/nombre/sku/descripcion/fotoUrl/
// precio/costo/porcentajeGanancia/cantidad/subtotal).
function armarEntrada(r, cantidad) {
    const precio = parseFloat(r.precio) || 0;
    return {
        id: r.id,
        nombre: r.nombre,
        sku: r.sku,
        descripcion: r.descripcion || null,
        fotoUrl: r.fotoUrl || null,
        precio,
        costo: parseFloat(r.costo) || 0,
        porcentajeGanancia: parseFloat(r.porcentajeGanancia) || 0,
        cantidad,
        subtotal: precio * cantidad,
    };
}

// `seleccionados` es la fuente de verdad (viene del padre, ya en orden de
// inserción) — cada +/-/cantidad se aplica al toque vía onChange, sin paso de
// "Confirmar" aparte. Antes había que seleccionar, ajustar cantidad y ADEMÁS
// tocar "Confirmar N repuestos" para que quedara guardado; si se cerraba el
// sheet sin querer (backdrop, ✕) en el medio, se perdía todo lo tocado. Ahora
// cada toque ya queda guardado en el presupuesto/servicio en el momento.
export default function RepuestosBottomSheet({ isOpen, onClose, repuestos = [], seleccionados = [], onChange, onCrearNuevo }) {
    const [busqueda, setBusqueda] = useState('');

    // Al abrir, solo hace falta limpiar la búsqueda — la selección ya viene
    // del padre (`seleccionados`), no hay estado local propio que resetear.
    React.useEffect(() => {
        if (isOpen) setBusqueda('');
    }, [isOpen]);

    const repuestosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        if (!q) return repuestos;
        return repuestos.filter(r =>
            r.nombre?.toLowerCase().includes(q) ||
            r.sku?.toLowerCase().includes(q)
        );
    }, [repuestos, busqueda]);

    const cantidadDe = (id) => seleccionados.find(x => x.id === id)?.cantidad || 0;

    const sumar = (r) => {
        const actual = seleccionados.find(x => x.id === r.id);
        const nuevos = actual
            ? seleccionados.map(x => x.id === r.id ? { ...x, cantidad: x.cantidad + 1, subtotal: (x.cantidad + 1) * x.precio } : x)
            : [...seleccionados, armarEntrada(r, 1)];
        onChange(nuevos);
    };
    const restar = (r) => {
        const actual = seleccionados.find(x => x.id === r.id);
        if (!actual) return;
        const nuevos = actual.cantidad <= 1
            ? seleccionados.filter(x => x.id !== r.id)
            : seleccionados.map(x => x.id === r.id ? { ...x, cantidad: x.cantidad - 1, subtotal: (x.cantidad - 1) * x.precio } : x);
        onChange(nuevos);
    };
    const cambiar = (r, val) => {
        if (val === '' || val < 1) return;
        const yaEsta = seleccionados.some(x => x.id === r.id);
        const nuevos = yaEsta
            ? seleccionados.map(x => x.id === r.id ? { ...x, cantidad: val, subtotal: val * x.precio } : x)
            : [...seleccionados, armarEntrada(r, val)];
        onChange(nuevos);
    };

    const totalSeleccionados = seleccionados.length;

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/60 md:backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full md:max-w-lg md:rounded-3xl rounded-t-3xl flex flex-col bg-card max-h-[88vh] md:max-h-[80vh] border-[0.5px] border-white/[0.08] md:shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 bg-chip" />

                {/* Header */}
                <div className="px-4 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-title font-black text-ink">Repuestos</h3>
                        {totalSeleccionados > 0 && (
                            <p className="text-caption font-bold flex items-center gap-2">
                                <span className="text-brand-red">
                                    {totalSeleccionados} seleccionado{totalSeleccionados > 1 ? 's' : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    className="text-muted underline underline-offset-2 font-bold"
                                >
                                    Vaciar selección
                                </button>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90"
                    >✕</button>
                </div>

                {/* Buscador */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-body font-medium outline-none bg-chip text-ink placeholder-muted focus:ring-2 focus:ring-[#D13A28]/20 border border-black/[0.07] dark:border-white/[0.07]"
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
                                    cantidad={cantidadDe(r.id)}
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
                            onClick={() => onCrearNuevo(busqueda)}
                            className="w-full py-3 rounded-xl text-label font-black uppercase text-muted border border-dashed border-chip active:scale-95 transition-all mt-1 mb-3"
                        >
                            + Crear repuesto nuevo
                        </button>
                    )}
                </div>

                {/* Footer — ya no "confirma": las selecciones ya están aplicadas,
                    esto solo cierra el sheet */}
                <div className="px-4 pt-3 pb-6 border-t border-black/[0.07] dark:border-white/[0.07]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl font-black text-body-lg text-white active:scale-[0.98] transition-all bg-brand-red"
                    >
                        {totalSeleccionados > 0
                            ? `Listo — ${totalSeleccionados} repuesto${totalSeleccionados > 1 ? 's' : ''}`
                            : 'Cerrar'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
