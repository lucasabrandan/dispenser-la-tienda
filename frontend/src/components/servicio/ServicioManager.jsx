import React, { useEffect, useState } from 'react';
import { useServicioManager } from '../../hooks/useServicioManager';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';
import { exportarServiciosCSV } from '../../utils/exportarCSV';
import { getUsuarios } from '../../services/api';
import ServicioForm from '../servicio/ServicioForm';
import ServicioCard from '../servicio/ServicioCard';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion from '../ui/Paginacion';
import ModalFirmasPDF from '../ui/ModalFirmasPDF';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

const TABS = [
    { id: 'PRESUPUESTO', label: 'Presupuestos' },
    { id: 'REALIZADO',   label: 'Realizados'   },
    { id: 'ARCHIVADO',   label: 'Archivados'   },
];

export default function ServicioManager({ clienteInicial = null, onClienteConsumido, presupuestoOrigen = null, onPresupuestoOrigenConsumido }) {
    const { esAdmin } = useAuth();
    const {
        cargando, stats,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        modalFirmas, setModalFirmas,
        confirmarFirmasYGenerarPDF,
        cargarServicios,
        confirmarServicio, rechazarServicio,
        archivarServicio, accionMasiva,
        eliminarServicio, generarPDF,
        calcularTotal, abrirEditar, cerrarModal,
        filtros, usuarioId, setUsuarioId,
    } = useServicioManager();

    const [servicioEjecutar, setServicioEjecutar] = useState(null);
    const [tecnicos, setTecnicos]               = useState([]);
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());

    const tabActual = filtros.estado || 'PRESUPUESTO';

    const cambiarTab = (id) => {
        filtros.setEstado(id);
        setModoSeleccion(false);
        setSeleccionados(new Set());
    };

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const ejecutarMasiva = async (accion) => {
        await accionMasiva([...seleccionados], accion);
        setSeleccionados(new Set());
        setModoSeleccion(false);
    };

    const abrirEjecutar    = (s) => { setServicioEjecutar(s); setModalCrear(true); };
    const cerrarModalCompleto = () => { cerrarModal(); setServicioEjecutar(null); };

    useEffect(() => { if (esAdmin) getUsuarios().then(r => setTecnicos(r.data)).catch(() => {}); }, [esAdmin]);
    useEffect(() => { if (clienteInicial)   setModalCrear(true); }, [clienteInicial]);
    useEffect(() => { if (presupuestoOrigen) setModalCrear(true); }, [presupuestoOrigen]);

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* Header */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">Servicio Técnico</h2>
                    <p className="text-[11px] font-medium mt-1 text-[#A8A29E]">Gestión de servicios</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setModoSeleccion(v => { if (v) setSeleccionados(new Set()); return !v; })}
                        className={`h-10 px-3 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 border border-black/[0.08] dark:border-white/[0.08] ${modoSeleccion ? 'bg-[#D13A28] text-white' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                        ☑
                    </button>
                    <button onClick={() => exportarServiciosCSV(filtros.itemsFiltrados)}
                        className="h-10 px-4 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 hover:opacity-90 bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]">
                        CSV
                    </button>
                    <button onClick={() => setModalCrear(true)}
                        className="h-10 px-5 rounded-xl font-bold text-xs text-white uppercase transition-all active:scale-95 hover:opacity-90 bg-[#D13A28] dark:bg-[#E8422F]">
                        + Nuevo
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]" style={{ borderLeft: '3px solid #D13A28' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Facturado el mes</p>
                        <M valor={stats.totalMes} className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">{stats.cantidadMes} servicios</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]" style={{ borderLeft: '3px solid #D48800' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">MO del mes</p>
                        <M valor={stats.gananciaTotal} className="text-[20px] font-black leading-none text-[#D48800] dark:text-[#F0A500] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">mano de obra</p>
                    </div>
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Hoy</p>
                        <M valor={stats.totalHoy} className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-1">{stats.cantidadHoy} servicios</p>
                    </div>
                    <button onClick={() => cambiarTab('PRESUPUESTO')}
                        className={`rounded-2xl p-4 text-left border border-black/[0.07] dark:border-white/[0.07] transition-all active:scale-95 ${stats.pendientesCount > 0 ? 'bg-[var(--warning-bg)]' : 'bg-[#EDEAE6] dark:bg-[#242424]'}`}
                        style={stats.pendientesCount > 0 ? { borderLeft: '3px solid #D48800' } : {}}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">Pendientes</p>
                        <p className={`text-[20px] font-black leading-none ${stats.pendientesCount > 0 ? 'text-[var(--warning-tx)]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>{stats.pendientesCount}</p>
                        <p className="text-[9px] text-[#A8A29E] mt-1">presupuestos</p>
                    </button>
                </div>

                {/* Alerta pendientes */}
                {tabActual === 'PRESUPUESTO' && stats.pendientesCount > 0 && (
                    <div onClick={() => cambiarTab('PRESUPUESTO')}
                        className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99] bg-[var(--warning-bg)] border border-[rgba(212,136,0,0.25)]">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="text-sm font-black text-[var(--warning-tx)]">{stats.pendientesCount} presupuesto{stats.pendientesCount > 1 ? 's' : ''} sin confirmar</p>
                            <p className="text-xs text-[var(--warning)] font-bold"><M valor={stats.pendientesVal} /> por cobrar</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => cambiarTab(t.id)}
                            className={`flex-1 h-10 rounded-xl font-bold text-[12px] uppercase transition-all active:scale-95 ${tabActual === t.id ? 'text-white bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            {t.label}
                            {t.id === tabActual && filtros.totalItems > 0 && (
                                <span className="ml-1.5 text-[10px] opacity-80">({filtros.totalItems})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Barra acción masiva */}
                {modoSeleccion && seleccionados.size > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <span className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] flex-1">{seleccionados.size} seleccionado{seleccionados.size > 1 ? 's' : ''}</span>
                        {tabActual === 'PRESUPUESTO' && (
                            <button onClick={() => ejecutarMasiva('REALIZADO')}
                                className="h-9 px-4 rounded-xl font-bold text-xs text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                ✓ Cobrar todos
                            </button>
                        )}
                        <button onClick={() => ejecutarMasiva('ARCHIVADO')}
                            className="h-9 px-4 rounded-xl font-bold text-xs bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            🗄️ Archivar todos
                        </button>
                    </div>
                )}

                {/* Filtros */}
                <FiltrosPanel hook={filtros} conBusqueda conRango placeholderBusqueda="Cliente, S/N, ubicación, sede..." />
                {esAdmin && tecnicos.length > 0 && (
                    <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-[12px] font-bold border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]">
                        <option value="">Todos los técnicos</option>
                        {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.rol})</option>)}
                    </select>
                )}
                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                {/* Lista */}
                {cargando ? (
                    <div className="text-center py-16 font-bold text-[#A8A29E]">Cargando...</div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] text-[#A8A29E] font-bold">
                        No hay servicios en esta categoría.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtros.itemsPagina.map(s => (
                            <ServicioCard key={s.id} servicio={s}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                                onEditar={abrirEditar}
                                onEjecutar={abrirEjecutar}
                                onCobrar={confirmarServicio}
                                onRechazar={rechazarServicio}
                                onArchivar={archivarServicio}
                                onGenerarPDF={generarPDF}
                                onDetalle={setModalDetalle}
                                calcularTotal={calcularTotal}
                            />
                        ))}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* Modal crear/editar */}
            {modalCrear && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#EDEAE6] dark:bg-[#141414]">
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#D8D4CE] dark:bg-[#1C1C1C]" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {servicioEjecutar ? '🔧 Ejecutar Trabajo' : servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {servicioEjecutar ? `Ppto #${servicioEjecutar.id} · modificá y confirmá` : servicioEditar ? `Presupuesto #${servicioEditar.id}` : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModalCompleto} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-90">✕</button>
                        </div>
                        <ServicioForm
                            onSaved={() => { cerrarModalCompleto(); cargarServicios(); if (onClienteConsumido) onClienteConsumido(); if (onPresupuestoOrigenConsumido) onPresupuestoOrigenConsumido(); }}
                            servicioParaEditar={servicioEditar || servicioEjecutar}
                            clienteInicialId={clienteInicial?.id}
                            presupuestoOrigen={presupuestoOrigen}
                            modoEjecucion={!!servicioEjecutar}
                            soloTecnico
                        />
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalDetalle(null)}>
                    <div className="w-full rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#EDEAE6] dark:bg-[#242424]" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{modalDetalle.clienteNombre}</h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}</p>
                        <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                        <M valor={Number(it.costo || 0)} className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]" />
                                    </div>
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <span className="font-bold">Repuestos: </span>{it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)} className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">Cerrar</button>
                    </div>
                </div>
            )}

            {/* Modal firmas */}
            {modalFirmas && <ModalFirmasPDF onConfirm={confirmarFirmasYGenerarPDF} onCancel={() => setModalFirmas(false)} />}
        </div>
    );
}
