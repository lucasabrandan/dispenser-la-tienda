import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { LuRefreshCw, LuMapPin, LuMessageCircle } from 'react-icons/lu';

export default function RadarMantenimiento() {
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
        <div className="min-h-screen bg-page pb-28 transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Radar</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-muted">Dispensers que necesitan atención</span>
                        <div className="flex-1" />
                        <span className="text-body font-black text-brand-red">{alertas.length} alertas</span>
                        <button onClick={cargarAlertas}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95 text-sm">
                            <LuRefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">

            {/* Stats compacto */}
            {alertas.length > 0 && (
                <div className="flex items-center gap-3 px-3 h-8 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] mb-3">
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
                    {alertas.map((a, i) => {
                        const esFiltro = a.tipoAlerta === 'FILTRO';
                        const fechaRef = esFiltro && a.fechaUltimoFiltro
                            ? a.fechaUltimoFiltro
                            : a.fechaUltimoServicio;
                        return (
                            <div key={i} className={`
                                bg-card rounded-[1.5rem]
                                border border-black/[0.07] dark:border-white/[0.07]
                                border-l-4 overflow-hidden
                                ${esFiltro
                                    ? 'border-l-[#D13A28] dark:border-l-[#E8422F]'
                                    : 'border-l-[#D48800] dark:border-l-[#F0A500]'}
                            `}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-3 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-label font-black uppercase mb-2 ${
                                                esFiltro
                                                    ? 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-brand-red'
                                                    : 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-brand-amber'
                                            }`}>
                                                {a.tipoAlerta} · {a.meses} meses
                                            </span>
                                            <h3 className="font-black text-title text-ink uppercase leading-none">
                                                {a.clienteNombre}
                                            </h3>
                                            <p className="text-caption font-bold text-muted uppercase mt-1 flex items-center gap-1">
                                                <LuMapPin size={11} /> {a.sedeNombre} · S/N: <span className="text-ink">{a.serial}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-label font-black text-muted uppercase">
                                                {esFiltro ? 'Último filtro' : 'Último service'}
                                            </p>
                                            <p className="text-body font-black text-ink mt-0.5">
                                                {fechaRef}
                                            </p>
                                        </div>
                                    </div>

                                    <button onClick={() => enviarWA(a)}
                                        className="w-full py-3.5 bg-[#25D366] hover:opacity-90 text-white rounded-xl text-body font-black flex justify-center items-center gap-2 active:scale-[0.98] transition-all">
                                        <LuMessageCircle size={16} /> Avisar por WhatsApp
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </div>{/* cierre max-w-6xl */}
        </div>
    );
}
