import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import ClienteForm from './ClienteForm';
import SedeModal from './SedeModal';
import EquipoModal from './EquipoModal';

export default function ClienteManager() {
    // --- ESTADOS ---
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalOpen, setModalOpen] = useState(null); 
    const [selectedCliente, setSelectedCliente] = useState(null);
    
    // 1. Estado inicial con TODOS los campos de la DB incluyendo NOTAS
    const initialForm = { 
        id: null, 
        nombre: '', 
        calle: '', 
        numero: '', 
        piso: '', 
        depto: '', 
        localidad: '', 
        provincia: 'Buenos Aires', 
        telefono: '', 
        cuilDni: '',
        notas: '' // ✅ Implementado
    };
    
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        try {
            const [resCli, resSed, resEqu] = await Promise.all([
                api.get('/clientes'),
                api.get('/sedes'),
                api.get('/equipos')
            ]);
            setClientes(resCli.data);
            setSedes(resSed.data);
            setEquipos(resEqu.data);
        } catch (err) {
            console.error("Error al cargar datos:", err);
            toast.error("Error al conectar con el servidor");
        }
    };

    // --- LOGÍSTICA ---
    const abrirWhatsApp = (telefono, nombre) => {
        if (!telefono) return toast.error("Sin teléfono cargado");
        let num = telefono.replace(/\D/g, '');
        if (!num.startsWith('54')) num = '549' + num;
        window.open(`https://wa.me/${num}?text=Hola%20${nombre}`, '_blank');
    };

    const abrirMaps = (c) => {
        const calle = (c.calle || '').trim();
        const numero = (c.numero || '').trim();
        const localidad = (c.localidad || '').trim();
        const provincia = (c.provincia || '').trim();
        
        let destino = "";
        if (calle !== "" && numero !== "") {
            destino = `${calle} ${numero}, ${localidad}, ${provincia}, Argentina`;
        } else if (c.direccion) {
            destino = `${c.direccion}, Argentina`;
        }

        destino = destino.replace(/undefined/g, '').replace(/\s+/g, ' ').trim();

        if (destino === "" || destino === ", Argentina") {
            return toast.error("Dirección incompleta para el GPS");
        }
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`, '_blank');
    };

    // --- GUARDADO ---
    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.nombre || !form.calle) return toast.error("Nombre y Calle son obligatorios");

        const loading = toast.loading("Guardando...");
        try {
            // Mandamos los campos individuales + la direccion combinada + notas
            const payload = { 
                ...form, 
                direccion: `${form.calle} ${form.numero}, ${form.localidad}`.trim(),
                clienteTipo: "PARTICULAR"
            };

            if (form.id) {
                await api.put(`/clientes/${form.id}`, payload);
                toast.success("✅ Cambios guardados", { id: loading });
            } else {
                await api.post('/clientes', payload);
                toast.success("✅ Nuevo cliente registrado", { id: loading });
            }

            setModalOpen(null);
            cargarDatos();
        } catch (err) {
            toast.error("Error al guardar en la DB", { id: loading });
        }
    };

    const eliminarCliente = async (id) => {
        if (!window.confirm("¿Eliminar cliente?")) return;
        try {
            await api.delete(`/clientes/${id}`);
            toast.success("Eliminado");
            cargarDatos();
        } catch (err) { toast.error("Error"); }
    };

    const filtrados = clientes.filter(c =>
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.localidad || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="w-full">
            {/* BUSCADOR */}
            <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md -mx-4 md:-mx-12 px-4 md:px-12 py-6 mb-8 border-b border-slate-200 dark:border-slate-800 transition-all">
                <input
                    placeholder="Buscar cliente o localidad..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full py-5 px-8 bg-white dark:bg-slate-900 rounded-[2rem] border-none font-bold text-slate-900 dark:text-white shadow-xl outline-none"
                />
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-10 px-2">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Directorio</h2>
                <button
                    onClick={() => { setForm(initialForm); setModalOpen('cliente'); }}
                    className="bg-blue-600 text-white h-16 px-10 rounded-3xl font-black text-xs uppercase shadow-2xl active:scale-95 transition-all"
                >
                    + NUEVO
                </button>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtrados.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight group-hover:text-blue-600">{c.nombre}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                                    {c.calle} {c.numero} {c.piso && `• P:${c.piso}`} {c.depto && ` D:${c.depto}`}
                                    <br />
                                    {c.localidad} • {c.provincia}
                                </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl text-xl">👤</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => abrirMaps(c)} className="bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">📍 Cómo llegar</button>
                            <button onClick={() => abrirWhatsApp(c.telefono, c.nombre)} className="bg-[#25D366] text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">💬 WhatsApp</button>
                        </div>

                        {/* ACCIONES TÉCNICAS */}
                        <div className="grid grid-cols-4 gap-2 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                            <button onClick={() => { setSelectedCliente(c); setModalOpen('sede'); }} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">🏠</button>
                            <button onClick={() => { setSelectedCliente(c); setModalOpen('equipo'); }} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">💧</button>
                            
                            {/* BOTÓN EDITAR MAPEADO CON NOTAS ✅ */}
                            <button 
                                onClick={() => { 
                                    setForm({
                                        id: c.id,
                                        nombre: c.nombre || '',
                                        calle: c.calle || '',
                                        numero: c.numero || '',
                                        piso: c.piso || '',
                                        depto: c.depto || '',
                                        localidad: c.localidad || '',
                                        provincia: c.provincia || 'Buenos Aires',
                                        telefono: c.telefono || '',
                                        cuilDni: c.cuilDni || '',
                                        notas: c.notas || '' // ✅ Mapeo de notas
                                    }); 
                                    setModalOpen('cliente'); 
                                }} 
                                className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl"
                            >✏️</button>
                            
                            <button onClick={() => eliminarCliente(c.id)} className="flex flex-col items-center p-3 bg-rose-50 dark:bg-rose-900/10 rounded-2xl text-rose-500">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODALES */}
            {modalOpen === 'cliente' && (
                <ClienteForm form={form} setForm={setForm} errors={errors} onSubmit={handleGuardar} onClose={() => setModalOpen(null)} />
            )}

            {modalOpen === 'sede' && selectedCliente && (
                <SedeModal cliente={selectedCliente} sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)} onRefresh={cargarDatos} onClose={() => setModalOpen(null)} />
            )}

            {modalOpen === 'equipo' && selectedCliente && (
                <EquipoModal cliente={selectedCliente} sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)} equipos={equipos.filter(eq => eq.sede?.cliente?.id === selectedCliente.id)} onRefresh={cargarDatos} onClose={() => setModalOpen(null)} />
            )}
        </div>
    );
}