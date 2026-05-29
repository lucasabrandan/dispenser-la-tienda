import React from 'react';

const inputBase = "w-full mt-1 p-3 rounded-xl text-sm font-bold outline-none transition-all border bg-[#E8E5E0] dark:bg-[#2E2E2E] border-black/[0.07] dark:border-white/[0.07] text-[#1C1917] dark:text-[#F0EEE9] focus:ring-2 focus:ring-[#D13A28]/20";
const readonlyBase = "w-full mt-1 p-3 rounded-xl text-sm font-black outline-none border";
const labelBase = "text-[10px] font-black uppercase tracking-wide";

const fmt = (v) => {
    const n = parseFloat(v);
    return n > 0 ? `$ ${Math.round(n).toLocaleString('es-AR')}` : '—';
};

function Seccion({ id, titulo, icono, children, color = 'blue', seccionAbierta, onToggle }) {
    const abierta = seccionAbierta === id;
    const colores = {
        green:  'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30',
        blue:   'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30',
        amber:  'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30',
        purple: 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/50 dark:border-purple-800/30',
    };
    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${abierta ? colores[color] : 'bg-[#F5F3F1] dark:bg-[#1C1C1C] border-black/[0.05] dark:border-white/[0.05]'}`}>
            <button type="button" onClick={() => onToggle(abierta ? '' : id)}
                className="w-full flex items-center justify-between p-3 text-left">
                <span className="text-xs font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-wide">
                    {icono} {titulo}
                </span>
                <span className={`text-xs text-[#A8A29E] transition-transform ${abierta ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {abierta && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
}

export default function SeccionesPrecios({ form, seccionAbierta, setSeccionAbierta, cambiarFinanciero, sanitizarNumero, setForm }) {
    const precioNegro = parseFloat(form.precio) || 0;
    const costoN      = parseFloat(form.costo) || 0;
    const precioFact  = parseFloat(form.precioFacturado) || 0;
    const netoCliente = parseFloat(form.precioNetoCliente) || 0;
    const precioCant  = parseFloat(form.precioCantidad) || 0;
    const precioCuotas3 = precioFact > 0 && form.porcentajeCuotas3 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas3) || 0) / 100) : 0;
    const precioCuotas6 = precioFact > 0 && form.porcentajeCuotas6 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas6) || 0) / 100) : 0;

    return (
        <>
            {/* Precio negro */}
            <Seccion id="basico" titulo="Precio Efectivo (negro)" icono="💵" color="green" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Costo $</label>
                        <input type="text" inputMode="decimal" value={form.costo}
                            onChange={e => cambiarFinanciero('costo', e.target.value)} placeholder="0" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Ganancia %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeGanancia}
                            onChange={e => cambiarFinanciero('porcentajeGanancia', e.target.value)} placeholder="0" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-[#D48800] dark:text-[#F0A500]`}>Markup %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeMarkup}
                            onChange={e => cambiarFinanciero('porcentajeMarkup', e.target.value)} placeholder="0" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-emerald-600 dark:text-emerald-400`}>Efectivo $</label>
                        <div className={`${readonlyBase} bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400`}>
                            {fmt(form.precio)}
                        </div>
                    </div>
                </div>
                {precioNegro > 0 && costoN > 0 && (
                    <div className="mt-2 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-xl p-2">
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            Ganancia: $ {Math.round(precioNegro - costoN).toLocaleString('es-AR')} por unidad
                        </p>
                    </div>
                )}
            </Seccion>

            {/* Precio facturado */}
            <Seccion id="facturado" titulo="Precio Facturado (blanco)" icono="🧾" color="blue" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Costo blanco $</label>
                        <input type="text" inputMode="decimal" value={form.costoBlanco}
                            onChange={e => cambiarFinanciero('costoBlanco', e.target.value)}
                            placeholder={costoN > 0 ? `Auto: ${(costoN * 1.21).toFixed(0)}` : 'Costo + IVA'} className={inputBase} />
                        <p className="text-[9px] text-[#A8A29E] font-bold mt-0.5">Costo {fmt(form.costo)} + 21% IVA</p>
                    </div>
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Impuestos %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeImpuestos}
                            onChange={e => cambiarFinanciero('porcentajeImpuestos', e.target.value)} placeholder="30" className={inputBase} />
                        <p className="text-[9px] text-[#A8A29E] font-bold mt-0.5">IVA + IIBB + cheques</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`${labelBase} text-blue-600 dark:text-blue-400`}>Precio final $</label>
                        <div className={`${readonlyBase} bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400`}>
                            {fmt(form.precioFacturado)}
                        </div>
                    </div>
                    <div>
                        <label className={`${labelBase} text-blue-600 dark:text-blue-400`}>Le decis al cliente</label>
                        <div className={`${readonlyBase} bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400`}>
                            {netoCliente > 0 ? `${fmt(form.precioNetoCliente)} + IVA` : '—'}
                        </div>
                    </div>
                </div>
                {precioFact > 0 && (
                    <div className="mt-2 bg-blue-100/30 dark:bg-blue-900/10 rounded-xl p-2 space-y-0.5">
                        <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                            {fmt(form.precioNetoCliente)} + 21% IVA = {fmt(form.precioFacturado)}
                        </p>
                        <p className="text-[10px] text-[#A8A29E] font-bold">
                            Tu ganancia real: $ {Math.round(precioFact / (1 + (parseFloat(form.porcentajeImpuestos) || 30) / 100) - (parseFloat(form.costoBlanco) || 0)).toLocaleString('es-AR')} por unidad
                        </p>
                    </div>
                )}
            </Seccion>

            {/* Precio por cantidad */}
            <Seccion id="cantidad" titulo="Precio por Cantidad" icono="📦" color="amber" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Desde (unid.)</label>
                        <input type="text" inputMode="numeric" value={form.cantidadMinima}
                            onChange={e => setForm({ ...form, cantidadMinima: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="Ej: 5" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-amber-600 dark:text-amber-400`}>Precio unit. $</label>
                        <input type="text" inputMode="decimal" value={form.precioCantidad}
                            onChange={e => setForm({ ...form, precioCantidad: sanitizarNumero(e.target.value) })}
                            placeholder="Precio especial" className={inputBase} />
                    </div>
                </div>
                {precioCant > 0 && costoN > 0 && (
                    <div className="mt-2 bg-amber-100/30 dark:bg-amber-900/10 rounded-xl p-2 space-y-0.5">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            Ganancia minima: $ {Math.round(precioCant - costoN).toLocaleString('es-AR')} por unidad
                        </p>
                        {precioNegro > 0 && (
                            <p className="text-[10px] text-[#A8A29E] font-bold">
                                Descuento: {Math.round((1 - precioCant / precioNegro) * 100)}% vs precio efectivo
                            </p>
                        )}
                    </div>
                )}
            </Seccion>

            {/* Cuotas */}
            <Seccion id="cuotas" titulo="Cuotas / MercadoLibre" icono="💳" color="purple" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Recargo 3 cuotas %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeCuotas3}
                            onChange={e => setForm({ ...form, porcentajeCuotas3: sanitizarNumero(e.target.value) })}
                            placeholder="Ej: 15" className={inputBase} />
                        {precioCuotas3 > 0 && (
                            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                                3x $ {Math.round(precioCuotas3 / 3).toLocaleString('es-AR')} = {fmt(precioCuotas3)}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={`${labelBase} text-[#A8A29E]`}>Recargo 6 cuotas %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeCuotas6}
                            onChange={e => setForm({ ...form, porcentajeCuotas6: sanitizarNumero(e.target.value) })}
                            placeholder="Ej: 30" className={inputBase} />
                        {precioCuotas6 > 0 && (
                            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                                6x $ {Math.round(precioCuotas6 / 6).toLocaleString('es-AR')} = {fmt(precioCuotas6)}
                            </p>
                        )}
                    </div>
                </div>
                <p className="text-[10px] text-[#A8A29E] font-bold mt-2">
                    Se calcula sobre el precio facturado. Deja vacio lo que no uses.
                </p>
            </Seccion>

            {/* Resumen */}
            {(precioNegro > 0 || precioFact > 0) && (
                <div className="bg-[#1C1917] dark:bg-[#F0EEE9]/10 rounded-2xl p-3">
                    <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-2">Resumen de precios</p>
                    <div className="grid grid-cols-2 gap-2">
                        {precioNegro > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase">Efectivo</p>
                                <p className="text-base font-black text-emerald-400">{fmt(form.precio)}</p>
                                <p className="text-[9px] text-emerald-400/60">Ganas {fmt(precioNegro - costoN)}</p>
                            </div>
                        )}
                        {netoCliente > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase">Al cliente</p>
                                <p className="text-base font-black text-blue-400">{fmt(form.precioNetoCliente)}</p>
                                <p className="text-[9px] text-blue-400/60">+ IVA = {fmt(form.precioFacturado)}</p>
                            </div>
                        )}
                        {precioCant > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase">x Cantidad</p>
                                <p className="text-base font-black text-amber-400">{fmt(form.precioCantidad)}</p>
                                <p className="text-[9px] text-amber-400/60">Ganas min {fmt(precioCant - costoN)}</p>
                            </div>
                        )}
                        {precioCuotas3 > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase">3 cuotas</p>
                                <p className="text-base font-black text-purple-400">3x {fmt(precioCuotas3 / 3)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
