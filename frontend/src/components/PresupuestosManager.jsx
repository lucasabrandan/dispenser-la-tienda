import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useFiltros } from '../hooks/useFiltros';
import { useMontos } from '../context/MontosContext';
import FiltrosPanel from './ui/FiltrosPanel';
import Paginacion   from './ui/Paginacion';
import { M } from './servicio/ServicioUI';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

const TIPOS_PRESU = [
    { value: 'TECNICA', label: 'Servicio' },
    { value: 'VENTA',   label: 'Venta'    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta individual de presupuesto
// ─────────────────────────────────────────────────────────────────────────────
function PresupuestoCard({ s, calcularTotal, onVer, onPDF, onCobrar, onRechazar, onEliminar }) {
    const esTecnico = s.servicioTipo === 'TECNICA';
    return (
        <div className="bg-[#EDEAE6] dark:bg-[#242424] p-5 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] transition-all">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex gap-2 items-center mb-1">
                        <span className="text-[10px] font-bold text-[#A8A29E]">#{s.id}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase ${
                            esTecnico
                                ? 'bg-[#D13A28]/10 text-[#D13A28] dark:bg-[#E8422F]/10 dark:text-[#E8422F]'
                                : 'bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500]'
                        }`}>
                            {esTecnico ? '🔧 Servicio' : '🛒 Venta'}
                        </span>
                    </div>
                    <h4 className="text-[15px] font-extrabold text-[#1C1917] dark:text-[#F0EEE9]">{s.clienteNombre}</h4>
                    <p className="text-[11px] text-[#A8A29E] font-medium mt-0.5">📍 {s.sedeNombre} · {s.fecha}</p>
                </div>
                <M valor={calcularTotal(s)} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9]" />
            </div>

            {/* Detalle de ítems */}
            {s.items?.length > 0 && (
                <div className="bg-[#C0BCB6] dark:bg-[#1C1C1C] rounded-xl p-3 mb-3 space-y-1">
                    {s.items.map((it, i) => (
                        <p key={i} className="text-[11px] text-[#57534E] dark:text-[#A8A29E] truncate">
                            · {it.equipoSerial !== 'MOSTRADOR' ? `${it.equipoSerial} — ` : ''}{it.trabajoRealizado}
                        </p>
                    ))}
                </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.07] dark:border-white/[0.07] flex-wrap">
                <button onClick={() => onVer(s)}
                    className="p-2.5 rounded-xl bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] hover:opacity-80 transition-opacity">
                    👁️
                </button>
                <button onClick={() => onPDF(s)}
                    className="p-2.5 rounded-xl bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] hover:opacity-80 transition-opacity">
                    📄
                </button>
                <button onClick={() => onCobrar(s.id)}
                    className="px-4 py-2 rounded-xl font-extrabold text-xs text-white active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                    ✓ Cobrar
                </button>
                <button onClick={() => onRechazar(s.id)}
                    className="px-4 py-2 rounded-xl font-extrabold text-xs text-[#1C1917] dark:text-[#F0EEE9] active:scale-95 transition-all bg-[#C0BCB6] dark:bg-[#2E2E2E]">
                    ✗ Rechazar
                </button>
                <button onClick={() => onEliminar(s.id)}
                    className="p-2.5 rounded-xl ml-auto text-[#D13A28] dark:text-[#E8422F] bg-[#D13A28]/10 dark:bg-[#E8422F]/10 hover:opacity-80 transition-opacity">
                    🗑️
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de detalle
// ─────────────────────────────────────────────────────────────────────────────
function ModalDetalle({ s, calcularTotal, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-[2000]">
            <div className="bg-[#EDEAE6] dark:bg-[#242424] w-full rounded-t-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col border-t border-black/[0.07] dark:border-white/[0.07]">
                <div className="w-12 h-1.5 bg-[#C0BCB6] dark:bg-[#2E2E2E] rounded-full mx-auto mb-5" />
                <h3 className="text-[17px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{s.clienteNombre}</h3>
                <p className="text-[11px] text-[#A8A29E] font-bold mb-5 uppercase">📍 {s.sedeNombre} · {s.fecha}</p>
                <div className="overflow-y-auto flex-1 mb-5 space-y-3">
                    {s.items?.map((it, idx) => (
                        <div key={idx} className="bg-[#C0BCB6] dark:bg-[#1C1C1C] p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.07]">
                            <div className="flex justify-between mb-2">
                                <span className="font-extrabold text-[#D13A28] dark:text-[#E8422F] text-[13px]">{it.equipoSerial}</span>
                                <M valor={Number(it.costo || 0)} className="font-black text-[#1C1917] dark:text-[#F0EEE9] text-[13px]" />
                            </div>
                            <p className="text-[13px] text-[#57534E] dark:text-[#A8A29E] mb-2">{it.trabajoRealizado}</p>
                            {it.repuestosUsados?.length > 0 && (
                                <p className="text-[11px] text-[#A8A29E] border-t border-black/[0.07] dark:border-white/[0.07] pt-2">
                                    <strong className="text-[#57534E] dark:text-[#9E9A94]">Repuestos: </strong>
                                    {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={onClose}
                    className="w-full py-4 rounded-2xl font-extrabold text-white bg-[#1C1917] dark:bg-[#E8422F]">
                    Cerrar
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsea fecha en formato "DD/MM/YYYY" o "YYYY-MM-DD" para ordenar correctamente
function parseFechaSort(f) {
    if (!f) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
        const [d, m, y] = f.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return new Date(f).getTime() || 0;
}

export default function PresupuestosManager() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [modalDetalle, setModalDetalle] = useState(null);
    // Clave para refrescar nroDoc de localStorage cuando se genera un PDF
    const [pdfKey, setPdfKey] = useState(0);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        try {
            const res  = await api.get('/servicios?page=0&size=1000');
            const data = res.data.content || res.data || [];
            setPresupuestos(Array.isArray(data)
                ? data.filter(s => s.estado === 'PRESUPUESTO')
                      .sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha))
                : []);
        } catch { toast.error('Error al cargar presupuestos'); }
        finally  { setCargando(false); }
    };

    const patchEstado = async (id, estado, msg) => {
        const t = toast.loading('Guardando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado });
            toast.success(msg, { id: t });
            cargar();
        } catch { toast.error('Error', { id: t }); }
    };

    const confirmar = (id) => patchEstado(id, 'REALIZADO',  '¡Cobrado!');
    const rechazar  = (id) => {
        if (!window.confirm('¿Rechazar este presupuesto?')) return;
        patchEstado(id, 'RECHAZADO', 'Rechazado');
    };
    const eliminar = async (id) => {
        if (!window.confirm('⚠️ ¿Eliminar permanentemente?')) return;
        try { await api.delete(`/servicios/${id}`); toast.success('Eliminado'); cargar(); }
        catch { toast.error('Error al eliminar'); }
    };

    const calcularTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

    const generarPDF = useCallback(async (s) => {
        await generarRemitoPDFPremium({
            esPresupuesto: true,
            servicioId:   s.id,
            cliente: {
                nombre:         s.clienteNombre,
                telefono:       s.clienteTelefono,
                email:          s.clienteEmail,
                cuilDni:        s.clienteDni,
                condicionFiscal: s.clienteCondicionIva,
            },
            sede: {
                nombreSede: s.sedeNombre,
                direccion:  s.sedeDireccion,
            },
            tecnico:      localStorage.getItem('tecnico_nombre') || 'Técnico',
            ticketItems:  s.items?.map(it => ({
                ...it,
                totalCalculado:  parseFloat(it.costo)      || 0,
                costoExtra:      parseFloat(it.costoExtra) || 0,
                modeloEquipo:    it.modeloEquipo    || it.equipoModelo    || null,
                ubicacionEquipo: it.ubicacionEquipo || it.equipoUbicacion || null,
                trabajo:         it.trabajo         || it.trabajoRealizado || '',
            })) || [],
            totalFinal:    calcularTotal(s),
            fechaServicio: s.fecha,
            leyenda:       s.observaciones || '',
        });
        // Refrescar para que el nroDoc aparezca en el buscador
        setPdfKey(k => k + 1);
    }, []);

    // Augmentar con nroDocPdf guardado en localStorage al generar cada PDF
    // pdfKey fuerza re-cómputo cuando se genera un nuevo PDF en esta sesión
    const presupuestosConNro = useMemo(() => presupuestos.map(p => ({
        ...p,
        nroDocPdf: localStorage.getItem(`pdf_nro_${p.id}`) || '',
    })), [presupuestos, pdfKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => ({
        total:     presupuestos.reduce((a, p) => a + calcularTotal(p), 0),
        count:     presupuestos.length,
        servicios: presupuestos.filter(p => p.servicioTipo === 'TECNICA').length,
        ventas:    presupuestos.filter(p => p.servicioTipo === 'VENTA').length,
    }), [presupuestos]);

    // campoBusqueda ampliado: nombre, sede, teléfono, observaciones y número de PDF
    const filtros = useFiltros(presupuestosConNro, {
        porPagina: 10, campoFecha: 'fecha',
        campoEstado: 'servicioTipo',
        campoBusqueda: ['clienteNombre', 'sedeNombre', 'clienteTelefono', 'observaciones', 'nroDocPdf'],
    });

    return (
        <div className="min-h-screen bg-[#C8C4BE] dark:bg-[#141414] p-4 pb-28 font-sans transition-colors">

            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-4xl font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-tighter leading-none">
                    Presupuestos
                </h2>
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.3em] mt-1">
                    Pendientes de confirmación
                </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#EDEAE6] dark:bg-[#242424] col-span-3 md:col-span-1 p-5 rounded-2xl border-l-4 border-l-[#D48800] dark:border-l-[#F0A500] border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase">Total pendiente</p>
                    <M valor={stats.total} className="text-2xl font-black text-[#D48800] dark:text-[#F0A500] mt-1 block" />
                    <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">{stats.count} presupuestos</p>
                </div>
                <div className="bg-[#EDEAE6] dark:bg-[#242424] p-5 rounded-2xl border-l-4 border-l-[#D13A28] dark:border-l-[#E8422F] border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase">Servicios</p>
                    <p className="text-2xl font-black text-[#1C1917] dark:text-[#F0EEE9] mt-1">{stats.servicios}</p>
                    <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">técnicos</p>
                </div>
                <div className="bg-[#EDEAE6] dark:bg-[#242424] p-5 rounded-2xl border-l-4 border-l-[#D48800] dark:border-l-[#F0A500] border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase">Ventas</p>
                    <p className="text-2xl font-black text-[#1C1917] dark:text-[#F0EEE9] mt-1">{stats.ventas}</p>
                    <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">insumos</p>
                </div>
            </div>

            <FiltrosPanel hook={filtros} estados={TIPOS_PRESU} conBusqueda conRango />
            <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

            {cargando ? (
                <div className="text-center py-16 text-[#A8A29E] font-bold">⏳ Cargando...</div>
            ) : filtros.itemsPagina.length === 0 ? (
                <div className="text-center py-16 bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[#A8A29E] font-bold">✅ Sin presupuestos pendientes</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtros.itemsPagina.map(s => (
                        <PresupuestoCard
                            key={s.id} s={s}
                            calcularTotal={calcularTotal}
                            onVer={setModalDetalle}
                            onPDF={generarPDF}
                            onCobrar={confirmar}
                            onRechazar={rechazar}
                            onEliminar={eliminar}
                        />
                    ))}
                </div>
            )}

            <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

            {modalDetalle && (
                <ModalDetalle
                    s={modalDetalle}
                    calcularTotal={calcularTotal}
                    onClose={() => setModalDetalle(null)}
                />
            )}
        </div>
    );
}
