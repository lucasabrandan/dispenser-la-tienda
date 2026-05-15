import React from 'react';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import { useSedeForm } from '../hooks/useSedeForm';

/**
 * CrearSedeModal
 * Modal inline para crear sede sin salir del flujo de presupuesto
 * 
 * PROPS:
 * - isOpen: boolean
 * - onClose: function
 * - onSedeCreada: function(sedeNueva) - Callback cuando se crea
 * - clienteId: number - ID del cliente propietario de la sede
 * - nombreSedePrellenado: string
 */
export default function CrearSedeModal({ 
  isOpen, 
  onClose, 
  onSedeCreada, 
  clienteId,
  nombreSedePrellenado = '' 
}) {
  
  const { formData, errores, cargando, handleChange, validarTodo, resetear, setCargando, setErrores } = 
    useSedeForm();

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!validarTodo()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    setCargando(true);
    const loadingToast = toast.loading('Creando sede...');

    try {
      const response = await api.post('/sedes', {
        clienteId: parseInt(clienteId),
        nombreSede: formData.nombreSede.trim(),
        calle: formData.calle.trim(),
        numero: formData.numero.trim(),
        piso: formData.piso.trim() || null,
        depto: formData.depto.trim() || null,
        localidad: formData.localidad.trim(),
        provincia: formData.provincia.trim(),
        direccion: formData.direccion.trim(),
        notas: '' // Las notas no son obligatorias en sede
      });

      toast.success(`✅ Sede "${formData.nombreSede}" creada`, { id: loadingToast });
      if (onSedeCreada) onSedeCreada(response.data);
      resetear();
      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.detalles?.camposInvalidos 
        ? Object.values(err.response.data.detalles.camposInvalidos).join(', ')
        : err.response?.data?.mensaje || 'Error al crear sede';

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
                ➕ Nueva Sede
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Completa los datos de la nueva sede
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

            {/* NOMBRE DE LA SEDE */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                Nombre de la Sede * (obligatorio)
              </label>
              <input
                type="text"
                name="nombreSede"
                value={formData.nombreSede}
                onChange={handleChange}
                placeholder="Ej: Casa Central, Sucursal 2"
                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                  errores.nombreSede
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              />
              {errores.nombreSede && (
                <p className="text-xs text-rose-500 mt-1">El nombre es obligatorio</p>
              )}
            </div>

            {/* DIRECCIÓN */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                📍 Dirección
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Calle *
                  </label>
                  <input
                    type="text"
                    name="calle"
                    value={formData.calle}
                    onChange={handleChange}
                    placeholder="Ej: Avenida Córdoba"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                      errores.calle
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Número *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Ej: 3400"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                      errores.numero
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Piso (opcional)
                  </label>
                  <input
                    type="text"
                    name="piso"
                    value={formData.piso}
                    onChange={handleChange}
                    placeholder="Ej: 1"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Depto (opcional)
                  </label>
                  <input
                    type="text"
                    name="depto"
                    value={formData.depto}
                    onChange={handleChange}
                    placeholder="Ej: A"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Localidad *
                  </label>
                  <input
                    type="text"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    placeholder="Ej: CABA"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                      errores.localidad
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Provincia
                  </label>
                  <select
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                  >
                    <option>Buenos Aires</option>
                    <option>CABA</option>
                    <option>Córdoba</option>
                    <option>Santa Fe</option>
                    <option>Mendoza</option>
                  </select>
                </div>
              </div>

              {/* DIRECCIÓN AUTO-GENERADA */}
              {formData.direccion && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                    🗺️ Dirección: {formData.direccion}
                  </p>
                </div>
              )}
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
                {cargando ? '⏳ Creando...' : '✅ Crear Sede'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}