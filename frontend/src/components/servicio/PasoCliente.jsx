import React, { useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label, NextBtn, buildSelectStyles } from './ServicioUI';
import DateInput from '../ui/DateInput';

function InfoCard({ children }) {
    return (
        <div className="rounded-xl p-3 bg-chip border border-black/10 dark:border-white/10">
            {children}
        </div>
    );
}

export default function PasoCliente({ hook, onNext, selectStyles }) {
    const {
        db, clienteId, setClienteId,
        itemActual, setItemActual,
        onClienteSeleccionado,
        setNombreClientePrellenado, setModalClienteAbierto,
        setNombreSedePrellenado, setModalSedeAbierto,
        modoCliente: modo, setModoCliente: setModo,
        nombreLibre, setNombreLibre,
        telefonoLibre, setTelefonoLibre,
        dirLibre, setDirLibre,
    } = hook;

    useEffect(() => {
        if (clienteId && modo === 'nuevo') setModo('registrado');
    }, [clienteId]);

    const clienteObj   = db.clientes?.find(c => c.id?.toString() === clienteId);
    const sedesCliente = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId) || [];

    const puedeAvanzar = modo === 'registrado'
        ? !!clienteId
        : nombreLibre.trim().length >= 2 && dirLibre.calle.trim().length >= 2 && dirLibre.localidad.trim().length >= 2;

    const handleNext = () => {
        onNext();
    };

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Selector cliente ──────────────────────────────────────── */}
            {modo === 'registrado' ? (
                <div className="flex flex-col gap-3">
                    <div>
                        <Label>Cliente</Label>
                        <CreatableSelect
                            styles={selectStyles}
                            menuPosition="fixed"
                            menuPlacement="auto"
                            menuPortalTarget={document.body}
                            options={db.clientes?.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                            value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
                            onChange={s => {
                                if (s?.__isNew__) { setNombreClientePrellenado(s.label); setModalClienteAbierto(true); }
                                else onClienteSeleccionado(s?.value);
                            }}
                            onCreateOption={val => { setNombreClientePrellenado(val); setModalClienteAbierto(true); }}
                            placeholder="Escribí el nombre..."
                            isClearable
                            autoFocus
                        />
                    </div>

                    {clienteObj && (
                        <>
                            <InfoCard>
                                <div className="grid grid-cols-2 gap-2">
                                    {clienteObj.telefono && (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-muted">Teléfono</p>
                                            <p className="text-[12px] font-bold text-ink">{clienteObj.telefono}</p>
                                        </div>
                                    )}
                                    {clienteObj.localidad && (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-muted">Localidad</p>
                                            <p className="text-[12px] font-bold text-ink">{clienteObj.localidad}</p>
                                        </div>
                                    )}
                                </div>
                            </InfoCard>

                            {sedesCliente.length === 1 ? (
                                <div>
                                    <Label>Sede / Domicilio</Label>
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-chip border border-black/10 dark:border-white/10">
                                        <span className="text-[12px] font-bold text-ink flex-1 truncate">{sedesCliente[0].nombreSede}</span>
                                        <span className="text-[10px] font-black text-[#1F9D55]">✓ Auto</span>
                                    </div>
                                </div>
                            ) : sedesCliente.length === 0 ? (
                                <div>
                                    <Label>Sede / Domicilio (opcional)</Label>
                                    <button type="button" onClick={() => setModalSedeAbierto(true)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-[12px] font-bold text-muted border border-dashed border-muted/40 bg-transparent active:scale-95 transition-all">
                                        + Crear sede para este cliente
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <Label>Sede / Domicilio</Label>
                                    <CreatableSelect
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPlacement="auto"
                                        menuPortalTarget={document.body}
                                        options={sedesCliente.map(s => ({ value: s.id.toString(), label: s.nombreSede }))}
                                        value={sedesCliente.find(s => s.id === itemActual.sedeId)
                                            ? { label: sedesCliente.find(s => s.id === itemActual.sedeId).nombreSede }
                                            : null}
                                        onChange={s => {
                                            if (s?.__isNew__) { setNombreSedePrellenado(s.label); setModalSedeAbierto(true); }
                                            else setItemActual({ ...itemActual, sedeId: parseInt(s?.value), sedeNombre: s?.label });
                                        }}
                                        onCreateOption={val => { setNombreSedePrellenado(val); setModalSedeAbierto(true); }}
                                        placeholder="Elegí o creá..."
                                        isClearable
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Link para cliente nuevo rápido */}
                    <button onClick={() => { setModo('nuevo'); setClienteId(null); }}
                        className="text-[11px] font-bold text-muted active:scale-95 transition-all self-start">
                        ¿Cliente nuevo? <span className="text-brand-red">Alta rápida</span>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <div>
                        <Label>Nombre del cliente *</Label>
                        <input
                            type="text"
                            value={nombreLibre}
                            autoFocus
                            onChange={e => setNombreLibre(e.target.value)}
                            placeholder="Ej: Juan García, Empresa SA..."
                            className="w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none bg-chip text-ink border border-black/10 dark:border-white/10 placeholder-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] focus:ring-2 focus:ring-[#D13A28]/20 transition-all"
                        />
                    </div>

                    <div>
                        <Label>Teléfono</Label>
                        <input
                            type="tel"
                            value={telefonoLibre}
                            onChange={e => setTelefonoLibre(e.target.value)}
                            placeholder="Ej: 1136919360"
                            className="w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none bg-chip text-ink border border-black/10 dark:border-white/10 placeholder-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] focus:ring-2 focus:ring-[#D13A28]/20 transition-all"
                        />
                    </div>

                    {/* Dirección del cliente */}
                    <div className="rounded-xl p-3 bg-chip border border-black/10 dark:border-white/10 space-y-2.5">
                        <p className="text-[10px] font-black text-muted uppercase tracking-wider">Dirección</p>
                        <div className="grid grid-cols-[1fr_80px] gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Calle *</label>
                                <input value={dirLibre.calle} onChange={e => setDirLibre(p => ({ ...p, calle: e.target.value }))}
                                    placeholder="Av. Rivadavia" className="w-full px-3 py-2 rounded-lg text-[12px] font-medium outline-none bg-[#FFFFFF] dark:bg-[#1C1C1C] text-ink border border-black/[0.06] dark:border-white/[0.06] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Nro</label>
                                <input value={dirLibre.numero} onChange={e => setDirLibre(p => ({ ...p, numero: e.target.value }))}
                                    placeholder="5000" className="w-full px-3 py-2 rounded-lg text-[12px] font-medium outline-none bg-[#FFFFFF] dark:bg-[#1C1C1C] text-ink border border-black/[0.06] dark:border-white/[0.06] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Piso</label>
                                <input value={dirLibre.piso} onChange={e => setDirLibre(p => ({ ...p, piso: e.target.value }))}
                                    placeholder="3" className="w-full px-3 py-2 rounded-lg text-[12px] font-medium outline-none bg-[#FFFFFF] dark:bg-[#1C1C1C] text-ink border border-black/[0.06] dark:border-white/[0.06] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Depto</label>
                                <input value={dirLibre.depto} onChange={e => setDirLibre(p => ({ ...p, depto: e.target.value }))}
                                    placeholder="B" className="w-full px-3 py-2 rounded-lg text-[12px] font-medium outline-none bg-[#FFFFFF] dark:bg-[#1C1C1C] text-ink border border-black/[0.06] dark:border-white/[0.06] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-muted uppercase block mb-0.5">Localidad / Barrio *</label>
                            <input value={dirLibre.localidad} onChange={e => setDirLibre(p => ({ ...p, localidad: e.target.value }))}
                                placeholder="Caballito, CABA" className="w-full px-3 py-2 rounded-lg text-[12px] font-medium outline-none bg-[#FFFFFF] dark:bg-[#1C1C1C] text-ink border border-black/[0.06] dark:border-white/[0.06] placeholder:text-muted focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all" />
                        </div>
                    </div>

                    <button onClick={() => setModo('registrado')}
                        className="text-[11px] font-bold text-muted active:scale-95 transition-all self-start">
                        ¿Ya existe? <span className="text-brand-red">Buscar en lista</span>
                    </button>
                </div>
            )}

            <NextBtn onClick={handleNext} disabled={!puedeAvanzar}>
                Siguiente — Equipos
            </NextBtn>
        </div>
    );
}
