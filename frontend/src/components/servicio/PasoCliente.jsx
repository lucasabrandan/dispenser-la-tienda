import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label, NextBtn, buildSelectStyles } from './ServicioUI';

// ── Componentes locales con Tailwind arbitrary values ─────────────────────
function DSInput({ label, ...props }) {
    return (
        <div>
            {label && <Label>{label}</Label>}
            <input
                {...props}
                className="
                    w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
                    bg-[#E8E5E0] dark:bg-[#2E2E2E]
                    text-[#1C1917] dark:text-[#F0EEE9]
                    border border-black/10 dark:border-white/10
                    placeholder-[#A8A29E]
                    focus:border-[#D13A28] dark:focus:border-[#E8422F]
                    focus:ring-2 focus:ring-[#D13A28]/20
                    transition-all
                "
            />
        </div>
    );
}

function InfoCard({ children }) {
    return (
        <div className="rounded-xl p-3 bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoCliente({ hook, onNext, selectStyles }) {
    const {
        db, clienteId, setClienteId,
        itemActual, setItemActual,
        fechaServicio, setFechaServicio,
        duracionMinutos, setDuracionMinutos,
        onClienteSeleccionado,
        setNombreClientePrellenado, setModalClienteAbierto,
        setNombreSedePrellenado, setModalSedeAbierto,
        _setNombreLibre,
    } = hook;

    const [modo, setModo]               = useState(clienteId ? 'registrado' : 'nuevo');
    const [nombreLibre, setNombreLibre] = useState('');

    // Sincronizar modo cuando clienteId se setea externamente (ej: recuperar borrador)
    useEffect(() => {
        if (clienteId && modo === 'nuevo') setModo('registrado');
    }, [clienteId]);

    const clienteObj   = db.clientes?.find(c => c.id?.toString() === clienteId);
    const sedesCliente = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId) || [];

    const puedeAvanzar = modo === 'registrado' ? !!clienteId : nombreLibre.trim().length >= 2;

    const handleNext = () => {
        if (modo === 'nuevo' && nombreLibre.trim()) _setNombreLibre?.(nombreLibre);
        onNext();
    };

    const cambiarModo = (nuevoModo) => {
        setModo(nuevoModo);
        setClienteId(null);
        setNombreLibre('');
    };

    const hoy = new Date().toISOString().split('T')[0];

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Fecha ──────────────────────────────────────────────────── */}
            <div>
                <Label>Fecha del servicio</Label>
                <input
                    type="date"
                    value={fechaServicio}
                    max={hoy}
                    onChange={e => setFechaServicio(e.target.value)}
                    className="
                        w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
                        bg-[#E8E5E0] dark:bg-[#2E2E2E]
                        text-[#1C1917] dark:text-[#F0EEE9]
                        border border-black/10 dark:border-white/10
                        focus:border-[#D13A28] dark:focus:border-[#E8422F]
                        focus:ring-2 focus:ring-[#D13A28]/20
                        transition-all
                    "
                />
                {fechaServicio !== hoy && (
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] font-bold text-amber-500">Carga histórica</span>
                        <button onClick={() => setFechaServicio(hoy)}
                            className="text-[10px] text-[#A8A29E] hover:text-[#D13A28]">
                            Usar hoy
                        </button>
                    </div>
                )}
            </div>

            {/* ── Duración estimada ─────────────────────────────────────── */}
            <div>
                <Label>Duración estimada (opcional)</Label>
                <div className="flex gap-1.5 flex-wrap">
                    {[60, 90, 120, 180, 240, 300].map(min => (
                        <button key={min} type="button"
                            onClick={() => setDuracionMinutos(duracionMinutos === min ? null : min)}
                            className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                                duracionMinutos === min
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                    : 'bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                            }`}>
                            {min < 60 ? `${min}m` : `${min / 60}h`}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Toggle tipo cliente — EXCLUYENTE ───────────────────────── */}
            <div>
                <Label>Tipo de cliente</Label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'nuevo',      label: 'Nuevo',      hint: 'Sin cuenta' },
                        { id: 'registrado', label: 'Registrado', hint: 'Buscar en lista' },
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => cambiarModo(opt.id)}
                            className={`
                                p-3 rounded-2xl text-left transition-all active:scale-95
                                ${modo === opt.id
                                    ? 'bg-[#D48800] dark:bg-[#F0A500] border border-[#D48800] dark:border-[#F0A500]'
                                    : 'bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10'
                                }
                            `}
                        >
                            <p className={`font-black text-[13px] ${modo === opt.id ? 'text-[#1C1917]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                                {opt.label}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${modo === opt.id ? 'text-[#1C1917]/60' : 'text-[#A8A29E]'}`}>
                                {opt.hint}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Input según modo ────────────────────────────────────────── */}
            {modo === 'nuevo' ? (
                <DSInput
                    label="Nombre"
                    type="text"
                    value={nombreLibre}
                    autoFocus
                    onChange={e => setNombreLibre(e.target.value)}
                    placeholder="Ej: Juan García, Empresa SA..."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    <div>
                        <Label>Buscar cliente</Label>
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
                        />
                    </div>

                    {clienteObj && (
                        <>
                            {/* Info cliente */}
                            <InfoCard>
                                <div className="grid grid-cols-2 gap-2">
                                    {clienteObj.telefono && (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-[#A8A29E]">Teléfono</p>
                                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">{clienteObj.telefono}</p>
                                        </div>
                                    )}
                                    {clienteObj.localidad && (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-[#A8A29E]">Localidad</p>
                                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">{clienteObj.localidad}</p>
                                        </div>
                                    )}
                                </div>
                            </InfoCard>

                            {/* Sede — comportamiento según cantidad */}
                            {sedesCliente.length === 1 ? (
                                <div>
                                    <Label>Sede / Domicilio</Label>
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                                        <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1 truncate">{sedesCliente[0].nombreSede}</span>
                                        <span className="text-[10px] font-black text-[#1F9D55]">✓ Auto</span>
                                    </div>
                                </div>
                            ) : sedesCliente.length === 0 ? (
                                <div>
                                    <Label>Sede / Domicilio (opcional)</Label>
                                    <button type="button" onClick={() => setModalSedeAbierto(true)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-[12px] font-bold text-[#A8A29E] border border-dashed border-[#A8A29E]/40 bg-transparent active:scale-95 transition-all">
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
                </div>
            )}

            {/* ── Botón siguiente ─────────────────────────────────────────── */}
            <NextBtn onClick={handleNext} disabled={!puedeAvanzar}>
                Siguiente — Equipos
            </NextBtn>
        </div>
    );
}