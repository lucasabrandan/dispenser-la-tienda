import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import Select from 'react-select';

// ⚛️ Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

// 🛠️ Utilidades
import { darkSelectStyles } from '../utils/selectStyles';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioForm({ onSaved }) {
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [repuestosDB, setRepuestosDB] = useState([]);
    
    const [esPresupuesto, setEsPresupuesto] = useState(false);
    const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState('');
    const [sedeId, setSedeId] = useState('');
    const [tecnico, setTecnico] = useState('Marcos');
    const [descuentoGlobal, setDescuentoGlobal] = useState('0');
    const [pagoGlobal, setPagoGlobal] = useState('EFECTIVO');
    const [ticketItems, setTicketItems] = useState([]);

    const [itemActual, setItemActual] = useState({
        equipoSerial: '', trabajo: '', costoMO: '', repuestosUsados: [], fotoAntes: null, fotoDespues: null
    });

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [c, s, e, r] = await Promise.all([
                    api.get('/clientes'), api.get('/sedes'), api.get('/equipos'), api.get('/repuestos')
                ]);
                setClientes(c.data); setSedes(s.data); setEquipos(e.data); setRepuestosDB(r.data);
            } catch (err) { toast.error("Error al conectar con el servidor"); }
        };
        cargarDatos();
    }, []);

    const sedesFiltradas = sedes.filter(s => s.cliente?.id.toString() === clienteIdSeleccionado?.toString());
    const equiposFiltrados = equipos.filter(eq => eq.sede?.id.toString() === sedeId?.toString() && !ticketItems.find(item => item.equipoSerial === eq.numeroSerie));

    // Lógica de fotos con tu compresión original
    const manejarFoto = async (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;
        const opciones = { maxSizeMB: 0.7, maxWidthOrHeight: 1024, useWebWorker: true };
        try {
            const loadingToast = toast.loading("Comprimiendo imagen...");
            const compressedFile = await imageCompression(file, opciones);
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onloadend = () => {
                setItemActual(prev => ({...prev, [tipo === 'antes' ? 'fotoAntes' : 'fotoDespues']: reader.result}));
                toast.dismiss(loadingToast);
                toast.success("Foto cargada");
            };
        } catch (error) { toast.error("Error al procesar la foto"); }
    };

    const agregarAlTicket = () => {
        if (!itemActual.equipoSerial) return toast.error("⚠️ Elegí un dispenser");
        const mo = parseFloat(itemActual.costoMO) || 0;
        const repTotal = itemActual.repuestosUsados.reduce((acc, r) => acc + Number(r.precio || 0), 0);
        const costoInt = itemActual.repuestosUsados.reduce((acc, r) => acc + Number(r.costo || 0), 0);

        setTicketItems([...ticketItems, {
            ...itemActual, moFinal: mo, subtotalCobrado: mo + repTotal, costoInterno: costoInt,
            equipoData: equipos.find(e => e.numeroSerie === itemActual.equipoSerial)
        }]);
        setItemActual({ equipoSerial: '', trabajo: '', costoMO: '', repuestosUsados: [], fotoAntes: null, fotoDespues: null });
        toast.success("✅ Dispenser sumado");
    };

    const calcularTotales = () => {
        const subtotal = ticketItems.reduce((acc, item) => acc + item.subtotalCobrado, 0);
        const dTxt = descuentoGlobal.toString();
        const dto = dTxt.endsWith('%') ? (subtotal * parseFloat(dTxt) / 100) : parseFloat(dTxt) || 0;
        return { subtotal, totalFinal: subtotal - dto };
    };

    const { subtotal, totalFinal } = calcularTotales();

    const guardarEnSistema = async () => {
        if (ticketItems.length === 0) return toast.error("Ticket vacío");
        try {
            const payload = {
                sedeId: parseInt(sedeId),
                usuarioId: 1, 
                fecha: new Date().toISOString().split('T')[0],
                servicioTipo: "REPARACION",
                estado: esPresupuesto ? "PRESUPUESTO" : "VENTA",
                items: ticketItems.map(item => ({
                    equipoSerial: item.equipoSerial,
                    tecnico,
                    costo: item.subtotalCobrado,
                    costoInterno: item.costoInterno,
                    trabajoRealizado: `${item.trabajo} ${item.repuestosUsados.length > 0 ? `[Repuestos: ${item.repuestosUsados.map(r => r.nombre).join(", ")}]` : ''}`,
                    fotoAntes: item.fotoAntes,
                    fotoDespues: item.fotoDespues
                }))
            };
            await api.post('/servicios', payload);
            toast.success("🚀 Guardado con éxito");
            setTicketItems([]);
            if (onSaved) onSaved(); 
        } catch (err) { toast.error("Error al guardar"); }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '50px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Button variant={!esPresupuesto ? 'primary' : 'secondary'} onClick={()=>setEsPresupuesto(false)} style={{flex: 1}}>🛒 VENTA</Button>
                <Button variant={esPresupuesto ? 'primary' : 'secondary'} onClick={()=>setEsPresupuesto(true)} style={{flex: 1}}>📋 PRESUPUESTO</Button>
            </div>

            <Card style={{ marginBottom: '20px' }}>
                <label style={{color: 'var(--brand-yellow)', fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '10px'}}>PASO 1: UBICACIÓN</label>
                <Select options={clientes.map(c => ({value: c.id, label: c.nombre}))} placeholder="Cliente..." styles={darkSelectStyles} onChange={(sel) => setClienteIdSeleccionado(sel?.value)} />
                <div style={{ height: '10px' }} />
                <Select options={sedesFiltradas.map(s => ({value: s.id, label: s.nombreSede}))} placeholder="Sede..." styles={darkSelectStyles} onChange={(sel) => setSedeId(sel?.value)} />
            </Card>

            {sedeId && (
                <Card style={{ borderLeft: '5px solid var(--brand-red)', marginBottom: '20px' }}>
                    <label style={{color: 'var(--brand-red)', fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '10px'}}>PASO 2: TRABAJO</label>
                    <Select options={equiposFiltrados.map(e => ({value: e.numeroSerie, label: e.numeroSerie}))} styles={darkSelectStyles} placeholder="Elegir Dispenser..." onChange={(sel) => setItemActual({...itemActual, equipoSerial: sel?.value})} />
                    
                    <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '10px', marginTop: '15px' }}>
                        <Select options={repuestosDB.map(r => ({value: r.id, label: r.nombre, objetoReal: r}))} styles={darkSelectStyles} placeholder="⚙️ Repuestos..." value={null} onChange={(sel) => sel && setItemActual({...itemActual, repuestosUsados: [...itemActual.repuestosUsados, sel.objetoReal]})} />
                        {itemActual.repuestosUsados.map((r, i) => (
                            <div key={i} style={{fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '5px'}}>
                                <span>🛠️ {r.nombre}</span>
                                <span style={{color: 'var(--brand-red)', cursor: 'pointer'}} onClick={() => {
                                    const n = [...itemActual.repuestosUsados]; n.splice(i, 1); setItemActual({...itemActual, repuestosUsados: n});
                                }}>❌</span>
                            </div>
                        ))}
                    </div>

                    <textarea placeholder="¿Qué trabajo se realizó?" value={itemActual.trabajo} onChange={e=>setItemActual({...itemActual, trabajo: e.target.value})} style={{ width: '100%', padding: '12px', marginTop: '15px', borderRadius: '8px', background: 'var(--bg-main)', color: 'white', border: '1px solid var(--border-color)', height: '80px' }} />
                    <Input label="Mano de Obra ($)" type="number" value={itemActual.costoMO} onChange={e=>setItemActual({...itemActual, costoMO: e.target.value})} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <div style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '10px', textAlign: 'center', position: 'relative' }}>
                            <span style={{fontSize: '10px'}}>{itemActual.fotoAntes ? "✅ ANTES" : "📸 ANTES"}</span>
                            <input type="file" capture="environment" onChange={e=>manejarFoto(e, 'antes')} style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%' }} />
                        </div>
                        <div style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '10px', textAlign: 'center', position: 'relative' }}>
                            <span style={{fontSize: '10px'}}>{itemActual.fotoDespues ? "✅ DESPUÉS" : "📸 DESPUÉS"}</span>
                            <input type="file" capture="environment" onChange={e=>manejarFoto(e, 'despues')} style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%' }} />
                        </div>
                    </div>
                    <Button variant="success" onClick={agregarAlTicket} style={{ width: '100%', marginTop: '20px' }}>AGREGAR AL REMITO</Button>
                </Card>
            )}

            {ticketItems.length > 0 && (
                <Card>
                    <div style={{ background: 'var(--brand-yellow)', color: 'black', padding: '15px', borderRadius: '10px', textAlign: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>$ {totalFinal.toLocaleString()}</div>
                    </div>
                    <Button onClick={guardarEnSistema} style={{ width: '100%', marginBottom: '10px' }}>💾 GUARDAR TODO</Button>
                    <Button variant="secondary" onClick={() => generarRemitoPDFPremium({ esPresupuesto, cliente: clientes.find(c => c.id === clienteIdSeleccionado), sede: sedes.find(s => s.id === sedeId), tecnico, ticketItems, subtotalTicket: subtotal, valorDescuento: 0, totalFinal })} style={{ width: '100%' }}>📄 PDF PREMIUM</Button>
                </Card>
            )}
        </div>
    );
}