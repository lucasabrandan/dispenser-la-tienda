import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuX, LuLock, LuLockOpen, LuCheck } from 'react-icons/lu';
import api from '../../services/api';
import { fechaAR } from '../../utils/dateUtils';

// Cuentas del mes y cierre (5-oct-2026). Saldo = su parte − efectivo de DLT que
// tiene en mano − lo que ya se le pagó. El admin registra pagos/entregas y cierra
// el mes (queda congelado); el técnico dice "Estoy de acuerdo".
const fmt = v => `$${Math.round(Math.abs(Number(v) || 0)).toLocaleString('es-AR')}`;

function Linea({ label, valor, signo = '', fuerte, ocultar }) {
    return (
        <div className="flex justify-between text-body">
            <span className={fuerte ? 'font-black text-ink' : 'text-secondary'}>{label}</span>
            <span className={fuerte ? 'font-black text-ink' : 'text-ink'}>{ocultar ? '••••' : `${Number(valor) ? signo : ''}${fmt(valor)}`}</span>
        </div>
    );
}

export default function CuentasMes({ data, esAdmin, tecnicoId, mes, nombre, ocultar, onCambio }) {
    const { cuentas: c, movimientos, cierre } = data;
    const [form, setForm] = useState(null); // null | 'PAGO' | 'ENTREGA'
    const [monto, setMonto] = useState('');
    const [nota, setNota] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [confirmarCierre, setConfirmarCierre] = useState(false);

    const llamar = async (fn, ok) => {
        setOcupado(true);
        try { const r = await fn(); onCambio(r.data); if (ok) toast.success(ok); }
        catch (e) { toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo guardar'); }
        finally { setOcupado(false); }
    };
    const guardarMov = () => {
        const n = Number(String(monto).replace(/[^\d]/g, ''));
        if (!n) { toast.error('Poné el monto'); return; }
        llamar(() => api.post('/liquidacion/movimientos', { tecnicoId, mes, tipo: form, monto: n, nota }), 'Registrado')
            .then(() => { setForm(null); setMonto(''); setNota(''); });
    };

    const saldo = Number(c.saldo) || 0;
    const textoSaldo = saldo > 0 ? (esAdmin ? `DLT le debe a ${nombre}` : 'DLT te debe')
        : saldo < 0 ? (esAdmin ? `${nombre} le debe a DLT` : 'Le debés a DLT') : 'Cuentas saldadas';

    return (
        <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06] dark:border-white/[0.06]">
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <p className="text-label font-black text-muted uppercase tracking-widest">Cuentas del mes</p>
                {cierre.cerrado && (
                    <span className="inline-flex items-center gap-1 text-label font-black text-muted"><LuLock size={12} /> Cerrado {fechaAR(String(cierre.cerradoEn).slice(0, 10))}</span>
                )}
            </div>
            <div className="px-4 py-2 space-y-1.5">
                <Linea label={esAdmin ? `Parte de ${nombre}` : 'Tu parte'} valor={c.parteTecnico} ocultar={ocultar} />
                {Number(c.efectivoCobrado) > 0 && (
                    <>
                        <Linea label={esAdmin ? `Efectivo de DLT que cobró ${nombre}` : 'Efectivo de DLT que cobraste'} valor={c.efectivoCobrado} signo="− " ocultar={ocultar} />
                        {Number(c.rendido) > 0 && <Linea label="Ya rendido (cierres del día recibidos)" valor={c.rendido} signo="+ " ocultar={ocultar} />}
                        {Number(c.entregado) > 0 && <Linea label="Otras entregas a DLT" valor={c.entregado} signo="+ " ocultar={ocultar} />}
                    </>
                )}
                {Number(c.pagado) > 0 && <Linea label={esAdmin ? `Ya le pagaste` : 'Ya te pagaron'} valor={c.pagado} signo="− " ocultar={ocultar} />}
            </div>
            <div className={`px-4 py-3 flex items-center justify-between border-t ${saldo === 0 ? 'border-black/[0.06] dark:border-white/[0.06]' : 'border-[#D48800]/20 bg-[#D48800]/10 dark:bg-[#F0A500]/10'}`}>
                <p className={`text-label font-black uppercase tracking-wide ${saldo === 0 ? 'text-muted' : 'text-brand-amber'}`}>{textoSaldo}</p>
                <p className={`text-[22px] font-black leading-tight ${saldo === 0 ? 'text-ink' : 'text-brand-amber'}`}>{ocultar ? '••••' : fmt(saldo)}</p>
            </div>

            {movimientos.length > 0 && (
                <div className="px-4 py-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
                    {movimientos.map(mv => (
                        <div key={mv.id} className="flex items-center gap-2 text-caption">
                            <span className="text-muted w-12 shrink-0">{fechaAR(mv.fecha).slice(0, 5)}</span>
                            <span className="flex-1 text-secondary truncate">{mv.tipo === 'PAGO' ? `Pago a ${esAdmin ? nombre : 'vos'}` : 'Entrega a DLT'}{mv.nota ? ` · ${mv.nota}` : ''}</span>
                            <span className="font-bold text-ink">{ocultar ? '••••' : fmt(mv.monto)}</span>
                            {esAdmin && !cierre.cerrado && (
                                <button onClick={() => llamar(() => api.delete(`/liquidacion/movimientos/${mv.id}`))} aria-label="Quitar"
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-muted active:bg-chip"><LuX size={12} /></button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Admin: registrar pagos/entregas y cerrar */}
            {esAdmin && !cierre.cerrado && (
                <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                    {form ? (
                        <div className="space-y-2">
                            <p className="text-caption font-bold text-ink">{form === 'PAGO' ? `Le pagaste a ${nombre}` : `${nombre} te entregó efectivo`}</p>
                            <div className="flex gap-2">
                                <input value={monto} onChange={e => setMonto(e.target.value)} placeholder="$" inputMode="numeric" autoFocus
                                    className="w-32 shrink-0 h-10 px-3 rounded-xl bg-chip text-ink text-body font-bold outline-none text-right" />
                                <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)"
                                    className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-chip text-ink text-body outline-none placeholder:text-muted" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setForm(null)} className="flex-1 h-10 rounded-xl bg-chip text-secondary text-label font-black uppercase">Cancelar</button>
                                <button onClick={guardarMov} disabled={ocupado} className="flex-[2] h-10 rounded-xl bg-brand-red text-white text-label font-black uppercase disabled:opacity-50">Guardar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => { setForm('PAGO'); if (saldo > 0) setMonto(String(Math.round(saldo))); }}
                                className="h-10 rounded-xl bg-chip text-ink text-label font-bold active:scale-95">Registrar pago</button>
                            <button onClick={() => { setForm('ENTREGA'); if (saldo < 0) setMonto(String(Math.round(-saldo))); }}
                                className="h-10 rounded-xl bg-chip text-ink text-label font-bold active:scale-95">Me entregó efectivo</button>
                        </div>
                    )}
                    {!form && (
                        <button onClick={() => confirmarCierre ? llamar(() => api.post('/liquidacion/cerrar', { tecnicoId, mes }), 'Mes cerrado') : setConfirmarCierre(true)}
                            disabled={ocupado}
                            className={`w-full h-11 rounded-xl text-label font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 ${confirmarCierre ? 'bg-brand-red text-white' : 'bg-ink text-page'}`}>
                            <LuLock size={14} /> {confirmarCierre ? '¿Seguro? Los números quedan fijos' : 'Cerrar el mes'}
                        </button>
                    )}
                </div>
            )}
            {esAdmin && cierre.cerrado && (
                <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <span className="text-caption text-muted">{cierre.aceptadoEn ? `✓ ${nombre} estuvo de acuerdo` : `Esperando que ${nombre} lo acepte`}</span>
                    <button onClick={() => llamar(() => api.post('/liquidacion/reabrir', { tecnicoId, mes }), 'Mes reabierto')}
                        className="h-9 px-3 rounded-xl bg-chip text-secondary text-label font-bold flex items-center gap-1 shrink-0"><LuLockOpen size={13} /> Reabrir</button>
                </div>
            )}

            {/* Técnico: aceptar el cierre */}
            {!esAdmin && cierre.cerrado && (
                <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    {cierre.aceptadoEn ? (
                        <p className="text-caption text-muted flex items-center gap-1"><LuCheck size={13} /> Estuviste de acuerdo el {fechaAR(String(cierre.aceptadoEn).slice(0, 10))}</p>
                    ) : (
                        <button onClick={() => llamar(() => api.post('/liquidacion/aceptar', { mes }), 'Listo')} disabled={ocupado}
                            className="w-full h-11 rounded-xl bg-[color:var(--etapa-listo)] text-white text-label font-black uppercase active:scale-95">
                            Revisé los números, estoy de acuerdo
                        </button>
                    )}
                </div>
            )}
            {!esAdmin && !cierre.cerrado && (
                <p className="px-4 py-2 border-t border-black/[0.06] dark:border-white/[0.06] text-caption text-muted">El mes sigue abierto: los números pueden cambiar hasta que el admin lo cierre.</p>
            )}
        </div>
    );
}
