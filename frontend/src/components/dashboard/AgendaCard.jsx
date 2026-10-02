import React from 'react';
import { M } from '../servicio/ServicioUI';
import { LuShoppingCart } from 'react-icons/lu';
import { calcTotal } from './estadoConstants';
import { estadoLabel, estadoColor } from '../../utils/estados';
import { resumenVentanas } from '../../utils/ordenes';

// Fila de la Agenda (rediseño 29-sep-2026): ya no es una tarjeta dentro de la
// tarjeta del técnico — es una fila separada por una línea, con el estado como
// punto + texto chico en uno de los 4 colores de estado.
export default function AgendaCard({ s, onClick, primera = false }) {
    const color = estadoColor(s.estado);
    const esVenta = s.servicioTipo === 'VENTA';
    // "Principal" se repetía en todas las filas sin aportar nada: la sede solo
    // se muestra cuando no es la principal.
    const sede = s.sedeNombre && s.sedeNombre.trim().toLowerCase() !== 'principal' ? s.sedeNombre : null;
    const hora = s.horaServicio ? String(s.horaServicio).slice(0, 5) : null;
    const horas = s.duracionMinutos ? `${Math.round(s.duracionMinutos / 60 * 10) / 10}h` : null;
    // Fecha tentativa: en vez de una hora, qué días/franjas pidió el cliente
    const aCoordinar = s.fechaTentativa ? `A coordinar: ${resumenVentanas(s.ventanasDisponibles).join(' / ')}` : null;
    const detalle = [aCoordinar || hora, sede, s.sedeDireccion, horas].filter(Boolean).join(' · ');

    return (
        <button type="button" onClick={onClick}
            className={`w-full text-left flex gap-3 px-1 py-3 active:opacity-70 ${primera ? '' : 'border-t border-line'}`}>
            <span className="w-2 h-2 rounded-full mt-[7px] shrink-0" style={{ background: color }} />
            <span className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body-lg font-bold text-ink truncate flex items-center gap-1.5">
                        {esVenta && <LuShoppingCart size={12} className="text-muted shrink-0" aria-label="Venta" />}
                        {s.clienteNombre}
                    </span>
                    <M valor={calcTotal(s)} className="text-body-lg font-bold text-ink shrink-0" />
                </span>
                <span className="flex items-center justify-between gap-2">
                    <span className="text-caption text-muted truncate">{detalle}</span>
                    <span className="text-label font-bold shrink-0" style={{ color }}>{estadoLabel(s.estado)}</span>
                </span>
            </span>
        </button>
    );
}
