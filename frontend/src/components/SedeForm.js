import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SedeForm({ onCreated }) {
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!nombre.trim()) return;

        setLoading(true);
        
        // 🛠️ CORRECCIÓN: Ajustamos el payload para que coincida con SedeCreateDTO
        const payload = {
            nombreSede: nombre, // Java espera "nombreSede", no "nombre"
            clienteId: 1,       // Java espera @NotNull clienteId. (Usamos 1 provisorio)
            direccion: "",      // Opcionales
            localidad: "",
            notas: ""
        };

        try {
            const response = await api.post('/sedes', payload);
            
            toast.success('Sede creada con éxito');
            setNombre('');
            
            if (onCreated) {
                onCreated(response.data);
            }
        } catch (error) {
            console.error(error);
            // Mostramos el mensaje exacto que devuelve el Backend si hay error
            const msg = error.response?.data?.message || 'Error al crear la sede';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: '15px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Nueva Sede</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="Nombre de la sede (ej. Palermo)" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{ padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        padding: '8px 15px', 
                        background: loading ? '#ccc' : '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        minWidth: '80px'
                    }}
                >
                    {loading ? '...' : 'Crear'}
                </button>
            </form>
        </div>
    );
}