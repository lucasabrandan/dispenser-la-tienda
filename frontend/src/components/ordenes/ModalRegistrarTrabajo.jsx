import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { limpiarSerie } from '../../utils/serie';
import { toast } from 'react-hot-toast';
import { getTodayISO } from '../../utils/dateUtils';
import FotoUpload from '../servicio/FotoUpload';
import { PreguntaPago, pagoCompleto } from '../servicio/ejecutar/PasoCobro';

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
const labelCls = 'block text-label font-black text-muted uppercase tracking-wider mb-1';

/**
 * ModalRegistrarTrabajo — full-screen sheet
 * Permite al tecnico registrar trabajo realizado en una orden sin presupuesto vinculado.
 * Crea un Servicio (tipo TECNICA) y marca la orden como COMPLETADA. El precio lo pone el
 * admin (monto estimado de la visita); el técnico solo dice si le pagaron (4-oct-2026).
 */
export default function ModalRegistrarTrabajo({ orden, tecnicoId, onGuardado, onCerrar }) {
    const tecnicoNombre = orden?.tecnicoNombre || '';
    const [repuestosDisp,  setRepuestosDisp]  = useState([]);
    const [sedes,          setSedes]          = useState([]);
    const [sedeId,         setSedeId]         = useState('');
    const [sedeNombre,     setSedeNombre]     = useState('');
    const [descripcion,    setDescripcion]    = useState('');
    const [observaciones,  setObservaciones]  = useState('');
    const [pago,           setPago]           = useState(null);
    const [monto,          setMonto]          = useState(0);
    const precioAdmin = Number(orden?.montoEstimado) || 0;
    // El N/S de la visita (pedidos de empresa) ya viene cargado
    const [serial,         setSerial]         = useState(() => String(orden?.equiposSerie || '').split(',')[0].trim());
    const [fotoEvidencia,  setFotoEvidencia]  = useState(null);
    const [seleccionados,  setSeleccionados]  = useState([]);
    const [guardando,      setGuardando]      = useState(false);
    const [esMostrador,    setEsMostrador]    = useState(false);

    useEffect(() => {
        // Bug 3-oct-2026: /repuestos devuelve una página ({content: [...]}), no una
        // lista. Se guardaba el objeto y al dibujar la pantalla .filter() rompía todo
        // ("se cae la pantalla" al tocar Cerrar trabajo). Además traía solo 20.
        api.get('/repuestos', { params: { page: 0, size: 1000 } })
            .then(r => { const d = r.data; setRepuestosDisp(Array.isArray(d) ? d : (d?.content || [])); })
            .catch(() => {});
        // Sedes del cliente de la visita. Si no tiene (venta o cliente sin dirección
        // cargada) se usa la sede "Mostrador" — antes caía en el listado de TODAS las
        // sedes (ahora solo del admin) y el técnico no podía cerrar (5-oct-2026).
        const normalizar = d => (Array.isArray(d) ? d : (d?.content || []))
            .map(s => ({ ...s, nombre: s.nombre || s.nombreSede || s.direccion || `Sede ${s.id}` }));
        const elegir = (lista) => {
            setSedes(lista);
            if (lista.length === 1) {
                setSedeId(String(lista[0].id));
                setSedeNombre(lista[0].nombre || lista[0].descripcion || '');
            }
        };
        const mostrador = () => api.get('/sedes/mostrador')
            .then(r => { const l = normalizar(r.data); setEsMostrador(l.length > 0); elegir(l); })
            .catch(() => {});
        if (!orden.clienteId) { mostrador(); return; }
        api.get(`/sedes/cliente/${orden.clienteId}`)
            .then(r => { const l = normalizar(r.data); if (l.length) elegir(l); else mostrador(); })
            .catch(mostrador);
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
        if (!pagoCompleto(pago, monto)) { toast.error('Decinos si te pagó'); return; }

        setGuardando(true);

        // Dos llamadas separadas a proposito (crear el servicio, despues cerrar la
        // orden): si la primera falla no se creo nada, se puede reintentar tranquilo.
        // Si la primera anda bien y la segunda falla, el servicio YA existe — hay que
        // avisar eso puntualmente y cerrar el modal, para que Marcos no reintente y
        // termine duplicando el trabajo.
        try {
            const efectivo = pago === 'EFECTIVO';
            // Si no hay precio cargado y le pagaron, lo que cobró es el precio
            const precio = precioAdmin || (pago !== 'NO' ? Number(monto) : 0);
            const notaTransf = pago === 'TRANSFERENCIA' ? `Pagó por transferencia $${Math.round(monto).toLocaleString('es-AR')} — verificar` : '';
            const obsFinal = [observaciones.trim(), notaTransf].filter(Boolean).join('\n') || null;
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
                    // El endpoint es /api/uploads (antes apuntaba a /files/upload, que no existe)
                    const uploadRes = await api.post('/uploads', formData);
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
                    estado:        efectivo ? 'COBRADO' : 'COMPLETADO',
                    ...(efectivo ? { modalidadCobro: 'EFECTIVO_SIN_FACTURA', montoFinal: Number(monto) } : {}),
                    fecha:         getTodayISO(),
                    ordenId:       orden.id,
                    observaciones: obsFinal,
                    items: [{
                        equipoSerial:     serial.trim() || 'S/N',
                        tecnico:          tecnicoNombre || String(tecnicoId),
                        trabajoTipo:      'REPARACION',
                        metodoPago:       pago === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO',
                        trabajoRealizado: descripcion,
                        costo:            precio,
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
                        <h2 className="text-title font-black text-ink leading-none">Cerrar trabajo</h2>
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
                        <p className="text-caption text-[#D13A28] font-bold">Este cliente no tiene dirección cargada. Avisale al admin.</p>
                    </div>
                )}
                {esMostrador && sedes.length > 0 && (
                    <p className="text-caption text-muted">El cliente no tiene dirección cargada: se registra como mostrador.</p>
                )}

                {/* Trabajo realizado */}
                <div>
                    <label className={labelCls}>Trabajo realizado *</label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                        rows={3} placeholder="Ej: Cambie filtros de sedimento y carbon activado, limpie dispensador..."
                        className={`${inputCls} resize-none`} />
                </div>

                {/* Serie del equipo */}
                <div>
                    <label className={labelCls}>N Serie equipo</label>
                    <input type="text" value={serial} onChange={e => setSerial(limpiarSerie(e.target.value))}
                        placeholder="S/N" className={inputCls} />
                </div>

                {/* ¿Te pagó? — mismo bloque que al cerrar un presupuesto */}
                <div className="space-y-2">
                    <label className={labelCls}>¿Te pagó? *{precioAdmin > 0 && <span className="normal-case tracking-normal font-bold"> · Precio: ${Math.round(precioAdmin).toLocaleString('es-AR')}</span>}</label>
                    <PreguntaPago total={precioAdmin} pago={pago} setPago={setPago} monto={monto} setMonto={setMonto} />
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
                <button onClick={handleGuardar} disabled={guardando || !sedeId || !descripcion.trim() || !pagoCompleto(pago, monto)}
                    className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white active:scale-95 transition-all bg-brand-red disabled:opacity-40">
                    {guardando ? 'Guardando...' : 'Cerrar trabajo'}
                </button>
            </div>
        </div>
    );
}
