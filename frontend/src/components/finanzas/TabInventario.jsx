import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { formatearPrecio } from '../../utils/formatearPrecio';
import Paginacion from '../ui/Paginacion';
import StatCard from './StatCard';
import { LuPackage } from 'react-icons/lu';

const POR_PAGINA = 15;

export default function TabInventario() {
    const { ocultar } = useMontos();
    const [repuestos, setRepuestos] = useState([]);
    const [cargando,  setCargando]  = useState(false);
    const [pagInv, setPagInv] = useState(1);

    const cargar = () => {
        setCargando(true);
        api.get('/repuestos?page=0&size=500')
            .then(r => setRepuestos(r.data?.content || r.data || []))
            .catch(() => toast.error('Error al cargar inventario'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const enStock     = repuestos.filter(r => Number(r.stock) > 0);
    const enStockOrdenado = [...enStock].sort((a, b) => (Number(b.costo || 0) * Number(b.stock)) - (Number(a.costo || 0) * Number(a.stock)));
    const totalCosto  = enStock.reduce((s, r) => s + Number(r.costo  || 0) * Number(r.stock), 0);
    const totalVenta  = enStock.reduce((s, r) => s + Number(r.precio || 0) * Number(r.stock), 0);
    const ganPotencial = totalVenta - totalCosto;
    const totalPagInv = Math.max(1, Math.ceil(enStockOrdenado.length / POR_PAGINA));
    const invPagina = enStockOrdenado.slice((pagInv - 1) * POR_PAGINA, pagInv * POR_PAGINA);

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;

    if (cargando) return <p className="text-center text-muted py-12">Cargando...</p>;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Mercadería al costo"  value={totalCosto}    sub="Capital inmovilizado" variante="muted"   ocultar={ocultar} />
                <StatCard label="A precio de venta"    value={totalVenta}    sub="Si vendés todo"       variante="gold"    ocultar={ocultar} />
                <StatCard label="Ganancia potencial"   value={ganPotencial}  sub="Diferencia neta"      variante="redBold" ocultar={ocultar} />
            </div>

            {enStock.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-card border-[0.5px] border-black/[0.07]">
                    <p className="text-muted font-bold text-caption">Sin stock registrado</p>
                    <p className="text-caption text-muted mt-1 flex items-center justify-center gap-1">Usá el botón <LuPackage size={12} className="inline" /> en la sección Repuestos para cargar stock</p>
                </div>
            ) : (
                <div className="bg-card rounded-2xl overflow-hidden border-[0.5px] border-black/[0.07]">
                    <div className="flex items-center justify-between px-5 py-3 bg-panel">
                        <p className="text-label font-black text-muted uppercase tracking-wider">
                            Detalle por producto ({enStock.length})
                        </p>
                        <button onClick={cargar}
                            className="text-label font-black text-muted uppercase hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            Actualizar
                        </button>
                    </div>

                    {invPagina.map((r, i) => {
                            const costo = Number(r.costo || 0);
                            const precio = Number(r.precio || 0);
                            const valorCosto = costo * Number(r.stock);
                            const valorVenta = precio * Number(r.stock);
                            const ganancia   = valorVenta - valorCosto;
                            const margen = precio > 0 ? Math.round((precio - costo) / precio * 100) : 0;
                            // Antes dependía de stockMinimo, un campo que no existe en ningún
                            // lado (ni backend ni formulario) — el badge nunca podía prender. Mismo
                            // umbral que ya usan RepuestoCard.jsx/useRepuestoManager.js en Productos.
                            const stockBajo = Number(r.stock) <= 3;
                            return (
                                <div key={r.id}
                                    className={`px-4 py-3 flex items-center gap-3 ${i < invPagina.length - 1 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''} ${stockBajo ? 'bg-[#FEE2E2]/50 dark:bg-[#3B1111]/30' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-body font-bold text-ink truncate">{r.nombre}</p>
                                            {stockBajo && <span className="text-label font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171] shrink-0">BAJO</span>}
                                        </div>
                                        <p className="text-caption text-muted">
                                            {r.stock} unid.
                                            {costo ? ` · costo ${ocultar ? '••••' : `$${formatearPrecio(costo)}`}` : ''}
                                            {precio ? ` · venta ${ocultar ? '••••' : `$${formatearPrecio(precio)}`}` : ''}
                                        </p>
                                    </div>
                                    {margen > 0 && (
                                        <span className="text-label font-bold px-1.5 py-0.5 rounded bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500] shrink-0">{margen}%</span>
                                    )}
                                    <div className="text-right shrink-0">
                                        <p className="text-body font-black text-brand-amber">{fmt(ganancia)}</p>
                                        <p className="text-caption text-muted">{fmt(valorCosto)} inv.</p>
                                    </div>
                                </div>
                            );
                        })}
                    {totalPagInv > 1 && (
                        <div className="px-4 py-2">
                            <Paginacion pagina={pagInv} totalPaginas={totalPagInv} irA={setPagInv} next={() => setPagInv(p => Math.min(p + 1, totalPagInv))} prev={() => setPagInv(p => Math.max(p - 1, 1))} />
                        </div>
                    )}

                    <div className="flex justify-between items-center px-5 py-3 bg-[#EFEDEA]/50 dark:bg-[#1C1C1C]/50">
                        <p className="text-label font-black text-muted uppercase">Totales</p>
                        <div className="text-right">
                            <p className="text-body-lg font-black text-brand-amber">
                                {fmt(ganPotencial)} <span className="text-label text-muted font-bold">ganancia</span>
                            </p>
                            <p className="text-caption text-muted">{fmt(totalCosto)} invertido · {fmt(totalVenta)} en ventas</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
