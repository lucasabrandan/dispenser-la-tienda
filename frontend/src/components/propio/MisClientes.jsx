import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LuPhone, LuMapPin, LuPlus, LuMessageCircle, LuFileText } from 'react-icons/lu';
import PresupuestoPropio from './PresupuestoPropio';
import api from '../../services/api';
import BusquedaBar from '../ui/BusquedaBar';
import { coincideTodo } from '../../utils/busqueda';
import { abrirWhatsApp } from '../../utils/clienteUtils';

// "Mis clientes" (5-oct-2026): libreta privada del técnico/socio. Solo la ve
// él; no son clientes de Dispenser La Tienda y no entran en la liquidación.
const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
const VACIO = { nombre: '', telefono: '', direccion: '', notas: '' };

function FormCliente({ inicial, onGuardado, onCerrar }) {
    const [f, setF] = useState(inicial || VACIO);
    const [guardando, setGuardando] = useState(false);
    const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));

    const guardar = async () => {
        if (!f.nombre.trim()) { toast.error('Poné al menos el nombre'); return; }
        setGuardando(true);
        try {
            if (f.id) await api.put(`/mis-clientes/${f.id}`, f);
            else await api.post('/mis-clientes', f);
            toast.success('Guardado');
            onGuardado();
        } catch { toast.error('No se pudo guardar'); }
        finally { setGuardando(false); }
    };
    const borrar = async () => {
        if (!window.confirm(`¿Borrar a ${f.nombre}?`)) return;
        try { await api.delete(`/mis-clientes/${f.id}`); toast.success('Borrado'); onGuardado(); }
        catch { toast.error('No se pudo borrar'); }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/50 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={onCerrar}>
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-5 pb-8 bg-card space-y-3" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto bg-chip md:hidden" />
                <p className="text-body-lg font-black text-ink">{f.id ? 'Editar cliente' : 'Nuevo cliente propio'}</p>
                <input value={f.nombre} onChange={set('nombre')} placeholder="Nombre *" className={INPUT} autoFocus />
                <input value={f.telefono || ''} onChange={set('telefono')} placeholder="Teléfono" inputMode="tel" className={INPUT} />
                <input value={f.direccion || ''} onChange={set('direccion')} placeholder="Dirección" className={INPUT} />
                <textarea value={f.notas || ''} onChange={set('notas')} rows={3} placeholder="Notas: equipos, qué le hiciste, cuánto le cobraste..." className={`${INPUT} resize-none`} />
                <div className="flex gap-2 pt-1">
                    {f.id && (
                        <button onClick={borrar} className="px-4 py-3 rounded-2xl font-bold text-label text-brand-red bg-chip active:scale-95">Borrar</button>
                    )}
                    <button onClick={onCerrar} className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">Cancelar</button>
                    <button onClick={guardar} disabled={guardando}
                        className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 disabled:opacity-50">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MisClientes() {
    const [lista, setLista] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [editando, setEditando] = useState(null); // null | {} (nuevo) | cliente
    const [presupuestando, setPresupuestando] = useState(null);

    const cargar = () => {
        setCargando(true);
        api.get('/mis-clientes')
            .then(r => setLista(Array.isArray(r.data) ? r.data : []))
            .catch(() => setLista([]))
            .finally(() => setCargando(false));
    };
    useEffect(() => { cargar(); }, []);

    const visibles = lista.filter(c => coincideTodo(`${c.nombre} ${c.telefono || ''} ${c.direccion || ''} ${c.notas || ''}`, busqueda));

    return (
        <div className="space-y-3">
            <p className="text-caption text-muted">
                Tu libreta personal. Solo la ves vos: no son clientes de Dispenser La Tienda y no entran en la liquidación.
            </p>
            <div className="flex gap-2">
                <div className="flex-1"><BusquedaBar valor={busqueda} onChange={setBusqueda} placeholder="Buscar en mis clientes..." /></div>
                <button onClick={() => setEditando(VACIO)}
                    className="h-10 px-3 rounded-xl font-black text-label text-white bg-brand-red active:scale-95 flex items-center gap-1 shrink-0">
                    <LuPlus size={15} /> Nuevo
                </button>
            </div>

            {cargando ? (
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse bg-card" />)}</div>
            ) : visibles.length === 0 ? (
                <p className="text-center text-muted py-10 rounded-2xl bg-card">
                    {lista.length === 0 ? 'Todavía no cargaste clientes propios' : 'Ninguno coincide con la búsqueda'}
                </p>
            ) : (
                <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06] dark:border-white/[0.06]">
                    {visibles.map(c => (
                        <div key={c.id} className="flex items-center gap-2 px-4 py-3 border-b last:border-b-0 border-black/[0.06] dark:border-white/[0.06]">
                            <button onClick={() => setEditando(c)} className="flex-1 min-w-0 text-left">
                                <p className="text-body font-black text-ink truncate">{c.nombre}</p>
                                {c.direccion && <p className="text-caption text-muted truncate">{c.direccion}</p>}
                                {c.notas && <p className="text-caption text-secondary truncate">{c.notas}</p>}
                            </button>
                            <button onClick={() => setPresupuestando(c)} aria-label="Presupuesto" title="Presupuesto" className="w-9 h-9 rounded-xl bg-chip text-ink flex items-center justify-center active:scale-90"><LuFileText size={15} /></button>
                            {c.telefono && (
                                <>
                                    <a href={`tel:${c.telefono}`} aria-label="Llamar" className="w-9 h-9 rounded-xl bg-chip text-ink flex items-center justify-center active:scale-90"><LuPhone size={15} /></a>
                                    <button onClick={() => abrirWhatsApp(c.telefono, c.nombre)} aria-label="WhatsApp" className="w-9 h-9 rounded-xl bg-chip text-ink flex items-center justify-center active:scale-90"><LuMessageCircle size={15} /></button>
                                </>
                            )}
                            {c.direccion && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion + ', Argentina')}`} target="_blank" rel="noreferrer"
                                    aria-label="Mapa" className="w-9 h-9 rounded-xl bg-chip text-ink flex items-center justify-center active:scale-90"><LuMapPin size={15} /></a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {presupuestando && <PresupuestoPropio cliente={presupuestando} onCerrar={() => setPresupuestando(null)} onHecho={() => { setPresupuestando(null); cargar(); }} />}
            {editando && <FormCliente inicial={editando} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
        </div>
    );
}
