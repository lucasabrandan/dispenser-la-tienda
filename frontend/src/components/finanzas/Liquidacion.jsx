import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useMontos } from '../../context/MontosContext';
import { formatMesLargo, getTodayISO } from '../../utils/dateUtils';
import { generarPDFLiquidacion } from '../../utils/pdf/liquidacion';
import CuentasMes from './CuentasMes';

// Liquidación mensual del técnico/socio (4-oct-2026).
// La ven el admin (Finanzas → Técnicos) y el técnico (Mi mes) con los mismos números.
// Por trabajo cobrado: cobrado − productos − impuestos (solo con factura) = neto → 50%.
const fmt = v => `$${Math.round(Number(v) || 0).toLocaleString('es-AR')}`;
const fechaCorta = f => (f ? f.split('-').reverse().slice(0, 2).join('/') : '');
const moverMes = (mes, d) => {
    const [y, m] = mes.split('-').map(Number);
    const f = new Date(y, m - 1 + d, 1);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
};

function Fila({ label, valor, fuerte, menos, ocultar }) {
    return (
        <div className="flex justify-between text-body">
            <span className={fuerte ? 'font-black text-ink' : 'text-secondary'}>{label}</span>
            <span className={fuerte ? 'font-black text-ink' : 'text-ink'}>{ocultar ? '••••' : `${menos && Number(valor) > 0 ? '− ' : ''}${fmt(valor)}`}</span>
        </div>
    );
}

function Trabajo({ t, ocultar, pct }) {
    const [abierto, setAbierto] = useState(false);
    const m = v => (ocultar ? '••••' : fmt(v));
    return (
        <button type="button" onClick={() => setAbierto(a => !a)}
            className="w-full text-left px-4 py-3 border-b last:border-b-0 border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-start gap-3">
                <span className="text-caption font-bold text-muted w-10 shrink-0 pt-0.5">{fechaCorta(t.fecha)}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-body font-black text-ink truncate">{t.cliente}</p>
                    <p className="text-caption text-muted truncate">{t.detalle} · {t.cobro}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-body font-black text-brand-amber">{m(t.parteTecnico)}</p>
                    <p className="text-caption text-muted">de {m(t.cobrado)}</p>
                </div>
            </div>
            {abierto && !ocultar && (
                <div className="mt-2 ml-[52px] rounded-xl bg-chip px-3 py-2 space-y-1">
                    <Fila label="Cobrado" valor={t.cobrado} />
                    {Number(t.productos) > 0 && <Fila label="Productos" valor={t.productos} menos />}
                    {Number(t.impuestos) > 0 && <Fila label="Impuestos (con factura)" valor={t.impuestos} menos />}
                    <Fila label="Mano de obra neta" valor={t.neto} fuerte />
                    <Fila label={`Parte ${pct}%`} valor={t.parteTecnico} fuerte />
                </div>
            )}
        </button>
    );
}

