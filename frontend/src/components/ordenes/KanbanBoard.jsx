import React, { useState } from 'react';

const COLUMNAS = [
    { id: 'PENDIENTE',  label: 'Pendiente',   color: '#A8A29E', emoji: '\u23F3' },
    { id: 'EN_CAMINO',  label: 'En camino',   color: '#3B82F6', emoji: '\uD83D\uDE97' },
    { id: 'EN_SITIO',   label: 'En sitio',    color: '#D48800', emoji: '\uD83D\uDCCD' },
    { id: 'COMPLETADA', label: 'Completada',   color: '#16A34A', emoji: '\u2705' },
    { id: 'NO_ATENDIDO',label: 'No atendido',  color: '#DC2626', emoji: '\u26A0\uFE0F' },
];

const PRIORIDAD_BORDER = {
    URGENTE: '#DC2626', ALTA: '#D48800', NORMAL: '#3B82F6', BAJA: '#A8A29E',
};

function KanbanCard({ orden, onEditar }) {
    const priColor = PRIORIDAD_BORDER[orden.prioridad] || '#A8A29E';
    return (
        <div onClick={() => onEditar?.(orden)}
            className="rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] cursor-pointer active:scale-[0.98] transition-transform"
            style={{ borderLeft: `3px solid ${priColor}` }}>
            <p className="text-[12px] font-black text-ink leading-tight truncate">
                {orden.titulo}
            </p>
            {orden.clienteNombre && (
                <p className="text-[10px] text-muted mt-0.5 truncate">{orden.clienteNombre}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {orden.tecnicoNombre && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-panel text-secondary">
                        {orden.tecnicoNombre}
                    </span>
                )}
                {orden.horaEstimada && (
                    <span className="text-[9px] text-muted">{orden.horaEstimada}</span>
                )}
                {orden.prioridad === 'URGENTE' && (
                    <span className="text-[9px] font-black text-[#DC2626]">URGENTE</span>
                )}
                {orden.prioridad === 'ALTA' && (
                    <span className="text-[9px] font-black text-[#D48800]">ALTA</span>
                )}
            </div>
            {orden.direccion && (
                <p className="text-[9px] text-[#3B82F6] dark:text-[#60A5FA] mt-1 truncate">{orden.direccion}</p>
            )}
        </div>
    );
}

export default function KanbanBoard({ ordenes, filtroTecnico, onEditar }) {
    // En mobile, columnas swipeables; en desktop, grid
    const [colMobile, setColMobile] = useState('PENDIENTE');

    const ordenesFiltradas = filtroTecnico
        ? ordenes.filter(o => o.tecnicoId === Number(filtroTecnico))
        : ordenes;

    const porEstado = {};
    COLUMNAS.forEach(c => { porEstado[c.id] = []; });
    ordenesFiltradas.forEach(o => {
        if (porEstado[o.estado]) porEstado[o.estado].push(o);
    });

    return (
        <>
            {/* Mobile: selector de columna + lista */}
            <div className="md:hidden">
                <div className="flex gap-1 overflow-x-auto pb-2 px-1 -mx-1">
                    {COLUMNAS.map(col => {
                        const count = porEstado[col.id].length;
                        const sel = colMobile === col.id;
                        return (
                            <button key={col.id} onClick={() => setColMobile(col.id)}
                                className={`shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                                    sel
                                        ? 'text-white'
                                        : 'bg-white dark:bg-[#242424] text-secondary border border-black/[0.05] dark:border-white/[0.05]'
                                }`}
                                style={sel ? { backgroundColor: col.color } : {}}>
                                <span>{col.emoji}</span>
                                <span>{col.label}</span>
                                {count > 0 && (
                                    <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black ${
                                        sel ? 'bg-white/20 text-white' : 'bg-panel text-ink'
                                    }`}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="space-y-2 mt-2">
                    {porEstado[colMobile]?.length === 0 ? (
                        <p className="text-center py-8 text-muted text-[12px] font-bold">Sin ordenes</p>
                    ) : (
                        porEstado[colMobile]?.map(o => <KanbanCard key={o.id} orden={o} onEditar={onEditar} />)
                    )}
                </div>
            </div>

            {/* Desktop: columnas lado a lado */}
            <div className="hidden md:grid gap-3" style={{ gridTemplateColumns: `repeat(${COLUMNAS.length}, minmax(200px, 1fr))` }}>
                {COLUMNAS.map(col => {
                    const items = porEstado[col.id];
                    return (
                        <div key={col.id} className="rounded-2xl bg-panel border border-black/[0.05] dark:border-white/[0.05] p-2 min-h-[200px]">
                            <div className="flex items-center gap-2 px-2 py-2 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                                <span className="text-[11px] font-black uppercase tracking-wider text-ink">
                                    {col.label}
                                </span>
                                <span className="text-[10px] font-bold text-muted ml-auto">{items.length}</span>
                            </div>
                            <div className="space-y-2">
                                {items.map(o => <KanbanCard key={o.id} orden={o} onEditar={onEditar} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
