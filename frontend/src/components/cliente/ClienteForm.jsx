import React from 'react';
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

    // Estilo común para inputs del sistema
    const inputClass = 'w-full p-3 mt-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all';

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* HEADER */}
                    <div className="flex justify-between items-center p-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <div>
                            <h2 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Editar Cliente</h2>
                            <p className="text-[11px] text-[#A8A29E] mt-1">{form.nombre}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#C0BCB6] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-5">

                        <ClienteFormFields
                            formData={form}
                            errores={{}}
                            handleChange={handleChange}
                        />

                        {/* DIRECCIÓN */}
                        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-[#D8D4CE] dark:bg-[#1C1C1C] p-4">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-3">
                                Dirección
                            </p>
                            <ClienteFormDireccion
                                formData={form}
                                errores={{}}
                                handleChange={handleChange}
                            />
                        </div>

                        {/* CONDICIÓN IVA */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
                                Condición IVA
                            </label>
                            <select
                                name="condicionIva"
                                value={form.condicionIva || 'CONSUMIDOR_FINAL'}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                                <option value="MONOTRIBUTO">Monotributo</option>
                                <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                                <option value="NO_RESPONSABLE">No Responsable</option>
                            </select>
                        </div>

                        {/* BOTONES */}
                        <div className="flex gap-3 pt-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all hover:opacity-80 active:scale-95 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 rounded-xl font-black text-sm uppercase transition-all hover:opacity-90 active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] text-white"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
