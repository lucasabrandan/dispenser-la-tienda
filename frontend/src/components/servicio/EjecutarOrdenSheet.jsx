/**
 * EjecutarOrdenSheet
 * Vista simplificada para tecnicos al ejecutar un presupuesto asignado.
 * Flujo: detalle → firmas → ¿te pagó? → resumen
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { enviarOEncolar } from '../../utils/pendientesOffline';
import { useAuth } from '../../context/AuthContext';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import PasoDetalle from './ejecutar/PasoDetalle';
import PasoFirmas from './ejecutar/PasoFirmas';
import PasoCobro from './ejecutar/PasoCobro';
import PasoResumenEjecutar from './ejecutar/PasoResumenEjecutar';

const PASOS = ['detalle', 'firmas', 'cobro', 'resumen'];
const fmt = v => `$${Math.round(Number(v) || 0).toLocaleString('es-AR')}`;

export default function EjecutarOrdenSheet({ servicio, onGuardado, onConfirmado, onCerrar }) {
    const { usuario } = useAuth();

    const [paso, setPaso] = useState('detalle');
    const [resumenGanancias, setResumenGanancias] = useState(null);
    const [observaciones, setObservaciones] = useState(servicio.observaciones || '');
    const [repuestosAgregados, setRepuestosAgregados] = useState([]);
    const [repuestosDisponibles, setRepuestosDisponibles] = useState([]);
    const [sheetRepuestosOpen, setSheetRepuestosOpen] = useState(false);
    const [firmaTecnico, setFirmaTecnico] = useState(null);
    const [editandoFirma, setEditandoFirma] = useState(false);
    const [firmaCliente, setFirmaCliente] = useState(null);
    const [incluirFirmas, setIncluirFirmas] = useState(true);
    const [procesando, setProcesando] = useState(false);
    // "¿Te pagó?" (4-oct-2026): NO / EFECTIVO / TRANSFERENCIA. El precio sale del
    // presupuesto que armó el admin; el técnico ya no recalcula ni ajusta mano de obra.
    const [pago, setPago] = useState(null);
    const [monto, setMonto] = useState(0);
    const [descuentoEfectivo, setDescuentoEfectivo] = useState(0);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoFirma(true);
        } catch {}
        api.get('/repuestos', { params: { size: 1000 } })
            .then(r => setRepuestosDisponibles(r.data?.content || r.data || []))
            .catch(() => {});
        api.get('/configuracion')
            .then(r => setDescuentoEfectivo(Number(r.data?.descuentoEfectivo) || 0))
            .catch(() => {});
    }, []);

    // Total = lo presupuestado (ítems, con descuento) + los repuestos que agregó en el lugar
    const repuestosNuevos = repuestosAgregados.reduce((s, r) => s + (parseFloat(r.precio) || 0) * (r.cantidad || 1), 0);
    const totalItems = (servicio.items || []).reduce((s, it) => s + Number(it.costo || 0), 0);
    const desc = Number(servicio.descuentoPorcentaje || 0);
    const total = Math.round(totalItems * (1 - desc / 100) + repuestosNuevos);
    // Productos a precio de venta (los pone el negocio): no entran en el reparto
    const totalProductos = (servicio.items || []).reduce((s, it) =>
        s + (it.repuestosUsados || []).reduce((a, r) => a + Number(r.subtotal ?? (Number(r.precio || 0) * Number(r.cantidad || 1))), 0), 0) + repuestosNuevos;

    const guardarFirma = async () => {
        if (!firmaTecnico) return;
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            api.patch('/auth/mi-firma', { firma: firmaTecnico }).catch(() => {});
            setEditandoFirma(false);
        } catch {}
    };

    const confirmar = async () => {
        if (!usuario?.id) { toast.error('No se pudo identificar tu usuario. Cerra sesion y volve a entrar.'); return; }
        if (!pago) { toast.error('Decinos si te pagó'); return; }
        setProcesando(true);
        const loading = toast.loading('Confirmando trabajo...');
        try {
            const itemsActualizados = (servicio.items || []).map((it, i) => ({
                equipoSerial: it.equipoSerial || 'MOSTRADOR',
                tecnico: it.tecnico || usuario?.nombre || 'Tecnico',
                costo: Number(it.costo || 0), costoExtra: Number(it.costoExtra || 0),
                metodoPago: it.metodoPago || 'EFECTIVO',
                trabajoRealizado: it.trabajoRealizado || '',
                trabajoTipo: it.trabajoTipo || 'REPARACION',
                garantiaHasta: it.garantiaHasta || null,
                fotoAntes: it.fotoAntes || null, fotoDespues: it.fotoDespues || null,
                repuestosUsados: i === 0
                    ? [...(it.repuestosUsados || []), ...repuestosAgregados]
                    : (it.repuestosUsados || []),
            }));
            // NO → queda COMPLETADO para que el admin defina el cobro.
            // EFECTIVO → COBRADO sin factura, el monto va a su cierre del día.
            // TRANSFERENCIA → COMPLETADO + nota, el admin confirma que entró la plata.
            const efectivo = pago === 'EFECTIVO';
            const nuevoEstado = efectivo ? 'COBRADO' : 'COMPLETADO';
            const notaTransf = pago === 'TRANSFERENCIA'
                ? `Pagó por transferencia ${fmt(monto)} — verificar` : '';
            const obsFinal = [observaciones, notaTransf].filter(Boolean).join('\n');
            const envio = await enviarOEncolar('put', `/servicios/${servicio.id}`, {
                sedeId: servicio.sedeId, usuarioId: usuario?.id || servicio.usuarioId,
                fecha: servicio.fecha, servicioTipo: servicio.servicioTipo || 'TECNICA',
                estado: nuevoEstado, clienteNombre: servicio.clienteNombre,
                sedeNombre: servicio.sedeNombre, descuentoPorcentaje: servicio.descuentoPorcentaje || 0,
                observaciones: obsFinal, items: itemsActualizados,
                ...(efectivo ? { modalidadCobro: 'EFECTIVO_SIN_FACTURA', montoFinal: Number(monto) || total } : {}),
            }, `Trabajo ${servicio.clienteNombre || ''} #${servicio.id}`);
            if (envio.encolado) toast('Sin señal: el trabajo quedó guardado en el celular y se manda solo', { id: loading, icon: '📶', duration: 6000 });
            else toast.success('Trabajo confirmado', { id: loading });

            // La orden se completa apenas se guarda el trabajo (no al tocar "Listo")
            if (onGuardado) { try { await onGuardado(); } catch {} }
            setResumenGanancias({ pago, monto: Number(monto) || 0, total, totalProductos });

            try {
                const ticketItems = itemsActualizados.map(it => ({
                    ...it, totalCalculado: it.costo, trabajo: it.trabajoRealizado,
                }));
                await generarRemitoPDFPremium({
                    esPresupuesto: false, servicioId: servicio.id,
                    nroDocumentoExistente: servicio.nroDocumento || localStorage.getItem(`pdf_nro_${servicio.id}`) || null,
                    cliente: { nombre: servicio.clienteNombre, telefono: servicio.clienteTelefono, email: servicio.clienteEmail, cuilDni: servicio.clienteDni, condicionIva: servicio.clienteCondicionIva },
                    sede: { nombreSede: servicio.sedeNombre, direccion: servicio.sedeDireccion },
                    tecnico: usuario?.nombre || localStorage.getItem('tecnico_nombre') || 'Tecnico',
                    ticketItems, fechaServicio: servicio.fecha,
                    descuentoPorcentaje: servicio.descuentoPorcentaje || 0, leyenda: obsFinal,
                    esTecnicoForzado: true,
                    firmaTecnico: incluirFirmas ? (firmaTecnico || null) : null,
                    firmaCliente: incluirFirmas ? (firmaCliente || null) : null, incluirFirmas,
                });
            } catch (pdfErr) {
                console.warn('PDF no generado:', pdfErr);
                toast('Trabajo guardado. PDF no disponible', { icon: '⚠️' });
            }
            setPaso('resumen');
        } catch (e) {
            const detalle = e?.response?.data?.mensaje || e?.response?.data?.message || e?.message || '';
            toast.error(`Error al confirmar${detalle ? ': ' + detalle : ''}`, { id: loading });
        } finally { setProcesando(false); }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-page">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 bg-panel border-b border-black/[0.08]">
                <div className="flex items-center gap-3">
                    <button onClick={onCerrar}
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-chip text-secondary active:scale-90">
                        ←
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-title font-black text-ink leading-none">Cerrar trabajo</h2>
                        <p className="text-caption text-muted truncate mt-0.5">{servicio.clienteNombre} · {servicio.sedeNombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-label font-black text-muted uppercase tracking-wider">Total</p>
                        <p className="text-title font-black leading-none text-ink">{fmt(total)}</p>
                    </div>
                </div>
                <div className="flex gap-1 mt-3">
                    {PASOS.slice(0, 3).map((s, i) => (
                        <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= PASOS.indexOf(paso) ? 'bg-brand-red' : 'bg-chip'}`} />
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
                {paso === 'detalle' && (
                    <PasoDetalle
                        servicio={servicio} observaciones={observaciones} setObservaciones={setObservaciones}
                        repuestosAgregados={repuestosAgregados} setRepuestosAgregados={setRepuestosAgregados}
                        repuestosDisponibles={repuestosDisponibles}
                        sheetRepuestosOpen={sheetRepuestosOpen} setSheetRepuestosOpen={setSheetRepuestosOpen}
                        onNext={() => setPaso('firmas')}
                    />
                )}
                {paso === 'firmas' && (
                    <PasoFirmas
                        firmaTecnico={firmaTecnico} setFirmaTecnico={setFirmaTecnico}
                        editandoFirma={editandoFirma} setEditandoFirma={setEditandoFirma}
                        firmaCliente={firmaCliente} setFirmaCliente={setFirmaCliente}
                        incluirFirmas={incluirFirmas} setIncluirFirmas={setIncluirFirmas}
                        guardarFirma={guardarFirma}
                        onBack={() => setPaso('detalle')} onNext={() => setPaso('cobro')}
                    />
                )}
                {paso === 'cobro' && (
                    <PasoCobro
                        total={total} descuentoEfectivo={descuentoEfectivo}
                        pago={pago} setPago={setPago} monto={monto} setMonto={setMonto}
                        procesando={procesando}
                        onBack={() => setPaso('firmas')} onConfirmar={confirmar}
                    />
                )}
                {paso === 'resumen' && resumenGanancias && (
                    <PasoResumenEjecutar resumenGanancias={resumenGanancias} onConfirmado={onConfirmado} />
                )}
            </div>
        </div>
    );
}
