import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

// Vía de salida del técnico (29-sep-2026). Tres casos, un solo formulario:
//  - 'orden'   → no puede ir a UNA visita (motivo suyo, no del cliente)
//  - 'hoy'     → no puede trabajar hoy: devuelve todas sus visitas de hoy
//  - 'mensaje' → avisarle algo al admin
// En los tres, al admin le llega UN aviso urgente (app + push + WhatsApp).
const MOTIVOS = ['Salud', 'Problema personal', 'Transporte', 'Clima', 'Otro'];

const TEXTOS = {
    orden:   { titulo: 'No puedo ir a esta visita', boton: 'Avisar que no puedo ir', placeholder: 'Contale al admin qué pasó (opcional)' },
    hoy:     { titulo: 'No puedo trabajar hoy',     boton: 'Devolver mis visitas de hoy', placeholder: 'Contale al admin qué pasó (opcional)' },
    mensaje: { titulo: 'Avisar al admin',           boton: 'Enviar mensaje', placeholder: 'Ej: me demoro 30 min, falta un repuesto, el cliente pidió otro día…' },
};

export default function SalidaTecnicoSheet({ modo, orden, onCerrar, onListo }) {
    const [motivo, setMotivo] = useState('');
    const [detalle, setDetalle] = useState('');
    const [enviando, setEnviando] = useState(false);
    const t = TEXTOS[modo];
    const pideMotivo = modo !== 'mensaje';

    const enviar = async () => {
        if (pideMotivo && !motivo) { toast.error('Elegí un motivo'); return; }
        if (modo === 'mensaje' && !detalle.trim()) { toast.error('Escribí el mensaje'); return; }
        setEnviando(true);
        try {
            if (modo === 'orden') {
                await api.post(`/ordenes/${orden.id}/no-puedo`, { motivo, detalle });
                toast.success('Listo: el admin ya sabe que no podés ir');
            } else if (modo === 'hoy') {
                const { data } = await api.post('/ordenes/no-puedo-hoy', { motivo, detalle });
                toast.success(`Listo: ${data?.devueltas ?? 0} visita(s) devueltas al admin`);
            } else {
                await api.post('/ordenes/mensaje-admin', { mensaje: detalle });
                toast.success('Mensaje enviado al admin');
            }
            onListo && onListo();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo enviar. Probá de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
            <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto bg-chip" />
                <div>
                    <p className="text-body-lg font-black text-ink">{t.titulo}</p>
                    {orden && <p className="text-caption text-muted">{orden.clienteNombre || orden.titulo}</p>}
                    {modo === 'hoy' && (
                        <p className="text-caption text-muted mt-1">Tus visitas de hoy vuelven al admin para reasignarlas y avisarles a los clientes.</p>
                    )}
                </div>
                {pideMotivo && (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Motivo">
                        {MOTIVOS.map(m => (
                            <button key={m} onClick={() => setMotivo(m)} aria-pressed={motivo === m}
                                className={`h-10 px-3.5 rounded-full text-label font-bold border transition-all active:scale-95 ${
                                    motivo === m ? 'border-brand-red text-ink bg-[rgba(232,66,47,0.10)]' : 'border-black/10 dark:border-line text-secondary'
                                }`}>
                                {m}
                            </button>
                        ))}
                    </div>
                )}
                <label className="block">
                    <span className="sr-only">Detalle</span>
                    <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={3} placeholder={t.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none resize-none placeholder:text-muted" />
                </label>
                <div className="flex gap-2">
                    <button onClick={onCerrar} className="flex-1 h-12 rounded-2xl font-bold text-body bg-chip text-secondary active:scale-95">
                        Cancelar
                    </button>
                    <button onClick={enviar} disabled={enviando}
                        className="flex-[2] h-12 rounded-2xl font-bold text-body text-white bg-brand-red active:scale-95 disabled:opacity-50">
                        {enviando ? 'Enviando…' : t.boton}
                    </button>
                </div>
            </div>
        </div>
    );
}
