import React, { useState, useEffect } from 'react';
import api, { getSedes } from '../services/api';
import toast from 'react-hot-toast';

export default function EquipoForm({ onCreated }) {
    const [sedes, setSedes] = useState([]);
    const [formData, setFormData] = useState({
        numeroSerie: '',
        modelo: '',
        marca: '',
        sedeId: ''
    });
    const [loading, setLoading] = useState(false);

    // Cargar las sedes
    useEffect(() => {
        getSedes().then(res => setSedes(res.data))
            .catch(err => console.error("Error cargando sedes", err));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sedeId || !formData.numeroSerie) {
            toast.error("Falta Sede o Número de Serie");
            return;
        }

        const loadingToast = toast.loading("Registrando equipo...");
        setLoading(true);
        try {
            await api.post('/equipos', formData);
            toast.success('✅ Equipo guardado', { id: loadingToast });
            setFormData({ ...formData, numeroSerie: '', modelo: '', marca: '' }); 
            if (onCreated) onCreated(); 
        } catch (error) {
            toast.error('Error al crear equipo', { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 mb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-2xl">💧</div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        Nuevo Dispenser
                    </h3>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Ficha de Equipo</p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Selector de Sede */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Asignar a Sede</label>
                    <select 
                        name="sedeId" 
                        value={formData.sedeId} 
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                    >
                        <option value="">-- Seleccionar Sede de Destino --</option>
                        {sedes.map(sede => (
                            <option key={sede.id} value={sede.id}>
                                {sede.nombreSede} (ID: {sede.cliente?.id || '?'})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Marca</label>
                    <input 
                        name="marca" 
                        placeholder="ej. Clover" 
                        onChange={handleChange} 
                        value={formData.marca} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Modelo</label>
                    <input 
                        name="modelo" 
                        placeholder="ej. Frío/Calor" 
                        onChange={handleChange} 
                        value={formData.modelo} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                    />
                </div>
                
                <div className="md:col-span-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Número de Serie</label>
                    <div className="relative">
                        <input 
                            name="numeroSerie" 
                            placeholder="S/N OBLIGATORIO" 
                            onChange={handleChange} 
                            value={formData.numeroSerie} 
                            className="w-full p-5 pl-12 bg-blue-50/50 dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/50 rounded-2xl text-base font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-blue-300" 
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 font-black text-lg">#</span>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="md:col-span-2 mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {loading ? 'Sincronizando...' : '🚀 Registrar Dispenser'}
                </button>
            </form>
        </div>
    );
}