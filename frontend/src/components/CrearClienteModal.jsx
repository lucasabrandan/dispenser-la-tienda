import React from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import ClienteFormFields from './ClienteFormFields';
import ClienteFormDireccion from './ClienteFormDireccion';
import { useClienteForm } from '../hooks/useClienteForm';

/**
 * CrearClienteModal
 * Componente contenedor que orquesta el modal
 * Usa custom hook para lógica, sub-componentes para UI
 */
export default function CrearClienteModal({ 
  isOpen, 
  onClose, 
  onClienteCreado, 
  clienteNombrePrellenado = '' 
}) {
  
  const { formData, errores, cargando, handleChange, validarTodo, resetear, setCargando, setErrores } = 
    useClienteForm(clienteNombrePrellenado);

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!validarTodo()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    setCargando(true);
    const loadingToast = toast.loading('Creando cliente...');

    try {
      const response = await api.post('/clientes', {
        clienteTipo: formData.clienteTipo,
        nombre: formData.nombre.trim(),
        cuilDni: formData.cuilDni.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        notas: formData.notas.trim() || null,
        condicionIva: formData.condicionIva,
        calle: formData.calle.trim(),
        numero: formData.numero.trim(),
        piso: formData.piso.trim() || null,
        depto: formData.depto.trim() || null,
        localidad: formData.localidad.trim(),
        provincia: formData.provincia.trim(),
        direccion: formData.direccion.trim()
      });

      toast.success(`✅ Cliente "${formData.nombre}" creado`, { id: loadingToast });
      if (onClienteCreado) onClienteCreado(response.data);
      resetear();
      onClose();

    } catch (err) {
      const errorMsg = err.response?.data?.detalles?.camposInvalidos 
        ? Object.values(err.response.data.detalles.camposInvalidos).join(', ')
        : err.response?.data?.mensaje || 'Error al crear cliente';

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
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">➕ Nuevo Cliente</h2>
              <p className="text-xs text-slate-400 mt-1">Completa los datos básicos</p>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">✕</button>
          </div>

          <form onSubmit={handleGuardar} className="space-y-5">
            <ClienteFormFields formData={formData} errores={errores} handleChange={handleChange} />
            <ClienteFormDireccion formData={formData} errores={errores} handleChange={handleChange} />
            
            {/* CONDICIÓN IVA */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Condición IVA *</label>
              <select
                name="condicionIva"
                value={formData.condicionIva}
                onChange={handleChange}
                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                  errores.condicionIva ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <option value="">-- Selecciona una opción --</option>
                <option value="RESPONSABLE_INSCRIPTO">📋 Responsable Inscripto</option>
                <option value="MONOTRIBUTO">💼 Monotributo</option>
                <option value="NO_RESPONSABLE">❌ No Responsable</option>
                <option value="CONSUMIDOR_FINAL">👥 Consumidor Final</option>
              </select>
              {errores.condicionIva && <p className="text-xs text-rose-500 mt-1">Obligatorio</p>}
            </div>

            {/* BOTONES */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={onClose} disabled={cargando}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase hover:bg-slate-300 transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={cargando}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95">
                {cargando ? '⏳ Creando...' : '✅ Crear Cliente'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
