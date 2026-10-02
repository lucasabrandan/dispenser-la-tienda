import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuX, LuCircleCheck, LuCircleX, LuHourglass, LuBanknote, LuSend } from 'react-icons/lu';
import api from '../../services/api';
import { getTodayISO } from '../../utils/dateUtils';

// "Cerrar mi día" (2-oct-2026): resumen del día del técnico + rendición de efectivo.
// Visitas de hoy por estado, trabajos cerrados hoy y cuánta plata en efectivo cobró
// (= lo que tiene que entregar). Al enviar le llega al admin como aviso (app + push + WA)
// por el mismo canal que "Avisar al admin" (POST /ordenes/mensaje-admin, máx 1000 caracteres).

const fmt = v => `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const HECHOS = 'COMPLETADO,PENDIENTE_FACTURACION,FACTURADO,COBRADO,REALIZADO';

export default function CerrarDiaSheet({ ordenesHoy = [], onClose }) {
    const hoy = getTodayISO();
    const [servicios, setServicios] = useState(null);
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        // Trae lo cerrado en las últimas semanas y se queda con lo que se completó/cobró HOY
        // (la fecha del servicio puede ser la del presupuesto, no la del trabajo).
        const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        api.get('/servicios', { params: { estado: HECHOS, desde, page: 0, size: 200, sort: 'fechaServicio,desc' } })
            .then(r => {
                const lista = (r.data?.content || []).filter(s =>
                    String(s.fechaCobro || s.fechaCompletado || s.fecha || '').slice(0, 10) === hoy);
                setServicios(lista);
            })
            .catch(() => { setServicios([]); toast.error('No se pudieron traer los trabajos de hoy'); });
    }, [hoy]);

    const visitas = useMemo(() => ({
        completadas: ordenesHoy.filter(o => o.estado === 'COMPLETADA'),
        noAtendidas: ordenesHoy.filter(o => o.estado === 'NO_ATENDIDO'),
        devueltas:   ordenesHoy.filter(o => o.estado === 'CANCELADA'),
        pendientes:  ordenesHoy.filter(o => ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO'].includes(o.estado)),
    }), [ordenesHoy]);

    const efectivo = (servicios || []).filter(s => s.modalidadCobro === 'EFECTIVO_SIN_FACTURA');
    const otros    = (servicios || []).filter(s => s.modalidadCobro !== 'EFECTIVO_SIN_FACTURA');
    const totalEfectivo = efectivo.reduce((a, s) => a + Number(s.montoFinal || 0), 0);

    const armarMensaje = () => {
        const l = [
            `CIERRE DEL DÍA ${hoy.split('-').reverse().join('/')}`,
            `Visitas: ${visitas.completadas.length} hechas · ${visitas.noAtendidas.length} no atendidas · ${visitas.devueltas.length} devueltas · ${visitas.pendientes.length} sin cerrar`,
            `EFECTIVO A RENDIR: ${fmt(totalEfectivo)} (${efectivo.length} trabajo${efectivo.length !== 1 ? 's' : ''})`,
            ...efectivo.slice(0, 8).map(s => `- ${s.clienteNombre || '#' + s.id}: ${fmt(s.montoFinal)}`),
            ...(efectivo.length > 8 ? [`- y ${efectivo.length - 8} más`] : []),
            ...(otros.length ? [`Con factura / a cobrar por admin: ${otros.length}`] : []),
            ...(visitas.pendientes.length ? [`Sin cerrar: ${visitas.pendientes.slice(0, 5).map(o => o.clienteNombre || o.titulo || '#' + o.id).join(', ')}`] : []),
            ...(nota.trim() ? [`Nota: ${nota.trim()}`] : []),
        ];
        return l.join('\n').slice(0, 1000);
    };

    const enviar = async () => {
        setEnviando(true);
        try {
            await api.post('/ordenes/mensaje-admin', { mensaje: armarMensaje() });
            toast.success('Cierre enviado al admin');
            onClose();
        } catch {
            toast.error('No se pudo enviar. Si no tenés señal, probá en un rato.');
        } finally {
            setEnviando(false);
        }
    };

    const Fila = ({ Icon, color, label, n }) => (
        <div className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2 text-caption font-bold text-secondary"><Icon size={14} style={{ color }} />{label}</span>
            <span className="text-body font-black text-ink">{n}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/50" onClick={onClose}>
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-5 bg-card max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-label font-black text-muted uppercase tracking-widest">Cerrar mi día</p>
                        <h3 className="text-body-lg font-black text-ink capitalize">
                            {new Date(hoy + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted active:scale-95"><LuX size={16} /></button>
                </div>

                <div className="p-3.5 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04] mb-3">
                    <Fila Icon={LuCircleCheck} color="#16A34A" label="Visitas hechas" n={visitas.completadas.length} />
                    <Fila Icon={LuCircleX} color="#D13A28" label="No atendidas" n={visitas.noAtendidas.length} />
                    <Fila Icon={LuCircleX} color="#A8A29E" label="Devueltas al admin" n={visitas.devueltas.length} />
                    <Fila Icon={LuHourglass} color="#D48800" label="Sin cerrar" n={visitas.pendientes.length} />
                    {visitas.pendientes.length > 0 && (
                        <p className="text-label text-brand-amber font-bold mt-1">
                            Quedan visitas de hoy abiertas: cerralas o marcá "No atendido" antes de enviar.
                        </p>
                    )}
                </div>

                <div className="p-3.5 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04] mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 text-caption font-black text-ink uppercase"><LuBanknote size={15} />Efectivo a rendir</span>
                        <span className="text-body-lg font-black text-ink">{servicios === null ? '…' : fmt(totalEfectivo)}</span>
                    </div>
                    {servicios !== null && efectivo.length === 0 && (
                        <p className="text-caption text-muted">Hoy no cobraste nada en efectivo.</p>
                    )}
                    {efectivo.map(s => (
                        <div key={s.id} className="flex justify-between text-caption text-secondary py-0.5">
                            <span className="truncate pr-2">{s.clienteNombre || `#${s.id}`}</span>
                            <span className="font-bold shrink-0">{fmt(s.montoFinal)}</span>
                        </div>
                    ))}
                    {otros.length > 0 && (
                        <p className="text-label text-muted mt-2">
                            + {otros.length} trabajo{otros.length !== 1 ? 's' : ''} con factura (los cobra el admin, no se rinden).
                        </p>
                    )}
                </div>

                <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
                    placeholder="Nota para el admin (opcional): repuestos que faltan, algo a revisar..."
                    className="w-full p-3 rounded-xl text-caption outline-none bg-panel text-ink border border-black/[0.05] dark:border-white/[0.05] mb-3" />

                <button onClick={enviar} disabled={enviando || servicios === null}
                    className="w-full h-12 rounded-xl font-black text-label uppercase bg-brand-red text-white active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
                    <LuSend size={15} /> {enviando ? 'Enviando…' : 'Enviar cierre al admin'}
                </button>
            </div>
        </div>
    );
}
