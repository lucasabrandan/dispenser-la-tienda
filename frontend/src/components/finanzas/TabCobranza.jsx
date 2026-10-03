import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useMontos } from '../../context/MontosContext';
import { formatearPrecio } from '../../utils/formatearPrecio';
import StatCard from './StatCard';

// Finanzas › Cobranza (3-oct-2026): todo lo hecho que falta facturar o cobrar,
// y quién debe hace más tiempo. Es en tiempo real (no depende del mes elegido).
const total = (s) => Number(s.montoFinal) > 0 ? Number(s.montoFinal)
    : (s.items || []).reduce((a, i) => a + Number(i.costo || 0), 0);
const dias = (f) => f ? Math.max(0, Math.floor((Date.now() - new Date(String(f).slice(0, 10) + 'T00:00:00').getTime()) / 86400000)) : 0;
const ETAPA = {
    COMPLETADO:            { label: 'Hecho · falta cobrar',   color: '#2DD4BF' },
    PENDIENTE_FACTURACION: { label: 'Hecho · falta facturar', color: '#2DD4BF' },
    FACTURADO:             { label: 'Facturado',              color: '#818CF8' },
};

export default function TabCobranza() {
    const { ocultar } = useMontos();
    const [lista, setLista] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        api.get('/servicios', { params: { estado: 'COMPLETADO,PENDIENTE_FACTURACION,FACTURADO', page: 0, size: 500, sort: 'fechaServicio,asc' } })
            .then(r => setLista(r.data?.content || r.data || []))
            .catch(() => toast.error('No se pudo cargar la cobranza'))
            .finally(() => setCargando(false));
    }, []);

    const fmt = (v) => (ocultar ? '••••' : `$${formatearPrecio(Math.round(v))}`);

    const { paraFacturar, sinCobrar, deudores, masVieja } = useMemo(() => {
        const desde = (s) => s.estado === 'FACTURADO' ? (s.fechaFacturacion || s.fecha) : (s.fechaCompletado || s.fecha);
        const paraFacturar = lista.filter(s => s.estado === 'PENDIENTE_FACTURACION').reduce((a, s) => a + total(s), 0);
        const sinCobrar = lista.filter(s => s.estado !== 'PENDIENTE_FACTURACION').reduce((a, s) => a + total(s), 0);
        const m = new Map();
        lista.forEach(s => {
            const k = s.clienteId || s.clienteNombre;
            if (!m.has(k)) m.set(k, { cliente: s.clienteNombre || '—', total: 0, dias: 0, items: [] });
            const g = m.get(k);
            const d = dias(desde(s));
            g.total += total(s); g.dias = Math.max(g.dias, d);
            g.items.push({ s, d });
        });
        const deudores = [...m.values()].sort((a, b) => b.dias - a.dias || b.total - a.total);
        return { paraFacturar, sinCobrar, deudores, masVieja: deudores[0] || null };
    }, [lista]);

    if (cargando) return <div className="h-40 rounded-2xl bg-card animate-pulse" />;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard label="Para facturar" value={paraFacturar} sub="Hecho, sin factura" variante="gold" ocultar={ocultar} />
                <StatCard label="Sin cobrar" value={sinCobrar} sub="Hecho o facturado" variante="red" ocultar={ocultar} />
                <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-[1.5rem] border bg-card border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-label font-black uppercase text-muted tracking-widest mb-2">Deuda más vieja</p>
                    {masVieja ? (<>
                        <p className="text-lg sm:text-2xl font-black text-ink">{masVieja.dias} días</p>
                        <p className="text-label font-bold text-muted uppercase mt-1 truncate">{masVieja.cliente}</p>
                    </>) : <p className="text-body font-bold text-muted">Nadie debe nada</p>}
                </div>
            </div>

            {deudores.length > 0 && (
                <div className="bg-card rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                    <div className="px-5 py-3 bg-panel">
                        <p className="text-label font-black text-muted uppercase tracking-wider">Quién debe · lo más viejo arriba</p>
                    </div>
                    {deudores.map(g => (
                        <details key={g.cliente} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                            <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer list-none">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-body font-black text-ink truncate">{g.cliente}</span>
                                    <span className="block text-caption text-muted">{g.items.length} trabajo{g.items.length !== 1 ? 's' : ''}</span>
                                </span>
                                <span className={`text-label font-black px-2 py-0.5 rounded-full shrink-0 ${g.dias > 30 ? 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#3B1111] dark:text-[#F87171]' : g.dias > 7 ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2A1A0A] dark:text-[#FBBF24]' : 'bg-chip text-muted'}`}>
                                    {g.dias} días
                                </span>
                                <span className="text-body font-black text-ink shrink-0">{fmt(g.total)}</span>
                            </summary>
                            <div className="px-5 pb-3 space-y-1.5">
                                {g.items.map(({ s, d }) => (
                                    <div key={s.id} className="flex items-center gap-2 text-caption">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ETAPA[s.estado]?.color }} />
                                        <span className="flex-1 min-w-0 truncate text-secondary">#{s.id} · {ETAPA[s.estado]?.label} · hace {d} días</span>
                                        <span className="font-bold text-ink">{fmt(total(s))}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
}
