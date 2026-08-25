import { LuMapPin, LuMap } from 'react-icons/lu';

/**
 * ClienteFormDireccion
 * Componente presentacional — sección de dirección.
 */
export default function ClienteFormDireccion({ formData, errores, handleChange }) {
    const inputClass = (campo) =>
        `w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
            errores[campo]
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`;

    return (
        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><LuMapPin size={14} /> Dirección</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Calle *</label>
                    <input type="text" name="calle" value={formData.calle} onChange={handleChange}
                        placeholder="Ej: Avenida Córdoba" className={inputClass('calle')} />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Número *</label>
                    <input type="text" name="numero" value={formData.numero} onChange={handleChange}
                        placeholder="Ej: 3400" className={inputClass('numero')} />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Piso (opcional)</label>
                    <input type="text" name="piso" value={formData.piso} onChange={handleChange}
                        placeholder="Ej: 1"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Depto (opcional)</label>
                    <input type="text" name="depto" value={formData.depto} onChange={handleChange}
                        placeholder="Ej: A"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Localidad *</label>
                    <input type="text" name="localidad" value={formData.localidad} onChange={handleChange}
                        placeholder="Ej: CABA" className={inputClass('localidad')} />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Provincia</label>
                    <select name="provincia" value={formData.provincia} onChange={handleChange}
                        className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white">
                        <option>Buenos Aires</option>
                        <option>CABA</option>
                        <option>Córdoba</option>
                        <option>Santa Fe</option>
                        <option>Mendoza</option>
                    </select>
                </div>
            </div>

            {formData.direccion && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                        <LuMap size={13} /> Dirección generada: {formData.direccion}
                    </p>
                </div>
            )}
        </div>
    );
}