import React, { useState, useRef, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label, NextBtn, BackBtn } from './ServicioUI';
import { useAuth } from '../../context/AuthContext';
import RepuestoRapidoModal from '../repuesto/RepuestoRapidoModal';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';
import CargaRapidaSheet from './CargaRapidaSheet';
import FotoUpload from './FotoUpload';
import TicketItemsList from './TicketItemsList';
import CalculadoraMO from './CalculadoraMO';

export default function PasoEquipos({ hook, onNext, onBack, selectStyles }) {
    const {
        db, setDb, clienteId, ticketItems,
        itemActual, setItemActual,
        actualizarCantidad, quitarRepuesto,
        agregarAlTicket, calcularGananciaRepuesto,
        consultarAntecedentes, historialEquipo,
        configGlobal, editarItem, eliminarItem,
    } = hook;

    const moBase = Number(configGlobal?.manoDeObraBase) || 72600;
    const pctImp = Number(configGlobal?.porcentajeImpuestos) || 30;
    const pctIVA = Number(configGlobal?.porcentajeIVA) || 21;
    // moBase ya incluye IVA
    const precioReparacion = moBase;
    const precioVisita = Math.round(moBase / 2);
    const [tipoMO, setTipoMO] = useState('REPARACION');
    const { esAdmin } = useAuth();
    const [mostrarFotos, setMostrarFotos] = useState(false);
    const [mostrarEquipo, setMostrarEquipo] = useState(false);
    const [formVisible, setFormVisible] = useState(true);
    const [cargaRapida, setCargaRapida] = useState(false);
    const [modalRepuesto, setModalRepuesto] = useState(false);
    const [nombreRepuesto, setNombreRepuesto] = useState('');
    const [sheetRepuestos, setSheetRepuestos] = useState(false);

    const prevSerial = useRef(itemActual.equipoSerial);
    React.useEffect(() => {
        const tieneContenido = itemActual.equipoSerial || itemActual.repuestosUsados?.length > 0;
        if (tieneContenido && itemActual.equipoSerial !== prevSerial.current) setFormVisible(true);
        prevSerial.current = itemActual.equipoSerial;
    }, [itemActual]);

    const esVisitaActual = tipoMO === 'VISITA';
    const divisor = esVisitaActual ? 1 : 2;
    const desglose = useMemo(() => {
        const precioConIVA = parseFloat(itemActual.costoExtra) || 0;
        const sinIVA = Math.round(precioConIVA / (1 + pctIVA / 100));
        const netoFactura = Math.round(precioConIVA * (1 - pctImp / 100));
        return {
            precioCliente: precioConIVA, efectivoTotal: sinIVA,
            efectivoCada: Math.round(sinIVA / divisor),
            facturaCliente: precioConIVA, facturaNeto: netoFactura,
            facturaCada: Math.round(netoFactura / divisor),
        };
    }, [itemActual.costoExtra, pctIVA, pctImp, divisor]);

    const equiposInventario = (() => {
        if (!clienteId || !db.sedes?.length || !db.equipos?.length) return [];
        const ids = db.sedes.filter(s => s.cliente?.id?.toString() === clienteId).map(s => s.id);
        return db.equipos.filter(e => ids.includes(e.sedeId));
    })();

    const serialesHistorial = (() => {
        if (!clienteId || !db.servicios?.length) return [];
        const clienteObj = db.clientes?.find(c => c.id?.toString() === clienteId);
        if (!clienteObj) return [];
        return [...new Set(
            db.servicios.filter(s => s.clienteNombre === clienteObj.nombre)
                .flatMap(s => s.items?.map(i => i.equipoSerial).filter(Boolean) || [])
                .filter(s => s !== 'MOSTRADOR')
        )];
    })();

    const opcionesSerial = [
        ...equiposInventario.map(e => ({
            value: e.numeroSerie,
            label: `S/N: ${e.numeroSerie}${e.modelo ? ` — ${e.modelo}` : ''}`,
        })),
        ...serialesHistorial
            .filter(s => !equiposInventario.some(e => e.numeroSerie === s))
            .map(s => ({ value: s, label: `S/N: ${s} (historial)` })),
    ];

    const inputClass = `
        w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
        bg-[#E8E5E0] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9]
        border border-black/10 dark:border-white/[0.08] placeholder-[#A8A29E]
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20 transition-all
    `;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">
            <TicketItemsList ticketItems={ticketItems} editarItem={editarItem} eliminarItem={eliminarItem} />

            {!formVisible && ticketItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormVisible(true)}
                        className="py-3.5 rounded-2xl font-black text-[12px] uppercase border-2 border-dashed border-[#D13A28]/40 dark:border-[#E8422F]/40 text-[#D13A28] dark:text-[#E8422F] bg-transparent active:scale-[0.98] transition-all">
                        + Agregar equipo
                    </button>
                    <button type="button" onClick={() => setCargaRapida(true)}
                        className="py-3.5 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D48800] dark:bg-[#F0A500] active:scale-[0.98] transition-all">
                        ⚡ Carga rápida
                    </button>
                </div>
            ) : (
            <div className="rounded-2xl p-4 bg-[#EFEDEA] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black bg-[#D13A28] dark:bg-[#E8422F]">
                        {ticketItems.length + 1}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#A8A29E]">
                        Equipo {ticketItems.length + 1}
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Descripcion del trabajo */}
                    <div>
                        <Label>Descripción del trabajo</Label>
                        <textarea className={`${inputClass} resize-none min-h-[80px]`}
                            placeholder="Describí el trabajo realizado o a realizar..."
                            maxLength={400} autoFocus
                            value={itemActual.trabajo || ''}
                            onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })} />
                        <div className="flex justify-end mt-1">
                            <span className={`text-[10px] font-bold ${(itemActual.trabajo || '').length >= 380 ? 'text-[#D13A28]' : (itemActual.trabajo || '').length >= 300 ? 'text-[#D48800]' : 'text-[#A8A29E]'}`}>
                                {(itemActual.trabajo || '').length}/400
                            </span>
                        </div>
                    </div>

                    {/* Tipo + MO */}
                    <div className="rounded-2xl p-4 bg-[#1C1917] dark:bg-[#0F0F0F] space-y-3">
                        <div className="flex gap-2">
                            <button type="button"
                                onClick={() => { setTipoMO('REPARACION'); setItemActual({ ...itemActual, costoExtra: precioReparacion, esVisita: false }); }}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 ${tipoMO === 'REPARACION' ? 'bg-[#D13A28] text-white' : 'bg-[#2E2E2E] text-[#9E9A94]'}`}>
                                Reparación · ${precioReparacion.toLocaleString('es-AR')}
                            </button>
                            <button type="button"
                                onClick={() => { setTipoMO('VISITA'); setItemActual({ ...itemActual, costoExtra: precioVisita, esVisita: true }); }}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 ${tipoMO === 'VISITA' ? 'bg-[#D48800] text-white' : 'bg-[#2E2E2E] text-[#9E9A94]'}`}>
                                Visita · ${precioVisita.toLocaleString('es-AR')}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#5C5954] uppercase tracking-widest">MO $ <span className="text-[8px] text-[#A8A29E] normal-case">(con IVA)</span></span>
                            <input type="text" inputMode="decimal"
                                value={itemActual.costoExtra}
                                onChange={e => setItemActual({ ...itemActual, costoExtra: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0) })}
                                onFocus={e => e.target.select()} placeholder="0"
                                className="flex-1 bg-transparent border-none text-white text-3xl font-black outline-none placeholder-[#666]" />
                        </div>
                    </div>

                    {/* Secciones opcionales */}
                    <div className="border-t border-black/[0.07] dark:border-white/[0.07] pt-3 space-y-1.5">
                        {/* Equipo */}
                        <button type="button" onClick={() => setMostrarEquipo(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{itemActual.equipoSerial ? `🔧 ${itemActual.equipoSerial}` : '🔧 Equipo (S/N, modelo, ubicación)'}</span>
                            <span className="text-[10px]">{mostrarEquipo ? '▲' : '▼'}</span>
                        </button>
                        {mostrarEquipo && (
                            <div className="space-y-3 p-3 rounded-xl bg-[#E8E5E0]/50 dark:bg-[#2E2E2E]/50">
                                <div>
                                    <Label>N/S Dispenser</Label>
                                    <CreatableSelect styles={selectStyles} menuPosition="fixed" menuPlacement="auto" menuPortalTarget={document.body}
                                        options={opcionesSerial}
                                        value={itemActual.equipoSerial ? { label: itemActual.equipoSerial, value: itemActual.equipoSerial } : null}
                                        onChange={s => {
                                            if (!s) { setItemActual({ ...itemActual, equipoSerial: '', esNuevoEquipo: false }); return; }
                                            const equipoDB = db.equipos?.find(e => e.numeroSerie === s.value);
                                            setItemActual({ ...itemActual, equipoSerial: s.value, esNuevoEquipo: false,
                                                modeloEquipo: itemActual.modeloEquipo || equipoDB?.modelo || '',
                                                ubicacionEquipo: itemActual.ubicacionEquipo || equipoDB?.ubicacion || '' });
                                            consultarAntecedentes(s.value);
                                        }}
                                        onCreateOption={val => { setItemActual({ ...itemActual, equipoSerial: val, esNuevoEquipo: true }); consultarAntecedentes(val); }}
                                        isClearable placeholder="Buscar o escribir S/N..." noOptionsMessage={() => 'Escribí el S/N manualmente'} />
                                </div>
                                {historialEquipo && (
                                    <div className="p-2.5 rounded-xl bg-[#FFF4D6] dark:bg-[#2A1E00] border border-[#D48800]/30">
                                        <p className="text-[10px] font-bold text-[#D48800] dark:text-[#F0A500]">Último servicio</p>
                                        <p className="text-[10px] text-[#57534E] dark:text-[#9E9A94]">{historialEquipo.fecha} — {historialEquipo.items?.[0]?.trabajoRealizado}</p>
                                    </div>
                                )}
                                <input className={inputClass} value={itemActual.modeloEquipo || ''}
                                    onChange={e => setItemActual({ ...itemActual, modeloEquipo: e.target.value })}
                                    placeholder="Modelo (ej: Bacope frío/calor)" />
                                <input className={inputClass} value={itemActual.ubicacionEquipo || ''}
                                    onChange={e => setItemActual({ ...itemActual, ubicacionEquipo: e.target.value })}
                                    placeholder="Ubicación (ej: Piso 2, depósito)" />
                            </div>
                        )}

                        {/* Repuestos */}
                        <button type="button" onClick={() => setSheetRepuestos(true)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{itemActual.repuestosUsados?.length > 0
                                ? `📦 ${itemActual.repuestosUsados.length} repuesto${itemActual.repuestosUsados.length > 1 ? 's' : ''}`
                                : '📦 Repuestos'}</span>
                            <span className="text-[10px]">+</span>
                        </button>
                        {itemActual.repuestosUsados?.length > 0 && (
                            <div className="rounded-xl overflow-hidden bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/10 dark:border-white/10">
                                {itemActual.repuestosUsados.map((r, i) => {
                                    const g = calcularGananciaRepuesto(r, r.cantidad);
                                    return (
                                        <div key={i} className={`px-3 py-2 flex items-center gap-3 ${i < itemActual.repuestosUsados.length - 1 ? 'border-b-[0.5px] border-black/[0.07]' : ''}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[11px] truncate text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</p>
                                            </div>
                                            <span className="text-[10px] font-black text-[#A8A29E]">{r.cantidad}x</span>
                                            <p className="font-black text-[12px] text-[#1C1917] dark:text-[#F0EEE9]">${Math.round(g.subtotal).toLocaleString('es-AR')}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Fotos */}
                        <button type="button" onClick={() => setMostrarFotos(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-[0.98] transition-all">
                            <span>{(itemActual.fotoAntes || itemActual.fotoDespues) ? '📷 Fotos adjuntas' : '📷 Fotos'}</span>
                            <span className="text-[10px]">{mostrarFotos ? '▲' : '▼'}</span>
                        </button>
                        {mostrarFotos && (
                            <div className="grid grid-cols-2 gap-3">
                                <FotoUpload label="Antes" foto={itemActual.fotoAntes}
                                    onChange={f => setItemActual({ ...itemActual, fotoAntes: f })} />
                                <FotoUpload label="Después" foto={itemActual.fotoDespues}
                                    onChange={f => setItemActual({ ...itemActual, fotoDespues: f })} />
                            </div>
                        )}

                        {/* Calculadora admin */}
                        {esAdmin && (
                            <CalculadoraMO desglose={desglose} esVisita={esVisitaActual}
                                pctIVA={pctIVA}
                                itemActual={itemActual} setItemActual={setItemActual} />
                        )}
                    </div>

                    <button onClick={() => { agregarAlTicket(); setMostrarFotos(false); setMostrarEquipo(false); setFormVisible(false); }}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                        + Agregar equipo al ticket
                    </button>
                </div>
            </div>
            )}

            {ticketItems.length > 0 && (
                <NextBtn onClick={onNext}>
                    Ver resumen ({ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''})
                </NextBtn>
            )}
            <BackBtn onClick={onBack} />

            <CargaRapidaSheet isOpen={cargaRapida} onClose={() => setCargaRapida(false)} hook={hook} />
            <RepuestosBottomSheet isOpen={sheetRepuestos} onClose={() => setSheetRepuestos(false)}
                repuestos={db.repuestos || []} seleccionados={itemActual.repuestosUsados || []}
                onChange={nuevos => setItemActual(prev => ({ ...prev, repuestosUsados: nuevos }))}
                onCrearNuevo={() => { setSheetRepuestos(false); setModalRepuesto(true); }} />
            <RepuestoRapidoModal isOpen={modalRepuesto} onClose={() => setModalRepuesto(false)}
                nombreInicial={nombreRepuesto}
                onCreado={repuesto => { setDb(prev => ({ ...prev, repuestos: [...(prev.repuestos || []), repuesto] })); setSheetRepuestos(true); }} />
        </div>
    );
}
