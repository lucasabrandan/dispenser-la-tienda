import React, { useEffect, useState } from 'react';
import { LuStar } from 'react-icons/lu';
import api from '../../services/api';

// Indicadores (Portal Empresa, 8-oct-2026): cuánto tardamos en resolver, cuántos
// pedidos y visitas hubo por mes, qué equipos fallan más y la conformidad. Sirve
// para que la empresa justifique el servicio puertas adentro.
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const mesCorto = (m) => MESES[Number(m.split('-')[1]) - 1];
const tiempo = (h) => {
    if (h == null) return '—';
    if (h < 1) return 'menos de 1 h';
    if (h < 48) return `${Math.round(h)} h`;
    return `${Math.round(h / 24)} días`;
};

function Tile({ titulo, valor, nota }) {
    return (
        <div className="p-3.5 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">{titulo}</p>
            <p className="text-2xl font-black text-ink leading-tight">{valor}</p>
            {nota && <p className="text-caption text-muted">{nota}</p>}
        </div>
    );
}

// Barras de un solo dato por mes (una serie: el título la nombra, sin leyenda).
// Hover/toque muestra el valor; el último mes lleva la etiqueta directa.
function BarrasMes({ titulo, datos, campo }) {
    const [activo, setActivo] = useState(null);
    const max = Math.max(1, ...datos.map(d => d[campo]));
    return (
        <div className="p-4 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]">
            <p className="text-label font-black text-ink">{titulo}</p>
            <div className="mt-3 h-36 flex items-end gap-2 border-b border-black/10 dark:border-white/10" role="img"
                aria-label={`${titulo}: ${datos.map(d => `${mesCorto(d.mes)} ${d[campo]}`).join(', ')}`}>
                {datos.map((d, i) => {
                    const v = d[campo];
                    const mostrar = activo === i || (activo == null && i === datos.length - 1);
                    return (
                        <button key={d.mes} type="button" className="relative flex-1 h-full flex items-end justify-center"
                            onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onClick={() => setActivo(a => a === i ? null : i)}
                            aria-label={`${mesCorto(d.mes)}: ${v}`}>
                            {mostrar && <span className="absolute text-caption font-black text-ink" style={{ bottom: `calc(${(v / max) * 100}% + 4px)` }}>{v}</span>}
                            <span className={`w-full max-w-[34px] rounded-t-[4px] transition-opacity ${activo != null && activo !== i ? 'opacity-50' : ''}`}
                                style={{ height: v ? `${Math.max(3, (v / max) * 100)}%` : '2px', background: v ? '#C9341F' : 'var(--chip, rgba(0,0,0,0.1))' }} />
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex gap-2">
                {datos.map(d => <span key={d.mes} className="flex-1 text-center text-[11px] font-bold text-muted">{mesCorto(d.mes)}</span>)}
            </div>
        </div>
    );
}

export default function IndicadoresEmpresa() {
    const [d, setD] = useState(null);
    const [meses, setMeses] = useState(6);
    useEffect(() => { setD(null); api.get('/empresa/indicadores', { params: { meses } }).then(r => setD(r.data)).catch(() => setD({ error: true })); }, [meses]);

    if (!d) return <p className="py-16 text-center text-muted text-body">Cargando…</p>;
    if (d.error) return <p className="py-16 text-center text-muted text-body">No se pudieron cargar los indicadores.</p>;
    const calificados = d.conformes + d.reclamos;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <p className="text-label font-black uppercase tracking-widest text-muted">Últimos</p>
                {[3, 6, 12].map(n => (
                    <button key={n} type="button" onClick={() => setMeses(n)}
                        className={`h-8 px-3 rounded-full text-label font-black ${meses === n ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{n} meses</button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Tile titulo="Pedidos" valor={d.pedidos} nota={`${d.resueltos} resuelto${d.resueltos !== 1 ? 's' : ''}`} />
                <Tile titulo="Tiempo de resolución" valor={tiempo(d.horasPromedio)} nota={d.horasPromedioUrgentes != null ? `Urgentes: ${tiempo(d.horasPromedioUrgentes)}` : 'promedio, desde que lo pedís'} />
                <Tile titulo="Conformidad" valor={calificados ? `${Math.round((d.conformes / calificados) * 100)}%` : '—'} nota={calificados ? `${d.conformes} conforme${d.conformes !== 1 ? 's' : ''} · ${d.reclamos} reclamo${d.reclamos !== 1 ? 's' : ''}` : 'todavía sin respuestas'} />
                <Tile titulo="Calificación" valor={d.calificacionPromedio != null ? <span className="inline-flex items-center gap-1">{d.calificacionPromedio}<LuStar size={20} className="text-[#D48800] fill-[#F0A500]" /></span> : '—'} nota="promedio de 1 a 5" />
            </div>
            <BarrasMes titulo="Visitas por mes" datos={d.porMes} campo="visitas" />
            <BarrasMes titulo="Pedidos por mes" datos={d.porMes} campo="pedidos" />
            <div className="p-4 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-label font-black text-ink">Equipos con más visitas</p>
                {d.equiposConMasVisitas?.length ? (
                    <div className="mt-2 divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {d.equiposConMasVisitas.map(e => (
                            <div key={e.serie} className="py-2 flex items-center gap-2">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-body font-black text-ink">N/S {e.serie}</span>
                                    {e.lugar && <span className="block text-caption text-muted truncate">{e.lugar}</span>}
                                </span>
                                <span className="text-body font-black text-ink">{e.visitas}</span>
                                <span className="text-caption text-muted">visitas</span>
                            </div>
                        ))}
                    </div>
                ) : <p className="mt-1 text-caption text-muted">Ningún equipo se repitió en este período.</p>}
            </div>
        </div>
    );
}
