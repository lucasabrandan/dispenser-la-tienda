import React, { useEffect, useState } from 'react';
import { LuWifiOff, LuTriangleAlert } from 'react-icons/lu';
import { getPendientes, getFallidos, descartarFallidos, enviarPendientes, suscribirPendientes } from '../../utils/pendientesOffline';

// Aviso fijo cuando hay cambios guardados sin señal (ver utils/pendientesOffline.js)
export default function PendientesOfflineBanner() {
    const [pend, setPend] = useState(getPendientes().length);
    const [fall, setFall] = useState(getFallidos());
    const [verFallidos, setVerFallidos] = useState(false);

    useEffect(() => {
        const act = () => { setPend(getPendientes().length); setFall(getFallidos()); };
        const off = suscribirPendientes(act);
        window.addEventListener('online', act);
        window.addEventListener('offline', act);
        return () => { off(); window.removeEventListener('online', act); window.removeEventListener('offline', act); };
    }, []);

    if (!pend && !fall.length) return null;

    return (
        <div className="fixed left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:w-96 z-[2500] space-y-2">
            {pend > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24] shadow-lg">
                    <LuWifiOff size={16} className="shrink-0" />
                    <p className="flex-1 text-caption font-bold">
                        {pend} cambio{pend !== 1 ? 's' : ''} guardado{pend !== 1 ? 's' : ''} sin señal. Se mandan solos cuando vuelva la conexión.
                    </p>
                    <button onClick={() => enviarPendientes()} className="shrink-0 text-label font-black uppercase underline">Reintentar</button>
                </div>
            )}
            {fall.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#3B1111] dark:text-[#F87171] shadow-lg">
                    <div className="flex items-center gap-2">
                        <LuTriangleAlert size={16} className="shrink-0" />
                        <p className="flex-1 text-caption font-bold">
                            {fall.length} cambio{fall.length !== 1 ? 's' : ''} no se pudo{fall.length !== 1 ? 'eron' : ''} guardar. Avisale al admin.
                        </p>
                        <button onClick={() => setVerFallidos(v => !v)} className="shrink-0 text-label font-black uppercase underline">
                            {verFallidos ? 'Ocultar' : 'Ver'}
                        </button>
                    </div>
                    {verFallidos && (
                        <div className="mt-2 space-y-1">
                            {fall.map(f => (
                                <p key={f.id} className="text-label">• {f.descripcion || f.url} — {f.error}</p>
                            ))}
                            <button onClick={descartarFallidos} className="mt-1 text-label font-black uppercase underline">Ya avisé, ocultar</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
