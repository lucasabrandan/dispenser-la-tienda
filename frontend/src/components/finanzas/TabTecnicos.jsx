import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useMontos } from '../../context/MontosContext';
import { formatearPrecio, formatearPrecioCompacto } from '../../utils/formatearPrecio';
import { generarPDFRendimientoTecnicos } from '../../utils/pdf/rendimientoTecnicos';
import Paginacion from '../ui/Paginacion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { colorTecnico } from '../../utils/estados';
import AvatarTecnico from '../ui/AvatarTecnico';
import Liquidacion from './Liquidacion';
import InformeTecnicoModal from './InformeTecnicoModal';
import { LuFileText } from 'react-icons/lu';

export default function TabTecnicos({ filtroMes }) {
    const { ocultar } = useMontos();
    const [datos,      setDatos]      = useState([]);
    const [cargando,   setCargando]   = useState(false);
    const [filtroTec,  setFiltroTec]  = useState('');
    const [liqDe,      setLiqDe]      = useState(null); // técnico cuya liquidación se abre
    const [informe,    setInforme]    = useState(false); // informe por técnico (9-oct-2026)

    const cargar = () => {
        setCargando(true);
        api.get(`/servicios/rendimiento/mes-actual?mes=${filtroMes}`)
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [filtroMes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;

    const tecnicoOpciones = datos.map(d => ({ id: d.tecnicoId, nombre: d.tecnicoNombre }));
    const datosFiltrados = filtroTec
        ? datos.filter(d => String(d.tecnicoId) === filtroTec)
        : datos;

    const totFact  = datosFiltrados.reduce((s, d) => s + Number(d.totalFacturado || 0), 0);
    const totParte = datosFiltrados.reduce((s, d) => s + Number(d.parteTecnico   || 0), 0);
    const totTrab  = datosFiltrados.reduce((s, d) => s + (d.cantidadTrabajos || 0), 0);

    if (cargando) return <p className="text-center text-muted py-12">Cargando...</p>;

    return (
        <div className="space-y-5">
            <div className="flex gap-2 flex-wrap items-center">
                <select value={filtroTec} onChange={e => setFiltroTec(e.target.value)}
                    className="h-8 px-2 rounded-lg text-label font-bold outline-none bg-card text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <option value="">Todos los técnicos</option>
                    {tecnicoOpciones.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>
                <button type="button" onClick={() => setInforme(true)}
                    className="h-8 px-3 rounded-lg text-label font-black bg-brand-red text-white inline-flex items-center gap-1.5 active:scale-95">
                    <LuFileText size={13} /> Informe de trabajos
                </button>
            </div>
            {informe && <InformeTecnicoModal tecnicoInicial={filtroTec || null} onCerrar={() => setInforme(false)} />}

            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Trabajos',         valor: totTrab,        gold: false },
                    { label: 'Facturado',         valor: fmt(totFact),   gold: false },
                    { label: 'A pagar técnicos',  valor: fmt(totParte),  gold: true  },
                ].map(({ label, valor, gold }) => (
                    <div key={label} className="rounded-2xl bg-card p-3 text-center border-[0.5px] border-black/[0.07]">
                        <p className="text-label font-black text-muted uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-body-lg font-black ${gold ? 'text-brand-amber' : 'text-ink'}`}>{valor}</p>
                    </div>
                ))}
            </div>

            {datosFiltrados.length > 1 && (
                <div className="rounded-xl bg-card p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <p className="text-label font-bold text-muted uppercase tracking-wider mb-2">Comparación</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={datosFiltrados.map(d => ({
                            nombre: d.tecnicoNombre.split(' ')[0],
                            Facturado: Math.round(d.totalFacturado),
                            'Su parte': Math.round(d.parteTecnico),
                        }))}>
                            <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#A8A29E' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#A8A29E' }} width={50}
                                tickFormatter={v => `$${formatearPrecioCompacto(v)}`} />
                            <Tooltip formatter={(v) => `$${formatearPrecio(v)}`} />
                            <Bar dataKey="Facturado" fill="#D48800" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Su parte" fill="#16A34A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {datosFiltrados.length === 0 ? (
                <p className="text-center text-muted py-12">Sin trabajos para este período</p>
            ) : (
                <div className="rounded-2xl overflow-x-auto bg-card border-[0.5px] border-black/[0.07]">
                    <div className="min-w-[480px]">
                        <div className="grid grid-cols-[minmax(120px,1fr)_60px_90px_90px_90px] px-4 py-2 bg-panel">
                            {['Técnico','Trab.','Facturado','Repuestos','Su parte'].map(h => (
                                <p key={h} className="text-label font-black text-muted uppercase tracking-wider text-center first:text-left">{h}</p>
                            ))}
                        </div>
                        {datosFiltrados.map((d, i) => (
                            <div key={d.tecnicoId} role="button" tabIndex={0} onClick={() => setLiqDe(d)}
                                onKeyDown={e => { if (e.key === 'Enter') setLiqDe(d); }}
                                className={`cursor-pointer active:bg-chip grid grid-cols-[minmax(120px,1fr)_60px_90px_90px_90px] px-4 py-3 items-center ${i < datosFiltrados.length - 1 ? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
                                <p className="text-body font-black text-ink truncate pr-2 flex items-center gap-2"><AvatarTecnico nombre={d.tecnicoNombre} size={22} />{d.tecnicoNombre}</p>
                                <p className="text-body font-bold text-muted text-center">{d.cantidadTrabajos}</p>
                                <p className="text-body font-bold text-ink text-right">{fmt(d.totalFacturado)}</p>
                                <p className="text-body font-bold text-brand-red text-right">{fmt(d.totalRepuestos)}</p>
                                <p className="text-body font-black text-brand-amber text-right">{fmt(d.parteTecnico)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {datosFiltrados.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={() => generarPDFRendimientoTecnicos({ datos: datosFiltrados, periodo: filtroMes })}
                        className="h-8 px-4 rounded-lg font-bold text-label uppercase text-white bg-brand-red active:scale-95">
                        Exportar PDF
                    </button>
                </div>
            )}
            <p className="text-caption text-muted text-center">
                Neto = cobrado − productos − impuestos (solo con factura) · Su parte = 50% · Tocá un técnico para ver su liquidación
            </p>

            {liqDe && (
                <div className="fixed inset-0 z-[2000] flex flex-col bg-page">
                    <div className="shrink-0 px-4 pt-4 pb-3 bg-panel border-b border-black/[0.08] flex items-center gap-3">
                        <button onClick={() => setLiqDe(null)} aria-label="Volver"
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-chip text-secondary active:scale-90">←</button>
                        <h2 className="text-title font-black text-ink">Liquidación · {liqDe.tecnicoNombre}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 pb-10 max-w-2xl w-full mx-auto">
                        <Liquidacion tecnicoId={liqDe.tecnicoId} mesInicial={filtroMes} esAdmin />
                    </div>
                </div>
            )}
        </div>
    );
}
