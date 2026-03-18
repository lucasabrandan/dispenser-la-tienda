import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

import { useServicioForm } from '../hooks/useServicioForm';
import { generarRemitoPDFPremium } from './utils/generadorPdfRemito';

import Card from './ui/Card';
import CrearClienteModal from './CrearClienteModal';
import CrearSedeModal from './CrearSedeModal';
import CrearEquipoModal from './CrearEquipoModal';

export default function ServicioForm({ onSaved, servicioParaEditar = null }) {
  const {
    db, setDb,
    clienteId, setClienteId,
    esPresupuesto, setEsPresupuesto,
    ticketItems, setTicketItems,
    idEdicion,
    estaBloqueado,
    historialEquipo,
    itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    descuentoPorcentaje, setDescuentoPorcentaje,
    modalClienteAbierto, setModalClienteAbierto,
    nombreClientePrellenado, setNombreClientePrellenado,
    modalSedeAbierto, setModalSedeAbierto,
    nombreSedePrellenado, setNombreSedePrellenado,
    consultarAntecedentes,
    enviarWhatsAppMantenimiento,
    sumarRepuesto,
    actualizarCantidad,
    quitarRepuesto,
    editarItem,
    eliminarItem,
    agregarAlTicket,
    finalizar,
    refrescarDatos,
    onClienteSeleccionado,
    calcularGananciaRepuesto,
    calcularResumenGanancia
  } = useServicioForm(servicioParaEditar);

  const [modalEquipoAbierto, setModalEquipoAbierto] = React.useState(false);
  const [numeroSeriePrellenado, setNumeroSeriePrellenado] = React.useState('');

  const isDark = document.documentElement.classList.contains('dark');

  const premiumStyles = {
    control: (base, state) => ({
      ...base,
      background: estaBloqueado ? (isDark ? '#1E293B' : '#F1F5F9') : isDark ? '#0F172A' : '#F8FAFC',
      border: state.isFocused ? '1px solid #3B82F6' : isDark ? '1px solid #334155' : '1px solid #E2E8F0',
      borderRadius: '12px',
      minHeight: '55px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
      '&:hover': { border: estaBloqueado ? 'none' : '1px solid #3B82F6' },
      transition: 'all 0.2s ease'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
      color: state.isSelected ? '#FFF' : isDark ? '#CBD5E1' : '#334155',
      padding: '12px 15px',
      cursor: 'pointer'
    }),
    menu: base => ({ ...base, background: isDark ? '#0F172A' : '#FFF', border: isDark ? '1px solid #334155' : 'none' }),
    singleValue: base => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
    placeholder: base => ({ ...base, color: '#94A3B8' })
  };

  const dispararPDF = () => {
    const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
    const sedeObj = db.sedes?.find(s => s.id.toString() === (itemActual.sedeId || ticketItems[0]?.sedeId)?.toString());
    const { totalConDescuento } = calcularResumenGanancia();
    generarRemitoPDFPremium({
      esPresupuesto, cliente: clienteObj, sede: sedeObj,
      tecnico: 'Marcos', ticketItems, descuentoPorcentaje,
      totalFinal: totalConDescuento,
      fechaServicio: new Date().toISOString().split('T')[0]
    });
  };

  const handleFinalizar = async (confirmarTrabajo = false) => {
    const result = await finalizar(confirmarTrabajo);
    if (result && onSaved) onSaved();
  };

  // Info del cliente seleccionado para mostrar debajo del selector
  const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
  const resumen = ticketItems.length > 0 ? calcularResumenGanancia() : null;
  const totalBruto = ticketItems.reduce((a, b) => a + b.totalCalculado, 0);
  const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
  const totalFinal = totalBruto - descuentoMonto;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48 font-sans transition-colors duration-300">

      {estaBloqueado && (
        <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-center font-bold mb-5 shadow-sm">
          🔒 REGISTRO YA COBRADO (SOLO LECTURA)
        </div>
      )}

      {/* SWITCH DE MODO */}
      {!estaBloqueado && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => { setEsPresupuesto(true); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${esPresupuesto ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
          >
            🛠️ SERVICIO TÉCNICO
          </button>
          <button
            onClick={() => { setEsPresupuesto(false); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${!esPresupuesto ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
          >
            🛒 VENTA / INSUMOS
          </button>
        </div>
      )}

      {idEdicion && !estaBloqueado && (
        <div className="text-center font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg mb-4 text-xs tracking-widest uppercase">
          ✏️ Editando Presupuesto #{idEdicion}
        </div>
      )}

      {/* CLIENTE */}
      <Card className="shadow-sm">
        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
          Cliente
        </label>
        <CreatableSelect
          isDisabled={estaBloqueado}
          styles={premiumStyles}
          options={db.clientes?.map(c => ({ value: c.id.toString(), label: c.nombre }))}
          value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
          onChange={s => {
            if (s?.__isNew__) { setNombreClientePrellenado(s.label); setModalClienteAbierto(true); }
            else { onClienteSeleccionado(s?.value); }
          }}
          onCreateOption={inputValue => { setNombreClientePrellenado(inputValue); setModalClienteAbierto(true); }}
          placeholder="Buscar o crear cliente..."
        />

        {/* INFO DEL CLIENTE — se muestra automáticamente al seleccionar */}
        {clienteObj && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 grid grid-cols-2 gap-2">
            {clienteObj.telefono && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Teléfono</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.telefono}</p>
              </div>
            )}
            {clienteObj.localidad && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Localidad</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.localidad}</p>
              </div>
            )}
            {clienteObj.calle && (
              <div className="col-span-2">
                <p className="text-[9px] font-black text-slate-400 uppercase">Dirección</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">
                  {clienteObj.calle} {clienteObj.numero}{clienteObj.piso ? `, piso ${clienteObj.piso}` : ''}
                </p>
              </div>
            )}
            {clienteObj.condicionIva && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">IVA</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.condicionIva}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {clienteId && (
        <Card className="mt-4 shadow-sm">

          {/* SEDE */}
          <div className="mb-5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              Sede / Domicilio
            </label>
            <CreatableSelect
              isDisabled={estaBloqueado}
              styles={premiumStyles}
              options={db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId).map(s => ({ value: s.id.toString(), label: s.nombreSede }))}
              value={db.sedes?.find(s => s.id === itemActual.sedeId) ? { label: db.sedes.find(s => s.id === itemActual.sedeId).nombreSede } : null}
              onChange={s => {
                if (s?.__isNew__) { setNombreSedePrellenado(s.label); setModalSedeAbierto(true); }
                else { setItemActual({ ...itemActual, sedeId: parseInt(s?.value), sedeNombre: s.label }); }
              }}
              onCreateOption={inputValue => { setNombreSedePrellenado(inputValue); setModalSedeAbierto(true); }}
              placeholder="Elegí la sede o creá una..."
            />
          </div>

          {/* EQUIPO (solo técnico) */}
          {esPresupuesto && (
            <div className="mb-5">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                S/N Dispenser
              </label>
              <CreatableSelect
                isDisabled={estaBloqueado}
                styles={premiumStyles}
                options={db.equipos?.filter(e => e.sede?.id?.toString() === itemActual.sedeId?.toString()).map(e => ({ value: e.numeroSerie, label: `S/N: ${e.numeroSerie}` }))}
                onChange={s => {
                  if (s?.__isNew__) { setNumeroSeriePrellenado(s.label); setModalEquipoAbierto(true); }
                  else { setItemActual({ ...itemActual, equipoSerial: s?.value }); consultarAntecedentes(s?.value); }
                }}
                onCreateOption={inputValue => { setNumeroSeriePrellenado(inputValue); setModalEquipoAbierto(true); }}
                value={itemActual.equipoSerial ? { label: itemActual.equipoSerial } : null}
                placeholder="Elegí o creá N/S..."
              />
              {historialEquipo && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Antecedentes</span>
                    <button onClick={enviarWhatsAppMantenimiento} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black active:scale-95 transition-transform">💬 WHATSAPP</button>
                  </div>
                  <p className="m-0 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span className="opacity-50">{historialEquipo.fecha}</span> — {historialEquipo.items[0]?.trabajoRealizado}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BUSCADOR DE REPUESTOS — por SKU o nombre */}
          {!estaBloqueado && (
            <div className="flex gap-2 items-end mb-5">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Agregar Repuesto — buscar por nombre o SKU
                </label>
                <Select
                  styles={premiumStyles}
                  options={db.repuestos?.map(r => ({
                    ...r,
                    label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                    subLabel: `$${r.precio}`,
                    value: r.id
                  }))}
                  filterOption={(option, inputValue) => {
                    const val = inputValue.toLowerCase();
                    return (
                      option.data.nombre?.toLowerCase().includes(val) ||
                      option.data.sku?.toLowerCase().includes(val)
                    );
                  }}
                  formatOptionLabel={opt => (
                    <div className="flex justify-between items-center">
                      <div>
                        {opt.sku && <span className="text-[9px] font-black text-blue-400 mr-2 uppercase">{opt.sku}</span>}
                        <span className="font-bold text-sm">{opt.nombre}</span>
                      </div>
                      <span className="text-emerald-500 font-black text-xs">${opt.precio}</span>
                    </div>
                  )}
                  onChange={setRepuestoElegido}
                  value={repuestoElegido}
                  placeholder="Buscar por nombre o SKU..."
                />
              </div>
              <button
                onClick={sumarRepuesto}
                className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black shadow-lg shadow-slate-900/20 active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          )}

          {/* LISTA DE REPUESTOS con ganancia por línea */}
          {itemActual.repuestosUsados.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-5">
              {itemActual.repuestosUsados.map((r, i) => {
                const g = calcularGananciaRepuesto(r, r.cantidad);
                return (
                  <div key={i} className="py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{r.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-bold">${r.precio} c/u</div>
                      </div>
                      <input
                        disabled={estaBloqueado}
                        type="number"
                        value={r.cantidad}
                        min="1"
                        onChange={e => actualizarCantidad(i, e.target.value)}
                        className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black text-slate-900 dark:text-white mr-3"
                      />
                      <div className="font-black text-sm w-16 text-right text-slate-900 dark:text-white">${g.subtotal.toLocaleString()}</div>
                      {!estaBloqueado && (
                        <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                      )}
                    </div>
                    {/* Ganancia por línea */}
                    {g.ganancia > 0 && (
                      <div className="flex gap-3 mt-1 ml-1">
                        <span className="text-[9px] font-black text-emerald-500">
                          Ganancia: ${g.ganancia.toFixed(0)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          Margen: {g.margen}%
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          Costo: ${g.costoTotal.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* DESCRIPCIÓN DEL TRABAJO */}
          <textarea
            disabled={estaBloqueado}
            placeholder="Descripción detallada del trabajo..."
            value={itemActual.trabajo}
            onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          />

          {/* MANO DE OBRA / ENVÍO */}
          <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-2xl mb-5 shadow-inner">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {esPresupuesto ? 'Mano de Obra ($)' : 'Costo de Envío ($)'}
            </label>
            <input
              disabled={estaBloqueado}
              type="number"
              min="0"
              value={itemActual.costoExtra}
              onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
            />
          </div>

          {!estaBloqueado && (
            <button
              onClick={agregarAlTicket}
              className="w-full h-14 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
            >
              SUMAR AL TICKET +
            </button>
          )}
        </Card>
      )}

      {/* DESCUENTO — solo visible cuando hay items en el ticket */}
      {ticketItems.length > 0 && !estaBloqueado && (
        <Card className="mt-4 shadow-sm">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Descuento (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="100"
              value={descuentoPorcentaje}
              onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-24 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="font-black text-slate-400 text-xl">%</span>
            {descuentoPorcentaje > 0 && (
              <div className="flex-1 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Descuento aplicado</p>
                <p className="text-lg font-black text-rose-500">- ${descuentoMonto.toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {[5, 10, 15, 20].map(p => (
              <button
                key={p}
                onClick={() => setDescuentoPorcentaje(p)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                  descuentoPorcentaje === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* RESUMEN DEL TICKET */}
      {ticketItems.length > 0 && (
        <div className="mt-6 mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
            Resumen del Remito
          </h4>
          {ticketItems.map((it, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 shadow-sm flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className={`font-black text-sm tracking-tight ${it.equipoSerial !== 'MOSTRADOR' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {it.equipoSerial || 'VENTA INSUMOS'}
                </div>
                <div className="text-xs mt-1.5 text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                  {it.resumenTexto}
                </div>

                {/* Detalle de ganancia por item del ticket */}
                {it.repuestosUsados?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {it.repuestosUsados.map((r, ri) => {
                      const g = calcularGananciaRepuesto(r, r.cantidad);
                      return (
                        <div key={ri} className="flex justify-between text-[9px] font-bold text-slate-400">
                          <span>{r.cantidad}x {r.nombre}</span>
                          {g.ganancia > 0 && (
                            <span className="text-emerald-500">+${g.ganancia.toFixed(0)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white tracking-tighter">
                  ${it.totalCalculado.toLocaleString()}
                </div>
              </div>
              {!estaBloqueado && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => editarItem(idx)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl font-black text-[10px] uppercase">Editar</button>
                  <button onClick={() => eliminarItem(idx)} className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 p-2.5 rounded-xl font-black text-[10px] uppercase">Quitar</button>
                </div>
              )}
            </div>
          ))}

          {/* PANEL DE GANANCIA TOTAL */}
          {resumen && resumen.gananciaBruta > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mt-2">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">📊 Rentabilidad del Remito</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Total Venta</p>
                  <p className="font-black text-slate-800 dark:text-white">${resumen.totalVenta.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Costo Total</p>
                  <p className="font-black text-slate-800 dark:text-white">${resumen.totalCosto.toFixed(0)}</p>
                </div>
                {resumen.descuento > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Descuento {descuentoPorcentaje}%</p>
                    <p className="font-black text-rose-500">- ${resumen.descuento.toFixed(0)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Ganancia Neta</p>
                  <p className="font-black text-emerald-600 text-lg">${resumen.gananciaBruta.toFixed(0)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Margen Final</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, resumen.margenFinal)}%` }} />
                    </div>
                    <span className="font-black text-emerald-600 text-sm">{resumen.margenFinal}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BARRA DE ACCIÓN FINAL */}
      {ticketItems.length > 0 && (
        <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
          <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl border border-slate-700">
            <div className="text-white">
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                Total Final {descuentoPorcentaje > 0 && <span className="text-rose-400">(-{descuentoPorcentaje}%)</span>}
              </div>
              <div className="text-3xl font-black tracking-tighter">
                ${totalFinal.toLocaleString()}
              </div>
              {descuentoPorcentaje > 0 && (
                <div className="text-[9px] text-slate-500 line-through">${totalBruto.toLocaleString()}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={dispararPDF} className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center active:scale-90 transition-transform">📄</button>
              {!estaBloqueado && (
                <>
                  <button onClick={() => handleFinalizar(false)} className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px] active:scale-95 transition-transform">
                    {idEdicion ? 'ACTUALIZAR' : 'GUARDAR'}
                  </button>
                  <button onClick={() => handleFinalizar(true)} className={`px-6 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all ${esPresupuesto ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                    CONFIRMAR
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALES */}
      <CrearClienteModal
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        onClienteCreado={async clienteNuevo => {
          setDb({ ...db, clientes: [...db.clientes, clienteNuevo] });
          onClienteSeleccionado(clienteNuevo.id.toString());
          setModalClienteAbierto(false);
          await refrescarDatos();
        }}
        clienteNombrePrellenado={nombreClientePrellenado}
      />
      <CrearSedeModal
        isOpen={modalSedeAbierto}
        onClose={() => setModalSedeAbierto(false)}
        onSedeCreada={async sedeNueva => {
          setDb({ ...db, sedes: [...db.sedes, sedeNueva] });
          setItemActual({ ...itemActual, sedeId: sedeNueva.id, sedeNombre: sedeNueva.nombreSede });
          setModalSedeAbierto(false);
          await refrescarDatos();
        }}
        clienteId={clienteId}
        nombreSedePrellenado={nombreSedePrellenado}
      />
      <CrearEquipoModal
        isOpen={modalEquipoAbierto}
        onClose={() => setModalEquipoAbierto(false)}
        onEquipoCreado={async equipoNuevo => {
          setDb({ ...db, equipos: [...db.equipos, equipoNuevo] });
          setItemActual({ ...itemActual, equipoSerial: equipoNuevo.numeroSerie });
          consultarAntecedentes(equipoNuevo.numeroSerie);
          setModalEquipoAbierto(false);
          await refrescarDatos();
        }}
        sedeId={itemActual.sedeId}
        numeroSeriePrellenado={numeroSeriePrellenado}
      />
    </div>
  );
}
