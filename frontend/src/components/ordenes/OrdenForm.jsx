import React, { useState, useEffect } from 'react';

const PRIORIDADES = [
    { value: 'BAJA',    label: 'Baja',    color: '#A8A29E' },
    { value: 'NORMAL',  label: 'Normal',  color: '#3B82F6' },
    { value: 'ALTA',    label: 'Alta',    color: '#D48800' },
    { value: 'URGENTE', label: 'Urgente', color: '#D13A28' },
];

const EMPTY = {
    tecnicoId: '',
    titulo: '',
    descripcion: '',
    clienteNombre: '',
    clienteTelefono: '',
    direccion: '',
    prioridad: 'NORMAL',
    fechaProgramada: '',
    horaEstimada: '',
};

export default function OrdenForm({ orden, tecnicos, onGuardar, onCancelar }) {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        if (orden) {
            setForm({
                tecnicoId:      orden.tecnicoId || '',
                titulo:         orden.titulo || '',
                descripcion:    orden.descripcion || '',
                clienteNombre:  orden.clienteNombre || '',
                clienteTelefono: orden.clienteTelefono || '',
                direccion:      orden.direccion || '',
                prioridad:      orden.prioridad || 'NORMAL',
                fechaProgramada: orden.fechaProgramada || '',
                horaEstimada:   orden.horaEstimada || '',
            });
        } else {
            setForm(EMPTY);
        }
    }, [orden]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onGuardar({
            ...form,
            tecnicoId: Number(form.tecnicoId),
        });
    };

    const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
    const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Técnico */}
            <div>
                <label className={labelCls}>Técnico asignado *</label>
                <select value={form.tecnicoId} onChange={e => set('tecnicoId', e.target.value)}
                    required className={inputCls}>
                    <option value="">Seleccionar técnico...</option>
                    {tecnicos.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Título */}
            <div>
                <label className={labelCls}>Título *</label>
                <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                    required placeholder="Ej: Presupuesto dispenser piso 3"
                    className={inputCls} />
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Cliente</label>
                    <input value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)}
                        placeholder="Nombre" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Teléfono</label>
                    <input value={form.clienteTelefono} onChange={e => set('clienteTelefono', e.target.value)}
                        placeholder="11 xxxx-xxxx" className={inputCls} />
                </div>
            </div>

            {/* Dirección */}
            <div>
                <label className={labelCls}>Dirección</label>
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                    placeholder="Av. Corrientes 1234, CABA" className={inputCls} />
            </div>

            {/* Descripción */}
            <div>
                <label className={labelCls}>Descripción / instrucciones</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                    rows={3} placeholder="Detalle del trabajo a realizar..."
                    className={`${inputCls} resize-none`} />
            </div>

            {/* Fecha + Hora + Prioridad */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                    <label className={labelCls}>Fecha *</label>
                    <input type="date" value={form.fechaProgramada}
                        onChange={e => set('fechaProgramada', e.target.value)}
                        required className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Hora est.</label>
                    <input type="time" value={form.horaEstimada}
                        onChange={e => set('horaEstimada', e.target.value)}
                        className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Prioridad</label>
                    <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}
                        className={inputCls}>
                        {PRIORIDADES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancelar}
                    className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                    Cancelar
                </button>
                <button type="submit"
                    className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-[#D13A28] dark:bg-[#E8422F] text-white active:scale-95 transition-all">
                    {orden ? 'Guardar cambios' : 'Crear orden'}
                </button>
            </div>
        </form>
    );
}
