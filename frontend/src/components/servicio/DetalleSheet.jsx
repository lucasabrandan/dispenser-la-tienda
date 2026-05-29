import React from 'react';
import { M } from './ServicioUI';

export default function DetalleSheet({ servicio, onCerrar }) {
    return (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={onCerrar}>
            <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#FFFFFF] dark:bg-[#242424]"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{servicio.clienteNombre}</h3>
                <p className="text-[11px] text-[#A8A29E] mb-4">📍 {servicio.sedeNombre} · {servicio.fecha}</p>
                <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                    {servicio.items?.map((it, idx) => (
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
                <button onClick={onCerrar}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
                    Cerrar
                </button>
            </div>
        </div>
    );
}
