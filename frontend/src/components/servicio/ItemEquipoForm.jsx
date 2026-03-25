import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

/**
 * ItemEquipoForm
 * Formulario de UN equipo para el ticket de servicio.
 * Reemplaza SeccionRepuestos + el selector S/N de SeccionCliente.
 *
 * Campos:
 *  - S/N (del inventario o texto libre)
 *  - Modelo / descripción del equipo (texto libre)
 *  - Ubicación dentro del local (texto libre)
 *  - Repuestos usados
 *  - Descripción del trabajo
 *  - Mano de obra ($)
 */
export default function ItemEquipoForm({
    db,
    clienteId,
    itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    estaBloqueado, esPresupuesto,
    selectStyles,
    sumarRepuesto,
    actualizarCantidad,
    quitarRepuesto,
    agregarAlTicket,
    calcularGananciaRepuesto,
    consultarAntecedentes,
    historialEquipo,
    enviarWhatsAppMantenimiento,
    setNumeroSeriePrellenado,
    setModalEquipoAbierto,
    numeroEquipo = 1,
}) {
    const inputCls = "w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold";

    const sedesDelCliente = (() => {
        if (!clienteId) return [];
        const idsSedesDelCliente = db.sedes
            ?.filter(s => s.cliente?.id?.toString() === clienteId)
            .map(s => s.id) || [];
        return db.equipos?.filter(e => idsSedesDelCliente.includes(e.sede?.id)) || [];
    })();

    return (
        <div className="space-y-4">

            {/* HEADER DEL EQUIPO */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {numeroEquipo}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Equipo {numeroEquipo}
                </p>
            </div>

            {/* S/N — del inventario o libre */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    N/S Dispenser (opcional)
                </label>
                <CreatableSelect
                    isDisabled={estaBloqueado}
                    styles={selectStyles}
                    options={sedesDelCliente.map(e => ({
                        value: e.numeroSerie,
                        label: `S/N: ${e.numeroSerie}${e.modelo ? ` — ${e.modelo}` : ''}`
                    }))}
                    value={itemActual.equipoSerial ? { label: itemActual.equipoSerial, value: itemActual.equipoSerial } : null}
                    onChange={s => {
                        if (!s) { setItemActual({ ...itemActual, equipoSerial: '' }); return; }
                        if (s.__isNew__) {
                            setNumeroSeriePrellenado(s.label);
                            setItemActual({ ...itemActual, equipoSerial: s.label });
                        } else {
                            setItemActual({ ...itemActual, equipoSerial: s.value });
                            consultarAntecedentes(s.value);
                        }
                    }}
                    onCreateOption={val => {
                        setItemActual({ ...itemActual, equipoSerial: val });
                        consultarAntecedentes(val);
                    }}
                    isClearable
                    placeholder="Buscar del inventario o escribir S/N libre..."
                />
            </div>

            {/* MODELO / DESCRIPCIÓN DEL EQUIPO */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Modelo / descripción del equipo (opcional)
                </label>
                <input
                    disabled={estaBloqueado}
                    type="text"
                    value={itemActual.modeloEquipo || ''}
                    onChange={e => setItemActual({ ...itemActual, modeloEquipo: e.target.value })}
                    placeholder="Ej: Dispenser frío/calor marca X, heladera Samsung..."
                    className={inputCls}
                />
            </div>

            {/* UBICACIÓN */}
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Ubicación dentro del local (opcional)
                </label>
                <input
                    disabled={estaBloqueado}
                    type="text"
                    value={itemActual.ubicacionEquipo || ''}
                    onChange={e => setItemActual({ ...itemActual, ubicacionEquipo: e.target.value })}
                    placeholder="Ej: Piso 2 — Oficina de RRHH, Depósito trasero..."
                    className={inputCls}
                />
            </div>

            {/* ANTECEDENTES (si hay historial del S/N) */}
            {historialEquipo && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            Último servicio registrado
                        </span>
                        <button onClick={enviarWhatsAppMantenimiento}
                            className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black active:scale-95">
                            💬 WhatsApp
                        </button>
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span className="opacity-50">{historialEquipo.fecha}</span>{' '}
                        — {historialEquipo.items?.[0]?.trabajoRealizado}
                    </p>
                </div>
            )}

            {/* SEPARADOR */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Trabajo a realizar
                </p>
            </div>

            {/* BUSCADOR REPUESTOS */}
            {!estaBloqueado && (
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Agregar repuesto — nombre o SKU
                        </label>
                        <Select
                            styles={selectStyles}
                            options={db.repuestos?.map(r => ({
                                ...r,
                                label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                                value: r.id
                            }))}
                            filterOption={(opt, input) => {
                                const v = input.toLowerCase();
                                return opt.data.nombre?.toLowerCase().includes(v) ||
                                       opt.data.sku?.toLowerCase().includes(v);
                            }}
                            formatOptionLabel={opt => (
                                <div className="flex justify-between items-center">
                                    <div>
                                        {opt.sku && <span className="text-[9px] font-black text-blue-400 mr-2">{opt.sku}</span>}
                                        <span className="font-bold text-sm">{opt.nombre}</span>
                                    </div>
                                    <span className="text-emerald-500 font-black text-xs">${opt.precio}</span>
                                </div>
                            )}
                            onChange={setRepuestoElegido}
                            value={repuestoElegido}
                            placeholder="Buscar por nombre o SKU..."
                        />
                    </div>
                    <button onClick={sumarRepuesto}
                        className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black active:scale-90 transition-transform">
                        +
                    </button>
                </div>
            )}

            {/* LISTA REPUESTOS */}
            {itemActual.repuestosUsados?.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    {itemActual.repuestosUsados.map((r, i) => {
                        const g = calcularGananciaRepuesto(r, r.cantidad);
                        return (
                            <div key={i} className="py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{r.nombre}</div>
                                        <div className="text-[10px] text-slate-400">${r.precio} c/u</div>
                                    </div>
                                    <input disabled={estaBloqueado} type="number" min="1" value={r.cantidad}
                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                        className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black dark:text-white mr-3"
                                    />
                                    <div className="font-black text-sm w-16 text-right text-slate-900 dark:text-white">
                                        ${g.subtotal.toLocaleString()}
                                    </div>
                                    {!estaBloqueado && (
                                        <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                                    )}
                                </div>
                                {g.ganancia > 0 && (
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[9px] font-black text-emerald-500">+${g.ganancia.toFixed(0)}</span>
                                        <span className="text-[9px] text-slate-400">Margen: {g.margen}%</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DESCRIPCIÓN TRABAJO */}
            <textarea
                disabled={estaBloqueado}
                placeholder="Descripción detallada del trabajo realizado o a realizar..."
                value={itemActual.trabajo || ''}
                onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[90px] resize-none"
            />

            {/* MANO DE OBRA */}
            <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-2xl shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mano de obra ($)
                </label>
                <input
                    disabled={estaBloqueado}
                    type="number" min="0"
                    value={itemActual.costoExtra}
                    onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
                />
            </div>

            {/* BOTÓN SUMAR */}
            {!estaBloqueado && (
                <button onClick={agregarAlTicket}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all">
                    + SUMAR EQUIPO AL TICKET
                </button>
            )}
        </div>
    );
}