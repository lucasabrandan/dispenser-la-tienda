import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Utilidades
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioList({ onEditar }) {
    const [servicios, setServicios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    const cargarServicios = () => {
        api.get('/servicios')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                // Ordenar: lo más nuevo arriba
                setServicios(data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
            })
            .catch(() => toast.error("Error al conectar con el historial"));
    };

    const aprobarPresupuesto = async (id) => {
        const loading = toast.loading("Confirmando operación...");
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: "REALIZADO" });
            toast.success("✅ ¡Confirmado!", { id: loading });
            cargarServicios(); 
        } catch (err) { toast.error("Error al procesar", { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        if(window.confirm("⚠️ ¿Eliminar permanentemente este registro?")) {
            try {
                await api.delete(`/servicios/${id}`);
                toast.success("🗑️ Registro borrado");
                cargarServicios();
            } catch (err) { toast.error("Error al eliminar"); }
        }
    };

    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;
    
    // --- 🧠 LÓGICA DE FILTRADO COMPLETA ---
    const filtrados = servicios.filter(s => {
        const txt = busqueda.toLowerCase();
        let pasaTab = false;
        if (filtroTab === 'TODOS') pasaTab = true;
        if (filtroTab === 'PRESUPUESTO') pasaTab = s.estado === 'PRESUPUESTO';
        if (filtroTab === 'VENTA') pasaTab = s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO';
        if (filtroTab === 'TECNICA') pasaTab = s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO';

        return pasaTab && (
            (s.clienteNombre?.toLowerCase() || '').includes(txt) || 
            (s.sedeNombre?.toLowerCase() || '').includes(txt) ||
            s.items?.some(it => it.equipoSerial?.toLowerCase().includes(txt))
        );
    });

    // Totales dinámicos para el Dashboard
    const totalVentas = servicios
        .filter(s => s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO')
        .reduce((acc, s) => acc + calcularCosto(s), 0);

    const totalTecnica = servicios
        .filter(s => s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO')
        .reduce((acc, s) => acc + calcularCosto(s), 0);

    return (
        <div style={{ background: '#F4F7F6', minHeight: '100vh', padding: '15px', paddingBottom: '100px' }}>
            
            {/* --- DASHBOARD SUPERIOR (BORDES DE COLOR) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#FFF', padding: '15px', borderRadius: '16px', borderLeft: '8px solid #008000', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#008000', margin: 0 }}>VENTAS INSUMOS</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#000', margin: 0 }}>$ {totalVentas.toLocaleString()}</p>
                </div>
                <div style={{ background: '#FFF', padding: '15px', borderRadius: '16px', borderLeft: '8px solid #E54D42', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#E54D42', margin: 0 }}>TÉCNICA / MO</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#000', margin: 0 }}>$ {totalTecnica.toLocaleString()}</p>
                </div>
            </div>

            {/* --- BUSCADOR Y TABS (STICKY) --- */}
            <div style={{ position: 'sticky', top: '10px', zIndex: 100, background: '#F4F7F6', paddingBottom: '10px' }}>
                <input 
                    placeholder="🔍 Cliente, Sede o S/N..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)} 
                    style={{ width: '100%', padding: '15px', background: '#FFF', borderRadius: '12px', border: '2px solid #000', fontSize: '16px', fontWeight: 'bold', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '5px', background: '#000', padding: '5px', borderRadius: '12px', marginTop: '10px' }}>
                    {['TODOS', 'VENTA', 'TECNICA', 'PRESUPUESTO'].map(t => (
                        <button key={t} onClick={() => setFiltroTab(t)}
                            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                                background: filtroTab === t ? '#FFF' : 'transparent',
                                color: filtroTab === t ? '#000' : '#FFF', transition: '0.2s' }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- LISTADO DE TARJETAS --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                {filtrados.map(s => (
                    <div key={s.id} style={{ background: '#FFF', padding: '18px', borderRadius: '20px', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '11px', color: '#999', fontWeight: 'bold' }}>#{s.id}</span>
                                    <span style={{ 
                                        fontSize: '10px', fontWeight: '900', padding: '3px 8px', borderRadius: '6px',
                                        background: s.estado === 'PRESUPUESTO' ? '#FFF159' : (s.servicioTipo === 'TECNICA' ? '#FFEBEB' : '#E6F4EA'),
                                        color: s.estado === 'PRESUPUESTO' ? '#000' : (s.servicioTipo === 'TECNICA' ? '#E54D42' : '#008000')
                                    }}>
                                        {s.estado === 'PRESUPUESTO' ? 'PENDIENTE' : s.servicioTipo}
                                    </span>
                                </div>
                                <h4 style={{ fontSize: '18px', fontWeight: '900', margin: '0', color: '#000' }}>{s.clienteNombre}</h4>
                                <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0' }}>📍 {s.sedeNombre}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '22px', fontWeight: '900', color: '#000' }}>$ {calcularCosto(s).toLocaleString()}</div>
                                <div style={{ fontSize: '11px', color: '#AAA' }}>{s.fecha}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #F8F8F8' }}>
                            
                            {/* 🛡️ BOTÓN EDITAR CANDADO: Solo si es presupuesto */}
                            {s.estado === 'PRESUPUESTO' && (
                                <button onClick={() => onEditar(s)} style={{ background: '#FFF', border: '2px solid #000', borderRadius: '10px', padding: '10px 14px', fontSize: '16px', boxShadow: '2px 2px 0px #000' }}>✏️</button>
                            )}
                            
                            <button onClick={() => setModalDetalle(s)} style={{ background: '#F8F9FA', border: '1px solid #DDD', borderRadius: '10px', padding: '10px 14px', fontSize: '16px' }}>👁️</button>
                            
                            <button onClick={() => generarRemitoPDFPremium({
                                esPresupuesto: s.estado === 'PRESUPUESTO',
                                cliente: { nombre: s.clienteNombre },
                                sede: { nombreSede: s.sedeNombre },
                                tecnico: "Marcos",
                                ticketItems: s.items.map(it => ({ ...it, totalCalculado: it.costo })),
                                totalFinal: calcularCosto(s),
                                fechaServicio: s.fecha
                            })} style={{ background: '#F8F9FA', border: '1px solid #DDD', borderRadius: '10px', padding: '10px 14px', fontSize: '16px' }}>📄</button>
                            
                            {s.estado === 'PRESUPUESTO' && (
                                <button onClick={() => aprobarPresupuesto(s.id)} style={{ background: '#000', color: '#FFF', borderRadius: '10px', padding: '0 15px', fontWeight: '900', fontSize: '11px' }}>COBRAR</button>
                            )}
                            
                            <button onClick={() => eliminarServicio(s.id)} style={{ background: '#FFF', color: '#E54D42', border: '1px solid #FFEBEB', borderRadius: '10px', padding: '10px', fontSize: '18px' }}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL DE DETALLE COMPLETO (RECUPERADO) --- */}
            {modalDetalle && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 2000 }}>
                    <div style={{ background: '#FFF', width: '100%', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '25px', borderTop: '4px solid #000' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>DESGLOSE DEL SERVICIO</h3>
                        
                        <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
                            {modalDetalle.items.map((it, idx) => (
                                <div key={idx} style={{ background: '#F8F9FA', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #EEE' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontWeight: '900', color: '#E54D42' }}>{it.equipoSerial}</span>
                                        <span style={{ fontWeight: '900' }}>$ {Number(it.costo).toLocaleString()}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', margin: '0 0 8px' }}>{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div style={{ fontSize: '11px', color: '#666', borderTop: '1px solid #EEE', paddingTop: '8px' }}>
                                            <strong>Repuestos:</strong> {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)} style={{ width: '100%', padding: '18px', background: '#000', color: '#FFF', borderRadius: '15px', fontWeight: '900' }}>CERRAR</button>
                    </div>
                </div>
            )}
        </div>
    );
}