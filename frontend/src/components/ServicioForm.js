import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ServicioForm({ onSaved }) {
    const [clientes, setClientes] = useState([]); 
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [repuestosDB, setRepuestosDB] = useState([]);
    const [repuestoSeleccionado, setRepuestoSeleccionado] = useState(""); 
    
    const [esPresupuesto, setEsPresupuesto] = useState(false);

    // 💡 BUSCADORES
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaRepuesto, setBusquedaRepuesto] = useState('');

    const [form, setForm] = useState({
        sedeId: '', equipoSerial: '', tecnico: 'Marcos', 
        costoMO: '', descuento: '', pago: 'EFECTIVO', 
        trabajo: '', repuestosUsados: []
    });

    useEffect(() => {
        api.get('/clientes').then(res => setClientes(res.data)).catch(() => {}); 
        api.get('/sedes').then(res => setSedes(res.data)).catch(() => {});
        api.get('/equipos').then(res => setEquipos(res.data)).catch(() => {});
        api.get('/repuestos').then(res => setRepuestosDB(res.data)).catch(() => {});
    }, []);

    const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState('');

    // 💡 LÓGICA REPARADA: Si hay un seleccionado, NUNCA lo ocultamos al filtrar
    const clientesFiltrados = clientes.filter(c => {
        if (clienteIdSeleccionado && c.id.toString() === clienteIdSeleccionado.toString()) return true;
        const txt = busquedaCliente.toLowerCase();
        return (c.nombre?.toLowerCase().includes(txt) || c.cuilDni?.toLowerCase().includes(txt) || c.telefono?.toLowerCase().includes(txt) || c.email?.toLowerCase().includes(txt));
    });

    const repuestosFiltrados = repuestosDB.filter(r => {
        if (repuestoSeleccionado && r.id.toString() === repuestoSeleccionado.toString()) return true;
        const txt = busquedaRepuesto.toLowerCase();
        return (r.nombre?.toLowerCase().includes(txt) || r.sku?.toLowerCase().includes(txt) || r.descripcion?.toLowerCase().includes(txt));
    });

    const sedesFiltradas = sedes.filter(s => s.cliente?.id.toString() === clienteIdSeleccionado);
    const equiposFiltrados = equipos.filter(eq => eq.sede?.id.toString() === form.sedeId);

    const añadirRepuesto = () => {
        if (!repuestoSeleccionado) return;
        const rep = repuestosDB.find(r => r.id.toString() === repuestoSeleccionado);
        if (rep) {
            setForm({ ...form, repuestosUsados: [...form.repuestosUsados, rep] });
            setRepuestoSeleccionado(""); 
            setBusquedaRepuesto(""); 
        }
    };

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
        const totalRepVenta = form.repuestosUsados.reduce((acc, r) => acc + Number(r.precio || 0), 0);
        const totalCostoInterno = form.repuestosUsados.reduce((acc, r) => acc + Number(r.costo || 0), 0);
        
        const totalCobrado = moFinal + totalRepVenta;
        const gananciaLimpia = totalCobrado - totalCostoInterno;

        return { total: totalCobrado, moFinal, totalRep: totalRepVenta, totalCostoInterno, gananciaLimpia };
    };

    const { total, moFinal, totalRep, totalCostoInterno, gananciaLimpia } = calcular();

    const guardar = async (e) => {
        e.preventDefault();
        try {
            const detalleRep = form.repuestosUsados.map(r => r.nombre).join(", ");
            await api.post('/servicios', {
                sedeId: form.sedeId, usuarioId: 1, fecha: new Date().toISOString().split('T')[0],
                servicioTipo: "REPARACION", estado: esPresupuesto ? "PRESUPUESTO" : "VENTA",
                items: [{ 
                    equipoSerial: form.equipoSerial, 
                    tecnico: form.tecnico, 
                    costo: total,
                    costoInterno: totalCostoInterno, 
                    metodoPago: form.pago, 
                    trabajoRealizado: `${form.trabajo} ${detalleRep ? '[Repuestos: '+detalleRep+']' : ''}`, 
                    trabajoTipo: "REPARACION"
                }]
            });
            toast.success('¡Registro Exitoso!');
            if (onSaved) onSaved();
            setForm({...form, equipoSerial: '', costoMO: '', repuestosUsados: [], trabajo: ''});
            setClienteIdSeleccionado('');
            setBusquedaCliente('');
        } catch (err) { toast.error('Error al guardar. Verificá los datos.'); }
    };

    return (
        <div style={{ padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}>
                <button type="button" onClick={() => setEsPresupuesto(false)} style={{ flex: 1, background: !esPresupuesto ? '#2e7d32' : '#e0e0e0', color: !esPresupuesto ? 'white' : '#555', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ MODO VENTA (Caja)
                </button>
                <button type="button" onClick={() => setEsPresupuesto(true)} style={{ flex: 1, background: esPresupuesto ? '#546e7a' : '#e0e0e0', color: esPresupuesto ? 'white' : '#555', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📋 MODO PRESUPUESTO
                </button>
            </div>

            <form onSubmit={guardar} style={{ display: 'grid', gap: '15px' }}>
                
                {/* 🛡️ ZONA DE CLIENTES Y EQUIPOS - DISEÑO REDISEÑADO */}
                <div style={{ background: '#f0f7ff', padding: '20px', borderRadius: '10px', border: '1px solid #b6d4fe' }}>
                    
                    {/* FILA 1: CLIENTE (Lado a lado) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#0056b3', display: 'block', marginBottom: '8px' }}>1. SELECCIONAR CLIENTE</label>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '1.2em' }}>🔍</span>
                                <input type="text" placeholder="DNI, Tel, Nombre..." value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '6px', border: '1px solid #90caf9', background: '#e3f2fd', boxSizing: 'border-box', color: '#0056b3', fontWeight: 'bold' }} />
                            </div>
                            <div style={{ flex: 2 }}>
                                <select value={clienteIdSeleccionado} onChange={e => { setClienteIdSeleccionado(e.target.value); setForm({...form, sedeId: '', equipoSerial: ''}); }} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                                    <option value="">-- Seleccionar cliente de los resultados --</option>
                                    {clientesFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.cuilDni ? `(${c.cuilDni})` : ''}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* FILA 2: SEDE Y DISPENSER (Grilla limpia) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#0056b3', display: 'block', marginBottom: '8px' }}>2. DOMICILIO (SEDE)</label>
                            <select value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value, equipoSerial: ''})} required disabled={!clienteIdSeleccionado} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: clienteIdSeleccionado ? 'white' : '#f8f9fa' }}>
                                <option value="">-- Seleccionar --</option>
                                {sedesFiltradas.map(s => <option key={s.id} value={s.id}>{s.nombreSede}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#0056b3', display: 'block', marginBottom: '8px' }}>3. DISPENSER</label>
                            <select value={form.equipoSerial} onChange={e => setForm({...form, equipoSerial: e.target.value})} required disabled={!form.sedeId} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: form.sedeId ? 'white' : '#f8f9fa' }}>
                                <option value="">-- Seleccionar --</option>
                                {equiposFiltrados.map(eq => (
                                    <option key={eq.id} value={eq.numeroSerie}>{eq.marca} {eq.modelo} (SN: {eq.numeroSerie})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 🛡️ ZONA DE REPUESTOS - DISEÑO REDISEÑADO */}
                <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#333', display: 'block', marginBottom: '10px' }}>📦 AÑADIR REPUESTOS AL TRABAJO</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '1.2em' }}>🔍</span>
                            <input type="text" placeholder="Buscar SKU o Nombre..." value={busquedaRepuesto} onChange={e => setBusquedaRepuesto(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '6px', border: '1px solid #90caf9', background: '#e3f2fd', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 2 }}>
                            <select value={repuestoSeleccionado} onChange={e => setRepuestoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                                <option value="">-- Elegir repuesto de los resultados --</option>
                                {repuestosFiltrados.map(r => <option key={r.id} value={r.id}>{r.sku ? `[${r.sku}] ` : ''}{r.nombre} (Venta: ${r.precio})</option>)}
                            </select>
                        </div>
                        <button type="button" onClick={añadirRepuesto} style={{ background: '#007bff', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '100%' }}>
                            + AÑADIR
                        </button>
                    </div>
                    
                    {form.repuestosUsados.length > 0 && (
                        <ul style={{ marginTop: '15px', paddingLeft: 0, listStyle: 'none' }}>
                            {form.repuestosUsados.map((r, i) => (
                                <li key={i} style={{ background: 'white', padding: '10px 15px', marginBottom: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ccc' }}>
                                    <span>⚙️ {r.sku ? `[${r.sku}] ` : ''}{r.nombre} <b>(+ ${r.precio})</b></span>
                                    <button type="button" onClick={() => quitarRepuesto(i)} style={{ background: '#ffeeee', border: '1px solid #ffcccc', color: '#d32f2f', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Quitar</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>DETALLE DEL TRABAJO</label>
                    <input placeholder="Ej: Mantenimiento preventivo..." value={form.trabajo} onChange={e => setForm({...form, trabajo: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>MANO DE OBRA ($)</label>
                        <input type="number" min="0" placeholder="0" value={form.costoMO} 
                            onChange={e => setForm({...form, costoMO: e.target.value})} 
                            onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>DESCUENTO (% o $)</label>
                        <input type="text" placeholder="Ej: 10% o 500" value={form.descuento} 
                            onChange={e => setForm({...form, descuento: e.target.value})} 
                            style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                </div>

                <div style={{ background: esPresupuesto ? '#eceff1' : '#e8f5e9', padding: '20px', borderRadius: '10px', border: `2px solid ${esPresupuesto ? '#cfd8dc' : '#a5d6a7'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.9em', color: '#666', fontWeight: 'bold' }}>
                            TOTAL {esPresupuesto ? 'DEL PRESUPUESTO' : 'A COBRAR'}
                        </div>
                        <div style={{ fontSize: '2.8em', fontWeight: 'bold', color: esPresupuesto ? '#455a64' : '#1b5e20' }}>
                            $ {total.toLocaleString('es-AR')}
                        </div>
                        <div style={{ fontSize: '0.8em', marginTop: '5px', color: '#555' }}>
                            Mano de Obra: ${moFinal.toLocaleString('es-AR')} | Repuestos cobrados: ${totalRep.toLocaleString('es-AR')}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8em', color: '#666', fontWeight: 'bold' }}>TU COSTO INTERNO: <span style={{color: '#d32f2f'}}>${totalCostoInterno.toLocaleString('es-AR')}</span></div>
                        <div style={{ fontSize: '0.8em', color: '#2e7d32', fontWeight: 'bold', marginTop: '5px' }}>GANANCIA LIMPIA ESTIMADA</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2e7d32' }}>
                            ✨ $ {gananciaLimpia.toLocaleString('es-AR')}
                        </div>
                    </div>
                </div>

                <button type="submit" style={{ padding: '18px', background: esPresupuesto ? '#546e7a' : '#2e7d32', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1.2em' }}>
                    {esPresupuesto ? '💾 GUARDAR PRESUPUESTO' : '🚀 CONFIRMAR VENTA'}
                </button>
            </form>
        </div>
    );
}