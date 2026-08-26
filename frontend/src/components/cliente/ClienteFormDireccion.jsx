import { LuMapPin, LuMap } from 'react-icons/lu';

/**
 * ClienteFormDireccion
 * Componente presentacional — sección de dirección.
 */
export default function ClienteFormDireccion({ formData, errores, handleChange }) {
    const inputClass = (campo) =>
        `w-full p-3 mt-2 rounded-xl border-2 transition-all bg-card text-ink ${
            errores[campo]
                ? 'border-brand-red bg-[#D13A28]/5'
                : 'border-black/[0.08] dark:border-white/[0.08]'
        }`;

    return (
        <div className="bg-chip p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] space-y-4">
            <h3 className="font-black text-sm text-ink flex items-center gap-1.5"><LuMapPin size={14} /> Dirección</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Calle *</label>
                    <input type="text" name="calle" value={formData.calle} onChange={handleChange}
                        placeholder="Ej: Avenida Córdoba" className={inputClass('calle')} />
                </div>
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Número *</label>
                    <input type="text" name="numero" value={formData.numero} onChange={handleChange}
                        placeholder="Ej: 3400" className={inputClass('numero')} />
                </div>
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Piso (opcional)</label>
                    <input type="text" name="piso" value={formData.piso} onChange={handleChange}
                        placeholder="Ej: 1"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink" />
                </div>
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Depto (opcional)</label>
                    <input type="text" name="depto" value={formData.depto} onChange={handleChange}
                        placeholder="Ej: A"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink" />
                </div>
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Localidad *</label>
                    <input type="text" name="localidad" value={formData.localidad} onChange={handleChange}
                        placeholder="Ej: CABA" className={inputClass('localidad')} />
                </div>
                <div>
                    <label className="text-label font-black text-muted uppercase tracking-wide">Provincia</label>
                    <select name="provincia" value={formData.provincia} onChange={handleChange}
                        className="w-full p-3 mt-2 rounded-xl border-2 border-black/[0.08] dark:border-white/[0.08] bg-card text-ink">
                        <option>Buenos Aires</option>
                        <option>CABA</option>
                        <option>Córdoba</option>
                        <option>Santa Fe</option>
                        <option>Mendoza</option>
                    </select>
                </div>
            </div>

            {formData.direccion && (
                <div className="p-3 bg-[var(--blue-bg)] rounded-lg border border-[var(--blue-tx)]/20">
                    <p className="text-label text-[var(--blue-tx)] font-bold flex items-center gap-1.5">
                        <LuMap size={13} /> Dirección generada: {formData.direccion}
                    </p>
                </div>
            )}
        </div>
    );
}