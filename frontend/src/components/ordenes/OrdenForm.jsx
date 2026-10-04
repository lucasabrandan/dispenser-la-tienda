import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { buildSelectStyles } from '../servicio/ServicioUI';
import { useTheme } from '../../hooks/useTheme';
import FechaFranja from './FechaFranja';

import { filtroMultiTermino } from '../../utils/busqueda';
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
    estado: '',
};

// Estados que el admin puede poner a mano desde "Editar orden". COMPLETADA no:
// cerrar una orden genera/actualiza el servicio y eso se hace desde "Cerrar trabajo".
const ESTADOS_EDITABLES = [
    { value: 'PENDIENTE',   label: 'Asignado' },
    { value: 'EN_CAMINO',   label: 'En camino' },
    { value: 'EN_SITIO',    label: 'En el lugar' },
    { value: 'NO_ATENDIDO', label: 'No atendido (reprogramar)' },
    { value: 'CANCELADA',   label: 'Cancelada' },
];

export default function OrdenForm({ orden, tecnicos, onGuardar, onCancelar }) {
    const [form, setForm]             = useState(EMPTY);
    const [presupuestos, setPresupuestos] = useState([]);
    const [clientes, setClientes]     = useState([]);
    const { isDark } = useTheme();

    useEffect(() => {
        // PRESUPUESTO + EN_PROGRESO: el presupuesto ya vinculado a esta orden está EN_PROGRESO
        // y antes no aparecía en la lista → se veía "Sin presupuesto vinculado" aunque lo estuviera.
        api.get('/servicios', { params: { estado: 'PRESUPUESTO,EN_PROGRESO', size: 500 } })
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
                estado:          orden.estado || '',
            });
        } else {
            setForm(EMPTY);
        }
    }, [orden]);

    // Órdenes viejas creadas desde el asistente quedaron sin dirección ni monto:
    // al editarlas se completan con los datos del presupuesto vinculado.
    useEffect(() => {
        if (!orden?.presupuestoId || presupuestos.length === 0) return;
        const p = presupuestos.find(x => String(x.id) === String(orden.presupuestoId));
        if (!p) return;
        const total = (p.items || []).reduce((a, i) => a + Number(i.costo || 0), 0);
        setForm(f => ({
            ...f,
            direccion:       f.direccion || p.sedeDireccion || '',
            montoEstimado:   f.montoEstimado || total || '',
            clienteTelefono: f.clienteTelefono || p.clienteTelefono || '',
            clienteId:       f.clienteId || p.clienteId || null,
            descripcion:     f.descripcion || (p.items || []).map(it => it.trabajoRealizado).filter(Boolean).join(' · '),
        }));
    }, [orden, presupuestos]);

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
        if (!form.fechaProgramada) { toast.error('Ingresá la fecha'); return; }
        onGuardar({
            ...form,
            tecnicoId:     Number(form.tecnicoId),
            clienteId:     form.clienteId || null,
            montoEstimado: form.montoEstimado ? Number(form.montoEstimado) : null,
            presupuestoId: form.presupuestoId ? Number(form.presupuestoId) : null,
            // Solo se manda si el admin lo cambió; el hook lo aplica con PATCH /estado
            estadoNuevo:   orden && form.estado && form.estado !== orden.estado ? form.estado : null,
        });
    };

    const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
    const labelCls = 'block text-label font-black text-muted uppercase tracking-wider mb-1';

    const clienteOpciones = clientes.map(c => ({
        value: c.id,
        label: c.nombre,
        sublabel: c.telefono || '',
        cliente: c,
    }));

    // Si la orden tiene nombre de cliente pero no id (o el cliente no vino en la lista),
    // se muestra igual el nombre en vez de "Buscar cliente..." vacío.
    const clienteSeleccionado = clienteOpciones.find(o => o.value === form.clienteId)
        || (form.clienteNombre ? { value: form.clienteId || '__manual__', label: form.clienteNombre, sublabel: form.clienteTelefono || '' } : null);

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

            {/* Estado (solo al editar) */}
            {orden && (
                <div>
                    <label className={labelCls}>Estado</label>
                    {orden.estado === 'COMPLETADA' ? (
                        <p className="text-body font-bold text-ink px-1">Completada — se corrige desde el servicio</p>
                    ) : (
                        <select value={form.estado} onChange={e => set('estado', e.target.value)} className={inputCls}>
                            {ESTADOS_EDITABLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    )}
                </div>
            )}

            {/* Cliente desde BD */}
            <div>
                <label className={labelCls}>Cliente</label>
                <Select filterOption={filtroMultiTermino}
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
                            <span className="font-bold text-body">{opt.label}</span>
                            {opt.sublabel && (
                                <span className="text-caption text-muted ml-2">{opt.sublabel}</span>
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
                    placeholder="Calle y número, localidad" className={inputCls} />
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
                    <p className="mt-1 text-caption text-brand-amber font-bold">
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
                    <input type="text" inputMode="decimal"
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

            {/* Día y horario — igual que Nueva visita y Reprogramar (3-oct-2026) */}
            <div>
                <label className={labelCls}>Día y horario *</label>
                <FechaFranja fecha={form.fechaProgramada} hora={form.horaEstimada}
                    onFecha={v => set('fechaProgramada', v)} onHora={v => set('horaEstimada', v)} />
            </div>
            <div>
                <label className={labelCls}>Prioridad</label>
                <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)} className={inputCls}>
                    {PRIORIDADES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancelar}
                    className="flex-1 py-3 rounded-xl font-bold text-body bg-chip text-secondary active:scale-95 transition-all">
                    Cancelar
                </button>
                <button type="submit"
                    className="flex-1 py-3 rounded-xl font-bold text-body bg-brand-red text-white active:scale-95 transition-all">
                    {orden ? 'Guardar cambios' : 'Crear orden'}
                </button>
            </div>
        </form>
    );
}
