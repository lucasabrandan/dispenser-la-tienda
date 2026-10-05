import React, { useState } from 'react';
import { LuChevronRight, LuChevronDown, LuCircleCheck } from 'react-icons/lu';
import { M } from '../servicio/ServicioUI';

// Bloques chicos del Panel (3-oct-2026, diseño "Panel completo").

// Título de sección con link opcional a la derecha
export function Seccion({ titulo, link, onLink, children }) {
    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-caption font-bold text-muted">{titulo}</h3>
                {link && <button type="button" onClick={onLink} className="text-caption font-bold text-muted underline underline-offset-2 hover:text-ink">{link}</button>}
            </div>
            {children}
        </section>
    );
}

// "Para resolver": todas las alertas en un solo lugar, cada una lleva a donde se arregla
export function ParaResolver({ alertas }) {
    if (!alertas.length) {
        return (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-caption text-secondary">
                <LuCircleCheck size={16} className="text-[#16A34A] dark:text-[#4ADE80] shrink-0" /> Nada pendiente. Todo al día.
            </div>
        );
    }
    return (
        <div className="space-y-2">
            {alertas.map(a => (
                <button key={a.id} type="button" onClick={a.onClick}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-left active:scale-[0.99]"
                    style={{ borderLeft: `4px solid ${a.color}` }}>
                    <span className="flex-1 text-body text-ink">{a.texto}</span>
                    <span className="text-caption font-black text-ink underline shrink-0">{a.link}</span>
                </button>
            ))}
        </div>
    );
}

// "Plata": plegado, sin montos a la vista. Al tocar se abren los totales.
export function PlataBlock({ cobranza, onVerTrabajos, onCierreCaja, onFinanzas }) {
    const [abierta, setAbierta] = useState(false);
    const { porCobrar, porFacturar, facturados } = cobranza;
    const resumen = [
        porCobrar.n ? `${porCobrar.n} por cobrar` : null,
        porFacturar.n ? `${porFacturar.n} por facturar` : null,
        facturados.n ? `${facturados.n} esperando pago` : null,
    ].filter(Boolean).join(' · ') || 'Todo cobrado';
    const fila = 'w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-left';
    return (
        <div className="space-y-2">
            <div className="rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
                <button type="button" onClick={() => setAbierta(a => !a)} aria-expanded={abierta}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left">
                    <span className="text-body font-bold text-ink">Cobranza</span>
                    <span className="flex items-center gap-2 text-caption text-muted">
                        {resumen}{abierta ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
                    </span>
                </button>
                {abierta && (
                    <div className="px-3.5 pb-3 space-y-2 border-t border-black/[0.05] dark:border-white/[0.05] pt-3">
                        {[['Hecho, falta cobrar', porCobrar], ['Hecho, falta facturar', porFacturar], ['Facturado, esperando pago', facturados]].map(([t, v]) => (
                            <div key={t} className="flex items-center justify-between text-caption">
                                <span className="text-secondary">{t} <span className="text-muted">({v.n})</span></span>
                                <M valor={v.total} className="font-black text-ink" />
                            </div>
                        ))}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onVerTrabajos} className="text-caption font-bold text-secondary underline">Ver en Trabajos</button>
                            <button type="button" onClick={onFinanzas} className="text-caption font-bold text-secondary underline">Finanzas</button>
                        </div>
                    </div>
                )}
            </div>
            <button type="button" onClick={onCierreCaja} className={fila}>
                <span className="text-body font-bold text-ink">Cierre de caja de hoy</span>
                <span className="flex items-center gap-1 text-caption text-muted">Hacer cierre <LuChevronRight size={16} /></span>
            </button>
        </div>
    );
}
