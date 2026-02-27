import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// ⚛️ Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

// 🛠️ Utilidades
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    const cargarServicios = () => {
        api.get('/servicios').then(res => setServicios(res.data)).catch(() => toast.error("Error al cargar historial"));
    };

    const aprobarPresupuesto = async (id) => {
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: "VENTA" });
            toast.success("✅ ¡Caja actualizada!");
            cargarServicios(); 
        } catch (err) { toast.error("Error al cobrar"); }
    };

    const eliminarServicio = async (id) => {
        if(window.confirm("⚠️ ¿Eliminar permanentemente?")) {
            try {
                await api.delete(`/servicios/${id}`);
                toast.success("🗑️ Registro borrado");
                cargarServicios();
            } catch (err) { toast.error("Error al eliminar"); }
        }
    };

    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;
    const ventas = servicios.filter(s => (s.estado || '').toUpperCase() === 'VENTA');
    const totalFacturado = ventas.reduce((acc, s) => acc + calcularCosto(s), 0);

    const filtrados = servicios.filter(s => {
        const estadoLimpio = (s.estado || '').trim().toUpperCase();
        const coincideTab = filtroTab === 'TODOS' || estadoLimpio === filtroTab;
        const txt = busqueda.toLowerCase();
        return coincideTab && (s.clienteNombre?.toLowerCase().includes(txt) || s.sedeNombre?.toLowerCase().includes(txt));
    });

    return (
        <div style={{ color: 'var(--text-primary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <Card style={{ borderLeft: '5px solid var(--status-success)' }}>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>FACTURACIÓN TOTAL</div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--status-success)' }}>$ {totalFacturado.toLocaleString()}</div>
                </Card>
                <Card style={{ borderLeft: '5px solid var(--brand-yellow)' }}>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>OPERACIONES</div>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{servicios.length}</div>
                </Card>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant={filtroTab === 'TODOS' ? 'primary' : 'secondary'} onClick={() => setFiltroTab('TODOS')}>TODOS</Button>
                    <Button variant={filtroTab === 'VENTA' ? 'success' : 'secondary'} onClick={() => setFiltroTab('VENTA')}>VENTAS</Button>
                </div>
                <Input placeholder="🔍 Buscar por cliente o sede..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{maxWidth: '300px', marginBottom: 0}} />
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '15px' }}>Fecha</th>
                            <th>Cliente / Sede</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '15px', fontSize: '13px' }}>{s.fecha}</td>
                                <td>
                                    <b style={{color: 'var(--brand-yellow)'}}>{s.clienteNombre}</b><br/>
                                    <small>{s.sedeNombre}</small>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>$ {calcularCosto(s).toLocaleString()}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <Button variant="secondary" onClick={() => generarRemitoPDFPremium({ esPresupuesto: s.estado === 'PRESUPUESTO', cliente: {nombre: s.clienteNombre}, sede: {nombreSede: s.sedeNombre}, tecnico: "Marcos", ticketItems: s.items.map(i => ({...i, moFinal: i.costo, subtotalCobrado: i.costo})), totalFinal: calcularCosto(s) })} style={{padding: '5px 10px', marginRight: '5px'}}>📄</Button>
                                    <Button variant="secondary" onClick={() => setModalDetalle(s)} style={{padding: '5px 10px', marginRight: '5px'}}>👁️</Button>
                                    {s.estado === 'PRESUPUESTO' && <Button variant="success" onClick={() => aprobarPresupuesto(s.id)} style={{padding: '5px 10px', marginRight: '5px'}}>💰</Button>}
                                    <Button variant="danger" onClick={() => eliminarServicio(s.id)} style={{padding: '5px 10px'}}>🗑️</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* MODAL RADIOGRAFÍA CON TU LÓGICA DE GANANCIA NETA */}
            {modalDetalle && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '500px', borderTop: '5px solid var(--brand-red)' }}>
                        <h3>🧾 Detalle de Operación</h3>
                        <div style={{ marginBottom: '20px', fontSize: '14px' }}>
                            <p><strong>Cliente:</strong> {modalDetalle.clienteNombre}</p>
                            <p><strong>Sede:</strong> {modalDetalle.sedeNombre}</p>
                            <hr style={{borderColor: 'var(--border-color)'}} />
                            {modalDetalle.items.map((item, idx) => (
                                <div key={idx} style={{background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', marginTop: '10px'}}>
                                    <p><strong>Equipo:</strong> {item.equipoSerial}</p>
                                    <p><strong>Ganancia Neta:</strong> <span style={{color: 'var(--status-success)'}}>$ {(Number(item.costo) - Number(item.costoInterno)).toLocaleString()}</span></p>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" onClick={() => setModalDetalle(null)} style={{width: '100%'}}>CERRAR</Button>
                    </Card>
                </div>
            )}
        </div>
    );
}