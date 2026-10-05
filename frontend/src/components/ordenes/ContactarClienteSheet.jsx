import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import { MOTIVOS_CONTACTO } from '../../utils/contactoCliente';

// El técnico pide que el admin contacte al cliente (5-oct-2026). El teléfono
// del cliente no está en su celular: le escribe el admin desde el de la empresa.
export default function ContactarClienteSheet({ orden, onCerrar }) {
    const [motivo, setMotivo] = useState('');
    const [detalle, setDetalle] = useState('');
    const [enviando, setEnviando] = useState(false);

    const enviar = async () => {
        if (!motivo) { toast.error('Elegí qué pasa'); return; }
        setEnviando(true);
        try {
            await api.post(`/ordenes/${orden.id}/contactar-cliente`, { motivo, detalle });
            toast.success('Listo, el admin le va a escribir al cliente');
            onCerrar();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo enviar');
            setEnviando(false);
        }
    };

    return (
        <ModalShell titulo="Contactar al cliente" subtitulo={orden.clienteNombre || orden.titulo} onCerrar={onCerrar}
            pie={
                <button type="button" onClick={enviar} disabled={!motivo || enviando}
                    className="w-full h-12 rounded-xl bg-[#C9341F] text-white text-body font-black active:scale-95 disabled:opacity-50">
                    {enviando ? 'Enviando…' : 'Pedirle al admin que le escriba'}
                </button>
            }>
            <div className="space-y-4">
                <p className="text-caption text-muted">El admin le escribe al cliente por WhatsApp desde el número de la empresa y te avisa cuando lo hizo.</p>
                <div className="grid grid-cols-2 gap-2">
                    {MOTIVOS_CONTACTO.map(m => (
                        <button key={m} type="button" onClick={() => setMotivo(m)} aria-pressed={motivo === m}
                            className={`min-h-12 px-3 py-2 rounded-xl text-body font-bold text-left border-2 active:scale-95 ${motivo === m ? 'border-[#C9341F] text-ink bg-[rgba(232,66,47,0.08)]' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
                            {m}
                        </button>
                    ))}
                </div>
                <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={2}
                    placeholder="Algo más para el admin (opcional)"
                    className="w-full px-3 py-2 rounded-xl text-body bg-panel text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none resize-none" />
            </div>
        </ModalShell>
    );
}
