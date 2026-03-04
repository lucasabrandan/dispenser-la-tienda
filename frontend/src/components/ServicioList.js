import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Utilidades
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioList({ onEditar }) {
    const [servicios, setServicios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    const cargarServicios = () => {
        api.get('/servicios')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setServicios(data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
            })
            .catch(() => toast.error("Error al conectar con el historial"));
    };

    const aprobarPresupuesto = async (id) => {
        const loading = toast.loading("Confirmando operación...");
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: "REALIZADO" });
            toast.success("✅ ¡Confirmado!", { id: loading });
            cargarServicios(); 
        } catch (err) { toast.error("Error al procesar", { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        if(window.confirm("⚠️ ¿Eliminar permanentemente este registro?")) {
            try {
                await api.delete(`/servicios/${id}`);
                toast.success("🗑️ Registro borrado");
                cargarServicios();
            } catch (err) { toast.error("Error al eliminar"); }
        }
    };

    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;
    
    // --- 🧠 LÓGICA DE FILTRADO COMPLETA ---
    const filtrados = servicios.filter(s => {
        const txt = busqueda.toLowerCase();
        let pasaTab = false;
        if (filtroTab === 'TODOS') pasaTab = true;
        if (filtroTab === 'PRESUPUESTO') pasaTab = s.estado === 'PRESUPUESTO';
        if (filtroTab === 'VENTA') pasaTab = s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO';
        if (filtroTab === 'TECNICA') pasaTab = s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO';

        return pasaTab && (
            (s.clienteNombre?.toLowerCase() || '').includes(txt) || 
            (s.sedeNombre?.toLowerCase() || '').includes(txt) ||
            s.items?.some(it => it.equipoSerial?.toLowerCase().includes(txt))
        );
    });

    const totalVentas = servicios
        .filter(s => s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO')
        .reduce((acc, s) => acc + calcularCosto(s), 0);

    const totalTecnica = servicios
        .filter(s => s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO')
        .reduce((acc, s) => acc + calcularCosto(s), 0);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors duration-300">
            
            {/* --- DASHBOARD SUPERIOR --- */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500 shadow-sm transition-colors duration-300">
                    <p className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-wide m-0">Ventas Insumos</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">$ {totalVentas.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-rose-500 shadow-sm transition-colors duration-300">
                    <p className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wide m-0">Técnica / MO</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">$ {totalTecnica.toLocaleString()}</p>
                </div>
            </div>

            {/* --- BUSCADOR Y TABS (STICKY) --- */}
            <div className="sticky top-2 z-40 bg-slate-50 dark:bg-slate-900 pb-4 transition-colors duration-300">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">🔍</span>
                    <input 
                        placeholder="Buscar cliente, sede o S/N..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)} 
                        className="w-full py-3.5 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[15px] font-semibold text-slate-900 dark:text-white outline-none shadow-sm focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                    />
                </div>
                
                {/* Segmented Control */}
                <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mt-3 transition-colors duration-300">
                    {['TODOS', 'VENTA', 'TECNICA', 'PRESUPUESTO'].map(t => (
                        <button key={t} onClick={() => setFiltroTab(t)}
                            className={`flex-1 py-2.5 px-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all duration-200 ${
                                filtroTab === t 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}>
                            {t === 'PRESUPUESTO' ? 'PENDIENTES' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- LISTADO DE TARJETAS --- */}
            <div className="flex flex-col gap-4 mt-1">
                {filtrados.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex gap-2 items-center mb-2">
                                    <span className="text-xs text-slate-400 font-bold">#{s.id}</span>
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wide ${
                                        s.estado === 'PRESUPUESTO' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                        s.servicioTipo === 'TECNICA' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                        {s.estado === 'PRESUPUESTO' ? 'Pendiente' : s.servicioTipo}
                                    </span>
                                </div>
                                <h4 className="text-lg font-extrabold m-0 text-slate-900 dark:text-white tracking-tight">{s.clienteNombre}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 m-0 mt-1 font-medium">📍 {s.sedeNombre}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">$ {calcularCosto(s).toLocaleString()}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">{s.fecha}</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            
                            {s.estado === 'PRESUPUESTO' && (
                                <button onClick={() => onEditar(s)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl p-2.5 text-base flex items-center justify-center transition-colors">✏️</button>
                            )}
                            
                            <button onClick={() => setModalDetalle(s)} className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl p-2.5 text-base flex items-center justify-center transition-colors">👁️</button>
                            
                            <button onClick={() => generarRemitoPDFPremium({
                                esPresupuesto: s.estado === 'PRESUPUESTO', cliente: { nombre: s.clienteNombre }, sede: { nombreSede: s.sedeNombre },
                                tecnico: "Marcos", ticketItems: s.items.map(it => ({ ...it, totalCalculado: it.costo })), totalFinal: calcularCosto(s), fechaServicio: s.fecha
                            })} className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 rounded-xl p-2.5 text-base flex items-center justify-center transition-colors">📄</button>
                            
                            {s.estado === 'PRESUPUESTO' && (
                                <button onClick={() => aprobarPresupuesto(s.id)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 font-extrabold text-xs shadow-md shadow-blue-500/30 transition-all">COBRAR</button>
                            )}
                            
                            <button onClick={() => eliminarServicio(s.id)} className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl p-2.5 text-base flex items-center justify-center ml-auto transition-colors">🗑️</button>
                        </div>
                    </div>
                ))}

                {filtrados.length === 0 && (
                    <div className="text-center p-10 text-slate-400 font-semibold">
                        No se encontraron registros.
                    </div>
                )}
            </div>

            {/* --- MODAL DE DETALLE --- */}
            {modalDetalle && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end z-[2000] transition-opacity">
                    <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
                        <h3 className="text-lg font-black mb-5 text-slate-900 dark:text-white">Desglose del Servicio</h3>
                        
                        <div className="max-h-[55vh] overflow-y-auto mb-5 pr-1">
                            {modalDetalle.items.map((it, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-600">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-[15px]">{it.equipoSerial}</span>
                                        <span className="font-black text-slate-900 dark:text-white text-base">$ {Number(it.costo).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm m-0 mb-3 text-slate-600 dark:text-slate-300 leading-snug">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-3 font-medium">
                                            <strong className="text-slate-700 dark:text-slate-300">Repuestos:</strong> {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)} className="w-full py-4 bg-slate-900 dark:bg-blue-600 hover:dark:bg-blue-500 text-white rounded-2xl font-extrabold text-[15px] transition-colors">CERRAR</button>
                    </div>
                </div>
            )}
        </div>
    );
}