import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { formatDateISO } from '../../utils/dateUtils';

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

// Generar dias de la semana (lunes a sabado)
function generarSemana(offset = 0) {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0=dom
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes + (offset * 7));
    const dias = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        dias.push({
            fecha: formatDateISO(d),
            dia: d,
            esHoy: formatDateISO(d) === formatDateISO(new Date()),
        });
    }
    return dias;
}

function DiaBtn({ d, seleccionado, count, onClick }) {
    return (
        <button onClick={onClick}
            className={`rounded-lg p-2 text-center transition-all active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${
                d.esHoy ? 'ring-2 ring-[#D13A28] dark:ring-[#E8422F]' : ''
            } ${seleccionado ? 'bg-[#1C1917] dark:bg-[#F0EEE9]' : 'bg-white dark:bg-[#242424]'}`}>
            <p className={`text-[10px] font-bold uppercase ${seleccionado ? 'text-white dark:text-[#1C1917]' : 'text-[#A8A29E]'}`}>
                {d.dia.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
            </p>
            <p className={`text-[14px] font-black ${seleccionado ? 'text-white dark:text-[#1C1917]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                {d.dia.getDate()}
            </p>
            {count > 0 && (
                <div className={`mx-auto mt-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                    seleccionado ? 'bg-[#D13A28] text-white' : 'bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9]'
                }`}>{count}</div>
            )}
        </button>
    );
}

// Card de orden asignada (del admin)
function OrdenAgendaCard({ orden }) {
    const borderColor = {
        PENDIENTE: '#A8A29E', EN_CAMINO: '#3B82F6', EN_SITIO: '#D48800',
        COMPLETADA: '#16A34A', NO_ATENDIDO: '#DC2626',
    }[orden.estado] || '#A8A29E';

    return (
        <div className="rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] px-3.5 py-2.5 border-l-[3px]"
            style={{ borderLeftColor: borderColor }}>
            <div className="flex items-center gap-2">
                <span className="text-[14px]">📌</span>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{orden.titulo}</p>
                    {orden.horaEstimada && (
                        <p className="text-[10px] text-[#A8A29E]">{orden.horaEstimada}</p>
                    )}
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: borderColor, backgroundColor: borderColor + '15' }}>
                    {orden.estado?.replace('_', ' ')}
                </span>
            </div>
            {orden.direccion && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] text-[#3B82F6] dark:text-[#60A5FA] mt-1 block truncate hover:underline">
                    📍 {orden.direccion}
                </a>
            )}
        </div>
    );
}

// Card de nota personal
function NotaCard({ nota, onToggle, onEliminar }) {
    const [confirmElim, setConfirmElim] = useState(false);

    return (
        <div className={`rounded-xl shadow-sm border border-black/[0.05] dark:border-white/[0.05] px-3.5 py-2.5 border-l-[3px] transition-opacity ${
            nota.completada ? 'opacity-50 bg-[#EFEDEA] dark:bg-[#1C1C1C]' : 'bg-white dark:bg-[#242424]'
        }`} style={{ borderLeftColor: nota.completada ? '#16A34A' : '#D48800' }}>
            <div className="flex items-center gap-2">
                <button onClick={() => onToggle(nota.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 active:scale-90 transition-all ${
                        nota.completada
                            ? 'bg-[#16A34A] border-[#16A34A] text-white'
                            : 'border-[#A8A29E] text-transparent'
                    }`}>
                    {nota.completada && <span className="text-[10px]">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold truncate ${nota.completada ? 'line-through text-[#A8A29E]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                        {nota.titulo}
                    </p>
                    {nota.horaEstimada && (
                        <p className="text-[10px] text-[#A8A29E]">{nota.horaEstimada}</p>
                    )}
                </div>
                {!confirmElim ? (
                    <button onClick={() => setConfirmElim(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] text-[#A8A29E] active:scale-90">
                        ×
                    </button>
                ) : (
                    <button onClick={() => { setConfirmElim(false); onEliminar(nota.id); }}
                        className="h-6 px-2 rounded-lg text-[9px] font-black uppercase bg-[#DC2626] text-white active:scale-90">
                        Borrar
                    </button>
                )}
            </div>
            {nota.descripcion && (
                <p className="text-[10px] text-[#A8A29E] mt-1 line-clamp-2">{nota.descripcion}</p>
            )}
            {nota.direccion && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(nota.direccion)}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] text-[#3B82F6] dark:text-[#60A5FA] mt-1 block truncate hover:underline">
                    📍 {nota.direccion}
                </a>
            )}
        </div>
    );
}

// Sheet para crear nota
function CrearNotaSheet({ fecha, tecnicoId, onCreada, onCerrar }) {
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [direccion, setDireccion] = useState('');
    const [hora, setHora] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleGuardar = async () => {
        if (!titulo.trim()) { toast.error('Agrega un titulo'); return; }
        setGuardando(true);
        try {
            await api.post('/notas-agenda', {
                tecnicoId,
                fecha,
                horaEstimada: hora || null,
                titulo: titulo.trim(),
                descripcion: descripcion.trim() || null,
                direccion: direccion.trim() || null,
                completada: false,
            });
            toast.success('Nota agregada');
            onCreada();
        } catch {
            toast.error('Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    const fechaLabel = (() => {
        const d = new Date(fecha + 'T00:00:00');
        return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    })();

    return (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCerrar}>
            <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl shadow-2xl p-5 space-y-4"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                <div>
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Nueva nota</p>
                    <p className="text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] capitalize">{fechaLabel}</p>
                </div>

                <div>
                    <label className={labelCls}>Titulo *</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                        placeholder="Ej: Reparacion dispenser en oficina, Cambio filtros..."
                        className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Hora estimada</label>
                        <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                            className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Direccion</label>
                        <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                            placeholder="Opcional" className={inputCls} />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Descripcion (opcional)</label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                        rows={2} placeholder="Detalles, que llevar, datos del contacto..."
                        className={`${inputCls} resize-none`} />
                </div>

                <div className="flex gap-2">
                    <button onClick={onCerrar}
                        className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={guardando || !titulo.trim()}
                        className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all disabled:opacity-40">
                        {guardando ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MiAgenda({ tecnicoId }) {
    const [semanaOffset, setSemanaOffset] = useState(0);
    const [diaSel, setDiaSel] = useState(formatDateISO(new Date()));
    const [ordenes, setOrdenes] = useState([]);
    const [notas, setNotas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [creandoNota, setCreandoNota] = useState(false);

    const semana = useMemo(() => generarSemana(semanaOffset), [semanaOffset]);
    const desde = semana[0].fecha;
    const hasta = semana[semana.length - 1].fecha;

    const cargar = useCallback(async () => {
        if (!tecnicoId) return;
        setCargando(true);
        try {
            const [resOrdenes, resNotas] = await Promise.all([
                api.get(`/ordenes/historial/${tecnicoId}`),
                api.get(`/notas-agenda/${tecnicoId}`, { params: { desde, hasta } }),
            ]);
            // Filtrar ordenes de esta semana
            const todas = resOrdenes.data || [];
            const enSemana = todas.filter(o => o.fechaProgramada >= desde && o.fechaProgramada <= hasta);
            setOrdenes(enSemana);
            setNotas(resNotas.data || []);
        } catch {
            toast.error('Error al cargar agenda');
        } finally {
            setCargando(false);
        }
    }, [tecnicoId, desde, hasta]);

    useEffect(() => { cargar(); }, [cargar]);

    const toggleNota = async (id) => {
        try {
            await api.patch(`/notas-agenda/${id}/toggle`);
            cargar();
        } catch { toast.error('Error al actualizar'); }
    };

    const eliminarNota = async (id) => {
        try {
            await api.delete(`/notas-agenda/${id}`);
            toast.success('Nota eliminada');
            cargar();
        } catch { toast.error('Error al eliminar'); }
    };

    // Items del dia seleccionado
    const ordenesDia = ordenes.filter(o => o.fechaProgramada === diaSel);
    const notasDia = notas.filter(n => n.fecha === diaSel);

    // Conteos por dia para los botones
    const conteosPorDia = useMemo(() => {
        const c = {};
        semana.forEach(d => {
            const oCount = ordenes.filter(o => o.fechaProgramada === d.fecha).length;
            const nCount = notas.filter(n => n.fecha === d.fecha).length;
            c[d.fecha] = oCount + nCount;
        });
        return c;
    }, [semana, ordenes, notas]);

    const fechaLabel = (() => {
        const d = new Date(diaSel + 'T00:00:00');
        return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    })();

    const mesLabel = (() => {
        const mid = semana[2]?.dia || new Date();
        return mid.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    })();

    return (
        <>
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]">
            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Mi Agenda</h1>
                        <p className="text-[11px] text-[#A8A29E] capitalize">{mesLabel}</p>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => setSemanaOffset(v => v - 1)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-white dark:bg-[#242424] text-[#57534E] dark:text-[#9E9A94] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-90">
                            ←
                        </button>
                        {semanaOffset !== 0 && (
                            <button onClick={() => setSemanaOffset(0)}
                                className="h-9 px-3 rounded-xl font-bold text-[11px] bg-white dark:bg-[#242424] text-[#D13A28] dark:text-[#E8422F] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-90">
                                Hoy
                            </button>
                        )}
                        <button onClick={() => setSemanaOffset(v => v + 1)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-white dark:bg-[#242424] text-[#57534E] dark:text-[#9E9A94] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-90">
                            →
                        </button>
                    </div>
                </div>

                {/* Dias de la semana */}
                <div className="grid grid-cols-6 gap-1.5 mb-4">
                    {semana.map(d => (
                        <DiaBtn key={d.fecha} d={d}
                            seleccionado={d.fecha === diaSel}
                            count={conteosPorDia[d.fecha] || 0}
                            onClick={() => setDiaSel(d.fecha)} />
                    ))}
                </div>

                {/* Detalle del dia */}
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] capitalize">{fechaLabel}</p>
                    <button onClick={() => setCreandoNota(true)}
                        className="h-8 px-3 rounded-lg font-bold text-[11px] text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
                        + Nota
                    </button>
                </div>

                {cargando ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-white dark:bg-[#242424]" />)}
                    </div>
                ) : ordenesDia.length === 0 && notasDia.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-white dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-2xl mb-2">📭</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">Dia libre</p>
                        <button onClick={() => setCreandoNota(true)}
                            className="mt-3 text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] px-4 py-2 rounded-xl border border-[#D13A28]/30 dark:border-[#E8422F]/30 active:scale-95 transition-all">
                            Agregar nota
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Ordenes del admin primero */}
                        {ordenesDia.length > 0 && (
                            <>
                                <p className="text-[9px] font-black text-[#D13A28] dark:text-[#E8422F] uppercase tracking-wider px-1">Ordenes asignadas</p>
                                {ordenesDia.map(o => <OrdenAgendaCard key={`o-${o.id}`} orden={o} />)}
                            </>
                        )}

                        {/* Notas personales */}
                        {notasDia.length > 0 && (
                            <>
                                <p className="text-[9px] font-black text-[#D48800] dark:text-[#F0A500] uppercase tracking-wider px-1 mt-3">Mis notas</p>
                                {notasDia.map(n => (
                                    <NotaCard key={`n-${n.id}`} nota={n} onToggle={toggleNota} onEliminar={eliminarNota} />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>

        {creandoNota && (
            <CrearNotaSheet
                fecha={diaSel}
                tecnicoId={tecnicoId}
                onCreada={() => { setCreandoNota(false); cargar(); }}
                onCerrar={() => setCreandoNota(false)}
            />
        )}
        </>
    );
}
