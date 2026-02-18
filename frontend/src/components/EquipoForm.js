import React, { useState, useEffect } from 'react';
import api, { getSedes } from '../services/api';
import toast from 'react-hot-toast';

export default function EquipoForm({ onCreated }) {
    const [sedes, setSedes] = useState([]);
    const [formData, setFormData] = useState({
        numeroSerie: '',
        modelo: '',
        marca: '',
        sedeId: ''
    });
    const [loading, setLoading] = useState(false);

    // Cargar las sedes para poder elegirlas
    useEffect(() => {
        getSedes().then(res => setSedes(res.data))
            .catch(err => console.error("Error cargando sedes", err));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sedeId || !formData.numeroSerie) {
            toast.error("Falta Sede o Número de Serie");
            return;
        }

        setLoading(true);
        try {
            await api.post('/equipos', formData);
            toast.success('Equipo guardado correctamente');
            setFormData({ ...formData, numeroSerie: '', modelo: '' }); // Limpiar
            if (onCreated) onCreated(); // Avisar para refrescar
        } catch (error) {
            console.error(error);
            toast.error('Error al crear equipo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '15px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Nuevo Equipo (Dispenser)</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                
                {/* Selector de Sede */}
                <select 
                    name="sedeId" 
                    value={formData.sedeId} 
                    onChange={handleChange}
                    style={{ padding: '8px', gridColumn: '1 / -1' }}
                >
                    <option value="">-- Seleccionar Sede --</option>
                    {sedes.map(sede => (
                        <option key={sede.id} value={sede.id}>
                            {sede.nombreSede} (Cliente ID: {sede.cliente?.id || '?'})
                        </option>
                    ))}
                </select>

                <input name="marca" placeholder="Marca (ej. Clover)" onChange={handleChange} value={formData.marca} style={{ padding: '8px' }} />
                <input name="modelo" placeholder="Modelo (ej. Frío/Calor)" onChange={handleChange} value={formData.modelo} style={{ padding: '8px' }} />
                
                <input 
                    name="numeroSerie" 
                    placeholder="Nro Serie (OBLIGATORIO)" 
                    onChange={handleChange} 
                    value={formData.numeroSerie} 
                    style={{ padding: '8px', gridColumn: '1 / -1', border: '2px solid #007bff' }} 
                />

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ gridColumn: '1 / -1', padding: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    {loading ? 'Guardando...' : 'Guardar Equipo'}
                </button>
            </form>
        </div>
    );
}