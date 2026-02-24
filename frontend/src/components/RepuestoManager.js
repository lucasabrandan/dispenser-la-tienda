import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function RepuestoManager() {
    const [repuestos, setRepuestos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    
    const [form, setForm] = useState({ id: null, sku: '', nombre: '', descripcion: '', costo: '', porcentajeGanancia: '', precio: '', stock: '' });

    useEffect(() => { cargarRepuestos(); }, []);

    const cargarRepuestos = () => {
        api.get('/repuestos').then(res => setRepuestos(res.data)).catch(() => toast.error("Error al cargar inventario"));
    };

    const manejarCambiosFinancieros = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        
        const costo = parseFloat(nuevoForm.costo) || 0;
        const margen = parseFloat(nuevoForm.porcentajeGanancia) || 0;
        
        if (costo >= 0 && margen >= 0) {
            const precioCalculado = costo + (costo * (margen / 100));
            nuevoForm.precio = precioCalculado.toFixed(2);
        }
        
        setForm(nuevoForm);
    };

    const guardarRepuesto = async (e) => {
        e.preventDefault();
        try {
            if (Number(form.stock) < 0 || Number(form.costo) < 0) {
                return toast.error("❌ Los valores no pueden ser negativos.");
            }

            const payload = { 
                ...form, 
                costo: Number(form.costo),
                porcentajeGanancia: Number(form.porcentajeGanancia),
                precio: Number(form.precio), 
                stock: Number(form.stock) 
            };

            if (form.id) {
                await api.put(`/repuestos/${form.id}`, payload);
                toast.success("✅ Repuesto actualizado");
            } else {
                await api.post('/repuestos', payload);
                toast.success("✅ Nuevo repuesto ingresado al stock");
            }
            setModalAbierto(false);
            cargarRepuestos();
        } catch (err) { toast.error("❌ Error al guardar el repuesto"); }
    };

    const eliminarRepuesto = async (id, nombre) => {
        if(window.confirm(`⚠️ ¿Estás seguro de eliminar el repuesto "${nombre}" del inventario?`)) {
            try {
                await api.delete(`/repuestos/${id}`);
                toast.success("🗑️ Repuesto eliminado");
                cargarRepuestos();
            } catch (err) { toast.error("❌ Error al eliminar el repuesto."); }
        }
    };

    // 💡 SÚPER BUSCADOR OMNICANAL
    const filtrados = repuestos.filter(r => {
        const txt = busqueda.toLowerCase();
        return (
            (r.nombre && r.nombre.toLowerCase().includes(txt)) || 
            (r.sku && r.sku.toLowerCase().includes(txt)) || 
            (r.descripcion && r.descripcion.toLowerCase().includes(txt))
        );
    });

    const valorTotalInventario = repuestos.reduce((acc, r) => acc + (Number(r.costo || 0) * Number(r.stock)), 0);
    const itemsBajoStock = repuestos.filter(r => Number(r.stock) <= 5).length;

    return (
        <div style={{ padding: '20px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #007bff' }}>
                    <div style={{ fontSize: '0.8em', color: '#007bff', fontWeight: 'bold' }}>CANTIDAD DE ARTÍCULOS</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#0056b3' }}>{repuestos.length}</div>
                </div>
                <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #2e7d32' }}>
                    <div style={{ fontSize: '0.8em', color: '#2e7d32', fontWeight: 'bold' }}>CAPITAL INVERTIDO (COSTO)</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1b5e20' }}>$ {valorTotalInventario.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                </div>
                <div style={{ background: itemsBajoStock > 0 ? '#ffebee' : '#f5f5f5', padding: '20px', borderRadius: '12px', borderLeft: `5px solid ${itemsBajoStock > 0 ? '#c62828' : '#9e9e9e'}` }}>
                    <div style={{ fontSize: '0.8em', color: itemsBajoStock > 0 ? '#c62828' : '#616161', fontWeight: 'bold' }}>ALERTAS DE STOCK (≤ 5)</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: itemsBajoStock > 0 ? '#b71c1c' : '#424242' }}>{itemsBajoStock} ítems</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>🔧 Gestión de Repuestos</h2>
                <button onClick={() => { setForm({ id: null, sku: '', nombre: '', descripcion: '', costo: '', porcentajeGanancia: '', precio: '', stock: '' }); setModalAbierto(true); }} style={{ background: '#007bff', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + INGRESAR REPUESTO
                </button>
            </div>

            <input type="text" placeholder="🔍 Buscar repuesto por nombre, descripción o SKU (Ej: r12)..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} />

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95em' }}>
                <thead><tr style={{ borderBottom: '2px solid #333', background: '#f8f9fa' }}><th style={{ padding: '12px' }}>SKU</th><th>Nombre y Detalle</th><th style={{ textAlign: 'center' }}>Stock</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'center' }}>Margen</th><th style={{ textAlign: 'right' }}>Venta</th><th style={{ textAlign: 'center' }}>Acciones</th></tr></thead>
                <tbody>
                    {filtrados.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #eee', background: Number(r.stock) <= 5 ? '#fffaf5' : 'transparent' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#546e7a' }}>{r.sku || '-'}</td>
                            <td><b style={{ color: '#0056b3' }}>{r.nombre}</b> <br/><small style={{ color: '#666' }}>{r.descripcion}</small></td>
                            <td style={{ textAlign: 'center' }}>
                                <span style={{ background: Number(r.stock) <= 5 ? '#ffc107' : '#e2e8f0', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', color: Number(r.stock) <= 5 ? '#856404' : '#333' }}>
                                    {r.stock} un.
                                </span>
                            </td>
                            <td style={{ textAlign: 'right', color: '#d32f2f' }}>$ {Number(r.costo || 0).toLocaleString('es-AR')}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2e7d32' }}>{r.porcentajeGanancia || 0}%</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1em' }}>$ {Number(r.precio).toLocaleString('es-AR')}</td>
                            <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={() => { setForm(r); setModalAbierto(true); }} style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Editar</button>
                                <button onClick={() => eliminarRepuesto(r.id, r.nombre)} style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                    {filtrados.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No se encontraron repuestos con esa búsqueda.</td></tr>}
                </tbody>
            </table>

            {/* 🛑 MODAL UX PROFESIONAL: REPUESTOS */}
            {modalAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <form onSubmit={guardarRepuesto} style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '550px', display: 'grid', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0, color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>{form.id ? '✏️ Modificar Repuesto' : '🆕 Ingreso de Repuesto'}</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>SKU (Ej: r12)</label>
                                <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Nombre del Repuesto (*)</label>
                                <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Resistencia 120mm" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Descripción / Marca</label>
                            <input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Opcional..." style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                        </div>

                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', color: '#d32f2f', marginBottom: '5px' }}>Costo ($) (*)</label>
                                    <input type="number" step="0.01" min="0" required value={form.costo} onChange={e => manejarCambiosFinancieros('costo', e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffcdd2' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>Margen de Ganancia (%)</label>
                                    <input type="number" step="0.01" min="0" required value={form.porcentajeGanancia} onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #c8e6c9' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 'bold', color: '#0056b3', marginBottom: '5px' }}>Precio Venta Final ($)</label>
                                    <input type="number" step="0.01" required value={form.precio} readOnly style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #b3d7ff', background: '#e6f2ff', fontWeight: 'bold', color: '#0056b3' }} />
                                </div>
                            </div>
                            
                            {(form.costo > 0 && form.porcentajeGanancia > 0) && (
                                <div style={{ marginTop: '10px', fontSize: '0.85em', textAlign: 'right', color: '#2e7d32', fontWeight: 'bold' }}>
                                    ✨ Ganancia limpia por unidad: $ {(Number(form.precio) - Number(form.costo)).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Stock Actual (*)</label>
                            <input type="number" min="0" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="0" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="button" onClick={() => setModalAbierto(false)} style={{ flex: 1, background: '#e0e0e0', color: '#333', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>CANCELAR</button>
                            <button type="submit" style={{ flex: 2, background: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💾 GUARDAR ARTÍCULO</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}