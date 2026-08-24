import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { generarPDFCotizacion } from '../../utils/generadorPDFCotizacion';
import { useTheme } from '../../hooks/useTheme';

function buildSelectStyles(isDark) {
    const bg      = isDark ? '#2E2E2E' : '#E8E5E0';
    const bgMenu  = isDark ? '#242424' : '#FFFFFF';
    const text    = isDark ? '#F0EEE9' : '#1C1917';
    const muted   = '#A8A29E';
    return {
        control:      (b, s) => ({ ...b, background: bg, border: s.isFocused ? '1px solid #D13A28' : '1px solid rgba(0,0,0,0.07)', borderRadius: 12, boxShadow: 'none', minHeight: 44, cursor: 'pointer' }),
        menu:         (b)    => ({ ...b, background: bgMenu, borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 20 }),
        option:       (b, s) => ({ ...b, background: s.isFocused ? (isDark ? '#2E2E2E' : '#EFEDEA') : 'transparent', color: text, fontSize: 13, cursor: 'pointer' }),
        singleValue:  (b)    => ({ ...b, color: text, fontSize: 13, fontWeight: 700 }),
        placeholder:  (b)    => ({ ...b, color: muted, fontSize: 13 }),
        input:        (b)    => ({ ...b, color: text }),
        indicatorSep: ()     => ({ display: 'none' }),
        menuPortal:   (b)    => ({ ...b, zIndex: 1100 }),
    };
}

const INPUT = `w-full p-3 rounded-xl outline-none transition-all
    bg-chip
    border border-black/[0.07] dark:border-white/[0.07]
    text-ink text-sm font-bold
    focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]
    placeholder:text-muted`;

const LABEL = 'block text-[10px] font-black text-muted uppercase mb-1.5 tracking-widest';

// Producto vacío para agregar al array
const crearProductoVacio = () => ({
    id: Date.now(),
    productoOpt: null,
    filas: [{ cantidad: '', precioUnitario: '', descuentoPct: '' }],
    abierto: true,
});

