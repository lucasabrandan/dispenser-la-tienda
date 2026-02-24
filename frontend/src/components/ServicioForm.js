import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ServicioForm({ onSaved }) {
    const [clientes, setClientes] = useState([]); // 💡 NUEVO: Lista de clientes
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [repuestosDB, setRepuestosDB] = useState([]);
    const [repuestoSeleccionado, setRepuestoSeleccionado] = useState(""); 
    
    const [esPresupuesto, setEsPresupuesto] = useState(false);

    const [form, setForm] = useState({
        sedeId: '', equipoSerial: '', tecnico: 'Marcos', 
        costoMO: '', descuento: '', pago: 'EFECTIVO', 
        trabajo: '', repuestosUsados: []
    });

    useEffect(() => {
        api.get('/clientes').then(res => setClientes(res.data)).catch(() => {}); // 💡 NUEVO
        api.get('/sedes').then(res => setSedes(res.data)).catch(() => {});
        api.get('/equipos').then(res => setEquipos(res.data)).catch(() => {});
        api.get('/repuestos').then(res => setRepuestosDB(res.data)).catch(() => {});
    }, []);

    // 💡 FILTROS EN CASCADA
    const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState('');
    const sedesFiltradas = sedes.filter(s => s.cliente?.id.toString() === clienteIdSeleccionado);
    const equiposFiltrados = equipos.filter(eq => eq.sede?.id.toString() === form.sedeId);

    // 📦 Función Limpia para añadir Repuestos
    const añadirRepuesto = () => {
        if (!repuestoSeleccionado) return;
        const rep = repuestosDB.find(r => r.id.toString() === repuestoSeleccionado);
        if (rep) {
            setForm({ ...form, repuestosUsados: [...form.repuestosUsados, rep] });
            setRepuestoSeleccionado(""); 
        }
    };

    // 📦 Función para quitar un repuesto agregado por error
    const quitarRepuesto = (index) => {
        const nuevosRepuestos = [...form.repuestosUsados];
        nuevosRepuestos.splice(index, 1);
        setForm({ ...form, repuestosUsados: nuevosRepuestos });
    };

    const calcular = () => {
        const mo = parseFloat(form.costoMO) || 0;
        const dTxt = form.descuento.toString();
        const dVal = dTxt.endsWith('%') ? (mo * parseFloat(dTxt) / 100) : parseFloat(dTxt) || 0;
        
        const moFinal = Math.max(0, mo - dVal);
        const totalRep = form.repuestosUsados.reduce((acc, r) => acc + r.precio, 0);
        return { total: moFinal + totalRep, moFinal, totalRep };
    };

    const { total, moFinal, totalRep } = calcular();

    const guardar = async (e) => {
        e.preventDefault();
        try {
            const detalleRep = form.repuestosUsados.map(r => r.nombre).join(", ");
            await api.post('/servicios', {
                sedeId: form.sedeId, usuarioId: 1, fecha: new Date().toISOString().split('T')[0],
                servicioTipo: "REPARACION", estado: esPresupuesto ? "PRESUPUESTO" : "VENTA",
                items: [{ 
                    equipoSerial: form.equipoSerial, tecnico: form.tecnico, costo: total,
                    metodoPago: form.pago, 
                    trabajoRealizado: `${form.trabajo} ${detalleRep ? '[Repuestos: '+detalleRep+']' : ''}`, 
                    trabajoTipo: "REPARACION"
                }]
            });
            toast.success('¡Registro Exitoso!');
            if (onSaved) onSaved();
            // Limpiamos todo al guardar
            setForm({...form, equipoSerial: '', costoMO: '', repuestosUsados: [], trabajo: ''});
        } catch (err) { toast.error('Error al guardar. Verificá los datos.'); }
    };

    return (
        <div style={{ padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            
            {/* 🔴 BOTONERA DE ESTADO */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}>
                <button type="button" onClick={() => setEsPresupuesto(false)} style={{ flex: 1, background: !esPresupuesto ? '#2e7d32' : '#e0e0e0', color: !esPresupuesto ? 'white' : '#555', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ MODO VENTA (Caja)
                </button>
                <button type="button" onClick={() => setEsPresupuesto(true)} style={{ flex: 1, background: esPresupuesto ? '#546e7a' : '#e0e0e0', color: esPresupuesto ? 'white' : '#555', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📋 MODO PRESUPUESTO
                </button>
            </div>

            <form onSubmit={guardar} style={{ display: 'grid', gap: '15px' }}>
                
                {/* 🛡️ FILTRO DE 3 PASOS EN CASCADA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: '#f0f7ff', padding: '15px', borderRadius: '10px', border: '1px solid #b6d4fe' }}>
                    {/* PASO 1: CLIENTE */}
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#0056b3' }}>1. CLIENTE</label>
                        <select value={clienteIdSeleccionado} onChange={e => { setClienteIdSeleccionado(e.target.value); setForm({...form, sedeId: '', equipoSerial: ''}); }} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                            <option value="">-- Seleccionar --</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>

                    {/* PASO 2: SEDE */}
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#0056b3' }}>2. DOMICILIO (SEDE)</label>
                        <select value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value, equipoSerial: ''})} required disabled={!clienteIdSeleccionado} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                            <option value="">-- Seleccionar --</option>
                            {sedesFiltradas.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                        </select>
                    </div>

                    {/* PASO 3: DISPENSER */}
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#0056b3' }}>3. DISPENSER</label>
                        <select value={form.equipoSerial} onChange={e => setForm({...form, equipoSerial: e.target.value})} required disabled={!form.sedeId} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                            <option value="">-- Seleccionar --</option>
                            {equiposFiltrados.map(eq => (
                                <option key={eq.id} value={eq.numeroSerie}>{eq.marca} {eq.modelo} (SN: {eq.numeroSerie})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 📦 SECCIÓN DE REPUESTOS */}
                <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#333' }}>📦 AÑADIR REPUESTOS AL TRABAJO</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <select value={repuestoSeleccionado} onChange={e => setRepuestoSeleccionado(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                            <option value="">-- Elegir repuesto del stock --</option>
                            {repuestosDB.map(r => <option key={r.id} value={r.id}>{r.nombre} (${r.precio})</option>)}
                        </select>
                        <button type="button" onClick={añadirRepuesto} style={{ background: '#007bff', color: 'white', border: 'none', padding: '0 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            + AÑADIR
                        </button>
                    </div>
                    
                    {form.repuestosUsados.length > 0 && (
                        <ul style={{ marginTop: '15px', paddingLeft: 0, listStyle: 'none' }}>
                            {form.repuestosUsados.map((r, i) => (
                                <li key={i} style={{ background: 'white', padding: '8px 12px', marginBottom: '5px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ccc' }}>
                                    <span>⚙️ {r.nombre} <b>(${r.precio})</b></span>
                                    <button type="button" onClick={() => quitarRepuesto(i)} style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>❌ Quitar</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>DETALLE DEL TRABAJO</label>
                    <input placeholder="Ej: Mantenimiento preventivo..." value={form.trabajo} onChange={e => setForm({...form, trabajo: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>MANO DE OBRA ($)</label>
                        <input type="number" min="0" placeholder="0" value={form.costoMO} 
                            onChange={e => setForm({...form, costoMO: e.target.value})} 
                            onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>DESCUENTO (% o $)</label>
                        <input type="text" placeholder="Ej: 10% o 500" value={form.descuento} 
                            onChange={e => setForm({...form, descuento: e.target.value})} 
                            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
                    </div>
                </div>

                <div style={{ background: esPresupuesto ? '#eceff1' : '#e8f5e9', padding: '20px', borderRadius: '10px', textAlign: 'center', border: `2px solid ${esPresupuesto ? '#cfd8dc' : '#a5d6a7'}` }}>
                    <div style={{ fontSize: '0.9em', color: '#666', fontWeight: 'bold' }}>
                        TOTAL {esPresupuesto ? 'DEL PRESUPUESTO' : 'A COBRAR'}
                    </div>
                    <div style={{ fontSize: '2.8em', fontWeight: 'bold', color: esPresupuesto ? '#455a64' : '#1b5e20' }}>
                        $ {total.toLocaleString('es-AR')}
                    </div>
                    <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                        Mano de Obra (con desc): ${moFinal} &nbsp;|&nbsp; Repuestos: ${totalRep}
                    </div>
                </div>

                <button type="submit" style={{ padding: '18px', background: esPresupuesto ? '#546e7a' : '#2e7d32', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1.2em' }}>
                    {esPresupuesto ? '💾 GUARDAR PRESUPUESTO' : '🚀 CONFIRMAR VENTA'}
                </button>
            </form>
        </div>
    );
} 