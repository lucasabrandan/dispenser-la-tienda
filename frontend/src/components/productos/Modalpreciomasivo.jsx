import React from 'react';

export default function ModalPrecioMasivo({
    cantidadSeleccionados,
    ganancia, markup, impuestos,
    onGananciaChange, onMarkupChange, onImpuestosChange,
    onAplicar, onCerrar,
}) {
    const sinCambios = ganancia === '' && markup === '' && impuestos === '';

    const sanitizar = (v) => {
        let limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
        const partes = limpio.split('.');
        if (partes.length > 2) limpio = partes[0] + '.' + partes.slice(1).join('');
        return limpio;
    };

    const inputClass = `
        w-full p-3.5 rounded-xl outline-none transition-all mb-4
        bg-chip
        border border-black/[0.07] dark:border-white/[0.07]
        text-ink text-sm font-bold
        focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]
        placeholder:text-muted
    `;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <div className="bg-card rounded-[2rem] p-6 w-full max-w-sm border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    <h3 className="text-lg font-black text-ink uppercase mb-1">
                        Actualizar margenes
                    </h3>
                    <p className="text-label font-bold text-muted uppercase mb-5">
                        {cantidadSeleccionados} producto{cantidadSeleccionados !== 1 ? 's' : ''} seleccionado{cantidadSeleccionados !== 1 ? 's' : ''} · deja vacio lo que no quieras cambiar
                    </p>

                    {/* Ganancia */}
                    <label className="block text-label font-black text-muted uppercase mb-1.5 tracking-widest">
                        % Ganancia (efectivo)
                    </label>
                    <input
                        type="text" inputMode="decimal" value={ganancia}
                        onChange={e => onGananciaChange(sanitizar(e.target.value))}
                        placeholder="Ej: 40  (vacio = sin cambio)"
                        className={inputClass}
                    />

                    {/* Markup */}
                    <label className="block text-label font-black text-muted uppercase mb-1.5 tracking-widest">
                        % Markup adicional
                    </label>
                    <input
                        type="text" inputMode="decimal" value={markup}
                        onChange={e => onMarkupChange(sanitizar(e.target.value))}
                        placeholder="Ej: 15  (vacio = sin cambio)"
                        className={inputClass}
                    />

                    {/* Impuestos */}
                    <label className="block text-label font-black text-muted uppercase mb-1.5 tracking-widest">
                        % Impuestos (facturado)
                    </label>
                    <input
                        type="text" inputMode="decimal" value={impuestos}
                        onChange={e => onImpuestosChange(sanitizar(e.target.value))}
                        placeholder="Ej: 30  (vacio = sin cambio)"
                        className={inputClass}
                    />

                    {/* Preview */}
                    <div className="bg-page rounded-xl p-3 mb-4 border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-label font-black text-muted uppercase mb-1">Formula</p>
                        <p className="text-caption font-bold text-ink">
                            Efectivo = Costo × (1 + Ganancia%)
                        </p>
                        <p className="text-caption font-bold text-ink">
                            Facturado = Efectivo × (1 + Impuestos%)
                        </p>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                        <button onClick={onCerrar}
                            className="flex-1 py-3 bg-chip text-ink rounded-xl font-black text-label uppercase hover:opacity-80 transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={onAplicar} disabled={sinCambios}
                            className="flex-1 py-3 bg-brand-red text-white rounded-xl font-black text-label uppercase hover:opacity-90 transition-all active:scale-95 disabled:opacity-40">
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
