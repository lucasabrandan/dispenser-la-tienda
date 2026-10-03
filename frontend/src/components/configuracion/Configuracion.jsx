import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

// Más › Configuración (3-oct-2026). Antes las condiciones del PDF estaban
// metidas en Usuarios; ahora todo lo que sale impreso en los PDF vive acá.
// Se guarda en este navegador (localStorage), igual que antes.
export const CONDICIONES_DEFAULT = 'Precio incluye IVA. Pagando en efectivo y sin factura: 10% de descuento.  ·  Visita sin reparacion: 50% de la mano de obra.  ·  Garantia 90 dias sobre mano de obra.  ·  Valido 7 dias.';

const CAMPOS = [
    { id: 'nombre',    label: 'Nombre de la empresa', ph: 'DISPENSER LA TIENDA' },
    { id: 'eslogan',   label: 'Eslogan',              ph: 'SERVICIO TÉCNICO ESPECIALIZADO' },
    { id: 'telefono',  label: 'Teléfono',             ph: 'Si queda vacío se usa el de tu usuario' },
    { id: 'whatsapp',  label: 'WhatsApp',             ph: 'Si queda vacío se usa el de tu usuario' },
    { id: 'email',     label: 'Email',                ph: 'info@dispenserlatienda.com.ar' },
    { id: 'web',       label: 'Web',                  ph: 'www.dispenserlatienda.com.ar' },
    { id: 'instagram', label: 'Instagram',            ph: '@dispenserlatienda' },
];

const leer = () => { try { return JSON.parse(localStorage.getItem('empresa_datos') || '{}'); } catch { return {}; } };

const inputCls = 'w-full h-11 px-3 rounded-xl text-body bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none';

export default function Configuracion() {
    const [datos, setDatos] = useState(leer);
    const [condiciones, setCondiciones] = useState(() => localStorage.getItem('empresa_condiciones_pdf') || CONDICIONES_DEFAULT);

    const guardar = () => {
        try {
            const limpio = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, String(v || '').trim()]).filter(([, v]) => v));
            localStorage.setItem('empresa_datos', JSON.stringify(limpio));
            localStorage.setItem('empresa_condiciones_pdf', condiciones.trim() || CONDICIONES_DEFAULT);
            toast.success('Configuración guardada');
        } catch { toast.error('No se pudo guardar'); }
    };

    return (
        <div className="min-h-screen pb-28 md:pb-10 bg-page font-sans">
            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-5 md:pt-6 space-y-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink">Configuración</h2>
                    <p className="text-caption text-muted">Lo que sale impreso en presupuestos, remitos y cierres</p>
                </div>

                <section className="rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07] p-4 space-y-3">
                    <p className="text-label font-black text-muted uppercase tracking-widest">Datos de la empresa</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CAMPOS.map(c => (
                            <label key={c.id} className="block">
                                <span className="text-label font-bold text-muted">{c.label}</span>
                                <input className={`${inputCls} mt-1`} value={datos[c.id] || ''} placeholder={c.ph}
                                    onChange={e => setDatos(d => ({ ...d, [c.id]: e.target.value }))} />
                            </label>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07] p-4 space-y-2">
                    <p className="text-label font-black text-muted uppercase tracking-widest">Condiciones del presupuesto</p>
                    <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)}
                        className="w-full h-28 px-3 py-2 rounded-xl text-body bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none resize-none" />
                    <p className="text-caption text-muted">Va al pie del PDF de presupuestos y órdenes de servicio.</p>
                </section>

                <button type="button" onClick={guardar}
                    className="w-full md:w-auto h-12 px-6 rounded-xl bg-[#C9341F] text-white font-black text-label uppercase active:scale-95">
                    Guardar
                </button>
            </div>
        </div>
    );
}
