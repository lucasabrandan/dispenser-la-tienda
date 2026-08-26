import React from 'react';
import { M } from '../servicio/ServicioUI';
import { LuMapPin, LuClock } from 'react-icons/lu';
import { ESTADO_BORDER, ESTADO_LABEL, calcTotal } from './estadoConstants';

export default function AgendaCard({ s, onClick }) {
    const borderHex = ESTADO_BORDER[s.estado] || '#A8A29E';
    const estadoLabel = ESTADO_LABEL[s.estado] || s.estado;

    return (
        <div onClick={onClick}
            className="rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] px-3.5 py-2.5 cursor-pointer active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px]"
            style={{ borderLeftColor: borderHex }}>
            <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-body font-bold text-ink truncate">{s.clienteNombre}</p>
                    <p className="text-caption text-muted truncate">{s.sedeNombre}</p>
                </div>
                <div className="text-right shrink-0">
                    <M valor={calcTotal(s)} className="text-body-lg font-black text-ink block" />
                    <span className="text-label font-bold" style={{ color: borderHex }}>
                        {estadoLabel}
                    </span>
                </div>
            </div>
            {s.sedeDireccion && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.sedeDireccion)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-caption truncate block mt-1 active:opacity-70"
                    style={{ color: borderHex }}
                    onClick={e => e.stopPropagation()}>
                    <LuMapPin size={11} className="inline -mt-0.5 mr-0.5" />{s.sedeDireccion}
                </a>
            )}
            {s.duracionMinutos && (
                <p className="text-caption font-bold text-muted mt-1 flex items-center gap-1"><LuClock size={11} />{Math.round(s.duracionMinutos / 60 * 10) / 10}h estimadas</p>
            )}
        </div>
    );
}
