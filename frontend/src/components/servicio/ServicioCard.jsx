import React, { useState } from 'react';
import { LuShieldCheck, LuHourglass, LuEye, LuFileText, LuEllipsis, LuClipboardList, LuPencil, LuCopy, LuArchive, LuTrash2, LuMapPin, LuUser } from 'react-icons/lu';
import { useMontos } from '../../context/MontosContext';
import IconBtn from '../ui/IconBtn';
import ActionSheet from '../ui/ActionSheet';
import { useAuth } from '../../context/AuthContext';
import { estadoGarantia } from '../../utils/dateUtils';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

const BADGE = {
    PRESUPUESTO:           { label: 'Pendiente',       cls: 'bg-[var(--warning-bg)] text-[var(--warning-tx)]' },
    EN_PROGRESO:           { label: 'En curso',        cls: 'bg-[var(--cyan-bg)] text-[var(--cyan-tx)]' },
    COMPLETADO:            { label: 'Realizado',       cls: 'bg-[var(--blue-bg)] text-[var(--blue-tx)]' },
    PENDIENTE_FACTURACION: { label: 'Por cobrar',      cls: 'bg-[var(--info-bg)] text-[var(--info-tx)]' },
    FACTURADO:             { label: 'Facturado',       cls: 'bg-[var(--indigo-bg)] text-[var(--indigo-tx)]' },
    COBRADO:               { label: 'Cobrado',         cls: 'bg-[var(--success-bg)] text-[var(--success-tx)]' },
    REALIZADO:             { label: 'Anterior',        cls: 'bg-[var(--success-bg)] text-[var(--success-tx)]' },
    ARCHIVADO:             { label: 'Archivado',       cls: 'bg-[var(--color-chip-bg)] text-[var(--color-text-secondary)]' },
};

const MODALIDAD_LABELS = {
    EFECTIVO_SIN_FACTURA: 'Efectivo',
    CON_FACTURA:          'Con factura',
    PENDIENTE:            'Pendiente',
};

const BORDER = {
    PRESUPUESTO:           '#D48800',
    EN_PROGRESO:           '#0891B2',
    COMPLETADO:            '#3B82F6',
    PENDIENTE_FACTURACION: '#8B5CF6',
    FACTURADO:             '#6366F1',
    COBRADO:               '#16A34A',
    REALIZADO:             '#16A34A',
    ARCHIVADO:             '#A8A29E',
};

// Calcula ganancia desde los datos del servicio guardado
function calcGanancia(servicio) {
    const items = servicio.items || [];
    let totalVenta = 0, totalCosto = 0, totalMO = 0;
    items.forEach(it => {
        const mo = Number(it.costoExtra) || 0;
        totalMO += mo;
        totalVenta += Number(it.costo) || 0;
        (it.repuestosUsados || []).forEach(r => {
            const qty = Number(r.cantidad) || 1;
            const costoUnit = Number(r.costo) || 0;
            totalCosto += costoUnit * qty;
        });
    });
    const desc = Number(servicio.descuentoPorcentaje) || 0;
    const ventaConDesc = desc > 0 ? totalVenta * (1 - desc / 100) : totalVenta;
    const ganancia = ventaConDesc - totalCosto;
    const margen = ventaConDesc > 0 ? ((ganancia / ventaConDesc) * 100).toFixed(1) : 0;
    return { totalVenta: ventaConDesc, totalCosto, totalMO, ganancia, margen };
}

