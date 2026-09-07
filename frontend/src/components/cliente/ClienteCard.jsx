import React, { useState } from 'react';
import ActionSheet from '../ui/ActionSheet';
import HistorialEquipoModal from '../equipo/HistorialEquipoModal';
import { abrirMaps, abrirWhatsApp, resumenCliente, formatFecha } from '../../utils/clienteUtils';
import HistorialClienteModal from './HistorialClienteModal';
import { LuMapPin, LuMessageCircle, LuWrench, LuShoppingCart, LuPencil, LuClipboardList, LuTrash2, LuHouse, LuTriangleAlert, LuBuilding2, LuUser } from 'react-icons/lu';

export default function ClienteCard({
    cliente, sedes, equipos, servicios = [],
    isExpanded, onToggleExpand,
    onEditCliente, onDeleteCliente,
    onEditEquipo, onArchivarEquipo, onRestaurarEquipo, onEliminarEquipoDefinitivo,
    onAddSede, onAddEquipo,
    onNuevoServicio, onNuevaVenta,
    enModal = false,
}) {
    const [equipoHistorial, setEquipoHistorial] = useState(null);
    const [modalHistorial, setModalHistorial] = useState(false);
    const [menuCliente, setMenuCliente] = useState(false);
    const [menuEquipo, setMenuEquipo] = useState(null); // id del equipo con menú abierto
    const [confirmEliminar, setConfirmEliminar] = useState(null); // 'cliente' | equipoId

    const sedesCli       = sedes.filter(s => (s.clienteId || s.cliente?.id) === cliente.id);
    const sedeIds        = sedesCli.map(s => String(s.id));
    const eqCli          = equipos.filter(eq => sedeIds.includes(String(eq.sedeId)));
    const equiposActivos = eqCli.filter(eq => eq.activo !== false);

    // Cálculos compartidos con ClienteRow (desktop) — centralizados en
    // clienteUtils.js para que las dos vistas no puedan desincronizarse.
    const {
        serviciosCli, ultimoServicio, diasSinAtender, alertaSinServicio,
        esEmpresa, tieneTecnica, tieneVenta, iniciales,
    } = resumenCliente(cliente, sedes, equipos, servicios);

    // Dirección formateada
    const direccion = [cliente.calle, cliente.numero, cliente.localidad].filter(Boolean).join(' ');

    // Vista colapsada — Opción B del rediseño (Lucas, 7-sep-2026): sin borde
    // de color aparte, avatar redondo con un pin de tipo (empresa/particular,
    // reemplaza el chip de texto "Empresa") y el estado en un punto de color
    // junto a la fecha en vez de una franja/badge aparte. El pin de abajo a
    // la derecha (tieneTecnica/tieneVenta) se deja como estaba.
    if (!isExpanded) {
        const pinCls = 'absolute -bottom-1 -right-1 flex items-center justify-center gap-0.5 rounded-full bg-ink text-white dark:text-[#1C1917] border-2 border-card';
        const PinTipo = esEmpresa ? LuBuilding2 : LuUser;
        const dotColor = alertaSinServicio ? 'bg-brand-amber' : (ultimoServicio ? 'bg-brand-green' : 'bg-muted');

        return (
            <div onClick={onToggleExpand}
                className="bg-card rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all border border-black/[0.07] dark:border-white/[0.07] px-3 py-2.5 flex items-center gap-3">
                <span className="relative w-10 h-10 rounded-full bg-chip text-ink flex items-center justify-center font-black text-label shrink-0">
                    {iniciales}
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-panel border-2 border-card flex items-center justify-center text-muted"
                        title={esEmpresa ? 'Empresa' : 'Particular'}>
                        <PinTipo size={8} />
                    </span>
                    {(tieneTecnica || tieneVenta) && (
                        <span className={`${pinCls} ${tieneTecnica && tieneVenta ? 'h-4 px-1' : 'w-4 h-4'}`}
                            title={tieneTecnica && tieneVenta ? 'Servicio técnico y venta' : tieneTecnica ? 'Servicio técnico' : 'Venta'}>
                            {tieneTecnica && <LuWrench size={9} />}
                            {tieneVenta && <LuShoppingCart size={9} />}
                        </span>
                    )}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-body font-black text-ink leading-tight truncate">
                        {cliente.nombre}
                    </p>
                    <p className="text-caption text-muted mt-0.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="truncate">
                            {ultimoServicio ? `Últ: ${formatFecha(ultimoServicio.fecha)}` : 'Sin servicios'}
                            {alertaSinServicio && (
                                <span className="text-brand-amber font-bold"> · {diasSinAtender} días sin visita</span>
                            )}
                        </span>
                    </p>
                </div>
                {cliente.telefono && (
                    <button
                        onClick={(e) => { e.stopPropagation(); abrirWhatsApp(cliente.telefono, cliente.nombre); }}
                        title="WhatsApp"
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#25D366] text-white shrink-0 active:scale-90 transition-all">
                        <LuMessageCircle size={13} />
                    </button>
                )}
            </div>
        );
    }

    // Vista expandida (dentro del overlay modal)
    return (
        <div className={enModal ? '' : 'bg-card rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden'}>
            <div className="space-y-4">

                {/* Dirección clickeable */}
                {direccion && direccion !== 'Sin dirección 0' && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-panel active:opacity-70 transition-opacity">
                        <LuMapPin size={13} className="text-caption" />
                        <span className="text-caption font-bold text-ink flex-1 truncate">{direccion}</span>
                        <span className="text-label text-muted">↗</span>
                    </a>
                )}

                {/* Acciones principales */}
                <div className="flex gap-2">
                    {cliente.telefono && (
                        <button onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] text-white rounded-xl font-black text-label active:scale-95 transition-all">
                            <LuMessageCircle size={14} /> WA
                        </button>
                    )}
                    {onNuevoServicio && (
                        <button onClick={() => onNuevoServicio(cliente)}
                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-chip text-ink rounded-xl font-black text-label active:scale-95 transition-all">
                            <LuWrench size={14} /> Servicio
                        </button>
                    )}
                    {onNuevaVenta && (
                        <button onClick={() => onNuevaVenta(cliente)}
                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-chip text-ink rounded-xl font-black text-label active:scale-95 transition-all">
                            <LuShoppingCart size={14} /> Venta
                        </button>
                    )}
                    {/* Menú ⋯ del cliente */}
                    <div className="relative">
                        <button onClick={() => setMenuCliente(v => !v)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-chip text-muted active:scale-95">⋯</button>
                        <ActionSheet open={menuCliente} onClose={() => setMenuCliente(false)}>
                                    <button onClick={() => { onEditCliente(cliente); setMenuCliente(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuPencil size={15} /> Editar cliente
                                    </button>
                                    <button onClick={() => { setModalHistorial(true); setMenuCliente(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuClipboardList size={15} /> Ver historial
                                    </button>
                                    <button onClick={() => { abrirMaps(cliente); setMenuCliente(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuMapPin size={15} /> Ver en mapa
                                    </button>
                                    <button onClick={() => { setConfirmEliminar('cliente'); setMenuCliente(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-brand-red active:bg-[#FEE2E2] rounded-xl flex items-center gap-2.5">
                                        <LuTrash2 size={15} /> Eliminar cliente
                                    </button>
                        </ActionSheet>
                    </div>
                </div>

                {/* Sedes + Equipos */}
                <div className="space-y-2">
                    {sedesCli.map(sede => {
                        const eqSede = equiposActivos.filter(eq => String(eq.sedeId) === String(sede.id));
                        return (
                            <div key={sede.id} className="rounded-xl bg-panel overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <p className="text-caption font-black text-ink">
                                        <LuHouse size={12} className="inline mr-1 -mt-0.5" />{sede.nombreSede}
                                        {eqSede.length > 0 && (
                                            <span className="text-muted font-bold ml-1.5">{eqSede.length} eq</span>
                                        )}
                                    </p>
                                    <button onClick={() => onAddEquipo(cliente)}
                                        className="text-label font-black text-brand-red active:scale-95">
                                        + EQUIPO
                                    </button>
                                </div>
                                {eqSede.length > 0 && (
                                    <div className="border-t border-black/[0.05] dark:border-white/[0.05]">
                                        {eqSede.map(eq => (
                                            <div key={eq.id} className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-caption font-bold text-ink truncate">
                                                        {eq.modelo || 'Equipo'} <span className="text-muted">· {eq.numeroSerie}</span>
                                                    </p>
                                                    {eq.ubicacion && (
                                                        <p className="text-caption text-muted truncate">{eq.ubicacion}</p>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <button onClick={() => setMenuEquipo(menuEquipo === eq.id ? null : eq.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted active:scale-90 text-label">⋯</button>
                                                    <ActionSheet open={menuEquipo === eq.id} onClose={() => setMenuEquipo(null)}>
                                                                <p className="px-5 py-2 text-label font-black text-muted truncate">{eq.modelo || eq.numeroSerie}</p>
                                                                <button onClick={() => { setEquipoHistorial(eq); setMenuEquipo(null); }}
                                                                    className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                                                    <LuClipboardList size={15} /> Historial
                                                                </button>
                                                                <button onClick={() => { onEditEquipo(eq, cliente); setMenuEquipo(null); }}
                                                                    className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                                                    <LuPencil size={15} /> Editar
                                                                </button>
                                                                <button onClick={() => { setConfirmEliminar(eq.id); setMenuEquipo(null); }}
                                                                    className="w-full px-5 py-3.5 text-left text-body-lg font-bold text-brand-red active:bg-[#FEE2E2] rounded-xl flex items-center gap-2.5">
                                                                    <LuTrash2 size={15} /> Eliminar
                                                                </button>
                                                    </ActionSheet>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button onClick={() => onAddSede(cliente)}
                        className="w-full py-2.5 rounded-xl text-label font-bold text-muted border border-dashed border-muted/30 active:scale-[0.98] transition-all">
                        + Agregar sede
                    </button>
                </div>

                {/* Resumen historial */}
                {serviciosCli.length > 0 && (
                    <button onClick={() => setModalHistorial(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-panel active:opacity-70 transition-opacity">
                        <span className="text-caption font-black text-brand-amber flex items-center gap-1">
                            <LuClipboardList size={13} />{serviciosCli.length} servicio{serviciosCli.length !== 1 ? 's' : ''} · último {formatFecha(ultimoServicio?.fecha)}
                        </span>
                        <span className="text-label text-muted">Ver →</span>
                    </button>
                )}
            </div>

            {/* Confirmación eliminar */}
            {confirmEliminar && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[199] backdrop-blur-sm" onClick={() => setConfirmEliminar(null)} />
                    <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
                        <div className="bg-card rounded-3xl w-full max-w-sm shadow-2xl p-6">
                            <div className="flex justify-center mb-3"><LuTriangleAlert size={28} className="text-brand-amber" /></div>
                            <h3 className="text-center text-body-lg font-black text-ink mb-2">
                                {confirmEliminar === 'cliente' ? 'Eliminar cliente' : 'Eliminar equipo'}
                            </h3>
                            <p className="text-center text-caption text-muted mb-5">Esta acción no se puede deshacer</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminar(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={() => {
                                    if (confirmEliminar === 'cliente') onDeleteCliente(cliente.id);
                                    else onEliminarEquipoDefinitivo(confirmEliminar);
                                    setConfirmEliminar(null);
                                }}
                                    className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95">
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modales */}
            {equipoHistorial && (
                <HistorialEquipoModal equipo={equipoHistorial} onClose={() => setEquipoHistorial(null)} />
            )}
            {modalHistorial && (
                <HistorialClienteModal cliente={cliente} servicios={serviciosCli} onClose={() => setModalHistorial(false)} />
            )}
        </div>
    );
}
