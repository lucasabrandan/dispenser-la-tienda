import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { getTodayISO } from '../../utils/dateUtils';
import FotoUpload from '../servicio/FotoUpload';

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-[#A8A29E]';
const labelCls = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1';

/**
 * ModalRegistrarTrabajo — full-screen sheet
 * Permite al tecnico registrar trabajo realizado en una orden sin presupuesto vinculado.
 * Crea un Servicio REALIZADO y marca la orden como COMPLETADA.
 */
export default function ModalRegistrarTrabajo({ orden, tecnicoId, onGuardado, onCerrar }) {
    const [repuestosDisp,  setRepuestosDisp]  = useState([]);
    const [sedes,          setSedes]          = useState([]);
    const [sedeId,         setSedeId]         = useState('');
    const [sedeNombre,     setSedeNombre]     = useState('');
    const [descripcion,    setDescripcion]    = useState('');
    const [observaciones,  setObservaciones]  = useState('');
    const [costo,          setCosto]          = useState('');
    const [metodoPago,     setMetodoPago]     = useState('EFECTIVO');
    const [serial,         setSerial]         = useState('');
    const [fotoEvidencia,  setFotoEvidencia]  = useState(null);
    const [seleccionados,  setSeleccionados]  = useState([]);
    const [guardando,      setGuardando]      = useState(false);

    useEffect(() => {
        api.get('/repuestos').then(r => setRepuestosDisp(r.data || [])).catch(() => {});
        const url = orden.clienteId ? `/sedes?clienteId=${orden.clienteId}` : '/sedes';
        api.get(url)
            .then(r => {
                const lista = r.data?.content || r.data || [];
                setSedes(lista);
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
        if (!sedeId) { toast.error('Selecciona la sede'); return; }
        if (!descripcion.trim()) { toast.error('Describi el trabajo realizado'); return; }
        if (!costo || Number(costo) <= 0) { toast.error('Ingresa el costo del servicio'); return; }

        setGuardando(true);
        try {
            const repuestosUsados = seleccionados.map(s => ({
                id:       s.repuesto.id,
                nombre:   s.repuesto.nombre,
                cantidad: s.cantidad,
                precio:   s.repuesto.precio || 0,
            }));

            const sedeSel = sedes.find(s => String(s.id) === String(sedeId));

            // Subir foto si hay
            let fotoUrl = null;
            if (fotoEvidencia && fotoEvidencia.startsWith('data:')) {
                try {
                    const blob = await (await fetch(fotoEvidencia)).blob();
                    const formData = new FormData();
                    formData.append('file', blob, `evidencia_${Date.now()}.jpg`);
                    const uploadRes = await api.post('/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    fotoUrl = uploadRes.data?.url || uploadRes.data?.filename || null;
                } catch { /* foto no critica */ }
            }

            await api.post('/servicios', {
                clienteNombre: orden.clienteNombre || '',
                sedeId:        Number(sedeId),
                sedeNombre:    sedeNombre || sedeSel?.nombre || '',
                usuarioId:     tecnicoId,
                servicioTipo:  'REPARACION',
                estado:        'REALIZADO',
                fecha:         getTodayISO(),
                ordenId:       orden.id,
                observaciones: observaciones.trim() || null,
                items: [{
                    equipoSerial:     serial.trim() || 'S/N',
                    tecnico:          String(tecnicoId),
                    trabajoTipo:      'REPARACION',
                    metodoPago,
                    trabajoRealizado: descripcion,
                    costo:            Number(costo),
                    repuestosUsados,
                    fotoDespues:      fotoUrl,
                }],
            });

            // Notas para el admin: combinar observaciones + descripcion
            const nota = observaciones.trim()
                ? `${descripcion.trim()} | Obs: ${observaciones.trim()}`
                : descripcion.trim();

            await api.patch(`/ordenes/${orden.id}/estado`, {
                estado:       'COMPLETADA',
                notasTecnico: nota,
            });

            toast.success('Trabajo registrado');
            onGuardado();
        } catch {
            toast.error('No se pudo registrar el trabajo');
        } finally {
            setGuardando(false);
        }
    };

    const disponibles = repuestosDisp.filter(r => !seleccionados.find(s => s.repuesto.id === r.id));

    return (
        <div className="fixed inset-0 z-[3000] flex flex-col bg-[#F5F3F1] dark:bg-[#141414]">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                <div className="flex items-center gap-3">
                    <button onClick={onCerrar}
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-90">
                        ←
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">Registrar trabajo</h2>
                        <p className="text-[11px] text-[#A8A29E] truncate mt-0.5">{orden.clienteNombre || 'Cliente'} · {orden.titulo}</p>
                    </div>
                </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
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
                        <p className="text-[11px] text-[#D13A28] font-bold">Sin sedes disponibles en el sistema</p>
                    </div>
                )}

                {/* Trabajo realizado */}
                <div>
                    <label className={labelCls}>Trabajo realizado *</label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                        rows={3} placeholder="Ej: Cambie filtros de sedimento y carbon activado, limpie dispensador..."
                        className={`${inputCls} resize-none`} />
                </div>

                {/* Serial + Costo */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>N Serie equipo</label>
                        <input type="text" value={serial} onChange={e => setSerial(e.target.value)}
                            placeholder="S/N" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Costo *</label>
                        <input type="number" value={costo} onChange={e => setCosto(e.target.value)}
                            placeholder="0" min="0" className={inputCls} />
                    </div>
                </div>

                {/* Forma de pago */}
                <div>
                    <label className={labelCls}>Forma de pago</label>
                    <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className={inputCls}>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>

                {/* Repuestos */}
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

                {/* Foto evidencia */}
                <div>
                    <label className={labelCls}>Foto del trabajo (opcional)</label>
                    <div className="max-w-[160px]">
                        <FotoUpload label="Evidencia" foto={fotoEvidencia} onChange={setFotoEvidencia} />
                    </div>
                </div>

                {/* Observaciones para el admin */}
                <div>
                    <label className={labelCls}>Observaciones (opcional)</label>
                    <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                        rows={2} placeholder="Notas para el admin: estado del equipo, recomendaciones, problemas..."
                        className={`${inputCls} resize-none`} />
                </div>
            </div>

            {/* Boton fijo abajo */}
            <div className="shrink-0 flex gap-2 px-4 py-4 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.08]">
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
    );
}
