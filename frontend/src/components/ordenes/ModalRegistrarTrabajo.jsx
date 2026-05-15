import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

/**
 * ModalRegistrarTrabajo
 * Permite al técnico registrar trabajo realizado en una orden sin presupuesto vinculado.
 * Crea un Servicio REALIZADO y marca la orden como COMPLETADA.
 * Props:
 *   orden      — { id, clienteId, clienteNombre, sedeId, sedeNombre, titulo }
 *   tecnicoId  — id del técnico logueado
 *   onGuardado — callback al guardar exitosamente
 *   onCerrar   — callback para cerrar sin guardar
 */
export default function ModalRegistrarTrabajo({ orden, tecnicoId, onGuardado, onCerrar }) {
    const [repuestosDisp,  setRepuestosDisp]  = useState([]);
    const [sedes,          setSedes]          = useState([]);
    const [sedeId,         setSedeId]         = useState('');
    const [sedeNombre,     setSedeNombre]     = useState('');
    const [descripcion,    setDescripcion]    = useState('');
    const [costo,          setCosto]          = useState('');
    const [metodoPago,     setMetodoPago]     = useState('EFECTIVO');
    const [serial,         setSerial]         = useState('');
    const [seleccionados,  setSeleccionados]  = useState([]); // [{ repuesto, cantidad }]
    const [guardando,      setGuardando]      = useState(false);

    useEffect(() => {
        api.get('/repuestos').then(r => setRepuestosDisp(r.data || [])).catch(() => {});
        // Cargar sedes del cliente si hay clienteId; si no, cargar todas las sedes disponibles
        const url = orden.clienteId ? `/sedes?clienteId=${orden.clienteId}` : '/sedes';
        api.get(url)
            .then(r => {
                const lista = r.data?.content || r.data || [];
                setSedes(lista);
                // Auto-seleccionar si hay una sola sede
                if (lista.length === 1) {
                    setSedeId(String(lista[0].id));
                    setSedeNombre(lista[0].nombre || lista[0].descripcion || '');
                }
            })
            .catch(() => {});
    }, [orden.clienteId]);

    const agregarRepuesto = (e) => {
        const r = repuestosDisp.find(x => x.id === Number(e.target.value));
        if (!r) return;
        setSeleccionados(prev => [...prev, { repuesto: r, cantidad: 1 }]);
        e.target.value = '';
    };

    const cambiarCantidad = (id, cantidad) => {
        setSeleccionados(prev =>
            prev.map(s => s.repuesto.id === id ? { ...s, cantidad: Math.max(1, cantidad) } : s)
        );
    };

    const quitarRepuesto = (id) => {
        setSeleccionados(prev => prev.filter(s => s.repuesto.id !== id));
    };

    const handleGuardar = async () => {
        if (!sedeId) { toast.error('Seleccioná la sede'); return; }
        if (!descripcion.trim()) { toast.error('Describí el trabajo realizado'); return; }
        if (!costo || Number(costo) <= 0) { toast.error('Ingresá el costo del servicio'); return; }

        setGuardando(true);
        try {
            const repuestosUsados = seleccionados.map(s => ({
                id:       s.repuesto.id,
                nombre:   s.repuesto.nombre,
                cantidad: s.cantidad,
                precio:   s.repuesto.precio || 0,
            }));

            const sedeSel = sedes.find(s => String(s.id) === String(sedeId));

            // Crear el servicio REALIZADO directamente (ordenId para evitar duplicado en sincronizarConServicios)
            await api.post('/servicios', {
                clienteNombre: orden.clienteNombre || '',
                sedeId:        Number(sedeId),
                sedeNombre:    sedeNombre || sedeSel?.nombre || '',
                usuarioId:     tecnicoId,
                servicioTipo:  'REPARACION',
                estado:        'REALIZADO',
                fecha:         new Date().toISOString().split('T')[0],
                ordenId:       orden.id,
                items: [{
                    equipoSerial:     serial.trim() || 'S/N',
                    tecnico:          String(tecnicoId),
                    trabajoTipo:      'REPARACION',
                    metodoPago,
                    trabajoRealizado: descripcion,
                    costo:            Number(costo),
                    repuestosUsados,
                }],
            });

            // Marcar la orden como completada con nota del técnico
            await api.patch(`/ordenes/${orden.id}/estado`, {
                estado:       'COMPLETADA',
                notasTecnico: descripcion,
            });

            toast.success('Trabajo registrado');
            onGuardado();
        } catch {
            toast.error('No se pudo registrar el trabajo');
        } finally {
            setGuardando(false);
        }
    };

    // Repuestos disponibles que aún no fueron seleccionados
    const disponibles = repuestosDisp.filter(r => !seleccionados.find(s => s.repuesto.id === r.id));

    return (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={onCerrar}>
            <div className="w-full sm:max-w-md bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Handle mobile */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-[#E8E5E0] dark:bg-[#2E2E2E] sm:hidden shrink-0" />

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07] shrink-0">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Registrar trabajo</p>
                    <h2 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-tight">
                        {orden.clienteNombre || 'Cliente'}
                    </h2>
                    <p className="text-[11px] text-[#A8A29E] mt-0.5">{orden.titulo}</p>
                </div>

                {/* Formulario scrollable */}
                <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">

                    {/* Sede */}
                    {sedes.length > 1 && (
                        <div>
                            <label className={labelCls}>Sede *</label>
                            <select value={sedeId} onChange={e => {
                                setSedeId(e.target.value);
                                const s = sedes.find(x => String(x.id) === e.target.value);
                                setSedeNombre(s?.nombre || s?.descripcion || '');
                            }} className={inputCls}>
                                <option value="">Seleccionar sede...</option>
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre || s.descripcion}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {sedes.length === 0 && (
                        <div>
                            <label className={labelCls}>Sede *</label>
                            <p className="text-[11px] text-[#D13A28] font-bold">
                                Sin sedes disponibles en el sistema
                            </p>
                        </div>
                    )}

                    {/* Descripción del trabajo */}
                    <div>
                        <label className={labelCls}>Trabajo realizado *</label>
                        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                            rows={3} placeholder="Ej: Cambié filtros de sedimento y carbón activado, limpié dispensador..."
                            className={`${inputCls} resize-none`} />
                    </div>

                    {/* Serial del equipo + Costo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>N° Serie equipo</label>
                            <input type="text" value={serial} onChange={e => setSerial(e.target.value)}
                                placeholder="S/N" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Costo *</label>
                            <input type="number" value={costo} onChange={e => setCosto(e.target.value)}
                                placeholder="0" min="0" className={inputCls} />
                        </div>
                    </div>

                    {/* Método de pago */}
                    <div>
                        <label className={labelCls}>Forma de pago</label>
                        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={inputCls}>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                    </div>

                    {/* Repuestos usados */}
                    <div>
                        <label className={labelCls}>Repuestos usados (opcional)</label>
                        <select onChange={agregarRepuesto} className={inputCls} defaultValue="">
                            <option value="">Agregar repuesto...</option>
                            {disponibles.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>

                        {seleccionados.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {seleccionados.map(({ repuesto, cantidad }) => (
                                    <div key={repuesto.id}
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                        <span className="flex-1 text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">
                                            {repuesto.nombre}
                                        </span>
                                        <input type="number" value={cantidad} min={1}
                                            onChange={e => cambiarCantidad(repuesto.id, Number(e.target.value))}
                                            className="w-14 px-2 py-1 rounded-lg text-[12px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none text-center" />
                                        <button onClick={() => quitarRepuesto(repuesto.id)}
                                            className="w-7 h-7 rounded-lg bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F] text-[14px] font-black flex items-center justify-center active:scale-90 transition-all">
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 px-5 py-4 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07]">
                    <button onClick={onCerrar}
                        className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={guardando || !sedeId || !descripcion.trim() || !costo}
                        className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F] disabled:opacity-40">
                        {guardando ? 'Guardando...' : 'Registrar trabajo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
