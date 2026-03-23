import React from 'react';
import CreatableSelect from 'react-select/creatable';

/**
 * SeccionCliente
 * Maneja: selector de cliente, info card, selector de sede, selector de S/N equipo.
 */
export default function SeccionCliente({
    db, clienteId, clienteObj,
    itemActual, setItemActual,
    esPresupuesto, estaBloqueado,
    historialEquipo,
    selectStyles,
    onClienteSeleccionado,
    onCrearCliente,
    onCrearSede,
    onCrearEquipo,
    consultarAntecedentes,
    enviarWhatsAppMantenimiento,
    numeroSeriePrellenado, setNumeroSeriePrellenado,
    setModalEquipoAbierto,
    setNombreClientePrellenado, setModalClienteAbierto,
    setNombreSedePrellenado, setModalSedeAbierto,
}) {
    return (
        <>
            {/* CLIENTE */}
            <div className="mb-0">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Cliente
                </label>
                <CreatableSelect
                    isDisabled={estaBloqueado}
                    styles={selectStyles}
                    options={db.clientes?.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                    value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
                    onChange={s => {
                        if (s?.__isNew__) { setNombreClientePrellenado(s.label); setModalClienteAbierto(true); }
                        else { onClienteSeleccionado(s?.value); }
                    }}
                    onCreateOption={val => { setNombreClientePrellenado(val); setModalClienteAbierto(true); }}
                    placeholder="Buscar o crear cliente..."
                />

                {clienteObj && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 grid grid-cols-2 gap-2">
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
                        {clienteObj.calle && (
                            <div className="col-span-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Dirección</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-white">
                                    {clienteObj.calle} {clienteObj.numero}
                                    {clienteObj.piso ? `, piso ${clienteObj.piso}` : ''}
                                </p>
                            </div>
                        )}
                        {clienteObj.condicionIva && (
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">IVA</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.condicionIva}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SEDE */}
            {clienteId && (
                <div className="mt-5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        Sede / Domicilio
                    </label>
                    <CreatableSelect
                        isDisabled={estaBloqueado}
                        styles={selectStyles}
                        options={db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId).map(s => ({ value: s.id.toString(), label: s.nombreSede }))}
                        value={db.sedes?.find(s => s.id === itemActual.sedeId)
                            ? { label: db.sedes.find(s => s.id === itemActual.sedeId).nombreSede }
                            : null}
                        onChange={s => {
                            if (s?.__isNew__) { setNombreSedePrellenado(s.label); setModalSedeAbierto(true); }
                            else { setItemActual({ ...itemActual, sedeId: parseInt(s?.value), sedeNombre: s.label }); }
                        }}
                        onCreateOption={val => { setNombreSedePrellenado(val); setModalSedeAbierto(true); }}
                        placeholder="Elegí la sede o creá una..."
                    />
                </div>
            )}

            {/* S/N EQUIPO — solo modo técnico */}
            {clienteId && esPresupuesto && (
                <div className="mt-5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        S/N Dispenser
                    </label>
                    <CreatableSelect
                        isDisabled={estaBloqueado}
                        styles={selectStyles}
                        options={db.equipos
                            ?.filter(e => e.sede?.id?.toString() === itemActual.sedeId?.toString())
                            .map(e => ({ value: e.numeroSerie, label: `S/N: ${e.numeroSerie}` }))}
                        onChange={s => {
                            if (s?.__isNew__) { setNumeroSeriePrellenado(s.label); setModalEquipoAbierto(true); }
                            else { setItemActual({ ...itemActual, equipoSerial: s?.value }); consultarAntecedentes(s?.value); }
                        }}
                        onCreateOption={val => { setNumeroSeriePrellenado(val); setModalEquipoAbierto(true); }}
                        value={itemActual.equipoSerial ? { label: itemActual.equipoSerial } : null}
                        placeholder="Elegí o creá N/S..."
                    />

                    {historialEquipo && (
                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Antecedentes</span>
                                <button onClick={enviarWhatsAppMantenimiento}
                                    className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black active:scale-95 transition-transform">
                                    💬 WhatsApp
                                </button>
                            </div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                <span className="opacity-50">{historialEquipo.fecha}</span>{' '}
                                — {historialEquipo.items[0]?.trabajoRealizado}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}