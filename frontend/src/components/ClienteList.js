import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ClienteList() {
    const [clientes, setClientes] = useState([]);
    const [editando, setEditando] = useState(null);

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = () => {
        api.get('/clientes').then(res => setClientes(res.data)).catch(() => toast.error("Error al cargar clientes"));
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/clientes/${editando.id}`, editando);
            toast.success("Cliente actualizado");
            setEditando(null);
            cargarClientes();
        } catch (err) { toast.error("Error al editar"); }
    };

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '15px' }}>
            <h3>👥 Directorio de Clientes</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th>Nombre / Empresa</th><th>CUIL/DNI</th><th>Teléfono</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {clientes.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '10px' }}>{c.nombre}</td>
                            <td>{c.cuilDni}</td>
                            <td>{c.telefono || '---'}</td>
                            <td>
                                <button onClick={() => setEditando(c)} style={{ background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️ Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* MODAL DE EDICIÓN SIMPLE */}
            {editando && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <form onSubmit={guardarEdicion} style={{ background: 'white', padding: '30px', borderRadius: '15px', display: 'grid', gap: '10px' }}>
                        <h4>Editar Cliente</h4>
                        <input value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} placeholder="Nombre" />
                        <input value={editando.cuilDni} onChange={e => setEditando({...editando, cuilDni: e.target.value})} placeholder="CUIL" />
                        <input value={editando.telefono} onChange={e => setEditando({...editando, telefono: e.target.value})} placeholder="Teléfono" />
                        <button type="submit" style={{ background: '#28a745', color: 'white', padding: '10px' }}>GUARDAR CAMBIOS</button>
                        <button type="button" onClick={() => setEditando(null)} style={{ background: '#dc3545', color: 'white' }}>CANCELAR</button>
                    </form>
                </div>
            )}
        </div>
    );
}