import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuFileDown, LuShieldCheck, LuWrench, LuX } from 'react-icons/lu';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

// Portal Empresa — etapa 2 (7-oct-2026): lo que se hizo en cada equipo, con
// repuestos, garantía y fotos antes/después. Sin precios. Lo usan el pedido
// (informe) y la ficha del equipo (historial).
const fmt = (iso) => {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

export function VisitaEquipo({ v, mostrarSerie = true }) {
    const [verFoto, setVerFoto] = useState(null);
    const fotos = [['Antes', v.fotoAntes], ['Después', v.fotoDespues]].filter(([, f]) => f);
    return (
        <div className="rounded-2xl bg-panel p-3.5 space-y-2.5">
            <div className="flex items-start gap-2">
                <span className="w-8 h-8 shrink-0 rounded-xl bg-card text-brand-red flex items-center justify-center"><LuWrench size={15} /></span>
                <div className="flex-1 min-w-0">
                    <p className="text-body font-black text-ink">{mostrarSerie && v.serie ? `N/S ${v.serie}` : fmt(v.fecha)}</p>
                    <p className="text-caption text-muted">{[mostrarSerie && v.serie ? fmt(v.fecha) : null, v.tecnico ? `Técnico: ${v.tecnico}` : null].filter(Boolean).join(' · ')}</p>
                </div>
            </div>
            <p className="text-body text-ink whitespace-pre-line">{v.trabajo || 'Sin detalle'}</p>
            {v.repuestos?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {v.repuestos.map((r, i) => (
                        <span key={i} className="h-7 px-2.5 rounded-full bg-card text-caption font-bold text-secondary inline-flex items-center">{r.cantidad || 1} × {r.nombre}</span>
                    ))}
                </div>
            )}
            {v.garantiaHasta && (
                <p className="inline-flex items-center gap-1.5 text-caption font-black text-[#16A34A]"><LuShieldCheck size={14} /> En garantía hasta el {fmt(v.garantiaHasta)}</p>
            )}
            {fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {fotos.map(([lab, f]) => (
                        <button key={lab} type="button" onClick={() => setVerFoto(f)} className="relative rounded-xl overflow-hidden bg-card aspect-[4/3] active:scale-[0.98]">
                            <img src={construirUrlFoto(f)} alt={lab} loading="lazy" className="w-full h-full object-cover" />
                            <span className="absolute left-1.5 top-1.5 h-6 px-2 rounded-full bg-black/60 text-white text-[11px] font-black inline-flex items-center">{lab}</span>
                        </button>
                    ))}
                </div>
            )}
            {verFoto && (
                <div className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-3" onClick={() => setVerFoto(null)}>
                    <img src={construirUrlFoto(verFoto)} alt="Foto" className="max-w-full max-h-full object-contain rounded-xl" />
                    <button type="button" aria-label="Cerrar" className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center"><LuX size={20} /></button>
                </div>
            )}
        </div>
    );
}

export default function InformeTrabajo({ pedido, items }) {
    const [generando, setGenerando] = useState(false);
    if (!items?.length) return null;
    const descargar = async () => {
        setGenerando(true);
        const t = toast.loading('Armando el PDF…');
        try {
            const { generarInformeEmpresa } = await import('../../utils/pdf/informeEmpresa');
            await generarInformeEmpresa({ pedido, items });
            toast.success('PDF descargado', { id: t });
        } catch (e) {
            toast.error('No se pudo armar el PDF', { id: t });
        } finally { setGenerando(false); }
    };
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-label font-black uppercase tracking-widest text-muted">Informe del trabajo</p>
                <button type="button" onClick={descargar} disabled={generando}
                    className="h-9 px-3 rounded-xl bg-chip text-secondary text-caption font-black inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"><LuFileDown size={15} /> PDF</button>
            </div>
            {items.map((v, i) => <VisitaEquipo key={i} v={v} />)}
        </div>
    );
}
