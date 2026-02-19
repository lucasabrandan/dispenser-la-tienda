import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ServicioForm({ onSaved }) {
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [equiposFiltrados, setEquiposFiltrados] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        sedeId: '', equipoSerial: '', tecnico: 'Marcos', costo: '', descuento: '0', metodoPago: 'EFECTIVO', trabajoRealizado: 'Mantenimiento General'
    });

    useEffect(() => {
        api.get('/sedes').then(res => setSedes(res.data));
        api.get('/equipos').then(res => setEquipos(res.data));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "costo" && value < 0) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 🧮 CÁLCULO DE DESCUENTO PARA MOSTRAR EN PANTALLA
    const obtenerDetalleDescuento = () => {
        const bruto = parseFloat(formData.costo) || 0;
        const txt = formData.descuento.toString().trim();
        let valorRestado = 0;
        let esPorcentaje = false;

        if (txt.endsWith('%')) {
            const p = Math.abs(parseFloat(txt.replace('%', '')) || 0);
            valorRestado = (bruto * p) / 100;
            esPorcentaje = true;
        } else {
            valorRestado = Math.abs(parseFloat(txt) || 0);
        }
        return { valorRestado, neto: Math.max(0, bruto - valorRestado), esPorcentaje };
    };

    const { valorRestado, neto, esPorcentaje } = obtenerDetalleDescuento();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/servicios', {
                sedeId: Number(formData.sedeId),
                usuarioId: 1,
                fecha: new Date().toISOString().split('T')[0],
                servicioTipo: "REPARACION",
                items: [{ ...formData, costo: Number(formData.costo), trabajoTipo: "REPARACION" }]
            });
            toast.success('¡Operación confirmada!');
            setFormData({ ...formData, equipoSerial: '', costo: '', descuento: '0' });
            if (onSaved) onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al guardar");
        } finally { setLoading(false); }
    };

    return (
        <div style={{ padding: '25px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ textAlign: 'center', color: '#2e7d32' }}>💰 Registro de Caja</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <select name="sedeId" value={formData.sedeId} onChange={(e) => {
                        setFormData({...formData, sedeId: e.target.value, equipoSerial: ''});
                        setEquiposFiltrados(equipos.filter(eq => eq.sede?.id.toString() === e.target.value));
                    }} style={{ padding: '12px', borderRadius: '8px' }}>
                        <option value="">-- Seleccionar Sede --</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                    </select>
                    <select name="equipoSerial" value={formData.equipoSerial} onChange={handleChange} disabled={!formData.sedeId} style={{ padding: '12px', border: '2px solid #e65100', borderRadius: '8px' }}>
                        <option value="">-- Serie Dispenser --</option>
                        {equiposFiltrados.map(eq => <option key={eq.id} value={eq.numeroSerie}>{eq.numeroSerie}</option>)}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f8f9fa', padding: '15px', borderRadius: '10px', position: 'relative' }}>
                    <div>
                        <label style={{ fontSize: '0.75em', fontWeight: 'bold' }}>COSTO BRUTO ($)</label>
                        <input type="number" name="costo" value={formData.costo} onChange={handleChange} style={{ width: '100%', padding: '10px', fontSize: '1.2em' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75em', fontWeight: 'bold' }}>DESCUENTO ({esPorcentaje ? 'En %' : 'En $'})</label>
                        <input type="text" name="descuento" value={formData.descuento} onChange={handleChange} placeholder="ej: 10% o 500" style={{ width: '100%', padding: '10px', fontSize: '1.2em', color: '#d32f2f' }} />
                        <span style={{ fontSize: '0.7em', color: '#666' }}>Se restarán: ${valorRestado.toLocaleString()}</span>
                    </div>
                </div>

                <div style={{ padding: '20px', background: '#e8f5e9', border: '2px dashed #2e7d32', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#1b5e20' }}>$ {neto.toLocaleString('es-AR')}</div>
                    <small style={{ color: '#2e7d32', fontWeight: 'bold' }}>TOTAL NETO A COBRAR</small>
                </div>

                <button type="submit" disabled={loading || !formData.costo || !formData.equipoSerial} style={{ padding: '15px', background: '#2e7d32', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {loading ? 'PROCESANDO...' : '🚀 CONFIRMAR OPERACIÓN'}
                </button>
            </form>
        </div>
    );
}