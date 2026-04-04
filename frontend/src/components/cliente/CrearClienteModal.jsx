import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ClienteFormFields from './ClienteFormFields';
import ClienteFormDireccion from './ClienteFormDireccion';
import { useClienteForm } from '../../hooks/useClienteForm';

export default function CrearClienteModal({
    isOpen,
    onClose,
    onClienteCreado,
    clienteNombrePrellenado = ''
}) {
    const [modoFlota, setModoFlota] = useState(false);

    const {
        formData, errores, cargando,
        handleChange, validarTodo, resetear,
        setCargando, setErrores
    } = useClienteForm(clienteNombrePrellenado, modoFlota);

    const handleGuardar = async (e) => {
        e.preventDefault();

        if (!validarTodo()) {
            toast.error('Completá los campos obligatorios');
            return;
        }

        setCargando(true);
        const loadingToast = toast.loading('Creando cliente...');

        try {
            const response = await api.post('/clientes', {
                clienteTipo: formData.clienteTipo,
                nombre: formData.nombre.trim(),
                cuilDni: formData.cuilDni?.trim() || null,
                telefono: formData.telefono?.trim() || null,
                email: formData.email?.trim() || null,
                notas: formData.notas?.trim() || null,
                condicionIva: formData.condicionIva || 'CONSUMIDOR_FINAL',
                calle: formData.calle?.trim() || 'Sin dirección',
                numero: formData.numero?.trim() || '0',
                piso: formData.piso?.trim() || null,
                depto: formData.depto?.trim() || null,
                localidad: formData.localidad?.trim() || 'Sin localidad',
                provincia: formData.provincia?.trim() || 'Buenos Aires',
                direccion: formData.direccion?.trim() || null,
            });

            toast.success(`Cliente "${formData.nombre}" creado`, { id: loadingToast });
            if (onClienteCreado) onClienteCreado(response.data);
            resetear();
            setModoFlota(false);
            onClose();

        } catch (err) {
            const errorMsg = err.response?.data?.detalles?.camposInvalidos
                ? Object.values(err.response.data.detalles.camposInvalidos).join(', ')
                : err.response?.data?.mensaje || 'Error al crear cliente';
            toast.error(errorMsg, { id: loadingToast });

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

    // Input base del sistema
    const inputBase = 'w-full p-3 mt-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all';
    const inputError = 'border-[#D13A28] bg-[var(--danger-bg)]';

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* HEADER */}
                    <div className="flex justify-between items-center p-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <div>
                            <h2 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Nuevo Cliente</h2>
                            <p className="text-[11px] text-[#A8A29E] mt-1">
                                {modoFlota ? 'Cliente de flota — datos completos' : 'Cliente ocasional — solo nombre requerido'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* SELECTOR TIPO */}
                    <div className="grid grid-cols-2 gap-3 p-5 pb-0">
                        <button
                            type="button"
                            onClick={() => setModoFlota(false)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                                !modoFlota
                                    ? 'border-[#D13A28] dark:border-[#E8422F] bg-[var(--danger-bg)]'
                                    : 'border-black/[0.08] dark:border-white/[0.08] bg-[#D8D4CE] dark:bg-[#1C1C1C] hover:opacity-80'
                            }`}
                        >
                            <p className="text-xl mb-1">👤</p>
                            <p className="font-black text-sm text-[#1C1917] dark:text-[#F0EEE9]">Particular / Ocasional</p>
                            <p className="text-[10px] text-[#A8A29E] font-bold mt-0.5">Solo nombre obligatorio</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setModoFlota(true)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                                modoFlota
                                    ? 'border-[#D48800] dark:border-[#F0A500] bg-[var(--warning-bg)]'
                                    : 'border-black/[0.08] dark:border-white/[0.08] bg-[#D8D4CE] dark:bg-[#1C1C1C] hover:opacity-80'
                            }`}
                        >
                            <p className="text-xl mb-1">🏢</p>
                            <p className="font-black text-sm text-[#1C1917] dark:text-[#F0EEE9]">Cliente de Flota</p>
                            <p className="text-[10px] text-[#A8A29E] font-bold mt-0.5">Dirección + IVA requeridos</p>
                        </button>
                    </div>

                    <form onSubmit={handleGuardar} className="p-5 space-y-5">

                        <ClienteFormFields
                            formData={formData}
                            errores={errores}
                            handleChange={handleChange}
                        />

                        {/* DIRECCIÓN */}
                        <div className={`rounded-2xl border p-4 transition-all ${
                            modoFlota
                                ? 'border-[#D48800] dark:border-[#F0A500] bg-[var(--warning-bg)]'
                                : 'border-black/[0.07] dark:border-white/[0.07] bg-[#D8D4CE] dark:bg-[#1C1C1C]'
                        }`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${
                                modoFlota ? 'text-[var(--warning-tx)]' : 'text-[#A8A29E]'
                            }`}>
                                {modoFlota ? 'Datos obligatorios para flota' : 'Dirección (opcional)'}
                            </p>
                            <ClienteFormDireccion
                                formData={formData}
                                errores={errores}
                                handleChange={handleChange}
                            />
                        </div>

                        {/* CONDICIÓN IVA */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
                                Condición IVA {modoFlota ? '*' : '(opcional)'}
                            </label>
                            <select
                                name="condicionIva"
                                value={formData.condicionIva}
                                onChange={handleChange}
                                className={`${inputBase} ${errores.condicionIva ? inputError : ''}`}
                            >
                                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                                <option value="MONOTRIBUTO">Monotributo</option>
                                <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                                <option value="NO_RESPONSABLE">No Responsable</option>
                            </select>
                            {errores.condicionIva && (
                                <p className="text-[11px] text-[#D13A28] mt-1">Obligatorio para cliente de flota</p>
                            )}
                        </div>

                        {/* BOTONES */}
                        <div className="flex gap-3 pt-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={cargando}
                                className="flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all hover:opacity-80 active:scale-95 disabled:opacity-50 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={cargando}
                                className="flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 bg-[#D13A28] dark:bg-[#E8422F] text-white"
                            >
                                {cargando ? 'Creando...' : 'Crear Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
