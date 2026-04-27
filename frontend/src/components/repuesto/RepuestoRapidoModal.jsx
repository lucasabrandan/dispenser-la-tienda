import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// URL base sin /api al final para las llamadas con fetch nativo
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * RepuestoRapidoModal
 * Mini bottom-sheet para crear un repuesto al vuelo desde el selector
 * de repuestos en ServicioForm o VentaForm.
 * Solo pide los mínimos: SKU, nombre y precio de venta.
 * El resto (foto, costo, margen, descripción) se completa desde el catálogo.
 */
export default function RepuestoRapidoModal({ isOpen, onClose, nombreInicial = '', onCreado }) {
    const [form, setForm]         = useState({ sku: '', nombre: '', precio: '' });
    const [cargando, setCargando] = useState(false);

    // Pre-llenar nombre con lo que escribió el usuario en el selector
    useEffect(() => {
        if (isOpen) setForm({ sku: '', nombre: nombreInicial, precio: '' });
    }, [isOpen, nombreInicial]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sku.trim() || !form.nombre.trim() || !form.precio) {
            toast.error('SKU, nombre y precio son obligatorios');
            return;
        }

        setCargando(true);
        const t = toast.loading('Creando repuesto...');
        try {
            // fetch nativo: Axios 1.x ignora FormData y envía JSON por el header
            // Content-Type: application/json fijado en la instancia (mismo fix que subirFoto).
            const fd = new FormData();
            fd.append('sku',    form.sku.trim().toUpperCase());
            fd.append('nombre', form.nombre.trim());
            fd.append('precio', parseFloat(form.precio) || 0);
            const res = await fetch(`${BASE_URL}/repuestos`, { method: 'POST', body: fd });
            if (!res.ok) {
                const msg = res.status === 409 ? 'Ya existe un repuesto con ese SKU' : 'Error al crear repuesto';
                toast.error(msg, { id: t });
                return;
            }
            const data = await res.json();
            toast.success(`"${data.nombre}" creado`, { id: t });
            onCreado(data);
            onClose();
        } catch {
            toast.error('Error al crear repuesto', { id: t });
        } finally {
            setCargando(false);
        }
    };

    if (!isOpen) return null;

    const inputCls =
        'w-full mt-1 p-3 rounded-xl text-sm font-bold outline-none ' +
        'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] ' +
        'border border-black/[0.07] dark:border-white/[0.07] ' +
        'focus:ring-2 focus:ring-[#D13A28] dark:focus:ring-[#E8422F]';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-end md:items-center z-[4000]">
            <div className="bg-[#EDEAE6] dark:bg-[#242424] w-full max-w-md md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-5" />

                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-1">
                    Nuevo repuesto
                </h3>
                <p className="text-[11px] text-[#A8A29E] mb-5">
                    Ingresá los datos esenciales. Podés agregar foto, costo y descripción
                    después desde el catálogo.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* SKU + nombre */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
                                SKU *
                            </label>
                            <input
                                value={form.sku}
                                onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                                placeholder="FLT-001"
                                className={inputCls}
                                autoFocus
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
                                Nombre *
                            </label>
                            <input
                                value={form.nombre}
                                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Filtro carbón 10"
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Precio */}
                    <div>
                        <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
                            Precio de venta *
                        </label>
                        <input
                            type="number" min="0" step="any"
                            value={form.precio}
                            onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                            placeholder="0"
                            className={inputCls}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 mt-1">
                        <button
                            type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 py-3.5 rounded-xl font-black text-sm bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] active:scale-95 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={cargando}
                            className="flex-[2] py-3.5 rounded-xl font-black text-sm text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {cargando ? 'Creando...' : '+ Crear y agregar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
