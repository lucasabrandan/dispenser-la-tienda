import React, { useState } from 'react';
import { LuBanknote, LuReceipt, LuPackage, LuCreditCard, LuCalculator, LuSearch } from 'react-icons/lu';

const inputBase = "w-full mt-1 p-3 rounded-xl text-sm font-bold outline-none transition-all border bg-chip border-black/[0.07] dark:border-white/[0.07] text-ink focus:ring-2 focus:ring-[#D13A28]/20";
const readonlyBase = "w-full mt-1 p-3 rounded-xl text-sm font-black outline-none border";
const labelBase = "text-label font-black uppercase tracking-wide";

const fmt = (v) => {
    const n = parseFloat(v);
    return n > 0 ? `$ ${Math.round(n).toLocaleString('es-AR')}` : '—';
};

function Seccion({ id, titulo, Icono, children, color = 'blue', seccionAbierta, onToggle }) {
    const abierta = seccionAbierta === id;
    const colores = {
        green:  'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30',
        blue:   'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30',
        amber:  'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30',
        purple: 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/50 dark:border-purple-800/30',
        teal:   'bg-teal-50/50 dark:bg-teal-900/10 border-teal-200/50 dark:border-teal-800/30',
    };
    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${abierta ? colores[color] : 'bg-[#F5F3F1] dark:bg-[#1C1C1C] border-black/[0.05] dark:border-white/[0.05]'}`}>
            <button type="button" onClick={() => onToggle(abierta ? '' : id)}
                className="w-full flex items-center justify-between p-3 text-left">
                <span className="text-label font-black text-ink uppercase tracking-wide flex items-center gap-1.5">
                    <Icono size={13} /> {titulo}
                </span>
                <span className={`text-label text-muted transition-transform ${abierta ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {abierta && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
}

export default function SeccionesPrecios({
    form, seccionAbierta, setSeccionAbierta, cambiarFinanciero, sanitizarNumero, setForm,
    cambiarCostoReal, toggleCostoReal, agregarCostoReal, quitarCostoReal,
}) {
    const [precioMercadoInput, setPrecioMercadoInput] = useState('');
    const [cantidadPresupuesto, setCantidadPresupuesto] = useState('');
    const [baseBudget, setBaseBudget] = useState('facturado');
    const precioNegro = parseFloat(form.precio) || 0;
    const costoN      = parseFloat(form.costo) || 0;
    const precioMercado = parseFloat(precioMercadoInput) || 0;
    const gananciaMercadoMonto = (precioMercado > 0 && costoN > 0) ? precioMercado - costoN : 0;
    const gananciaMercadoPct   = (precioMercado > 0 && costoN > 0) ? ((precioMercado / costoN) - 1) * 100 : 0;

    const costosReales = form.costosReales || [];
    const totalCostosRealesPct = costosReales
        .filter(c => c.activo)
        .reduce((acc, c) => acc + (parseFloat(c.porcentaje) || 0), 0);
    const precioFact  = parseFloat(form.precioFacturado) || 0;
    const netoCliente = parseFloat(form.precioNetoCliente) || 0;
    const precioCant  = parseFloat(form.precioCantidad) || 0;
    const precioCuotas3 = precioFact > 0 && form.porcentajeCuotas3 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas3) || 0) / 100) : 0;
    const precioCuotas6 = precioFact > 0 && form.porcentajeCuotas6 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas6) || 0) / 100) : 0;

    // Presupuesto rápido: proyecta costo/precio/ganancia total para N unidades.
    const cantPres = parseInt(cantidadPresupuesto) || 0;
    const precioUnitPres = baseBudget === 'efectivo' ? precioNegro : precioFact;
    const gananciaBrutaUnit = precioNegro - costoN;
    const totalCostoPres = costoN * cantPres;
    const totalPrecioPres = precioUnitPres * cantPres;
    const totalGananciaBrutaPres = gananciaBrutaUnit * cantPres;
    const costosRealesActivos = costosReales.filter(c => c.activo);
    const lineasCostosPres = baseBudget === 'facturado'
        ? costosRealesActivos.map(c => ({
            nombre: c.nombre || '(sin nombre)',
            monto: ((parseFloat(c.porcentaje) || 0) / 100) * precioFact * cantPres,
        }))
        : [];
    const totalCostosRealesPres = lineasCostosPres.reduce((acc, l) => acc + l.monto, 0);
    const totalGananciaNetaPres = totalGananciaBrutaPres - totalCostosRealesPres;

    return (
        <>
            {/* Precio negro */}
            <Seccion id="basico" titulo="Precio Efectivo (negro)" Icono={LuBanknote} color="green" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <p className="text-caption text-muted font-bold mb-2">
                    Lo que cobrás si el cliente paga en efectivo o transferencia, sin factura.
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={`${labelBase} text-muted`}>Costo $</label>
                        <input type="text" inputMode="decimal" value={form.costo}
                            onChange={e => cambiarFinanciero('costo', e.target.value)} placeholder="0" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-muted`}>Ganancia %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeGanancia}
                            onChange={e => cambiarFinanciero('porcentajeGanancia', e.target.value)} placeholder="0" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-brand-amber`}>Markup %</label>
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
                        <p className="text-body font-bold text-emerald-700 dark:text-emerald-400">
                            Ganancia: $ {Math.round(precioNegro - costoN).toLocaleString('es-AR')} por unidad
                        </p>
                        <p className="text-label text-muted font-bold mt-0.5">
                            Costo × (1 + Ganancia%) × (1 + Markup%). El Markup% es un extra opcional (ej. recargo tarjeta) — dejalo en 0 si no lo usás.
                        </p>
                    </div>
                )}

                {/* Comparador con precio de mercado */}
                <div className="mt-3 pt-3 border-t border-black/[0.08] dark:border-white/[0.08]">
                    <label className={`${labelBase} text-sky-600 dark:text-sky-400 flex items-center gap-1`}><LuSearch size={12} /> ¿Cuánto cobra la competencia?</label>
                    <input type="text" inputMode="decimal" value={precioMercadoInput}
                        onChange={e => setPrecioMercadoInput(sanitizarNumero(e.target.value))}
                        placeholder="Precio que viste en el mercado" className={inputBase} />
                    <p className="text-label text-muted font-bold mt-0.5">
                        No se guarda con el producto — es solo para calcular al toque.
                    </p>
                    {precioMercado > 0 && costoN > 0 && (
                        <div className="mt-2 bg-sky-100/30 dark:bg-sky-900/10 rounded-xl p-2 space-y-1">
                            <p className="text-body font-bold text-sky-700 dark:text-sky-400">
                                A ese precio ganarías: $ {Math.round(gananciaMercadoMonto).toLocaleString('es-AR')} por unidad ({gananciaMercadoPct.toFixed(0)}% sobre costo)
                            </p>
                            <button type="button"
                                onClick={() => cambiarFinanciero('porcentajeGanancia', gananciaMercadoPct.toFixed(2))}
                                className="text-label font-black text-sky-600 dark:text-sky-400 underline">
                                Usar esta Ganancia % arriba
                            </button>
                        </div>
                    )}
                </div>
            </Seccion>

            {/* Precio facturado */}
            <Seccion id="facturado" titulo="Precio Facturado (blanco)" Icono={LuReceipt} color="blue" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <p className="text-caption text-muted font-bold mb-2">
                    Lo que hay que cobrar CON factura para que, después de pagar impuestos, te quede en el
                    bolsillo la misma ganancia que en efectivo — no es un precio con más ganancia, es el
                    mismo margen "engordado" para cubrir el costo extra de facturar.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className={`${labelBase} text-muted`}>Costo blanco $</label>
                        <div className={`${readonlyBase} bg-chip border-black/[0.07] dark:border-white/[0.07] text-secondary`}>
                            {fmt(form.costoBlanco)}
                        </div>
                        <p className="text-label text-muted font-bold mt-0.5">Informativo: Costo + 21% IVA. No afecta el cálculo de abajo.</p>
                    </div>
                    <div>
                        <label className={`${labelBase} text-muted`}>Impuestos %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeImpuestos}
                            onChange={e => cambiarFinanciero('porcentajeImpuestos', e.target.value)} placeholder="0" className={inputBase} />
                        <p className="text-label text-muted font-bold mt-0.5">Extra de IIBB/cheques que el mercado te deje trasladar (normalmente 0 — el 21% de IVA ya se suma aparte, abajo)</p>
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
                        <p className="text-body font-bold text-blue-700 dark:text-blue-400">
                            {fmt(form.precioNetoCliente)} + 21% IVA = {fmt(form.precioFacturado)}
                        </p>
                        <p className="text-caption text-muted font-bold">
                            Tu ganancia (igual que en efectivo): $ {Math.round(precioNegro - costoN).toLocaleString('es-AR')} por unidad
                        </p>
                        <p className="text-caption text-muted font-bold">
                            Extra que cubre impuestos: $ {Math.round(netoCliente - precioNegro).toLocaleString('es-AR')} — no es ganancia tuya
                        </p>
                    </div>
                )}

                {/* Costos reales que bajan la ganancia, sin tocar el precio al cliente */}
                <div className="mt-3 pt-3 border-t border-black/[0.08] dark:border-white/[0.08]">
                    <p className={`${labelBase} text-muted mb-1.5`}>
                        Costos reales que te bajan la ganancia (IIBB, tarjeta...) — no se le cobran al cliente
                    </p>
                    {costosReales.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-1.5">
                            <input type="checkbox" checked={c.activo} onChange={() => toggleCostoReal(idx)}
                                className="w-4 h-4 accent-[#D13A28] shrink-0" />
                            <input type="text" value={c.nombre}
                                onChange={e => cambiarCostoReal(idx, 'nombre', e.target.value)}
                                placeholder="Nombre (ej: IIBB)" className={`${inputBase} mt-0 flex-1 text-label`} />
                            <input type="text" inputMode="decimal" value={c.porcentaje}
                                onChange={e => cambiarCostoReal(idx, 'porcentaje', e.target.value)}
                                placeholder="%" className={`${inputBase} mt-0 w-16 text-label text-center`} />
                            <button type="button" onClick={() => quitarCostoReal(idx)}
                                className="text-muted text-lg leading-none px-1 shrink-0">×</button>
                        </div>
                    ))}
                    <button type="button" onClick={agregarCostoReal}
                        className="text-label font-black text-brand-amber underline mt-0.5">
                        + Agregar costo
                    </button>
                    <p className="text-label text-muted font-bold mt-1.5">
                        Destildá o borrá los que no apliquen a esta venta (ej. si el cliente no paga con tarjeta).
                        No se guardan con el producto — se resetean cada vez que abrís el formulario.
                    </p>
                    {precioFact > 0 && costoN > 0 && (
                        <div className="mt-2 bg-indigo-100/30 dark:bg-indigo-900/10 rounded-xl p-2">
                            <p className="text-body font-black text-indigo-700 dark:text-indigo-400">
                                Ganancia neta real: $ {Math.round((precioNegro - costoN) - (totalCostosRealesPct / 100) * precioFact).toLocaleString('es-AR')} por unidad
                            </p>
                        </div>
                    )}
                </div>
            </Seccion>

            {/* Precio por cantidad */}
            <Seccion id="cantidad" titulo="Precio por Cantidad" Icono={LuPackage} color="amber" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <p className="text-caption text-muted font-bold mb-2">
                    Precio especial si compran varias unidades juntas (mayorista) — vos elegís cuánto ceder de ganancia.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`${labelBase} text-muted`}>Desde (unid.)</label>
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
                        <p className="text-body font-bold text-amber-700 dark:text-amber-400">
                            Ganancia minima: $ {Math.round(precioCant - costoN).toLocaleString('es-AR')} por unidad
                        </p>
                        {precioNegro > 0 && (
                            <p className="text-caption text-muted font-bold">
                                Descuento: {Math.round((1 - precioCant / precioNegro) * 100)}% vs precio efectivo
                            </p>
                        )}
                    </div>
                )}
            </Seccion>

            {/* Cuotas */}
            <Seccion id="cuotas" titulo="Cuotas / MercadoLibre" Icono={LuCreditCard} color="purple" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={`${labelBase} text-muted`}>Recargo 3 cuotas %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeCuotas3}
                            onChange={e => setForm({ ...form, porcentajeCuotas3: sanitizarNumero(e.target.value) })}
                            placeholder="Ej: 15" className={inputBase} />
                        {precioCuotas3 > 0 && (
                            <p className="text-body text-purple-600 dark:text-purple-400 font-bold mt-1">
                                3x $ {Math.round(precioCuotas3 / 3).toLocaleString('es-AR')} = {fmt(precioCuotas3)}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={`${labelBase} text-muted`}>Recargo 6 cuotas %</label>
                        <input type="text" inputMode="decimal" value={form.porcentajeCuotas6}
                            onChange={e => setForm({ ...form, porcentajeCuotas6: sanitizarNumero(e.target.value) })}
                            placeholder="Ej: 30" className={inputBase} />
                        {precioCuotas6 > 0 && (
                            <p className="text-body text-purple-600 dark:text-purple-400 font-bold mt-1">
                                6x $ {Math.round(precioCuotas6 / 6).toLocaleString('es-AR')} = {fmt(precioCuotas6)}
                            </p>
                        )}
                    </div>
                </div>
                <p className="text-caption text-muted font-bold mt-2">
                    Se calcula sobre el precio facturado. Deja vacio lo que no uses.
                </p>
            </Seccion>

            {/* Presupuesto rápido por cantidad */}
            <Seccion id="presupuesto" titulo="Presupuesto Rápido (por cantidad)" Icono={LuCalculator} color="teal" seccionAbierta={seccionAbierta} onToggle={setSeccionAbierta}>
                <p className="text-caption text-muted font-bold mb-2">
                    Poné una cantidad de unidades y mirá cuánto te queda en total — ya descontados los costos reales (IIBB, tarjeta) si elegís "Facturado".
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                        <label className={`${labelBase} text-muted`}>Cantidad de unidades</label>
                        <input type="text" inputMode="numeric" value={cantidadPresupuesto}
                            onChange={e => setCantidadPresupuesto(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Ej: 100" className={inputBase} />
                    </div>
                    <div>
                        <label className={`${labelBase} text-muted`}>Base de cálculo</label>
                        <div className="flex gap-1.5 mt-1">
                            <button type="button" onClick={() => setBaseBudget('efectivo')}
                                className={`flex-1 py-3 rounded-xl text-label font-black uppercase transition-all ${baseBudget === 'efectivo' ? 'bg-emerald-500 text-white' : 'bg-chip text-muted'}`}>
                                Efectivo
                            </button>
                            <button type="button" onClick={() => setBaseBudget('facturado')}
                                className={`flex-1 py-3 rounded-xl text-label font-black uppercase transition-all ${baseBudget === 'facturado' ? 'bg-blue-500 text-white' : 'bg-chip text-muted'}`}>
                                Facturado
                            </button>
                        </div>
                    </div>
                </div>

                {cantPres > 0 && precioUnitPres > 0 ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-chip rounded-xl p-2">
                                <p className="text-label font-black text-muted uppercase">Costo total</p>
                                <p className="text-sm font-black text-ink">{fmt(totalCostoPres)}</p>
                            </div>
                            <div className="bg-teal-100/40 dark:bg-teal-900/15 rounded-xl p-2">
                                <p className="text-label font-black text-muted uppercase">Precio total</p>
                                <p className="text-sm font-black text-teal-700 dark:text-teal-400">{fmt(totalPrecioPres)}</p>
                            </div>
                            <div className="bg-teal-100/40 dark:bg-teal-900/15 rounded-xl p-2">
                                <p className="text-label font-black text-muted uppercase">Ganancia bruta</p>
                                <p className="text-sm font-black text-teal-700 dark:text-teal-400">{fmt(totalGananciaBrutaPres)}</p>
                            </div>
                        </div>

                        {baseBudget === 'facturado' && lineasCostosPres.length > 0 && (
                            <div className="bg-[#F5F3F1] dark:bg-[#1C1C1C] rounded-xl p-2.5">
                                <p className="text-label font-black text-muted uppercase mb-1.5">Desguace por costos reales ({cantPres} unid.)</p>
                                {lineasCostosPres.map((l, idx) => (
                                    <div key={idx} className="flex justify-between text-body font-bold text-secondary py-0.5">
                                        <span>{l.nombre}</span>
                                        <span>− {fmt(l.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-indigo-100/40 dark:bg-indigo-900/15 rounded-xl p-2.5">
                            <p className="text-label font-black text-muted uppercase">Ganancia neta real total</p>
                            <p className="text-base font-black text-indigo-700 dark:text-indigo-400">{fmt(totalGananciaNetaPres)}</p>
                            {baseBudget === 'efectivo' && (
                                <p className="text-label text-muted font-bold mt-0.5">En efectivo no hay costos reales de facturación que descontar.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-caption text-muted font-bold">Cargá costo y ganancia arriba, y una cantidad, para ver el total.</p>
                )}
            </Seccion>

            {/* Resumen */}
            {(precioNegro > 0 || precioFact > 0) && (
                <div className="bg-ink/10 rounded-2xl p-3">
                    <p className="text-label font-black text-muted uppercase mb-2">Resumen de precios</p>
                    <div className="grid grid-cols-2 gap-2">
                        {precioNegro > 0 && (
                            <div>
                                <p className="text-label font-black text-muted uppercase">Efectivo</p>
                                <p className="text-base font-black text-emerald-400">{fmt(form.precio)}</p>
                                <p className="text-label text-emerald-400/60">Ganas {fmt(precioNegro - costoN)}</p>
                            </div>
                        )}
                        {netoCliente > 0 && (
                            <div>
                                <p className="text-label font-black text-muted uppercase">Al cliente</p>
                                <p className="text-base font-black text-blue-400">{fmt(form.precioNetoCliente)}</p>
                                <p className="text-label text-blue-400/60">+ IVA = {fmt(form.precioFacturado)}</p>
                            </div>
                        )}
                        {precioCant > 0 && (
                            <div>
                                <p className="text-label font-black text-muted uppercase">x Cantidad</p>
                                <p className="text-base font-black text-amber-400">{fmt(form.precioCantidad)}</p>
                                <p className="text-label text-amber-400/60">Ganas min {fmt(precioCant - costoN)}</p>
                            </div>
                        )}
                        {precioCuotas3 > 0 && (
                            <div>
                                <p className="text-label font-black text-muted uppercase">3 cuotas</p>
                                <p className="text-base font-black text-purple-400">3x {fmt(precioCuotas3 / 3)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
