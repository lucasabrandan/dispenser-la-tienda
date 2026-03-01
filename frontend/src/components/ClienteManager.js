import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ⚛️ Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ClienteManager() {
    // --- ESTADOS ---
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    
    const [modalCliente, setModalCliente] = useState(false);
    const [modalSedes, setModalSedes] = useState(null); // Guarda el objeto cliente seleccionado
    const [modalEquipos, setModalEquipos] = useState(null); // Guarda el objeto cliente seleccionado

    const [form, setForm] = useState({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', direccion: '' });
    const [formSede, setFormSede] = useState({ id: null, nombreSede: '', direccion: '' });
    const [formEquipo, setFormEquipo] = useState({ id: null, numeroSerie: '', marca: '', modelo: '', sedeId: '' });

    // --- CARGA DE DATOS ---
    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = () => {
        api.get('/clientes').then(res => setClientes(res.data)).catch(() => {});
        api.get('/sedes').then(res => setSedes(res.data)).catch(() => {});
        api.get('/equipos').then(res => setEquipos(res.data)).catch(() => {});
    };

    // --- GESTIÓN DE CLIENTES ---
    const guardarCliente = async (e) => {
        if (e) e.preventDefault();
        if (!form.nombre.trim()) return toast.error("❌ El nombre es obligatorio");
        
        const loading = toast.loading("Guardando cliente...");
        try {
            if (form.id) {
                await api.put(`/clientes/${form.id}`, { ...form, clienteTipo: "PARTICULAR" });
                toast.success("✅ Datos actualizados", { id: loading });
            } else {
                await api.post('/clientes', { ...form, clienteTipo: "PARTICULAR" });
                toast.success("✅ Cliente registrado", { id: loading });
            }
            setModalCliente(false);
            cargarDatos();
        } catch (err) { toast.error("❌ Error al guardar", { id: loading }); }
    };

    const eliminarCliente = async (c) => {
        if(!window.confirm(`⚠️ ¿ELIMINAR A "${c.nombre.toUpperCase()}"?\nSe borrarán sus sedes y equipos asociados.`)) return;
        try {
            await api.delete(`/clientes/${c.id}`);
            toast.success("🗑️ Cliente borrado");
            cargarDatos();
        } catch (err) { toast.error("❌ Error al eliminar"); }
    };

    // --- GESTIÓN DE SEDES ---
    const guardarSede = async (e) => {
        e.preventDefault();
        if (!formSede.nombreSede.trim()) return toast.error("❌ Nombre de sede obligatorio");
        
        const loading = toast.loading("Guardando sede...");
        try {
            const payload = { ...formSede, clienteId: modalSedes.id };
            if (formSede.id) await api.put(`/sedes/${formSede.id}`, payload);
            else await api.post('/sedes', payload);
            
            toast.success("✅ Sede guardada", { id: loading });
            setFormSede({ id: null, nombreSede: '', direccion: '' });
            cargarDatos();
        } catch (err) { toast.error("❌ Error", { id: loading }); }
    };

    // --- GESTIÓN DE EQUIPOS ---
    const guardarEquipo = async (e) => {
        e.preventDefault();
        if (!formEquipo.numeroSerie.trim()) return toast.error("❌ S/N es obligatorio");
        if (!formEquipo.sedeId) return toast.error("❌ Seleccioná una sede");

        const loading = toast.loading("Registrando equipo...");
        try {
            if (formEquipo.id) await api.put(`/equipos/${formEquipo.id}`, formEquipo);
            else await api.post('/equipos', formEquipo);
            
            toast.success("✅ Dispenser registrado", { id: loading });
            setFormEquipo({ id: null, numeroSerie: '', marca: '', modelo: '', sedeId: '' });
            cargarDatos();
        } catch (err) { toast.error("❌ Error", { id: loading }); }
    };

    // --- FILTROS ---
    const filtrados = clientes.filter(c => 
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || 
        (c.cuilDni || '').includes(busqueda)
    );

    const sedesDelCliente = modalSedes ? sedes.filter(s => s.cliente?.id === modalSedes.id) : [];
    const sedesParaEquipos = modalEquipos ? sedes.filter(s => s.cliente?.id === modalEquipos.id) : [];
    const equiposDelCliente = modalEquipos ? equipos.filter(eq => sedesParaEquipos.find(s => s.id === eq.sede?.id)) : [];

    return (
        <div style={{ background: '#EDEDED', minHeight: '100vh', paddingBottom: '120px' }}>
            
            {/* BUSCADOR ESTILO ML */}
            <div style={{ background: '#FFF159', padding: '15px', borderBottom: '1px solid #DDD' }}>
                <Input 
                    placeholder="🔍 Buscar cliente por nombre o CUIT..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ background: '#FFF', border: 'none', marginBottom: 0 }}
                />
            </div>

            <div style={{ padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#111' }}>MIS CLIENTES ({filtrados.length})</h2>
                    <Button onClick={() => { setForm({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', direccion: '' }); setModalCliente(true); }}
                            style={{ background: '#3483FA', height: '40px', padding: '0 15px', fontWeight: 'bold' }}>
                        + NUEVO
                    </Button>
                </div>

                {/* LISTADO DE CLIENTES */}
                <div style={{ display: 'grid', gap: '12px' }}>
                    {filtrados.map(c => (
                        <div key={c.id} style={{ background: '#FFF', padding: '15px', borderRadius: '12px', border: '1px solid #DDD', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#111' }}>{c.nombre.toUpperCase()}</h4>
                                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                                        {c.cuilDni || 'SIN CUIT'} • {c.telefono || 'SIN TEL'}
                                    </p>
                                </div>
                                <div style={{ fontSize: '10px', color: '#AAA', fontWeight: '900' }}>ID {c.id}</div>
                            </div>
                            
                            {/* ACCIONES ERGONÓMICAS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #EEE' }}>
                                <button onClick={() => setModalSedes(c)} title="Sedes" style={{ background: '#F5F5F5', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '20px' }}>📍</button>
                                <button onClick={() => setModalEquipos(c)} title="Equipos" style={{ background: '#F5F5F5', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '20px' }}>💧</button>
                                <button onClick={() => { setForm(c); setModalCliente(true); }} title="Editar" style={{ background: '#F5F5F5', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '20px' }}>✏️</button>
                                <button onClick={() => eliminarCliente(c)} title="Borrar" style={{ background: '#FFF1F1', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '20px' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MODAL CLIENTE --- */}
            {modalCliente && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 2000 }}>
                    <div style={{ background: '#FFF', width: '100%', maxWidth: '500px', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '20px' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#111', marginBottom: '15px' }}>{form.id ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}</h3>
                        <form onSubmit={guardarCliente}>
                            <Input label="NOMBRE O EMPRESA" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Input label="CUIT / DNI" value={form.cuilDni} onChange={e => setForm({...form, cuilDni: e.target.value})} />
                                <Input label="TELÉFONO" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                            </div>
                            <Input label="EMAIL" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <Button onClick={() => setModalCliente(false)} style={{ flex: 1, background: '#666' }}>CANCELAR</Button>
                                <Button type="submit" style={{ flex: 2, background: '#3483FA' }}>GUARDAR CLIENTE</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL SEDES (📍) --- */}
            {modalSedes && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 2000 }}>
                    <div style={{ background: '#FFF', width: '100%', maxWidth: '500px', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '20px' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#111' }}>SEDES DE {modalSedes.nombre.toUpperCase()}</h3>
                        
                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', background: '#F9F9F9', borderRadius: '12px', border: '1px solid #EEE' }}>
                            {sedesDelCliente.length > 0 ? sedesDelCliente.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #EEE' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: '#111' }}>{s.nombreSede}</p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>{s.direccion}</p>
                                    </div>
                                    <button onClick={() => api.delete(`/sedes/${s.id}`).then(cargarDatos)} style={{ border: 'none', background: 'none', fontSize: '18px' }}>🗑️</button>
                                </div>
                            )) : <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No hay sedes cargadas</p>}
                        </div>

                        <form onSubmit={guardarSede} style={{ borderTop: '2px dashed #DDD', paddingTop: '15px' }}>
                            <Input label="NOMBRE DE SEDE (EJ: DEPÓSITO)" value={formSede.nombreSede} onChange={e => setFormSede({...formSede, nombreSede: e.target.value})} />
                            <Input label="DIRECCIÓN" value={formSede.direccion} onChange={e => setFormSede({...formSede, direccion: e.target.value})} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button onClick={() => setModalSedes(null)} style={{ flex: 1, background: '#666' }}>CERRAR</Button>
                                <Button type="submit" style={{ flex: 2, background: '#3483FA' }}>+ AÑADIR SEDE</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL EQUIPOS (💧) --- */}
            {modalEquipos && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 2000 }}>
                    <div style={{ background: '#FFF', width: '100%', maxWidth: '500px', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '20px' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#3483FA' }}>DISPENSERS REGISTRADOS</h3>

                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                            {equiposDelCliente.map(eq => (
                                <div key={eq.id} style={{ padding: '12px', background: '#F5F5F5', borderRadius: '10px', marginBottom: '8px', border: '1px solid #DDD' }}>
                                    <p style={{ margin: 0, fontWeight: '900', color: '#111' }}>S/N: {eq.numeroSerie}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>{eq.marca} {eq.modelo} • {eq.sede?.nombreSede}</p>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={guardarEquipo} style={{ borderTop: '2px dashed #DDD', paddingTop: '15px' }}>
                            <label className="label-dark" style={{ fontSize: '10px' }}>¿A QUÉ SEDE PERTENECE?</label>
                            <select 
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #DDD', fontSize: '16px', background: '#FFF' }}
                                onChange={e => setFormEquipo({...formEquipo, sedeId: e.target.value})}
                                value={formEquipo.sedeId}
                            >
                                <option value="">Seleccionar Sede...</option>
                                {sedesParaEquipos.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                            </select>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Input label="NRO SERIE (S/N)" value={formEquipo.numeroSerie} onChange={e => setFormEquipo({...formEquipo, numeroSerie: e.target.value})} />
                                <Input label="MARCA" value={formEquipo.marca} onChange={e => setFormEquipo({...formEquipo, marca: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button onClick={() => setModalEquipos(null)} style={{ flex: 1, background: '#666' }}>CERRAR</Button>
                                <Button type="submit" style={{ flex: 2, background: '#3483FA' }}>+ REGISTRAR DISPENSER</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}