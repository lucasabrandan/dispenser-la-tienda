import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// Átomos UI
import Card from './ui/Card';
import Button from './ui/Button';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioForm({ onSaved, servicioParaEditar = null }) {
    const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
    const [clienteId, setClienteId] = useState(null);
    const [esPresupuesto, setEsPresupuesto] = useState(true); 
    const [ticketItems, setTicketItems] = useState([]);
    const [idEdicion, setIdEdicion] = useState(null);
    const [estaBloqueado, setEstaBloqueado] = useState(false); // 🛡️ NUEVO: ESTADO DE BLOQUEO
    
    // 🚀 ESTADO PARA SEGUIMIENTO DE EQUIPO SELECCIONADO
    const [historialEquipo, setHistorialEquipo] = useState(null);
    
    const [itemActual, setItemActual] = useState({ 
        sedeId: '', sedeNombre: '', equipoSerial: '', 
        trabajo: '', costoExtra: 0, repuestosUsados: [] 
    });

    const [repuestoElegido, setRepuestoElegido] = useState(null);

    // 🎨 COLORES DE MARCA
    const RED_TECNICA = "#E54D42";
    const GREEN_VENTA = "#008000";
    const activeColor = esPresupuesto ? RED_TECNICA : GREEN_VENTA;

    const highContrastStyles = {
        control: (base) => ({ 
            ...base, 
            background: estaBloqueado ? '#EAEAEA' : '#FFF', // Gris si está bloqueado
            border: '2px solid #000', borderRadius: '10px', minHeight: '55px',
            boxShadow: 'none', '&:hover': { border: '2px solid #000' }
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#000' : state.isFocused ? '#F0F0F0' : '#FFF',
            color: state.isSelected ? '#FFF' : '#000',
            padding: '15px', borderBottom: '1px solid #EEE'
        }),
        singleValue: (base) => ({ ...base, color: '#000', fontWeight: '800' }),
    };

    // 🚀 CARGA INICIAL Y MAPEADO DE EDICIÓN INTEGRADO
    useEffect(() => {
        const cargar = async () => {
            try {
                const [c, s, e, r] = await Promise.all([
                    api.get('/clientes'), api.get('/sedes'), api.get('/equipos'), api.get('/repuestos')
                ]);
                const database = { 
                    clientes: c.data || [], sedes: s.data || [], 
                    equipos: e.data || [], repuestos: r.data || [] 
                };
                setDb(database);

                if (servicioParaEditar) {
                    // 🛡️ LÓGICA DE BLOQUEO: Si no es PRESUPUESTO, se activa el candado
                    if (servicioParaEditar.estado !== "PRESUPUESTO") {
                        setEstaBloqueado(true);
                        toast.error("⚠️ REGISTRO YA CONFIRMADO: Solo lectura");
                    } else {
                        setEstaBloqueado(false);
                    }

                    setIdEdicion(servicioParaEditar.id);
                    setClienteId(servicioParaEditar.clienteId?.toString());
                    setEsPresupuesto(servicioParaEditar.servicioTipo === "TECNICA");
                    
                    const itemsMapeados = servicioParaEditar.items.map(it => ({
                        sedeId: servicioParaEditar.sedeId,
                        equipoSerial: it.equipoSerial,
                        trabajo: it.trabajoRealizado,
                        costoExtra: Math.max(0, it.costoExtra || 0),
                        totalCalculado: Math.max(0, it.costo),
                        repuestosUsados: it.repuestosUsados || [],
                        resumenTexto: it.trabajoRealizado
                    }));
                    setTicketItems(itemsMapeados);
                    setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
                }
            } catch (err) { toast.error("Error de conexión"); }
        };
        cargar();
    }, [servicioParaEditar]);

    // 🚀 LÓGICA DE CONSULTA DE ANTECEDENTES Y GARANTÍA
    const consultarAntecedentes = async (serial) => {
        if (!serial || serial === "MOSTRADOR") { setHistorialEquipo(null); return; }
        try {
            const res = await api.get(`/servicios?equipoSerial=${serial}`);
            const historial = res.data;
            if (historial && historial.length > 0) {
                const ultimo = historial[0];
                setHistorialEquipo(ultimo);
                
                const hoy = new Date();
                const itemGarantia = ultimo.items?.find(i => i.equipoSerial === serial && i.garantiaHasta);
                
                if (itemGarantia && new Date(itemGarantia.garantiaHasta) > hoy) {
                    toast.success(`🛡️ EQUIPO EN GARANTÍA HASTA: ${itemGarantia.garantiaHasta}`, { 
                        duration: 6000,
                        style: { border: '2px solid #000', fontWeight: 'bold' }
                    });
                }
            } else { setHistorialEquipo(null); }
        } catch (e) { console.error("Error buscando antecedentes"); }
    };

    // 🚀 LÓGICA DE WHATSAPP DINÁMICO
    const enviarWhatsAppMantenimiento = () => {
        const cliente = db.clientes.find(c => c.id.toString() === clienteId);
        if (!cliente?.telefono) return toast.error("El cliente no tiene teléfono cargado");
        
        const tel = cliente.telefono.replace(/\D/g, '');
        const msg = `Hola ${cliente.nombre}, te escribo de Dispenser La Tienda. Revisando el historial del dispenser S/N ${itemActual.equipoSerial}, notamos que ya le toca su mantenimiento programado. ¿Te gustaría que coordinemos una visita?`;
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // --- LÓGICA DE REPUESTOS ---
    const sumarRepuesto = () => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        if (!repuestoElegido) return toast.error("Elegí un producto");
        const nuevos = [...itemActual.repuestosUsados];
        const idx = nuevos.findIndex(r => r.id === repuestoElegido.id);
        if (idx > -1) {
            nuevos[idx].cantidad += 1;
            nuevos[idx].subtotal = nuevos[idx].cantidad * nuevos[idx].precio;
        } else {
            nuevos.push({ ...repuestoElegido, cantidad: 1, subtotal: repuestoElegido.precio });
        }
        setItemActual({ ...itemActual, repuestosUsados: nuevos });
        setRepuestoElegido(null);
    };

    const actualizarCantidad = (idx, valor) => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        const nuevos = [...itemActual.repuestosUsados];
        // 🛡️ BLOQUEO NEGATIVOS: Mínimo 1
        const qty = Math.max(1, parseInt(valor) || 1);
        nuevos[idx].cantidad = qty;
        nuevos[idx].subtotal = qty * nuevos[idx].precio;
        setItemActual({ ...itemActual, repuestosUsados: nuevos });
    };

    const quitarRepuesto = (idx) => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        const nuevos = [...itemActual.repuestosUsados];
        nuevos.splice(idx, 1);
        setItemActual({ ...itemActual, repuestosUsados: nuevos });
    };

    // --- LÓGICA DE REMITO ---
    const agregarAlTicket = () => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        if (esPresupuesto && !itemActual.equipoSerial) return toast.error("❌ Falta el S/N del dispenser");
        
        // 🛡️ BLOQUEO NEGATIVOS AL SUMAR
        const extra = Math.max(0, parseFloat(itemActual.costoExtra) || 0);
        const totalR = itemActual.repuestosUsados.reduce((a, b) => a + b.subtotal, 0);

        const nuevoRenglon = {
            ...itemActual,
            costoExtra: extra,
            totalCalculado: extra + totalR,
            resumenTexto: (itemActual.equipoSerial && itemActual.equipoSerial !== "MOSTRADOR")
                ? `${itemActual.trabajo} | MO: $${extra}`
                : `VENTA: ${itemActual.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(", ")}`
        };

        setTicketItems([...ticketItems, nuevoRenglon]);
        setItemActual({ ...itemActual, equipoSerial: '', trabajo: '', costoExtra: 0, repuestosUsados: [] });
        setHistorialEquipo(null);
        toast.success("✅ Añadido al remito");
    };

    const editarItem = (idx) => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        const itemParaEditar = ticketItems[idx];
        setItemActual(itemParaEditar); 
        const nuevaLista = [...ticketItems];
        nuevaLista.splice(idx, 1); 
        setTicketItems(nuevaLista);
    };

    const eliminarItem = (idx) => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        const nuevaLista = [...ticketItems];
        nuevaLista.splice(idx, 1);
        setTicketItems(nuevaLista);
    };

    const dispararPDF = () => {
        const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
        const sedeObj = db.sedes?.find(s => s.id.toString() === (itemActual.sedeId || ticketItems[0]?.sedeId)?.toString());
        
        generarRemitoPDFPremium({
            esPresupuesto, 
            cliente: clienteObj, 
            sede: sedeObj, 
            tecnico: 'Marcos', 
            ticketItems,
            totalFinal: ticketItems.reduce((a, b) => a + b.totalCalculado, 0),
            fechaServicio: new Date().toISOString().split('T')[0] 
        });
    };

    const finalizar = async (confirmarTrabajo = false) => {
        if (estaBloqueado) return; // 🛡️ BLOQUEO
        if (ticketItems.length === 0) return toast.error("Agregá al menos un ítem");
        const loading = toast.loading(confirmarTrabajo ? "Confirmando Trabajo..." : "Guardando Presupuesto...");
        
        try {
            const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
            const sedeIdReal = itemActual.sedeId || ticketItems[0]?.sedeId;
            const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== "MOSTRADOR");

            const servicioData = {
                sedeId: parseInt(sedeIdReal),
                usuarioId: 1, 
                fecha: new Date().toISOString().split('T')[0],
                servicioTipo: tieneEquipo ? "TECNICA" : "VENTA", 
                estado: confirmarTrabajo ? "REALIZADO" : "PRESUPUESTO",
                clienteNombre: clienteObj?.nombre || "Particular",
                sedeNombre: db.sedes?.find(s => s.id === sedeIdReal)?.nombreSede || "Mostrador",
                items: ticketItems.map(it => {
                    const esFiltro = it.trabajo?.toUpperCase().includes("FILTRO") || 
                                    it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes("FILTRO"));
                    const mesesGarantia = esFiltro ? 6 : 3;

                    return {
                        equipoSerial: it.equipoSerial || "MOSTRADOR",
                        tecnico: "Marcos",
                        costo: parseFloat(it.totalCalculado),
                        costoExtra: parseFloat(it.costoExtra) || 0,
                        metodoPago: "EFECTIVO",
                        trabajoRealizado: it.resumenTexto,
                        trabajoTipo: tieneEquipo ? (esFiltro ? "CAMBIO_FILTRO" : "REPARACION") : "VENTA",
                        repuestosUsados: it.repuestosUsados || [],
                        garantiaHasta: (confirmarTrabajo && tieneEquipo) 
                            ? new Date(new Date().setMonth(new Date().getMonth() + mesesGarantia)).toISOString().split('T')[0] 
                            : null
                    };
                })
            };

            const formData = new FormData();
            formData.append("servicio", new Blob([JSON.stringify(servicioData)], { type: 'application/json' }));
            
            if (idEdicion) {
                await api.put(`/servicios/${idEdicion}`, formData);
            } else {
                await api.post('/servicios', formData);
            }
            
            toast.success("🚀 Registro procesado!", { id: loading });
            setTicketItems([]); setClienteId(null); setIdEdicion(null);
            if (onSaved) onSaved();
        } catch (err) { toast.error("Error de servidor", { id: loading }); }
    };

    return (
        <div style={{ background: '#F2F2F2', minHeight: '100vh', padding: '15px', color: '#000', paddingBottom: '160px' }}>
            
            {/* 🛡️ AVISO DE BLOQUEO */}
            {estaBloqueado && <div style={{background: '#E54D42', color: '#FFF', padding: '15px', borderRadius: '15px', textAlign:'center', fontWeight:'900', marginBottom:'20px'}}>🔒 ESTE REGISTRO YA FUE CONFIRMADO / COBRADO (SOLO LECTURA)</div>}
            
            {/* SWITCH DE MODO (Se oculta si está bloqueado para evitar cambios) */}
            {!estaBloqueado && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <button onClick={() => {setEsPresupuesto(true); setTicketItems([])}} 
                        style={{ flex: 1, padding: '20px', borderRadius: '15px', border: '2px solid #000', fontWeight: '900', fontSize: '14px', background: esPresupuesto ? RED_TECNICA : '#FFF', color: esPresupuesto ? '#FFF' : '#000', boxShadow: esPresupuesto ? `0px 4px 0px #000` : 'none' }}>
                        🛠️ SERVICIO TÉCNICO
                    </button>
                    <button onClick={() => {setEsPresupuesto(false); setTicketItems([])}} 
                        style={{ flex: 1, padding: '20px', borderRadius: '15px', border: '2px solid #000', fontWeight: '900', fontSize: '14px', background: !esPresupuesto ? GREEN_VENTA : '#FFF', color: !esPresupuesto ? '#FFF' : '#000', boxShadow: !esPresupuesto ? `0px 4px 0px #000` : 'none' }}>
                        🛒 VENTA / INSUMOS
                    </button>
                </div>
            )}

            {idEdicion && !estaBloqueado && <div style={{textAlign:'center', fontWeight:'900', marginBottom:'10px', color: RED_TECNICA}}>✏️ EDITANDO PRESUPUESTO #{idEdicion}</div>}

            <Card style={{ border: '2px solid #000', borderRadius: '15px', background: '#FFF' }}>
                <label style={{ fontWeight: '900', fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>CLIENTE</label>
                <CreatableSelect isDisabled={estaBloqueado} styles={highContrastStyles}
                    options={db.clientes?.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                    value={db.clientes?.find(c => c.id.toString() === clienteId) ? { label: db.clientes.find(c => c.id.toString() === clienteId).nombre } : null}
                    onChange={(s) => setClienteId(s?.value)}
                    placeholder="Buscar cliente..."
                />
            </Card>

            {clienteId && (
                <Card style={{ marginTop: '15px', border: '2px solid #000', borderRadius: '15px', background: '#FFF' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900' }}>SEDE / DOMICILIO</label>
                        <Select isDisabled={estaBloqueado} styles={highContrastStyles}
                            options={db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId).map(s => ({ value: s.id, label: s.nombreSede }))}
                            value={db.sedes?.find(s => s.id === itemActual.sedeId) ? { label: db.sedes.find(s => s.id === itemActual.sedeId).nombreSede } : null}
                            onChange={(s) => setItemActual({ ...itemActual, sedeId: s.value, sedeNombre: s.label })}
                            placeholder="Elegí la sede..."
                        />
                    </div>

                    {esPresupuesto && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900' }}>S/N DISPENSER</label>
                            <CreatableSelect isDisabled={estaBloqueado} styles={highContrastStyles}
                                options={db.equipos?.filter(e => e.sede?.id?.toString() === itemActual.sedeId?.toString()).map(e => ({ value: e.numeroSerie, label: `S/N: ${e.numeroSerie}` }))}
                                onChange={(s) => {
                                    setItemActual({...itemActual, equipoSerial: s?.value});
                                    consultarAntecedentes(s?.value);
                                }}
                                value={itemActual.equipoSerial ? { label: itemActual.equipoSerial } : null}
                                placeholder="Elegí o creá N/S..."
                            />
                            {historialEquipo && (
                                <div style={{ marginTop: '10px', background: '#000', color: '#FFF', padding: '15px', borderRadius: '12px', border: '2px solid #333' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: RED_TECNICA }}>ANTECEDENTES</span>
                                        <button onClick={enviarWhatsAppMantenimiento} style={{ background: '#25D366', color: '#FFF', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold' }}>💬 WA</button>
                                    </div>
                                    <div style={{ marginTop: '5px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{historialEquipo.fecha} - {historialEquipo.items[0]?.trabajoRealizado}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!estaBloqueado && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                            <div>
                                <label style={{fontSize: '11px', fontWeight: '900'}}>AGREGAR PRODUCTOS</label>
                                <Select styles={highContrastStyles}
                                    options={db.repuestos?.map(r => ({ ...r, label: `${r.nombre} ($${r.precio})`, value: r.id }))}
                                    onChange={setRepuestoElegido} value={repuestoElegido}
                                    placeholder="Buscar repuesto..."
                                />
                            </div>
                            <button onClick={sumarRepuesto} style={{ height: '55px', background: '#000', color: '#FFF', borderRadius: '10px', border: 'none', fontSize: '28px', fontWeight: 'bold' }}>+</button>
                        </div>
                    )}

                    {itemActual.repuestosUsados.length > 0 && (
                        <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '12px', border: '1px dashed #000', marginBottom: '15px' }}>
                            {itemActual.repuestosUsados.map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #EEE' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{fontWeight: '700', fontSize: '14px'}}>{r.nombre}</div>
                                        <div style={{fontSize: '12px', color: '#666'}}>${r.precio} c/u</div>
                                    </div>
                                    <input disabled={estaBloqueado} type="number" value={r.cantidad} min="1" onChange={(e) => actualizarCantidad(i, e.target.value)} 
                                           style={{ width: '50px', height: '35px', border: '2px solid #000', borderRadius: '8px', textAlign: 'center', fontWeight: '900', marginRight: '10px' }} />
                                    <div style={{ fontWeight: '900', width: '70px', textAlign: 'right' }}>${r.subtotal}</div>
                                    {!estaBloqueado && <button onClick={() => quitarRepuesto(i)} style={{ marginLeft: '10px', color: 'red', border: 'none', background: 'none', fontWeight: '900' }}>✕</button>}
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea disabled={estaBloqueado} placeholder="Descripción del trabajo..." value={itemActual.trabajo} onChange={e => setItemActual({...itemActual, trabajo: e.target.value})}
                              style={{ width: '100%', padding: '15px', border: '2px solid #000', borderRadius: '12px', marginBottom: '15px', fontSize: '15px', minHeight: '100px', outline: 'none' }} />

                    <div style={{ background: estaBloqueado ? '#EAEAEA' : '#000', padding: '18px', borderRadius: '15px', marginBottom: '15px' }}>
                        <label style={{ color: estaBloqueado ? '#666' : '#FFF', fontWeight: '900', fontSize: '11px' }}>{esPresupuesto ? 'MANO DE OBRA ($)' : 'ENVÍO ($)'}</label>
                        <input 
                            disabled={estaBloqueado}
                            type="number" 
                            min="0"
                            value={itemActual.costoExtra} 
                            onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${estaBloqueado ? '#666' : '#FFF'}`, color: estaBloqueado ? '#000' : '#FFF', fontSize: '32px', fontWeight: '900', outline: 'none', marginTop: '5px' }} 
                        />
                    </div>

                    {!estaBloqueado && (
                        <button onClick={agregarAlTicket} style={{ width: '100%', height: '65px', background: '#000', color: '#FFF', borderRadius: '15px', border: 'none', fontWeight: '900', fontSize: '16px' }}>
                            SUMAR AL TICKET +
                        </button>
                    )}
                </Card>
            )}

            {/* CARRITO */}
            {ticketItems.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    {ticketItems.map((it, idx) => (
                        <div key={idx} style={{ background: '#FFF', padding: '20px', borderRadius: '15px', marginBottom: '12px', border: '2px solid #000', boxShadow: '4px 4px 0px #000' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '900', fontSize: '18px', color: (it.equipoSerial && it.equipoSerial !== "MOSTRADOR") ? RED_TECNICA : GREEN_VENTA }}>
                                        {it.equipoSerial || 'VENTA'}
                                    </div>
                                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{it.resumenTexto}</div>
                                    <div style={{ fontWeight: '900', fontSize: '22px', marginTop: '10px' }}>${it.totalCalculado.toLocaleString()}</div>
                                </div>
                                {!estaBloqueado && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button onClick={() => editarItem(idx)} style={{ background: '#F0F0F0', border: '1px solid #000', padding: '12px', borderRadius: '10px' }}>✏️</button>
                                        <button onClick={() => eliminarItem(idx)} style={{ background: '#FFEBEB', color: '#F23D4F', border: '1px solid #000', padding: '12px', borderRadius: '10px' }}>🗑️</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* BARRA DE ACCIÓN FINAL */}
            {ticketItems.length > 0 && (
                <div style={{ position: 'fixed', bottom: '25px', left: '15px', right: '15px', zIndex: 1000 }}>
                    <div style={{ background: '#000', padding: '20px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #FFF', boxShadow: '0px 10px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ color: '#FFF' }}>
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>TOTAL</div>
                            <div style={{ fontSize: '28px', fontWeight: '900' }}>${ticketItems.reduce((a, b) => a + b.totalCalculado, 0).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={dispararPDF} style={{ background: '#333', color: '#FFF', border: '1px solid #666', borderRadius: '15px', width: '60px', height: '60px', fontSize: '24px' }}>📄</button>
                            {!estaBloqueado && (
                                <>
                                    <button onClick={() => finalizar(false)} style={{ background: '#444', color: '#FFF', borderRadius: '12px', padding: '0 15px', fontWeight: '900', border: 'none' }}>
                                        {idEdicion ? "ACTUALIZAR" : "PENDIENTE"}
                                    </button>
                                    <button onClick={() => finalizar(true)} style={{ background: activeColor, color: '#FFF', border: 'none', borderRadius: '15px', padding: '0 20px', fontWeight: '900' }}>
                                        CONFIRMAR
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}