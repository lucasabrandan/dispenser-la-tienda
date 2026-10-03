import React from 'react';
import { LuEllipsisVertical, LuSquare, LuSquareCheck } from 'react-icons/lu';
import { M } from '../servicio/ServicioUI';
import { colorTecnico } from '../../utils/estados';

const primerNombre = (n) => (n || '').trim().split(' ')[0] || '';
const GRID = 'md:grid-cols-[140px_minmax(0,1fr)_140px_110px_120px_170px_36px]';

export const ENCABEZADO_GRID = GRID;

// Una fila de la lista de Trabajos. El botón del próximo paso toma el color de la
// etapa (mismo color que el puntito), así cada paso se distingue a simple vista.
// Celular (3-oct-2026): tarjeta compacta en 3 líneas + botón, para no scrollear tanto.
export default function TrabajoFila({ f, etapa, boton, textoSeguimiento, onAbrir, onMenu, seleccionando, seleccionado, onToggle }) {
    const tecTxt = f.tecnicoTexto || (f.tecnico ? primerNombre(f.tecnico) : 'Sin técnico');
    const tecColor = f.tecnico ? colorTecnico(f.tecnico) : '#78716C';
    const monto = f.monto == null ? <span className="text-muted font-bold text-caption">Cierre mensual</span>
        : f.monto > 0 ? <M valor={f.monto} className="font-black" /> : <span className="text-muted">—</span>;
    const casilla = seleccionando && (
        <button type="button" onClick={onToggle} aria-label="Seleccionar" className="text-ink shrink-0">
            {seleccionado ? <LuSquareCheck size={18} /> : <LuSquare size={18} />}
        </button>
    );
    const accion = f.accion === 'seguimiento' ? (
        <span className="text-caption text-muted md:text-right">{textoSeguimiento(f)}</span>
    ) : boton && !seleccionando && (
        <button type="button" onClick={() => boton.run(f)}
            className={`h-9 md:h-10 px-4 rounded-xl text-label font-black active:scale-95 transition-all shrink-0 ${boton.primaria ? 'text-[#1C1917]' : 'bg-chip text-ink border border-black/10 dark:border-white/10'}`}
            style={boton.primaria ? { background: etapa.color } : undefined}>
            {boton.label}
        </button>
    );
    const marco = `rounded-2xl bg-card border ${seleccionado ? 'border-brand-red' : 'border-black/10 dark:border-white/[0.08]'}`;

    return (
        <>
            {/* ── Celular ── */}
            <div className={`md:hidden ${marco} px-3 py-2.5`} style={{ borderLeftWidth: 5, borderLeftColor: etapa.color }}>
                <div className="flex items-center gap-2">
                    {casilla}
                    <button type="button" onClick={seleccionando ? onToggle : onAbrir} disabled={!f.servicio && !seleccionando}
                        className="flex-1 min-w-0 text-left disabled:cursor-default">
                        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide" style={{ color: etapa.color }}>
                            {etapa.label}
                            {f.esVenta && <span className="px-1 rounded bg-chip text-muted normal-case tracking-normal">Venta</span>}
                            <span className={`normal-case tracking-normal font-bold truncate ${f.alerta ? 'text-[#B45309] dark:text-[#FBBF24]' : 'text-muted'}`}>
                                · {f.fecha || '—'}{f.nota ? ` · ${f.nota}` : ''}
                            </span>
                        </span>
                        <span className="flex items-baseline justify-between gap-2 mt-0.5">
                            <span className="font-bold text-body text-ink truncate">{f.cliente}</span>
                            <span className="text-body text-ink shrink-0">{monto}</span>
                        </span>
                    </button>
                    <button type="button" onClick={onMenu} aria-label="Más acciones"
                        className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-muted active:bg-chip shrink-0">
                        <LuEllipsisVertical size={17} />
                    </button>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="flex items-center gap-1.5 text-caption text-muted min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tecColor }} />
                        <span className="truncate">{tecTxt}{f.detalle ? ` · ${f.detalle}` : ''}</span>
                    </span>
                    {accion}
                </div>
            </div>

            {/* ── Escritorio ── */}
            <div className={`hidden md:grid ${marco} px-4 py-3 ${GRID} gap-4 items-center`}
                style={{ borderLeftWidth: 5, borderLeftColor: etapa.color }}>
                <span className="flex items-center gap-2 text-label font-black uppercase tracking-wide" style={{ color: etapa.color }}>
                    {casilla}
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: etapa.color }} />{etapa.label}
                    {f.esVenta && <span className="ml-1 px-1.5 py-0.5 rounded bg-chip text-muted normal-case tracking-normal">Venta</span>}
                </span>
                <button type="button" onClick={seleccionando ? onToggle : onAbrir} disabled={!f.servicio && !seleccionando}
                    className="min-w-0 text-left disabled:cursor-default">
                    <span className="block font-bold text-body text-ink truncate">{f.cliente}</span>
                    <span className="block text-caption text-muted truncate">{f.detalle || '—'}</span>
                </button>
                <span className="flex items-center gap-2 text-caption text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tecColor }} />{tecTxt}
                </span>
                <span className="flex flex-col gap-0.5 text-caption">
                    <span className="text-ink">{f.fecha || '—'}</span>
                    {f.nota && <span className={f.alerta ? 'font-bold text-[#B45309] dark:text-[#FBBF24]' : 'text-muted'}>{f.nota}</span>}
                </span>
                <span className="text-right font-black text-body text-ink">{monto}</span>
                <div className="flex justify-end">{accion}</div>
                <button type="button" onClick={onMenu} aria-label="Más acciones"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:bg-chip">
                    <LuEllipsisVertical size={18} />
                </button>
            </div>
        </>
    );
}
