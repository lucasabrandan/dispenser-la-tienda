import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { generarPDFCotizacion } from '../../utils/generadorPDFCotizacion';

function buildSelectStyles(isDark) {
    const bg      = isDark ? '#2E2E2E' : '#C0BCB6';
    const bgMenu  = isDark ? '#242424' : '#EDEAE6';
    const text    = isDark ? '#F0EEE9' : '#1C1917';
    const muted   = '#A8A29E';
    return {
        control:      (b, s) => ({ ...b, background: bg, border: s.isFocused ? '1px solid #D13A28' : '1px solid rgba(0,0,0,0.07)', borderRadius: 12, boxShadow: 'none', minHeight: 44, cursor: 'pointer' }),
        menu:         (b)    => ({ ...b, background: bgMenu, borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }),
        option:       (b, s) => ({ ...b, background: s.isFocused ? (isDark ? '#2E2E2E' : '#D8D4CE') : 'transparent', color: text, fontSize: 13, cursor: 'pointer' }),
        singleValue:  (b)    => ({ ...b, color: text, fontSize: 13, fontWeight: 700 }),
        placeholder:  (b)    => ({ ...b, color: muted, fontSize: 13 }),
        input:        (b)    => ({ ...b, color: text }),
        indicatorSep: ()     => ({ display: 'none' }),
    };
}

const INPUT = `w-full p-3 rounded-xl outline-none transition-all
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
    border border-black/[0.07] dark:border-white/[0.07]
    text-[#1C1917] dark:text-[#F0EEE9] text-sm font-bold
    focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]
    placeholder:text-[#A8A29E]`;

const LABEL = 'block text-[10px] font-black text-[#A8A29E] uppercase mb-1.5 tracking-widest';

