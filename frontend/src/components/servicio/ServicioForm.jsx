import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

import { useServicioForm } from '../../hooks/useServicioForm';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';

import Card from '../ui/Card';
import CrearClienteModal from '../cliente/CrearClienteModal';
import CrearSedeModal    from '../CrearSedeModal';
import CrearEquipoModal  from '../CrearEquipoModal';

import SeccionCliente   from './SeccionCliente';
import SeccionRepuestos from './SeccionRepuestos';
import TicketResumen    from './TicketResumen';

export default function ServicioForm({ onSaved, servicioParaEditar = null }) {
  const {
    db, setDb, clienteId,
    esPresupuesto, setEsPresupuesto,
    ticketItems, setTicketItems,
    idEdicion, estaBloqueado, historialEquipo,
    itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    descuentoPorcentaje, setDescuentoPorcentaje,
    modalClienteAbierto, setModalClienteAbierto,
    nombreClientePrellenado, setNombreClientePrellenado,
    modalSedeAbierto, setModalSedeAbierto,
    nombreSedePrellenado, setNombreSedePrellenado,
    consultarAntecedentes, enviarWhatsAppMantenimiento,
    sumarRepuesto, actualizarCantidad, quitarRepuesto,
    editarItem, eliminarItem, agregarAlTicket,
    finalizar, refrescarDatos, onClienteSeleccionado,
    calcularGananciaRepuesto, calcularResumenGanancia,
    leyenda, setLeyenda,
    fechaServicio, setFechaServicio,
  } = useServicioForm(servicioParaEditar);

  const [modalEquipoAbierto, setModalEquipoAbierto]       = React.useState(false);
  const [numeroSeriePrellenado, setNumeroSeriePrellenado] = React.useState('');

  const isDark     = document.documentElement.classList.contains('dark');
  const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: estaBloqueado ? (isDark ? '#1E293B' : '#F1F5F9') : isDark ? '#0F172A' : '#F8FAFC',
      border: state.isFocused ? '1px solid #3B82F6' : isDark ? '1px solid #334155' : '1px solid #E2E8F0',
      borderRadius: '12px', minHeight: '55px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
      '&:hover': { border: estaBloqueado ? 'none' : '1px solid #3B82F6' },
      transition: 'all 0.2s ease'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
      color: state.isSelected ? '#FFF' : isDark ? '#CBD5E1' : '#334155',
      padding: '12px 15px', cursor: 'pointer'
    }),
    menu:        base => ({ ...base, background: isDark ? '#0F172A' : '#FFF', border: isDark ? '1px solid #334155' : 'none' }),
    singleValue: base => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
    placeholder: base => ({ ...base, color: '#94A3B8' })
  };

  const dispararPDF = () => {
    const sedeObj = db.sedes?.find(s => s.id.toString() === (itemActual.sedeId || ticketItems[0]?.sedeId)?.toString());
    const { totalConDescuento } = calcularResumenGanancia();
    generarRemitoPDFPremium({
      esPresupuesto, cliente: clienteObj, sede: sedeObj,
      tecnico: 'Marcos', ticketItems, descuentoPorcentaje,
      totalFinal: totalConDescuento,
      fechaServicio: fechaServicio,
      leyenda,
    });
  };

  const handleFinalizar = async (confirmar = false) => {
    const result = await finalizar(confirmar);
    if (result && onSaved) onSaved();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48 font-sans transition-colors duration-300">

      {estaBloqueado && (
        <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-center font-bold mb-5">
          🔒 REGISTRO YA COBRADO (SOLO LECTURA)
        </div>
      )}

      {!estaBloqueado && (
        <div className="flex gap-3 mb-6">
          <button onClick={() => { setEsPresupuesto(true); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${esPresupuesto ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            🛠️ Servicio Técnico
          </button>
          <button onClick={() => { setEsPresupuesto(false); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all duration-300 ${!esPresupuesto ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            🛒 Venta / Insumos
          </button>
        </div>
      )}

      {/* FECHA DEL SERVICIO */}
      {!estaBloqueado && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Fecha del servicio
            </label>
            <input
              type="date"
              value={fechaServicio}
              onChange={e => setFechaServicio(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
          {fechaServicio !== new Date().toISOString().split('T')[0] && (
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase">Carga histórica</p>
              <button
                onClick={() => setFechaServicio(new Date().toISOString().split('T')[0])}
                className="text-[9px] text-slate-400 hover:text-blue-500 font-bold mt-1"
              >
                Usar hoy
              </button>
            </div>
          )}
        </div>
      )}

      {idEdicion && !estaBloqueado && (
        <div className="text-center font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg mb-4 text-xs tracking-widest uppercase">
          ✏️ Editando Presupuesto #{idEdicion}
        </div>
      )}

      <Card className="shadow-sm">
        <SeccionCliente
          db={db} clienteId={clienteId} clienteObj={clienteObj}
          itemActual={itemActual} setItemActual={setItemActual}
          esPresupuesto={esPresupuesto} estaBloqueado={estaBloqueado}
          historialEquipo={historialEquipo} selectStyles={selectStyles}
          onClienteSeleccionado={onClienteSeleccionado}
          consultarAntecedentes={consultarAntecedentes}
          enviarWhatsAppMantenimiento={enviarWhatsAppMantenimiento}
          numeroSeriePrellenado={numeroSeriePrellenado}
          setNumeroSeriePrellenado={setNumeroSeriePrellenado}
          setModalEquipoAbierto={setModalEquipoAbierto}
          setNombreClientePrellenado={setNombreClientePrellenado}
          setModalClienteAbierto={setModalClienteAbierto}
          setNombreSedePrellenado={setNombreSedePrellenado}
          setModalSedeAbierto={setModalSedeAbierto}
        />
      </Card>

      {clienteId && (
        <Card className="mt-4 shadow-sm">
          <SeccionRepuestos
            db={db}
            itemActual={itemActual} setItemActual={setItemActual}
            repuestoElegido={repuestoElegido} setRepuestoElegido={setRepuestoElegido}
            esPresupuesto={esPresupuesto} estaBloqueado={estaBloqueado}
            selectStyles={selectStyles}
            sumarRepuesto={sumarRepuesto}
            actualizarCantidad={actualizarCantidad}
            quitarRepuesto={quitarRepuesto}
            agregarAlTicket={agregarAlTicket}
            calcularGananciaRepuesto={calcularGananciaRepuesto}
          />
        </Card>
      )}

      <TicketResumen
        ticketItems={ticketItems}
        estaBloqueado={estaBloqueado} idEdicion={idEdicion} esPresupuesto={esPresupuesto}
        descuentoPorcentaje={descuentoPorcentaje} setDescuentoPorcentaje={setDescuentoPorcentaje}
        leyenda={leyenda} setLeyenda={setLeyenda}
        calcularGananciaRepuesto={calcularGananciaRepuesto}
        calcularResumenGanancia={calcularResumenGanancia}
        editarItem={editarItem} eliminarItem={eliminarItem}
        handleFinalizar={handleFinalizar} dispararPDF={dispararPDF}
      />

      <CrearClienteModal isOpen={modalClienteAbierto} onClose={() => setModalClienteAbierto(false)}
        onClienteCreado={async c => { setDb({ ...db, clientes: [...db.clientes, c] }); onClienteSeleccionado(c.id.toString()); setModalClienteAbierto(false); await refrescarDatos(); }}
        clienteNombrePrellenado={nombreClientePrellenado} />

      <CrearSedeModal isOpen={modalSedeAbierto} onClose={() => setModalSedeAbierto(false)}
        onSedeCreada={async s => { setDb({ ...db, sedes: [...db.sedes, s] }); setItemActual({ ...itemActual, sedeId: s.id, sedeNombre: s.nombreSede }); setModalSedeAbierto(false); await refrescarDatos(); }}
        clienteId={clienteId} nombreSedePrellenado={nombreSedePrellenado} />

      <CrearEquipoModal isOpen={modalEquipoAbierto} onClose={() => setModalEquipoAbierto(false)}
        onEquipoCreado={async eq => { setDb({ ...db, equipos: [...db.equipos, eq] }); setItemActual({ ...itemActual, equipoSerial: eq.numeroSerie }); consultarAntecedentes(eq.numeroSerie); setModalEquipoAbierto(false); await refrescarDatos(); }}
        sedeId={itemActual.sedeId} numeroSeriePrellenado={numeroSeriePrellenado} />
    </div>
  );
}