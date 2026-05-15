import React, { useState } from 'react';
import EquipoItem from '../EquipoItem';
import HistorialEquipoModal from '../equipo/HistorialEquipoModal';
import { abrirMaps, abrirWhatsApp } from '../../utils/clienteUtils';
import HistorialClienteModal from './HistorialClienteModal';

// Avatar con iniciales del cliente
function Avatar({ nombre }) {
    const iniciales = nombre?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    return (
        <div className="w-11 h-11 shrink-0 bg-[#D13A28] dark:bg-[#E8422F] rounded-2xl flex items-center justify-center">
            <span className="text-white font-black text-[13px]">{iniciales}</span>
        </div>
    );
}

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
    onNuevoServicio, onNuevaVenta
}) {
    const [equipoHistorial, setEquipoHistorial] = useState(null);
    const [modalHistorial, setModalHistorial] = useState(false);

    const sedesCli          = sedes.filter(s => s.clienteId === cliente.id);
    const eqCli             = equipos.filter(eq => sedesCli.map(s => s.id).includes(eq.sedeId));
    const equiposActivos    = eqCli.filter(eq => eq.activo !== false);
    const equiposArchivados = eqCli.filter(eq => eq.activo === false);

    // Historial del cliente ordenado por fecha desc
    const serviciosCli   = [...servicios.filter(s => s.clienteId === cliente.id)]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const ultimoServicio = serviciosCli[0];

    // Badge de alerta: más de 90 días sin servicio
    const diasSinAtender = ultimoServicio
        ? Math.floor((new Date() - new Date(ultimoServicio.fecha)) / (1000 * 60 * 60 * 24))
        : null;
    const alertaSinServicio = diasSinAtender !== null && diasSinAtender > 90;

    return (
        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden transition-all duration-200">

            {/* FILA COMPACTA — tap para expandir */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
            >
                <Avatar nombre={cliente.nombre} />

                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none truncate">
                        {cliente.nombre}
                    </p>
                    <p className="text-[10px] font-bold text-[#A8A29E] mt-0.5 truncate">
                        {cliente.localidad}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                        {/* Punto naranja si +90 días sin servicio */}
                        {alertaSinServicio && (
                            <span className="w-2 h-2 rounded-full bg-[#D48800] dark:bg-[#F0A500] shrink-0" title={`${diasSinAtender} días sin servicio`} />
                        )}
                        <span className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F] uppercase">
                            {eqCli.length} equipo{eqCli.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <span className="text-[#A8A29E] text-[11px]">{isExpanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {/* PANEL EXPANDIDO */}
            {isExpanded && (
                <div className="border-t border-black/[0.07] dark:border-white/[0.07]">

                    {/* Acciones rápidas — 2 filas */}
                    <div className="px-4 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] space-y-2">
                        {/* Fila 1: acciones principales */}
                        <div className="flex gap-2">
                            <button onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#25D366] text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">
                                💬 WA
                            </button>
                            <button onClick={() => abrirMaps(cliente)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#1C1917] dark:bg-[#2E2E2E] text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">
                                📍 Mapa
                            </button>
                            {onNuevoServicio && (
                                <button onClick={() => onNuevoServicio(cliente)}
                                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">
                                    🔧 Servicio
                                </button>
                            )}
                            {onNuevaVenta && (
                                <button onClick={() => onNuevaVenta(cliente)}
                                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-[#D48800] dark:bg-[#F0A500] text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">
                                    💰 Venta
                                </button>
                            )}
                        </div>
                        {/* Fila 2: secundarias */}
                        <div className="flex gap-2">
                            <button onClick={() => setModalHistorial(true)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                                📋 Historial
                            </button>
                            <button onClick={() => onEditCliente(cliente)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                                ✏️ Editar
                            </button>
                            <button onClick={() => onDeleteCliente(cliente.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>

                    {/* Info + historial */}
                    <div className="px-4 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.05] dark:border-white/[0.05] space-y-1.5">
                        <p className="text-[10px] font-bold text-[#A8A29E] uppercase">
                            📍 {cliente.calle} {cliente.numero}
                            {cliente.piso ? `, Piso ${cliente.piso}` : ''}
                            {cliente.depto ? ` Dto ${cliente.depto}` : ''}
                            {' · '}{cliente.localidad}
                        </p>

                        {/* Resumen historial — toca para abrir modal */}
                        {serviciosCli.length > 0 ? (
                            <button
                                onClick={() => setModalHistorial(true)}
                                className="flex items-center gap-2 w-full text-left active:opacity-70 transition-opacity"
                            >
                                <span className="text-[9px] font-black text-[#D48800] dark:text-[#F0A500] uppercase">
                                    🔧 {serviciosCli.length} servicio{serviciosCli.length !== 1 ? 's' : ''} · último {formatFecha(ultimoServicio?.fecha)}
                                </span>
                                <span className="text-[9px] text-[#A8A29E] ml-auto">Ver →</span>
                            </button>
                        ) : (
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase">Sin servicios registrados</p>
                        )}
                    </div>

                    {/* Sedes y equipos */}
                    <div className="px-4 pb-4 pt-3 space-y-4">
                        {sedesCli.map(sede => (
                            <div key={sede.id} className="space-y-2">
                                <p className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase flex items-center gap-2">
                                    🏠 {sede.nombreSede}
                                </p>
                                <div className="grid gap-2 ml-3">
                                    {equiposActivos.filter(eq => eq.sedeId === sede.id).map(eq => (
                                        <EquipoItem
                                            key={eq.id} equipo={eq} cliente={cliente}
                                            onEditar={onEditEquipo}
                                            onArchivar={onArchivarEquipo}
                                            onRestaurar={onRestaurarEquipo}
                                            onEliminarDefinitivo={onEliminarEquipoDefinitivo}
                                            onVerHistorial={setEquipoHistorial}
                                        />
                                    ))}
                                </div>

                                {equiposArchivados.filter(eq => eq.sedeId === sede.id).length > 0 && (
                                    <div className="ml-3 mt-2 pt-2 border-t border-black/[0.07] dark:border-white/[0.07]">
                                        <p className="text-[8px] font-black text-[#A8A29E] uppercase mb-2">📦 Archivados</p>
                                        <div className="grid gap-2">
                                            {equiposArchivados.filter(eq => eq.sedeId === sede.id).map(eq => (
                                                <EquipoItem
                                                    key={eq.id} equipo={eq} cliente={cliente}
                                                    onEditar={onEditEquipo}
                                                    onArchivar={onArchivarEquipo}
                                                    onRestaurar={onRestaurarEquipo}
                                                    onEliminarDefinitivo={onEliminarEquipoDefinitivo}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Botones agregar sede/equipo */}
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => onAddSede(cliente)}
                                className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] hover:opacity-80">
                                + Sede
                            </button>
                            <button onClick={() => onAddEquipo(cliente)}
                                className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] hover:opacity-80">
                                + Equipo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal historial por equipo — usa todos los servicios para no depender del filtro por cliente */}
            {equipoHistorial && (
                <HistorialEquipoModal
                    equipo={equipoHistorial}
                    servicios={servicios}
                    onClose={() => setEquipoHistorial(null)}
                />
            )}

            {/* Modal historial completo del cliente */}
            {modalHistorial && (
                <HistorialClienteModal
                    cliente={cliente}
                    onClose={() => setModalHistorial(false)}
                />
            )}
        </div>
    );
}
