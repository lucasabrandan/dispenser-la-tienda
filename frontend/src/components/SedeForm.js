import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function SedeForm({ onCreated }) {
    const [data, setData] = useState({ nombre: '', sede: '', direccion: '' });

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const resCli = await api.post('/clientes', { nombre: data.nombre, cuilDni: "0", clienteTipo: "EMPRESA" });
            await api.post('/sedes', { clienteId: resCli.data.id, nombreSede: data.sede, direccion: data.direccion });
            toast.success('Cliente registrado con éxito');
            if (onCreated) onCreated();
        } catch (error) { toast.error('Error al guardar cliente'); }
    }

    return (
        <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '10px', marginBottom: '15px', border: '1px solid #90caf9' }}>
            <h4 style={{ marginTop: 0 }}>👤 Registrar Nuevo Cliente</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
                <input placeholder="Nombre / Empresa" value={data.nombre} onChange={e => setData({...data, nombre: e.target.value})} style={{ padding: '8px' }} />
                <input placeholder="Nombre de la Sede" value={data.sede} onChange={e => setData({...data, sede: e.target.value})} style={{ padding: '8px' }} />
                <input placeholder="Dirección" value={data.direccion} onChange={e => setData({...data, direccion: e.target.value})} style={{ padding: '8px' }} />
                <button onClick={handleSubmit} style={{ background: '#1976d2', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>GUARDAR</button>
            </div>
        </div>
    );
}