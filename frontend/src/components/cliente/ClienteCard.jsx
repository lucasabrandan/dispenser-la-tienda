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

// Badge de estado del servicio
function badgeEstado(estado) {
    if (estado === 'REALIZADO')   return 'bg-[#16A34A]/10 text-[#16A34A]';
    if (estado === 'PRESUPUESTO') return 'bg-[#D48800]/10 text-[#D48800]';
    if (estado === 'RECHAZADO')   return 'bg-[#D13A28]/10 text-[#D13A28]';
    return 'bg-[#C0BCB6] text-[#57534E]';
}
function labelEstado(estado) {
    if (estado === 'REALIZADO')   return 'Realizado';
    if (estado === 'PRESUPUESTO') return 'Pendiente';
    if (estado === 'RECHAZADO')   return 'Rechazado';
    return estado;
}

const HIST_VISIBLE = 4; // servicios visibles por defecto en el historial inline

export default function ClienteCard({
    cliente, sedes, equipos, servicios = [],
    isExpanded, onToggleExpand,
    onEditCliente, onDeleteCliente,
    onEditEquipo, onArchivarEquipo, onRestaurarEquipo, onEliminarEquipoDefinitivo,
    onAddSede, onAddEquipo,
    onNuevoServicio, onNuevaVenta
}) {
    const [verHistorial, setVerHistorial] = useState(false);
    const [historialExpandido, setHistorialExpandido] = useState(false);
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
        <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden transition-all duration-200">

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

                    {/* Acciones rápidas */}
                    <div className="flex gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        <button onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                            💬 WA
                        </button>
                        <button onClick={() => abrirMaps(cliente)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1C1917] dark:bg-[#2E2E2E] text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                            📍 Mapa
                        </button>
                        {/* Acceso rápido a nuevo servicio */}
                        {onNuevoServicio && (
                            <button onClick={() => onNuevoServicio(cliente)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                                🔧 Serv.
                            </button>
                        )}
                        {/* Acceso rápido a nueva venta */}
                        {onNuevaVenta && (
                            <button onClick={() => onNuevaVenta(cliente)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#D48800] dark:bg-[#F0A500] text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                                💰 Venta
                            </button>
                        )}
                        {/* Historial completo del cliente */}
                        <button onClick={() => setModalHistorial(true)}
                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#1C1917] dark:bg-[#2E2E2E] text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">
                            📋 Hist.
                        </button>
                        <button onClick={() => onEditCliente(cliente)}
                            className="w-10 flex items-center justify-center py-2.5 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] rounded-xl hover:bg-[#D48800] hover:text-white dark:hover:bg-[#F0A500] active:scale-95 transition-all">
                            ✏️
                        </button>
                        <button onClick={() => onDeleteCliente(cliente.id)}
                            className="w-10 flex items-center justify-center py-2.5 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] rounded-xl hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] active:scale-95 transition-all">
                            🗑️
                        </button>
                    </div>

                    {/* Info + historial */}
                    <div className="px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-t border-black/[0.05] dark:border-white/[0.05] space-y-1.5">
                        <p className="text-[10px] font-bold text-[#A8A29E] uppercase">
                            📍 {cliente.calle} {cliente.numero}
                            {cliente.piso ? `, Piso ${cliente.piso}` : ''}
                            {cliente.depto ? ` Dto ${cliente.depto}` : ''}
                            {' · '}{cliente.localidad}
                        </p>

                        {/* Resumen historial + toggle */}
                        {serviciosCli.length > 0 ? (
                            <div>
                                <button
                                    onClick={() => setVerHistorial(v => !v)}
                                    className="flex items-center gap-2 w-full text-left"
                                >
                                    <span className="text-[9px] font-black text-[#D48800] dark:text-[#F0A500] uppercase">
                                        🔧 {serviciosCli.length} servicio{serviciosCli.length !== 1 ? 's' : ''} · último {formatFecha(ultimoServicio?.fecha)}
                                    </span>
                                    <span className="text-[9px] text-[#A8A29E] ml-auto">{verHistorial ? '▲' : '▼'}</span>
                                </button>

                                {/* Lista de servicios inline */}
                                {verHistorial && (
                                    <div className="mt-2 space-y-1.5">
                                        {(historialExpandido ? serviciosCli : serviciosCli.slice(0, HIST_VISIBLE)).map(s => (
                                            <div key={s.id} className="flex items-start gap-2 bg-[#C8C4BE] dark:bg-[#242424] rounded-xl px-3 py-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${badgeEstado(s.estado)}`}>
                                                            {labelEstado(s.estado)}
                                                        </span>
                                                        <span className="text-[9px] text-[#A8A29E]">{formatFecha(s.fecha)}</span>
                                                    </div>
                                                    {s.items?.length > 0 && (
                                                        <p className="text-[9px] text-[#57534E] dark:text-[#9E9A94] truncate">
                                                            {s.items.map(it => it.trabajoRealizado || it.equipoSerial).filter(Boolean).join(' · ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0">
                                                    ${Number(s.total || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Ver más / menos */}
                                        {serviciosCli.length > HIST_VISIBLE && (
                                            <button
                                                onClick={() => setHistorialExpandido(v => !v)}
                                                className="text-[9px] font-black text-[#D48800] dark:text-[#F0A500] uppercase w-full text-center py-1"
                                            >
                                                {historialExpandido
                                                    ? '▲ Ver menos'
                                                    : `▼ Ver ${serviciosCli.length - HIST_VISIBLE} más`}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
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
                                className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] hover:opacity-80">
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
