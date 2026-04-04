import React from 'react';

export default function ModalPrecioMasivo({
    cantidadSeleccionados, porcentajeMasivo, tipoPorcentaje,
    onPorcentajeChange, onTipoChange, onAplicar, onCerrar,
}) {
    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] p-6 w-full max-w-sm border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    <h3 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase mb-1">Actualizar Porcentaje</h3>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase mb-5">
                        {cantidadSeleccionados} producto{cantidadSeleccionados !== 1 ? 's' : ''} seleccionado{cantidadSeleccionados !== 1 ? 's' : ''}
                    </p>

                    {/* Tipo */}
                    <div className="flex gap-2 mb-4">
                        {['ganancia', 'markup'].map(tipo => (
                            <button key={tipo} onClick={() => onTipoChange(tipo)}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                                    tipoPorcentaje === tipo
                                        ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                        : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]'
                                }`}>
                                % {tipo}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <input
                        type="number" value={porcentajeMasivo}
                        onChange={e => onPorcentajeChange(e.target.value)}
                        placeholder="Ej: 30" min="0" step="0.5"
                        className="
                            w-full p-3.5 rounded-xl outline-none transition-all mb-5
                            bg-[#C0BCB6] dark:bg-[#2E2E2E]
                            border border-black/[0.07] dark:border-white/[0.07]
                            text-[#1C1917] dark:text-[#F0EEE9] text-sm font-bold
                            focus:ring-2 focus:ring-[#D13A28]/20
                            focus:border-[#D13A28] dark:focus:border-[#E8422F]
                            placeholder:text-[#A8A29E]
                        "
                    />

                    {/* Botones */}
                    <div className="flex gap-2">
                        <button onClick={onCerrar}
                            className="flex-1 py-3 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={onAplicar}
                            className="flex-1 py-3 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95">
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
