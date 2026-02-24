import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ClienteManager() {
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalEquipos, setModalEquipos] = useState(null);

    const [form, setForm] = useState({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', nombreSede: 'Casa Central', direccion: '' });
    const [formEquipo, setFormEquipo] = useState({ id: null, numeroSerie: '', marca: '', modelo: '', ubicacion: '', observaciones: '' });

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = () => {
        api.get('/clientes').then(res => setClientes(res.data));
        api.get('/sedes').then(res => setSedes(res.data));
        api.get('/equipos').then(res => setEquipos(res.data));
    };

    const guardarCliente = async (e) => {
        e.preventDefault();
        try {
            if (form.id) {
                await api.put(`/clientes/${form.id}`, form);
                toast.success("✅ Cliente actualizado");
            } else {
                const resCli = await api.post('/clientes', { ...form, clienteTipo: "PARTICULAR" });
                await api.post('/sedes', { clienteId: resCli.data.id, nombreSede: form.nombreSede, direccion: form.direccion });
                toast.success("✅ Cliente y Sede creados");
            }
            setModalAbierto(false);
            cargarDatos();
        } catch (err) { toast.error("❌ Error al guardar cliente"); }
    };

    const eliminarCliente = async (clienteSeleccionado) => {
        const mensajeConfirmacion = `⚠️ ATENCIÓN: ¿Estás seguro de eliminar a "${clienteSeleccionado.nombre}"?\n\nEsto borrará permanentemente sus domicilios, sus dispensers y todo su historial de facturación en la caja.\n\nEsta acción NO se puede deshacer.`;
        
        if(window.confirm(mensajeConfirmacion)) {
            try {
                await api.delete(`/clientes/${clienteSeleccionado.id}`);
                toast.success(`🗑️ ${clienteSeleccionado.nombre} y todos sus registros fueron eliminados.`);
                cargarDatos();
            } catch (err) { 
                const errorData = err.response?.data;
                const mensaje = typeof errorData === 'string' ? errorData : "❌ Error crítico al eliminar.";
                toast.error(mensaje);
            }
        }
    };

    const guardarEquipo = async (e) => {
        e.preventDefault();
        try {
            const sedeDelCliente = sedes.find(s => s.cliente?.id === modalEquipos.id);
            if (!sedeDelCliente) return toast.error("Este cliente no tiene una Sede asignada.");

            if (formEquipo.id) {
                await api.put(`/equipos/${formEquipo.id}`, { ...formEquipo, sedeId: sedeDelCliente.id });
                toast.success("✅ Equipo actualizado");
            } else {
                await api.post('/equipos', { ...formEquipo, sedeId: sedeDelCliente.id });
                toast.success("✅ Dispenser registrado");
            }

            setFormEquipo({ id: null, numeroSerie: '', marca: '', modelo: '', ubicacion: '', observaciones: '' });
            cargarDatos();
        } catch (err) { toast.error("❌ Error al guardar dispenser."); }
    };

    const eliminarEquipo = async (id) => {
        if(window.confirm("⚠️ ¿Estás seguro de que querés borrar este dispenser de la base de datos?")) {
            try {
                await api.delete(`/equipos/${id}`);
                toast.success("🗑️ Dispenser eliminado");
                cargarDatos();
            } catch (err) { 
                const errorData = err.response?.data;
                const mensaje = typeof errorData === 'string' ? errorData : "❌ No se puede eliminar (tiene historial en caja).";
                toast.error(mensaje);
            }
        }
    };

    // 💡 SÚPER BUSCADOR OMNICANAL
    const clientesFiltrados = clientes.filter(c => {
        const txt = busqueda.toLowerCase();
        return (
            (c.nombre && c.nombre.toLowerCase().includes(txt)) || 
            (c.cuilDni && c.cuilDni.toLowerCase().includes(txt)) || 
            (c.telefono && c.telefono.toLowerCase().includes(txt)) || 
            (c.email && c.email.toLowerCase().includes(txt))
        );
    });
    
    const equiposDelCliente = modalEquipos ? equipos.filter(eq => sedes.find(s => s.cliente?.id === modalEquipos.id)?.id === eq.sede?.id) : [];

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>👥 Directorio de Clientes</h2>
                <button onClick={() => { setForm({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', nombreSede: 'Casa Central', direccion: '' }); setModalAbierto(true); }} style={{ background: '#007bff', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + AÑADIR CLIENTE
                </button>
            </div>

            <input type="text" placeholder="🔍 Buscar por nombre, DNI, teléfono o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ borderBottom: '2px solid #333', background: '#f8f9fa' }}><th style={{ padding: '12px' }}>Nombre</th><th>CUIT/DNI</th><th>Contacto</th><th style={{ textAlign: 'center' }}>Acciones</th></tr></thead>
                <tbody>
                    {clientesFiltrados.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#0056b3' }}>{c.nombre}</td>
                            <td>{c.cuilDni || '-'}</td>
                            <td>{c.telefono} <br/><small style={{ color: '#666' }}>{c.email}</small></td>
                            <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={() => setModalEquipos(c)} style={{ background: '#e0f7fa', color: '#006064', border: '1px solid #00acc1', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💧 Dispensers</button>
                                <button onClick={() => { setForm(c); setModalAbierto(true); }} style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Editar Info</button>
                                <button onClick={() => eliminarCliente(c)} style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Borrar</button>
                            </td>
                        </tr>
                    ))}
                    {clientesFiltrados.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No se encontraron clientes con esa búsqueda.</td></tr>}
                </tbody>
            </table>

            {/* 🛑 MODAL UX PROFESIONAL: CLIENTES */}
            {modalAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <form onSubmit={guardarCliente} style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '500px', display: 'grid', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0, color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>{form.id ? '✏️ Editar Cliente' : '🆕 Nuevo Cliente'}</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Nombre o Empresa (*)</label>
                                <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>CUIT / DNI</label>
                                <input value={form.cuilDni} onChange={e => setForm({...form, cuilDni: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Teléfono</label>
                                <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                        </div>

                        {!form.id && (
                            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#0056b3', marginBottom: '10px' }}>📍 DATOS DEL DOMICILIO (Sede)</div>
                                <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Nombre Sede (Ej: Casa Central)</label>
                                <input value={form.nombreSede} onChange={e => setForm({...form, nombreSede: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Dirección Física</label>
                                <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setModalAbierto(false)} style={{ flex: 1, background: '#e0e0e0', color: '#333', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>CANCELAR</button>
                            <button type="submit" style={{ flex: 2, background: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💾 GUARDAR CLIENTE</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 💧 MODAL UX PROFESIONAL: EQUIPOS */}
            {modalEquipos && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#006064' }}>💧 Parque de Dispensers: {modalEquipos.nombre}</h3>
                            <button onClick={() => setModalEquipos(null)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}>X CERRAR</button>
                        </div>

                        <form onSubmit={guardarEquipo} style={{ background: '#e0f7fa', padding: '20px', borderRadius: '10px', marginBottom: '25px', border: '1px solid #b2ebf2' }}>
                            <h4 style={{ margin: '0 0 15px 0', color: '#006064' }}>{formEquipo.id ? '✏️ Editando Máquina' : '+ Alta de Nueva Máquina'}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px' }}>Nro de Serie (*)</label>
                                    <input required value={formEquipo.numeroSerie} onChange={e => setFormEquipo({...formEquipo, numeroSerie: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px' }}>Marca</label>
                                    <input value={formEquipo.marca} onChange={e => setFormEquipo({...formEquipo, marca: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px' }}>Modelo</label>
                                    <input value={formEquipo.modelo} onChange={e => setFormEquipo({...formEquipo, modelo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px' }}>Ubicación Interna</label>
                                    <input value={formEquipo.ubicacion} onChange={e => setFormEquipo({...formEquipo, ubicacion: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px' }}>Observaciones</label>
                                    <input value={formEquipo.observaciones} onChange={e => setFormEquipo({...formEquipo, observaciones: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button type="submit" style={{ background: '#00acc1', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>{formEquipo.id ? '💾 GUARDAR CAMBIOS' : '➕ AÑADIR DISPENSER'}</button>
                                {formEquipo.id && <button type="button" onClick={() => setFormEquipo({ id: null, numeroSerie: '', marca: '', modelo: '', ubicacion: '', observaciones: '' })} style={{ background: '#6c757d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancelar Edición</button>}
                            </div>
                        </form>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                            <thead>
                                <tr style={{ background: '#f1f3f5', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Serie</th><th>Marca/Modelo</th><th>Ubicación</th><th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equiposDelCliente.map(eq => (
                                    <tr key={eq.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{eq.numeroSerie}</td>
                                        <td>{eq.marca} - {eq.modelo}</td>
                                        <td>{eq.ubicacion} <br/><small style={{ color: '#888' }}>{eq.observaciones}</small></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => setFormEquipo(eq)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Editar">✏️</button>
                                            <button onClick={() => eliminarEquipo(eq.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Borrar">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                                {equiposDelCliente.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Este cliente no tiene dispensers registrados.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}