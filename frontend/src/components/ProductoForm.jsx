import React from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import { useProductoForm } from '../hooks/useProductoForm';

/**
 * ProductoForm
 * Modal para crear/editar productos con cálculos automáticos
 */
export default function ProductoForm({
  isOpen,
  onClose,
  onProductoGuardado,
  productoEdicion = null
}) {

  const {
    formData,
    errores,
    cargando,
    previewFoto,
    handleChange,
    handleFotoChange,
    validarTodo,
    resetear,
    calcularGanancias,
    setCargando,
  } = useProductoForm(productoEdicion);

  const { gananciaUnidad, precioBase, precioLista } = calcularGanancias();

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!validarTodo()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    setCargando(true);
    const loadingToast = toast.loading('Guardando producto...');

    try {
      const formDataEnvio = new FormData();
      formDataEnvio.append('sku', formData.sku.trim());
      formDataEnvio.append('nombre', formData.nombre.trim());
      formDataEnvio.append('costo', parseFloat(formData.costo));
      formDataEnvio.append('porcentajeGanancia', parseFloat(formData.porcentajeGanancia));
      formDataEnvio.append('porcentajeMarkup', parseFloat(formData.porcentajeMarkup));
      formDataEnvio.append('precioLista', precioLista);

      if (formData.foto) {
        formDataEnvio.append('foto', formData.foto);
      }

      let response;
      if (productoEdicion?.id) {
        response = await api.put(`/repuestos/${productoEdicion.id}`, formDataEnvio);
      } else {
        response = await api.post('/repuestos', formDataEnvio);
      }

      toast.success(`✅ Producto "${formData.nombre}" guardado`, { id: loadingToast });
      if (onProductoGuardado) onProductoGuardado(response.data);
      resetear();
      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || 'Error al guardar producto';
      toast.error(`❌ ${errorMsg}`, { id: loadingToast });
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
        <Card className="w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl">

          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {productoEdicion ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configura precios y ganancias</p>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
          </div>

          <form onSubmit={handleGuardar} className="space-y-5">

            {/* FOTO */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">📷 Foto del Producto</label>
              <div className="mt-3 flex gap-4">
                {previewFoto && (
                  <img
                    src={previewFoto}
                    alt="preview"
                    className="w-24 h-24 rounded-xl object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <label className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📸</div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Click o arrastra foto</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, WebP (máx 5MB)</p>
                  </div>
                  <input type="file" onChange={handleFotoChange} accept="image/*" className="hidden" />
                </label>
              </div>
              {errores.foto && <p className="text-xs text-rose-500 mt-2">{errores.foto}</p>}
            </div>

            {/* SKU Y NOMBRE */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="Ej: TC-001"
                  className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                    errores.sku ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                />
                {errores.sku && <p className="text-xs text-rose-500 mt-1">{errores.sku}</p>}
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Termostato 85°"
                  className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                    errores.nombre ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                />
                {errores.nombre && <p className="text-xs text-rose-500 mt-1">{errores.nombre}</p>}
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Descripción (Opcional)</label>
              <textarea
                name="descripcion"
                value={formData.descripcion || ''}
                onChange={handleChange}
                placeholder="Ej: Termostato para dispensers con control de temperatura..."
                className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500 min-h-[80px]"
              />
            </div>

            {/* COSTO */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Costo de Compra ($) *</label>
              <input
                type="number"
                name="costo"
                value={formData.costo}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="100"
                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                  errores.costo ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              />
              {errores.costo && <p className="text-xs text-rose-500 mt-1">{errores.costo}</p>}
            </div>

            {/* MÁRGENES */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-4">
              <h3 className="font-black text-sm text-blue-900 dark:text-blue-100">💰 CONFIGURAR PRECIOS</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">% Ganancia Base</label>
                  <input
                    type="number"
                    name="porcentajeGanancia"
                    value={formData.porcentajeGanancia}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-1">Tu ganancia inicial (no puede ser negativo)</p>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">% Markup</label>
                  <input
                    type="number"
                    name="porcentajeMarkup"
                    value={formData.porcentajeMarkup}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-1">Aplicar descuentos luego (no puede ser negativo)</p>
                </div>
              </div>

              {/* RESUMEN CÁLCULOS */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Ganancia/u:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">${gananciaUnidad.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Precio Base:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">${precioBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-3 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-black text-slate-900 dark:text-white">PRECIO LISTA:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">${precioLista.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={cargando}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {cargando ? '⏳ Guardando...' : (productoEdicion ? '✅ Actualizar' : '✅ Guardar Producto')}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
