import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Átomos UI
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

// Utilidades
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    const cargarServicios = () => {
        api.get('/servicios')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                // Ordenar por fecha: lo más nuevo arriba de todo
                setServicios(data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
            })
            .catch(() => toast.error("Error al conectar con el historial"));
    };

    const aprobarPresupuesto = async (id) => {
        const loading = toast.loading("Confirmando cobro...");
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: "VENTA" });
            toast.success("✅ ¡Venta confirmada!", { id: loading });
            cargarServicios(); 
        } catch (err) { toast.error("Error al procesar el pago", { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        if(window.confirm("⚠️ ¿Eliminar permanentemente este registro? Esta acción no se puede deshacer.")) {
            try {
                await api.delete(`/servicios/${id}`);
                toast.success("🗑️ Registro borrado");
                cargarServicios();
            } catch (err) { toast.error("Error al eliminar"); }
        }
    };

    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;
    
    // --- LÓGICA DE FILTRADO ---
    const filtrados = servicios.filter(s => {
        const coincideTab = filtroTab === 'TODOS' || (s.estado || '').toUpperCase() === filtroTab;
        const txt = busqueda.toLowerCase();
        
        return coincideTab && (
            (s.clienteNombre?.toLowerCase() || '').includes(txt) || 
            (s.sedeNombre?.toLowerCase() || '').includes(txt) ||
            s.items?.some(it => it.equipoSerial?.toLowerCase().includes(txt))
        );
    });

    const totalFacturado = servicios
        .filter(s => (s.estado || '').toUpperCase() === 'VENTA')
        .reduce((acc, s) => acc + calcularCosto(s), 0);

    // --- RE-IMPRESIÓN DE PDF CON DESGLOSE ---
    const dispararPDF = (s) => {
        generarRemitoPDFPremium({
            esPresupuesto: s.estado === 'PRESUPUESTO',
            cliente: { nombre: s.clienteNombre },
            sede: { nombreSede: s.sedeNombre },
            tecnico: "Marcos",
            // Mapeamos los items recuperando los repuestos y la MO que guardamos
            ticketItems: s.items.map(it => ({
                equipoSerial: it.equipoSerial,
                trabajo: it.trabajoRealizado,
                totalCalculado: it.costo,
                costoExtra: it.costoExtra || 0,
                repuestosUsados: it.repuestosUsados || []
            })),
            totalFinal: calcularCosto(s)
        });
    };

    return (
        <div style={{ background: '#F0F0F0', minHeight: '100vh', padding: '15px', color: '#000' }}>
            
            {/* --- DASHBOARD SUPERIOR --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#00A650', padding: '15px', borderRadius: '16px', border: '2px solid #000', boxShadow: '4px 4px 0px #000' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#FFF', margin: 0 }}>FACTURACIÓN (VENTAS)</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#FFF', margin: 0 }}>$ {totalFacturado.toLocaleString()}</p>
                </div>
                <div style={{ background: '#FFF', padding: '15px', borderRadius: '16px', border: '2px solid #000', boxShadow: '4px 4px 0px #000' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', margin: 0 }}>TOTAL ÓRDENES</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', color: '#000', margin: 0 }}>{servicios.length}</p>
                </div>
            </div>

            {/* --- BUSCADOR Y TABS --- */}
            <div style={{ marginBottom: '20px' }}>
                <input 
                    placeholder="🔍 Cliente, Sede o S/N..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)} 
                    style={{ width: '100%', padding: '15px', background: '#FFF', borderRadius: '12px', border: '2px solid #000', fontSize: '16px', fontWeight: 'bold' }}
                />
                <div style={{ display: 'flex', gap: '5px', background: '#000', padding: '5px', borderRadius: '12px', marginTop: '10px' }}>
                    {['TODOS', 'VENTA', 'PRESUPUESTO'].map(t => (
                        <button key={t} onClick={() => setFiltroTab(t)}
                            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '900',
                                background: filtroTab === t ? '#FFF' : 'transparent',
                                color: filtroTab === t ? '#000' : '#FFF' }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- LISTADO DE TARJETAS --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
                {filtrados.map(s => (
                    <div key={s.id} style={{ background: '#FFF', padding: '15px', borderRadius: '20px', border: '2px solid #000', boxShadow: '2px 2px 0px #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div>
                                <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>📅 {new Date(s.fecha).toLocaleDateString()}</span>
                                <h4 style={{ fontSize: '17px', fontWeight: '900', margin: '2px 0', color: '#000' }}>{s.clienteNombre}</h4>
                                <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>📍 {s.sedeNombre}</p>
                            </div>
                            <span style={{ 
                                fontSize: '10px', fontWeight: '900', padding: '5px 10px', borderRadius: '8px', border: '1px solid #000',
                                background: s.estado === 'VENTA' ? '#D1FAE5' : '#FFF159',
                                color: '#000'
                            }}>
                                {s.estado}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EEE', paddingTop: '12px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#000' }}>$ {calcularCosto(s).toLocaleString()}</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setModalDetalle(s)} style={{ background: '#EEE', border: '1px solid #000', borderRadius: '10px', padding: '10px', fontSize: '18px' }}>👁️</button>
                                <button onClick={() => dispararPDF(s)} style={{ background: '#EEE', border: '1px solid #000', borderRadius: '10px', padding: '10px', fontSize: '18px' }}>📄</button>
                                {s.estado === 'PRESUPUESTO' && (
                                    <button onClick={() => aprobarPresupuesto(s.id)} style={{ background: '#FFF159', border: '1px solid #000', borderRadius: '10px', padding: '10px', fontWeight: '900', fontSize: '12px' }}>💰 COBRAR</button>
                                )}
                                <button onClick={() => eliminarServicio(s.id)} style={{ background: '#FF0000', color: '#FFF', border: '1px solid #000', borderRadius: '10px', padding: '10px', fontSize: '18px' }}>🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL DE DETALLE --- */}
            {modalDetalle && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 2000 }}>
                    <div style={{ background: '#FFF', width: '100%', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '25px', border: '2px solid #000' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', color: '#000' }}>DETALLE DE LA OPERACIÓN</h3>
                        <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
                            {modalDetalle.items.map((item, idx) => (
                                <div key={idx} style={{ background: '#F9FAFB', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #DDD' }}>
                                    <p style={{ fontSize: '14px', fontWeight: '900', margin: '0 0 5px', color: '#000' }}>📦 {item.equipoSerial}</p>
                                    <p style={{ fontSize: '13px', color: '#444', margin: '0 0 10px' }}>{item.trabajoRealizado}</p>
                                    <div style={{ borderTop: '1px solid #EEE', paddingTop: '10px', textAlign: 'right', fontWeight: '900', fontSize: '18px', color: '#00A650' }}>
                                        $ {Number(item.costo).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button onClick={() => setModalDetalle(null)} style={{ width: '100%', height: '55px', background: '#000' }}>CERRAR</Button>
                    </div>
                </div>
            )}
        </div>
    );
}