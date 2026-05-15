import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../../services/api';
import { buildSelectStyles } from '../servicio/ServicioUI';
import { useTheme } from '../../hooks/useTheme';

const PRIORIDADES = [
    { value: 'BAJA',    label: 'Baja'    },
    { value: 'NORMAL',  label: 'Normal'  },
    { value: 'ALTA',    label: 'Alta'    },
    { value: 'URGENTE', label: 'Urgente' },
];

const EMPTY = {
    tecnicoId: '',
    titulo: '',
    descripcion: '',
    clienteId: null,
    clienteNombre: '',
    clienteTelefono: '',
    direccion: '',
    prioridad: 'NORMAL',
    fechaProgramada: '',
    horaEstimada: '',
    montoEstimado: '',
    formaPago: 'EFECTIVO',
    presupuestoId: '',
};

export default function OrdenForm({ orden, tecnicos, onGuardar, onCancelar }) {
    const [form, setForm]             = useState(EMPTY);
    const [presupuestos, setPresupuestos] = useState([]);
    const [clientes, setClientes]     = useState([]);
    const { isDark } = useTheme();

    useEffect(() => {
        api.get('/servicios', { params: { estado: 'PRESUPUESTO', size: 500 } })
            .then(r => setPresupuestos(r.data.content || r.data || []))
            .catch(() => {});
        api.get('/clientes', { params: { size: 1000 } })
            .then(r => setClientes(r.data.content || r.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (orden) {
            setForm({
                tecnicoId:       orden.tecnicoId || '',
                titulo:          orden.titulo || '',
                descripcion:     orden.descripcion || '',
                clienteId:       orden.clienteId || null,
                clienteNombre:   orden.clienteNombre || '',
                clienteTelefono: orden.clienteTelefono || '',
                direccion:       orden.direccion || '',
                prioridad:       orden.prioridad || 'NORMAL',
                fechaProgramada: orden.fechaProgramada || '',
                horaEstimada:    orden.horaEstimada || '',
                montoEstimado:   orden.montoEstimado || '',
                formaPago:       orden.formaPago || 'EFECTIVO',
                presupuestoId:   orden.presupuestoId || '',
            });
        } else {
            setForm(EMPTY);
        }
    }, [orden]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleClienteSelect = (opt) => {
        if (!opt) {
            setForm(f => ({ ...f, clienteId: null, clienteNombre: '', clienteTelefono: '', direccion: '' }));
            return;
        }
        const c = opt.cliente;
        setForm(f => ({
            ...f,
            clienteId:       c.id,
            clienteNombre:   c.nombre,
            clienteTelefono: c.telefono || '',
            // Prellenar dirección solo si estaba vacía
            direccion: f.direccion || c.direccion || '',
        }));
    };

    const handlePresupuesto = (id) => {
        set('presupuestoId', id);
        if (!id) return;
        const p = presupuestos.find(x => String(x.id) === String(id));
        if (!p) return;
        if (p.clienteNombre && !form.clienteNombre) set('clienteNombre', p.clienteNombre);
        if (!form.titulo) set('titulo', `Presupuesto ${p.nroDocumento || p.id}`);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onGuardar({
            ...form,
            tecnicoId:     Number(form.tecnicoId),
            clienteId:     form.clienteId || null,
            montoEstimado: form.montoEstimado ? Number(form.montoEstimado) : null,
            presupuestoId: form.presupuestoId ? Number(form.presupuestoId) : null,
        });
    };

    const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
    const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

    const clienteOpciones = clientes.map(c => ({
        value: c.id,
        label: c.nombre,
        sublabel: c.telefono || '',
        cliente: c,
    }));

    const clienteSeleccionado = clienteOpciones.find(o => o.value === form.clienteId) || null;

    const presupuestoSeleccionado = presupuestos.find(p => String(p.id) === String(form.presupuestoId));

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

            {/* Cliente desde BD */}
            <div>
                <label className={labelCls}>Cliente</label>
                <Select
                    options={clienteOpciones}
                    value={clienteSeleccionado}
                    onChange={handleClienteSelect}
                    isClearable
                    placeholder="Buscar cliente..."
                    noOptionsMessage={() => 'Sin resultados'}
                    styles={buildSelectStyles(isDark)}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    menuPortalTarget={document.body}
                    formatOptionLabel={(opt) => (
                        <div>
                            <span className="font-bold text-[13px]">{opt.label}</span>
                            {opt.sublabel && (
                                <span className="text-[11px] text-[#A8A29E] ml-2">{opt.sublabel}</span>
                            )}
                        </div>
                    )}
                />
                {/* Campos editables post-selección o para cliente no registrado */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <input value={form.clienteNombre}
                        onChange={e => set('clienteNombre', e.target.value)}
                        placeholder="Nombre (manual si no está en lista)"
                        className={inputCls} />
                    <input value={form.clienteTelefono}
                        onChange={e => set('clienteTelefono', e.target.value)}
                        placeholder="Teléfono"
                        className={inputCls} />
                </div>
            </div>

            {/* Dirección */}
            <div>
                <label className={labelCls}>Dirección</label>
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                    placeholder="Av. Corrientes 1234, CABA" className={inputCls} />
            </div>

            {/* Vincular presupuesto existente */}
            <div>
                <label className={labelCls}>Vincular presupuesto existente (opcional)</label>
                <select value={form.presupuestoId}
                    onChange={e => handlePresupuesto(e.target.value)}
                    className={inputCls}>
                    <option value="">Sin presupuesto vinculado</option>
                    {presupuestos.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.nroDocumento || `#${p.id}`} — {p.clienteNombre || 'Sin cliente'} {p.sedeNombre ? `· ${p.sedeNombre}` : ''}
                        </option>
                    ))}
                </select>
                {presupuestoSeleccionado && (
                    <p className="mt-1 text-[10px] text-[#D48800] dark:text-[#F0A500] font-bold">
                        ✓ El técnico verá el botón "Ejecutar presupuesto" en la orden
                    </p>
                )}
            </div>

            {/* Título */}
            <div>
                <label className={labelCls}>Título *</label>
                <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                    required placeholder="Ej: Reparación dispenser piso 3"
                    className={inputCls} />
            </div>

            {/* Descripción */}
            <div>
                <label className={labelCls}>Descripción / instrucciones</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                    rows={3} placeholder="Detalle del trabajo a realizar..."
                    className={`${inputCls} resize-none`} />
            </div>

            {/* Monto estimado + Forma de pago */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Monto estimado</label>
                    <input type="number" min="0" step="100"
                        value={form.montoEstimado}
                        onChange={e => set('montoEstimado', e.target.value)}
                        placeholder="0"
                        className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Forma de pago</label>
                    <select value={form.formaPago} onChange={e => set('formaPago', e.target.value)}
                        className={inputCls}>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
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
                    className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
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
