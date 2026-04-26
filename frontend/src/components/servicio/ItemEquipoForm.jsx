import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

export default function ItemEquipoForm({
    db, clienteId,
    itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    estaBloqueado, esPresupuesto,
    selectStyles,
    sumarRepuesto, actualizarCantidad, quitarRepuesto,
    agregarAlTicket, calcularGananciaRepuesto,
    consultarAntecedentes, historialEquipo,
    enviarWhatsAppMantenimiento,
    setNumeroSeriePrellenado, setModalEquipoAbierto,
    numeroEquipo = 1,
}) {
    const inputCls = "w-full p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] text-sm font-medium outline-none placeholder-[#A8A29E] border border-black/[0.07] dark:border-white/[0.07] focus:ring-2 focus:ring-[#D13A28] transition-all";

    const sedesDelCliente = (() => {
        if (!clienteId) return [];
        const ids = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId).map(s => s.id) || [];
        return db.equipos?.filter(e => ids.includes(e.sedeId)) || [];
    })();

    return (
        <div className="space-y-4">
            {/* HEADER EQUIPO */}
            <div className="flex items-center gap-3 pb-3"
                 style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
                     style={{ background: '#D13A28' }}>
                    {numeroEquipo}
                </div>
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">
                    Equipo {numeroEquipo}
                </p>
            </div>

            {/* S/N */}
            <div>
                <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
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
                        if (s.__isNew__) { setNumeroSeriePrellenado(s.label); setItemActual({ ...itemActual, equipoSerial: s.label }); }
                        else { setItemActual({ ...itemActual, equipoSerial: s.value }); consultarAntecedentes(s.value); }
                    }}
                    onCreateOption={val => { setItemActual({ ...itemActual, equipoSerial: val }); consultarAntecedentes(val); }}
                    isClearable
                    placeholder="Buscar del inventario o escribir S/N libre..."
                />
            </div>

            {/* MODELO */}
            <div>
                <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
                    Modelo / descripción (opcional)
                </label>
                <input disabled={estaBloqueado} type="text"
                    value={itemActual.modeloEquipo || ''}
                    onChange={e => setItemActual({ ...itemActual, modeloEquipo: e.target.value })}
                    placeholder="Ej: Dispenser frío/calor marca X..."
                    className={inputCls}
                />
            </div>

            {/* UBICACIÓN */}
            <div>
                <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
                    Ubicación dentro del local (opcional)
                </label>
                <input disabled={estaBloqueado} type="text"
                    value={itemActual.ubicacionEquipo || ''}
                    onChange={e => setItemActual({ ...itemActual, ubicacionEquipo: e.target.value })}
                    placeholder="Ej: Piso 2 — Oficina de RRHH..."
                    className={inputCls}
                />
            </div>

            {/* ANTECEDENTES */}
            {historialEquipo && (
                <div className="p-4 rounded-xl"
                     style={{ background: '#FDECEA', border: '0.5px solid rgba(209,58,40,0.2)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-[#D13A28] uppercase tracking-widest">
                            Último servicio registrado
                        </span>
                        <button onClick={enviarWhatsAppMantenimiento}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white active:scale-95"
                            style={{ background: '#1E8A4A' }}>
                            💬 WhatsApp
                        </button>
                    </div>
                    <p className="text-xs font-medium text-[#57534E]">
                        <span className="text-[#A8A29E]">{historialEquipo.fecha}</span>
                        {' '}— {historialEquipo.items?.[0]?.trabajoRealizado}
                    </p>
                </div>
            )}

            {/* SEPARADOR TRABAJO */}
            <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: '16px' }}>
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-3">
                    Trabajo a realizar
                </p>
            </div>

            {/* BUSCADOR REPUESTOS */}
            {!estaBloqueado && (
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
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
                                return opt.data.nombre?.toLowerCase().includes(v) || opt.data.sku?.toLowerCase().includes(v);
                            }}
                            formatOptionLabel={opt => (
                                <div className="flex justify-between items-center">
                                    <div>
                                        {opt.sku && <span className="text-[9px] font-black mr-2" style={{ color: '#D13A28' }}>{opt.sku}</span>}
                                        <span className="font-bold text-sm">{opt.nombre}</span>
                                    </div>
                                    <span className="font-black text-xs" style={{ color: '#1E8A4A' }}>${opt.precio}</span>
                                </div>
                            )}
                            onChange={setRepuestoElegido}
                            value={repuestoElegido}
                            placeholder="Buscar por nombre o SKU..."
                        />
                    </div>
                    <button onClick={sumarRepuesto}
                        className="h-12 w-12 rounded-xl text-xl font-black text-white active:scale-90 transition-transform flex-shrink-0"
                        style={{ background: '#D13A28' }}>
                        +
                    </button>
                </div>
            )}

            {/* LISTA REPUESTOS */}
            {itemActual.repuestosUsados?.length > 0 && (
                <div className="p-3 rounded-xl"
                     style={{ background: '#D8D4CE', border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {itemActual.repuestosUsados.map((r, i) => {
                        const g = calcularGananciaRepuesto(r, r.cantidad);
                        return (
                            <div key={i} className="py-2.5" style={{ borderBottom: i < itemActual.repuestosUsados.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</p>
                                        <p className="text-[10px] text-[#A8A29E]">${r.precio} c/u</p>
                                    </div>
                                    <input disabled={estaBloqueado} type="number" min="1" value={r.cantidad}
                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                        className="w-11 h-9 rounded-lg text-center font-black text-sm text-[#1C1917] dark:text-[#F0EEE9] mr-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07]"
                                    />
                                    <p className="font-black text-sm w-16 text-right text-[#1C1917] dark:text-[#F0EEE9]">
                                        ${g.subtotal.toLocaleString()}
                                    </p>
                                    {!estaBloqueado && (
                                        <button onClick={() => quitarRepuesto(i)}
                                            className="ml-3 text-rose-500 text-lg leading-none">✕</button>
                                    )}
                                </div>
                                {g.ganancia > 0 && (
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[9px] font-bold" style={{ color: '#1E8A4A' }}>+${g.ganancia.toFixed(0)}</span>
                                        <span className="text-[9px] text-[#A8A29E]">Margen: {g.margen}%</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DESCRIPCIÓN TRABAJO */}
            <textarea disabled={estaBloqueado}
                placeholder="Descripción detallada del trabajo realizado o a realizar..."
                value={itemActual.trabajo || ''}
                onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                className="w-full p-4 rounded-xl text-sm font-medium text-[#1C1917] dark:text-[#F0EEE9] outline-none resize-none min-h-[90px] focus:ring-2 focus:ring-[#D13A28] bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] placeholder-[#A8A29E]"
            />

            {/* MANO DE OBRA */}
            <div className="p-5 rounded-2xl bg-[#1C1917] dark:bg-[#0F0F0F]">
                <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">
                    Mano de obra ($)
                </label>
                <input disabled={estaBloqueado} type="number" min="0"
                    value={itemActual.costoExtra}
                    onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
                />
            </div>

            {/* BOTÓN SUMAR */}
            {!estaBloqueado && (
                <button onClick={agregarAlTicket}
                    className="w-full h-13 py-4 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all"
                    style={{ background: '#D13A28' }}>
                    + Sumar equipo al ticket
                </button>
            )}
        </div>
    );
}