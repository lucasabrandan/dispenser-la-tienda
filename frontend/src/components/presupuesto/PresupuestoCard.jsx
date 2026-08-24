import React, { useState } from 'react';
import { M } from '../servicio/ServicioUI';

function IconBtn({ onClick, title, children, cls = '' }) {
    return (
        <button onClick={onClick} title={title}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 shrink-0 ${cls}`}>
            {children}
        </button>
    );
}

export default function PresupuestoCard({ s, calcularTotal, onPDF, onArchivar, onEjecutar, onDespachar, onEditar, ejecutado, modoSeleccion, seleccionado, onToggleSelect }) {
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
        <div className={`rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${ejecutado ? '#16A34A' : '#D48800'}` }}>
            <div className="p-3">
                <div className="flex items-start gap-2 mb-1.5">
                    {modoSeleccion && (
                        <button onClick={() => onToggleSelect(s.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#E8E5E0] dark:border-[#3E3E3E]'}`}>
                            {seleccionado && <span className="text-white text-[9px] font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${esTecnico ? 'bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F]' : 'bg-[#D48800]/10 text-[#D48800] dark:text-[#F0A500]'}`}>
                            {esTecnico ? '🔧 Servicio' : '🛒 Venta'}
                        </span>
                        {ejecutado && (
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 bg-[#DCFCE7] text-[#16A34A] dark:bg-[#052E16] dark:text-[#4ADE80]">
                                ✓ Ejecutado
                            </span>
                        )}
                        <span className="text-[11px] font-bold text-[#A8A29E] shrink-0">#{s.id}</span>
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-[17px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{s.fecha}</p>
                    </div>
                </div>

                <p className="font-black text-[16px] leading-tight text-[#1C1917] dark:text-[#F0EEE9] mb-0.5">{s.clienteNombre}</p>

                {(s.sedeNombre || s.usuarioNombre) && (
                    <p className="truncate text-[12px] text-[#A8A29E]">
                        {[s.sedeNombre && `📍 ${s.sedeNombre}`, s.usuarioNombre && `👤 ${s.usuarioNombre}`].filter(Boolean).join(' · ')}
                    </p>
                )}

                {(seriales.length > 0 || ubicInfo) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {seriales.slice(0, 2).map((sr, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">{sr}</span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#A8A29E]">+{seriales.length - 2}</span>
                        )}
                        {ubicInfo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#A8A29E]">{ubicInfo}</span>
                        )}
                    </div>
                )}

                {items.length > 0 && (
                    <button onClick={() => setExpandido(v => !v)}
                        className="mt-2 w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-[0.98] bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">
                        <span>Detalle · {items.length} ítem{items.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {expandido && items.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="min-w-0">
                                <span className="text-[13px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                    {it.equipoSerial !== 'MOSTRADOR' ? it.equipoSerial : 'Mostrador'}
                                </span>
                                {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                    <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate">
                                        {[it.equipoUbicacion, it.equipoPiso && `Piso ${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <M valor={Number(it.costo || 0)} className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0 ml-2" />
                        </div>
                        <p className="text-[13px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{it.trabajoRealizado}</p>
                        {it.repuestosUsados?.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-wrap gap-1">
                                {it.repuestosUsados.map((r, ri) => (
                                    <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                        {r.cantidad}× {r.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.06] dark:border-white/[0.06]">
                <IconBtn onClick={() => onPDF(s)} title="PDF" cls="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">📄</IconBtn>
                {onEditar && (
                    <IconBtn onClick={() => onEditar(s)} title="Editar" cls="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">✏️</IconBtn>
                )}

                <div className="relative">
                    <IconBtn onClick={() => setMenuAbierto(v => !v)} title="Más opciones" cls="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">⋮</IconBtn>
                    {menuAbierto && (
                        <>
                            <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setMenuAbierto(false)} />
                            <div className="fixed inset-x-0 bottom-0 z-[101] rounded-t-2xl p-2 pb-6 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08]">
                                <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                                <button onClick={() => { onPDF(s, { sinPrecios: true }); setMenuAbierto(false); }}
                                    className="w-full px-5 py-3.5 text-left text-[14px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl">
                                    📋 PDF sin precios
                                </button>
                                {esTecnico && (
                                    <button onClick={() => { onDespachar(s); setMenuAbierto(false); }}
                                        className="w-full px-5 py-3.5 text-left text-[14px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl">
                                        📬 Despachar
                                    </button>
                                )}
                                <button onClick={() => { onArchivar(s.id); setMenuAbierto(false); }}
                                    className="w-full px-5 py-3.5 text-left text-[14px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl">
                                    🗄️ Archivar
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1" />

                <button onClick={() => onEjecutar(s)}
                    className="h-9 px-4 rounded-xl font-bold text-[13px] text-white shrink-0 active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                    {ejecutado ? '✓ Ejecutado' : '⚡ Ejecutar y cobrar'}
                </button>
            </div>
        </div>
    );
}
