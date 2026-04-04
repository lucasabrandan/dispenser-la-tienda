/**
 * ClienteFormFields — campos de datos personales del cliente
 * Paleta del sistema: sin slate-*, sin inline styles, sin colores hardcodeados
 */
export default function ClienteFormFields({ formData, errores, handleChange }) {

    const inputBase = `
        w-full p-3 mt-2 rounded-xl border transition-all outline-none
        border-black/[0.08] dark:border-white/[0.08]
        bg-[#C0BCB6] dark:bg-[#2E2E2E]
        text-[#1C1917] dark:text-[#F0EEE9]
        placeholder-[#A8A29E]
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/10
    `;

    const inputError = 'border-[#D13A28] dark:border-[#E8422F] bg-[#D13A28]/5';

    return (
        <div className="space-y-4">

            {/* TIPO — PARTICULAR / EMPRESA */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { value: 'PARTICULAR', label: 'Particular', icon: '👤' },
                    { value: 'EMPRESA',    label: 'Empresa',    icon: '🏢' },
                ].map(({ value, label, icon }) => {
                    const activo = formData.clienteTipo === value;
                    return (
                        <label
                            key={value}
                            className={`
                                flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer
                                transition-all active:scale-95
                                ${activo
                                    ? 'border-[#D13A28] dark:border-[#E8422F] bg-[#D13A28]/8 dark:bg-[#E8422F]/10'
                                    : 'border-black/[0.08] dark:border-white/[0.08] bg-[#D8D4CE] dark:bg-[#1C1C1C] hover:opacity-80'
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
                                    ? 'border-[#D13A28] dark:border-[#E8422F]'
                                    : 'border-[#A8A29E]'
                                }
                            `}>
                                {activo && (
                                    <span className="w-2 h-2 rounded-full bg-[#D13A28] dark:bg-[#E8422F]" />
                                )}
                            </span>
                            <span className="text-sm font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                {icon} {label}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* NOMBRE */}
            <div>
                <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
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
                <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
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
                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
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
                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
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
                <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wide">
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
