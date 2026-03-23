/**
 * ClienteFormFields
 * Componente presentacional — solo renderiza fields de datos personales.
 */
export default function ClienteFormFields({ formData, errores, handleChange }) {
    return (
        <div className="space-y-4">

            {/* TIPO */}
            <div className="grid grid-cols-2 gap-4">
                {['PARTICULAR', 'EMPRESA'].map(tipo => (
                    <label
                        key={tipo}
                        className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all"
                        style={{
                            borderColor:     formData.clienteTipo === tipo ? '#3B82F6' : '#E2E8F0',
                            backgroundColor: formData.clienteTipo === tipo ? '#EFF6FF' : 'transparent'
                        }}
                    >
                        <input
                            type="radio"
                            name="clienteTipo"
                            value={tipo}
                            checked={formData.clienteTipo === tipo}
                            onChange={handleChange}
                            className="w-5 h-5"
                        />
                        <span className="font-bold text-sm">
                            {tipo === 'PARTICULAR' ? '👤 Particular' : '🏢 Empresa'}
                        </span>
                    </label>
                ))}
            </div>

            {/* NOMBRE */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Nombre *</label>
                <input
                    type="text" name="nombre"
                    value={formData.nombre} onChange={handleChange}
                    placeholder="Ej: Juan García"
                    className={`w-full p-3 mt-2 rounded-xl border-2 transition-all dark:bg-slate-800 dark:text-white ${
                        errores.nombre
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                />
                {errores.nombre && <p className="text-xs text-rose-500 mt-1">El nombre es obligatorio</p>}
            </div>

            {/* CUIL/DNI */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">CUIL / DNI (opcional)</label>
                <input
                    type="text" name="cuilDni"
                    value={formData.cuilDni} onChange={handleChange}
                    placeholder="Ej: 20123456789"
                    className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                />
            </div>

            {/* TELÉFONO + EMAIL */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Teléfono (opcional)</label>
                    <input
                        type="tel" name="telefono"
                        value={formData.telefono} onChange={handleChange}
                        placeholder="+54 9 1123456789"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                    />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Email (opcional)</label>
                    <input
                        type="email" name="email"
                        value={formData.email} onChange={handleChange}
                        placeholder="contacto@ejemplo.com"
                        className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                    />
                </div>
            </div>

            {/* NOTAS */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Notas (opcional)</label>
                <textarea
                    name="notas"
                    value={formData.notas} onChange={handleChange}
                    placeholder="Ej: Cliente referido por..."
                    className="w-full p-3 mt-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white resize-none h-20"
                />
            </div>
        </div>
    );
}