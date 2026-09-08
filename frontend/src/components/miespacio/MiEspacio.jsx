import React, { useState, useEffect } from 'react';
import { useMiEspacio } from './useMiEspacio';
import MiEspacioChecklist from './MiEspacioChecklist';
import MiEspacioBoard from './MiEspacioBoard';
import { useAuth } from '../../context/AuthContext';
import { getMiEspacioTecnicos } from '../../services/api';

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] p-3.5 md:p-4';

// Vista de solo lectura del checklist de cada técnico, para el admin (Lucas,
// 8-sep-2026: "que el admin vea todos"). No se edita desde acá -- cada
// técnico maneja el suyo desde su propio Mi Agenda/Mi Espacio; esto es solo
// para que el admin tenga panorama sin tener que pedirle a cada uno.
function ChecklistsTecnicos() {
    const [tecnicos, setTecnicos] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await getMiEspacioTecnicos();
                setTecnicos(res.data || []);
            } catch {
                setTecnicos([]);
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    if (cargando) {
        return (
            <p className="text-caption font-black text-muted animate-pulse uppercase tracking-widest py-6 text-center">
                Cargando...
            </p>
        );
    }

    if (!tecnicos || tecnicos.length === 0) {
        return <p className="text-caption text-muted py-2">No hay técnicos activos.</p>;
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {tecnicos.map(t => (
                <div key={t.usuarioId} className="rounded-xl bg-panel border border-black/[0.05] dark:border-white/[0.05] p-3">
                    <p className="text-label font-black uppercase tracking-wide text-muted mb-2">{t.nombre}</p>
                    {(!t.checklist || t.checklist.length === 0) ? (
                        <p className="text-caption text-muted">Sin tareas cargadas.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {t.checklist.map(it => (
                                <div key={it.id} className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                        it.hecho ? 'bg-brand-green border-brand-green text-white' : 'border-muted text-transparent'
                                    }`}>
                                        {it.hecho && <span className="text-[10px]">✓</span>}
                                    </span>
                                    <p className={`text-body text-sm ${it.hecho ? 'line-through text-muted' : 'text-ink'}`}>
                                        {it.texto}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// Pantalla completa de Mi Espacio -- desde el 7-sep-2026 el tablero (pestañas
// + columnas + notas) vive en MiEspacioBoard.jsx, compartido con Mi Agenda
// del técnico. Desde el 8-sep-2026 esta pantalla también suma el checklist
// (MiEspacioChecklist.jsx) -- a pedido de Lucas, el Trello se sacó del Panel
// y de Mi Agenda, y quedó viviendo solo acá, junto con el checklist (que sí
// sigue viéndose además en el Panel/Mi Agenda). Ambos widgets comparten una
// sola carga/guardado (useMiEspacio) para no pisarse entre sí -- ver el
// comentario en ese archivo.
export default function MiEspacio() {
    const { espacio, cargando, actualizar } = useMiEspacio();
    const { esAdmin } = useAuth();

    return (
        <div className="min-h-screen bg-page pb-28 transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Mi Espacio</h2>
                        <span className="text-caption font-bold text-muted md:ml-2">Notas propias, solo para vos</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 space-y-4">
                <div className={card}>
                    <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Notas rápidas</p>
                    <MiEspacioChecklist espacio={espacio} actualizar={actualizar} cargando={cargando} />
                </div>

                <div className={card}>
                    <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Tablero</p>
                    <MiEspacioBoard espacio={espacio} actualizar={actualizar} cargando={cargando} />
                </div>

                {esAdmin && (
                    <div className={card}>
                        <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Notas de los técnicos</p>
                        <ChecklistsTecnicos />
                    </div>
                )}
            </div>
        </div>
    );
}
