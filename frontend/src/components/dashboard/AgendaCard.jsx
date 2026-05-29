import React from 'react';
import { M } from '../servicio/ServicioUI';
import { ESTADO_BORDER, ESTADO_LABEL, calcTotal } from './estadoConstants';

export default function AgendaCard({ s, onClick }) {
    const borderHex = ESTADO_BORDER[s.estado] || '#A8A29E';
    const estadoLabel = ESTADO_LABEL[s.estado] || s.estado;

    return (
        <div onClick={onClick}
            className="rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] px-3.5 py-2.5 cursor-pointer active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px]"
            style={{ borderLeftColor: borderHex }}>
            <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{s.clienteNombre}</p>
                    <p className="text-[10px] text-[#A8A29E] truncate">{s.sedeNombre}</p>
                </div>
                <div className="text-right shrink-0">
                    <M valor={calcTotal(s)} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                    <span className="text-[9px] font-bold" style={{ color: borderHex }}>
                        {estadoLabel}
                    </span>
                </div>
            </div>
            {s.sedeDireccion && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.sedeDireccion)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] truncate block mt-1 active:opacity-70"
                    style={{ color: borderHex }}
                    onClick={e => e.stopPropagation()}>
                    📍 {s.sedeDireccion}
                </a>
            )}
            {s.duracionMinutos && (
                <p className="text-[9px] font-bold text-[#A8A29E] mt-1">⏱ {Math.round(s.duracionMinutos / 60 * 10) / 10}h estimadas</p>
            )}
        </div>
    );
}
