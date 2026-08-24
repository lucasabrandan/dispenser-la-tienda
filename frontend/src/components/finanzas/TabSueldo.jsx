import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useMontos } from '../../context/MontosContext';
import { formatearPrecio, formatearPrecioCompacto } from '../../utils/formatearPrecio';
import { MESES_ES } from '../../utils/dateUtils';
import { useTheme } from '../../hooks/useTheme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export default function TabSueldo({ filtroMes, setFiltroMes }) {
    const { usuario, esAdmin } = useAuth();
    const { ocultar } = useMontos();
    const { isDark } = useTheme();
    // Recharts dibuja SVG puro — las clases dark: de Tailwind no le llegan,
    // así que estos colores hay que resolverlos a mano según el tema activo
    // (antes quedaba fijo en rojo oscuro incluso en modo claro).
    const colorVerde = isDark ? '#4ADE80' : '#16A34A';
    const colorAmbar = isDark ? '#F0A500' : '#D48800';
    const colorRojo = isDark ? '#E8422F' : '#D13A28';
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [editandoMeta, setEditandoMeta] = useState(false);
    const [metaInput, setMetaInput] = useState('');
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Admin puede ver el sueldo de cualquier usuario
    useEffect(() => {
        if (esAdmin) {
            api.get('/admin/usuarios').then(r => setUsuarios(r.data?.filter(u => u.activo) || [])).catch(() => {});
        }
    }, [esAdmin]);

    const uid = selectedUserId || usuario?.id;

    const cargar = () => {
        if (!uid) return;
        setCargando(true);
        api.get(`/servicios/stats/sueldo?usuarioId=${uid}&mes=${filtroMes}&isAdmin=${esAdmin && uid === usuario?.id}`)
            .then(r => {
                setData(r.data);
                setMetaInput(r.data?.sueldoObjetivo || '');
            })
            .catch(() => setData(null))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [filtroMes, uid]); // eslint-disable-line

    const guardarMeta = () => {
        const val = parseFloat(metaInput);
        if (isNaN(val) || val < 0) return;
        // Admin puede editar sueldo de cualquiera, técnico solo el suyo
        const url = esAdmin
            ? `/admin/usuarios/${uid}/sueldo-objetivo`
            : '/auth/mi-sueldo-objetivo';
        api.patch(url, { sueldoObjetivo: val })
            .then(() => {
                setEditandoMeta(false);
                if (uid === usuario?.id) {
                    const u = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
                    u.sueldoObjetivo = val;
                    localStorage.setItem('auth_usuario', JSON.stringify(u));
                }
                cargar();
            })
            .catch(() => {});
    };

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(Math.round(Number(v || 0)))}`;
    const fmtCompacto = v => ocultar ? '••••' : `$${formatearPrecioCompacto(Math.round(Number(v || 0)))}`;

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;
    if (!data) return <p className="text-center text-[#A8A29E] py-12">Sin datos disponibles</p>;

    const objetivo = Number(data.sueldoObjetivo || 0);
    const acumulado = Number(data.totalAcumulado || 0);
    const porcentaje = Math.min(data.porcentajeProgreso || 0, 100);
    const superoMeta = acumulado >= objetivo && objetivo > 0;
    const verEmpresa = esAdmin && uid === usuario?.id;

    // Datos para evolución
    const chartData = (data.evolucion || []).map(e => {
        const mesLabel = e.mes.substring(5); // MM de YYYY-MM
        return {
            mes: MESES_ES[parseInt(mesLabel)] || mesLabel,
            Acumulado: Math.round(Number(e.acumulado || 0)),
            Objetivo: Math.round(Number(e.objetivo || 0)),
            Resultado: Math.round(Number(e.resultadoEmpresa || 0)),
            trabajos: e.totalTrabajos,
        };
    });

    return (
        <div className="space-y-4">
            {/* Controles */}
            <div className="flex gap-2 flex-wrap items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                {esAdmin && usuarios.length > 1 && (
                    <select value={selectedUserId || ''} onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                        className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <option value="">Mi sueldo</option>
                        {usuarios.filter(u => u.id !== usuario?.id).map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Meta de sueldo */}
            <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 border-[0.5px] border-black/[0.07] dark:border-white/[0.07]">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">
                        Sueldo objetivo — {data.usuarioNombre}
                    </p>
                    {(esAdmin || uid === usuario?.id) && (
                        <button onClick={() => setEditandoMeta(!editandoMeta)}
                            className="text-[10px] font-bold text-[#D48800] dark:text-[#F0A500] active:scale-95">
                            {editandoMeta ? 'Cancelar' : 'Editar'}
                        </button>
                    )}
                </div>

                {editandoMeta ? (
                    <div className="flex gap-2 items-center">
                        <span className="text-[14px] font-black text-[#A8A29E]">$</span>
                        <input type="text" inputMode="decimal" value={metaInput} onChange={e => setMetaInput(e.target.value)}
                            placeholder="1200000"
                            className="flex-1 h-9 px-3 rounded-lg text-[14px] font-bold outline-none bg-[#F5F3F1] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]" />
                        <button onClick={guardarMeta}
                            className="h-9 px-4 rounded-lg font-bold text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                            Guardar
                        </button>
                    </div>
                ) : (
                    <>
                        {objetivo > 0 ? (
                            <>
                                {/* Barra de progreso */}
                                <div className="relative h-5 rounded-full bg-[#E8E5E0] dark:bg-[#2E2E2E] overflow-hidden mb-2">
                                    <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${superoMeta
                                            ? 'bg-gradient-to-r from-[#16A34A] to-[#22C55E]'
                                            : 'bg-gradient-to-r from-[#D48800] to-[#F0A500]'
                                        }`}
                                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                    />
                                    <p className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                                        {ocultar ? '••••' : `${Math.round(porcentaje)}%`}
                                    </p>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <p className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{fmt(acumulado)}</p>
                                    <p className="text-[12px] font-bold text-[#A8A29E]">de {fmt(objetivo)}</p>
                                </div>
                                <p className={`text-[11px] font-bold mt-1 ${superoMeta
                                        ? 'text-[#16A34A]'
                                        : 'text-[#D48800] dark:text-[#F0A500]'
                                    }`}>
                                    {ocultar ? '••••' : superoMeta
                                        ? `Meta superada por ${fmt(acumulado - objetivo)}`
                                        : `Faltan ${fmt(Number(data.faltante || 0))}`
                                    }
                                </p>
                            </>
                        ) : (
                            <p className="text-[12px] text-[#A8A29E] text-center py-3">
                                No hay meta configurada. Toca "Editar" para definir tu sueldo objetivo.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Desglose de ingresos */}
            <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 border-[0.5px] border-black/[0.07] dark:border-white/[0.07]">
                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">Desglose del mes</p>
                {[
                    verEmpresa && { label: `Servicios propios (${data.cantServiciosPropios})`, valor: data.ingresoServiciosPropios, sub: '100% ganancia neta' },
                    verEmpresa && { label: `Servicios técnicos (${data.cantServiciosTecnicos})`, valor: data.ingresoServiciosTecnicos, sub: '50% parte empresa' },
                    !verEmpresa && { label: `Mis servicios (${data.cantServiciosPropios})`, valor: data.ingresoServiciosPropios, sub: '50% ganancia neta' },
                    verEmpresa && { label: `Ventas (${data.cantVentas})`, valor: data.ingresoVentas, sub: '100% ganancia' },
                ].filter(Boolean).map(({ label, valor, sub }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                        <div>
                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">{label}</p>
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase">{sub}</p>
                        </div>
                        <p className="text-[14px] font-black text-[#D48800] dark:text-[#F0A500]">{fmt(valor)}</p>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-1">
                    <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">= Total acumulado</p>
                    <p className="text-[18px] font-black text-[#D48800] dark:text-[#F0A500]">{fmt(acumulado)}</p>
                </div>
            </div>

            {/* Resultado empresa (solo admin viendo su propio sueldo) */}
            {verEmpresa && objetivo > 0 && (
                <div className={`rounded-2xl p-4 border-[0.5px] ${Number(data.resultadoEmpresa) >= 0
                        ? 'bg-[#16A34A]/5 border-[#16A34A]/20'
                        : 'bg-[#D13A28]/5 border-[#D13A28]/20'
                    }`}>
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">Resultado empresa</p>
                    {[
                        { label: 'Total acumulado',   valor: acumulado,                   signo: '' },
                        { label: 'Tu sueldo',         valor: objetivo,                    signo: '−' },
                        { label: 'Gastos operativos', valor: Number(data.gastosOperativos || 0), signo: '−' },
                    ].map(({ label, valor, signo }) => (
                        <div key={label} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                            <p className="text-[11px] font-bold text-[#A8A29E]">{signo} {label}</p>
                            <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{fmt(valor)}</p>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-1">
                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">= Balance empresa</p>
                        <p className={`text-[18px] font-black ${Number(data.resultadoEmpresa) >= 0
                                ? 'text-[#16A34A]'
                                : 'text-[#D13A28] dark:text-[#E8422F]'
                            }`}>
                            {ocultar ? '••••' : `${Number(data.resultadoEmpresa) >= 0 ? '+' : ''}${fmt(data.resultadoEmpresa)}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Evolución mensual */}
            {chartData.length > 1 && (
                <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 border-[0.5px] border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">Evolución mensual</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#A8A29E' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#A8A29E' }} width={55}
                                tickFormatter={v => `$${formatearPrecioCompacto(v)}`} />
                            <Tooltip
                                formatter={(v, name) => [`$${formatearPrecio(v)}`, name]}
                                labelFormatter={l => l}
                                contentStyle={{ fontSize: 11 }}
                            />
                            <Bar dataKey="Acumulado" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.Acumulado >= entry.Objetivo ? colorVerde : colorAmbar} />
                                ))}
                            </Bar>
                            {objetivo > 0 && (
                                <ReferenceLine y={objetivo} stroke={colorRojo} strokeDasharray="6 3" strokeWidth={2}
                                    label={{ value: 'Meta', position: 'right', fontSize: 9, fill: colorRojo }} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabla evolución */}
            {(data.evolucion || []).length > 0 && (
                <div className="rounded-2xl overflow-x-auto bg-white dark:bg-[#242424] border-[0.5px] border-black/[0.07] dark:border-white/[0.07]">
                    <div className="min-w-[400px]">
                        <div className={`grid px-4 py-2 bg-[#EFEDEA] dark:bg-[#1C1C1C] ${verEmpresa ? 'grid-cols-[1fr_80px_80px_80px_50px]' : 'grid-cols-[1fr_90px_90px_50px]'}`}>
                            {['Mes', 'Acumulado', verEmpresa && 'Empresa', 'Meta', 'Trab.'].filter(Boolean).map(h => (
                                <p key={h} className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider text-center first:text-left">{h}</p>
                            ))}
                        </div>
                        {(data.evolucion || []).map((e, i) => {
                            const acum = Number(e.acumulado || 0);
                            const obj = Number(e.objetivo || 0);
                            const ok = obj > 0 && acum >= obj;
                            const mesLabel = MESES_ES[parseInt(e.mes.substring(5))] + ' ' + e.mes.substring(0, 4);
                            return (
                                <div key={e.mes}
                                    className={`grid px-4 py-3 items-center ${verEmpresa ? 'grid-cols-[1fr_80px_80px_80px_50px]' : 'grid-cols-[1fr_90px_90px_50px]'} ${i < data.evolucion.length - 1 ? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
                                    <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{mesLabel}</p>
                                    <p className={`text-[12px] font-black text-right ${ok ? 'text-[#16A34A]' : 'text-[#D48800] dark:text-[#F0A500]'}`}>
                                        {fmtCompacto(acum)}
                                    </p>
                                    {verEmpresa && (
                                        <p className={`text-[12px] font-black text-right ${Number(e.resultadoEmpresa) >= 0 ? 'text-[#16A34A]' : 'text-[#D13A28] dark:text-[#E8422F]'}`}>
                                            {fmtCompacto(e.resultadoEmpresa)}
                                        </p>
                                    )}
                                    <p className="text-[11px] font-bold text-[#A8A29E] text-right">{fmtCompacto(obj)}</p>
                                    <p className="text-[11px] font-bold text-[#A8A29E] text-center">{e.totalTrabajos}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <p className="text-[10px] text-[#A8A29E] text-center pb-2">
                {verEmpresa
                    ? 'Tu sueldo = servicios propios (100%) + parte empresa técnicos (50%) + ventas. Resultado = acumulado − sueldo − gastos.'
                    : 'Tu parte = 50% de ganancia neta (facturado − 30% imp − repuestos) de tus servicios cobrados.'
                }
            </p>
        </div>
    );
}
