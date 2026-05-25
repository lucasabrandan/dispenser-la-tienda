import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import DateInput from '../ui/DateInput';

const PRIORIDADES = [
    { value: 'BAJA',    label: 'Baja'    },
    { value: 'NORMAL',  label: 'Normal'  },
    { value: 'ALTA',    label: 'Alta'    },
    { value: 'URGENTE', label: 'Urgente' },
];

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

/**
 * ModalDespachoRapido
 * Crea una orden de visita vinculada a un presupuesto sin salir de ServicioManager.
 * Props:
 *   presupuesto  — { id, clienteId, clienteNombre, tecnicoId, nroDocumento }
 *   onCreada     — callback al guardar exitosamente
 *   onCerrar     — callback para cerrar sin guardar
 */
export default function ModalDespachoRapido({ presupuesto, onCreada, onCerrar }) {
    const [tecnicos,   setTecnicos]   = useState([]);
    const [tecnicoId,  setTecnicoId]  = useState(presupuesto?.tecnicoId || '');
    const [fecha,      setFecha]      = useState('');
    const [hora,       setHora]       = useState('');
    const [prioridad,  setPrioridad]  = useState('NORMAL');
    const [guardando,  setGuardando]  = useState(false);

    useEffect(() => {
        api.get('/admin/usuarios')
            .then(r => setTecnicos((r.data || []).filter(u => u.activo)))
            .catch(() => {});
        // Pre-completar fecha con hoy
        setFecha(new Date().toISOString().split('T')[0]);
    }, []);

    const titulo = presupuesto?.nroDocumento
        ? `Visita — ${presupuesto.nroDocumento}`
        : `Visita — ${presupuesto?.clienteNombre || 'Cliente'}`;

    const handleGuardar = async () => {
        if (!tecnicoId) { toast.error('Seleccioná un técnico'); return; }
        if (!fecha)     { toast.error('Ingresá una fecha');      return; }
        setGuardando(true);
        try {
            await api.post('/ordenes', {
                titulo,
                clienteId:     presupuesto?.clienteId ? parseInt(presupuesto.clienteId) : null,
                clienteNombre: presupuesto?.clienteNombre || '',
                presupuestoId: presupuesto?.id,
                tecnicoId:     Number(tecnicoId),
                fechaProgramada: fecha,
                horaEstimada:  hora || null,
                prioridad,
                descripcion:   '',
            });
            toast.success('Orden de visita creada');
            onCreada();
        } catch {
            toast.error('No se pudo crear la orden');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={onCerrar}>
            <div className="w-full sm:max-w-md bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl sm:rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}>

                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-[#E8E5E0] dark:bg-[#2E2E2E] sm:hidden" />

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Despachar presupuesto</p>
                    <h2 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-tight">
                        {presupuesto?.clienteNombre || 'Cliente'}
                    </h2>
                    {presupuesto?.nroDocumento && (
                        <p className="text-[11px] text-[#A8A29E] mt-0.5">{presupuesto.nroDocumento}</p>
                    )}
                </div>

                {/* Formulario */}
                <div className="px-5 py-4 space-y-4">

                    {/* Técnico */}
                    <div>
                        <label className={labelCls}>Técnico asignado *</label>
                        <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className={inputCls}>
                            <option value="">Seleccionar técnico...</option>
                            {tecnicos.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha + Hora */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Fecha *</label>
                            <DateInput value={fecha} onChange={setFecha} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Hora est.</label>
                            <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Prioridad */}
                    <div>
                        <label className={labelCls}>Prioridad</label>
                        <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className={inputCls}>
                            {PRIORIDADES.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 px-5 pb-6">
                    <button onClick={onCerrar}
                        className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={guardando || !tecnicoId || !fecha}
                        className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white active:scale-95 transition-all bg-[#D48800] dark:bg-[#F0A500] disabled:opacity-40">
                        {guardando ? 'Creando...' : '🚀 Crear orden de visita'}
                    </button>
                </div>
            </div>
        </div>
    );
}
