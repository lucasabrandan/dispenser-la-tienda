import React, { useEffect } from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';
import { useServicioManager } from '../../hooks/useServicioManager';
import ServicioForm from '../servicio/ServicioForm';
import { useFiltros } from '../../hooks/useFiltros';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion from '../ui/Paginacion';
import { useMontos } from '../../context/MontosContext';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

const ESTADOS_SERVICIO = [
    { value: 'PRESUPUESTO', label: 'Pendiente' },
    { value: 'REALIZADO',   label: 'Realizado' },
    { value: 'RECHAZADO',   label: 'Rechazado' },
];

// Badges usando variables CSS del sistema de diseño
const badgeInfo = (s) => {
    if (s.estado === 'PRESUPUESTO') return { label: 'Pendiente', cls: 'bg-[var(--warning-bg)] text-[var(--warning-tx)]' };
    if (s.estado === 'REALIZADO')   return { label: 'Realizado', cls: 'bg-[var(--success-bg)] text-[var(--success-tx)]' };
    if (s.estado === 'RECHAZADO')   return { label: 'Rechazado', cls: 'bg-[var(--danger-bg)] text-[var(--danger-tx)]' };
    return { label: s.estado, cls: 'bg-[#C0BCB6] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]' };
};

export default function ServicioManager({ clienteInicial = null, onClienteConsumido }) {
    const {
        servicios, cargando, stats,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        cargarServicios,
        confirmarServicio, rechazarServicio,
        eliminarServicio, generarPDF,
        calcularTotal, abrirEditar, cerrarModal,
        setFiltroTab,
    } = useServicioManager();

    // Auto-abrir modal cuando viene con cliente preseleccionado desde ClienteManager
    useEffect(() => {
        if (clienteInicial) setModalCrear(true);
    }, [clienteInicial]);

    const filtros = useFiltros(servicios, {
        porPagina: 10,
        campoFecha: 'fecha',
        campoEstado: 'estado',
        campoBusqueda: ['clienteNombre', 'sedeNombre'],
    });

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* ── HEADER ───────────────────────────────────────────────── */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                        Servicio Técnico
                    </h2>
                    <p className="text-[11px] font-medium mt-1 text-[#A8A29E]">Gestión de servicios</p>
                </div>
                <button
                    onClick={() => setModalCrear(true)}
                    className="h-10 px-5 rounded-xl font-bold text-xs text-white uppercase transition-all active:scale-95 hover:opacity-90"
                    style={{ background: '#D13A28' }}
                >
                    + Nuevo
                </button>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* ── STATS ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                         style={{ borderLeft: '3px solid #D13A28' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Facturado el mes</p>
                        <M valor={stats.totalMes} className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">{stats.cantidadMes} servicios</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                         style={{ borderLeft: '3px solid #D48800' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">MO del mes</p>
                        <M valor={stats.gananciaTotal} className="text-[20px] font-black leading-none text-[#D48800] dark:text-[#F0A500] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">mano de obra</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Hoy</p>
                        <M valor={stats.totalHoy} className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">{stats.cantidadHoy} servicios</p>
                    </div>
                    <button
                        onClick={() => setFiltroTab?.('PENDIENTES')}
                        className={`rounded-2xl p-4 text-left border border-black/[0.07] dark:border-white/[0.07] transition-all active:scale-95 ${
                            stats.pendientesCount > 0
                                ? 'bg-[var(--warning-bg)]'
                                : 'bg-[#EDEAE6] dark:bg-[#242424]'
                        }`}
                        style={stats.pendientesCount > 0 ? { borderLeft: '3px solid #D48800' } : {}}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Pendientes</p>
                        <p className={`text-[20px] font-black leading-none ${
                            stats.pendientesCount > 0
                                ? 'text-[var(--warning-tx)]'
                                : 'text-[#1C1917] dark:text-[#F0EEE9]'
                        }`}>
                            {stats.pendientesCount}
                        </p>
                        <p className="text-[9px] text-[#A8A29E] mt-1">presupuestos</p>
                    </button>
                </div>

                {/* ── ALERTA PENDIENTES ─────────────────────────────────── */}
                {stats.pendientesCount > 0 && (
                    <div
                        className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99] bg-[var(--warning-bg)] border border-[rgba(212,136,0,0.25)]"
                        onClick={() => setFiltroTab?.('PENDIENTES')}
                    >
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="text-sm font-black text-[var(--warning-tx)]">
                                {stats.pendientesCount} presupuesto{stats.pendientesCount > 1 ? 's' : ''} sin confirmar
                            </p>
                            <p className="text-xs text-[var(--warning)] font-bold">
                                <M valor={stats.pendientesVal} /> por cobrar
                            </p>
                        </div>
                    </div>
                )}

                {/* ── FILTROS ───────────────────────────────────────────── */}
                <FiltrosPanel hook={filtros} estados={ESTADOS_SERVICIO} conBusqueda conRango />
                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                {/* ── LISTA ─────────────────────────────────────────────── */}
                {cargando ? (
                    <div className="text-center py-16 font-bold text-[#A8A29E]">Cargando servicios...</div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] text-[#A8A29E] font-bold">
                        No hay servicios en esta categoría.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtros.itemsPagina.map(s => {
                            const badge = badgeInfo(s);
                            return (
                                <div key={s.id}
                                     className="rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] overflow-hidden"
                                     style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>

                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-[#A8A29E]">#{s.id}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <M valor={calcularTotal(s)} className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                                                <p className="text-[10px] text-[#A8A29E] mt-0.5">{s.fecha}</p>
                                            </div>
                                        </div>

                                        <p className="font-bold text-[15px] text-[#1C1917] dark:text-[#F0EEE9]">{s.clienteNombre}</p>
                                        <p className="text-[11px] text-[#A8A29E] mt-0.5">📍 {s.sedeNombre}</p>

                                        {s.items?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05] space-y-1">
                                                {s.items.map((it, i) => (
                                                    <div key={i} className="flex justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[10px] font-black text-[#D13A28] dark:text-[#E8422F] mr-2">
                                                                {it.equipoSerial}
                                                            </span>
                                                            <span className="text-[10px] text-[#A8A29E] truncate">{it.trabajoRealizado}</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] ml-3 shrink-0">
                                                            ${Number(it.costo || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Barra acciones */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                                         style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                                        {s.estado === 'PRESUPUESTO' && (
                                            <button onClick={() => abrirEditar(s)}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">✏️</button>
                                        )}
                                        <button onClick={() => setModalDetalle(s)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">👁️</button>
                                        <button onClick={() => generarPDF(s)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">📄</button>

                                        <div className="flex-1" />

                                        <button onClick={() => eliminarServicio(s.id)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[var(--danger-bg)] text-[var(--danger-tx)]">🗑️</button>

                                        {s.estado === 'PRESUPUESTO' && (
                                            <>
                                                <button onClick={() => rechazarServicio(s.id)}
                                                    className="h-9 px-3 rounded-xl font-bold text-xs text-white active:scale-95 bg-[#1C1917] dark:bg-[#2E2E2E] hover:opacity-80">
                                                    ✗ Rechazar
                                                </button>
                                                <button onClick={() => confirmarServicio(s.id)}
                                                    className="h-9 px-3 rounded-xl font-bold text-xs text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-80">
                                                    ✓ Cobrar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* ── MODAL CREAR / EDITAR ──────────────────────────────────── */}
            {modalCrear && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center"
                     style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#EDEAE6] dark:bg-[#141414]">
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                             style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {servicioEditar ? `Presupuesto #${servicioEditar.id}` : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModal}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-90">
                                ✕
                            </button>
                        </div>
                        <ServicioForm
                            onSaved={() => { cerrarModal(); cargarServicios(); if (onClienteConsumido) onClienteConsumido(); }}
                            servicioParaEditar={servicioEditar}
                            clienteInicialId={clienteInicial?.id}
                            soloTecnico
                        />
                    </div>
                </div>
            )}

            {/* ── MODAL DETALLE ─────────────────────────────────────────── */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end"
                     style={{ background: 'rgba(0,0,0,0.5)' }}
                     onClick={() => setModalDetalle(null)}>
                    <div className="w-full rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#EDEAE6] dark:bg-[#242424]"
                         onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{modalDetalle.clienteNombre}</h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}</p>
                        <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                                     style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                        <span className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]">
                                            ${Number(it.costo || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <span className="font-bold">Repuestos: </span>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
                                    )}
                                    {it.costoExtra > 0 && (
                                        <p className="text-[10px] text-[#A8A29E] mt-1">MO: ${Number(it.costoExtra).toLocaleString()}</p>
                                    )}

                                    {/* Fotos antes / después */}
                                    {(it.fotoAntes || it.fotoDespues) && (
                                        <div className="mt-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                            <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-2">📷 Registro fotográfico</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['fotoAntes', 'fotoDespues'].map((campo, i) => it[campo] ? (
                                                    <div key={campo} className="relative">
                                                        <img
                                                            src={construirUrlFoto(it[campo])}
                                                            alt={i === 0 ? 'Antes' : 'Después'}
                                                            className="w-full aspect-[3/4] object-cover rounded-xl"
                                                        />
                                                        <span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-black text-white uppercase bg-black/50 py-0.5 rounded-b-xl">
                                                            {i === 0 ? 'Antes' : 'Después'}
                                                        </span>
                                                    </div>
                                                ) : null)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)}
                            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}