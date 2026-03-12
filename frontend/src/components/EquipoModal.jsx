import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Input from './ui/Input';

export default function EquipoModal({ cliente, sedes, equipos = [], equipoParaEditar, onRefresh, onClose }) {
    const [form, setForm] = useState({ 
        numeroSerie: '', 
        marca: '', 
        modelo: '', 
        sedeId: '', 
        ubicacion: '', 
        observaciones: '',
        otraMarca: '' 
    });

    const MARCAS = ["BACOPE", "HUMMA", "TERMOPLAST", "TRIA", "USHUAIA", "OTRA"];
    const MODELOS = ["RED", "BIDÓN", "MESADA + RED", "MESADA + BIDÓN", "OTROS"];

    useEffect(() => {
        if (equipoParaEditar) {
            setForm({
                numeroSerie: equipoParaEditar.numeroSerie || '',
                marca: equipoParaEditar.marca || '',
                modelo: equipoParaEditar.modelo || '',
                sedeId: equipoParaEditar.sede?.id || '',
                ubicacion: equipoParaEditar.ubicacion || '',
                observaciones: equipoParaEditar.observaciones || '',
                otraMarca: ''
            });
        }
    }, [equipoParaEditar]);

    const fieldStyle = "w-full h-14 px-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none font-bold text-[11px] uppercase outline-none text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-blue-500 appearance-none";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sedeId || !form.numeroSerie) return toast.error("Faltan datos críticos (Sede o S/N)");
        
        const marcaFinal = form.marca === "OTRA" ? form.otraMarca.toUpperCase() : form.marca;
        const loading = toast.loading(equipoParaEditar ? "Actualizando ficha..." : "Guardando ficha técnica...");

        try {
            const payload = { ...form, marca: marcaFinal };
            
            if (equipoParaEditar) {
                await api.put(`/equipos/${equipoParaEditar.id}`, payload);
                toast.success("Equipo actualizado con éxito", { id: loading });
            } else {
                await api.post('/equipos', payload);
                toast.success("Equipo vinculado con éxito", { id: loading });
            }

            onRefresh();
            onClose();
        } catch (err) { 
            const backendError = err.response?.data?.message || err.response?.data;
            const errorMsg = typeof backendError === 'object' ? "Error en los datos" : (backendError || "Error en la operación");
            toast.error(errorMsg, { id: loading }); 
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-t-[3.5rem] p-8 md:p-10 shadow-2xl animate-slide-up h-[92vh] flex flex-col">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                
                <header className="mb-6 text-center">
                    <h3 className="text-xl font-black text-blue-600 uppercase tracking-tighter leading-none">
                        {equipoParaEditar ? '✏️ Editar Dispenser' : '💧 Inventario de Equipos'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{cliente.nombre}</p>
                </header>
                
                {!equipoParaEditar && (
                    <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                        {equipos.length === 0 ? (
                            <div className="text-center py-10 opacity-20 font-black uppercase text-[10px] border-2 border-dashed border-slate-200 rounded-[2rem]">Sin equipos instalados</div>
                        ) : (
                            equipos.map(eq => (
                                <div key={eq.id} className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                    <div>
                                        <p className="font-black text-xs text-slate-900 dark:text-white uppercase leading-none mb-1">S/N: {eq.numeroSerie}</p>
                                        <p className="text-[9px] font-bold text-blue-500 uppercase">{eq.marca} • {eq.modelo}</p>
                                    </div>
                                    <span className="text-[8px] font-black bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 uppercase text-slate-400">
                                        {eq.sede?.nombreSede}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={`space-y-4 pt-6 ${!equipoParaEditar ? 'border-t-2 border-dashed border-slate-100 dark:border-slate-700' : ''} overflow-y-auto pr-2`}>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Ubicación (Sede)</label>
                        <select className={fieldStyle} value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value})}>
                            <option value="">¿Dónde está el equipo?</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="NRO DE SERIE" value={form.numeroSerie} onChange={e => setForm({...form, numeroSerie: e.target.value})} />
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Marca</label>
                            <select className={fieldStyle} value={form.marca} onChange={e => setForm({...form, marca: e.target.value})}>
                                <option value="">MARCA...</option>
                                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.marca === "OTRA" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <Input label="ESCRIBIR NOMBRE DE MARCA" value={form.otraMarca} onChange={e => setForm({...form, otraMarca: e.target.value})} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Modelo/Tipo</label>
                            <select className={fieldStyle} value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                                <option value="">SELECCIONAR TIPO...</option>
                                {MODELOS.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                            </select>
                        </div>
                        <Input label="UBICACIÓN INTERNA" value={form.ubicacion} onChange={e => setForm({...form, ubicacion: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Notas Técnicas</label>
                        <textarea 
                            className="w-full p-5 rounded-[2rem] bg-slate-100 dark:bg-slate-900 border-none font-bold text-[11px] uppercase outline-none text-slate-900 dark:text-white min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Comentarios..."
                            value={form.observaciones}
                            onChange={e => setForm({...form, observaciones: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl font-black text-[11px] uppercase transition-all active:scale-95">Cancelar</button>
                        <button type="submit" className="flex-[2] h-16 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-blue-700">
                            {equipoParaEditar ? 'Guardar Cambios' : '+ Vincular Dispenser'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}