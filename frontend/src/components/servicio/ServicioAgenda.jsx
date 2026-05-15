import React, { useMemo, useState } from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>······</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getInicioSemana(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Lunes como inicio de semana
    d.setDate(d.getDate() - ((day + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatFecha(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ServicioAgenda({ servicios, onDetalle, onEjecutar, calcularTotal }) {
    const [semanaOffset, setSemanaOffset] = useState(0);

    const inicioSemana = useMemo(() => {
        const hoy = new Date();
        const inicio = getInicioSemana(hoy);
        inicio.setDate(inicio.getDate() + semanaOffset * 7);
        return inicio;
    }, [semanaOffset]);

    // Generar 7 días de la semana
    const diasSemana = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(inicioSemana);
            d.setDate(d.getDate() + i);
            return { date: d, key: formatFecha(d) };
        });
    }, [inicioSemana]);

    // Agrupar servicios por fecha
    const porFecha = useMemo(() => {
        const map = {};
        servicios.forEach(s => {
            const key = s.fecha;
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return map;
    }, [servicios]);

    const hoyKey = formatFecha(new Date());

    // Rango de la semana para el título
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 6);
    const tituloSemana = `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} — ${finSemana.getDate()}/${finSemana.getMonth() + 1}`;

    return (
        <div className="space-y-3">
            {/* Navegación semana */}
            <div className="flex items-center justify-between px-1">
                <button onClick={() => setSemanaOffset(v => v - 1)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#FFFFFF] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]">
                    ←
                </button>
                <div className="text-center">
                    <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{tituloSemana}</p>
                    {semanaOffset !== 0 && (
                        <button onClick={() => setSemanaOffset(0)}
                            className="text-[10px] font-bold text-[#D13A28] dark:text-[#E8422F] mt-0.5">
                            Ir a hoy
                        </button>
                    )}
                </div>
                <button onClick={() => setSemanaOffset(v => v + 1)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#FFFFFF] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08]">
                    →
                </button>
            </div>

            {/* Días */}
            {diasSemana.map(({ date, key }) => {
                const items = porFecha[key] || [];
                const esHoy = key === hoyKey;
                const esPasado = key < hoyKey;

                return (
                    <div key={key} className={`rounded-2xl overflow-hidden border transition-all ${esHoy ? 'border-[#D13A28]/40 dark:border-[#E8422F]/40' : 'border-black/[0.07] dark:border-white/[0.07]'}`}>
                        {/* Header del día */}
                        <div className={`px-4 py-2.5 flex items-center justify-between ${esHoy ? 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10' : 'bg-[#EFEDEA] dark:bg-[#1C1C1C]'}`}>
                            <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-black uppercase ${esHoy ? 'text-[#D13A28] dark:text-[#E8422F]' : 'text-[#57534E] dark:text-[#9E9A94]'}`}>
                                    {DIAS[date.getDay()]} {date.getDate()}
                                </span>
                                {esHoy && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D13A28] dark:bg-[#E8422F] text-white">HOY</span>}
                            </div>
                            {items.length > 0 && (
                                <span className="text-[10px] font-bold text-[#A8A29E]">
                                    {items.length} servicio{items.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Contenido */}
                        <div className={`bg-[#FFFFFF] dark:bg-[#242424] ${items.length === 0 ? 'py-3' : 'p-2 space-y-1.5'}`}>
                            {items.length === 0 ? (
                                <p className={`text-center text-[11px] ${esPasado ? 'text-[#D4D4D4] dark:text-[#3E3E3E]' : 'text-[#A8A29E]'}`}>
                                    {esPasado ? '—' : 'Sin servicios'}
                                </p>
                            ) : (
                                items.map(s => (
                                    <div key={s.id}
                                        onClick={() => onDetalle(s)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all bg-[#EFEDEA] dark:bg-[#1C1C1C]"
                                    >
                                        {/* Indicador estado */}
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${s.estado === 'PRESUPUESTO' ? 'bg-[#D48800]' : s.estado === 'REALIZADO' ? 'bg-[#16A34A]' : 'bg-[#A8A29E]'}`} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">
                                                {s.clienteNombre}
                                            </p>
                                            <p className="text-[10px] text-[#A8A29E] truncate">
                                                {s.sedeNombre} {s.items?.[0]?.equipoSerial ? `· ${s.items[0].equipoSerial}` : ''}
                                            </p>
                                        </div>

                                        {/* Monto */}
                                        <M valor={calcularTotal(s)} className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0" />

                                        {/* Acción rápida para pendientes */}
                                        {s.estado === 'PRESUPUESTO' && onEjecutar && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEjecutar(s); }}
                                                className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 active:scale-90 bg-[#D48800] dark:bg-[#F0A500] text-white"
                                            >
                                                Ejecutar
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
