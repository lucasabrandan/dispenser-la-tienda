import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

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
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] flex items-center justify-center p-5 transition-colors">
            <p className="font-black text-[#A8A29E] animate-pulse uppercase text-sm tracking-widest">
                Escaneando base de datos...
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] p-4 pb-28 transition-colors">

            {/* Header */}
            <div className="bg-[#1C1917] dark:bg-[#1C1C1C] text-[#F0EEE9] p-6 rounded-[2rem] mb-5 border border-black/20 dark:border-white/[0.07]">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-black text-2xl uppercase tracking-tighter leading-none text-[#E8422F]">
                            Radar Activo
                        </h2>
                        <p className="text-[#A8A29E] text-[11px] font-bold uppercase mt-1">
                            Dispensers que necesitan atención
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-2xl w-14 h-14 rounded-2xl flex items-center justify-center">
                            {alertas.length}
                        </div>
                        <button onClick={cargarAlertas}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-all active:scale-90"
                            title="Actualizar">
                            🔄
                        </button>
                    </div>
                </div>

                {/* Resumen por tipo */}
                {alertas.length > 0 && (
                    <div className="flex gap-3 mt-4">
                        <div className="flex-1 bg-[#D13A28]/20 rounded-xl px-3 py-2 text-center">
                            <p className="text-[#E8422F] font-black text-lg leading-none">
                                {alertas.filter(a => a.tipoAlerta === 'FILTRO').length}
                            </p>
                            <p className="text-[#A8A29E] text-[9px] font-black uppercase mt-0.5">Filtros</p>
                        </div>
                        <div className="flex-1 bg-[#D48800]/20 rounded-xl px-3 py-2 text-center">
                            <p className="text-[#F0A500] font-black text-lg leading-none">
                                {alertas.filter(a => a.tipoAlerta === 'SANITIZACION').length}
                            </p>
                            <p className="text-[#A8A29E] text-[9px] font-black uppercase mt-0.5">Sanitizaciones</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sin alertas */}
            {alertas.length === 0 ? (
                <div className="text-center p-10 bg-[#FFFFFF] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07]">
                    <p className="text-[#D13A28] dark:text-[#E8422F] font-black text-xl uppercase">Todo al día</p>
                    <p className="text-[#A8A29E] text-[11px] font-bold uppercase mt-2">No hay dispensers vencidos.</p>
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
                                bg-[#FFFFFF] dark:bg-[#242424] rounded-[1.5rem]
                                border border-black/[0.07] dark:border-white/[0.07]
                                border-l-4 overflow-hidden
                                ${esFiltro
                                    ? 'border-l-[#D13A28] dark:border-l-[#E8422F]'
                                    : 'border-l-[#D48800] dark:border-l-[#F0A500]'}
                            `}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-3 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase mb-2 ${
                                                esFiltro
                                                    ? 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F]'
                                                    : 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-[#D48800] dark:text-[#F0A500]'
                                            }`}>
                                                {a.tipoAlerta} · {a.meses} meses
                                            </span>
                                            <h3 className="font-black text-[16px] text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none">
                                                {a.clienteNombre}
                                            </h3>
                                            <p className="text-[10px] font-bold text-[#A8A29E] uppercase mt-1">
                                                📍 {a.sedeNombre} · S/N: <span className="text-[#1C1917] dark:text-[#F0EEE9]">{a.serial}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[9px] font-black text-[#A8A29E] uppercase">
                                                {esFiltro ? 'Último filtro' : 'Último service'}
                                            </p>
                                            <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] mt-0.5">
                                                {fechaRef}
                                            </p>
                                        </div>
                                    </div>

                                    <button onClick={() => enviarWA(a)}
                                        className="w-full py-3.5 bg-[#25D366] hover:opacity-90 text-white rounded-xl text-[13px] font-black flex justify-center items-center gap-2 active:scale-[0.98] transition-all">
                                        💬 Avisar por WhatsApp
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
