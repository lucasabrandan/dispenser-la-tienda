import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    
    // 💡 NUEVO: Estado para abrir la ventana de detalles (El Ojo)
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    const cargarServicios = () => {
        api.get('/servicios').then(res => setServicios(res.data)).catch(() => {});
    };

    const aprobarPresupuesto = async (id) => {
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: "VENTA" });
            toast.success("✅ ¡Cobro registrado en caja!");
            cargarServicios(); 
        } catch (err) { toast.error("Error al actualizar estado"); }
    };

    const eliminarServicio = async (id) => {
        if(window.confirm("⚠️ ¿Estás seguro de eliminar este registro de la caja permanentemente?")) {
            try {
                await api.delete(`/servicios/${id}`);
                toast.success("🗑️ Registro eliminado");
                cargarServicios();
            } catch (err) { toast.error("Error al eliminar"); }
        }
    };

    // LÓGICA FINANCIERA
    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;
    
    const ventas = servicios.filter(s => (s.estado || '').trim().toUpperCase() === 'VENTA');
    const presupuestos = servicios.filter(s => (s.estado || '').trim().toUpperCase() === 'PRESUPUESTO');

    const totalFacturado = ventas.reduce((acc, s) => acc + calcularCosto(s), 0);
    const totalPresupuestado = presupuestos.reduce((acc, s) => acc + calcularCosto(s), 0);
    
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const ventasHoy = ventas.filter(s => (s.fechaServicio || s.fecha || '').startsWith(hoyStr));
    const cajaDelDia = ventasHoy.reduce((acc, s) => acc + calcularCosto(s), 0);

    const filtrados = servicios.filter(s => {
        const estadoLimpio = (s.estado || '').trim().toUpperCase();
        const coincideTab = filtroTab === 'TODOS' || estadoLimpio === filtroTab;
        const txt = busqueda.toLowerCase();
        const sede = (s.sedeNombre?.toLowerCase() || "");
        const coincideBusqueda = sede.includes(txt) || s.items?.some(i => (i.equipoSerial?.toLowerCase() || "").includes(txt));
        return coincideTab && coincideBusqueda;
    });

    return (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '15px', marginTop: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            
            {/* 💰 DASHBOARD FINANCIERO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #2e7d32' }}>
                    <div style={{ fontSize: '0.8em', color: '#2e7d32', fontWeight: 'bold' }}>CAJA DEL DÍA (HOY)</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1b5e20' }}>$ {cajaDelDia.toLocaleString('es-AR')}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>{ventasHoy.length} operaciones hoy</div>
                </div>
                <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #007bff' }}>
                    <div style={{ fontSize: '0.8em', color: '#007bff', fontWeight: 'bold' }}>FACTURACIÓN TOTAL</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#0056b3' }}>$ {totalFacturado.toLocaleString('es-AR')}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>{ventas.length} ventas confirmadas</div>
                </div>
                <div style={{ background: '#eceff1', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #546e7a' }}>
                    <div style={{ fontSize: '0.8em', color: '#546e7a', fontWeight: 'bold' }}>EN PRESUPUESTO</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#37474f' }}>$ {totalPresupuestado.toLocaleString('es-AR')}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>{presupuestos.length} pendientes de cobro</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '5px', background: '#f1f3f5', padding: '5px', borderRadius: '8px' }}>
                    <button onClick={() => setFiltroTab('TODOS')} style={{ padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', background: filtroTab === 'TODOS' ? 'white' : 'transparent', boxShadow: filtroTab === 'TODOS' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>Ver Todo</button>
                    <button onClick={() => setFiltroTab('VENTA')} style={{ padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', color: '#2e7d32', background: filtroTab === 'VENTA' ? 'white' : 'transparent', boxShadow: filtroTab === 'VENTA' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>Solo Ventas</button>
                    <button onClick={() => setFiltroTab('PRESUPUESTO')} style={{ padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', color: '#546e7a', background: filtroTab === 'PRESUPUESTO' ? 'white' : 'transparent', boxShadow: filtroTab === 'PRESUPUESTO' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>Presupuestos Pendientes</button>
                </div>
                <input type="text" placeholder="🔍 Buscar por sede o serie..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ padding: '10px', width: '300px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Fecha</th><th>Sede / Cliente</th><th>Serie</th><th>Estado</th><th style={{ textAlign: 'right' }}>Total ($)</th><th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.map(s => {
                        const esPresu = (s.estado || '').trim().toUpperCase() === 'PRESUPUESTO';
                        return s.items?.map((item, idx) => (
                            <tr key={`${s.id}-${idx}`} style={{ borderBottom: '1px solid #eee', backgroundColor: esPresu ? '#fcfcfc' : 'white' }}>
                                <td style={{ padding: '12px', color: '#555' }}>{s.fechaServicio || s.fecha}</td>
                                <td><b style={{ color: '#0056b3' }}>{s.sedeNombre}</b></td>
                                <td>{item.equipoSerial}</td>
                                <td>
                                    <span style={{ fontSize: '0.8em', padding: '4px 10px', borderRadius: '15px', background: esPresu ? '#e2e8f0' : '#d4edda', color: esPresu ? '#475569' : '#155724', fontWeight: 'bold' }}>
                                        {s.estado}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>$ {Number(item.costo || 0).toLocaleString('es-AR')}</td>
                                <td style={{ textAlign: 'center' }}>
                                    
                                    {/* 💡 ACÁ ESTÁ EL NUEVO BOTÓN PARA VER LA GANANCIA */}
                                    <button onClick={() => setModalDetalle({ s, item })} title="Ver Detalles del Trabajo" style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', marginRight: '5px' }}>👁️</button>
                                    
                                    {esPresu && (
                                        <button onClick={() => aprobarPresupuesto(s.id)} title="Convertir en Venta" style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px', fontWeight: 'bold', marginRight: '5px' }}>💰 Cobrar</button>
                                    )}
                                    <button onClick={() => eliminarServicio(s.id)} title="Eliminar Registro" style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>🗑️</button>
                                </td>
                            </tr>
                        ));
                    })}
                    {filtrados.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No hay registros para mostrar.</td></tr>}
                </tbody>
            </table>

            {/* 🛑 MODAL UX PROFESIONAL: RADIOGRAFÍA DEL TRABAJO */}
            {modalDetalle && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#333' }}>🧾 Radiografía del Trabajo</h3>
                            <button onClick={() => setModalDetalle(null)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}>X CERRAR</button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ margin: '5px 0' }}><strong>Sede/Cliente:</strong> {modalDetalle.s.sedeNombre}</p>
                            <p style={{ margin: '5px 0' }}><strong>Dispenser:</strong> SN: {modalDetalle.item.equipoSerial}</p>
                            <p style={{ margin: '5px 0' }}><strong>Técnico:</strong> {modalDetalle.item.tecnico}</p>
                            <p style={{ margin: '5px 0' }}><strong>Detalle:</strong> <span style={{ color: '#555' }}>{modalDetalle.item.trabajoRealizado || 'Sin detalles'}</span></p>
                        </div>

                        {/* 📊 LA MATEMÁTICA DE LA GANANCIA */}
                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Facturado al cliente:</span>
                                <b>$ {Number(modalDetalle.item.costo || 0).toLocaleString('es-AR')}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#d32f2f' }}>
                                <span>Costo de Repuestos (Interno):</span>
                                <b>- $ {Number(modalDetalle.item.costoInterno || 0).toLocaleString('es-AR')}</b>
                            </div>
                            <hr style={{ borderTop: '1px solid #ccc' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '1.2em', color: '#2e7d32' }}>
                                <b>✨ GANANCIA NETA:</b>
                                <b>$ {(Number(modalDetalle.item.costo || 0) - Number(modalDetalle.item.costoInterno || 0)).toLocaleString('es-AR')}</b>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}