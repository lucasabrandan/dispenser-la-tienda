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
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import EjecutarAdminSheet from '../servicio/EjecutarAdminSheet';
import ServicioAgenda from '../servicio/ServicioAgenda';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

function StatChip({ label, valor, sub, borderColor, valorCls = '', onClick }) {
    return (
        <div
            onClick={onClick}
            className={`shrink-0 rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] min-w-[100px] ${borderColor || ''} ${onClick ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
        >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">{label}</p>
            <p className={`text-lg font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] ${valorCls}`}>{valor}</p>
            {sub && <p className="text-[10px] text-[#A8A29E] mt-0.5">{sub}</p>}
        </div>
    );
}

const TABS = [
    { id: 'PRESUPUESTO',           label: 'Presupuestos' },
    { id: 'PENDIENTE_FACTURACION', label: 'Por cobrar'   },
    { id: 'FACTURADO',             label: 'Facturados'   },
    { id: 'COBRADO',               label: 'Cobrados'     },
    { id: 'HISTORIAL',             label: 'Historial'    },
];

const PERIODOS = [
    { id: 'MES',     label: 'Este mes'  },
    { id: 'MES_ANT', label: 'Mes ant.'  },
    { id: 'ANO',     label: 'Este año'  },
    { id: 'TODO',    label: 'Todo'      },
];

// Sheet para que admin defina modalidad de cobro al avanzar un servicio completado
function CobroSheet({ servicio, calcularTotal, onConfirmar, onCerrar }) {
    const [modalidad, setModalidad] = useState(servicio.modalidadCobro || '');
    const [montoFinal, setMontoFinal] = useState(servicio.montoFinal || calcularTotal(servicio));
    const [procesando, setProcesando] = useState(false);
    const total = calcularTotal(servicio);

    const opciones = [
        { id: 'EFECTIVO_SIN_FACTURA', label: 'Efectivo sin factura', desc: 'Cobrado en mano, sin ARCA', color: '#16A34A', destino: 'COBRADO' },
        { id: 'CON_FACTURA',          label: 'Con factura',          desc: 'Facturar + enviar datos bancarios', color: '#8B5CF6', destino: 'PENDIENTE_FACTURACION' },
    ];

    const handleConfirmar = async () => {
        if (!modalidad) return;
        setProcesando(true);
        const opt = opciones.find(o => o.id === modalidad);
        await onConfirmar(opt?.destino || 'COBRADO', { modalidadCobro: modalidad, montoFinal: Number(montoFinal) || total });
        setProcesando(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[1999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-x-0 bottom-0 z-[2000] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md">
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl md:rounded-3xl p-5 shadow-2xl border-t border-black/[0.07]">
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] md:hidden" />

                    <div className="mb-4">
                        <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Definir cobro</h3>
                        <p className="text-[11px] text-[#A8A29E] mt-0.5">
                            {servicio.clienteNombre} · #{servicio.id}
                        </p>
                    </div>

                    {/* Monto final editable */}
                    <div className="mb-4 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                        <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest block mb-1">Monto final a cobrar</label>
                        <div className="flex items-center gap-2">
                            <span className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">$</span>
                            <input
                                type="number"
                                value={montoFinal}
                                onChange={e => setMontoFinal(e.target.value)}
                                className="flex-1 bg-transparent text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] outline-none"
                            />
                        </div>
                        {Number(montoFinal) !== total && (
                            <p className="text-[10px] text-[#A8A29E] mt-1">
                                Presupuesto original: ${Math.round(total).toLocaleString('es-AR')}
                            </p>
                        )}
                    </div>

                    {/* Modalidad */}
                    <div className="space-y-2 mb-5">
                        {opciones.map(o => (
                            <button key={o.id}
                                onClick={() => setModalidad(o.id)}
                                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all active:scale-[0.98] ${modalidad === o.id ? 'border-[' + o.color + '] bg-[' + o.color + ']/5' : 'border-black/[0.06] dark:border-white/[0.06] bg-[#EFEDEA] dark:bg-[#1C1C1C]'}`}
                                style={modalidad === o.id ? { borderColor: o.color, backgroundColor: o.color + '0D' } : {}}
                            >
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{o.label}</p>
                                <p className="text-[10px] text-[#A8A29E] mt-0.5">{o.desc}</p>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onCerrar}
                            className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={handleConfirmar} disabled={!modalidad || procesando}
                            className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 disabled:opacity-50">
                            {procesando ? 'Procesando...' : modalidad === 'EFECTIVO_SIN_FACTURA' ? 'Marcar cobrado' : 'Enviar a facturar'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

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

    const [servicioEjecutar, setServicioEjecutar]           = useState(null);
    const [servicioEjecutarSimple, setServicioEjecutarSimple] = useState(null); // para técnicos
    const [servicioDuplicar, setServicioDuplicar]   = useState(null);
    const [modalImportar, setModalImportar]         = useState(false);
    const [confirmEliminar, setConfirmEliminar]     = useState(null); // { ids: [], modo: 'uno'|'masivo' }
    const [servicioCobro, setServicioCobro]         = useState(null); // servicio para definir cobro (admin)
    const [tecnicos, setTecnicos]               = useState([]);
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [mostrarRango, setMostrarRango]       = useState(false);
    const [vistaAgenda, setVistaAgenda]         = useState(false);

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

    // Admin: abre sheet simplificado; técnico: abre EjecutarOrdenSheet
    const [servicioEjecutarAdmin, setServicioEjecutarAdmin] = useState(null);
    const abrirEjecutar = (s) => {
        if (esAdmin) setServicioEjecutarAdmin(s);
        else         setServicioEjecutarSimple(s);
    };
    // "Editar detalle completo" desde el sheet admin abre el form completo
    const abrirEditarCompleto = () => {
        const s = servicioEjecutarAdmin;
        setServicioEjecutarAdmin(null);
        setServicioEjecutar(s);
        setModalCrear(true);
    };
    const cerrarModalCompleto = () => { cerrarModal(); setServicioEjecutar(null); setServicioDuplicar(null); };

    // Duplicar: copia todo menos id/estado/nroDocumento, con fecha de hoy
    const duplicarServicio = (s) => {
        const copia = {
            ...s,
            id: undefined,
            estado: 'PRESUPUESTO',
            nroDocumento: undefined,
            fecha: new Date().toISOString().slice(0, 10),
            presupuestoOrigenId: undefined,
            ordenId: undefined,
        };
        setServicioDuplicar(copia);
        setModalCrear(true);
    };

    useEffect(() => { if (esAdmin) getUsuarios().then(r => setTecnicos(r.data)).catch(() => {}); }, [esAdmin]);
    useEffect(() => { if (clienteInicial)    setModalCrear(true); }, [clienteInicial]);
    useEffect(() => { if (presupuestoOrigen) setModalCrear(true); }, [presupuestoOrigen]);
    useEffect(() => { if (ordenOrigen)       setModalCrear(true); }, [ordenOrigen]);

    return (
        <div className="min-h-screen pb-28 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors">

            {/* Header sticky con buscador */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">
                            Servicio Técnico
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setVistaAgenda(v => !v)}
                                title={vistaAgenda ? 'Vista lista' : 'Vista agenda'}
                                className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95 ${vistaAgenda ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}
                            >{vistaAgenda ? '☰' : '📅'} <span className="hidden sm:inline">{vistaAgenda ? 'Lista' : 'Agenda'}</span></button>
                            <button
                                onClick={() => setModoSeleccion(v => { if (v) setSeleccionados(new Set()); return !v; })}
                                title="Selección múltiple"
                                className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95 ${modoSeleccion ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}
                            >☑ <span className="hidden sm:inline">Seleccionar</span></button>
                            <button
                                onClick={() => exportarServiciosCSV(filtros.itemsFiltrados)}
                                title="Exportar CSV"
                                className="h-8 px-2.5 rounded-lg flex items-center text-[11px] font-bold transition-all active:scale-95 bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                            >CSV</button>
                            <button
                                onClick={() => setModalImportar(true)}
                                title="Importar históricos"
                                className="h-8 px-2.5 rounded-lg flex items-center text-[13px] transition-all active:scale-95 bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                            >📤</button>
                            {esAdmin && (
                                <button
                                    onClick={() => setModalCrear(true)}
                                    className="hidden md:flex h-8 px-4 rounded-lg items-center font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]"
                                >+ Nuevo</button>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                        <input
                            value={filtros.busqueda}
                            onChange={e => filtros.setBusqueda(e.target.value)}
                            placeholder="Cliente, S/N, ubicación, sede..."
                            className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                        />
                        {filtros.busqueda && (
                            <button onClick={() => filtros.setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <StatChip
                        label="Fact. mes"
                        valor={<M valor={stats.totalMes} />}
                        sub={`${stats.cantidadMes} servicios`}
                        borderColor="border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]"
                    />
                    <StatChip
                        label="MO mes"
                        valor={<M valor={stats.gananciaTotal} />}
                        sub="mano de obra"
                        borderColor="border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]"
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
                        borderColor={stats.pendientesCount > 0 ? 'border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]' : ''}
                        valorCls={stats.pendientesCount > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : ''}
                        onClick={() => cambiarTab('PRESUPUESTO')}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => cambiarTab(t.id)}
                            className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${tabActual === t.id ? 'text-white bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}>
                            {t.label}
                            {t.id === tabActual && filtros.totalItems > 0 && (
                                <span className="ml-1 text-[10px] opacity-70">({filtros.totalItems})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Toggle filtros avanzados */}
                <button
                    onClick={() => setMostrarRango(v => !v)}
                    className={`w-full h-7 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95 ${mostrarRango ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}>
                    {mostrarRango ? '▲' : '▼'} Filtros avanzados
                </button>

                {mostrarRango && (
                    <>
                        {/* Período */}
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                            {PERIODOS.map(p => (
                                <button key={p.id}
                                    onClick={() => filtros.aplicarRapido(p.id)}
                                    className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${filtros.periodoRapido === p.id ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Rango personalizado */}
                        <div className="flex gap-2 items-center">
                            <input type="date" value={filtros.desde}
                                onChange={e => filtros.aplicarRango(e.target.value, filtros.hasta)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                            <span className="text-[10px] text-[#A8A29E]">a</span>
                            <input type="date" value={filtros.hasta}
                                onChange={e => filtros.aplicarRango(filtros.desde, e.target.value)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                        </div>

                        {/* Filtro técnico — admin */}
                        {esAdmin && tecnicos.length > 0 && (
                            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
                                className="w-full h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                                <option value="">Todos los técnicos</option>
                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        )}

                        {/* Ordenamiento */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#A8A29E] uppercase shrink-0">Orden</span>
                            <select
                                value={ordenServicio}
                                onChange={e => setOrdenServicio(e.target.value)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                            >
                                <option value="fechaServicio,desc">Más reciente primero</option>
                                <option value="fechaServicio,asc">Más antiguo primero</option>
                                <option value="total,desc">Mayor monto primero</option>
                                <option value="total,asc">Menor monto primero</option>
                            </select>
                        </div>
                    </>
                )}

                {/* Barra selección masiva */}
                {modoSeleccion && seleccionados.size > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <span className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {tabActual === 'PRESUPUESTO' && (
                            <button onClick={() => ejecutarMasiva('APROBADO')}
                                className="h-9 px-4 rounded-xl font-bold text-xs text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                ✓ Aprobar
                            </button>
                        )}
                        <button onClick={() => ejecutarMasiva('ARCHIVADO')}
                            className="h-9 px-4 rounded-xl font-bold text-xs bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
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

                {vistaAgenda ? (
                    <ServicioAgenda
                        servicios={filtros.itemsFiltrados}
                        onDetalle={setModalDetalle}
                        onEjecutar={abrirEjecutar}
                        calcularTotal={calcularTotal}
                    />
                ) : cargando ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />
                        ))}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-12 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-2xl mb-1">📋</p>
                        <p className="text-[12px] font-bold text-[#A8A29E]">Sin resultados</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.map(s => (
                            <ServicioCard key={s.id} servicio={s}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                                onEditar={esAdmin ? abrirEditar : null}
                                onEjecutar={abrirEjecutar}
                                onCobrar={confirmarServicio}
                                onDuplicar={esAdmin ? duplicarServicio : null}
                                onRechazar={rechazarServicio}
                                onArchivar={archivarServicio}
                                onEliminar={esAdmin ? (id) => setConfirmEliminar({ ids: [id], modo: 'uno' }) : null}
                                onGenerarPDF={generarPDF}
                                onDetalle={setModalDetalle}
                                calcularTotal={calcularTotal}
                                onAbrirCobro={esAdmin ? setServicioCobro : null}
                            />
                        ))}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* FAB Nuevo — solo mobile, solo admin */}
            {esAdmin && (
                <button
                    onClick={() => setModalCrear(true)}
                    className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-90 transition-all z-20"
                    aria-label="Nuevo servicio"
                >+</button>
            )}

            {/* Modal crear/editar */}
            {modalCrear && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/55">
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#FFFFFF] dark:bg-[#141414]">
                        {/* Drag handle — indica scroll en mobile */}
                        <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-20 bg-[#FFFFFF] dark:bg-[#141414]">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {servicioEjecutar ? '🔧 Ejecutar Trabajo' : servicioDuplicar ? '⧉ Duplicar Presupuesto' : servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {servicioEjecutar
                                        ? `Ppto #${servicioEjecutar.id} · modificá y confirmá`
                                        : servicioDuplicar
                                            ? 'Copia del servicio anterior · ajustá y guardá'
                                            : servicioEditar
                                                ? `Presupuesto #${servicioEditar.id}`
                                                : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModalCompleto}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90">✕</button>
                        </div>
                        <ServicioForm
                            onSaved={() => {
                                cerrarModalCompleto();
                                cargarServicios();
                                if (onClienteConsumido) onClienteConsumido();
                                if (onPresupuestoOrigenConsumido) onPresupuestoOrigenConsumido();
                                if (onOrdenOrigenConsumido) onOrdenOrigenConsumido();
                            }}
                            servicioParaEditar={servicioEditar || servicioEjecutar || servicioDuplicar}
                            clienteInicialId={clienteInicial?.id}
                            presupuestoOrigen={presupuestoOrigen}
                            ordenOrigen={ordenOrigen}
                            modoEjecucion={!!servicioEjecutar}
                        />
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end bg-black/50"
                    onClick={() => setModalDetalle(null)}>
                    <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#FFFFFF] dark:bg-[#242424]"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{modalDetalle.clienteNombre}</h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}</p>
                        <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
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

            {/* Sheet simplificado para técnicos */}
            {servicioEjecutarSimple && (
                <EjecutarOrdenSheet
                    servicio={servicioEjecutarSimple}
                    onConfirmado={() => {
                        setServicioEjecutarSimple(null);
                        cargarServicios();
                    }}
                    onCerrar={() => setServicioEjecutarSimple(null)}
                />
            )}

            {/* Sheet ejecutar simplificado — admin */}
            {servicioEjecutarAdmin && (
                <EjecutarAdminSheet
                    servicio={servicioEjecutarAdmin}
                    calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await confirmarServicio(servicioEjecutarAdmin.id, estadoDestino, extras);
                        setServicioEjecutarAdmin(null);
                    }}
                    onEditarCompleto={abrirEditarCompleto}
                    onCerrar={() => setServicioEjecutarAdmin(null)}
                />
            )}

            {modalImportar && (
                <ImportadorServiciosModal
                    onCerrar={() => setModalImportar(false)}
                    onImportado={() => { filtros.cargar?.(); }}
                />
            )}

            {/* Sheet definir cobro — admin */}
            {servicioCobro && (
                <CobroSheet
                    servicio={servicioCobro}
                    calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await confirmarServicio(servicioCobro.id, estadoDestino, extras);
                        setServicioCobro(null);
                    }}
                    onCerrar={() => setServicioCobro(null)}
                />
            )}

            {/* Modal confirmación eliminación — solo admin */}
            {confirmEliminar && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
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
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
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
