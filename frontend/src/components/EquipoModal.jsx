import React, { useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const MARCAS  = ['BACOPE', 'HUMMA', 'TERMOPLAST', 'TRIA', 'USHUAIA', 'OTRA'];
const MODELOS = ['RED', 'BIDÓN', 'MESADA + RED', 'MESADA + BIDÓN', 'OTROS'];

const INITIAL_FORM = {
    numeroSerie: '', marca: '', otraMarca: '', modelo: '',
    sedeId: '', ubicacion: '', piso: '', sector: '', observaciones: ''
};

// Estilo común para inputs y selects del sistema
const fieldCls = `
    w-full h-12 px-4 rounded-xl
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
    border border-black/[0.07] dark:border-white/[0.07]
    font-bold text-[11px] uppercase outline-none
    text-[#1C1917] dark:text-[#F0EEE9]
    focus:ring-2 focus:ring-[#D13A28]/20
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    transition-all appearance-none
`;

export default function EquipoModal({ cliente, sedes, equipos = [], equipoParaEditar, onRefresh, onClose }) {
    const [form, setForm] = React.useState(INITIAL_FORM);
    const [cargando, setCargando] = React.useState(false);

    useEffect(() => {
        if (equipoParaEditar) {
            setForm({
                numeroSerie:   equipoParaEditar.numeroSerie   || '',
                marca:         equipoParaEditar.marca         || '',
                otraMarca:     '',
                modelo:        equipoParaEditar.modelo        || '',
                sedeId:        equipoParaEditar.sedeId         || '',
                ubicacion:     equipoParaEditar.ubicacion     || '',
                piso:          equipoParaEditar.piso          || '',
                sector:        equipoParaEditar.sector        || '',
                observaciones: equipoParaEditar.observaciones || ''
            });
        } else {
            setForm(INITIAL_FORM);
        }
    }, [equipoParaEditar]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sedeId)      return toast.error('Seleccioná una sede');
        if (!form.numeroSerie) return toast.error('El número de serie es obligatorio');
        if (!form.marca)       return toast.error('Seleccioná una marca');
        if (!form.modelo)      return toast.error('Seleccioná un modelo');
        if (form.marca === 'OTRA' && !form.otraMarca.trim()) return toast.error('Escribí el nombre de la marca');

        const marcaFinal = form.marca === 'OTRA' ? form.otraMarca.trim().toUpperCase() : form.marca;
        const payload = {
            sedeId:        parseInt(form.sedeId),
            numeroSerie:   form.numeroSerie.trim().toUpperCase(),
            marca:         marcaFinal,
            modelo:        form.modelo,
            ubicacion:     form.ubicacion.trim() || null,
            piso:          form.piso.trim() || null,
            sector:        form.sector.trim() || null,
            observaciones: form.observaciones.trim() || null
        };

        const loading = toast.loading(equipoParaEditar ? 'Actualizando ficha...' : 'Guardando ficha técnica...');
        setCargando(true);
        try {
            if (equipoParaEditar) {
                await api.put(`/equipos/${equipoParaEditar.id}`, payload);
                toast.success('Equipo actualizado', { id: loading });
            } else {
                await api.post('/equipos', payload);
                toast.success('Equipo vinculado', { id: loading });
            }
            onRefresh();
            onClose();
        } catch (err) {
            const data = err.response?.data;
            toast.error(typeof data === 'string' ? data : data?.mensaje || data?.message || 'Error en la operación', { id: loading });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-[#EDEAE6] dark:bg-[#242424] w-full max-w-xl rounded-t-[2rem] shadow-2xl animate-slide-up h-[92vh] flex flex-col">

                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1 bg-[#C0BCB6] dark:bg-[#2E2E2E] rounded-full" />
                </div>

                {/* Título */}
                <div className="px-6 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                    <h3 className="text-lg font-black text-[#D13A28] dark:text-[#E8422F] uppercase tracking-tighter leading-none">
                        {equipoParaEditar ? 'Editar Dispenser' : 'Inventario de Equipos'}
                    </h3>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase mt-1">{cliente.nombre}</p>
                </div>

                {/* Lista de equipos existentes (solo en modo crear) */}
                {!equipoParaEditar && (
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                        {equipos.length === 0 ? (
                            <div className="text-center py-10 font-black uppercase text-[10px] text-[#A8A29E] border-2 border-dashed border-black/[0.07] dark:border-white/[0.07] rounded-2xl">
                                Sin equipos instalados
                            </div>
                        ) : (
                            equipos.map(eq => (
                                <div key={eq.id} className="p-4 bg-[#D8D4CE] dark:bg-[#1C1C1C] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] flex justify-between items-center">
                                    <div>
                                        <p className="font-black text-[12px] text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none mb-1">
                                            S/N: {eq.numeroSerie}
                                        </p>
                                        <p className="text-[9px] font-bold text-[#D48800] dark:text-[#F0A500] uppercase">
                                            {eq.marca} · {eq.modelo}
                                        </p>
                                    </div>
                                    <span className="text-[8px] font-black bg-[#EDEAE6] dark:bg-[#242424] px-3 py-1.5 rounded-xl border border-black/[0.07] dark:border-white/[0.07] uppercase text-[#A8A29E]">
                                        {sedes.find(s => s.id === eq.sedeId)?.nombreSede}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Formulario */}
                <form
                    onSubmit={handleSubmit}
                    className={`space-y-3 px-6 pb-6 pt-4 overflow-y-auto ${!equipoParaEditar ? 'border-t border-black/[0.07] dark:border-white/[0.07]' : 'flex-1'}`}
                >
                    {/* Sede */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Ubicación (Sede)</label>
                        <select className={fieldCls} value={form.sedeId} onChange={e => setForm({ ...form, sedeId: e.target.value })}>
                            <option value="">¿Dónde está el equipo?</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                        </select>
                    </div>

                    {/* S/N + Marca */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Nro de Serie</label>
                            <input className={fieldCls} placeholder="S/N..."
                                value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Marca</label>
                            <select className={fieldCls} value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })}>
                                <option value="">Marca...</option>
                                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.marca === 'OTRA' && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Nombre de Marca</label>
                            <input className={fieldCls} placeholder="Escribir marca..."
                                value={form.otraMarca} onChange={e => setForm({ ...form, otraMarca: e.target.value })} />
                        </div>
                    )}

                    {/* Modelo */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Modelo / Tipo</label>
                        <select className={fieldCls} value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })}>
                            <option value="">Seleccionar tipo...</option>
                            {MODELOS.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                        </select>
                    </div>

                    {/* Ubicación + Piso + Sector */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Ubicación Interna</label>
                            <input className={fieldCls} placeholder="Ej: Recepción"
                                value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Piso</label>
                            <input className={fieldCls} placeholder="Ej: 3, PB, Sub"
                                value={form.piso} onChange={e => setForm({ ...form, piso: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Sector / Área</label>
                        <input className={fieldCls} placeholder="Ej: ERAM, Administración, Guardia..."
                            value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
                    </div>

                    {/* Notas */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#A8A29E] uppercase ml-1">Notas Técnicas</label>
                        <textarea
                            className={`${fieldCls} h-20 resize-none py-3`}
                            placeholder="Comentarios..."
                            value={form.observaciones}
                            onChange={e => setForm({ ...form, observaciones: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 h-14 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-2xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95 disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={cargando}
                            className="flex-[2] h-14 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-2xl font-black text-[11px] uppercase shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                            {cargando
                                ? 'Guardando...'
                                : equipoParaEditar ? 'Guardar Cambios' : '+ Vincular Dispenser'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
