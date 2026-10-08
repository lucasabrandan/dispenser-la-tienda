import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuFileText, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import api from '../../services/api';
import { generarPDFCierreMensual, nombreMes, rangoTramo } from '../../utils/pdf/cierreMensual';

// Cierre mensual por cliente con tarifa por volumen (2-oct-2026, pensado para MODO AGUA).
// Arriba: tramos de precio del cliente (MO por equipo, sin IVA). Abajo: mes → cálculo → PDF.

const fmt = v => `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const mesActual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const INPUT = 'h-9 px-2 rounded-lg text-body font-bold outline-none bg-panel text-ink border border-black/[0.05] dark:border-white/[0.05] w-full';
const LABEL = 'block text-label font-black text-muted uppercase tracking-widest mb-1.5';

export default function CierreMensualModal({ cliente, onClose }) {
    const [tramos, setTramos] = useState([]);
    const [tramosDirty, setTramosDirty] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mes, setMes] = useState(mesActual());
    const [cierre, setCierre] = useState(null);
    const [calculando, setCalculando] = useState(false);
    const [factura, setFactura] = useState('');
    const [marcando, setMarcando] = useState(false);
    // Lo que respondió la empresa en su portal sobre el resumen de ese mes (8-oct-2026)
    const [aprob, setAprob] = useState(null);
    useEffect(() => {
        setAprob(null);
        if (!mes) return;
        api.get('/pedidos-empresa/aprobacion', { params: { clienteId: cliente.id, mes } }).then(r => setAprob(r.data?.estado ? r.data : null)).catch(() => {});
    }, [mes, cliente.id]);

    useEffect(() => {
        api.get(`/clientes/${cliente.id}/tarifa-volumen`)
            .then(r => setTramos((r.data || []).map(t => ({ desde: String(t.desde), precio: String(t.precio) }))))
            .catch(() => toast.error('No se pudo leer la tarifa del cliente'));
    }, [cliente.id]);

    const cambiarTramo = (i, campo, valor) => {
        setTramos(ts => ts.map((t, k) => k === i ? { ...t, [campo]: valor.replace(/[^0-9]/g, '') } : t));
        setTramosDirty(true);
    };
    const agregarTramo = () => {
        setTramos(ts => [...ts, { desde: ts.length ? '' : '0', precio: '' }]);
        setTramosDirty(true);
    };
    const quitarTramo = (i) => {
        setTramos(ts => ts.filter((_, k) => k !== i));
        setTramosDirty(true);
    };

    const guardarTramos = async () => {
        const payload = tramos
            .filter(t => t.desde !== '' && t.precio !== '')
            .map(t => ({ desde: Number(t.desde), precio: Number(t.precio) }));
        if (payload.length && !payload.some(t => t.desde === 0)) {
            toast.error('El primer tramo tiene que arrancar en 0 equipos');
            return false;
        }
        setGuardando(true);
        try {
            const r = await api.put(`/clientes/${cliente.id}/tarifa-volumen`, payload);
            setTramos((r.data || []).map(t => ({ desde: String(t.desde), precio: String(t.precio) })));
            setTramosDirty(false);
            toast.success('Tarifa guardada');
            return true;
        } catch {
            toast.error('No se pudo guardar la tarifa');
            return false;
        } finally {
            setGuardando(false);
        }
    };

    const calcular = async () => {
        if (tramosDirty && !(await guardarTramos())) return;
        setCalculando(true);
        try {
            const r = await api.get(`/clientes/${cliente.id}/cierre-mensual`, { params: { mes } });
            setCierre(r.data);
        } catch {
            toast.error('No se pudo calcular el cierre');
        } finally {
            setCalculando(false);
        }
    };

    // Estados de los servicios del cierre (uno por servicio, no por equipo)
    const estados = (() => {
        if (!cierre) return null;
        const porServ = {};
        cierre.filas.forEach(f => { porServ[f.servicioId] = f.estado; });
        const v = Object.values(porServ);
        return {
            sinFacturar: v.filter(e => e === 'COMPLETADO' || e === 'PENDIENTE_FACTURACION').length,
            facturados: v.filter(e => e === 'FACTURADO').length,
            cobrados: v.filter(e => e === 'COBRADO' || e === 'REALIZADO').length,
        };
    })();

    const marcar = async (estado) => {
        setMarcando(true);
        try {
            const r = await api.post(`/clientes/${cliente.id}/cierre-mensual/marcar`, { estado, factura }, { params: { mes } });
            toast.success(`${r.data.actualizados} servicio(s) marcados como ${estado === 'FACTURADO' ? 'facturados' : 'cobrados'}`);
            await calcular();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo actualizar');
        } finally {
            setMarcando(false);
        }
    };

    // Siguiente tramo (aviso interno, no sale en el PDF)
    const siguiente = cierre?.tramos?.find(t => t.desde > cierre.cantidadEquipos);

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[199] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-end md:items-center justify-center z-[200] p-0 md:p-4 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
                <div className="bg-card w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl p-5 max-h-[calc(var(--vh,1vh)*92)] overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-label font-black text-muted uppercase tracking-widest">Cierre mensual</p>
                            <h3 className="text-body-lg font-black text-ink">{cliente.nombre}</h3>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted active:scale-95">
                            <LuX size={16} />
                        </button>
                    </div>

                    {/* Tarifa por volumen */}
                    <label className={LABEL}>Tarifa por volumen (mano de obra por equipo, sin IVA)</label>
                    <div className="space-y-1.5 mb-2">
                        {tramos.map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="text-caption text-muted shrink-0 w-12">Desde</span>
                                <input inputMode="numeric" value={t.desde} onChange={e => cambiarTramo(i, 'desde', e.target.value)}
                                    className={INPUT + ' !w-16 text-center'} placeholder="0" />
                                <span className="text-caption text-muted shrink-0">eq. →  $</span>
                                <input inputMode="numeric" value={t.precio} onChange={e => cambiarTramo(i, 'precio', e.target.value)}
                                    className={INPUT} placeholder="33000" />
                                <button onClick={() => quitarTramo(i)} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-muted bg-chip active:scale-95">
                                    <LuTrash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {tramos.length === 0 && (
                            <p className="text-caption text-muted">Este cliente no tiene tarifa por volumen. Agregá los tramos (el primero desde 0).</p>
                        )}
                    </div>
                    <div className="flex gap-1.5 mb-5">
                        <button onClick={agregarTramo}
                            className="h-8 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95 flex items-center gap-1">
                            <LuPlus size={13} /> Tramo
                        </button>
                        {tramosDirty && (
                            <button onClick={guardarTramos} disabled={guardando}
                                className="h-8 px-3 rounded-lg font-bold text-label bg-ink text-page active:scale-95">
                                {guardando ? 'Guardando…' : 'Guardar tarifa'}
                            </button>
                        )}
                    </div>

                    {/* Mes + cálculo */}
                    <label className={LABEL}>Mes</label>
                    <div className="flex gap-1.5 mb-4">
                        <input type="month" value={mes} onChange={e => { setMes(e.target.value); setCierre(null); }} className={INPUT} />
                        <button onClick={calcular} disabled={calculando || !mes}
                            className="h-9 px-4 shrink-0 rounded-lg font-black text-label uppercase bg-brand-red text-white active:scale-95">
                            {calculando ? 'Calculando…' : 'Calcular'}
                        </button>
                    </div>

                    {aprob && (
                        <div className={`p-3 rounded-xl text-caption ${aprob.estado === 'APROBADO' ? 'bg-[rgba(22,163,74,0.1)] text-[#16A34A]' : 'bg-[rgba(201,52,31,0.1)] text-brand-red'}`}>
                            <p className="font-black">{aprob.estado === 'APROBADO' ? '✓ La empresa aprobó el resumen de este mes' : `⚠️ La empresa observó el resumen${aprob.observados?.length ? ` (${aprob.observados.length} renglón${aprob.observados.length !== 1 ? 'es' : ''})` : ''}`}</p>
                            {aprob.comentario && <p className="text-ink mt-0.5">{aprob.comentario}</p>}
                            <p className="text-muted mt-0.5">{aprob.usuario}{aprob.fecha ? ` · ${new Date(aprob.fecha).toLocaleDateString('es-AR')}` : ''}</p>
                        </div>
                    )}
                    {cierre && (
                        <div className="rounded-2xl bg-panel p-4 space-y-1.5">
                            <p className="text-caption font-black text-ink">
                                {nombreMes(cierre.mes)}: {cierre.cantidadEquipos} equipos en {cierre.cantidadServicios} visitas
                            </p>
                            {cierre.tramoAplicado ? (
                                <p className="text-caption text-muted">
                                    Tramo {rangoTramo(cierre.tramos, cierre.tramoAplicado)} → {fmt(cierre.precioUnitario)} + IVA por equipo
                                    {siguiente && ` · faltan ${siguiente.desde - cierre.cantidadEquipos} para el tramo de ${fmt(siguiente.precio)}`}
                                </p>
                            ) : (
                                <p className="text-caption font-bold text-brand-red">Sin tarifa cargada: la mano de obra sale en $0.</p>
                            )}
                            <div className="pt-2 space-y-1 text-caption">
                                {[
                                    ['Mano de obra', cierre.manoDeObra],
                                    ['Repuestos (sin IVA)', cierre.repuestosNeto],
                                    ['Subtotal', cierre.subtotal],
                                    ['IVA 21%', cierre.iva],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between text-secondary"><span>{l}</span><span className="font-bold">{fmt(v)}</span></div>
                                ))}
                                <div className="flex justify-between pt-1.5 border-t border-black/10 dark:border-white/10 text-body font-black text-ink">
                                    <span>Total a facturar</span><span>{fmt(cierre.total)}</span>
                                </div>
                            </div>
                            {cierre.cantidadEquipos > 0 && cierre.filas.some(f => !f.serie) && (
                                <p className="text-caption text-brand-amber font-bold pt-1">
                                    {cierre.filas.filter(f => !f.serie).length} equipo(s) sin N° de serie cargado.
                                </p>
                            )}
                            <button onClick={() => generarPDFCierreMensual(cierre)} disabled={cierre.cantidadEquipos === 0}
                                className="w-full mt-3 h-11 rounded-xl font-black text-label uppercase bg-ink text-page active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
                                <LuFileText size={15} /> Descargar PDF
                            </button>

                            {estados && cierre.cantidadEquipos > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 space-y-2">
                                    <p className="text-caption text-secondary">
                                        Servicios: <b>{estados.sinFacturar}</b> sin facturar · <b>{estados.facturados}</b> facturados · <b>{estados.cobrados}</b> cobrados
                                    </p>
                                    {estados.sinFacturar > 0 && (
                                        <div className="flex gap-1.5">
                                            <input value={factura} onChange={e => setFactura(e.target.value)} placeholder="N° de factura (opcional)" className={INPUT} />
                                            <button onClick={() => marcar('FACTURADO')} disabled={marcando || !cierre.precioUnitario}
                                                className="h-9 px-3 shrink-0 rounded-lg font-black text-label uppercase bg-[#6366F1] text-white active:scale-95 disabled:opacity-40">
                                                Facturado
                                            </button>
                                        </div>
                                    )}
                                    {(estados.facturados > 0 || estados.sinFacturar > 0) && (
                                        <button onClick={() => marcar('COBRADO')} disabled={marcando}
                                            className="w-full h-10 rounded-xl font-black text-label uppercase bg-[#16A34A] text-white active:scale-95 disabled:opacity-40">
                                            Marcar todo como cobrado
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
