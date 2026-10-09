import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuX } from 'react-icons/lu';
import api from '../../services/api';

// Funciones del portal empresa (9-oct-2026): qué ve este cliente en su portal.
// Lo sensible (puntaje y números) viene apagado; queda preparado por si algún día conviene.
const FUNCIONES = [
    { k: 'comentarios',    titulo: 'Comentarios sobre el trabajo', texto: 'Pueden dejar un comentario en un trabajo entregado. Te llega como observación pendiente; no puntúa nada.' },
    { k: 'reporteSemanal', titulo: 'Reporte semanal',              texto: 'Los lunes les llega un aviso con lo atendido la semana anterior, para bajar en Excel.' },
    { k: 'mapa',           titulo: 'Mapa de sus lugares',          texto: 'Ven sus sedes en un mapa con “Cómo llegar”.' },
    { k: 'calificacion',   titulo: 'Calificar cada trabajo',       texto: '“¿Quedó todo bien?” con conforme / reclamo en cada pedido.', sensible: true },
    { k: 'numeros',        titulo: 'Pestaña Números',              texto: 'Indicadores: tiempos de respuesta, conformidad y reclamos.', sensible: true },
];
const DIAS = [0, 3, 5, 7, 10];

function Interruptor({ activo, onClick }) {
    return (
        <button type="button" role="switch" aria-checked={activo} onClick={onClick}
            className={`w-12 h-7 shrink-0 rounded-full p-0.5 transition-colors ${activo ? 'bg-[#16A34A]' : 'bg-[#D6D3CE] dark:bg-[#3A3A3A]'}`}>
            <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : ''}`} />
        </button>
    );
}

export default function FuncionesPortalModal({ cliente, onClose }) {
    const [cfg, setCfg] = useState(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get(`/pedidos-empresa/portal/${cliente.id}`).then(r => setCfg(r.data))
            .catch(() => { toast.error('No se pudo leer la configuración'); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cliente.id]);

    const guardar = async () => {
        setGuardando(true);
        try {
            await api.put(`/pedidos-empresa/portal/${cliente.id}`, cfg);
            toast.success('Listo, el portal ya lo muestra así');
            onClose();
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo guardar'); }
        finally { setGuardando(false); }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[199] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-end md:items-center justify-center z-[200] p-0 md:p-4 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
                <div className="bg-card w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl p-5 max-h-[calc(var(--vh,1vh)*92)] overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-label font-black text-muted uppercase tracking-widest">Funciones del portal</p>
                            <h3 className="text-body-lg font-black text-ink">{cliente.nombre}</h3>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-xl bg-chip text-muted flex items-center justify-center"><LuX size={16} /></button>
                    </div>
                    {!cfg ? <p className="py-10 text-center text-muted text-body">Cargando…</p> : (
                        <div className="space-y-2">
                            {FUNCIONES.map(f => (
                                <div key={f.k} className="flex items-center gap-3 p-3.5 rounded-2xl bg-chip">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-black text-ink">{f.titulo}{f.sensible && <span className="ml-1.5 text-caption font-bold text-muted">· sensible</span>}</p>
                                        <p className="text-caption text-secondary">{f.texto}</p>
                                    </div>
                                    <Interruptor activo={!!cfg[f.k]} onClick={() => setCfg(c => ({ ...c, [f.k]: !c[f.k] }))} />
                                </div>
                            ))}
                            <div className="p-3.5 rounded-2xl bg-chip space-y-2">
                                <p className="text-body font-black text-ink">Aprobación automática del mes</p>
                                <p className="text-caption text-secondary">Si no marcan observaciones, el resumen del mes se aprueba solo a los días que elijas del mes siguiente. Nunca aprueba meses anteriores a cuando se prendió.</p>
                                <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-card">
                                    {DIAS.map(d => (
                                        <button key={d} type="button" onClick={() => setCfg(c => ({ ...c, diasAprobacionAuto: d }))}
                                            className={`h-9 rounded-lg text-label font-black active:scale-95 ${cfg.diasAprobacionAuto === d ? 'bg-brand-red text-white' : 'text-secondary'}`}>
                                            {d === 0 ? 'No' : `${d} días`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="button" onClick={guardar} disabled={guardando}
                                className="w-full h-12 mt-2 rounded-xl bg-[#C9341F] text-white text-body font-black active:scale-95 disabled:opacity-50">
                                {guardando ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
