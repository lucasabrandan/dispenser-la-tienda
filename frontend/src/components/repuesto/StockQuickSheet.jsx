import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

/**
 * StockQuickSheet
 * Bottom sheet para ajuste rápido de stock sin abrir el modal completo.
 * Guarda solo los ítems modificados al confirmar.
 */
export default function StockQuickSheet({ isOpen, onClose, repuestos, onActualizado }) {
    // cambios locales: { [id]: nuevaCantidad }
    const [cambios, setCambios]   = useState({});
    const [guardando, setGuardando] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // Reset al abrir
    useEffect(() => {
        if (isOpen) {
            setCambios({});
            setBusqueda('');
        }
    }, [isOpen]);

    const getStock = (r) =>
        cambios[r.id] !== undefined ? cambios[r.id] : (Number(r.stock) || 0);

    const sumar  = (r) => setCambios(prev => ({ ...prev, [r.id]: Math.max(0, getStock(r) + 1) }));
    const restar = (r) => setCambios(prev => ({ ...prev, [r.id]: Math.max(0, getStock(r) - 1) }));
    const setDirecto = (r, val) => {
        const n = parseInt(val);
        setCambios(prev => ({ ...prev, [r.id]: isNaN(n) || n < 0 ? 0 : n }));
    };

    const idsModificados = useMemo(
        () => Object.keys(cambios).filter(id => {
            const rep = repuestos.find(r => String(r.id) === id);
            return rep && cambios[id] !== (Number(rep.stock) || 0);
        }),
        [cambios, repuestos]
    );
    const hayModificados = idsModificados.length > 0;

    const guardar = async () => {
        if (!hayModificados) { onClose(); return; }
        setGuardando(true);
        const t = toast.loading('Guardando stock...');
        try {
            const modificados = repuestos.filter(r => idsModificados.includes(String(r.id)));
            await Promise.all(modificados.map(r => {
                const fd = new FormData();
                fd.append('sku',    r.sku || String(r.id));
                fd.append('nombre', r.nombre);
                if (r.costo != null && r.costo !== '')             fd.append('costo',              r.costo);
                if (r.porcentajeGanancia != null && r.porcentajeGanancia !== '') fd.append('porcentajeGanancia', r.porcentajeGanancia);
                fd.append('precio', r.precio || 0);
                fd.append('stock',  cambios[r.id]);
                return api.put(`/repuestos/${r.id}`, fd);
            }));
            toast.success(
                `Stock actualizado (${modificados.length} ítem${modificados.length > 1 ? 's' : ''})`,
                { id: t }
            );
            onActualizado?.();
            onClose();
        } catch {
            toast.error('Error al guardar', { id: t });
        } finally {
            setGuardando(false);
        }
    };

    const repuestosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        if (!q) return repuestos;
        return repuestos.filter(r =>
            r.nombre?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q)
        );
    }, [repuestos, busqueda]);

    // Ordenar: con stock (o con cambio pendiente) primero
    const repuestosOrdenados = useMemo(() =>
        [...repuestosFiltrados].sort((a, b) => getStock(b) - getStock(a)),
        [repuestosFiltrados, cambios] // eslint-disable-line
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-end bg-black/60"
            onClick={onClose}
        >
            <div
                className="w-full rounded-t-3xl flex flex-col bg-[#FFFFFF] dark:bg-[#1C1C1C] max-h-[90vh] border-[0.5px] border-white/[0.08]"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 bg-chip" />

                {/* Header */}
                <div className="px-4 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-title font-black text-ink">
                            Ajustar stock
                        </h3>
                        {hayModificados && (
                            <p className="text-caption text-brand-red font-bold">
                                {idsModificados.length} ítem{idsModificados.length > 1 ? 's' : ''} modificado{idsModificados.length > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted bg-[#EFEDEA] dark:bg-[#2E2E2E] active:scale-90"
                    >✕</button>
                </div>

                {/* Buscador */}
                <div className="px-4 pb-3">
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o SKU..."
                        className="w-full px-4 py-2.5 rounded-xl text-body font-medium outline-none bg-[#EFEDEA] dark:bg-[#2E2E2E] text-ink placeholder-muted border border-black/[0.07] dark:border-white/[0.07]"
                    />
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
                    {repuestosOrdenados.length === 0 ? (
                        <p className="text-center py-8 text-muted font-bold text-sm">Sin resultados</p>
                    ) : repuestosOrdenados.map(r => {
                        const stock      = getStock(r);
                        const stockOrig  = Number(r.stock) || 0;
                        const modificado = cambios[r.id] !== undefined && cambios[r.id] !== stockOrig;
                        const fotoSrc    = r.fotoUrl ? construirUrlFoto(r.fotoUrl) : null;

                        return (
                            <div
                                key={r.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                                    modificado
                                        ? 'border-brand-red bg-[#D13A28]/5 dark:bg-[#E8422F]/5'
                                        : 'border-black/[0.07] dark:border-white/[0.07] bg-card'
                                }`}
                            >
                                {/* Foto miniatura */}
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#EFEDEA] dark:bg-[#2E2E2E] flex items-center justify-center">
                                    {fotoSrc
                                        ? <img src={fotoSrc} alt={r.nombre} className="w-full h-full object-cover"
                                               onError={e => { e.target.style.display = 'none'; }} />
                                        : <span className="text-lg opacity-30">📦</span>
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-body text-ink truncate">{r.nombre}</p>
                                    <p className="text-caption text-muted">
                                        ${Number(r.precio || 0).toLocaleString('es-AR')} venta
                                        {r.costo ? ` · $${Number(r.costo).toLocaleString('es-AR')} costo` : ''}
                                    </p>
                                </div>

                                {/* Controles +/− */}
                                <div className="flex items-center gap-1 shrink-0 bg-panel rounded-xl px-2 py-1">
                                    <button
                                        type="button"
                                        onClick={() => restar(r)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
                                    >−</button>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={stock}
                                        onFocus={e => e.target.select()}
                                        onChange={e => setDirecto(r, e.target.value)}
                                        className="font-black text-body-lg w-12 text-center text-ink bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => sumar(r)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-lg text-brand-red active:scale-90 transition-all"
                                    >+</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 pt-3 pb-6 border-t border-black/[0.07] dark:border-white/[0.07]">
                    <button
                        type="button"
                        onClick={guardar}
                        disabled={guardando}
                        className="w-full py-4 rounded-2xl font-black text-body-lg text-white active:scale-[0.98] transition-all bg-brand-red disabled:opacity-50"
                    >
                        {guardando
                            ? 'Guardando...'
                            : hayModificados
                                ? `Guardar ${idsModificados.length} cambio${idsModificados.length > 1 ? 's' : ''}`
                                : 'Cerrar sin cambios'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
