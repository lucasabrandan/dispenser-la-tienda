import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ⚛️ Importamos tus Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ClienteList() {
    const [clientes, setClientes] = useState([]);
    const [editando, setEditando] = useState(null);

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = () => {
        api.get('/clientes')
            .then(res => setClientes(res.data))
            .catch(() => toast.error("Error al cargar clientes"));
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/clientes/${editando.id}`, editando);
            toast.success("✅ Cliente actualizado");
            setEditando(null);
            cargarClientes();
        } catch (err) { 
            toast.error("❌ Error al editar"); 
        }
    };

    return (
        <div className="card-animate">
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>👥 Directorio de Clientes</h3>
            
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '15px' }}>Nombre / Empresa</th>
                            <th>CUIL/DNI</th>
                            <th>Teléfono</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                                <td style={{ padding: '15px', color: 'var(--brand-yellow)', fontWeight: 'bold' }}>
                                    {c.nombre}
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{c.cuilDni}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{c.telefono || '---'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => setEditando(c)} 
                                        style={{ padding: '5px 12px' }}
                                    >
                                        ✏️ Editar
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* MODAL DE EDICIÓN DARK */}
            {editando && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    width: '100vw', 
                    height: '100vh', 
                    background: 'rgba(0,0,0,0.8)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    zIndex: 1000 
                }}>
                    <Card style={{ width: '400px', borderTop: '5px solid var(--brand-yellow)' }}>
                        <h4 style={{ marginTop: 0, color: 'var(--brand-yellow)' }}>✏️ Editar Cliente</h4>
                        <form onSubmit={guardarEdicion} style={{ display: 'grid', gap: '10px' }}>
                            <Input 
                                label="Nombre / Empresa"
                                value={editando.nombre} 
                                onChange={e => setEditando({...editando, nombre: e.target.value})} 
                            />
                            <Input 
                                label="CUIL/DNI"
                                value={editando.cuilDni} 
                                onChange={e => setEditando({...editando, cuilDni: e.target.value})} 
                            />
                            <Input 
                                label="Teléfono"
                                value={editando.telefono} 
                                onChange={e => setEditando({...editando, telefono: e.target.value})} 
                            />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <Button 
                                    variant="secondary" 
                                    type="button" 
                                    onClick={() => setEditando(null)} 
                                    style={{ flex: 1 }}
                                >
                                    CANCELAR
                                </Button>
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    style={{ flex: 1 }}
                                >
                                    GUARDAR
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}