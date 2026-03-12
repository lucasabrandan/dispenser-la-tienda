import React from 'react';
import Card from '../ui/Card';
import { formatearPrecio } from '../../utils/formatearPrecio';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

const DETALLES = (costo, porcGanancia, gananciaUnidad, precioBase, porcMarkup, precioLista) => [
  { label: 'Costo',        value: `$${formatearPrecio(costo)}`,          color: 'text-slate-900 dark:text-white' },
  { label: '% Ganancia',   value: `${porcGanancia.toFixed(1)}%`,         color: 'text-slate-900 dark:text-white' },
  { label: 'Ganancia/u',   value: `$${formatearPrecio(gananciaUnidad)}`, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Precio Base',  value: `$${formatearPrecio(precioBase)}`,     color: 'text-blue-600 dark:text-blue-400' },
  { label: '% Markup',     value: `${porcMarkup.toFixed(1)}%`,           color: 'text-slate-900 dark:text-white' },
  { label: 'Precio Lista', value: `$${formatearPrecio(precioLista)}`,    color: 'text-emerald-600 dark:text-emerald-400' },
];

export default function ProductoCard({
  producto,
  estaExpandido,
  estaSeleccionado,
  modoSeleccion,
  onToggleExpandido,
  onToggleSeleccion,
  onEditar,
  onEliminar,
}) {
  const costo        = parseFloat(producto.costo) || 0;
  const porcGanancia = parseFloat(producto.porcentajeGanancia) || 25;
  const porcMarkup   = parseFloat(producto.porcentajeMarkup) || 15;
  const gananciaUnidad = (costo * porcGanancia) / 100;
  const precioBase     = costo + gananciaUnidad;
  const precioLista    = precioBase * (1 + porcMarkup / 100);

  return (
    <Card className={`overflow-hidden transition-all ${estaSeleccionado ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}>
      <div className="p-3 md:p-4">
        <div className="flex gap-3 items-center">

          {/* CHECKBOX */}
          {modoSeleccion && (
            <button
              onClick={() => onToggleSeleccion(producto.id)}
              className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                estaSeleccionado
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              {estaSeleccionado && <span className="text-xs font-black">✓</span>}
            </button>
          )}

          {/* FOTO CUADRADA */}
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800"
            onClick={() => modoSeleccion && onToggleSeleccion(producto.id)}
          >
            {producto.fotoUrl ? (
              <img
                src={construirUrlFoto(producto.fotoUrl)}
                alt={producto.nombre}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML =
                    '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem">📦</div>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>

          {/* INFO */}
          <div
            className="flex-1 min-w-0"
            onClick={() => modoSeleccion && onToggleSeleccion(producto.id)}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase">SKU: {producto.sku || '—'}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{producto.nombre}</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">${formatearPrecio(precioLista)}</p>
            <p className="text-[10px] text-slate-400">Costo: ${formatearPrecio(costo)}</p>
          </div>

          {/* BOTONES INDIVIDUALES */}
          {!modoSeleccion && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => onToggleExpandido(producto.id)}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-200 transition-all"
              >
                {estaExpandido ? '▲' : '▼ Info'}
              </button>
              <button
                onClick={() => onEditar(producto)}
                className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-300 transition-all"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => onEliminar(producto.id)}
                className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-200 transition-all"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* ACORDEÓN */}
        {estaExpandido && !modoSeleccion && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl">
              <h4 className="font-black text-xs text-slate-900 dark:text-white mb-2 uppercase">📊 Detalles de Ganancia</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {DETALLES(costo, porcGanancia, gananciaUnidad, precioBase, porcMarkup, precioLista).map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                    <p className={`text-sm font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
