import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import { LuX, LuPlus } from 'react-icons/lu';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Presupuesto propio (5-oct-2026): PDF simple a nombre del técnico/socio para
// SUS clientes. Sin marca de Dispenser La Tienda, no se guarda en el sistema ni
// entra en la liquidación. Solo se anota una línea en la libreta del cliente.
const INPUT = 'w-full h-10 px-3 rounded-xl bg-chip text-ink text-body outline-none placeholder:text-muted';
const fmt = v => `$ ${Math.round(Number(v) || 0).toLocaleString('es-AR')}`;
const leer = (k, d = '') => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

function generarPDF({ yo, contacto, cliente, items, notas, total }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const M = 18; let y = 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Presupuesto', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('es-AR'), 210 - M, y, { align: 'right' });
    y += 8; doc.setFont('helvetica', 'bold'); doc.text(yo, M, y);
    if (contacto) { y += 5; doc.setFont('helvetica', 'normal'); doc.text(contacto, M, y); }
    y += 10; doc.setDrawColor(200); doc.line(M, y, 210 - M, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Cliente:', M, y);
    doc.setFont('helvetica', 'normal'); doc.text(cliente.nombre, M + 18, y);
    if (cliente.direccion) { y += 5; doc.text(cliente.direccion, M + 18, y); }
    y += 12;
    doc.setFont('helvetica', 'bold'); doc.text('Detalle', M, y); doc.text('Importe', 210 - M, y, { align: 'right' });
    y += 3; doc.line(M, y, 210 - M, y); y += 6; doc.setFont('helvetica', 'normal');
    items.forEach(it => {
        const lineas = doc.splitTextToSize(it.desc, 130);
        doc.text(lineas, M, y); doc.text(fmt(it.precio), 210 - M, y, { align: 'right' });
        y += lineas.length * 5 + 3;
    });
    doc.line(M, y, 210 - M, y); y += 7;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Total', M, y); doc.text(fmt(total), 210 - M, y, { align: 'right' });
    if (notas.trim()) {
        y += 12; doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(doc.splitTextToSize(notas.trim(), 174), M, y);
    }
    doc.save(`presupuesto-${cliente.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export default function PresupuestoPropio({ cliente, onCerrar, onHecho }) {
    const { usuario } = useAuth();
    const [yo, setYo] = useState(() => leer('presu_propio_nombre', usuario?.nombre || ''));
    const [contacto, setContacto] = useState(() => leer('presu_propio_contacto'));
    const [items, setItems] = useState([{ desc: '', precio: '' }]);
    const [notas, setNotas] = useState('Validez: 7 días.');
    const total = items.reduce((s, it) => s + (Number(String(it.precio).replace(/[^\d]/g, '')) || 0), 0);
    const setItem = (i, k, v) => setItems(prev => prev.map((it, j) => j === i ? { ...it, [k]: v } : it));

    const generar = async () => {
        const validos = items.filter(it => it.desc.trim()).map(it => ({ desc: it.desc.trim(), precio: Number(String(it.precio).replace(/[^\d]/g, '')) || 0 }));
        if (!validos.length) { toast.error('Agregá al menos un ítem'); return; }
        if (!yo.trim()) { toast.error('Poné tu nombre'); return; }
        guardarLS('presu_propio_nombre', yo.trim()); guardarLS('presu_propio_contacto', contacto.trim());
        generarPDF({ yo: yo.trim(), contacto: contacto.trim(), cliente, items: validos, notas, total });
        // Queda anotado en la libreta del cliente
        const linea = `${new Date().toLocaleDateString('es-AR')}: presupuesto ${fmt(total)} (${validos.map(v => v.desc).join(', ')})`;
        try {
            await api.put(`/mis-clientes/${cliente.id}`, { ...cliente, notas: [cliente.notas, linea].filter(Boolean).join('\n') });
        } catch {}
        onHecho && onHecho();
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/50" onClick={onCerrar}>
            <div className="w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 pb-8 bg-card space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p className="text-body-lg font-black text-ink">Presupuesto para {cliente.nombre}</p>
                    <button onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 rounded-xl bg-chip flex items-center justify-center text-muted"><LuX size={16} /></button>
                </div>
                <p className="text-caption text-muted">Sale a tu nombre, sin la marca de Dispenser La Tienda. No se guarda en el sistema.</p>

                {items.map((it, i) => (
                    <div key={i} className="flex gap-2">
                        <input value={it.desc} onChange={e => setItem(i, 'desc', e.target.value)} placeholder="Qué vas a hacer o vender" className={`${INPUT} flex-1`} />
                        <input value={it.precio} onChange={e => setItem(i, 'precio', e.target.value)} placeholder="$" inputMode="numeric" className={`${INPUT} w-28 text-right`} />
                    </div>
                ))}
                <button onClick={() => setItems(p => [...p, { desc: '', precio: '' }])} className="h-9 px-3 rounded-xl bg-chip text-label font-bold text-secondary flex items-center gap-1">
                    <LuPlus size={14} /> Otro ítem
                </button>
                <div className="flex justify-between items-center px-1">
                    <span className="text-body font-black text-ink">Total</span>
                    <span className="text-title font-black text-ink">{fmt(total)}</span>
                </div>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas (validez, forma de pago...)" className={`${INPUT} h-auto py-2 resize-none`} />
                <div className="grid grid-cols-2 gap-2">
                    <input value={yo} onChange={e => setYo(e.target.value)} placeholder="Tu nombre" className={INPUT} />
                    <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Tu teléfono / mail" className={INPUT} />
                </div>
                <button onClick={generar} className="w-full py-3.5 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-[0.98]">
                    Generar PDF
                </button>
            </div>
        </div>
    );
}
