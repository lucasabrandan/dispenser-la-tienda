import React from 'react';
import CreatableSelect from 'react-select/creatable';

/**
 * SeccionCliente
 * Props nuevas:
 *  soloSelector — solo muestra el buscador de cliente (sin sede/equipo)
 *  sinSelector  — solo muestra sede/equipo (cliente ya elegido, oculta el selector)
 */
export default function SeccionCliente({
    db, clienteId, clienteObj,
    itemActual, setItemActual,
    esPresupuesto, estaBloqueado,
    historialEquipo,
    selectStyles,
    onClienteSeleccionado,
    consultarAntecedentes,
    enviarWhatsAppMantenimiento,
    numeroSeriePrellenado, setNumeroSeriePrellenado,
    setModalEquipoAbierto,
    setNombreClientePrellenado, setModalClienteAbierto,
    setNombreSedePrellenado, setModalSedeAbierto,
    soloSelector = false,
    sinSelector  = false,
}) {
    return (
        <>
            {/* SELECTOR CLIENTE — oculto en sinSelector */}
            {!sinSelector && (
                <div className="mb-0">
                    {!soloSelector && (
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            Cliente
                        </label>
                    )}
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
                        placeholder="Buscar cliente registrado..."
                        isClearable
                    />

                    {/* Info cliente */}
                    {clienteObj && !soloSelector && (
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
                                        {clienteObj.calle} {clienteObj.numero}{clienteObj.piso ? `, piso ${clienteObj.piso}` : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* SEDE — visible si hay cliente y no soloSelector */}
            {clienteId && !soloSelector && (
                <div className="mt-5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        Sede / Domicilio (opcional)
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
                        placeholder="Elegí o creá una sede..."
                        isClearable
                    />
                </div>
            )}
        </>
    );
}