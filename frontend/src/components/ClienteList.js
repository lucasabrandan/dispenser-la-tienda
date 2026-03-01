import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ⚛️ Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ClienteList() {
    const [clientes, setClientes] = useState([]);
    const [editando, setEditando] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = () => {
        api.get('/clientes')
            .then(res => setClientes(Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error("Error al cargar clientes"));
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        const loading = toast.loading("Actualizando...");
        try {
            await api.put(`/clientes/${editando.id}`, editando);
            toast.success("✅ Cliente actualizado", { id: loading });
            setEditando(null);
            cargarClientes();
        } catch (err) { 
            toast.error("❌ Error al editar", { id: loading }); 
        }
    };

    const filtrados = clientes.filter(c => 
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || 
        (c.cuilDni || '').includes(busqueda)
    );

    return (
        <div style={{ background: '#F9FAFB', minHeight: '100vh', padding: '20px' }}>
            
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#111', marginBottom: '15px' }}>
                    👥 DIRECTORIO DE CLIENTES
                </h3>
                <Input 
                    placeholder="🔍 Buscar por nombre o CUIT..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ background: '#FFF', borderRadius: '15px', border: '1px solid #E5E7EB' }}
                />
            </div>

            {/* --- LISTADO EN TARJETAS (CHAU TABLAS) --- */}
            <div style={{ display: 'grid', gap: '12px' }}>
                {filtrados.map(c => (
                    <div key={c.id} style={{ 
                        background: '#FFF', 
                        padding: '18px', 
                        borderRadius: '20px', 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)', 
                        border: '1px solid #F3F4F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#111' }}>
                                {c.nombre}
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                                {c.cuilDni} • {c.telefono || 'Sin teléfono'}
                            </p>
                        </div>
                        
                        <Button 
                            variant="secondary" 
                            onClick={() => setEditando(c)} 
                            style={{ 
                                padding: '8px 15px', 
                                borderRadius: '12px', 
                                background: '#F3F4F6', 
                                border: 'none', 
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✏️ Editar
                        </Button>
                    </div>
                ))}
            </div>

            {/* --- MODAL DE EDICIÓN ESTILO "BOTTOM SHEET" --- */}
            {editando && (
                <div style={{ 
                    position: 'fixed', inset: 0, 
                    background: 'rgba(0,0,0,0.5)', 
                    display: 'flex', justifyContent: 'center', alignItems: 'flex-end', 
                    zIndex: 2000 
                }}>
                    <div style={{ 
                        background: '#FFF', 
                        width: '100%', maxWidth: '500px', 
                        borderTopLeftRadius: '30px', borderTopRightRadius: '30px', 
                        padding: '30px', 
                        boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' 
                    }}>
                        <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 20px' }} />
                        
                        <h4 style={{ marginTop: 0, fontSize: '18px', fontWeight: '900', textAlign: 'center' }}>
                            ✏️ EDITAR CLIENTE
                        </h4>
                        
                        <form onSubmit={guardarEdicion} style={{ display: 'grid', gap: '15px' }}>
                            <Input 
                                label="Nombre / Empresa"
                                value={editando.nombre} 
                                onChange={e => setEditando({...editando, nombre: e.target.value})} 
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <Button 
                                    variant="secondary" 
                                    type="button" 
                                    onClick={() => setEditando(null)} 
                                    style={{ flex: 1, height: '50px', borderRadius: '15px' }}
                                >
                                    CANCELAR
                                </Button>
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    style={{ flex: 1, height: '50px', borderRadius: '15px', background: '#000' }}
                                >
                                    GUARDAR
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}