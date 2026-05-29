import React from 'react';
import { Label, M } from './ServicioUI';

export default function TicketItemsList({ ticketItems, editarItem, eliminarItem }) {
    if (ticketItems.length === 0) return null;

    return (
        <div>
            <Label>{ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''} en el ticket</Label>
            <div className="flex flex-col gap-2">
                {ticketItems.map((it, idx) => (
                    <div key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 bg-[#D13A28] dark:bg-[#E8422F]">
                                {idx + 1}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] font-bold truncate text-[#1C1917] dark:text-[#F0EEE9]">
                                    {it.equipoSerial || 'Sin S/N'}
                                </p>
                                <p className="text-[10px] truncate text-[#A8A29E]">
                                    {it.resumenTexto}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <M valor={it.totalCalculado} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                            <button onClick={() => editarItem(idx)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D48800]/20 text-[#D48800] dark:text-[#F0A500] active:scale-90 transition-all"
                                title="Editar equipo">✏️</button>
                            <button onClick={() => eliminarItem(idx)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F] active:scale-90 transition-all"
                                title="Eliminar equipo">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
