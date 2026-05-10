/**
 * EjecutarOrdenSheet
 * Vista simplificada para técnicos al ejecutar un presupuesto asignado.
 * - Muestra los equipos y trabajo (read-only)
 * - Permite agregar repuestos (solo ve nombre + precio de venta)
 * - Permite escribir observaciones
 * - Captura firmas (opcionales)
 * - Confirma → PUT /servicios/:id con estado REALIZADO + genera PDF
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FirmaPad from '../ui/FirmaPad';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';

export default function EjecutarOrdenSheet({ servicio, onConfirmado, onCerrar }) {
    const { usuario } = useAuth();

    const [paso, setPaso] = useState('detalle'); // 'detalle' | 'firmas'
    const [observaciones, setObservaciones] = useState(servicio.observaciones || '');
    const [repuestosAgregados, setRepuestosAgregados] = useState([]);
    const [repuestosDisponibles, setRepuestosDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [firmaTecnico, setFirmaTecnico] = useState(null);
    const [editandoFirma, setEditandoFirma] = useState(false);
    const [firmaCliente, setFirmaCliente] = useState(null);
    const [incluirFirmas, setIncluirFirmas] = useState(true);
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        // Cargar firma guardada del técnico
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoFirma(true);
        } catch {}
        // Cargar lista de repuestos disponibles — endpoint devuelve Page<Repuesto>
        api.get('/repuestos', { params: { size: 1000 } })
            .then(r => setRepuestosDisponibles(r.data?.content || r.data || []))
            .catch(() => {});
    }, []);

    // Total original de la orden
    const totalOriginal = servicio.items?.reduce((s, it) => s + Number(it.costo || 0), 0) || 0;
    // Total de repuestos nuevos que agregó el técnico
    const totalRepuestosNuevos = repuestosAgregados.reduce((s, r) => s + r.precio * r.cantidad, 0);
    const descPct = servicio.descuentoPorcentaje || 0;
    const totalFinal = Math.round((totalOriginal + totalRepuestosNuevos) * (1 - descPct / 100));

    // Filtro de búsqueda (mínimo 2 caracteres)
    const repuestosFiltrados = busqueda.length >= 2
        ? repuestosDisponibles.filter(r => r.nombre?.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 6)
        : [];

    const agregarRepuesto = (rep) => {
        setRepuestosAgregados(prev => {
            const idx = prev.findIndex(r => r.id === rep.id);
            if (idx >= 0) {
                const copia = [...prev];
                copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 };
                return copia;
            }
            return [...prev, {
                id: rep.id,
                nombre: rep.nombre,
                precio: parseFloat(rep.precio) || 0,
                cantidad: 1,
            }];
        });
        setBusqueda('');
    };

    const cambiarCantidad = (id, delta) => {
        setRepuestosAgregados(prev => prev
            .map(r => r.id === id ? { ...r, cantidad: Math.max(1, r.cantidad + delta) } : r)
        );
    };

    const quitarRepuesto = (id) => setRepuestosAgregados(prev => prev.filter(r => r.id !== id));

    const guardarFirma = async () => {
        if (!firmaTecnico) return;
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            if (user.id) api.put(`/admin/usuarios/${user.id}/firma`, { firma: firmaTecnico }).catch(() => {});
            setEditandoFirma(false);
        } catch {}
    };

    const confirmar = async () => {
        setProcesando(true);
        const loading = toast.loading('Confirmando trabajo...');
        try {
            // Merge repuestos nuevos en el primer ítem
            const itemsActualizados = (servicio.items || []).map((it, i) => ({
                equipoSerial:     it.equipoSerial || 'MOSTRADOR',
                tecnico:          it.tecnico || usuario?.nombre || 'Técnico',
                costo:            Number(it.costo || 0),
                costoExtra:       Number(it.costoExtra || 0),
                metodoPago:       it.metodoPago || 'EFECTIVO',
                trabajoRealizado: it.trabajoRealizado || '',
                trabajoTipo:      it.trabajoTipo || 'REPARACION',
                garantiaHasta:    it.garantiaHasta || null,
                fotoAntes:        it.fotoAntes || null,
                fotoDespues:      it.fotoDespues || null,
                repuestosUsados: i === 0
                    ? [...(it.repuestosUsados || []), ...repuestosAgregados]
                    : (it.repuestosUsados || []),
            }));

            await api.put(`/servicios/${servicio.id}`, {
                sedeId:              servicio.sedeId,
                usuarioId:           usuario?.id || servicio.usuarioId,
                fecha:               servicio.fecha,
                servicioTipo:        servicio.servicioTipo || 'TECNICA',
                estado:              'REALIZADO',
                clienteNombre:       servicio.clienteNombre,
                sedeNombre:          servicio.sedeNombre,
                descuentoPorcentaje: descPct,
                totalConDescuento:   totalFinal,
                observaciones,
                items:               itemsActualizados,
            });

            toast.success('Trabajo confirmado', { id: loading });

            // Generar PDF — si falla (popup blocker, etc.) el trabajo ya está guardado
            try {
                const ticketItems = itemsActualizados.map(it => ({
                    ...it,
                    totalCalculado:  it.costo,
                    modeloEquipo:    it.modeloEquipo || null,
                    ubicacionEquipo: it.ubicacionEquipo || null,
                    trabajo:         it.trabajoRealizado,
                }));

                await generarRemitoPDFPremium({
                    esPresupuesto:          false,
                    servicioId:             servicio.id,
                    nroDocumentoExistente:  servicio.nroDocumento
                        || localStorage.getItem(`pdf_nro_${servicio.id}`)
                        || null,
                    cliente: {
                        nombre:       servicio.clienteNombre,
                        telefono:     servicio.clienteTelefono,
                        email:        servicio.clienteEmail,
                        cuilDni:      servicio.clienteDni,
                        condicionIva: servicio.clienteCondicionIva,
                    },
                    sede: {
                        nombreSede: servicio.sedeNombre,
                        direccion:  servicio.sedeDireccion,
                    },
                    tecnico:             usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Técnico',
                    ticketItems,
                    fechaServicio:       servicio.fecha,
                    descuentoPorcentaje: descPct,
                    leyenda:             observaciones,
                    esTecnicoForzado:    true,
                    firmaTecnico:        incluirFirmas ? (firmaTecnico || null) : null,
                    firmaCliente:        incluirFirmas ? (firmaCliente || null) : null,
                    incluirFirmas,
                });
            } catch (pdfErr) {
                // PDF no bloqueante: el trabajo ya está guardado aunque el PDF falle
                console.warn('PDF no generado:', pdfErr);
                toast('Trabajo guardado. PDF no disponible (bloqueado por el navegador)', { icon: '⚠️' });
            }

            if (onConfirmado) onConfirmado();
        } catch (e) {
            console.error('Error confirmando trabajo:', e);
            toast.error('Error al confirmar', { id: loading });
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-[#C8C4BE] dark:bg-[#141414]">

            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                <div className="flex items-center gap-3">
                    <button onClick={onCerrar}
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-90">
                        ←
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                            Ejecutar trabajo
                        </h2>
                        <p className="text-[11px] text-[#A8A29E] truncate mt-0.5">
                            {servicio.clienteNombre} · {servicio.sedeNombre}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-wider">Total</p>
                        <p className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                            ${totalFinal.toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>
                {/* Steps */}
                <div className="flex gap-1 mt-3">
                    {['detalle', 'firmas'].map((s, i) => (
                        <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${paso === s || (i === 0) ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#C0BCB6] dark:bg-[#2E2E2E]'} ${paso === 'firmas' && s === 'firmas' ? 'bg-[#D13A28] dark:bg-[#E8422F]' : ''}`} />
                    ))}
                </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

                {/* ── PASO 1: DETALLE ──────────────────────────────────────── */}
                {paso === 'detalle' && (
                    <>
                        {/* Equipos y trabajo (read-only) */}
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                                Equipos y trabajo asignado
                            </p>
                            {servicio.items?.map((it, i) => (
                                <div key={i} className="p-3 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.06]">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-[13px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                            {it.equipoSerial}
                                        </p>
                                        {it.equipoModelo && (
                                            <p className="text-[10px] text-[#A8A29E] shrink-0">{it.equipoModelo}</p>
                                        )}
                                    </div>
                                    {it.equipoUbicacion && (
                                        <p className="text-[10px] text-[#A8A29E] mb-1">
                                            {[it.equipoUbicacion, it.equipoPiso && `P${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">
                                        {it.trabajoRealizado}
                                    </p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-black/[0.06]">
                                            {it.repuestosUsados.map((r, ri) => (
                                                <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                                    {r.cantidad}× {r.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>

                        {/* Repuestos adicionales */}
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">
                                Agregar repuestos
                            </p>
                            <div className="relative">
                                <input
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    placeholder="Buscar repuesto..."
                                    className="w-full h-10 px-3 rounded-xl text-[13px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] outline-none"
                                />
                                {busqueda && (
                                    <button onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                                )}
                            </div>

                            {/* Resultados búsqueda */}
                            {repuestosFiltrados.length > 0 && (
                                <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#242424]">
                                    {repuestosFiltrados.map(r => (
                                        <button key={r.id} onClick={() => agregarRepuesto(r)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-black/[0.05] last:border-0 active:bg-[#D8D4CE] dark:active:bg-[#2E2E2E]">
                                            <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</span>
                                            <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] shrink-0">
                                                ${(parseFloat(r.precio) || 0).toLocaleString('es-AR')}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {busqueda.length >= 2 && repuestosFiltrados.length === 0 && (
                                <p className="text-[11px] text-[#A8A29E] text-center py-2">Sin resultados</p>
                            )}

                            {/* Lista de repuestos agregados */}
                            {repuestosAgregados.length > 0 && (
                                <div className="space-y-1.5">
                                    {repuestosAgregados.map(r => (
                                        <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.06]">
                                            <span className="flex-1 text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] min-w-0 truncate">
                                                {r.nombre}
                                            </span>
                                            {/* Cantidad */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => cambiarCantidad(r.id, -1)}
                                                    className="w-6 h-6 rounded-lg bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] font-black text-sm flex items-center justify-center active:scale-90">
                                                    −
                                                </button>
                                                <span className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] w-5 text-center">
                                                    {r.cantidad}
                                                </span>
                                                <button onClick={() => cambiarCantidad(r.id, +1)}
                                                    className="w-6 h-6 rounded-lg bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] font-black text-sm flex items-center justify-center active:scale-90">
                                                    +
                                                </button>
                                            </div>
                                            <span className="text-[11px] text-[#A8A29E] shrink-0 w-16 text-right">
                                                ${(r.precio * r.cantidad).toLocaleString('es-AR')}
                                            </span>
                                            <button onClick={() => quitarRepuesto(r.id)}
                                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#A8A29E] active:text-[#D13A28] font-bold text-sm shrink-0">
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Observaciones */}
                        <section className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Observaciones</p>
                            <textarea
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                placeholder="Anotá cualquier detalle del trabajo realizado..."
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl text-[13px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] outline-none resize-none"
                            />
                        </section>

                        <button onClick={() => setPaso('firmas')}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                            Firmas y confirmar →
                        </button>
                    </>
                )}

                {/* ── PASO 2: FIRMAS ───────────────────────────────────────── */}
                {paso === 'firmas' && (
                    <>
                        <button onClick={() => setPaso('detalle')}
                            className="flex items-center gap-1 text-[12px] font-bold text-[#A8A29E] active:scale-95 mb-2">
                            ← Volver
                        </button>

                        {/* Toggle firmas */}
                        <button
                            onClick={() => setIncluirFirmas(v => !v)}
                            className="flex items-center gap-2 text-[11px] text-[#A8A29E] font-bold active:scale-95 transition-all"
                        >
                            <span className={`w-8 h-4 rounded-full flex items-center transition-colors ${incluirFirmas ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#C0BCB6] dark:bg-[#2E2E2E]'}`}>
                                <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${incluirFirmas ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                            Incluir firmas en el PDF
                        </button>

                        {/* Firma técnico */}
                        {incluirFirmas && (!editandoFirma ? (
                            <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[#EDEAE6] dark:bg-[#242424]">
                                <span className="text-[12px] font-bold text-[#16A34A]">✓ Firma del técnico guardada</span>
                                <button onClick={() => setEditandoFirma(true)}
                                    className="ml-auto text-[11px] font-bold text-[#A8A29E]">Cambiar</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <FirmaPad label="Firma del técnico" value={firmaTecnico} onChange={setFirmaTecnico} height={100} />
                                <div className="flex items-center gap-2">
                                    <button onClick={guardarFirma} disabled={!firmaTecnico}
                                        className="text-[11px] px-3 py-1.5 rounded-full bg-[#D13A28] text-white font-bold disabled:opacity-40 active:scale-95">
                                        Guardar mi firma
                                    </button>
                                    <span className="text-[10px] text-[#A8A29E]">Se recordará para próximas veces</span>
                                </div>
                            </div>
                        ))}

                        {/* Firma cliente */}
                        {incluirFirmas && (
                            <FirmaPad label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente}
                                height={!editandoFirma ? 180 : 130} />
                        )}

                        <button onClick={confirmar} disabled={procesando}
                            className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] disabled:opacity-50 transition-all">
                            {procesando ? 'Procesando...' : '✓ Confirmar y PDF'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