export default function ModalCotizacionVolumen({ onCerrar }) {
    const isDark = document.documentElement.classList.contains('dark');

    const [clientes,   setClientes]   = useState([]);
    const [repuestos,  setRepuestos]  = useState([]);
    const [cargando,   setCargando]   = useState(true);

    // Campos
    const [clienteNombre,    setClienteNombre]    = useState('');
    const [clienteTelefono,  setClienteTelefono]  = useState('');
    const [clienteOpt,       setClienteOpt]       = useState(null);
    const [productoOpt,      setProductoOpt]      = useState(null);
    const [filas,            setFilas]            = useState([{ cantidad: '', precioUnitario: '', descuentoPct: '' }]);
    const [validezDias,      setValidezDias]      = useState('7');
    const [notas,            setNotas]            = useState('');

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
        }).catch(() => toast.error('Error al cargar datos'))
          .finally(() => setCargando(false));
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

    const onProductoChange = (opt) => {
        setProductoOpt(opt);
        if (opt) {
            setFilas(prev => prev.map((f, i) => i === 0
                ? { ...f, precioUnitario: Math.round(opt.precio).toString(), descuentoPct: '0' }
                : f
            ));
        }
    };

    const precioLista = productoOpt ? Math.round(productoOpt.precio) : 0;

    // Cuando cambia el % → recalcula precio
    const actualizarDescuento = (idx, pct) => {
        const p = Math.max(0, Math.min(100, Number(pct) || 0));
        const precio = precioLista > 0 ? Math.round(precioLista * (1 - p / 100)) : '';
        setFilas(prev => prev.map((f, i) => i === idx
            ? { ...f, descuentoPct: pct, precioUnitario: precio.toString() }
            : f
        ));
    };

    // Cuando cambia el precio manualmente → recalcula %
    const actualizarPrecio = (idx, precio) => {
        const pct = precioLista > 0 && precio !== ''
            ? Math.round((1 - Number(precio) / precioLista) * 1000) / 10
            : '';
        setFilas(prev => prev.map((f, i) => i === idx
            ? { ...f, precioUnitario: precio, descuentoPct: pct.toString() }
            : f
        ));
    };

    const actualizarCantidad = (idx, val) => {
        setFilas(prev => prev.map((f, i) => i === idx ? { ...f, cantidad: val } : f));
    };

    const agregarFila = () => setFilas(prev => [...prev, { cantidad: '', precioUnitario: '', descuentoPct: '' }]);

    const quitarFila = (idx) => setFilas(prev => prev.filter((_, i) => i !== idx));

    const generarPDF = async () => {
        if (!clienteNombre.trim()) { toast.error('Ingresá el nombre del cliente'); return; }
        if (!productoOpt)          { toast.error('Seleccioná un producto');        return; }
        const filasValidas = filas.filter(f => f.cantidad !== '' && f.precioUnitario !== '');
        if (filasValidas.length === 0) { toast.error('Agregá al menos una fila con cantidad y precio'); return; }

        try {
            await generarPDFCotizacion({
                clienteNombre,
                clienteTelefono,
                productoNombre:      productoOpt.label,
                productoCodigo:      productoOpt.sku,
                productoDescripcion: productoOpt.descripcion,
                fotoUrl:             productoOpt.fotoUrl,
                filas:               filasValidas,
                validezDias,
                notas,
            });
            toast.success('PDF generado');
            onCerrar();
        } catch {
            toast.error('Error al generar PDF');
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4">
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md max-h-[92vh] flex flex-col border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* Handle móvil */}
                    <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 bg-[#C0BCB6] dark:bg-[#2E2E2E] sm:hidden" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
                        <div>
                            <h3 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none">
                                Cotización por volumen
                            </h3>
                            <p className="text-[10px] font-bold text-[#A8A29E] mt-1">
                                Precios escalonados por cantidad
                            </p>
                        </div>
                        <button onClick={onCerrar}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-sm font-black hover:opacity-70 transition-all">
                            ✕
                        </button>
                    </div>

                    {/* Scroll body */}
                    <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">
                        {cargando ? (
                            <div className="py-8 text-center text-[#A8A29E] text-sm">Cargando...</div>
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
                                    />
                                    {!clienteOpt && (
                                        <input
                                            className={`${INPUT} mt-2`}
                                            placeholder="O escribí el nombre directo"
                                            value={clienteNombre}
                                            onChange={e => setClienteNombre(e.target.value)}
                                        />
                                    )}
                                </div>

                                {clienteOpt && (
                                    <div>
                                        <label className={LABEL}>Teléfono del cliente</label>
                                        <input className={INPUT} value={clienteTelefono}
                                            onChange={e => setClienteTelefono(e.target.value)}
                                            placeholder="Opcional" />
                                    </div>
                                )}

                                {/* Producto */}
                                <div>
                                    <label className={LABEL}>Producto</label>
                                    <Select
                                        options={repuestos}
                                        value={productoOpt}
                                        onChange={onProductoChange}
                                        placeholder="Buscar por nombre o SKU..."
                                        isClearable
                                        styles={buildSelectStyles(isDark)}
                                        filterOption={(opt, input) => {
                                            const q = input.toLowerCase();
                                            return opt.label?.toLowerCase().includes(q) ||
                                                   opt.data?.sku?.toLowerCase().includes(q);
                                        }}
                                    />
                                    {productoOpt && (
                                        <div className="mt-2 px-3 py-2.5 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-white/[0.05]">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider">Precio lista</span>
                                                {productoOpt.sku && <span className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F]">{productoOpt.sku}</span>}
                                            </div>
                                            <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                                ${Math.round(productoOpt.precio).toLocaleString('es-AR')}
                                            </p>
                                            {productoOpt.descripcion ? (
                                                <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] mt-1 leading-snug">
                                                    {productoOpt.descripcion}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-[#A8A29E] mt-1 italic">Sin descripción cargada</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Tabla de filas */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={LABEL + ' mb-0'}>Escala de precios</label>
                                        <button onClick={agregarFila}
                                            className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] uppercase tracking-wide hover:opacity-70 transition-all">
                                            + Agregar fila
                                        </button>
                                    </div>

                                    {/* Encabezado */}
                                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-1.5 px-1">
                                        <span className="text-[9px] font-black text-[#A8A29E] uppercase">Cantidad</span>
                                        <span className="text-[9px] font-black text-[#A8A29E] uppercase">Descuento · Precio</span>
                                        <span className="w-7" />
                                    </div>

                                    <div className="space-y-2">
                                        {filas.map((fila, idx) => {
                                            const sub = Number(fila.cantidad) * Number(fila.precioUnitario);
                                            return (
                                                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                                                    <input
                                                        type="number" min="1"
                                                        placeholder="Ej: 300"
                                                        value={fila.cantidad}
                                                        onChange={e => actualizarCantidad(idx, e.target.value)}
                                                        className={INPUT + ' text-center'}
                                                    />

                                                    {/* Columna descuento + precio */}
                                                    <div className="flex flex-col gap-1">
                                                        {/* % descuento — prominente */}
                                                        <div className="relative">
                                                            <input
                                                                type="number" min="0" max="100"
                                                                placeholder="0"
                                                                value={fila.descuentoPct}
                                                                onChange={e => actualizarDescuento(idx, e.target.value)}
                                                                className={INPUT + ' pr-8 text-center font-black'}
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] font-black text-sm pointer-events-none">%</span>
                                                        </div>
                                                        {/* $ precio — chico, secundario */}
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] text-[11px] pointer-events-none font-bold">$</span>
                                                            <input
                                                                type="number" min="0"
                                                                placeholder="Precio"
                                                                value={fila.precioUnitario}
                                                                onChange={e => actualizarPrecio(idx, e.target.value)}
                                                                className="w-full pl-6 pr-2 py-1.5 rounded-lg text-[11px] font-bold outline-none
                                                                    bg-[#D8D4CE] dark:bg-[#1C1C1C]
                                                                    text-[#A8A29E] dark:text-[#9E9A94]
                                                                    border border-black/[0.05] dark:border-white/[0.05]
                                                                    focus:ring-1 focus:ring-[#D13A28]/20 focus:border-[#D13A28]/40
                                                                    placeholder:text-[#C0BCB6] dark:placeholder:text-[#3E3E3E]"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button onClick={() => quitarFila(idx)}
                                                        disabled={filas.length === 1}
                                                        className="w-8 h-10 rounded-xl flex items-center justify-center text-[#A8A29E] hover:text-[#D13A28] transition-all disabled:opacity-30 text-sm mt-0.5">
                                                        ✕
                                                    </button>

                                                    {/* Subtotal inline */}
                                                    {fila.cantidad && fila.precioUnitario && (
                                                        <div className="col-span-3 text-right text-[11px] text-[#A8A29E] -mt-1 pr-10">
                                                            Subtotal: <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                                                ${sub.toLocaleString('es-AR')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Validez */}
                                <div>
                                    <label className={LABEL}>Validez (días)</label>
                                    <input className={INPUT} type="number" min="1" value={validezDias}
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
                    <div className="flex gap-2 px-6 py-4 shrink-0" style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <button onClick={onCerrar}
                            className="flex-1 py-3 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={generarPDF}
                            className="flex-[2] py-3 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95">
                            📄 Generar PDF
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
