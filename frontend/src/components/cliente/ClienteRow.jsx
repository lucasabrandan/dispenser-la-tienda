import React from 'react';
import { LuMessageCircle, LuBuilding2, LuUser } from 'react-icons/lu';
import { abrirWhatsApp, resumenCliente, formatFecha } from '../../utils/clienteUtils';

// Fila densa de escritorio -- Opción C del rediseño (Lucas, 7-sep-2026).
// Mismo cálculo que ClienteCard vía resumenCliente() para que mobile y
// desktop nunca muestren datos distintos del mismo cliente. Pensada para
// listas largas: ~18 filas visibles a la vez en vez de 9 tarjetas.
export default function ClienteRow({ cliente, sedes, equipos, servicios = [], onToggleExpand }) {
    const {
        ultimoServicio, diasSinAtender, alertaSinServicio,
        esEmpresa, iniciales,
    } = resumenCliente(cliente, sedes, equipos, servicios);

    const PinTipo = esEmpresa ? LuBuilding2 : LuUser;
    const dotColor = alertaSinServicio ? 'bg-brand-amber' : (ultimoServicio ? 'bg-brand-green' : 'bg-muted');

    return (
        <div onClick={onToggleExpand}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-black/[0.05] dark:border-white/[0.05] last:border-0 hover:bg-panel transition-colors">
            <span className="w-6 h-6 rounded-lg bg-chip text-ink flex items-center justify-center text-[9px] font-black shrink-0">
                {iniciales}
            </span>
            <span className="flex-[1.6] min-w-0 text-caption font-bold text-ink truncate">
                {cliente.nombre}
            </span>
            <span className="flex-[0.4] text-muted flex items-center justify-center shrink-0" title={esEmpresa ? 'Empresa' : 'Particular'}>
                <PinTipo size={13} />
            </span>
            <span className="flex-[1.4] min-w-0 text-label text-muted flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                <span className="truncate">
                    {ultimoServicio ? `Últ: ${formatFecha(ultimoServicio.fecha)}` : 'Sin servicios'}
                    {alertaSinServicio && (
                        <span className="text-brand-amber font-bold"> · {diasSinAtender}d sin visita</span>
                    )}
                </span>
            </span>
            {cliente.telefono ? (
                <button
                    onClick={(e) => { e.stopPropagation(); abrirWhatsApp(cliente.telefono, cliente.nombre); }}
                    title="WhatsApp"
                    className="w-6 h-6 rounded-md flex items-center justify-center bg-[#25D366] text-white shrink-0 active:scale-90 transition-all">
                    <LuMessageCircle size={11} />
                </button>
            ) : <span className="w-6 h-6 shrink-0" />}
        </div>
    );
}
