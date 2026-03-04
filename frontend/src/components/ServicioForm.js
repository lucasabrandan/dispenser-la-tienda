import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// Átomos UI
import Card from './ui/Card';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export default function ServicioForm({ onSaved, servicioParaEditar = null }) {
    const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
    const [clienteId, setClienteId] = useState(null);
    const [esPresupuesto, setEsPresupuesto] = useState(true); 
    const [ticketItems, setTicketItems] = useState([]);
    const [idEdicion, setIdEdicion] = useState(null);
    const [estaBloqueado, setEstaBloqueado] = useState(false);
    const [historialEquipo, setHistorialEquipo] = useState(null);
    
    const [itemActual, setItemActual] = useState({ 
        sedeId: '', sedeNombre: '', equipoSerial: '', 
        trabajo: '', costoExtra: 0, repuestosUsados: [] 
    });

    const [repuestoElegido, setRepuestoElegido] = useState(null);

    // Colores de marca
    const RED_TECNICA = "#EF4444";
    const GREEN_VENTA = "#10B981";

    // Detectar Modo Oscuro para los Selects
    const isDark = document.documentElement.classList.contains('dark');

    const premiumStyles = {
        control: (base, state) => ({ 
            ...base, 
            background: estaBloqueado ? (isDark ? '#1E293B' : '#F1F5F9') : (isDark ? '#0F172A' : '#F8FAFC'), 
            border: state.isFocused ? '1px solid #3B82F6' : (isDark ? '1px solid #334155' : '1px solid #E2E8F0'), 
            borderRadius: '12px', 
            minHeight: '55px',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none', 
            '&:hover': { border: estaBloqueado ? 'none' : '1px solid #3B82F6' },
            transition: 'all 0.2s ease'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
            color: state.isSelected ? '#FFF' : (isDark ? '#CBD5E1' : '#334155'),
            padding: '12px 15px', 
            cursor: 'pointer'
        }),
        menu: (base) => ({ ...base, background: isDark ? '#0F172A' : '#FFF', border: isDark ? '1px solid #334155' : 'none' }),
        singleValue: (base) => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
        placeholder: (base) => ({ ...base, color: '#94A3B8' })
    };

    useEffect(() => {
        const cargar = async () => {
            try {
                const [c, s, e, r] = await Promise.all([
                    api.get('/clientes'), api.get('/sedes'), api.get('/equipos'), api.get('/repuestos')
                ]);
                setDb({ clientes: c.data || [], sedes: s.data || [], equipos: e.data || [], repuestos: r.data || [] });

                if (servicioParaEditar) {
                    if (servicioParaEditar.estado !== "PRESUPUESTO") {
                        setEstaBloqueado(true);
                    } else {
                        setEstaBloqueado(false);
                    }
                    setIdEdicion(servicioParaEditar.id);
                    setClienteId(servicioParaEditar.clienteId?.toString());
                    setEsPresupuesto(servicioParaEditar.servicioTipo === "TECNICA");
                    setTicketItems(servicioParaEditar.items.map(it => ({
                        sedeId: servicioParaEditar.sedeId,
                        equipoSerial: it.equipoSerial,
                        trabajo: it.trabajoRealizado,
                        costoExtra: Math.max(0, it.costoExtra || 0),
                        totalCalculado: Math.max(0, it.costo),
                        repuestosUsados: it.repuestosUsados || [],
                        resumenTexto: it.trabajoRealizado
                    })));
                    setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
                }
            } catch (err) { toast.error("Error de conexión"); }
        };
        cargar();
    }, [servicioParaEditar]);

    // --- FUNCIONES DE LÓGICA (RESTABLECIDAS) ---

    const consultarAntecedentes = async (serial) => {
        if (!serial || serial === "MOSTRADOR") { setHistorialEquipo(null); return; }
        try {
            const res = await api.get(`/servicios?equipoSerial=${serial}`);
            if (res.data?.length > 0) {
                const ultimo = res.data[0];
                setHistorialEquipo(ultimo);
                const itemGarantia = ultimo.items?.find(i => i.equipoSerial === serial && i.garantiaHasta);
                if (itemGarantia && new Date(itemGarantia.garantiaHasta) > new Date()) {
                    toast.success(`🛡️ GARANTÍA HASTA: ${itemGarantia.garantiaHasta}`, { duration: 6000 });
                }
            } else { setHistorialEquipo(null); }
        } catch (e) { console.error("Error antecedentes"); }
    };

    const enviarWhatsAppMantenimiento = () => {
        const cliente = db.clientes.find(c => c.id.toString() === clienteId);
        if (!cliente?.telefono) return toast.error("Sin teléfono");
        const tel = cliente.telefono.replace(/\D/g, '');
        const msg = `Hola ${cliente.nombre}, revisando el historial del dispenser S/N ${itemActual.equipoSerial}, notamos que ya le toca su mantenimiento...`;
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const sumarRepuesto = () => {
        if (estaBloqueado || !repuestoElegido) return;
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
        const nuevos = [...itemActual.repuestosUsados];
        const qty = Math.max(1, parseInt(valor) || 1);
        nuevos[idx].cantidad = qty;
        nuevos[idx].subtotal = qty * nuevos[idx].precio;
        setItemActual({ ...itemActual, repuestosUsados: nuevos });
    };

    const quitarRepuesto = (idx) => {
        if (estaBloqueado) return;
        const nuevos = [...itemActual.repuestosUsados];
        nuevos.splice(idx, 1);
        setItemActual({ ...itemActual, repuestosUsados: nuevos });
    };

    const editarItem = (idx) => {
        if (estaBloqueado) return;
        const itemParaEditar = ticketItems[idx];
        setItemActual(itemParaEditar);
        const nuevaLista = [...ticketItems];
        nuevaLista.splice(idx, 1);
        setTicketItems(nuevaLista);
    };

    const eliminarItem = (idx) => {
        if (estaBloqueado) return;
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

    const agregarAlTicket = () => {
        if (estaBloqueado) return;
        if (esPresupuesto && !itemActual.equipoSerial) return toast.error("❌ Falta S/N");
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
    };

    const finalizar = async (confirmarTrabajo = false) => {
        if (estaBloqueado || ticketItems.length === 0) return;
        const loading = toast.loading(confirmarTrabajo ? "Confirmando..." : "Guardando...");
        try {
            const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
            const sedeIdReal = itemActual.sedeId || ticketItems[0]?.sedeId;
            const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== "MOSTRADOR");

            const servicioData = {
                sedeId: parseInt(sedeIdReal), usuarioId: 1, fecha: new Date().toISOString().split('T')[0],
                servicioTipo: tieneEquipo ? "TECNICA" : "VENTA", estado: confirmarTrabajo ? "REALIZADO" : "PRESUPUESTO",
                clienteNombre: clienteObj?.nombre || "Particular", sedeNombre: db.sedes?.find(s => s.id === sedeIdReal)?.nombreSede || "Mostrador",
                items: ticketItems.map(it => {
                    const esFiltro = it.trabajo?.toUpperCase().includes("FILTRO") || it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes("FILTRO"));
                    return {
                        equipoSerial: it.equipoSerial || "MOSTRADOR", tecnico: "Marcos", costo: parseFloat(it.totalCalculado),
                        costoExtra: parseFloat(it.costoExtra) || 0, metodoPago: "EFECTIVO", trabajoRealizado: it.resumenTexto,
                        trabajoTipo: tieneEquipo ? (esFiltro ? "CAMBIO_FILTRO" : "REPARACION") : "VENTA", repuestosUsados: it.repuestosUsados || [],
                        garantiaHasta: (confirmarTrabajo && tieneEquipo) ? new Date(new Date().setMonth(new Date().getMonth() + (esFiltro ? 6 : 3))).toISOString().split('T')[0] : null
                    };
                })
            };

            const formData = new FormData();
            formData.append("servicio", new Blob([JSON.stringify(servicioData)], { type: 'application/json' }));
            if (idEdicion) await api.put(`/servicios/${idEdicion}`, formData);
            else await api.post('/servicios', formData);
            
            toast.success("🚀 ¡Listo!", { id: loading });
            setTicketItems([]); setClienteId(null); setIdEdicion(null);
            if (onSaved) onSaved();
        } catch (err) { toast.error("Error de servidor", { id: loading }); }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48 font-sans transition-colors duration-300">
            
            {/* 🔒 AVISO DE BLOQUEO */}
            {estaBloqueado && (
                <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-center font-bold mb-5 shadow-sm">
                    🔒 REGISTRO YA COBRADO (SOLO LECTURA)
                </div>
            )}
            
            {/* SWITCH DE MODO */}
            {!estaBloqueado && (
                <div className="flex gap-3 mb-6">
                    <button onClick={() => {setEsPresupuesto(true); setTicketItems([])}} 
                        className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${esPresupuesto ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                        🛠️ SERVICIO TÉCNICO
                    </button>
                    <button onClick={() => {setEsPresupuesto(false); setTicketItems([])}} 
                        className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${!esPresupuesto ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                        🛒 VENTA / INSUMOS
                    </button>
                </div>
            )}

            {idEdicion && !estaBloqueado && (
                <div className="text-center font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg mb-4 text-xs tracking-widest uppercase">
                    ✏️ Editando Presupuesto #{idEdicion}
                </div>
            )}

            <Card className="shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Cliente</label>
                <CreatableSelect isDisabled={estaBloqueado} styles={premiumStyles}
                    options={db.clientes?.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                    value={db.clientes?.find(c => c.id.toString() === clienteId) ? { label: db.clientes.find(c => c.id.toString() === clienteId).nombre } : null}
                    onChange={(s) => setClienteId(s?.value)}
                    placeholder="Buscar o crear cliente..."
                />
            </Card>

            {clienteId && (
                <Card className="mt-4 shadow-sm">
                    <div className="mb-5">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Sede / Domicilio</label>
                        <Select isDisabled={estaBloqueado} styles={premiumStyles}
                            options={db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId).map(s => ({ value: s.id, label: s.nombreSede }))}
                            value={db.sedes?.find(s => s.id === itemActual.sedeId) ? { label: db.sedes.find(s => s.id === itemActual.sedeId).nombreSede } : null}
                            onChange={(s) => setItemActual({ ...itemActual, sedeId: s.value, sedeNombre: s.label })}
                            placeholder="Elegí la sede..."
                        />
                    </div>

                    {esPresupuesto && (
                        <div className="mb-5">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">S/N Dispenser</label>
                            <CreatableSelect isDisabled={estaBloqueado} styles={premiumStyles}
                                options={db.equipos?.filter(e => e.sede?.id?.toString() === itemActual.sedeId?.toString()).map(e => ({ value: e.numeroSerie, label: `S/N: ${e.numeroSerie}` }))}
                                onChange={(s) => { setItemActual({...itemActual, equipoSerial: s?.value}); consultarAntecedentes(s?.value); }}
                                value={itemActual.equipoSerial ? { label: itemActual.equipoSerial } : null}
                                placeholder="Elegí o creá N/S..."
                            />
                            {historialEquipo && (
                                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest tracking-tight">Antecedentes</span>
                                        <button onClick={enviarWhatsAppMantenimiento} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black active:scale-95 transition-transform">💬 WHATSAPP</button>
                                    </div>
                                    <p className="m-0 text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <span className="opacity-50">{historialEquipo.fecha}</span> — {historialEquipo.items[0]?.trabajoRealizado}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {!estaBloqueado && (
                        <div className="flex gap-2 items-end mb-5">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Agregar Productos</label>
                                <Select styles={premiumStyles}
                                    options={db.repuestos?.map(r => ({ ...r, label: `${r.nombre} ($${r.precio})`, value: r.id }))}
                                    onChange={setRepuestoElegido} value={repuestoElegido}
                                    placeholder="Buscar repuesto..."
                                />
                            </div>
                            <button onClick={sumarRepuesto} className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black shadow-lg shadow-slate-900/20 active:scale-90 transition-transform">+</button>
                        </div>
                    )}

                    {itemActual.repuestosUsados.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-5">
                            {itemActual.repuestosUsados.map((r, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{r.nombre}</div>
                                        <div className="text-[10px] text-slate-400 font-bold">${r.precio} c/u</div>
                                    </div>
                                    <input disabled={estaBloqueado} type="number" value={r.cantidad} min="1" onChange={(e) => actualizarCantidad(i, e.target.value)} 
                                           className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black text-slate-900 dark:text-white mr-3" />
                                    <div className="font-black text-sm w-16 text-right text-slate-900 dark:text-white">${r.subtotal}</div>
                                    {!estaBloqueado && <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">✕</button>}
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea disabled={estaBloqueado} placeholder="Descripción detallada del trabajo..." value={itemActual.trabajo} onChange={e => setItemActual({...itemActual, trabajo: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" />

                    <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-2xl mb-5 shadow-inner">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{esPresupuesto ? 'Mano de Obra ($)' : 'Costo de Envío ($)'}</label>
                        <input 
                            disabled={estaBloqueado} type="number" min="0" value={itemActual.costoExtra} 
                            onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1" 
                        />
                    </div>

                    {!estaBloqueado && (
                        <button onClick={agregarAlTicket} className="w-full h-14 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all">
                            SUMAR AL TICKET +
                        </button>
                    )}
                </Card>
            )}

            {/* RESUMEN DEL TICKET */}
            {ticketItems.length > 0 && (
                <div className="mt-8 mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Resumen del Remito</h4>
                    {ticketItems.map((it, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 shadow-sm flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <div className={`font-black text-sm tracking-tight ${it.equipoSerial !== "MOSTRADOR" ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {it.equipoSerial || 'VENTA INSUMOS'}
                                </div>
                                <div className="text-xs mt-1.5 text-slate-600 dark:text-slate-400 font-bold leading-relaxed">{it.resumenTexto}</div>
                                <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white tracking-tighter">${it.totalCalculado.toLocaleString()}</div>
                            </div>
                            {!estaBloqueado && (
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button onClick={() => editarItem(idx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl font-black text-[10px] uppercase">Editar</button>
                                    <button onClick={() => eliminarItem(idx)} className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 p-2.5 rounded-xl font-black text-[10px] uppercase">Quitar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 🚀 BARRA DE ACCIÓN FINAL */}
            {ticketItems.length > 0 && (
                <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
                    <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl border border-slate-700">
                        <div className="text-white">
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Final</div>
                            <div className="text-3xl font-black tracking-tighter">${ticketItems.reduce((a, b) => a + b.totalCalculado, 0).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={dispararPDF} className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center active:scale-90 transition-transform">📄</button>
                            {!estaBloqueado && (
                                <>
                                    <button onClick={() => finalizar(false)} className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px] active:scale-95 transition-transform">
                                        {idEdicion ? "ACTUALIZAR" : "GUARDAR"}
                                    </button>
                                    <button onClick={() => finalizar(true)} 
                                            className={`px-6 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all ${esPresupuesto ? 'bg-rose-500' : 'bg-emerald-500'}`}>
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