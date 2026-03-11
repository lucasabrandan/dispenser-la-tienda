import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import ClienteForm from './ClienteForm';
import SedeModal from './SedeModal';
import EquipoModal from './EquipoModal';

export default function ClienteManager() {
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalOpen, setModalOpen] = useState(null); 
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedEquipo, setSelectedEquipo] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [errors, setErrors] = useState({});
    
    const initialForm = { 
        id: null, nombre: '', calle: '', numero: '', piso: '', depto: '', 
        localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '', 
        notas: '', condicionIva: '' 
    };
    
    const [form, setForm] = useState(initialForm);

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        try {
            const [resCli, resSed, resEqu] = await Promise.all([
                api.get('/clientes?page=0&size=1000'),
                api.get('/sedes?page=0&size=1000'),
                api.get('/equipos?page=0&size=1000')
            ]);
            
            // CAMBIO: Extraer .content de la Page
            const clientes = resCli.data.content || resCli.data;
            const sedes = resSed.data.content || resSed.data;
            const equipos = resEqu.data.content || resEqu.data;
            
            setClientes(clientes);
            setSedes(sedes);
            setEquipos(equipos);
        } catch (err) {
            toast.error("Error de conexión");
        }
    };

    const abrirWhatsApp = (telefono, nombre) => {
        if (!telefono) return toast.error("Sin teléfono");
        let num = telefono.replace(/\D/g, '');
        if (!num.startsWith('54')) num = '549' + num;
        window.open(`https://wa.me/${num}?text=Hola%20${nombre}`, '_blank');
    };

    const abrirMaps = (c) => {
        const destino = `${c.calle} ${c.numero}, ${c.localidad}, Argentina`.trim();
        if (!c.calle) return toast.error("Dirección incompleta");
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`, '_blank');
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        const loading = toast.loading("Guardando...");
        try {
            const payload = { ...form, clienteTipo: "PARTICULAR" };
            if (form.id) await api.put(`/clientes/${form.id}`, payload);
            else await api.post('/clientes', payload);
            toast.success("✅ Guardado", { id: loading });
            setModalOpen(null);
            cargarDatos();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al guardar", { id: loading });
        }
    };

    const eliminarCliente = async (id) => {
        if (!window.confirm("¿Eliminar cliente y todo su historial?")) return;
        try {
            await api.delete(`/clientes/${id}`);
            toast.success("Eliminado");
            cargarDatos();
        } catch (err) { toast.error("Error al eliminar"); }
    };

    const filtrados = clientes.filter(c => {
        const term = busqueda.toLowerCase();
        const matchCliente = c.nombre?.toLowerCase().includes(term) || c.localidad?.toLowerCase().includes(term);
        const sedesId = sedes.filter(s => s.cliente?.id === c.id).map(s => s.id);
        const matchEquipo = equipos.some(eq => sedesId.includes(eq.sede?.id) && eq.numeroSerie?.toLowerCase().includes(term));
        return matchCliente || matchEquipo;
    });

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-20">
            {/* BUSCADOR GLASS */}
            <div className="sticky top-0 z-30 py-6 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl -mx-4 px-4 border-b border-slate-200 dark:border-slate-800 mb-8">
                <div className="relative max-w-3xl mx-auto">
                    <input
                        placeholder="Buscar por cliente, ciudad o S/N..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full py-4 pl-12 pr-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                </div>
            </div>

            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Directorio</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Gestión de Flota</p>
                </div>
                <button onClick={() => { setForm(initialForm); setModalOpen('cliente'); }} className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ NUEVO</button>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtrados.map(c => {
                    const sedesCli = sedes.filter(s => s.cliente?.id === c.id);
                    const eqCli = equipos.filter(eq => sedesCli.map(s => s.id).includes(eq.sede?.id));
                    const isExpanded = expandedId === c.id;

                    return (
                        <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
                            
                            <div className="p-8 pb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none mb-2">{c.nombre}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <button 
                                                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                                className={`text-[9px] font-black px-3 py-1 rounded-full border transition-all ${isExpanded ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600'}`}
                                            >
                                                💧 {eqCli.length} EQUIPOS {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">👤</div>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">📍 {c.calle} {c.numero} • {c.localidad}</p>
                            </div>

                            {/* SECCIÓN EXPANDIBLE (INVENTARIO) */}
                            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
                                <div className="px-8 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800">
                                    <div className="space-y-5 mt-4">
                                        {sedesCli.map(sede => (
                                            <div key={sede.id} className="space-y-2">
                                                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">🏠 {sede.nombreSede}</p>
                                                <div className="grid gap-2 ml-4">
                                                    {eqCli.filter(eq => eq.sede?.id === sede.id).map(eq => (
                                                        <div key={eq.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group/item transition-all hover:border-blue-400">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none">{eq.marca} {eq.modelo}</p>
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">S/N: {eq.numeroSerie}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {eq.ubicacion && <span className="text-[7px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-md uppercase border border-blue-100 dark:border-blue-800">{eq.ubicacion}</span>}
                                                                
                                                                <button 
                                                                    onClick={() => { setSelectedEquipo(eq); setSelectedCliente(c); setModalOpen('equipo'); }}
                                                                    className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <span className="text-[10px]">✏️</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <button onClick={() => { setSelectedCliente(c); setModalOpen('sede'); }} className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[9px] uppercase hover:bg-slate-300 transition-all">+ Sede</button>
                                        <button onClick={() => { setSelectedCliente(c); setSelectedEquipo(null); setModalOpen('equipo'); }} className="flex-1 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl font-black text-[9px] uppercase hover:bg-blue-200 transition-all">+ Equipo</button>
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES FOOTER */}
                            <div className="px-8 py-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                <div className="flex gap-2">
                                    <button onClick={() => abrirMaps(c)} className="w-10 h-10 bg-slate-900 dark:bg-slate-700 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md">📍</button>
                                    <button onClick={() => abrirWhatsApp(c.telefono, c.nombre)} className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md">💬</button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setForm({ ...c, id: c.id }); setModalOpen('cliente'); }} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                                    <button onClick={() => eliminarCliente(c.id)} className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">🗑️</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODALES */}
            {modalOpen === 'cliente' && (
                <ClienteForm form={form} setForm={setForm} errors={errors} onSubmit={handleGuardar} onClose={() => setModalOpen(null)} />
            )}

            {modalOpen === 'sede' && selectedCliente && (
                <SedeModal 
                    cliente={selectedCliente} 
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)} 
                    onRefresh={cargarDatos} 
                    onClose={() => setModalOpen(null)} 
                />
            )}

            {modalOpen === 'equipo' && selectedCliente && (
                <EquipoModal 
                    cliente={selectedCliente} 
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)} 
                    equipoParaEditar={selectedEquipo}
                    onRefresh={() => { cargarDatos(); setSelectedEquipo(null); }} 
                    onClose={() => { setModalOpen(null); setSelectedEquipo(null); }} 
                />
            )}
        </div>
    );
}
