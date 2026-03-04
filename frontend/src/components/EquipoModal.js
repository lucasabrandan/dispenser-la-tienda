import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Input from './ui/Input';

export default function EquipoModal({ cliente, sedes, equipos, onRefresh, onClose }) {
    const [form, setForm] = useState({ numeroSerie: '', marca: '', modelo: '', sedeId: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sedeId || !form.numeroSerie) return toast.error("Elegí sede y poné el Nro de Serie");
        
        const loading = toast.loading("Vinculando equipo...");
        try {
            await api.post('/equipos', form);
            toast.success("Equipo vinculado", { id: loading });
            setForm({ numeroSerie: '', marca: '', modelo: '', sedeId: '' });
            onRefresh();
        } catch (err) { toast.error("Error", { id: loading }); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-t-[3.5rem] p-10 shadow-2xl animate-slide-up h-[85vh] flex flex-col">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-black text-blue-600 mb-2 uppercase text-center">💧 Equipos de {cliente.nombre}</h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2 mt-4">
                    {equipos.length === 0 ? (
                        <div className="text-center py-10 opacity-30 font-bold uppercase text-xs">Sin equipos instalados</div>
                    ) : (
                        equipos.map(eq => (
                            <div key={eq.id} className="p-5 bg-blue-50/30 dark:bg-slate-900/50 rounded-[1.5rem] border border-blue-100 dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-black text-sm text-slate-900 dark:text-white uppercase leading-none">S/N: {eq.numeroSerie}</p>
                                        <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase">{eq.marca} {eq.modelo}</p>
                                    </div>
                                    <span className="text-[9px] font-black bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 uppercase">
                                        📍 {eq.sede?.nombreSede}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3 pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-700">
                    <div className="mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Instalar en Sede:</label>
                        <select 
                            className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 font-bold text-sm outline-none text-slate-900 dark:text-white border-none"
                            value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value})}
                        >
                            <option value="">Seleccionar Ubicación...</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombreSede} ({s.direccion})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Nro Serie" value={form.numeroSerie} onChange={e => setForm({...form, numeroSerie: e.target.value})} />
                        <Input label="Marca" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-xs uppercase">Cerrar</button>
                        <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">+ Vincular</button>
                    </div>
                </form>
            </div>
        </div>
    );
}