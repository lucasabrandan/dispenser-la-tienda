import React from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label, NextBtn, buildSelectStyles } from '../servicio/ServicioUI';
import DateInput from '../ui/DateInput';

const PROVINCIAS = ['Buenos Aires','CABA','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Neuquén'];

const inputCls = `
    w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
    bg-[#E8E5E0] dark:bg-[#2E2E2E]
    text-[#1C1917] dark:text-[#F0EEE9]
    border border-black/10 dark:border-white/10
    placeholder-[#A8A29E]
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    focus:ring-2 focus:ring-[#D13A28]/20
    transition-all
`;

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoClienteVenta({ hook, mostrador, onNext }) {
    const {
        clientes, clienteId, setClienteId, clienteObj,
        fechaVenta, setFechaVenta,
        modoRapido, registrarCliente, setRegistrarCliente,
        datosCliente, handleDatosChange,
        activarRapido, activarNormal,
        setNombreClientePrellenado, setModalClienteAbierto,
    } = hook;

    const isDark = document.documentElement.classList.contains('dark');
    const selectStyles = buildSelectStyles(isDark);
    const hoy = new Date().toISOString().split('T')[0];

    // Rápido: siempre puede avanzar. Con cliente: necesita clienteId
    const puedeAvanzar = modoRapido ? true : !!clienteId;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">

            {/* ── Fecha ── */}
            <div>
                <Label>Fecha de venta</Label>
                <DateInput
                    value={fechaVenta}
                    onChange={setFechaVenta}
                    className={inputCls}
                />
                {fechaVenta !== hoy && (
                    <div className="flex justify-between mt-1.5">
                        <span className={`text-[10px] font-bold ${fechaVenta < hoy ? 'text-[#D48800]' : 'text-blue-500'}`}>
                            {fechaVenta < hoy ? 'Carga histórica' : 'Fecha futura'}
                        </span>
                        <button onClick={() => setFechaVenta(hoy)} className="text-[10px] text-[#A8A29E] hover:text-[#D13A28]">
                            Usar hoy
                        </button>
                    </div>
                )}
            </div>

            {/* ── Toggle tipo de venta ── */}
            <div>
                <Label>Tipo de venta</Label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'rapida',     label: 'Rápida',       hint: 'Sin cliente registrado' },
                        { id: 'registrado', label: 'Con cliente',   hint: 'Buscar en lista' },
                    ].map(opt => {
                        const activo = opt.id === 'rapida' ? modoRapido : !modoRapido;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => opt.id === 'rapida' ? activarRapido(mostrador.clienteId) : activarNormal()}
                                className={`
                                    p-3 rounded-2xl text-left transition-all active:scale-95
                                    ${activo
                                        ? 'bg-[#D48800] dark:bg-[#F0A500] border border-[#D48800] dark:border-[#F0A500]'
                                        : 'bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10'
                                    }
                                `}
                            >
                                <p className={`font-black text-[13px] ${activo ? 'text-[#1C1917]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                                    {opt.label}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${activo ? 'text-[#1C1917]/60' : 'text-[#A8A29E]'}`}>
                                    {opt.hint}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Campos modo rápido ── */}
            {modoRapido && (
                <div className="flex flex-col gap-3">
                    <div>
                        <Label>Nombre (opcional)</Label>
                        <input name="nombre" type="text" value={datosCliente.nombre}
                            onChange={handleDatosChange} placeholder="Ej: Juan García, Empresa ABC..."
                            className={inputCls} />
                    </div>
                    <div>
                        <Label>Teléfono (opcional)</Label>
                        <input name="telefono" type="tel" value={datosCliente.telefono}
                            onChange={handleDatosChange} placeholder="+54 11 1234 5678"
                            className={inputCls} />
                    </div>

                    {/* Toggle registrar como cliente */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                        registrarCliente
                            ? 'border-[#D13A28] dark:border-[#E8422F] bg-[#D13A28]/5'
                            : 'border-black/10 dark:border-white/10 bg-[#E8E5E0] dark:bg-[#2E2E2E]'
                    }`}>
                        <button type="button" onClick={() => setRegistrarCliente(!registrarCliente)}
                            className="flex items-center justify-between w-full">
                            <div className="text-left">
                                <p className="font-black text-[13px] text-[#1C1917] dark:text-[#F0EEE9]">
                                    Registrar como cliente
                                </p>
                                <p className="text-[10px] text-[#A8A29E] mt-0.5">
                                    Guardarlo para futuras operaciones
                                </p>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ml-3 ${
                                registrarCliente ? 'bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#A8A29E]'
                            }`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                    registrarCliente ? 'left-6' : 'left-1'
                                }`} />
                            </div>
                        </button>

                        {/* Campos adicionales para registrar */}
                        {registrarCliente && (
                            <div className="mt-4 space-y-3 pt-3 border-t border-[#D13A28]/20">
                                <p className="text-[10px] font-black text-[#D13A28] uppercase tracking-widest">
                                    Datos del cliente — completá lo que tengas
                                </p>
                                <div>
                                    <Label>Email</Label>
                                    <input name="email" type="email" value={datosCliente.email}
                                        onChange={handleDatosChange} placeholder="contacto@ejemplo.com"
                                        className={inputCls} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Calle</Label>
                                        <input name="calle" type="text" value={datosCliente.calle}
                                            onChange={handleDatosChange} placeholder="Av. Corrientes"
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <Label>Número</Label>
                                        <input name="numero" type="text" value={datosCliente.numero}
                                            onChange={handleDatosChange} placeholder="1234"
                                            className={inputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Localidad</Label>
                                        <input name="localidad" type="text" value={datosCliente.localidad}
                                            onChange={handleDatosChange} placeholder="CABA"
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <Label>Provincia</Label>
                                        <select name="provincia" value={datosCliente.provincia}
                                            onChange={handleDatosChange} className={inputCls}>
                                            {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Selector cliente registrado ── */}
            {!modoRapido && (
                <div>
                    <Label>Buscar cliente</Label>
                    <CreatableSelect
                        styles={selectStyles}
                        menuPosition="fixed"
                        menuPlacement="auto"
                        menuPortalTarget={document.body}
                        options={clientes.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                        value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
                        onChange={s => {
                            if (s?.__isNew__) { setNombreClientePrellenado(s.label); setModalClienteAbierto(true); }
                            else setClienteId(s?.value || null);
                        }}
                        onCreateOption={val => { setNombreClientePrellenado(val); setModalClienteAbierto(true); }}
                        placeholder="Escribí el nombre..."
                        isClearable
                    />
                    {clienteObj && (
                        <div className="mt-2 p-3 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] grid grid-cols-2 gap-2">
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
                    )}
                </div>
            )}

            <NextBtn onClick={onNext} disabled={!puedeAvanzar}>
                Siguiente — Productos
            </NextBtn>
        </div>
    );
}
