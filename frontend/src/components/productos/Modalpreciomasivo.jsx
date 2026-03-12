import React from 'react';

export default function ModalPrecioMasivo({
  cantidadSeleccionados,
  porcentajeMasivo,
  tipoPorcentaje,
  onPorcentajeChange,
  onTipoChange,
  onAplicar,
  onCerrar,
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999] backdrop-blur-sm" onClick={onCerrar} />
      <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">💰 Actualizar Porcentaje</h3>
          <p className="text-xs text-slate-400 mb-4">{cantidadSeleccionados} producto(s) seleccionados</p>

          {/* TIPO */}
          <div className="flex gap-2 mb-4">
            {['ganancia', 'markup'].map(tipo => (
              <button
                key={tipo}
                onClick={() => onTipoChange(tipo)}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  tipoPorcentaje === tipo
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                % {tipo}
              </button>
            ))}
          </div>

          {/* INPUT */}
          <input
            type="number"
            value={porcentajeMasivo}
            onChange={e => onPorcentajeChange(e.target.value)}
            placeholder="Ej: 30"
            min="0"
            step="0.5"
            className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm mb-4 outline-none focus:border-blue-500"
          />

          {/* BOTONES */}
          <div className="flex gap-2">
            <button
              onClick={onCerrar}
              className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={onAplicar}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all"
            >
              ✅ Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
