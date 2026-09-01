import React, { useState, useEffect } from 'react';
import { Label, BackBtn, M, DSCard } from './ServicioUI';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { getTodayISO } from '../../utils/dateUtils';
import DateInput from '../ui/DateInput';

const QUICK_PCTS = [5, 10];

// ── Panel de rentabilidad discreta ────────────────────────────────────────────
function RentabilidadPanel({ resumen, desglose, onEditarCosto }) {
    const [abierto, setAbierto] = useState(false);
    if (resumen.gananciaBruta <= 0) return null;

    return (
        <div>
            <button onClick={() => setAbierto(!abierto)}
                className="w-full flex items-center justify-between py-2 px-0 transition-all active:scale-[0.99] dark:hidden">
                <span className="text-label font-semibold tracking-wide text-[#A8855A]">Ver rentabilidad del ticket</span>
                <span className={`text-label text-[#A8855A] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
            </button>
            <button onClick={() => setAbierto(!abierto)}
                className="hidden dark:flex items-center gap-2 py-2 px-0 transition-all active:scale-[0.99]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200 ${abierto ? 'bg-[#5DD68F]' : 'bg-[#5C5954]'}`} />
                <span className={`text-label font-medium transition-colors duration-200 ${abierto ? 'text-[#9E9A94]' : 'text-[#5C5954]'}`}>
                    rentabilidad del ticket
                </span>
            </button>

            {abierto && (
                <>
                    <div className="dark:hidden mt-1 rounded-xl overflow-hidden border border-[#A8855A]/20">
                        <div className="p-3 bg-[#FFF4D6]/60">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {[
                                    { label: 'Venta',    val: resumen.totalVenta,    green: false },
                                    { label: 'Costo',    val: resumen.totalCosto,    green: false },
                                    { label: 'Ganancia', val: resumen.gananciaBruta, green: true  },
                                    { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#A8855A]/10 rounded-lg px-3 py-2">
                                        <p className="text-label uppercase tracking-wide font-bold text-[#A8855A] mb-1">{item.label}</p>
                                        {item.pct !== undefined
                                            ? <p className="text-body-lg font-black text-[#5C3D00]">{item.pct}%</p>
                                            : <M valor={Math.round(item.val)} className={`text-body-lg font-black ${item.green ? 'text-[#5C3D00]' : 'text-[#1C1917]'}`} />
                                        }
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="flex justify-between text-label text-[#A8855A] mb-1">
                                    <span>Margen</span><span>{resumen.margenFinal}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-[#A8855A]/15 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#C47A00] transition-all"
                                         style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                                </div>
                            </div>
                            {desglose.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[#A8855A]/20">
                                    <p className="text-label uppercase tracking-wide font-bold text-[#A8855A] mb-2">Desglose por repuesto</p>
                                    <div className="space-y-2">
                                        {desglose.map(d => (
                                            <div key={d.key} className="bg-[#A8855A]/10 rounded-lg px-3 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-caption font-bold text-[#1C1917] truncate">{d.repuesto.nombre}</p>
                                                    <p className="text-caption text-[#A8855A] shrink-0">{d.repuesto.cantidad} u.</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-label text-[#A8855A]">Costo</span>
                                                        <input type="text" inputMode="decimal"
                                                            value={d.repuesto.costo ?? ''}
                                                            onChange={e => onEditarCosto(d.itemIdx, d.repIdx, e.target.value)}
                                                            className="w-16 h-7 rounded-md text-center text-caption font-bold bg-white border border-[#A8855A]/30 text-[#1C1917] outline-none focus:border-[#A8855A]" />
                                                    </div>
                                                    <p className="text-caption font-black text-[#5C3D00]">
                                                        <M valor={Math.round(d.ganancia.ganancia)} /> &middot; {d.ganancia.margen}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-caption text-muted mt-2">Solo visible para vos.</p>
                        </div>
                    </div>
                    <div className="hidden dark:block mt-1 rounded-xl p-3 bg-[#0D2E1C] border border-[#2A9D5C]/20">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {[
                                { label: 'Venta',    val: resumen.totalVenta,    green: false },
                                { label: 'Costo',    val: resumen.totalCosto,    green: false },
                                { label: 'Ganancia', val: resumen.gananciaBruta, green: true  },
                                { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                            ].map((item, i) => (
                                <div key={i}>
                                    <p className="text-label uppercase tracking-wide font-bold text-[#5C5954] mb-1">{item.label}</p>
                                    {item.pct !== undefined
                                        ? <p className={`text-body-lg font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`}>{item.pct}%</p>
                                        : <M valor={Math.round(item.val)} className={`text-body-lg font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`} />
                                    }
                                </div>
                            ))}
                        </div>
                        <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#2A9D5C]"
                                 style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                        </div>
                        {desglose.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#2A9D5C]/20">
                                <p className="text-label uppercase tracking-wide font-bold text-[#5C5954] mb-2">Desglose por repuesto</p>
                                <div className="space-y-2">
                                    {desglose.map(d => (
                                        <div key={d.key} className="bg-white/[0.03] rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-caption font-bold text-[#F0EEE9] truncate">{d.repuesto.nombre}</p>
                                                <p className="text-caption text-[#5C5954] shrink-0">{d.repuesto.cantidad} u.</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-label text-[#5C5954]">Costo</span>
                                                    <input type="text" inputMode="decimal"
                                                        value={d.repuesto.costo ?? ''}
                                                        onChange={e => onEditarCosto(d.itemIdx, d.repIdx, e.target.value)}
                                                        className="w-16 h-7 rounded-md text-center text-caption font-bold bg-[#141414] border border-[#2A9D5C]/30 text-[#F0EEE9] outline-none focus:border-[#2A9D5C]" />
                                                </div>
                                                <p className="text-caption font-black text-[#5DD68F]">
                                                    <M valor={Math.round(d.ganancia.ganancia)} /> &middot; {d.ganancia.margen}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoResumen({ hook, onBack, onCerrarTicket, dispararPDF, modoEjecucion = false }) {
    const {
        ticketItems, setTicketItems,
        descuentoPorcentaje, setDescuentoPorcentaje,
        leyenda, setLeyenda,
        calcularGananciaRepuesto, calcularResumenGanancia,
        idEdicion, eliminarItem,
        tecnicoSeleccionado, setTecnicoSeleccionado,
        fechaServicio, setFechaServicio,
        duracionMinutos, setDuracionMinutos,
        aceptaTerminos, setAceptaTerminos,
    } = hook;

    const { esAdmin } = useAuth();
    const [tecnicos,    setTecnicos]    = useState([]);
    const [masOpciones, setMasOpciones] = useState(false);
    const [modoCustom,  setModoCustom]  = useState(false);

    useEffect(() => {
        if (esAdmin) {
            api.get('/admin/usuarios')
                .then(r => setTecnicos((r.data || []).filter(u => u.activo)))
                .catch(() => {});
        }
    }, [esAdmin]);

    // Auto-descuento 10% a partir de 5 equipos (reversible)
    // No aplica en edición (idEdicion) ni ejecución (modoEjecucion) para no pisar descuento existente
    const [descuentoAutoAplicado, setDescuentoAutoAplicado] = useState(!!idEdicion || modoEjecucion);
    useEffect(() => {
        if (idEdicion || modoEjecucion) return; // No auto-aplicar en edición
        if (ticketItems.length >= 5 && descuentoPorcentaje === 0 && !descuentoAutoAplicado) {
            setDescuentoPorcentaje(10);
            setDescuentoAutoAplicado(true);
            toast.success(`10% de descuento aplicado (${ticketItems.length} equipos)`);
        } else if (ticketItems.length < 5 && descuentoAutoAplicado && descuentoPorcentaje === 10) {
            setDescuentoPorcentaje(0);
            setDescuentoAutoAplicado(false);
            toast('Descuento 10% removido (menos de 5 equipos)', { icon: 'ℹ️' });
        }
    }, [ticketItems.length]); // eslint-disable-line

    // Si el descuento actual no está en los chips rápidos, activar modoCustom
    useEffect(() => {
        if (descuentoPorcentaje > 0 && !QUICK_PCTS.includes(descuentoPorcentaje)) {
            setModoCustom(true);
        }
    }, []); // eslint-disable-line

    const resumen        = calcularResumenGanancia();
    // Desglose por repuesto para el panel de rentabilidad (Lucas, 31-ago): antes
    // solo se veían los totales del ticket, no de dónde salían. El costo editado acá
    // se guarda de verdad en ticketItems — no es una simulación — así que al confirmar
    // el presupuesto viaja como el costo real de esa línea (el backend ya lo soporta,
    // ver ítem 25 del roadmap).
    const desglose = ticketItems.flatMap((item, itemIdx) =>
        (item.repuestosUsados || []).map((r, repIdx) => ({
            key: `${itemIdx}-${repIdx}`,
            itemIdx, repIdx,
            repuesto: r,
            ganancia: calcularGananciaRepuesto(r, r.cantidad),
        }))
    );
    const editarCostoRepuesto = (itemIdx, repIdx, valorTexto) => {
        const nuevoCosto = parseFloat(valorTexto) || 0;
        setTicketItems(prev => {
            const copia = [...prev];
            const item = { ...copia[itemIdx] };
            const repuestos = [...(item.repuestosUsados || [])];
            repuestos[repIdx] = { ...repuestos[repIdx], costo: nuevoCosto };
            item.repuestosUsados = repuestos;
            copia[itemIdx] = item;
            return copia;
        });
    };
    const totalBruto     = ticketItems.reduce((a, b) => a + b.totalCalculado, 0);
    const descuentoMonto = Math.round((totalBruto * descuentoPorcentaje) / 100);
    const totalFinal     = totalBruto - descuentoMonto;

    const inputCls = `
        w-full block px-3.5 py-2.5 rounded-xl text-body font-medium outline-none
        bg-[#E8E5E0] dark:bg-[#1C1C1C]
        text-ink
        border border-black/10 dark:border-white/[0.08]
        placeholder-muted
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20
        transition-all resize-none
    `;

    const chipCls = (activo) => `
        h-9 px-3.5 rounded-xl text-label font-black transition-all active:scale-95
        ${activo
            ? 'bg-brand-red text-white'
            : 'bg-chip text-secondary'
        }
    `;

    return (
        <div className="flex flex-col gap-4 px-5 pb-36">

            {/* ── Equipos del ticket ────────────────────────────────────── */}
            <div>
                <Label>Equipos en el ticket</Label>
                <div className="flex flex-col gap-2">
                    {ticketItems.map((it, idx) => (
                        <div key={`${it.equipoSerial || 'eq'}-${idx}`} className="rounded-2xl overflow-hidden bg-panel border border-black/[0.07] dark:border-white/[0.07]">
                            <div className="p-4 flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-black text-body text-brand-red">
                                        {it.equipoSerial && it.equipoSerial !== 'SIN-SN' ? `S/N: ${it.equipoSerial}` : 'Sin S/N'}
                                    </p>
                                    <p className="text-caption mt-1 text-secondary leading-relaxed">
                                        {it.resumenTexto}
                                    </p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="mt-1.5 space-y-0.5">
                                            {it.repuestosUsados.map((r, ri) => {
                                                const g = esAdmin ? calcularGananciaRepuesto(r, r.cantidad) : null;
                                                return (
                                                    <div key={ri} className="flex justify-between text-caption">
                                                        <span className="text-muted">{r.cantidad}x {r.nombre}</span>
                                                        {esAdmin && g?.ganancia > 0 && <span className="text-[#1E8A4A]">+${Math.round(g.ganancia)}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <M valor={it.totalCalculado} className="text-body-lg font-black block text-ink" />
                                    <button onClick={() => eliminarItem(idx)}
                                        className="text-label mt-1 font-bold text-rose-500 hover:text-rose-600">
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Planificación: fecha + duración + técnico ────────────── */}
            <div className="rounded-2xl p-4 bg-panel border border-black/[0.07] dark:border-white/[0.07] space-y-3">
                <p className="text-label font-black text-muted uppercase tracking-widest">Planificación</p>

                {/* Fecha */}
                <div>
                    <Label>Fecha del servicio</Label>
                    <DateInput
                        value={fechaServicio}
                        onChange={setFechaServicio}
                        className={inputCls}
                    />
                    {fechaServicio && fechaServicio !== getTodayISO() && (
                        <div className="flex justify-between mt-1">
                            <span className={`text-label font-bold ${fechaServicio < getTodayISO() ? 'text-amber-500' : 'text-blue-500'}`}>
                                {fechaServicio < getTodayISO() ? 'Carga histórica' : 'Fecha futura'}
                            </span>
                            <button onClick={() => setFechaServicio(getTodayISO())}
                                className="text-label text-muted hover:text-[#D13A28]">
                                Usar hoy
                            </button>
                        </div>
                    )}
                </div>

                {/* Duración */}
                <div>
                    <Label>Duración estimada (opcional)</Label>
                    <div className="flex gap-1.5 flex-wrap">
                        {[60, 90, 120, 180, 240, 300].map(min => (
                            <button key={min} type="button"
                                onClick={() => setDuracionMinutos(duracionMinutos === min ? null : min)}
                                className={`h-8 px-3 rounded-lg text-label font-bold transition-all active:scale-95 ${
                                    duracionMinutos === min
                                        ? 'bg-brand-red text-white'
                                        : 'bg-chip text-secondary'
                                }`}>
                                {min < 60 ? `${min}m` : `${min / 60}h`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Técnico responsable — OBLIGATORIO para admin */}
                {esAdmin && tecnicos.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label>Técnico responsable</Label>
                            {!tecnicoSeleccionado ? (
                                <span className="text-label font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-[#D13A28]">
                                    ⚠ Obligatorio
                                </span>
                            ) : (
                                <span className="text-label font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-[#1F9D55]">
                                    ✓ Asignado
                                </span>
                            )}
                        </div>
                        <select
                            value={tecnicoSeleccionado?.id || ''}
                            onChange={e => {
                                const t = tecnicos.find(u => u.id === Number(e.target.value));
                                setTecnicoSeleccionado(t ? { id: t.id, nombre: t.nombre } : null);
                            }}
                            className={inputCls}
                        >
                            <option value=''>— Seleccionar técnico —</option>
                            {tecnicos.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre} · {t.rol === 'ADMIN' ? 'Admin' : 'Técnico'}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ── Más opciones ──────────────────────────────────────────── */}
            <button onClick={() => setMasOpciones(v => !v)}
                className="flex items-center gap-2 py-1.5 text-label font-black text-muted uppercase tracking-widest transition-all active:scale-[0.98]">
                <span className={`transition-transform duration-200 ${masOpciones ? 'rotate-45' : ''}`}>＋</span>
                <span>Más opciones</span>
            </button>

            {masOpciones && (
                <div className="flex flex-col gap-4">
                    {/* Descuento */}
                    <div>
                        <div className="flex items-center gap-2">
                            <Label>Descuento</Label>
                            {ticketItems.length >= 5 && descuentoPorcentaje === 10 && (
                                <span className="text-label font-bold px-1.5 py-0.5 rounded-full bg-[#D48800]/15 text-brand-amber">
                                    Auto · {ticketItems.length} equipos
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => { setDescuentoPorcentaje(0); setModoCustom(false); }}
                                className={chipCls(descuentoPorcentaje === 0 && !modoCustom)}>Sin descuento</button>
                            {QUICK_PCTS.map(p => (
                                <button key={p} onClick={() => { setDescuentoPorcentaje(p); setModoCustom(false); }}
                                    className={chipCls(descuentoPorcentaje === p && !modoCustom)}>{p}%</button>
                            ))}
                            <button onClick={() => setModoCustom(true)} className={chipCls(modoCustom)}>Otro</button>
                            {modoCustom && (
                                <input type="text" inputMode="decimal" autoFocus
                                    value={descuentoPorcentaje || ''}
                                    onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-20 h-9 rounded-xl text-center font-black text-sm outline-none bg-chip text-ink border border-[#D13A28] focus:ring-2 focus:ring-[#D13A28]/20" />
                            )}
                            {descuentoPorcentaje > 0 && (
                                <span className="text-body font-black text-brand-red ml-1">
                                    -${descuentoMonto.toLocaleString('es-AR')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Rentabilidad — solo admin */}
                    {esAdmin && <RentabilidadPanel resumen={resumen} desglose={desglose} onEditarCosto={editarCostoRepuesto} />}

                    {/* T&C */}
                    <div className="flex items-start gap-3 py-2">
                        <button onClick={() => setAceptaTerminos(!aceptaTerminos)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                                aceptaTerminos ? 'bg-[#16A34A] border-[#16A34A]' : 'border-muted'
                            }`}>
                            {aceptaTerminos && <span className="text-white text-label font-black">✓</span>}
                        </button>
                        <div>
                            <p className="text-body font-bold text-ink leading-tight">
                                Cliente acepta terminos y condiciones
                            </p>
                            <p className="text-caption text-muted mt-0.5 leading-snug">
                                Validez, garantia y condiciones del presupuesto. Se incluyen en el PDF.
                            </p>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <DSCard>
                        <Label>Observaciones (opcional)</Label>
                        <textarea value={leyenda} onChange={e => setLeyenda(e.target.value)}
                            placeholder="Ej: Garantía 90 días sobre MO, 50% adelanto..."
                            rows={3} className={inputCls} />
                        <p className="text-caption mt-1.5 text-muted">Aparece al pie del PDF.</p>
                    </DSCard>
                </div>
            )}

            <BackBtn onClick={onBack} />

            {/* ── Barra fija ────────────────────────────────────────────── */}
            <div className="hide-on-keyboard fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3">
                <div className="p-4 rounded-2xl flex justify-between items-center shadow-2xl bg-[#1C1917] dark:bg-[#0F0F0F] border border-white/[0.06]">
                    <div>
                        <p className="text-label font-bold uppercase tracking-widest text-[#5C5954]">
                            Total
                            {descuentoPorcentaje > 0 && (
                                <span className="text-[#F5796C] ml-1">(-{descuentoPorcentaje}%)</span>
                            )}
                        </p>
                        <M valor={totalFinal} className="text-3xl font-black text-white tracking-tighter block" />
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={esAdmin && tecnicos.length > 0 && !tecnicoSeleccionado}
                            onClick={() => {
                                if (esAdmin && tecnicos.length > 0 && !tecnicoSeleccionado) {
                                    toast.error('⚠ Asigná un técnico antes de continuar', { duration: 3500 });
                                    return;
                                }
                                onCerrarTicket();
                            }}
                            className={`h-11 px-5 rounded-xl font-black text-label text-white active:scale-95 ${esAdmin && tecnicos.length > 0 && !tecnicoSeleccionado ? 'opacity-40 cursor-not-allowed bg-muted' : 'bg-brand-red'}`}>
                            {modoEjecucion ? 'Cerrar trabajo →' : 'Cerrar ticket →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
