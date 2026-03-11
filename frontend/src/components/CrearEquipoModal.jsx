import React from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import { useEquipoForm } from '../hooks/useEquipoForm';

/**
 * CrearEquipoModal
 * Modal inline para crear equipo sin salir del flujo de presupuesto
 * 
 * PROPS:
 * - isOpen: boolean
 * - onClose: function
 * - onEquipoCreado: function(equipoNuevo)
 * - sedeId: number - ID de la sede propietaria
 * - numeroSeriePrellenado: string
 */
export default function CrearEquipoModal({ 
  isOpen, 
  onClose, 
  onEquipoCreado, 
  sedeId,
  numeroSeriePrellenado = '' 
}) {
  
  const { formData, errores, cargando, handleChange, validarTodo, resetear, setCargando, setErrores } = 
    useEquipoForm();

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!validarTodo()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    setCargando(true);
    const loadingToast = toast.loading('Creando equipo...');

    try {
      const response = await api.post('/equipos', {
        numeroSerie: formData.numeroSerie.trim(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        tipoDispenser: formData.tipoDispenser,
        anioFabricacion: parseInt(formData.anioFabricacion),
        notas: formData.notas.trim() || null,
        sedeId: parseInt(sedeId)
      });

      toast.success(`✅ Equipo S/N "${formData.numeroSerie}" creado`, { id: loadingToast });
      if (onEquipoCreado) onEquipoCreado(response.data);
      resetear();
      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.detalles?.camposInvalidos 
        ? Object.values(err.response.data.detalles.camposInvalidos).join(', ')
        : err.response?.data?.mensaje || 'Error al crear equipo';

      toast.error(`❌ ${errorMsg}`, { id: loadingToast });

      if (err.response?.data?.tipo === 'VALIDACION_FALLIDA') {
        const camposErr = err.response.data.detalles.camposInvalidos || {};
        setErrores(Object.keys(camposErr).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {}));
      }
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                ➕ Nuevo Equipo
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Completa los datos del dispenser
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleGuardar} className="space-y-5">

            {/* NÚMERO DE SERIE */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                Número de Serie * (obligatorio)
              </label>
              <input
                type="text"
                name="numeroSerie"
                value={formData.numeroSerie}
                onChange={handleChange}
                placeholder="Ej: AQ-2024-001"
                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                  errores.numeroSerie
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              />
              {errores.numeroSerie && (
                <p className="text-xs text-rose-500 mt-1">El número de serie es obligatorio</p>
              )}
            </div>

            {/* MARCA Y MODELO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                  Marca *
                </label>
                <input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Ej: Aqua Cool"
                  className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                    errores.marca
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                />
                {errores.marca && (
                  <p className="text-xs text-rose-500 mt-1">La marca es obligatoria</p>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                  Modelo *
                </label>
                <input
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  placeholder="Ej: AQ-500"
                  className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                    errores.modelo
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                />
                {errores.modelo && (
                  <p className="text-xs text-rose-500 mt-1">El modelo es obligatorio</p>
                )}
              </div>
            </div>

            {/* TIPO Y AÑO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                  Tipo de Dispenser
                </label>
                <select
                  name="tipoDispenser"
                  value={formData.tipoDispenser}
                  onChange={handleChange}
                  className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                >
                  <option value="AGUA">💧 Agua</option>
                  <option value="AGUA_CALIENTE">🔥 Agua Caliente</option>
                  <option value="AMBOS">🌡️ Ambos</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                  Año de Fabricación
                </label>
                <input
                  type="number"
                  name="anioFabricacion"
                  value={formData.anioFabricacion}
                  onChange={handleChange}
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* NOTAS */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                Notas (opcional)
              </label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                placeholder="Ej: En buen estado, sin golpes..."
                className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white resize-none h-20"
              />
            </div>

            {/* BOTONES */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={cargando}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase hover:bg-slate-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {cargando ? '⏳ Creando...' : '✅ Crear Equipo'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}