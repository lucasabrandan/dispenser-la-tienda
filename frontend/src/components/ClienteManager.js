import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ⚛️ Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ClienteManager() {
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalEquipos, setModalEquipos] = useState(null);
    const [modalSedes, setModalSedes] = useState(null);

    const [form, setForm] = useState({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', nombreSede: 'Casa Central', direccion: '' });
    const [formEquipo, setFormEquipo] = useState({ id: null, numeroSerie: '', marca: '', modelo: '', ubicacion: '', observaciones: '', sedeId: '' });
    const [formSede, setFormSede] = useState({ id: null, nombreSede: '', direccion: '' });

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = () => {
        api.get('/clientes').then(res => setClientes(res.data)).catch(() => {});
        api.get('/sedes').then(res => setSedes(res.data)).catch(() => {});
        api.get('/equipos').then(res => setEquipos(res.data)).catch(() => {});
    };

    const guardarCliente = async (e) => {
        if (e) e.preventDefault();
        if (!form.nombre?.trim()) return toast.error("❌ El Nombre es OBLIGATORIO.");
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

    const eliminarCliente = async (c) => {
        if(!window.confirm(`⚠️ ¿ELIMINAR A "${c.nombre.toUpperCase()}"?`)) return;
        try {
            await api.delete(`/clientes/${c.id}`);
            toast.success("🗑️ Registro eliminado");
            cargarDatos();
        } catch (err) { toast.error("❌ Error al eliminar"); }
    };

    // --- 🛡️ LÓGICA DE SEDES (CORREGIDA PARA EVITAR 404) ---
    const guardarSedeAdicional = async (e) => {
        if (e) e.preventDefault();
        if (!modalSedes?.id) return toast.error("❌ No hay un cliente activo.");
        if (!formSede.nombreSede.trim()) return toast.error("❌ Nombre de sede requerido.");

        try {
            const payload = { ...formSede, clienteId: modalSedes.id };
            if (formSede.id) {
                // Si esto da 404, el problema está en el Controller de Java (@PutMapping)
                await api.put(`/sedes/${formSede.id}`, payload);
                toast.success("✅ Sede actualizada");
            } else {
                await api.post('/sedes', payload);
                toast.success("✅ Sede agregada");
            }
            setFormSede({ id: null, nombreSede: '', direccion: '' });
            cargarDatos();
        } catch (err) { 
            console.error(err);
            toast.error("❌ Error 404: Ruta de Sede no encontrada"); 
        }
    };

    const eliminarSedeAdicional = async (id) => {
        if(!window.confirm("⚠️ ¿Eliminar sucursal?")) return;
        try {
            await api.delete(`/sedes/${id}`);
            toast.success("🗑️ Sede eliminada");
            cargarDatos();
        } catch (err) { 
            console.error(err);
            toast.error("❌ Error al borrar: No se encontró la ruta /sedes/" + id); 
        }
    };

    const guardarEquipo = async (e) => {
        if (e) e.preventDefault();
        if (!formEquipo.sedeId) return toast.error("❌ Seleccioná una sede");
        try {
            if (formEquipo.id) {
                await api.put(`/equipos/${formEquipo.id}`, formEquipo);
                toast.success("✅ Dispenser actualizado");
            } else {
                await api.post('/equipos', formEquipo);
                toast.success("✅ Dispenser registrado");
            }
            setFormEquipo({ id: null, numeroSerie: '', marca: '', modelo: '', ubicacion: '', observaciones: '', sedeId: '' });
            cargarDatos();
        } catch (err) { toast.error("❌ Error al guardar equipo"); }
    };

    const eliminarEquipo = async (id) => {
        if(!window.confirm("⚠️ ¿Borrar dispenser?")) return;
        try {
            await api.delete(`/equipos/${id}`);
            toast.success("🗑️ Equipo eliminado");
            cargarDatos();
        } catch (err) { toast.error("❌ Error al eliminar equipo"); }
    };

    const filtrados = clientes.filter(c => 
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
        c.cuilDni?.includes(busqueda)
    );

    const sedesDelCliente = modalSedes ? sedes.filter(s => s.cliente?.id === modalSedes.id) : [];
    const sedesParaEquipos = modalEquipos ? sedes.filter(s => s.cliente?.id === modalEquipos.id) : [];
    const equiposDelCliente = modalEquipos ? equipos.filter(eq => sedesParaEquipos.find(s => s.id === eq.sede?.id)) : [];

    return (
        <div style={{ color: 'var(--text-primary)' }} className="card-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>👥 Directorio de Clientes</h2>
                <Button variant="success" type="button" onClick={() => { setForm({ id: null, nombre: '', cuilDni: '', telefono: '', email: '', nombreSede: 'Casa Central', direccion: '' }); setModalAbierto(true); }}>
                    + NUEVO CLIENTE
                </Button>
            </div>

            <Input 
                placeholder="🔍 Buscar por nombre, CUIT o teléfono..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
            />

            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '15px' }}>Nombre / Empresa</th>
                            <th>CUIT/DNI</th>
                            <th>Contacto</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '15px' }}><b style={{ color: 'var(--brand-yellow)' }}>{c.nombre}</b></td>
                                <td>{c.cuilDni || '-'}</td>
                                <td><small>{c.telefono}<br/>{c.email}</small></td>
                                <td style={{ textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center', padding: '10px' }}>
                                    <Button type="button" variant="secondary" onClick={() => setModalSedes(c)} style={{padding: '5px 10px'}}>📍 Sedes</Button>
                                    <Button type="button" variant="secondary" onClick={() => setModalEquipos(c)} style={{padding: '5px 10px', color: 'var(--status-info)'}}>💧 Eq.</Button>
                                    <Button type="button" variant="secondary" onClick={() => { setForm(c); setModalAbierto(true); }} style={{padding: '5px 10px'}}>✏️</Button>
                                    <Button type="button" variant="danger" onClick={() => eliminarCliente(c)} style={{padding: '5px 10px'}}>🗑️</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* --- MODAL CLIENTE --- */}
            {modalAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '550px', borderTop: '5px solid var(--brand-red)' }}>
                        <h3 style={{marginTop: 0, color: 'var(--brand-red)'}}>{form.id ? '✏️ EDITAR CLIENTE' : '🆕 NUEVO CLIENTE'}</h3>
                        <form onSubmit={guardarCliente} style={{ display: 'grid', gap: '10px' }}>
                            <Input label="Nombre o Empresa *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Input label="CUIT / DNI" value={form.cuilDni} onChange={e => setForm({...form, cuilDni: e.target.value})} />
                                <Input label="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                            </div>
                            <Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            {!form.id && (
                                <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--brand-yellow)', fontWeight: 'bold' }}>📍 REGISTRO DE PRIMERA SEDE</label>
                                    <Input label="Nombre de Sede" value={form.nombreSede} onChange={e => setForm({...form, nombreSede: e.target.value})} />
                                    <Input label="Dirección" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <Button variant="secondary" type="button" onClick={() => setModalAbierto(false)} style={{flex: 1}}>CANCELAR</Button>
                                <Button variant="primary" type="submit" style={{flex: 2}}>💾 GUARDAR CLIENTE</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* --- MODAL SEDES --- */}
            {modalSedes && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', borderTop: '5px solid var(--status-success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>📍 Sedes: <span style={{color: 'var(--brand-yellow)'}}>{modalSedes.nombre}</span></h3>
                            <Button variant="danger" type="button" onClick={() => setModalSedes(null)} style={{padding: '5px 12px'}}>CERRAR X</Button>
                        </div>
                        <form onSubmit={guardarSedeAdicional} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '10px', background: 'var(--bg-main)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                            <Input label="Nombre Sede" value={formSede.nombreSede} onChange={e => setFormSede({...formSede, nombreSede: e.target.value})} placeholder="Ej: Sucursal Lanús" />
                            <Input label="Dirección" value={formSede.direccion} onChange={e => setFormSede({...formSede, direccion: e.target.value})} placeholder="Calle 123" />
                            <Button variant="success" type="submit" style={{height: '42px', marginTop: '22px'}}>➕</Button>
                        </form>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px'}}>
                                    <th style={{padding: '10px'}}>Nombre</th>
                                    <th>Dirección</th>
                                    <th style={{textAlign: 'right'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sedesDelCliente.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px' }}><b>{s.nombreSede}</b></td>
                                        <td><small style={{color: 'var(--text-secondary)'}}>{s.direccion}</small></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Button type="button" variant="secondary" onClick={() => setFormSede(s)} style={{marginRight: '5px', padding: '4px 8px'}}>✏️</Button>
                                            <Button type="button" variant="danger" onClick={() => eliminarSedeAdicional(s.id)} style={{padding: '4px 8px'}}>🗑️</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* --- MODAL EQUIPOS --- */}
            {modalEquipos && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', borderTop: '5px solid var(--status-info)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>💧 Parque: <span style={{color: 'var(--brand-yellow)'}}>{modalEquipos.nombre}</span></h3>
                            <Button variant="danger" type="button" onClick={() => setModalEquipos(null)} style={{padding: '5px 12px'}}>CERRAR X</Button>
                        </div>
                        <form onSubmit={guardarEquipo} style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '10px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', border: '1px solid var(--border-color)' }}>
                            <div style={{gridColumn: 'span 3'}}>
                                <label style={{fontSize: '11px', color: 'var(--brand-yellow)', fontWeight: 'bold'}}>UBICAR EN SEDE:</label>
                                <select value={formEquipo.sedeId} onChange={e => setFormEquipo({...formEquipo, sedeId: e.target.value})} style={{width: '100%', padding: '12px', background: 'var(--bg-card)', color: 'white', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '5px'}}>
                                    <option value="">-- Seleccionar Destino --</option>
                                    {sedesParaEquipos.map(s => <option key={s.id} value={s.id}>{s.nombreSede} ({s.direccion})</option>)}
                                </select>
                            </div>
                            <Input label="Serie" value={formEquipo.numeroSerie} onChange={e => setFormEquipo({...formEquipo, numeroSerie: e.target.value})} />
                            <Input label="Marca" value={formEquipo.marca} onChange={e => setFormEquipo({...formEquipo, marca: e.target.value})} />
                            <Button variant="success" type="submit" style={{marginTop: '22px'}}>💾 GUARDAR</Button>
                        </form>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {equiposDelCliente.map(eq => (
                                    <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <b style={{color: 'var(--status-info)'}}>{eq.numeroSerie}</b><br/>
                                            <small>{eq.marca}</small>
                                        </td>
                                        <td><small>{sedesParaEquipos.find(s => s.id === eq.sede?.id)?.nombreSede}</small></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Button type="button" variant="secondary" onClick={() => setFormEquipo({...eq, sedeId: eq.sede?.id})} style={{marginRight: '5px', padding: '5px 10px'}}>✏️</Button>
                                            <Button type="button" variant="danger" onClick={() => eliminarEquipo(eq.id)} style={{padding: '5px 10px'}}>🗑️</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}
        </div>
    );
}