import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { toTitleCase } from '../../utils/titleCase';

/**
 * CrearClienteModal — versión simplificada para alta rápida desde el flujo de servicio.
 * Solo pide: nombre, teléfono, dirección. El resto se completa después en Clientes.
 */
export default function CrearClienteModal({
    isOpen,
    onClose,
    onClienteCreado,
    clienteNombrePrellenado = ''
}) {
    const [nombre, setNombre]       = useState('');
    const [telefono, setTelefono]   = useState('');
    const [calle, setCalle]         = useState('');
    const [numero, setNumero]       = useState('');
    const [piso, setPiso]           = useState('');
    const [depto, setDepto]         = useState('');
    const [localidad, setLocalidad] = useState('');
    const [cargando, setCargando]   = useState(false);

    // Pre-llenar nombre cuando se abre
    useEffect(() => {
        if (isOpen && clienteNombrePrellenado) {
            setNombre(clienteNombrePrellenado);
        }
    }, [isOpen, clienteNombrePrellenado]);

    const resetear = () => {
        setNombre('');
        setTelefono('');
        setCalle('');
        setNumero('');
        setPiso('');
        setDepto('');
        setLocalidad('');
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        if (!calle.trim()) { toast.error('La calle es obligatoria'); return; }
        if (!localidad.trim()) { toast.error('La localidad es obligatoria'); return; }

        setCargando(true);
        const t = toast.loading('Creando cliente...');
        try {
            const dirStr = [calle, numero].filter(Boolean).join(' ')
                + (localidad ? `, ${localidad}` : '');
            const response = await api.post('/clientes', {
                clienteTipo: 'PARTICULAR',
                nombre: toTitleCase(nombre),
                telefono: telefono.trim() || null,
                calle: toTitleCase(calle),
                numero: numero || '0',
                piso: piso || null,
                depto: depto || null,
                localidad: toTitleCase(localidad),
                provincia: 'Buenos Aires',
                direccion: dirStr,
                condicionIva: 'CONSUMIDOR_FINAL',
            });
            // Crear sede "Principal" automáticamente
            await api.post('/sedes', {
                clienteId: response.data.id,
                nombreSede: 'Principal',
                calle: toTitleCase(calle),
                numero: numero || '0',
                piso: piso || null,
                depto: depto || null,
                localidad: toTitleCase(localidad),
                provincia: 'Buenos Aires',
                direccion: dirStr,
            });
            toast.success(`Cliente "${nombre.trim()}" creado`, { id: t });
            if (onClienteCreado) onClienteCreado(response.data);
            resetear();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.mensaje || 'Error al crear cliente';
            toast.error(msg, { id: t });
        } finally {
            setCargando(false);
        }
    };

    if (!isOpen) return null;

    const inputCls = 'w-full px-3.5 py-3 rounded-xl text-[13px] font-medium outline-none bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] focus:ring-2 focus:ring-[#D13A28]/20 transition-all';

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-end md:items-center justify-center z-[1000] p-4">
                <div className="w-full max-w-md rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* Handle mobile */}
                    <div className="md:hidden flex justify-center pt-3">
                        <div className="w-10 h-1 rounded-full bg-chip" />
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-center px-5 pt-4 pb-3">
                        <div>
                            <h2 className="text-[17px] font-black text-ink">Nuevo Cliente</h2>
                            <p className="text-[11px] text-muted mt-0.5">Alta rápida — completá el resto después</p>
                        </div>
                        <button onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleGuardar} className="px-5 pb-5 space-y-3">
                        {/* Nombre */}
                        <div>
                            <label className="text-[10px] font-black text-muted uppercase tracking-wider block mb-1">Nombre *</label>
                            <input
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                placeholder="Ej: Juan García, Empresa SA..."
                                className={inputCls}
                                autoFocus
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="text-[10px] font-black text-muted uppercase tracking-wider block mb-1">Teléfono</label>
                            <input
                                type="tel"
                                value={telefono}
                                onChange={e => setTelefono(e.target.value)}
                                placeholder="Ej: 1136919360"
                                className={inputCls}
                            />
                        </div>

                        {/* Dirección */}
                        <div className="rounded-xl p-3 bg-chip border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                            <p className="text-[10px] font-black text-muted uppercase tracking-wider">Dirección</p>
                            <div className="grid grid-cols-[1fr_80px] gap-2">
                                <div>
                                    <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Calle *</label>
                                    <input value={calle} onChange={e => setCalle(e.target.value)}
                                        placeholder="Av. Rivadavia" className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Nro</label>
                                    <input value={numero} onChange={e => setNumero(e.target.value)}
                                        placeholder="5000" className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Piso</label>
                                    <input value={piso} onChange={e => setPiso(e.target.value)}
                                        placeholder="3" className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Depto</label>
                                    <input value={depto} onChange={e => setDepto(e.target.value)}
                                        placeholder="B" className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Localidad *</label>
                                <input value={localidad} onChange={e => setLocalidad(e.target.value)}
                                    placeholder="Caballito, CABA" className={inputCls} />
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={onClose} disabled={cargando}
                                className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-chip text-secondary active:scale-95 disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={cargando || !nombre.trim()}
                                className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-brand-red active:scale-95 disabled:opacity-50">
                                {cargando ? 'Creando...' : 'Crear Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
