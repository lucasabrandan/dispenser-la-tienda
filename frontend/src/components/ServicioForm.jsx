import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// Hooks y utils
import { useServicioForm } from '../hooks/useServicioForm';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

// Componentes UI
import Card from './ui/Card';
import CrearClienteModal from './CrearClienteModal';
import CrearSedeModal from './CrearSedeModal';
import CrearEquipoModal from './CrearEquipoModal';

export default function ServicioForm({ onSaved, servicioParaEditar = null }) {
  // ==========================================
  // USAR CUSTOM HOOK
  // ==========================================
  const {
    db,
    setDb,
    clienteId,
    setClienteId,
    esPresupuesto,
    setEsPresupuesto,
    ticketItems,
    setTicketItems,
    idEdicion,
    estaBloqueado,
    historialEquipo,
    itemActual,
    setItemActual,
    repuestoElegido,
    setRepuestoElegido,
    modalClienteAbierto,
    setModalClienteAbierto,
    nombreClientePrellenado,
    setNombreClientePrellenado,
    modalSedeAbierto,
    setModalSedeAbierto,
    nombreSedePrellenado,
    setNombreSedePrellenado,
    consultarAntecedentes,
    enviarWhatsAppMantenimiento,
    sumarRepuesto,
    actualizarCantidad,
    quitarRepuesto,
    editarItem,
    eliminarItem,
    agregarAlTicket,
    finalizar,
    refrescarDatos
  } = useServicioForm(servicioParaEditar);

  // NUEVOS ESTADOS: Para el modal de crear equipo
  const [modalEquipoAbierto, setModalEquipoAbierto] = React.useState(false);
  const [numeroSeriePrellenado, setNumeroSeriePrellenado] = React.useState('');

  // Detectar Modo Oscuro
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
      backgroundColor: state.isSelected
        ? '#3B82F6'
        : state.isFocused
        ? isDark
          ? '#1E293B'
          : '#EFF6FF'
        : isDark
        ? '#0F172A'
        : '#FFF',
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
    const sedeObj = db.sedes?.find(
      s => s.id.toString() === (itemActual.sedeId || ticketItems[0]?.sedeId)?.toString()
    );

    generarRemitoPDFPremium({
      esPresupuesto,
      cliente: clienteObj,
      sede: sedeObj,
      tecnico: 'Marcos',
      ticketItems,
      totalFinal: ticketItems.reduce((a, b) => a + b.totalCalculado, 0),
      fechaServicio: new Date().toISOString().split('T')[0]
    });
  };

  // ← MEJORADO: Con logs para debuggear
  const handleFinalizar = async (confirmarTrabajo = false) => {
    console.log('📤 Llamando finalizar...');
    const result = await finalizar(confirmarTrabajo);
    console.log('✅ Resultado de finalizar:', result);
    
    if (result) {
      console.log('🔄 Llamando onSaved...');
      if (onSaved) {
        onSaved();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48 font-sans transition-colors duration-300">
      {/* 🔒 AVISO DE BLOQUEO */}
      {estaBloqueado && (
        <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-center font-bold mb-5 shadow-sm">
          🔒 REGISTRO YA COBRADO (SOLO LECTURA)
        </div>
      )}

      {/* SWITCH DE MODO */}
      {!estaBloqueado && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              setEsPresupuesto(true);
              setTicketItems([]);
            }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${
              esPresupuesto
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            🛠️ SERVICIO TÉCNICO
          </button>
          <button
            onClick={() => {
              setEsPresupuesto(false);
              setTicketItems([]);
            }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${
              !esPresupuesto
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
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
          value={
            db.clientes?.find(c => c.id.toString() === clienteId)
              ? { label: db.clientes.find(c => c.id.toString() === clienteId).nombre }
              : null
          }
          onChange={s => {
            if (s?.__isNew__) {
              setNombreClientePrellenado(s.label);
              setModalClienteAbierto(true);
            } else {
              setClienteId(s?.value);
            }
          }}
          onCreateOption={inputValue => {
            setNombreClientePrellenado(inputValue);
            setModalClienteAbierto(true);
          }}
          placeholder="Buscar o crear cliente..."
        />
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
              options={db.sedes
                ?.filter(s => s.cliente?.id?.toString() === clienteId)
                .map(s => ({ value: s.id.toString(), label: s.nombreSede }))}
              value={
                db.sedes?.find(s => s.id === itemActual.sedeId)
                  ? { label: db.sedes.find(s => s.id === itemActual.sedeId).nombreSede }
                  : null
              }
              onChange={s => {
                if (s?.__isNew__) {
                  setNombreSedePrellenado(s.label);
                  setModalSedeAbierto(true);
                } else {
                  setItemActual({ ...itemActual, sedeId: parseInt(s?.value), sedeNombre: s.label });
                }
              }}
              onCreateOption={inputValue => {
                setNombreSedePrellenado(inputValue);
                setModalSedeAbierto(true);
              }}
              placeholder="Elegí la sede o creá una..."
            />
          </div>

          {/* EQUIPO (Solo si es TÉCNICO) */}
          {esPresupuesto && (
            <div className="mb-5">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                S/N Dispenser
              </label>
              <CreatableSelect
                isDisabled={estaBloqueado}
                styles={premiumStyles}
                options={db.equipos
                  ?.filter(e => e.sede?.id?.toString() === itemActual.sedeId?.toString())
                  .map(e => ({ value: e.numeroSerie, label: `S/N: ${e.numeroSerie}` }))}
                onChange={s => {
                  if (s?.__isNew__) {
                    setNumeroSeriePrellenado(s.label);
                    setModalEquipoAbierto(true);
                  } else {
                    setItemActual({ ...itemActual, equipoSerial: s?.value });
                    consultarAntecedentes(s?.value);
                  }
                }}
                onCreateOption={inputValue => {
                  setNumeroSeriePrellenado(inputValue);
                  setModalEquipoAbierto(true);
                }}
                value={itemActual.equipoSerial ? { label: itemActual.equipoSerial } : null}
                placeholder="Elegí o creá N/S..."
              />
              {historialEquipo && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest tracking-tight">
                      Antecedentes
                    </span>
                    <button
                      onClick={enviarWhatsAppMantenimiento}
                      className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black active:scale-95 transition-transform"
                    >
                      💬 WHATSAPP
                    </button>
                  </div>
                  <p className="m-0 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span className="opacity-50">{historialEquipo.fecha}</span> — {historialEquipo.items[0]?.trabajoRealizado}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AGREGAR REPUESTOS */}
          {!estaBloqueado && (
            <div className="flex gap-2 items-end mb-5">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Agregar Productos
                </label>
                <Select
                  styles={premiumStyles}
                  options={db.repuestos?.map(r => ({
                    ...r,
                    label: `${r.nombre} ($${r.precio})`,
                    value: r.id
                  }))}
                  onChange={setRepuestoElegido}
                  value={repuestoElegido}
                  placeholder="Buscar repuesto..."
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

          {/* LISTA DE REPUESTOS */}
          {itemActual.repuestosUsados.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-5">
              {itemActual.repuestosUsados.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0"
                >
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
                  <div className="font-black text-sm w-16 text-right text-slate-900 dark:text-white">${r.subtotal}</div>
                  {!estaBloqueado && (
                    <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">
                      ✕
                    </button>
                  )}
                </div>
              ))}
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

          {/* SUMAR AL TICKET */}
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

      {/* RESUMEN DEL TICKET */}
      {ticketItems.length > 0 && (
        <div className="mt-8 mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
            Resumen del Remito
          </h4>
          {ticketItems.map((it, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 shadow-sm flex justify-between items-start"
            >
              <div className="flex-1 pr-4">
                <div className={`font-black text-sm tracking-tight ${it.equipoSerial !== 'MOSTRADOR' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {it.equipoSerial || 'VENTA INSUMOS'}
                </div>
                <div className="text-xs mt-1.5 text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                  {it.resumenTexto}
                </div>
                <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white tracking-tighter">
                  ${it.totalCalculado.toLocaleString()}
                </div>
              </div>
              {!estaBloqueado && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => editarItem(idx)}
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl font-black text-[10px] uppercase"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarItem(idx)}
                    className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 p-2.5 rounded-xl font-black text-[10px] uppercase"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🚀 BARRA DE ACCIÓN FINAL */}
      {ticketItems.length > 0 && (
        <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
          <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl border border-slate-700">
            <div className="text-white">
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Final</div>
              <div className="text-3xl font-black tracking-tighter">
                ${ticketItems.reduce((a, b) => a + b.totalCalculado, 0).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={dispararPDF}
                className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center active:scale-90 transition-transform"
              >
                📄
              </button>
              {!estaBloqueado && (
                <>
                  <button
                    onClick={() => handleFinalizar(false)}
                    className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px] active:scale-95 transition-transform"
                  >
                    {idEdicion ? 'ACTUALIZAR' : 'GUARDAR'}
                  </button>
                  <button
                    onClick={() => handleFinalizar(true)}
                    className={`px-6 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all ${
                      esPresupuesto ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  >
                    CONFIRMAR
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR CLIENTE */}
      <CrearClienteModal
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        onClienteCreado={async clienteNuevo => {
          setDb({ ...db, clientes: [...db.clientes, clienteNuevo] });
          setClienteId(clienteNuevo.id.toString());
          setModalClienteAbierto(false);
          await refrescarDatos();
        }}
        clienteNombrePrellenado={nombreClientePrellenado}
      />

      {/* MODAL CREAR SEDE */}
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

      {/* MODAL CREAR EQUIPO */}
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