export default function ServicioCard({
    servicio, modoSeleccion, seleccionado,
    onToggleSelect, onEditar, onEjecutar, onCobrar, onDuplicar,
    onArchivar, onEliminar, onGenerarPDF, onDetalle, calcularTotal,
    onAbrirCobro,
}) {
    const [expandido, setExpandido] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [verRentab, setVerRentab] = useState(false);
    const { esAdmin } = useAuth();

    const badge    = BADGE[servicio.estado] || { label: servicio.estado, cls: '' };
    const total    = calcularTotal(servicio);
    const esPpto   = servicio.estado === 'PRESUPUESTO';
    const esComp   = servicio.estado === 'COMPLETADO';
    const esPendFact = servicio.estado === 'PENDIENTE_FACTURACION';
    const esFact   = servicio.estado === 'FACTURADO';
    const esArch   = servicio.estado === 'ARCHIVADO';

    // Antigüedad en días para presupuestos pendientes
    const diasPendiente = esPpto && servicio.fecha
        ? Math.floor((Date.now() - new Date(servicio.fecha + 'T00:00:00').getTime()) / 86400000)
        : 0;
    const antiguedadCritica = diasPendiente > 7;

    // Chips de info rápida del primer ítem
    const items       = servicio.items || [];
    const primerItem  = items[0];
    const seriales    = items.map(it => it.equipoSerial).filter(Boolean);
    const ubicInfo    = primerItem
        ? [
            primerItem.equipoUbicacion,
            primerItem.equipoPiso  && `P${primerItem.equipoPiso}`,
            primerItem.equipoSector,
          ].filter(Boolean).join(' · ')
        : '';

    return (
        <div
            className={`rounded-2xl overflow-hidden bg-card border border-black/[0.07] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ borderLeft: `3px solid ${BORDER[servicio.estado] || '#A8A29E'}` }}
        >
            <div className="p-3">
                {/* Fila 1: checkbox + badge + id + monto + fecha */}
                <div className="flex items-start gap-2 mb-1.5">
                    {modoSeleccion && (
                        <button
                            onClick={() => onToggleSelect(servicio.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#E8E5E0] dark:border-[#3E3E3E]'}`}
                        >
                            {seleccionado && <span className="text-white text-label font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`text-label font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${badge.cls}`}>
                            {badge.label}
                        </span>
                        {esPpto && diasPendiente > 0 && (
                            <span className={`text-label font-bold px-1.5 py-0.5 rounded-md shrink-0 ${antiguedadCritica ? 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]' : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]'}`}>
                                {diasPendiente}d
                            </span>
                        )}
                        <span className="text-caption font-bold text-muted shrink-0">#{servicio.id}</span>
                        {servicio.nroDocumento && (
                            <span className="text-label text-muted truncate">{servicio.nroDocumento}</span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-body-lg font-black leading-none text-ink block" />
                        <p className="text-caption text-muted mt-0.5">{servicio.fecha}</p>
                    </div>
                </div>

                {/* Fila 2: cliente */}
                <p className="font-black text-body leading-tight text-ink mb-0.5">
                    {servicio.clienteNombre}
                </p>

                {/* Fila 3: sede + técnico (una sola línea, corta con … si no entra) + modalidad cobro */}
                <div className="flex items-center gap-2">
                    {(servicio.sedeNombre || servicio.usuarioNombre) && (
                        <p className="flex-1 min-w-0 truncate text-caption text-muted">
                            {[
                                servicio.sedeNombre    && (<span key="sede" className="inline-flex items-center gap-0.5"><LuMapPin size={10} />{servicio.sedeNombre}</span>),
                                servicio.usuarioNombre && (<span key="user" className="inline-flex items-center gap-0.5"><LuUser size={10} />{servicio.usuarioNombre}</span>),
                            ].filter(Boolean).reduce((acc, cur, i) => i === 0 ? [cur] : [...acc, ' · ', cur], [])}
                        </p>
                    )}
                    {servicio.modalidadCobro && (
                        <span className={`shrink-0 text-label font-bold px-1.5 py-0.5 rounded-md ${servicio.modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'bg-[var(--success-bg)] text-[var(--success-tx)]' : servicio.modalidadCobro === 'CON_FACTURA' ? 'bg-[var(--info-bg)] text-[var(--info-tx)]' : 'bg-[var(--color-chip-bg)] text-[var(--color-text-secondary)]'}`}>
                            {MODALIDAD_LABELS[servicio.modalidadCobro] || servicio.modalidadCobro}
                        </span>
                    )}
                </div>

                {/* Fila 3b: info de cobro — fechas y monto final */}
                {(servicio.fechaCompletado || servicio.fechaFacturacion || servicio.fechaCobro || servicio.montoFinal) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {servicio.montoFinal && Number(servicio.montoFinal) !== total && (
                            <span className="text-label font-bold px-1.5 py-0.5 rounded-md bg-[var(--success-bg)] text-[var(--success-tx)]">
                                Final: ${Math.round(Number(servicio.montoFinal)).toLocaleString('es-AR')}
                            </span>
                        )}
                        {servicio.fechaCompletado && (
                            <span className="text-label px-1.5 py-0.5 rounded-md bg-[var(--blue-bg)] text-[var(--blue-tx)]">
                                Hecho {servicio.fechaCompletado.slice(0, 10)}
                            </span>
                        )}
                        {servicio.fechaFacturacion && (
                            <span className="text-label px-1.5 py-0.5 rounded-md bg-[var(--info-bg)] text-[var(--info-tx)]">
                                Fact. {servicio.fechaFacturacion.slice(0, 10)}
                            </span>
                        )}
                        {servicio.fechaCobro && (
                            <span className="text-label px-1.5 py-0.5 rounded-md bg-[var(--success-bg)] text-[var(--success-tx)]">
                                Cobrado {servicio.fechaCobro.slice(0, 10)}
                            </span>
                        )}
                        {servicio.datosBancariosEnviados && (
                            <span className="text-label px-1.5 py-0.5 rounded-md bg-[var(--indigo-bg)] text-[var(--indigo-tx)]">
                                Datos enviados
                            </span>
                        )}
                    </div>
                )}

                {/* Fila 4: chips serie + ubicación */}
                {(seriales.length > 0 || ubicInfo) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {seriales.slice(0, 2).map((s) => (
                            <span key={s} className="text-label font-bold px-2 py-0.5 rounded-lg bg-panel text-secondary">
                                {s}
                            </span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-label font-bold px-2 py-0.5 rounded-lg bg-panel text-muted">
                                +{seriales.length - 2}
                            </span>
                        )}
                        {ubicInfo && (
                            <span className="text-label px-2 py-0.5 rounded-lg bg-panel text-muted">
                                {ubicInfo}
                            </span>
                        )}
                    </div>
                )}

                {/* Toggle detalle */}
                {items.length > 0 && (
                    <button
                        onClick={() => setExpandido(v => !v)}
                        className="mt-2 w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-label font-bold transition-all active:scale-[0.98] bg-panel text-secondary"
                    >
                        <span>Detalle trabajo · {items.length} equipo{items.length > 1 ? 's' : ''}</span>
                        <span className="text-label">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {/* Detalle expandido por equipo */}
                {expandido && items.map((it, i) => (
                    <div key={`${it.equipoSerial || 'item'}-${i}`} className="mt-2 p-3 rounded-xl bg-panel border border-black/[0.05]">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="min-w-0">
                                <span className="text-body font-black text-brand-red">{it.equipoSerial}</span>
                                {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                    <p className="text-caption text-muted mt-0.5 truncate">
                                        {[it.equipoUbicacion, it.equipoPiso && `Piso ${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <M valor={Number(it.costo || 0)} className="text-body font-black text-ink shrink-0 ml-2" />
                        </div>
                        <p className="text-body text-secondary leading-snug">{it.trabajoRealizado}</p>
                        {it.garantiaHasta && (() => {
                            const g = estadoGarantia(it.garantiaHasta);
                            return (
                                <p className={`text-caption font-black mt-1 flex items-center gap-1 ${g.vigente ? 'text-brand-green' : 'text-brand-red'}`}>
                                    {g.vigente ? <LuShieldCheck size={12} className="shrink-0" /> : <LuHourglass size={12} className="shrink-0" />}
                                    {g.vigente
                                        ? `Garantía vigente · ${g.dias} día${g.dias === 1 ? '' : 's'} restante${g.dias === 1 ? '' : 's'}`
                                        : `Garantía vencida hace ${Math.abs(g.dias)} día${Math.abs(g.dias) === 1 ? '' : 's'}`}
                                </p>
                            );
                        })()}
                        {it.repuestosUsados?.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {it.repuestosUsados.map((r, ri) => (
                                        <span key={ri} className="text-label px-1.5 py-0.5 rounded bg-chip text-secondary">
                                            {r.cantidad}× {r.nombre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Desglose de ganancia — solo admin */}
                {esAdmin && items.length > 0 && (() => {
                    const g = calcGanancia(servicio);
                    if (g.ganancia <= 0 && g.totalCosto <= 0) return null;
                    return (
                        <>
                            <button onClick={() => setVerRentab(v => !v)}
                                className="mt-2 flex items-center gap-1.5 py-1.5 transition-all active:scale-[0.99]">
                                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${verRentab ? 'bg-[#2A9D5C] dark:bg-[#5DD68F]' : 'bg-muted'}`} />
                                <span className="text-label font-semibold text-muted">
                                    {verRentab ? 'Ocultar rentabilidad' : 'Ver rentabilidad'}
                                </span>
                            </button>
                            {verRentab && (
                                <div className="mt-1 rounded-xl p-3 bg-[#FFF4D6]/60 dark:bg-[#0D2E1C] border border-[#A8855A]/20 dark:border-[#2A9D5C]/20">
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: 'Venta',    val: g.totalVenta },
                                            { label: 'Costo rep.', val: g.totalCosto },
                                            { label: 'Ganancia', val: g.ganancia, green: true },
                                            { label: 'Margen',   pct: g.margen, green: true },
                                        ].map((item, idx) => (
                                            <div key={idx}>
                                                <p className="text-label uppercase tracking-wide font-bold text-[#A8855A] dark:text-[#5C5954] mb-0.5">{item.label}</p>
                                                {item.pct !== undefined
                                                    ? <p className="text-body font-black text-[#5C3D00] dark:text-[#5DD68F]">{item.pct}%</p>
                                                    : <M valor={Math.round(item.val)} className={`text-body font-black ${item.green ? 'text-[#5C3D00] dark:text-[#5DD68F]' : 'text-ink'}`} />
                                                }
                                            </div>
                                        ))}
                                    </div>
                                    {g.totalMO > 0 && (
                                        <p className="text-caption text-muted mt-1.5">MO incluida: ${Math.round(g.totalMO).toLocaleString('es-AR')}</p>
                                    )}
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Barra de acciones — compacta con menu overflow */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border-t border-black/[0.06]">
                {/* Izquierda: solo acciones rapidas */}
                <IconBtn onClick={() => onDetalle(servicio)} title="Ver detalle"
                    cls="bg-chip text-secondary"><LuEye size={15} /></IconBtn>
                <IconBtn onClick={() => onGenerarPDF(servicio)} title="PDF"
                    cls="bg-chip text-secondary"><LuFileText size={15} /></IconBtn>

                {/* Menu overflow para acciones secundarias */}
                <div className="relative">
                    <IconBtn onClick={() => setMenuAbierto(v => !v)} title="Mas acciones"
                        cls={`${menuAbierto ? 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-brand-red' : 'bg-chip text-secondary'}`}>
                        <LuEllipsis size={15} />
                    </IconBtn>
                    <ActionSheet open={menuAbierto} onClose={() => setMenuAbierto(false)}>
                                <button onClick={() => { onGenerarPDF(servicio, { sinPrecios: true }); setMenuAbierto(false); }}
                                    className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                    <LuClipboardList size={16} /> PDF sin precios
                                </button>
                                {esPpto && onEditar && (
                                    <button onClick={() => { onEditar(servicio); setMenuAbierto(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuPencil size={16} /> Editar
                                    </button>
                                )}
                                {onDuplicar && (
                                    <button onClick={() => { onDuplicar(servicio); setMenuAbierto(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuCopy size={16} /> Duplicar
                                    </button>
                                )}
                                {!esArch && (
                                    <button onClick={() => { onArchivar(servicio.id); setMenuAbierto(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                        <LuArchive size={16} /> Archivar
                                    </button>
                                )}
                                {onEliminar && (
                                    <button onClick={() => { onEliminar(servicio.id); setMenuAbierto(false); }}
                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-brand-red active:bg-[#FEE2E2] rounded-xl flex items-center gap-2.5">
                                        <LuTrash2 size={16} /> Eliminar
                                    </button>
                                )}
                    </ActionSheet>
                </div>

                <div className="flex-1" />

                {/* Derecha: accion principal del estado */}
                {esPpto && (
                    <button onClick={() => onEjecutar(servicio)}
                        className="h-8 px-3 rounded-xl font-bold text-body text-white shrink-0 active:scale-95 transition-all bg-brand-red">
                        Ejecutar
                    </button>
                )}
                {esComp && (
                    <button onClick={() => onAbrirCobro ? onAbrirCobro(servicio) : onCobrar(servicio.id, 'COBRADO')}
                        className="h-8 px-3 rounded-xl font-bold text-body text-white shrink-0 active:scale-95 transition-all bg-brand-red">
                        Definir cobro
                    </button>
                )}
                {esPendFact && (
                    <button onClick={() => onCobrar(servicio.id, 'FACTURADO')}
                        className="h-8 px-3 rounded-xl font-bold text-body text-white shrink-0 active:scale-95 transition-all bg-brand-red">
                        Factura enviada
                    </button>
                )}
                {esFact && (
                    <button onClick={() => onCobrar(servicio.id, 'COBRADO')}
                        className="h-8 px-3 rounded-xl font-bold text-body text-white shrink-0 active:scale-95 transition-all bg-brand-red">
                        Cobrado
                    </button>
                )}
            </div>
        </div>
    );
}
