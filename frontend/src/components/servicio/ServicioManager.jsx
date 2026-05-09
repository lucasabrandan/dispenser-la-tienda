import React, { useEffect, useState } from 'react';
import { useServicioManager } from '../../hooks/useServicioManager';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';
import { exportarServiciosCSV } from '../../utils/exportarCSV';
import { getUsuarios } from '../../services/api';
import ServicioForm from '../servicio/ServicioForm';
import ServicioCard from '../servicio/ServicioCard';
import Paginacion from '../ui/Paginacion';
import ModalFirmasPDF from '../ui/ModalFirmasPDF';
import ImportadorServiciosModal from '../servicio/ImportadorServiciosModal';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

function StatChip({ label, valor, sub, color, valorCls = '', onClick }) {
    return (
        <div
            onClick={onClick}
            className={`shrink-0 rounded-2xl p-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] min-w-[112px] ${onClick ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
            style={color ? { borderLeft: `3px solid ${color}` } : {}}
        >
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">{label}</p>
            <p className={`text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] ${valorCls}`}>{valor}</p>
            <p className="text-[9px] text-[#A8A29E] mt-0.5">{sub}</p>
        </div>
    );
}

const TABS = [
    { id: 'PRESUPUESTO', label: 'Presupuestos' },
    { id: 'REALIZADO',   label: 'Realizados'   },
    { id: 'ARCHIVADO',   label: 'Archivados'   },
];

const PERIODOS = [
    { id: 'MES',     label: 'Este mes'  },
    { id: 'MES_ANT', label: 'Mes ant.'  },
    { id: 'ANO',     label: 'Este año'  },
    { id: 'TODO',    label: 'Todo'      },
];

export default function ServicioManager({
    clienteInicial = null, onClienteConsumido,
    presupuestoOrigen = null, onPresupuestoOrigenConsumido,
    ordenOrigen = null, onOrdenOrigenConsumido,
}) {
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
        archivarServicio, accionMasiva, eliminarServicio,
        generarPDF, calcularTotal, abrirEditar, cerrarModal,
        filtros, usuarioId, setUsuarioId,
        ordenServicio, setOrdenServicio,
    } = useServicioManager();

    const [servicioEjecutar, setServicioEjecutar]   = useState(null);
    const [modalImportar, setModalImportar]         = useState(false);
    const [confirmEliminar, setConfirmEliminar]     = useState(null); // { ids: [], modo: 'uno'|'masivo' }
    const [tecnicos, setTecnicos]               = useState([]);
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [mostrarRango, setMostrarRango]       = useState(false);

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

    const abrirEjecutar       = (s) => { setServicioEjecutar(s); setModalCrear(true); };
    const cerrarModalCompleto = ()  => { cerrarModal(); setServicioEjecutar(null); };

    useEffect(() => { if (esAdmin) getUsuarios().then(r => setTecnicos(r.data)).catch(() => {}); }, [esAdmin]);
    useEffect(() => { if (clienteInicial)    setModalCrear(true); }, [clienteInicial]);
    useEffect(() => { if (presupuestoOrigen) setModalCrear(true); }, [presupuestoOrigen]);
    useEffect(() => { if (ordenOrigen)       setModalCrear(true); }, [ordenOrigen]);

    return (
        <div className="min-h-screen pb-28 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* Header sticky con buscador */}
            <div className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-[#C8C4BE] dark:bg-[#141414] border-b border-black/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[22px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                        Servicio Técnico
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setModoSeleccion(v => { if (v) setSeleccionados(new Set()); return !v; })}
                            title="Selección múltiple"
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 border border-black/[0.08] dark:border-white/[0.08] ${modoSeleccion ? 'bg-[#D13A28] text-white' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]'}`}
                        >☑</button>
                        <button
                            onClick={() => exportarServiciosCSV(filtros.itemsFiltrados)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black transition-all active:scale-90 bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]"
                            title="Exportar CSV"
                        >CSV</button>
                        <button
                            onClick={() => setModalImportar(true)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] transition-all active:scale-90 bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]"
                            title="Importar servicios históricos"
                        >📤</button>
                        <button
                            onClick={() => setModalCrear(true)}
                            className="hidden md:flex h-9 px-5 rounded-xl items-center font-bold text-xs text-white uppercase transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]"
                        >+ Nuevo</button>
                    </div>
                </div>

                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                    <input
                        value={filtros.busqueda}
                        onChange={e => filtros.setBusqueda(e.target.value)}
                        placeholder="Cliente, S/N, ubicación, sede..."
                        className="w-full h-10 pl-9 pr-8 rounded-xl text-[13px] outline-none border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E]"
                    />
                    {filtros.busqueda && (
                        <button onClick={() => filtros.setBusqueda('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                    )}
                </div>
            </div>

            <div className="px-4 pt-3 space-y-3">

                {/* Stats — scroll horizontal en mobile, fila en tablet */}
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                    <StatChip
                        label="Fact. mes"
                        valor={<M valor={stats.totalMes} />}
                        sub={`${stats.cantidadMes} servicios`}
                        color="#D13A28"
                    />
                    <StatChip
                        label="MO mes"
                        valor={<M valor={stats.gananciaTotal} />}
                        sub="mano de obra"
                        color="#D48800"
                        valorCls="text-[#D48800] dark:text-[#F0A500]"
                    />
                    <StatChip
                        label="Hoy"
                        valor={<M valor={stats.totalHoy} />}
                        sub={`${stats.cantidadHoy} servicios`}
                    />
                    <StatChip
                        label="Pendientes"
                        valor={stats.pendientesCount}
                        sub={<M valor={stats.pendientesVal} />}
                        color={stats.pendientesCount > 0 ? '#D48800' : undefined}
                        valorCls={stats.pendientesCount > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : ''}
                        onClick={() => cambiarTab('PRESUPUESTO')}
                    />
                </div>

                {/* Alerta pendientes */}
                {tabActual === 'PRESUPUESTO' && stats.pendientesCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--warning-bg)] border border-[rgba(212,136,0,0.25)]">
                        <span className="text-lg shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black text-[var(--warning-tx)]">
                                {stats.pendientesCount} sin confirmar
                            </p>
                            <p className="text-[11px] font-bold text-[#D48800] dark:text-[#F0A500]">
                                <M valor={stats.pendientesVal} /> por cobrar
                            </p>
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
                                <span className="ml-1 text-[10px] opacity-70">({filtros.totalItems})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Período */}
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                    {PERIODOS.map(p => (
                        <button key={p.id}
                            onClick={() => { filtros.aplicarRapido(p.id); setMostrarRango(false); }}
                            className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${filtros.periodoRapido === p.id && !mostrarRango ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'}`}>
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setMostrarRango(v => !v)}
                        className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${mostrarRango ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'}`}>
                        Rango
                    </button>
                </div>

                {mostrarRango && (
                    <div className="flex gap-2">
                        <input type="date" value={filtros.desde}
                            onChange={e => filtros.aplicarRango(e.target.value, filtros.hasta)}
                            className="flex-1 h-9 px-3 rounded-xl text-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                        <input type="date" value={filtros.hasta}
                            onChange={e => filtros.aplicarRango(filtros.desde, e.target.value)}
                            className="flex-1 h-9 px-3 rounded-xl text-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                    </div>
                )}

                {/* Filtro técnico — admin */}
                {esAdmin && tecnicos.length > 0 && (
                    <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-[12px] font-bold border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]">
                        <option value="">Todos los técnicos</option>
                        {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                )}

                {/* Ordenamiento */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider shrink-0">Orden</span>
                    <select
                        value={ordenServicio}
                        onChange={e => { setOrdenServicio(e.target.value); }}
                        className="flex-1 h-9 px-3 rounded-xl text-[12px] font-bold border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none"
                    >
                        <option value="fechaServicio,desc">Más reciente primero</option>
                        <option value="fechaServicio,asc">Más antiguo primero</option>
                        <option value="total,desc">Mayor monto primero</option>
                        <option value="total,asc">Menor monto primero</option>
                    </select>
                </div>

                {/* Barra selección masiva */}
                {modoSeleccion && seleccionados.size > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <span className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {tabActual === 'PRESUPUESTO' && (
                            <button onClick={() => ejecutarMasiva('REALIZADO')}
                                className="h-9 px-4 rounded-xl font-bold text-xs text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                ✓ Cobrar
                            </button>
                        )}
                        <button onClick={() => ejecutarMasiva('ARCHIVADO')}
                            className="h-9 px-4 rounded-xl font-bold text-xs bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            🗄️ Archivar
                        </button>
                        {esAdmin && (
                            <button onClick={() => setConfirmEliminar({ ids: [...seleccionados], modo: 'masivo' })}
                                className="h-9 px-4 rounded-xl font-bold text-xs bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] border border-[#D13A28]/30 active:scale-95">
                                🗑️ Eliminar
                            </button>
                        )}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                {cargando ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 rounded-2xl animate-pulse bg-[#EDEAE6] dark:bg-[#242424]" />
                        ))}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[36px] mb-2">📋</p>
                        <p className="font-bold text-[#A8A29E]">Sin resultados</p>
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
                                onEliminar={esAdmin ? (id) => setConfirmEliminar({ ids: [id], modo: 'uno' }) : null}
                                onGenerarPDF={generarPDF}
                                onDetalle={setModalDetalle}
                                calcularTotal={calcularTotal}
                            />
                        ))}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* FAB Nuevo — solo mobile */}
            <button
                onClick={() => setModalCrear(true)}
                className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-90 transition-all z-20"
                aria-label="Nuevo servicio"
            >+</button>

            {/* Modal crear/editar */}
            {modalCrear && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/55">
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#EDEAE6] dark:bg-[#141414]">
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {servicioEjecutar ? '🔧 Ejecutar Trabajo' : servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {servicioEjecutar
                                        ? `Ppto #${servicioEjecutar.id} · modificá y confirmá`
                                        : servicioEditar
                                            ? `Presupuesto #${servicioEditar.id}`
                                            : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModalCompleto}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-90">✕</button>
                        </div>
                        <ServicioForm
                            onSaved={() => {
                                cerrarModalCompleto();
                                cargarServicios();
                                if (onClienteConsumido) onClienteConsumido();
                                if (onPresupuestoOrigenConsumido) onPresupuestoOrigenConsumido();
                                if (onOrdenOrigenConsumido) onOrdenOrigenConsumido();
                            }}
                            servicioParaEditar={servicioEditar || servicioEjecutar}
                            clienteInicialId={clienteInicial?.id}
                            presupuestoOrigen={presupuestoOrigen}
                            ordenOrigen={ordenOrigen}
                            modoEjecucion={!!servicioEjecutar}
                            soloTecnico
                        />
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setModalDetalle(null)}>
                    <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#EDEAE6] dark:bg-[#242424]"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{modalDetalle.clienteNombre}</h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}</p>
                        <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                        <M valor={Number(it.costo || 0)} className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]" />
                                    </div>
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <span className="font-bold">Repuestos: </span>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
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

            {modalFirmas && (
                <ModalFirmasPDF onConfirm={confirmarFirmasYGenerarPDF} onCancel={() => setModalFirmas(false)} />
            )}

            {modalImportar && (
                <ImportadorServiciosModal
                    onCerrar={() => setModalImportar(false)}
                    onImportado={() => { filtros.cargar?.(); }}
                />
            )}

            {/* Modal confirmación eliminación — solo admin */}
            {confirmEliminar && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-5">
                                <p className="text-[36px] mb-2">⚠️</p>
                                <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">
                                    Eliminar {confirmEliminar.ids.length > 1 ? `${confirmEliminar.ids.length} servicios` : 'servicio'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-[#D13A28]/20 mb-4 space-y-1.5">
                                <p className="text-[11px] font-black text-[#D13A28] uppercase tracking-wide">Esta acción no se puede deshacer</p>
                                <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">
                                    Se eliminarán permanentemente el servicio, todos sus ítems, repuestos usados y registros asociados. No aparecerá más en el historial ni en estadísticas.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminar(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={async () => {
                                    const ids = confirmEliminar.ids;
                                    setConfirmEliminar(null);
                                    setSeleccionados(new Set());
                                    setModoSeleccion(false);
                                    await Promise.all(ids.map(id => eliminarServicio(id)));
                                }}
                                    className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    Sí, eliminar definitivamente
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
