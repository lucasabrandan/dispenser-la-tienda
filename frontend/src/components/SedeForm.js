import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function SedeForm({ onCreated }) {
    const [data, setData] = useState({ nombre: '', sede: '', direccion: '' });

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const resCli = await api.post('/clientes', { nombre: data.nombre, cuilDni: "0", clienteTipo: "EMPRESA" });
            await api.post('/sedes', { clienteId: resCli.data.id, nombreSede: data.sede, direccion: data.direccion });
            toast.success('Cliente registrado con éxito');
            setData({ nombre: '', sede: '', direccion: '' }); // Limpiamos el form al terminar
            if (onCreated) onCreated();
        } catch (error) { toast.error('Error al guardar cliente'); }
    }

    return (
        <div className="p-5 bg-blue-50 dark:bg-slate-800/60 rounded-2xl mb-5 border border-blue-100 dark:border-slate-700 transition-colors duration-300">
            <h4 className="mt-0 mb-4 font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <span className="text-xl">👤</span> Registrar Nuevo Cliente
            </h4>
            
            <div className="grid gap-3">
                <input 
                    placeholder="Nombre / Empresa" 
                    value={data.nombre} 
                    onChange={e => setData({...data, nombre: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                
                <input 
                    placeholder="Nombre de la Sede (Ej: Casa Central)" 
                    value={data.sede} 
                    onChange={e => setData({...data, sede: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                
                <input 
                    placeholder="Dirección" 
                    value={data.direccion} 
                    onChange={e => setData({...data, direccion: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                
                <button 
                    onClick={handleSubmit} 
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[15px] py-3.5 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                    GUARDAR CLIENTE
                </button>
            </div>
        </div>
    );
}