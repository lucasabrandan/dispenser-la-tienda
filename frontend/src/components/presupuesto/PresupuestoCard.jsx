import React, { useState } from 'react';
import { M } from '../servicio/ServicioUI';
import IconBtn from '../ui/IconBtn';
import ActionSheet from '../ui/ActionSheet';
import { LuFileText, LuPencil, LuEllipsisVertical, LuClipboardList, LuArchive, LuZap } from 'react-icons/lu';
import { formatFechaCorta } from '../../utils/dateUtils';

export default function PresupuestoCard({ s, calcularTotal, onPDF, onArchivar, onIniciar, onEditar, modoSeleccion, seleccionado, onToggleSelect }) {
    const [expandido, setExpandido] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const total    = calcularTotal(s);
    const esTecnico = s.servicioTipo === 'TECNICA';
    const items     = s.items || [];
    const seriales  = items.map(it => it.equipoSerial).filter(Boolean);
    const primerItem = items[0];
    const ubicInfo  = primerItem
        ? [primerItem.equipoUbicacion, primerItem.equipoPiso && `P${primerItem.equipoPiso}`, primerItem.equipoSector].filter(Boolean).join(' · ')
        : '';

    return (
        <div className={`rounded-2xl overflow-hidden bg-card transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: '3px solid #D48800' }}>
            <div className="p-3">
                <div className="flex items-start gap-2 mb-1.5">
                    {modoSeleccion && (
                        <button onClick={() => onToggleSelect(s.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#E8E5E0] dark:border-[#3E3E3E]'}`}>
                            {seleccionado && <span className="text-white text-label font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                        <span className={`text-label font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${esTecnico ? 'bg-[#D13A28]/10 text-brand-red' : 'bg-[#D48800]/10 text-brand-amber'}`}>
                            {esTecnico ? '🔧 Servicio' : '🛒 Venta'}
                        </span>
                        <span className="text-caption font-bold text-muted shrink-0">#{s.id}</span>
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-body-lg font-black leading-none text-ink block" />
                        <p className="text-caption text-muted mt-0.5">{formatFechaCorta(s.fecha)}</p>
                    </div>
                </div>

                <p className="font-black text-body leading-tight text-ink mb-0.5">{s.clienteNombre}</p>

                {(s.sedeNombre || s.usuarioNombre) && (
                    <p className="truncate text-caption text-muted">
                        {[s.sedeNombre && `📍 ${s.sedeNombre}`, s.usuarioNombre && `👤 ${s.usuarioNombre}`].filter(Boolean).join(' · ')}
                    </p>
                )}

                {(seriales.length > 0 || ubicInfo) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {seriales.slice(0, 2).map((sr, i) => (
                            <span key={i} className="text-label font-bold px-2 py-0.5 rounded-lg bg-panel text-secondary">{sr}</span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-label font-bold px-2 py-0.5 rounded-lg bg-panel text-muted">+{seriales.length - 2}</span>
                        )}
                        {ubicInfo && (
                            <span className="text-label px-2 py-0.5 rounded-lg bg-panel text-muted">{ubicInfo}</span>
                        )}
                    </div>
                )}

                {items.length > 0 && (
                    <button onClick={() => setExpandido(v => !v)}
                        className="mt-2 w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-label font-bold transition-all active:scale-[0.98] bg-panel text-secondary">
                        <span>Detalle · {items.length} ítem{items.length > 1 ? 's' : ''}</span>
                        <span className="text-label">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {expandido && items.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-panel border border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="min-w-0">
                                <span className="text-body font-black text-brand-red">
                                    {it.equipoSerial !== 'MOSTRADOR' ? it.equipoSerial : 'Mostrador'}
                                </span>
                                {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                    <p className="text-caption text-muted mt-0.5 truncate">
                                        {[it.equipoUbicacion, it.equipoPiso && `Piso ${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <M valor={Number(it.costo || 0)} className="text-body font-black text-ink shrink-0 ml-2" />
                        </div>
                        <p className="text-body text-secondary leading-snug">{it.trabajoRealizado}</p>
                        {it.repuestosUsados?.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-wrap gap-1">
                                {it.repuestosUsados.map((r, ri) => (
                                    <span key={ri} className="text-label px-1.5 py-0.5 rounded bg-chip text-secondary">
                                        {r.cantidad}× {r.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border-t border-black/[0.06] dark:border-white/[0.06]">
                <IconBtn onClick={() => onPDF(s)} title="PDF" cls="bg-chip text-secondary"><LuFileText size={15} /></IconBtn>
                {onEditar && (
                    <IconBtn onClick={() => onEditar(s)} title="Editar" cls="bg-chip text-secondary"><LuPencil size={15} /></IconBtn>
                )}

                <div className="relative">
                    <IconBtn onClick={() => setMenuAbierto(v => !v)} title="Más opciones" cls="bg-chip text-secondary"><LuEllipsisVertical size={15} /></IconBtn>
                    <ActionSheet open={menuAbierto} onClose={() => setMenuAbierto(false)}>
                                <button onClick={() => { onPDF(s, { sinPrecios: true }); setMenuAbierto(false); }}
                                    className="w-full px-5 py-3.5 text-left text-label font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                    <LuClipboardList size={15} /> PDF sin precios
                                </button>
                                <button onClick={() => { onArchivar(s.id); setMenuAbierto(false); }}
                                    className="w-full px-5 py-3.5 text-left text-label font-bold text-ink active:bg-[#E8E5E0] rounded-xl flex items-center gap-2.5">
                                    <LuArchive size={15} /> Archivar
                                </button>
                    </ActionSheet>
                </div>

                <div className="flex-1" />

                <button onClick={() => onIniciar(s)}
                    className="h-9 px-4 rounded-xl font-bold text-label text-white shrink-0 active:scale-95 transition-all bg-brand-red flex items-center gap-1.5">
                    <LuZap size={14} /> Iniciar
                </button>
            </div>
        </div>
    );
}
