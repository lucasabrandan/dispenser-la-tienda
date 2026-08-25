import React from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import { useSedeForm } from '../hooks/useSedeForm';
import { LuMapPinPlus, LuMapPin, LuMap, LuHourglass, LuCircleCheck } from 'react-icons/lu';

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
          
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
            <div>
              <h2 className="text-2xl font-black text-ink flex items-center gap-2">
                <LuMapPinPlus size={22} /> Nueva Sede
              </h2>
              <p className="text-xs text-muted mt-1">
                Completa los datos de la nueva sede
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-muted hover:text-ink transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleGuardar} className="space-y-5">

            {/* NOMBRE DE LA SEDE */}
            <div>
              <label className="text-xs font-black text-muted uppercase tracking-wide">
                Nombre de la Sede * (obligatorio)
              </label>
              <input
                type="text"
                name="nombreSede"
                value={formData.nombreSede}
                onChange={handleChange}
                placeholder="Ej: Casa Central, Sucursal 2"
                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all bg-card text-ink ${
                  errores.nombreSede
                    ? 'border-brand-red bg-[#D13A28]/5'
                    : 'border-black/[0.08] dark:border-white/[0.08]'
                }`}
              />
              {errores.nombreSede && (
                <p className="text-xs text-[#D13A28] mt-1">El nombre es obligatorio</p>
              )}
            </div>

            {/* DIRECCIÓN */}
            <div className="bg-chip p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] space-y-4">
              <h3 className="font-black text-sm text-ink flex items-center gap-1.5">
                <LuMapPin size={13} /> Dirección
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Calle *
                  </label>
                  <input
                    type="text"
                    name="calle"
                    value={formData.calle}
                    onChange={handleChange}
                    placeholder="Ej: Avenida Córdoba"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all bg-card text-ink ${
                      errores.calle
                        ? 'border-brand-red bg-[#D13A28]/5'
                        : 'border-black/[0.08] dark:border-white/[0.08]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Número *
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Ej: 3400"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all bg-card text-ink ${
                      errores.numero
                        ? 'border-brand-red bg-[#D13A28]/5'
                        : 'border-black/[0.08] dark:border-white/[0.08]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Piso (opcional)
                  </label>
                  <input
                    type="text"
                    name="piso"
                    value={formData.piso}
                    onChange={handleChange}
                    placeholder="Ej: 1"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Depto (opcional)
                  </label>
                  <input
                    type="text"
                    name="depto"
                    value={formData.depto}
                    onChange={handleChange}
                    placeholder="Ej: A"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Localidad *
                  </label>
                  <input
                    type="text"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    placeholder="Ej: CABA"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all bg-card text-ink ${
                      errores.localidad
                        ? 'border-brand-red bg-[#D13A28]/5'
                        : 'border-black/[0.08] dark:border-white/[0.08]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-muted uppercase tracking-wide">
                    Provincia
                  </label>
                  <select
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink"
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
                <div className="p-3 bg-[var(--blue-bg)] rounded-lg border border-[var(--blue-tx)]/20">
                  <p className="text-xs text-[var(--blue-tx)] font-bold flex items-center gap-1">
                    <LuMap size={12} /> Dirección: {formData.direccion}
                  </p>
                </div>
              )}
            </div>

            {/* BOTONES */}
            <div className="flex gap-3 pt-4 border-t border-black/[0.08] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={cargando}
                className="flex-1 py-3 bg-chip text-ink rounded-xl font-black text-sm uppercase hover:opacity-80 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex-1 py-3 bg-brand-red text-white rounded-xl font-black text-sm uppercase hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {cargando ? (<><LuHourglass size={14} /> Creando...</>) : (<><LuCircleCheck size={14} /> Crear Sede</>)}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}