export default function Liquidacion({ tecnicoId, mesInicial, esAdmin = false, onMes }) {
    const { ocultar } = useMontos();
    const [mes, setMes] = useState(mesInicial || getTodayISO().slice(0, 7));
    const [data, setData] = useState(null); // { base, cuentas, movimientos, cierre }
    const liq = data?.base;
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        setCargando(true);
        api.get('/liquidacion', { params: { mes, ...(tecnicoId ? { tecnicoId } : {}) } })
            .then(r => setData(r.data))
            .catch(() => setData(null))
            .finally(() => setCargando(false));
        if (onMes) onMes(mes);
    }, [mes, tecnicoId]); // eslint-disable-line react-hooks/exhaustive-deps

    const m = v => (ocultar ? '••••' : fmt(v));
    const nombre = liq?.tecnicoNombre?.split(' ')[0] || '';

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <button onClick={() => setMes(x => moverMes(x, -1))} aria-label="Mes anterior"
                    className="w-9 h-9 rounded-xl bg-chip text-ink font-black active:scale-90">‹</button>
                <p className="text-body-lg font-black text-ink capitalize">{formatMesLargo(mes)}</p>
                <button onClick={() => setMes(x => moverMes(x, 1))} aria-label="Mes siguiente"
                    className="w-9 h-9 rounded-xl bg-chip text-ink font-black active:scale-90">›</button>
            </div>

            {cargando && <p className="text-center text-muted py-8">Cargando...</p>}
            {!cargando && !liq && <p className="text-center text-muted py-8">No se pudo cargar la liquidación</p>}

            {!cargando && liq && (
                <>
                    {/* Resumen del mes */}
                    <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06] dark:border-white/[0.06]">
                        <div className="px-4 py-3 space-y-1.5">
                            <Fila label={`Cobrado (${liq.trabajos.length} trabajos)`} valor={liq.totalCobrado} ocultar={ocultar} />
                            <Fila label="Productos (los pone DLT)" valor={liq.totalProductos} ocultar={ocultar} menos />
                            <Fila label={`Impuestos ${liq.porcentajeImpuestos}% (solo con factura)`} valor={liq.totalImpuestos} ocultar={ocultar} menos />
                            <Fila label="Mano de obra neta" valor={liq.totalNeto} ocultar={ocultar} fuerte />
                        </div>
                        <div className="grid grid-cols-2 border-t border-[#D48800]/20">
                            <div className="px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10">
                                <p className="text-label font-black text-brand-amber uppercase tracking-wide">
                                    {esAdmin ? `Parte ${nombre}` : 'Tu parte'} {liq.porcentajeTecnico}%
                                </p>
                                <p className="text-[22px] font-black text-brand-amber leading-tight">{m(liq.parteTecnico)}</p>
                            </div>
                            <div className="px-4 py-3 bg-panel">
                                <p className="text-label font-black text-muted uppercase tracking-wide">Parte DLT {100 - liq.porcentajeTecnico}%</p>
                                <p className="text-[22px] font-black text-ink leading-tight">{m(liq.parteNegocio)}</p>
                            </div>
                        </div>
                    </div>

                    <CuentasMes data={data} esAdmin={esAdmin} tecnicoId={liq.tecnicoId} mes={mes} nombre={nombre}
                        ocultar={ocultar} onCambio={setData} />

                    {/* Trabajos cobrados */}
                    {liq.trabajos.length > 0 ? (
                        <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06] dark:border-white/[0.06]">
                            <p className="px-4 pt-3 pb-1 text-label font-black text-muted uppercase tracking-widest">Trabajos cobrados · tocá para ver el detalle</p>
                            {liq.trabajos.map(t => <Trabajo key={t.servicioId} t={t} ocultar={ocultar} pct={liq.porcentajeTecnico} />)}
                        </div>
                    ) : (
                        <p className="text-center text-muted py-4">Sin trabajos cobrados este mes</p>
                    )}

                    {/* Pendientes de cobro: no suman todavía */}
                    {liq.pendientes.length > 0 && (
                        <div className="rounded-2xl bg-card border border-dashed border-black/[0.12] dark:border-white/[0.12] px-4 py-3">
                            <p className="text-label font-black text-muted uppercase tracking-widest mb-1">Pendientes de cobro · todavía no suman</p>
                            {liq.pendientes.map(p => (
                                <div key={p.servicioId} className="flex justify-between gap-3 py-1 text-body">
                                    <span className="text-secondary truncate">{fechaCorta(p.fecha)} · {p.cliente}{p.estado === 'ARCHIVADO_SIN_DATO' ? ' · archivado, ¿se cobró?' : ''}</span>
                                    <span className="text-ink shrink-0">{m(p.monto)}</span>
                                </div>
                            ))}
                            {liq.pendientes.some(p => p.estado === 'ARCHIVADO_SIN_DATO') && (
                                <p className="pt-1.5 text-caption text-muted">Los archivados sin dato de cobro se marcan en «Informe de trabajos» (¿Quién cobró?) y pasan a sumar.</p>
                            )}
                        </div>
                    )}

                    <button onClick={() => generarPDFLiquidacion(liq, data)} disabled={liq.trabajos.length === 0 && liq.pendientes.length === 0}
                        className="w-full py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-[0.98] disabled:opacity-40">
                        Exportar PDF
                    </button>
                    <p className="text-caption text-muted text-center px-2">
                        Solo trabajos asignados desde la app y ya cobrados. Los productos van a precio de venta; el impuesto se descuenta solo si el trabajo se facturó.
                    </p>
                </>
            )}
        </div>
    );
}
