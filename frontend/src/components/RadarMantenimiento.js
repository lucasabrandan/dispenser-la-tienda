import React, { useState, useEffect } from 'react';
import { CONTENEDOR, PAGINA, PantallaHeader, BotonHerramienta } from './ui/Pantalla';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { LuRefreshCw, LuMessageCircle, LuWrench } from 'react-icons/lu';
import { fechaAR } from '../utils/dateUtils';

// Radar (3-oct-2026): agrupado por cliente — "Sanatorio Güemes · 3 equipos vencidos"
// con UN botón para crear el trabajo de todos juntos.
export default function RadarMantenimiento({ onCrearTrabajo }) {
    const [alertas, setAlertas]   = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => { cargarAlertas(); }, []);

    const cargarAlertas = async () => {
        setCargando(true);
        try {
            const res = await api.get('/radar/alertas');
            setAlertas(res.data || []);
        } catch {
            toast.error('Error al generar el Radar');
        } finally {
            setCargando(false);
        }
    };

    const grupos = React.useMemo(() => {
        const m = new Map();
        alertas.forEach(a => {
            const k = a.clienteId || a.clienteNombre;
            if (!m.has(k)) m.set(k, { key: String(k), cliente: a.clienteNombre, clienteId: a.clienteId, items: [], filtros: 0, mesesMax: 0 });
            const g = m.get(k);
            g.items.push(a);
            if (a.tipoAlerta === 'FILTRO') g.filtros++;
            g.mesesMax = Math.max(g.mesesMax, a.meses || 0);
        });
        return [...m.values()].sort((a, b) => b.items.length - a.items.length || b.mesesMax - a.mesesMax);
    }, [alertas]);

    const enviarWA = (alerta) => {
        if (!alerta.clienteTelefono) return toast.error('Este cliente no tiene teléfono guardado');
        const tel = alerta.clienteTelefono.replace(/\D/g, '');
        const msg = alerta.tipoAlerta === 'FILTRO'
            ? `¡Hola! Pasó un año del último cambio de filtro de tu dispenser. ¿Coordinamos una visita para dejar el agua impecable de nuevo?`
            : `¡Hola! Ya pasaron varios meses de la última revisión de tu dispenser. ¿Te parece si coordinamos una visita de sanitización de rutina?`;
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (cargando) return (
        <div className="min-h-screen bg-page flex items-center justify-center p-5 transition-colors">
            <p className="font-black text-muted animate-pulse uppercase text-sm tracking-widest">
                Escaneando base de datos...
            </p>
        </div>
    );

    return (
        <div className={PAGINA}>

            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Radar" subtitulo="Dispensers que necesitan atención">
                    <BotonHerramienta icono={LuRefreshCw} onClick={cargarAlertas} title="Actualizar" />
                </PantallaHeader>
                <div className="flex items-baseline justify-end gap-2 text-caption text-muted">
                    <span className="text-body-lg font-black text-ink">{alertas.length}</span> equipo{alertas.length !== 1 ? 's' : ''} · {grupos.length} cliente{grupos.length !== 1 ? 's' : ''}
                </div>


            {/* Stats compacto */}
            {alertas.length > 0 && (
                <div className="flex items-center gap-3 px-3 h-8 rounded-lg bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] mb-3">
                    <span className="text-body font-bold text-brand-red">{alertas.filter(a => a.tipoAlerta === 'FILTRO').length} filtros</span>
                    <span className="text-caption text-muted">·</span>
                    <span className="text-body font-bold text-brand-amber">{alertas.filter(a => a.tipoAlerta === 'SANITIZACION').length} sanitizaciones</span>
                </div>
            )}

            {/* Sin alertas */}
            {alertas.length === 0 ? (
                <div className="text-center p-10 bg-card rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-brand-red font-black text-xl uppercase">Todo al día</p>
                    <p className="text-muted text-caption font-bold uppercase mt-2">No hay dispensers vencidos.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {grupos.map(g => (
                        <div key={g.key} className="bg-card rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden">
                            <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-title text-ink leading-tight truncate">{g.cliente}</h3>
                                        <p className="text-caption font-bold text-muted mt-0.5">
                                            {g.items.length} equipo{g.items.length !== 1 ? 's' : ''} vencido{g.items.length !== 1 ? 's' : ''}
                                            {g.filtros > 0 && <span className="text-brand-red"> · {g.filtros} filtro{g.filtros !== 1 ? 's' : ''}</span>}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-label font-black text-muted">{g.mesesMax} meses</span>
                                </div>
                                <div className="rounded-xl bg-panel divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                    {g.items.map((a, i) => {
                                        const esFiltro = a.tipoAlerta === 'FILTRO';
                                        const fechaRef = esFiltro && a.fechaUltimoFiltro ? a.fechaUltimoFiltro : a.fechaUltimoServicio;
                                        return (
                                            <div key={`${a.serial}-${i}`} className="flex items-center gap-2 px-3 py-2 text-caption">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${esFiltro ? 'bg-brand-red' : 'bg-brand-amber'}`} />
                                                <span className="flex-1 min-w-0 truncate">
                                                    <span className="font-bold text-ink">{a.serial}</span>
                                                    <span className="text-muted"> · {a.sedeNombre}</span>
                                                </span>
                                                <span className="shrink-0 text-muted">{esFiltro ? 'Filtro' : 'Service'} {fechaAR(fechaRef)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    {onCrearTrabajo && g.clienteId && (
                                        <button onClick={() => onCrearTrabajo({ id: g.clienteId, nombre: g.cliente })}
                                            className="flex-1 h-12 rounded-xl bg-[#C9341F] text-white text-body font-black flex justify-center items-center gap-2 active:scale-[0.98]">
                                            <LuWrench size={16} /> Crear trabajo
                                        </button>
                                    )}
                                    <button onClick={() => enviarWA(g.items[0])}
                                        className="flex-1 h-12 rounded-xl bg-[#25D366] text-white text-body font-black flex justify-center items-center gap-2 active:scale-[0.98]">
                                        <LuMessageCircle size={16} /> Avisar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>{/* cierre max-w-6xl */}
        </div>
    );
}
