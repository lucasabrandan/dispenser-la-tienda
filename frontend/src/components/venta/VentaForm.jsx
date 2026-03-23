import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Card from '../ui/Card';
import CrearClienteModal from '../cliente/CrearClienteModal';
import { useVentaForm } from '../../hooks/useVentaForm';
import { useMostrador } from '../../hooks/useMostrador';

/**
 * VentaForm — dos modos:
 *  ⚡ Venta Rápida  → cliente/sede Mostrador automático
 *  👤 Con Cliente   → búsqueda / creación normal
 */
export default function VentaForm({ onSaved }) {
    const {
        clientes, repuestos,
        clienteId, setClienteId,
        clienteObj,
        productos,
        repuestoElegido, setRepuestoElegido,
        descuentoPorcentaje, setDescuentoPorcentaje,
        descuentoMonto, totalFinal,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        agregarProducto, actualizarCantidad, quitarProducto,
        guardarVenta, dispararPDF, onClienteNuevo,
    } = useVentaForm(onSaved);

    const { clienteId: mostradorCid, sedeId: mostradorSid, listo } = useMostrador();
    const [modoRapido, setModoRapido] = React.useState(false);

    const isDark = document.documentElement.classList.contains('dark');

    const activarRapido = () => {
        if (mostradorCid) { setClienteId(mostradorCid.toString()); setModoRapido(true); }
    };
    const activarNormal = () => { setClienteId(null); setModoRapido(false); };

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            background: isDark ? '#0F172A' : '#F8FAFC',
            border: state.isFocused ? '1px solid #3B82F6' : isDark ? '1px solid #334155' : '1px solid #E2E8F0',
            borderRadius: '12px', minHeight: '55px',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
            '&:hover': { border: '1px solid #3B82F6' }, transition: 'all 0.2s ease'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
            color: state.isSelected ? '#FFF' : isDark ? '#CBD5E1' : '#334155',
            padding: '12px 15px', cursor: 'pointer'
        }),
        menu:        base => ({ ...base, background: isDark ? '#0F172A' : '#FFF' }),
        singleValue: base => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48">

            {/* SELECTOR DE MODO */}
            <Card className="shadow-sm mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tipo de venta</p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={activarRapido} disabled={!listo}
                        className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                            modoRapido
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}>
                        <p className="text-xl mb-1">⚡</p>
                        <p className="font-black text-sm text-slate-900 dark:text-white">Venta Rápida</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Sin cliente · Mostrador</p>
                    </button>

                    <button onClick={activarNormal}
                        className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                            !modoRapido
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                        }`}>
                        <p className="text-xl mb-1">👤</p>
                        <p className="font-black text-sm text-slate-900 dark:text-white">Con Cliente</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Buscar o crear cliente</p>
                    </button>
                </div>

                {modoRapido && (
                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                            ⚡ Mostrador activo — agregá productos directamente
                        </p>
                    </div>
                )}
            </Card>

            {/* CLIENTE — solo modo normal */}
            {!modoRapido && (
                <Card className="shadow-sm mb-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</label>
                    <CreatableSelect
                        styles={selectStyles}
                        options={clientes.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                        value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
                        onChange={s => {
                            if (s?.__isNew__) { setNombreClientePrellenado(s.label); setModalClienteAbierto(true); }
                            else { setClienteId(s?.value); }
                        }}
                        onCreateOption={val => { setNombreClientePrellenado(val); setModalClienteAbierto(true); }}
                        placeholder="Buscar o crear cliente..."
                    />
                    {clienteObj && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl grid grid-cols-2 gap-2">
                            {clienteObj.telefono && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Teléfono</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.telefono}</p>
                                </div>
                            )}
                            {clienteObj.localidad && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Localidad</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.localidad}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}

            {/* PRODUCTOS — visible si hay cliente o modo rápido */}
            {(clienteId || modoRapido) && (
                <>
                    <Card className="shadow-sm mb-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Agregar Productos
                        </label>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Select
                                    styles={selectStyles}
                                    options={repuestos.map(r => ({ ...r, label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`, value: r.id }))}
                                    filterOption={(opt, input) => {
                                        const v = input.toLowerCase();
                                        return opt.data.nombre?.toLowerCase().includes(v) || opt.data.sku?.toLowerCase().includes(v);
                                    }}
                                    formatOptionLabel={opt => (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                {opt.sku && <span className="text-[9px] font-black text-blue-400 mr-2">{opt.sku}</span>}
                                                <span className="font-bold text-sm">{opt.nombre}</span>
                                            </div>
                                            <span className="text-emerald-500 font-black">${opt.precio}</span>
                                        </div>
                                    )}
                                    onChange={setRepuestoElegido}
                                    value={repuestoElegido}
                                    placeholder="Buscar producto..."
                                />
                            </div>
                            <button onClick={agregarProducto}
                                className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black active:scale-95 transition-transform">
                                +
                            </button>
                        </div>
                    </Card>

                    {productos.length > 0 && (
                        <Card className="shadow-sm mb-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Productos agregados
                            </label>
                            {productos.map((p, i) => (
                                <div key={i} className="py-2 border-b border-slate-200 dark:border-slate-700 last:border-0 flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</div>
                                        <div className="text-[10px] text-slate-400">${p.precio} c/u</div>
                                    </div>
                                    <input type="number" min="1" value={p.cantidad}
                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                        className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black mr-3 dark:text-white"
                                    />
                                    <div className="font-black text-sm w-20 text-right text-slate-900 dark:text-white">
                                        ${p.subtotal.toLocaleString()}
                                    </div>
                                    <button onClick={() => quitarProducto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                                </div>
                            ))}
                        </Card>
                    )}

                    {productos.length > 0 && (
                        <Card className="shadow-sm mb-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descuento (%)</label>
                            <div className="flex items-center gap-3">
                                <input type="number" min="0" max="100" value={descuentoPorcentaje}
                                    onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-24 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl dark:text-white outline-none"
                                />
                                <span className="font-black text-slate-400 text-xl">%</span>
                                {descuentoPorcentaje > 0 && (
                                    <div className="flex-1 text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Descuento</p>
                                        <p className="text-lg font-black text-rose-500">- ${descuentoMonto.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-3">
                                {[5, 10, 15, 20].map(v => (
                                    <button key={v} onClick={() => setDescuentoPorcentaje(v)}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                                            descuentoPorcentaje === v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>{v}%</button>
                                ))}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* BARRA FINAL */}
            {productos.length > 0 && (
                <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
                    <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl">
                        <div className="text-white">
                            <div className="text-[9px] text-slate-400 font-black uppercase">
                                Total Final {descuentoPorcentaje > 0 && <span className="text-rose-400">(-{descuentoPorcentaje}%)</span>}
                            </div>
                            <div className="text-3xl font-black">${totalFinal.toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={dispararPDF}
                                className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center active:scale-90 transition-transform">
                                📄
                            </button>
                            <button onClick={() => guardarVenta(false, modoRapido ? mostradorSid : null)}
                                className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px] active:scale-95 transition-transform">
                                GUARDAR
                            </button>
                            <button onClick={() => guardarVenta(true, modoRapido ? mostradorSid : null)}
                                className="bg-emerald-500 text-white px-6 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-transform">
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CrearClienteModal
                isOpen={modalClienteAbierto}
                onClose={() => setModalClienteAbierto(false)}
                onClienteCreado={onClienteNuevo}
                clienteNombrePrellenado={nombreClientePrellenado}
            />
        </div>
    );
}