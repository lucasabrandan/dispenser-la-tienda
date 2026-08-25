import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Estilos reutilizables del sistema
const fieldCls = `
    w-full h-12 px-4 rounded-xl
    bg-chip
    border border-black/[0.07] dark:border-white/[0.07]
    font-bold text-body uppercase outline-none
    text-ink
    focus:ring-2 focus:ring-[#D13A28]/20
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    transition-all placeholder:text-muted
`;

export default function SedeModal({ cliente, sedes, onRefresh, onClose }) {
    const [form, setForm] = useState({
        nombreSede: '', calle: '', numero: '', piso: '', depto: '',
        localidad: '', provincia: 'Buenos Aires', notas: ''
    });

    // Archivar — soft delete, preserva historial
    const handleArchivar = async (sede) => {
        const equiposCount = sede.equipos?.length || 0;
        const msg = equiposCount > 0
            ? `¿Archivar "${sede.nombreSede}"?\n\nTiene ${equiposCount} equipo(s) asociado(s).\nEl historial se preserva.`
            : `¿Archivar la sede "${sede.nombreSede}"?\n\nEl historial se preserva.`;
        if (!window.confirm(msg)) return;
        const loading = toast.loading('Archivando sede...');
        try {
            await api.delete(`/sedes/${sede.id}`);
            toast.success('Sede archivada', { id: loading });
            onRefresh();
        } catch (err) {
            const data = err.response?.data;
            toast.error(typeof data === 'string' ? data : data?.message || data?.mensaje || 'Error al archivar', { id: loading });
        }
    };

    // Eliminar definitivo
    const handleEliminarDefinitivo = async (sede) => {
        const equiposCount = sede.equipos?.length || 0;
        const advertencia = `⚠️ ELIMINACIÓN DEFINITIVA\n\nSede: "${sede.nombreSede}"\n` +
            (equiposCount > 0 ? `Equipos a borrar: ${equiposCount}\n` : '') +
            `\nSe borrará TODO el historial de servicios. Esta acción NO se puede deshacer.\n\n¿Confirmás?`;
        if (!window.confirm(advertencia)) return;
        if (!window.confirm(`Segunda confirmación: ¿Borrar "${sede.nombreSede}" definitivamente?`)) return;
        const loading = toast.loading('Eliminando definitivamente...');
        try {
            await api.delete(`/sedes/${sede.id}/definitivo`);
            toast.success('Sede eliminada definitivamente', { id: loading });
            onRefresh();
        } catch (err) {
            const data = err.response?.data;
            toast.error(typeof data === 'string' ? data : data?.message || data?.mensaje || 'Error al eliminar', { id: loading });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombreSede || !form.calle || !form.numero)
            return toast.error('Nombre, Calle y Número son obligatorios');
        const loading = toast.loading('Guardando sede...');
        try {
            const direccionFull = `${form.calle} ${form.numero}${form.piso ? `, Piso ${form.piso}` : ''}${form.depto ? ` Depto ${form.depto}` : ''}, ${form.localidad}`.trim();
            await api.post('/sedes', { ...form, clienteId: cliente.id, direccion: direccionFull });
            toast.success('Sede añadida', { id: loading });
            setForm({ nombreSede: '', calle: '', numero: '', piso: '', depto: '', localidad: '', provincia: 'Buenos Aires', notas: '' });
            onRefresh();
        } catch {
            toast.error('Error al conectar con el servidor', { id: loading });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-card w-full max-w-xl rounded-t-[2rem] shadow-2xl animate-slide-up h-[90vh] flex flex-col">

                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1 bg-chip rounded-full" />
                </div>

                {/* Título */}
                <div className="px-6 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                    <h3 className="text-lg font-black text-ink uppercase tracking-tighter">
                        Sedes · {cliente.nombre}
                    </h3>
                    <p className="text-caption font-bold text-muted uppercase mt-0.5">{sedes.length} ubicación{sedes.length !== 1 ? 'es' : ''} registrada{sedes.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Lista de sedes */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {sedes.length === 0 ? (
                        <div className="text-center py-10 font-bold uppercase text-caption text-muted border-2 border-dashed border-black/[0.07] dark:border-white/[0.07] rounded-2xl">
                            Sin sedes cargadas
                        </div>
                    ) : (
                        sedes.map(s => (
                            <div key={s.id} className="p-4 bg-panel rounded-2xl border border-black/[0.07] dark:border-white/[0.07]">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-body text-ink uppercase leading-none mb-1">
                                            {s.nombreSede}
                                        </p>
                                        <p className="text-caption font-bold text-muted uppercase truncate">
                                            {s.direccion} · {s.localidad}
                                        </p>
                                        {s.equipos?.length > 0 && (
                                            <p className="text-label font-black text-brand-amber mt-1">
                                                {s.equipos.length} equipo{s.equipos.length !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion + ', ' + s.provincia + ', Argentina')}`, '_blank')}
                                            className="w-9 h-9 bg-[#1C1917]/10 dark:bg-[#F0EEE9]/10 text-ink rounded-xl flex items-center justify-center text-sm hover:opacity-80 transition-all">
                                            📍
                                        </button>
                                        <button
                                            onClick={() => handleArchivar(s)}
                                            title="Archivar (preserva historial)"
                                            className="w-9 h-9 bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-brand-amber rounded-xl flex items-center justify-center text-sm hover:opacity-80 transition-all">
                                            📦
                                        </button>
                                        <button
                                            onClick={() => handleEliminarDefinitivo(s)}
                                            title="Eliminar definitivamente"
                                            className="w-9 h-9 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-brand-red rounded-xl flex items-center justify-center text-sm hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] transition-all">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulario nueva sede */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 border-t border-black/[0.07] dark:border-white/[0.07] space-y-3">
                    <p className="text-label font-black text-brand-red uppercase mb-2">Nueva Ubicación</p>
                    <div className="grid grid-cols-2 gap-3">
                        <input className={fieldCls} placeholder="Nombre (Ej: Depósito)"
                            value={form.nombreSede} onChange={e => setForm({ ...form, nombreSede: e.target.value })} />
                        <input className={fieldCls} placeholder="Calle"
                            value={form.calle} onChange={e => setForm({ ...form, calle: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <input className={fieldCls} placeholder="Nro"
                            value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
                        <input className={fieldCls} placeholder="Piso"
                            value={form.piso} onChange={e => setForm({ ...form, piso: e.target.value })} />
                        <input className={fieldCls} placeholder="Dto"
                            value={form.depto} onChange={e => setForm({ ...form, depto: e.target.value })} />
                        <input className={fieldCls} placeholder="Localidad"
                            value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })} />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3.5 bg-chip text-ink rounded-xl font-black text-label uppercase hover:opacity-80 transition-all active:scale-95">
                            Cerrar
                        </button>
                        <button type="submit"
                            className="flex-[2] py-3.5 bg-brand-red text-white rounded-xl font-black text-label uppercase shadow-lg hover:opacity-90 transition-all active:scale-95">
                            + Registrar Sede
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
