import React, { useState } from 'react';
import HistorialEquipoModal from '../equipo/HistorialEquipoModal';
import { abrirMaps, abrirWhatsApp } from '../../utils/clienteUtils';
import HistorialClienteModal from './HistorialClienteModal';

function formatFecha(fecha) {
    if (!fecha) return null;
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

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

    const serviciosCli   = [...servicios.filter(s => (s.clienteId || s.cliente?.id) === cliente.id)]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const ultimoServicio = serviciosCli[0];
    const diasSinAtender = ultimoServicio
        ? Math.floor((new Date() - new Date(ultimoServicio.fecha)) / (1000 * 60 * 60 * 24))
        : null;
    const alertaSinServicio = diasSinAtender !== null && diasSinAtender > 90;
    const esEmpresa = (cliente.clienteTipo || cliente.tipo) === 'EMPRESA';

    // Dirección formateada
    const direccion = [cliente.calle, cliente.numero, cliente.localidad].filter(Boolean).join(' ');

    // Vista colapsada (para el grid)
    if (!isExpanded) {
        return (
            <button onClick={onToggleExpand}
                className="w-full bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] p-3.5 text-left active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 bg-[#D13A28] dark:bg-[#E8422F] rounded-xl flex items-center justify-center">
                        <span className="text-white font-black text-[12px]">
                            {cliente.nombre?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{cliente.nombre}</p>
                            {esEmpresa && (
                                <span className="shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded bg-[#D48800]/15 text-[#D48800] dark:text-[#F0A500]">EMP</span>
                            )}
                        </div>
                        <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate">
                            {cliente.localidad}
                            {ultimoServicio ? ` · Últ: ${formatFecha(ultimoServicio.fecha)}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {alertaSinServicio && <span className="w-2 h-2 rounded-full bg-[#D48800]" />}
                        <span className="text-[9px] font-black text-[#A8A29E]">{eqCli.length} eq</span>
                    </div>
                </div>
            </button>
        );
    }

    // Vista expandida (dentro del overlay modal)
    return (
        <div className={enModal ? '' : 'bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden'}>
            <div className="space-y-4">

                {/* Dirección clickeable */}
                {direccion && direccion !== 'Sin dirección 0' && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] active:opacity-70 transition-opacity">
                        <span className="text-[12px]">📍</span>
                        <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1 truncate">{direccion}</span>
                        <span className="text-[10px] text-[#A8A29E]">↗</span>
                    </a>
                )}

                {/* Acciones principales */}
                <div className="flex gap-2">
                    {cliente.telefono && (
                        <button onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] text-white rounded-xl font-black text-[11px] active:scale-95 transition-all">
                            💬 WA
                        </button>
                    )}
                    {onNuevoServicio && (
                        <button onClick={() => onNuevoServicio(cliente)}
                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[11px] active:scale-95 transition-all">
                            🔧 Servicio
                        </button>
                    )}
                    {onNuevaVenta && (
                        <button onClick={() => onNuevaVenta(cliente)}
                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#D48800] dark:bg-[#F0A500] text-white rounded-xl font-black text-[11px] active:scale-95 transition-all">
                            🛒 Venta
                        </button>
                    )}
                    {/* Menú ⋯ del cliente */}
                    <div className="relative">
                        <button onClick={() => setMenuCliente(v => !v)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#A8A29E] active:scale-95">⋯</button>
                        {menuCliente && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={() => setMenuCliente(false)} />
                                <div className="absolute right-0 bottom-full mb-1 z-[101] w-48 rounded-xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] overflow-hidden">
                                    <button onClick={() => { onEditCliente(cliente); setMenuCliente(false); }}
                                        className="w-full px-4 py-3 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#EFEDEA] dark:active:bg-[#3E3E3E]">
                                        ✏️ Editar cliente
                                    </button>
                                    <button onClick={() => { setModalHistorial(true); setMenuCliente(false); }}
                                        className="w-full px-4 py-3 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#EFEDEA] dark:active:bg-[#3E3E3E]">
                                        📋 Ver historial
                                    </button>
                                    <button onClick={() => { abrirMaps(cliente); setMenuCliente(false); }}
                                        className="w-full px-4 py-3 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#EFEDEA] dark:active:bg-[#3E3E3E]">
                                        📍 Ver en mapa
                                    </button>
                                    <button onClick={() => { setConfirmEliminar('cliente'); setMenuCliente(false); }}
                                        className="w-full px-4 py-3 text-left text-[12px] font-bold text-[#D13A28] dark:text-[#E8422F] active:bg-[#FEE2E2] dark:active:bg-[#3B1111]">
                                        🗑 Eliminar cliente
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sedes + Equipos */}
                <div className="space-y-2">
                    {sedesCli.map(sede => {
                        const eqSede = equiposActivos.filter(eq => String(eq.sedeId) === String(sede.id));
                        return (
                            <div key={sede.id} className="rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <p className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                        🏠 {sede.nombreSede}
                                        {eqSede.length > 0 && (
                                            <span className="text-[#A8A29E] font-bold ml-1.5">{eqSede.length} eq</span>
                                        )}
                                    </p>
                                    <button onClick={() => onAddEquipo(cliente)}
                                        className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F] active:scale-95">
                                        + EQUIPO
                                    </button>
                                </div>
                                {eqSede.length > 0 && (
                                    <div className="border-t border-black/[0.05] dark:border-white/[0.05]">
                                        {eqSede.map(eq => (
                                            <div key={eq.id} className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">
                                                        {eq.modelo || 'Equipo'} <span className="text-[#A8A29E]">· {eq.numeroSerie}</span>
                                                    </p>
                                                    {eq.ubicacion && (
                                                        <p className="text-[9px] text-[#A8A29E] truncate">{eq.ubicacion}</p>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <button onClick={() => setMenuEquipo(menuEquipo === eq.id ? null : eq.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A8A29E] active:scale-90 text-[10px]">⋯</button>
                                                    {menuEquipo === eq.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-[100]" onClick={() => setMenuEquipo(null)} />
                                                            <div className="absolute right-0 bottom-full mb-1 z-[101] w-40 rounded-xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] overflow-hidden">
                                                                <button onClick={() => { setEquipoHistorial(eq); setMenuEquipo(null); }}
                                                                    className="w-full px-3 py-2.5 text-left text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#EFEDEA]">
                                                                    📋 Historial
                                                                </button>
                                                                <button onClick={() => { onEditEquipo(eq, cliente); setMenuEquipo(null); }}
                                                                    className="w-full px-3 py-2.5 text-left text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#EFEDEA]">
                                                                    ✏️ Editar
                                                                </button>
                                                                <button onClick={() => { setConfirmEliminar(eq.id); setMenuEquipo(null); }}
                                                                    className="w-full px-3 py-2.5 text-left text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] active:bg-[#FEE2E2]">
                                                                    🗑 Eliminar
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button onClick={() => onAddSede(cliente)}
                        className="w-full py-2.5 rounded-xl text-[11px] font-bold text-[#A8A29E] border border-dashed border-[#A8A29E]/30 active:scale-[0.98] transition-all">
                        + Agregar sede
                    </button>
                </div>

                {/* Resumen historial */}
                {serviciosCli.length > 0 && (
                    <button onClick={() => setModalHistorial(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] active:opacity-70 transition-opacity">
                        <span className="text-[10px] font-black text-[#D48800] dark:text-[#F0A500]">
                            📋 {serviciosCli.length} servicio{serviciosCli.length !== 1 ? 's' : ''} · último {formatFecha(ultimoServicio?.fecha)}
                        </span>
                        <span className="text-[10px] text-[#A8A29E]">Ver →</span>
                    </button>
                )}
            </div>

            {/* Confirmación eliminar */}
            {confirmEliminar && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[199] backdrop-blur-sm" onClick={() => setConfirmEliminar(null)} />
                    <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
                        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl w-full max-w-sm shadow-2xl p-6">
                            <p className="text-center text-[28px] mb-3">⚠️</p>
                            <h3 className="text-center text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-2">
                                {confirmEliminar === 'cliente' ? 'Eliminar cliente' : 'Eliminar equipo'}
                            </h3>
                            <p className="text-center text-[11px] text-[#A8A29E] mb-5">Esta acción no se puede deshacer</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminar(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={() => {
                                    if (confirmEliminar === 'cliente') onDeleteCliente(cliente.id);
                                    else onEliminarEquipoDefinitivo(confirmEliminar);
                                    setConfirmEliminar(null);
                                }}
                                    className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
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
