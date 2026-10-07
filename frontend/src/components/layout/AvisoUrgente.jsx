import React, { useEffect } from 'react';
import { LuBellRing, LuX, LuClock, LuMapPin, LuUser } from 'react-icons/lu';
import { cuandoDeNotif, tieneTarjeta } from '../../utils/notifTarjeta';
import ContactoClienteAcciones from './ContactoClienteAcciones';
import { TITULO_CONTACTO } from '../../utils/contactoCliente';

// Aviso urgente (5-oct-2026): lo que el técnico necesita que el admin vea YA
// (y lo que el admin le cambia al técnico) aparece como ventana en el medio de
// la pantalla, con sonido, esté donde esté. Queda hasta que se toca "Listo".
export function esUrgente(n, esAdmin) {
    const t = String(n.titulo || '');
    if (esAdmin) {
        return t.startsWith(TITULO_CONTACTO) || t.startsWith('Mensaje de ')
            || n.tipo === 'ORDEN_NO_ATENDIDO' || (n.tipo === 'ORDEN_EN_CAMINO' && n.referenciaId);
    }
    return t.startsWith('Visita en pausa') || t.startsWith('Visita reasignada') || t.startsWith('✓ El admin avisó')
        || n.tipo === 'ORDEN_ASIGNADA' || n.tipo === 'TRABAJO_ASIGNADO';
}

export function sonarAviso() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        [0, 0.22].forEach((t, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.frequency.value = i ? 1180 : 880; o.type = 'sine';
            g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
            o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
        });
        setTimeout(() => ctx.close(), 800);
    } catch { /* sin sonido */ }
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* */ }
}

export default function AvisoUrgente({ notif, restantes = 0, onListo, onVerTodas, onVerVisita }) {
    // Mientras está abierto, la pestaña del navegador lo muestra en el título
    useEffect(() => {
        const original = document.title;
        let on = false;
        const id = setInterval(() => { on = !on; document.title = on ? `🔔 ${notif.titulo}` : original; }, 1000);
        return () => { clearInterval(id); document.title = original; };
    }, [notif]);

    const t = String(notif.titulo || '');
    const contacto = notif.referenciaId && t.startsWith(TITULO_CONTACTO);
    const enCamino = notif.referenciaId && notif.tipo === 'ORDEN_EN_CAMINO';

    return (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4 md:pl-[calc(var(--modal-sb,0px)+1.5rem)]" role="alertdialog" aria-modal="true">
            <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden border-2 border-[#C9341F]">
                <div className="flex items-start gap-3 px-5 pt-4 pb-3 bg-[rgba(201,52,31,0.12)]">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-[#C9341F] text-white flex items-center justify-center animate-pulse"><LuBellRing size={20} /></span>
                    <div className="flex-1 min-w-0">
                        <p className="text-label font-black uppercase tracking-widest text-brand-red">
                            {notif.origenNombre ? `De ${notif.origenNombre}` : 'Aviso'}{restantes > 0 ? ` · ${restantes} más` : ''}
                        </p>
                        <p className="text-body-lg font-black text-ink leading-tight">{t}</p>
                    </div>
                    <button type="button" onClick={onListo} aria-label="Cerrar" className="w-9 h-9 shrink-0 rounded-xl bg-chip text-muted flex items-center justify-center"><LuX size={17} /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    {notif.mensaje && <p className="text-body text-ink whitespace-pre-line">{notif.mensaje}</p>}
                    {tieneTarjeta(notif) && (
                        <div className="rounded-2xl bg-panel px-4 py-3 space-y-1.5">
                            {notif.clienteNombre && <p className="flex items-center gap-2 text-body font-black text-ink"><LuUser size={15} className="shrink-0 text-muted" />{notif.clienteNombre}</p>}
                            {cuandoDeNotif(notif) && <p className="flex items-center gap-2 text-label font-bold text-secondary"><LuClock size={15} className="shrink-0 text-muted" />{cuandoDeNotif(notif)}</p>}
                            {notif.direccion && <p className="flex items-center gap-2 text-label font-bold text-secondary"><LuMapPin size={15} className="shrink-0 text-muted" />{notif.direccion}</p>}
                        </div>
                    )}
                    {contacto && <ContactoClienteAcciones notif={notif} />}
                    {enCamino && <ContactoClienteAcciones notif={notif} motivo="Voy en camino" etiqueta="Avisarle al cliente que va en camino" />}
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    {notif.referenciaId && onVerVisita && notif.tipo !== 'TRABAJO_ASIGNADO'
                        ? <button type="button" onClick={onVerVisita} className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Ver visita</button>
                        : <button type="button" onClick={onVerTodas} className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Ver todas</button>}
                    <button type="button" onClick={onListo} className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95">Listo, lo vi</button>
                </div>
            </div>
        </div>
    );
}
