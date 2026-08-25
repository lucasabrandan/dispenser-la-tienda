import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { getTodayISO } from '../../utils/dateUtils';
import FotoUpload from '../servicio/FotoUpload';

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
const labelCls = 'block text-label font-black text-muted uppercase tracking-wider mb-1';

// Mismas 3 opciones y mismo destino que EjecutarAdminSheet — un solo vocabulario
// de "modalidad de cobro" en toda la app, no uno por pantalla.
const MODALIDADES = [
    { id: 'EFECTIVO_SIN_FACTURA', label: 'Efectivo sin factura', desc: 'Cobrado en mano, sin ARCA', color: '#16A34A', destino: 'COBRADO' },
    { id: 'CON_FACTURA',          label: 'Con factura',          desc: 'Facturar + enviar datos bancarios', color: '#8B5CF6', destino: 'PENDIENTE_FACTURACION' },
    { id: 'PENDIENTE',            label: 'Definir despues',      desc: 'Queda como realizado, cobro pendiente', color: '#A8A29E', destino: 'COMPLETADO' },
];

/**
 * ModalRegistrarTrabajo — full-screen sheet
 * Permite al tecnico registrar trabajo realizado en una orden sin presupuesto vinculado.
 * Crea un Servicio (tipo TECNICA) con la modalidad de cobro elegida y marca la orden como COMPLETADA.
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
    const [modalidad,      setModalidad]      = useState('');
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
        if (!modalidad) { toast.error('Elegi la modalidad de cobro'); return; }

        setGuardando(true);

        // Dos llamadas separadas a proposito (crear el servicio, despues cerrar la
        // orden): si la primera falla no se creo nada, se puede reintentar tranquilo.
        // Si la primera anda bien y la segunda falla, el servicio YA existe — hay que
        // avisar eso puntualmente y cerrar el modal, para que Marcos no reintente y
        // termine duplicando el trabajo.
        try {
            const modalidadSel = MODALIDADES.find(m => m.id === modalidad);
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

            try {
                await api.post('/servicios', {
                    clienteNombre: orden.clienteNombre || '',
                    sedeId:        Number(sedeId),
                    sedeNombre:    sedeNombre || sedeSel?.nombre || '',
                    usuarioId:     tecnicoId,
                    servicioTipo:  'TECNICA',
                    estado:        modalidadSel.destino,
                    modalidadCobro: modalidad === 'PENDIENTE' ? null : modalidad,
                    montoFinal:    Number(costo),
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
            } catch {
                toast.error('No se pudo registrar el trabajo. Probá de nuevo.');
                setGuardando(false);
                return;
            }

            // A partir de aca el servicio ya quedo creado — pase lo que pase con el
            // cierre de la orden, no hay que dejar reintentar desde este modal.
            try {
                const nota = observaciones.trim()
                    ? `${descripcion.trim()} | Obs: ${observaciones.trim()}`
                    : descripcion.trim();

                await api.patch(`/ordenes/${orden.id}/estado`, {
                    estado:       'COMPLETADA',
                    notasTecnico: nota,
                });
                toast.success('Trabajo registrado');
            } catch {
                toast.error('El trabajo se guardó, pero no se pudo cerrar la orden. Avisale al admin para que la cierre — no lo vuelvas a cargar.', { duration: 8000 });
            }

            onGuardado();
        } finally {
            setGuardando(false);
        }
    };

    const disponibles = repuestosDisp.filter(r => !seleccionados.find(s => s.repuesto.id === r.id));

    return (
        <div className="fixed inset-0 z-[3000] flex flex-col bg-page">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-panel border-b border-black/[0.08]">
                <div className="flex items-center gap-3">
                    <button onClick={onCerrar}
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-chip text-secondary active:scale-90">
                        ←
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-title font-black text-ink leading-none">Registrar trabajo</h2>
                        <p className="text-caption text-muted truncate mt-0.5">{orden.clienteNombre || 'Cliente'} · {orden.titulo}</p>
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
                        <p className="text-caption text-[#D13A28] font-bold">Sin sedes disponibles en el sistema</p>
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
                        <input type="text" inputMode="decimal" value={costo} onChange={e => setCosto(e.target.value)}
                            placeholder="0" className={inputCls} />
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

                {/* Modalidad de cobro — misma pregunta que le hace el admin a un presupuesto */}
                <div>
                    <label className={labelCls}>Modalidad de cobro *</label>
                    <div className="space-y-2">
                        {MODALIDADES.map(o => (
                            <button key={o.id} type="button" onClick={() => setModalidad(o.id)}
                                className={`w-full p-3 rounded-xl text-left border-2 transition-all active:scale-[0.98] ${modalidad === o.id ? '' : 'border-black/[0.06] dark:border-white/[0.06] bg-panel'}`}
                                style={modalidad === o.id ? { borderColor: o.color, backgroundColor: o.color + '0D' } : {}}>
                                <p className="text-[12.5px] font-black text-ink">{o.label}</p>
                                <p className="text-caption text-muted mt-0.5">{o.desc}</p>
                            </button>
                        ))}
                    </div>
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
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-panel">
                                    <span className="flex-1 text-body font-bold text-ink truncate">
                                        {repuesto.nombre}
                                    </span>
                                    <input type="text" inputMode="numeric" value={cantidad}
                                        onChange={e => cambiarCantidad(repuesto.id, Number(e.target.value))}
                                        className="w-14 px-2 py-1 rounded-lg text-body font-bold bg-chip text-ink outline-none text-center" />
                                    <button onClick={() => quitarRepuesto(repuesto.id)}
                                        className="w-7 h-7 rounded-lg bg-[#D13A28]/10 text-brand-red text-label font-black flex items-center justify-center active:scale-90 transition-all">
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
            <div className="shrink-0 flex gap-2 px-4 py-4 bg-panel border-t border-black/[0.08]">
                <button onClick={onCerrar}
                    className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95 transition-all">
                    Cancelar
                </button>
                <button onClick={handleGuardar} disabled={guardando || !sedeId || !descripcion.trim() || !costo || !modalidad}
                    className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white active:scale-95 transition-all bg-brand-red disabled:opacity-40">
                    {guardando ? 'Guardando...' : 'Registrar trabajo'}
                </button>
            </div>
        </div>
    );
}
