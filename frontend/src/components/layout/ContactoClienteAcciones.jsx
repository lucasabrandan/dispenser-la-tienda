import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuMessageCircle, LuPhone } from 'react-icons/lu';
import api from '../../services/api';
import { mensajeParaCliente, linkWhatsApp } from '../../utils/contactoCliente';

// En la notificación "Contactar al cliente" (admin): trae el teléfono, muestra
// el mensaje armado y abre WhatsApp / llamada. Al tocar, avisa al técnico.
export default function ContactoClienteAcciones({ notif, motivo, etiqueta = 'Escribirle al cliente' }) {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [avisado, setAvisado] = useState(false);

    const abrir = async (e) => {
        e.stopPropagation();
        setCargando(true);
        try { const r = await api.get(`/ordenes/${notif.referenciaId}/contacto`); setDatos(r.data || {}); }
        catch { toast.error('No se encontró la visita'); }
        finally { setCargando(false); }
    };
    const marcarAvisado = () => {
        if (avisado) return;
        setAvisado(true);
        api.post(`/ordenes/${notif.referenciaId}/cliente-avisado`).catch(() => {});
    };

    if (!datos) {
        return (
            <button type="button" onClick={abrir} disabled={cargando}
                className="mt-2 h-9 px-3 rounded-xl inline-flex items-center gap-1.5 bg-[#16A34A] text-white text-label font-black active:scale-95 disabled:opacity-60">
                <LuMessageCircle size={14} /> {cargando ? 'Buscando…' : etiqueta}
            </button>
        );
    }
    const texto = mensajeParaCliente(motivo || notif.mensaje, datos);
    const wa = linkWhatsApp(datos.telefono, texto);
    return (
        <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
            <p className="p-2.5 rounded-xl bg-panel text-caption text-secondary">{texto}</p>
            {datos.telefono ? (
                <div className="flex gap-2">
                    <a href={wa} target="_blank" rel="noreferrer" onClick={marcarAvisado}
                        className="flex-1 h-10 rounded-xl inline-flex items-center justify-center gap-1.5 bg-[#16A34A] text-white text-label font-black active:scale-95">
                        <LuMessageCircle size={15} /> Enviar por WhatsApp
                    </a>
                    <a href={`tel:${datos.telefono}`} onClick={marcarAvisado}
                        className="h-10 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/10 text-ink text-label font-black active:scale-95">
                        <LuPhone size={15} /> Llamar
                    </a>
                </div>
            ) : (
                <p className="text-caption font-bold text-brand-red">Este cliente no tiene teléfono cargado.</p>
            )}
            {avisado && <p className="text-caption font-bold text-[#16A34A]">✓ Le avisamos a {(datos.tecnicoNombre || 'el técnico').split(' ')[0]}</p>}
        </div>
    );
}