export default function ModalCotizacionVolumen({ onCerrar }) {
    const { isDark } = useTheme();

    const [clientes,   setClientes]   = useState([]);
    const [repuestos,  setRepuestos]  = useState([]);
    const [cargando,   setCargando]   = useState(true);

    // Campos globales
    const [clienteNombre,    setClienteNombre]    = useState('');
    const [clienteTelefono,  setClienteTelefono]  = useState('');
    const [clienteOpt,       setClienteOpt]       = useState(null);
    const [validezDias,      setValidezDias]      = useState('7');
    const [notas,            setNotas]            = useState('');

    // Array de productos con sus escalas
    const [productos, setProductos] = useState([crearProductoVacio()]);

    useEffect(() => {
        Promise.all([
            api.get('/clientes?page=0&size=500'),
            api.get('/repuestos?page=0&size=500'),
        ]).then(([rc, rr]) => {
            setClientes((rc.data.content || rc.data).map(c => ({
                value: c.id,
                label: c.nombre,
                telefono: c.telefono || '',
            })));
            setRepuestos((rr.data.content || rr.data).map(r => ({
                value: r.id,
                label: r.nombre,
                sku: r.sku || '',
                descripcion: r.descripcion || '',
                fotoUrl: r.fotoUrl || '',
                precio: calcPrecioLista(r),
            })));
        }).catch(err => {
            console.error('Error cargando datos cotización:', err);
            toast.error('Error al cargar datos');
        }).finally(() => setCargando(false));
    }, []);

    function calcPrecioLista(r) {
        const costo = parseFloat(r.costo) || 0;
        const g     = parseFloat(r.porcentajeGanancia) || 0;
        const m     = parseFloat(r.porcentajeMarkup)   || 0;
        if (r.precioLista) return parseFloat(r.precioLista);
        return costo * (1 + g / 100) * (1 + m / 100);
    }

    const onClienteChange = (opt) => {
        setClienteOpt(opt);
        if (opt) {
            setClienteNombre(opt.label);
            setClienteTelefono(opt.telefono);
        }
    };

    // ── Helpers por producto ────────────────────────────────────────────────
    const updateProducto = (idx, updater) => {
        setProductos(prev => prev.map((p, i) => i === idx ? updater(p) : p));
    };

    const onProductoChange = (idx, opt) => {
        updateProducto(idx, p => {
            const filas = opt
                ? p.filas.map((f, i) => i === 0
                    ? { ...f, precioUnitario: Math.round(opt.precio).toString(), descuentoPct: '0' }
                    : f)
                : p.filas;
            return { ...p, productoOpt: opt, filas };
        });
    };

    const precioLista = (prod) => prod.productoOpt ? Math.round(prod.productoOpt.precio) : 0;

    const actualizarDescuento = (prodIdx, filaIdx, pct) => {
        updateProducto(prodIdx, p => {
            const pl = precioLista(p);
            const pctVal = Math.max(0, Math.min(100, Number(pct) || 0));
            const precio = pl > 0 ? Math.round(pl * (1 - pctVal / 100)) : '';
            return { ...p, filas: p.filas.map((f, i) => i === filaIdx
                ? { ...f, descuentoPct: pct, precioUnitario: precio.toString() }
                : f
            )};
        });
    };

    const actualizarPrecio = (prodIdx, filaIdx, precio) => {
        updateProducto(prodIdx, p => {
            const pl = precioLista(p);
            const pct = pl > 0 && precio !== ''
                ? Math.round((1 - Number(precio) / pl) * 1000) / 10
                : '';
            return { ...p, filas: p.filas.map((f, i) => i === filaIdx
                ? { ...f, precioUnitario: precio, descuentoPct: pct.toString() }
                : f
            )};
        });
    };

    const actualizarCantidad = (prodIdx, filaIdx, val) => {
        updateProducto(prodIdx, p => ({
            ...p, filas: p.filas.map((f, i) => i === filaIdx ? { ...f, cantidad: val } : f)
        }));
    };

    const agregarFila = (prodIdx) => {
        updateProducto(prodIdx, p => ({
            ...p, filas: [...p.filas, { cantidad: '', precioUnitario: '', descuentoPct: '' }]
        }));
    };

    const quitarFila = (prodIdx, filaIdx) => {
        updateProducto(prodIdx, p => ({
            ...p, filas: p.filas.filter((_, i) => i !== filaIdx)
        }));
    };

    const toggleProducto = (idx) => {
        updateProducto(idx, p => ({ ...p, abierto: !p.abierto }));
    };

    const quitarProducto = (idx) => {
        if (productos.length === 1) return;
        setProductos(prev => prev.filter((_, i) => i !== idx));
    };

    // Productos ya seleccionados (para filtrar del selector)
    const productosSeleccionados = productos
        .filter(p => p.productoOpt)
        .map(p => p.productoOpt.value);

    const generarPDF = async () => {
        if (!clienteNombre.trim()) { toast.error('Ingresa el nombre del cliente'); return; }

        const productosValidos = productos.filter(p => p.productoOpt).map(p => ({
            productoNombre:      p.productoOpt.label,
            productoCodigo:      p.productoOpt.sku,
            productoDescripcion: p.productoOpt.descripcion,
            fotoUrl:             p.productoOpt.fotoUrl,
            filas:               p.filas.filter(f => f.cantidad !== '' && f.precioUnitario !== ''),
        })).filter(p => p.filas.length > 0);

        if (productosValidos.length === 0) {
            toast.error('Agrega al menos un producto con cantidad y precio');
            return;
        }

        try {
            await generarPDFCotizacion({
                clienteNombre,
                clienteTelefono,
                productos: productosValidos,
                validezDias,
                notas,
            });
            toast.success('PDF generado');
            onCerrar();
        } catch (err) {
            console.error(err);
            toast.error('Error al generar PDF');
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4">
                <div className="bg-card rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg max-h-[85vh] flex flex-col border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* Handle movil */}
                    <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 bg-chip sm:hidden" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
                        <div>
                            <h3 className="text-lg font-black text-ink uppercase leading-none">
                                Cotizacion por volumen
                            </h3>
                            <p className="text-[10px] font-bold text-muted mt-1">
                                {productos.length === 1 ? 'Precios escalonados por cantidad' : `${productos.length} productos`}
                            </p>
                        </div>
                        <button onClick={onCerrar}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted bg-chip text-sm font-black hover:opacity-70 transition-all">
                            ✕
                        </button>
                    </div>

                    {/* Scroll body */}
                    <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-4 space-y-4">
                        {cargando ? (
                            <div className="py-8 text-center text-muted text-sm">Cargando...</div>
                        ) : (
                            <>
                                {/* Cliente */}
                                <div>
                                    <label className={LABEL}>Cliente</label>
                                    <Select
                                        options={clientes}
                                        value={clienteOpt}
                                        onChange={onClienteChange}
                                        onInputChange={(v) => { if (!clienteOpt) setClienteNombre(v); }}
                                        placeholder="Buscar o escribir nombre..."
                                        isClearable
                                        styles={buildSelectStyles(isDark)}
                                        menuPortalTarget={document.body}
                                    />
                                    {!clienteOpt && (
                                        <input
                                            className={`${INPUT} mt-2`}
                                            placeholder="O escribi el nombre directo"
                                            value={clienteNombre}
                                            onChange={e => setClienteNombre(e.target.value)}
                                        />
                                    )}
                                </div>

                                {clienteOpt && (
                                    <div>
                                        <label className={LABEL}>Telefono del cliente</label>
                                        <input className={INPUT} value={clienteTelefono}
                                            onChange={e => setClienteTelefono(e.target.value)}
                                            placeholder="Opcional" />
                                    </div>
                                )}

                                {/* ── Productos ──────────────────────────────────────── */}
                                {productos.map((prod, prodIdx) => (
                                    <div key={prod.id}
                                        className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-panel">

                                        {/* Cabecera del producto */}
                                        <button onClick={() => toggleProducto(prodIdx)}
                                            className="w-full flex items-center justify-between px-4 py-3 active:scale-[0.99] transition-all">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-6 h-6 rounded-lg bg-brand-red text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                    {prodIdx + 1}
                                                </span>
                                                <span className="text-[13px] font-black text-ink truncate">
                                                    {prod.productoOpt?.label || 'Seleccionar producto'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {productos.length > 1 && (
                                                    <span onClick={(e) => { e.stopPropagation(); quitarProducto(prodIdx); }}
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-[#D13A28] text-[11px] transition-all">
                                                        ✕
                                                    </span>
                                                )}
                                                <span className={`text-[10px] text-muted transition-transform duration-200 ${prod.abierto ? 'rotate-180' : ''}`}>
                                                    ▾
                                                </span>
                                            </div>
                                        </button>

                                        {/* Contenido colapsable */}
                                        {prod.abierto && (
                                            <div className="px-4 pb-4 space-y-3">
                                                {/* Selector de producto */}
                                                <div>
                                                    <label className={LABEL}>Producto</label>
                                                    <Select
                                                        options={repuestos.filter(r =>
                                                            !productosSeleccionados.includes(r.value) || r.value === prod.productoOpt?.value
                                                        )}
                                                        value={prod.productoOpt}
                                                        onChange={(opt) => onProductoChange(prodIdx, opt)}
                                                        placeholder="Buscar por nombre o SKU..."
                                                        isClearable
                                                        styles={buildSelectStyles(isDark)}
                                                        menuPortalTarget={document.body}
                                                        filterOption={(opt, input) => {
                                                            const q = input.toLowerCase();
                                                            return opt.label?.toLowerCase().includes(q) ||
                                                                   opt.data?.sku?.toLowerCase().includes(q);
                                                        }}
                                                    />
                                                    {prod.productoOpt && (
                                                        <div className="mt-2 px-3 py-2.5 rounded-xl bg-card border border-black/[0.05] dark:border-white/[0.05]">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[9px] font-black text-muted uppercase tracking-wider">Precio lista</span>
                                                                {prod.productoOpt.sku && <span className="text-[9px] font-black text-brand-red">{prod.productoOpt.sku}</span>}
                                                            </div>
                                                            <p className="text-[13px] font-black text-ink">
                                                                ${precioLista(prod).toLocaleString('es-AR')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Escala de precios */}
                                                {prod.productoOpt && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className={LABEL + ' mb-0'}>Escala de precios</label>
                                                            <button onClick={() => agregarFila(prodIdx)}
                                                                className="text-[11px] font-black text-brand-red uppercase tracking-wide hover:opacity-70 transition-all">
                                                                + Fila
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-1.5 px-1">
                                                            <span className="text-[9px] font-black text-muted uppercase">Cantidad</span>
                                                            <span className="text-[9px] font-black text-muted uppercase">Desc. · Precio</span>
                                                            <span className="w-7" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            {prod.filas.map((fila, filaIdx) => {
                                                                const sub = Number(fila.cantidad) * Number(fila.precioUnitario);
                                                                return (
                                                                    <div key={filaIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                                                                        <input
                                                                            type="text" inputMode="numeric"
                                                                            placeholder="Ej: 300"
                                                                            value={fila.cantidad}
                                                                            onChange={e => actualizarCantidad(prodIdx, filaIdx, e.target.value)}
                                                                            className={INPUT + ' text-center'}
                                                                        />
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="text" inputMode="decimal"
                                                                                    placeholder="0"
                                                                                    value={fila.descuentoPct}
                                                                                    onChange={e => actualizarDescuento(prodIdx, filaIdx, e.target.value)}
                                                                                    className={INPUT + ' pr-8 text-center font-black'}
                                                                                />
                                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-black text-sm pointer-events-none">%</span>
                                                                            </div>
                                                                            <div className="relative">
                                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-[11px] pointer-events-none font-bold">$</span>
                                                                                <input
                                                                                    type="text" inputMode="decimal"
                                                                                    placeholder="Precio"
                                                                                    value={fila.precioUnitario}
                                                                                    onChange={e => actualizarPrecio(prodIdx, filaIdx, e.target.value)}
                                                                                    className="w-full pl-6 pr-2 py-1.5 rounded-lg text-[11px] font-bold outline-none
                                                                                        bg-card
                                                                                        text-muted dark:text-[#9E9A94]
                                                                                        border border-black/[0.05] dark:border-white/[0.05]
                                                                                        focus:ring-1 focus:ring-[#D13A28]/20 focus:border-[#D13A28]/40
                                                                                        placeholder:text-[#E8E5E0] dark:placeholder:text-[#3E3E3E]"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <button onClick={() => quitarFila(prodIdx, filaIdx)}
                                                                            disabled={prod.filas.length === 1}
                                                                            className="w-8 h-10 rounded-xl flex items-center justify-center text-muted hover:text-[#D13A28] transition-all disabled:opacity-30 text-sm mt-0.5">
                                                                            ✕
                                                                        </button>

                                                                        {fila.cantidad && fila.precioUnitario && (
                                                                            <div className="col-span-3 text-right text-[11px] text-muted -mt-1 pr-10">
                                                                                Subtotal: <span className="font-black text-ink">
                                                                                    ${sub.toLocaleString('es-AR')}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Boton agregar producto */}
                                <button onClick={() => setProductos(prev => [...prev, crearProductoVacio()])}
                                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[#D13A28]/30 dark:border-[#E8422F]/30 text-[12px] font-black text-brand-red uppercase tracking-wide hover:bg-[#D13A28]/5 transition-all active:scale-[0.98]">
                                    + Agregar otro producto
                                </button>

                                {/* Validez */}
                                <div>
                                    <label className={LABEL}>Validez (dias)</label>
                                    <input className={INPUT} type="text" inputMode="numeric" value={validezDias}
                                        onChange={e => setValidezDias(e.target.value)} />
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className={LABEL}>Notas (opcional)</label>
                                    <textarea className={INPUT + ' min-h-[64px] resize-none'} value={notas}
                                        onChange={e => setNotas(e.target.value)}
                                        placeholder="Ej: Precio sujeto a stock disponible" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 px-6 py-4 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07] bg-card rounded-b-[2rem]">
                        <button onClick={onCerrar}
                            className="flex-1 py-3 bg-chip text-ink rounded-xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={generarPDF}
                            className="flex-[2] py-3 bg-brand-red text-white rounded-xl font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95">
                            Generar PDF
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
