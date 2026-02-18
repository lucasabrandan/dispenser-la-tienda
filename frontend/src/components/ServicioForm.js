import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ServicioForm({ onSaved }) {
    // Listas de datos
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]); // Todos los equipos
    const [equiposFiltrados, setEquiposFiltrados] = useState([]); // Solo los de la sede elegida

    // Formulario
    const [formData, setFormData] = useState({
        sedeId: '',
        equipoId: '',
        tecnico: 'Marcos', // Valor por defecto
        costo: '',
        garantiaHasta: '', // Fecha
        observaciones: ''
    });

    const [loading, setLoading] = useState(false);

    // 1. CARGAR DATOS AL INICIO
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                // Hacemos las dos peticiones en paralelo
                const [resSedes, resEquipos] = await Promise.all([
                    api.get('/sedes'),
                    api.get('/equipos')
                ]);
                setSedes(resSedes.data);
                setEquipos(resEquipos.data);
            } catch (error) {
                console.error("Error cargando datos:", error);
                toast.error("No se pudieron cargar sedes o equipos");
            }
        };
        cargarDatos();
    }, []);

    // 2. FILTRAR EQUIPOS CUANDO CAMBIA LA SEDE
    const handleSedeChange = (e) => {
        const idSede = e.target.value;
        setFormData({ ...formData, sedeId: idSede, equipoId: '' }); // Reseteamos el equipo al cambiar de sede

        if (idSede) {
            // Magia: Filtramos los equipos que pertenecen a esta sede
            const filtrados = equipos.filter(eq => eq.sede && eq.sede.id.toString() === idSede);
            setEquiposFiltrados(filtrados);
            
            if (filtrados.length === 0) {
                toast("Esta sede no tiene equipos registrados aún", { icon: 'ℹ️' });
            }
        } else {
            setEquiposFiltrados([]);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.equipoId || !formData.costo) {
            toast.error("Falta seleccionar Equipo o poner el Costo");
            return;
        }

        setLoading(true);
        try {
            // Enviamos todo al backend
            await api.post('/servicios', formData);
            
            toast.success('¡Servicio registrado con éxito!');
            
            // Limpiamos el formulario pero dejamos el técnico seleccionado
            setFormData({
                ...formData,
                equipoId: '',
                costo: '',
                garantiaHasta: '',
                observaciones: ''
            });
            
            if (onSaved) onSaved(); // Recargamos la lista de abajo
            
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar el servicio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#e65100' }}>3. Registrar Service (Técnico)</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
                
                {/* 1. SELECCIONAR SEDE */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>¿Dónde fue?</label>
                    <select 
                        name="sedeId" 
                        value={formData.sedeId} 
                        onChange={handleSedeChange}
                        style={{ width: '100%', padding: '8px' }}
                    >
                        <option value="">-- Seleccionar Sede --</option>
                        {sedes.map(s => (
                            <option key={s.id} value={s.id}>{s.nombreSede}</option>
                        ))}
                    </select>
                </div>

                {/* 2. SELECCIONAR EQUIPO (Solo aparece si elegiste Sede) */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>¿Qué máquina?</label>
                    <select 
                        name="equipoId" 
                        value={formData.equipoId} 
                        onChange={handleChange}
                        disabled={!formData.sedeId} // Deshabilitado si no hay sede
                        style={{ width: '100%', padding: '8px', border: '2px solid #e65100' }}
                    >
                        <option value="">-- Seleccionar Equipo --</option>
                        {equiposFiltrados.map(eq => (
                            <option key={eq.id} value={eq.id}>
                                {eq.marca} {eq.modelo} - Serie: {eq.numeroSerie}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 3. DATOS DEL SERVICIO */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9em' }}>Técnico</label>
                    <select name="tecnico" value={formData.tecnico} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                        <option value="Marcos">Marcos</option>
                        <option value="Lucas">Lucas</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.9em' }}>Costo ($)</label>
                    <input 
                        type="number" 
                        name="costo" 
                        value={formData.costo} 
                        onChange={handleChange} 
                        placeholder="Ej: 50000"
                        style={{ width: '100%', padding: '8px' }} 
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.9em' }}>Garantía Hasta</label>
                    <input 
                        type="date" 
                        name="garantiaHasta" 
                        value={formData.garantiaHasta} 
                        onChange={handleChange} 
                        style={{ width: '100%', padding: '8px' }} 
                    />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <textarea 
                        name="observaciones" 
                        value={formData.observaciones} 
                        onChange={handleChange} 
                        placeholder="¿Qué se le hizo? (Cambio de filtros, canilla rota...)"
                        rows="3"
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ gridColumn: '1 / -1', padding: '12px', background: '#e65100', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {loading ? 'Guardando...' : 'REGISTRAR SERVICIO'}
                </button>
            </form>
        </div>
    );
}