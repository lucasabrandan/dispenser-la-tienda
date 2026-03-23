import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
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
            toast.error('❌ Completá los campos obligatorios');
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

            toast.success(`✅ Cliente "${formData.nombre}" creado`, { id: loadingToast });
            if (onClienteCreado) onClienteCreado(response.data);
            resetear();
            setModoFlota(false);
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

                    {/* HEADER */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">➕ Nuevo Cliente</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                {modoFlota ? 'Cliente de flota — datos completos' : 'Cliente ocasional — solo nombre requerido'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">✕</button>
                    </div>

                    {/* SELECTOR TIPO */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => setModoFlota(false)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${!modoFlota
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-200'
                                }`}
                        >
                            <p className="text-xl mb-1">👤</p>
                            <p className="font-black text-sm text-slate-900 dark:text-white">Particular / Ocasional</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Solo nombre obligatorio</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setModoFlota(true)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${modoFlota
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200'
                                }`}
                        >
                            <p className="text-xl mb-1">🏢</p>
                            <p className="font-black text-sm text-slate-900 dark:text-white">Cliente de Flota</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Dirección + IVA requeridos</p>
                        </button>
                    </div>

                    <form onSubmit={handleGuardar} className="space-y-5">

                        {/* CAMPOS BÁSICOS — siempre visibles */}
                        <ClienteFormFields
                            formData={formData}
                            errores={errores}
                            handleChange={handleChange}
                        />

                        {/* DIRECCIÓN + IVA — siempre visibles pero obligatorios solo en flota */}
                        <div className={`rounded-2xl border-2 p-4 transition-all ${modoFlota
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10'
                                : 'border-slate-100 dark:border-slate-800'
                            }`}>
                            {modoFlota && (
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">
                                    📍 Datos obligatorios para flota
                                </p>
                            )}
                            {!modoFlota && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    📍 Dirección (opcional)
                                </p>
                            )}
                            <ClienteFormDireccion
                                formData={formData}
                                errores={errores}
                                handleChange={handleChange}
                            />
                        </div>

                        {/* CONDICIÓN IVA */}
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                                Condición IVA {modoFlota ? '*' : '(opcional)'}
                            </label>
                            <select
                                name="condicionIva"
                                value={formData.condicionIva}
                                onChange={handleChange}
                                className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${errores.condicionIva
                                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                                        : 'border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <option value="CONSUMIDOR_FINAL">👥 Consumidor Final</option>
                                <option value="MONOTRIBUTO">💼 Monotributo</option>
                                <option value="RESPONSABLE_INSCRIPTO">📋 Responsable Inscripto</option>
                                <option value="NO_RESPONSABLE">❌ No Responsable</option>
                            </select>
                            {errores.condicionIva && <p className="text-xs text-rose-500 mt-1">Obligatorio para cliente de flota</p>}
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