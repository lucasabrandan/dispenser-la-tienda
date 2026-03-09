import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Input from './ui/Input';

export default function SedeModal({ cliente, sedes, onRefresh, onClose }) {
    // ✅ Estado actualizado con todos los campos de logística
    const [form, setForm] = useState({ 
        nombreSede: '', 
        calle: '', 
        numero: '', 
        piso: '', 
        depto: '', 
        localidad: '', 
        provincia: 'Buenos Aires',
        notas: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombreSede || !form.calle || !form.numero) {
            return toast.error("Nombre, Calle y Número son obligatorios");
        }
        
        const loading = toast.loading("Guardando sede...");
        try {
            // 🏗️ Armamos la dirección completa para el GPS antes de enviar
            const direccionFull = `${form.calle} ${form.numero}${form.piso ? `, Piso ${form.piso}` : ""}${form.depto ? ` Depto ${form.depto}` : ""}, ${form.localidad}`.trim();

            await api.post('/sedes', { 
                ...form, 
                clienteId: cliente.id,
                direccion: direccionFull // Enviamos la dirección "cocinada" para la lista
            });

            toast.success("Sede añadida con éxito", { id: loading });
            setForm({ nombreSede: '', calle: '', numero: '', piso: '', depto: '', localidad: '', provincia: 'Buenos Aires', notas: '' });
            onRefresh();
        } catch (err) { 
            toast.error("Error al conectar con el servidor", { id: loading }); 
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-t-[3.5rem] p-10 shadow-2xl animate-slide-up h-[90vh] flex flex-col">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase text-center">📍 Sedes de {cliente.nombre}</h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2 mt-4">
                    {sedes.length === 0 ? (
                        <div className="text-center py-10 opacity-30 font-bold uppercase text-xs">Sin sedes cargadas</div>
                    ) : (
                        sedes.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
                                <div className="flex-1">
                                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase">{s.nombreSede}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{s.direccion} • {s.localidad}</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* 📍 Botón de GPS Directo */}
                                    <button 
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion + ", " + s.provincia + ", Argentina")}`, '_blank')}
                                        className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-3 rounded-xl"
                                    >📍</button>
                                    <button onClick={() => api.delete(`/sedes/${s.id}`).then(onRefresh)} className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl text-rose-500">🗑️</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3 pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-700 overflow-y-auto">
                    <p className="text-[10px] font-black text-blue-500 uppercase text-center mb-2">Nueva Ubicación Logística</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Nombre (Ej: Depósito)" value={form.nombreSede} onChange={e => setForm({...form, nombreSede: e.target.value})} />
                        <Input label="Calle" value={form.calle} onChange={e => setForm({...form, calle: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <Input label="Nro" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} />
                        <Input label="Piso" value={form.piso} onChange={e => setForm({...form, piso: e.target.value})} />
                        <Input label="Depto" value={form.depto} onChange={e => setForm({...form, depto: e.target.value})} />
                        <Input label="Localidad" value={form.localidad} onChange={e => setForm({...form, localidad: e.target.value})} />
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-xs uppercase">Cerrar</button>
                        <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">+ Registrar Sede</button>
                    </div>
                </form>
            </div>
        </div>
    );
}