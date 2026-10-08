import React, { useEffect, useState } from 'react';
import { LuMapPin, LuShieldCheck, LuPlus } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import { VisitaEquipo } from './InformeTrabajo';
import { linkMaps } from '../../utils/pedidosEmpresa';
import { estadoGarantia } from '../../utils/dateUtils';

// Ficha permanente de un equipo (Portal Empresa, etapa 2): todas las visitas
// con lo que se hizo, repuestos y fotos. Desde acá se pide servicio directo.
const fmt = (iso) => {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

export default function FichaEquipoSheet({ serie, onCerrar, onPedirServicio }) {
    const [eq, setEq] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        api.get('/empresa/equipo', { params: { serie } }).then(r => setEq(r.data)).catch(() => setError(true));
    }, [serie]);

    return (
        <ModalShell titulo={`Equipo N/S ${serie}`} subtitulo={eq ? [eq.marca, eq.modelo, eq.ubicacion].filter(Boolean).join(' · ') || 'Historial del equipo' : 'Historial del equipo'}
            onCerrar={onCerrar} ancho="md:max-w-xl"
            pie={eq ? <button type="button" onClick={() => onPedirServicio && onPedirServicio(eq)}
                className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body inline-flex items-center justify-center gap-1.5 active:scale-95"><LuPlus size={18} /> Pedir servicio para este equipo</button> : null}>
            {error ? <p className="py-10 text-center text-muted">No se encontró el equipo.</p> : !eq ? <p className="py-10 text-center text-muted">Cargando…</p> : (
                <div className="space-y-4">
                    <a href={linkMaps(eq.direccion)} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 p-3 rounded-2xl bg-chip">
                        <LuMapPin size={17} className="shrink-0 mt-0.5 text-brand-red" />
                        <span className="flex-1 min-w-0">
                            {eq.sede && <span className="block text-body font-black text-ink">{eq.sede}</span>}
                            <span className="block text-label text-secondary">{eq.direccion}</span>
                        </span>
                    </a>
                    {eq.garantiaHasta && estadoGarantia(eq.garantiaHasta)?.vigente && (
                        <p className="flex items-center gap-2 p-3 rounded-2xl bg-[rgba(22,163,74,0.1)] text-body font-black text-[#16A34A]"><LuShieldCheck size={18} /> En garantía hasta el {fmt(eq.garantiaHasta)}</p>
                    )}
                    <div className="space-y-2">
                        <p className="text-label font-black uppercase tracking-widest text-muted">Historial · {eq.visitas?.length || 0} visita{eq.visitas?.length === 1 ? '' : 's'}</p>
                        {(!eq.visitas || eq.visitas.length === 0) && <p className="text-body text-muted">Todavía no tiene visitas registradas.</p>}
                        {eq.visitas?.map((v, i) => <VisitaEquipo key={i} v={v} mostrarSerie={false} />)}
                    </div>
                </div>
            )}
        </ModalShell>
    );
}
