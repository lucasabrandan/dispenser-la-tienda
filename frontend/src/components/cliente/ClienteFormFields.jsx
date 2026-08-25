import { LuUser, LuBuilding2 } from 'react-icons/lu';

/**
 * ClienteFormFields — campos de datos personales del cliente
 * Paleta del sistema: sin slate-*, sin inline styles, sin colores hardcodeados
 */
export default function ClienteFormFields({ formData, errores, handleChange }) {

    const inputBase = `
        w-full p-3 mt-2 rounded-xl border transition-all outline-none
        border-black/[0.08] dark:border-white/[0.08]
        bg-chip
        text-ink
        placeholder-muted
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/10
    `;

    const inputError = 'border-brand-red bg-[#D13A28]/5';

    return (
        <div className="space-y-4">

            {/* TIPO — PARTICULAR / EMPRESA */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { value: 'PARTICULAR', label: 'Particular', Icon: LuUser },
                    { value: 'EMPRESA',    label: 'Empresa',    Icon: LuBuilding2 },
                ].map(({ value, label, Icon }) => {
                    const activo = formData.clienteTipo === value;
                    return (
                        <label
                            key={value}
                            className={`
                                flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer
                                transition-all active:scale-95
                                ${activo
                                    ? 'border-brand-red bg-[#D13A28]/8 dark:bg-[#E8422F]/10'
                                    : 'border-black/[0.08] dark:border-white/[0.08] bg-panel hover:opacity-80'
                                }
                            `}
                        >
                            <input
                                type="radio"
                                name="clienteTipo"
                                value={value}
                                checked={activo}
                                onChange={handleChange}
                                className="hidden"
                            />
                            {/* Indicador visual custom */}
                            <span className={`
                                w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                                ${activo
                                    ? 'border-brand-red'
                                    : 'border-muted'
                                }
                            `}>
                                {activo && (
                                    <span className="w-2 h-2 rounded-full bg-brand-red" />
                                )}
                            </span>
                            <span className="text-sm font-black text-ink flex items-center gap-1.5">
                                <Icon size={14} /> {label}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* NOMBRE */}
            <div>
                <label className="text-[10px] font-black text-muted uppercase tracking-wide">
                    Nombre *
                </label>
                <input
                    type="text" name="nombre"
                    value={formData.nombre} onChange={handleChange}
                    placeholder="Ej: Juan García"
                    className={`${inputBase} ${errores.nombre ? inputError : ''}`}
                />
                {errores.nombre && (
                    <p className="text-[11px] text-[#D13A28] mt-1">El nombre es obligatorio</p>
                )}
            </div>

            {/* CUIL / DNI */}
            <div>
                <label className="text-[10px] font-black text-muted uppercase tracking-wide">
                    CUIL / DNI (opcional)
                </label>
                <input
                    type="text" name="cuilDni"
                    value={formData.cuilDni} onChange={handleChange}
                    placeholder="Ej: 20-12345678-9"
                    className={inputBase}
                />
            </div>

            {/* TELÉFONO + EMAIL */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-wide">
                        Teléfono (opcional)
                    </label>
                    <input
                        type="tel" name="telefono"
                        value={formData.telefono} onChange={handleChange}
                        placeholder="+54 9 11 1234-5678"
                        className={inputBase}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-wide">
                        Email (opcional)
                    </label>
                    <input
                        type="email" name="email"
                        value={formData.email} onChange={handleChange}
                        placeholder="contacto@ejemplo.com"
                        className={inputBase}
                    />
                </div>
            </div>

            {/* NOTAS */}
            <div>
                <label className="text-[10px] font-black text-muted uppercase tracking-wide">
                    Notas (opcional)
                </label>
                <textarea
                    name="notas"
                    value={formData.notas} onChange={handleChange}
                    placeholder="Ej: Cliente referido por..."
                    className={`${inputBase} resize-none h-20`}
                />
            </div>

        </div>
    );
}
