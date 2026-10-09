import React, { useState } from 'react';

// Confirmación para cancelar un pedido (9-oct-2026), dentro de la misma ficha.
// Reemplaza el cartel del navegador ("gestiondlt.com dice…") que quedaba feo.
// Admin: elige o escribe el motivo (le llega a la empresa). Empresa: solo confirma.
const MOTIVOS = ['No tenemos disponibilidad', 'Ya se resolvió', 'Pedido duplicado', 'Lo coordinamos por otro medio'];

export default function CancelarPedido({ modo, onConfirmar, onVolver }) {
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const esAdmin = modo === 'admin';
    const confirmar = async () => {
        setEnviando(true);
        try { await onConfirmar(esAdmin ? motivo.trim() : null); }
        finally { setEnviando(false); }
    };
    return (
        <div className="p-3.5 rounded-2xl bg-[rgba(201,52,31,0.08)] space-y-2.5">
            <p className="text-body font-black text-ink">{esAdmin ? '¿Por qué se cancela?' : '¿Cancelar este pedido?'}</p>
            {esAdmin ? (<>
                <p className="text-caption text-secondary">Le llega a la empresa en la conversación del pedido.</p>
                <div className="flex flex-wrap gap-1.5">
                    {MOTIVOS.map(m => (
                        <button key={m} type="button" onClick={() => setMotivo(m)}
                            className={`h-8 px-3 rounded-full text-caption font-black active:scale-95 ${motivo === m ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{m}</button>
                    ))}
                </div>
                <textarea rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={500} autoFocus
                    placeholder="O escribilo con tus palabras…"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
            </>) : (
                <p className="text-caption text-secondary">Le avisamos a Dispenser La Tienda que ya no hace falta.</p>
            )}
            <div className="flex gap-2">
                <button type="button" onClick={onVolver} disabled={enviando}
                    className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Volver</button>
                <button type="button" onClick={confirmar} disabled={enviando || (esAdmin && !motivo.trim())}
                    className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95 disabled:opacity-50">
                    {enviando ? 'Cancelando…' : 'Sí, cancelar pedido'}
                </button>
            </div>
        </div>
    );
}
