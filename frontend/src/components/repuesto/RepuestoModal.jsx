import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

/**
 * RepuestoModal
 * Bottom sheet para crear o editar un repuesto.
 * Toda la lógica de formulario vive aquí (es un modal simple, no necesita hook propio).
 */

const INITIAL_FORM = {
    id: null, sku: '', nombre: '', descripcion: '',
    costo: '', porcentajeGanancia: '', precio: '',
    stock: '', imagen: ''
};

export default function RepuestoModal({ isOpen, onClose, onGuardado, repuestoEdicion }) {
    const [form, setForm]         = useState(INITIAL_FORM);
    const [cargando, setCargando] = useState(false);

    // Poblar form al editar
    useEffect(() => {
        if (repuestoEdicion) {
            setForm({ ...repuestoEdicion });
        } else {
            setForm(INITIAL_FORM);
        }
    }, [repuestoEdicion, isOpen]);

    // ── Lógica financiera ──────────────────────────────────────────────────────
    const manejarCambiosFinancieros = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        const costo  = parseFloat(nuevoForm.costo) || 0;
        const margen = parseFloat(nuevoForm.porcentajeGanancia) || 0;
        if (costo >= 0) {
            nuevoForm.precio = (costo + costo * (margen / 100)).toFixed(2);
        }
        setForm(nuevoForm);
    };

    // ── Imagen ─────────────────────────────────────────────────────────────────
    const manejarFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Imagen muy pesada (máx 2MB)');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setForm(prev => ({ ...prev, imagen: reader.result }));
        reader.readAsDataURL(file);
    };

    // ── Guardar ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sku || !form.nombre) {
            toast.error('SKU y Nombre son obligatorios');
            return;
        }

        const loading = toast.loading('Sincronizando stock...');
        setCargando(true);
        try {
            const payload = {
                ...form,
                costo:              Number(form.costo),
                porcentajeGanancia: Number(form.porcentajeGanancia),
                precio:             Number(form.precio),
                stock:              Number(form.stock),
            };

            if (form.id) {
                await api.put(`/repuestos/${form.id}`, payload);
            } else {
                await api.post('/repuestos', payload);
            }

            toast.success('✅ Stock actualizado', { id: loading });
            onGuardado();
            onClose();
        } catch {
            toast.error('Error al guardar', { id: loading });
        } finally {
            setCargando(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-[3000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-5">
                    {form.id ? '✏️ Editar Producto' : '📦 Nuevo Ingreso'}
                </h3>

                <form onSubmit={handleSubmit} className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2 pb-2">

                    {/* FOTO */}
                    <div className="flex gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 items-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex justify-center items-center overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                            {form.imagen
                                ? <img src={form.imagen} className="w-full h-full object-cover" alt="preview" />
                                : <span className="text-2xl opacity-50">📸</span>
                            }
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                Foto del repuesto
                            </label>
                            <input
                                type="file" accept="image/*" onChange={manejarFoto}
                                className="text-xs mt-1 w-full text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                            />
                        </div>
                    </div>

                    {/* SKU + NOMBRE */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">SKU</label>
                            <input
                                value={form.sku}
                                onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                className={inputClass}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Nombre</label>
                            <input
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* FINANCIERO */}
                    <div className="grid grid-cols-3 gap-3 bg-blue-50/50 dark:bg-slate-700/30 p-3 rounded-2xl">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">Costo $</label>
                            <input
                                type="number" value={form.costo}
                                onChange={e => manejarCambiosFinancieros('costo', e.target.value)}
                                className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">Ganancia %</label>
                            <input
                                type="number" value={form.porcentajeGanancia}
                                onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)}
                                className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Venta $</label>
                            <input
                                value={form.precio} readOnly
                                className="w-full mt-1 p-3 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-black text-blue-700 dark:text-blue-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* STOCK */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase">Stock actual</label>
                        <input
                            type="number" value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* BOTONES */}
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={cargando}
                            className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {cargando ? '⏳ Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}