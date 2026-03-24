import React from 'react';
import Card from '../ui/Card';
import ClienteFormFields from './ClienteFormFields';
import ClienteFormDireccion from './ClienteFormDireccion';

/**
 * ClienteForm — modal de EDICIÓN de cliente existente.
 * Sin selector de tipo — solo editar los datos que ya tiene.
 */
export default function ClienteForm({ form, setForm, onSubmit, onClose }) {

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nuevoForm = { ...form, [name]: value };

        if (['calle', 'numero', 'piso', 'localidad', 'provincia'].includes(name)) {
            const calle     = nuevoForm.calle     || '';
            const numero    = nuevoForm.numero    || '';
            const piso      = nuevoForm.piso ? `, Piso ${nuevoForm.piso}` : '';
            const localidad = nuevoForm.localidad || '';
            nuevoForm.direccion = `${calle} ${numero}${piso}, ${localidad}`.trim();
        }

        setForm(nuevoForm);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.nombre?.trim() || form.nombre.trim().length < 2) return;
        onSubmit(e);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-[999] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">✏️ Editar Cliente</h2>
                            <p className="text-xs text-slate-400 mt-1">{form.nombre}</p>
                        </div>
                        <button onClick={onClose}
                            className="text-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <ClienteFormFields
                            formData={form}
                            errores={{}}
                            handleChange={handleChange}
                        />

                        <div className="rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                📍 Dirección
                            </p>
                            <ClienteFormDireccion
                                formData={form}
                                errores={{}}
                                handleChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wide">
                                Condición IVA
                            </label>
                            <select name="condicionIva"
                                value={form.condicionIva || 'CONSUMIDOR_FINAL'}
                                onChange={handleChange}
                                className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="CONSUMIDOR_FINAL">👥 Consumidor Final</option>
                                <option value="MONOTRIBUTO">💼 Monotributo</option>
                                <option value="RESPONSABLE_INSCRIPTO">📋 Responsable Inscripto</option>
                                <option value="NO_RESPONSABLE">❌ No Responsable</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase hover:bg-slate-300 transition-all">
                                Cancelar
                            </button>
                            <button type="submit"
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all active:scale-95">
                                ✅ Guardar Cambios
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </>
    );
}