import React, { useState } from 'react';
import { LuPackage, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import api from '../../services/api';

// "Qué llevar hoy" (2-oct-2026): junta los repuestos de los presupuestos de las
// visitas de hoy, para armar la mochila a la mañana y no llegar sin la pieza.
// Se carga recién al abrirlo (un GET por presupuesto), para no gastar datos de más.

export default function QueLlevarHoy({ ordenesHoy = [] }) {
    const conPpto = ordenesHoy.filter(o => o.presupuestoId);
    const [abierto, setAbierto] = useState(false);
    const [items, setItems] = useState(null);   // [{ nombre, cantidad, clientes: [] }]
    const [sinDato, setSinDato] = useState(0);

    const cargar = async () => {
        const res = await Promise.all(conPpto.map(o =>
            api.get(`/servicios/${o.presupuestoId}`).then(r => ({ o, s: r.data })).catch(() => null)));
        const mapa = {};
        let faltan = 0;
        res.forEach(x => {
            if (!x) { faltan++; return; }
            (x.s.items || []).forEach(it => (it.repuestosUsados || []).forEach(r => {
                const k = (r.nombre || 'Repuesto').trim();
                if (!mapa[k]) mapa[k] = { nombre: k, cantidad: 0, clientes: new Set() };
                mapa[k].cantidad += Number(r.cantidad || 1);
                mapa[k].clientes.add(x.o.clienteNombre || x.s.clienteNombre || `#${x.o.id}`);
            }));
        });
        setSinDato(faltan);
        setItems(Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad)
            .map(m => ({ ...m, clientes: [...m.clientes] })));
    };

    const toggle = () => {
        if (!abierto && items === null) cargar();
        setAbierto(v => !v);
    };

    if (conPpto.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
            <button onClick={toggle} className="w-full flex items-center justify-between p-3">
                <span className="flex items-center gap-2 text-caption font-black text-ink uppercase">
                    <LuPackage size={15} /> Qué llevar hoy
                </span>
                <span className="flex items-center gap-1 text-label text-muted">
                    {items ? `${items.reduce((a, i) => a + i.cantidad, 0)} repuestos` : `${conPpto.length} presupuesto${conPpto.length !== 1 ? 's' : ''}`}
                    {abierto ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                </span>
            </button>
            {abierto && (
                <div className="px-3 pb-3">
                    {items === null ? (
                        <p className="text-caption text-muted py-2">Cargando…</p>
                    ) : items.length === 0 ? (
                        <p className="text-caption text-muted py-2">Los presupuestos de hoy no tienen repuestos cargados.</p>
                    ) : (
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {items.map(i => (
                                <div key={i.nombre} className="py-1.5">
                                    <div className="flex justify-between text-caption">
                                        <span className="font-bold text-ink">{i.nombre}</span>
                                        <span className="font-black text-ink">x{i.cantidad}</span>
                                    </div>
                                    <p className="text-label text-muted truncate">{i.clientes.join(' · ')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {sinDato > 0 && <p className="text-label text-brand-amber font-bold mt-1">{sinDato} presupuesto(s) no se pudieron leer.</p>}
                    <p className="text-label text-muted mt-2">Sale de los presupuestos de hoy. Llevá algo de stock extra por si aparece otra falla.</p>
                </div>
            )}
        </div>
    );
}
