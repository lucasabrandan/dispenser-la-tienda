import React from 'react';
import { useServicioForm } from '../../hooks/useServicioForm';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

import Card from '../ui/Card';
import CrearClienteModal from '../cliente/CrearClienteModal';
import CrearSedeModal    from '../CrearSedeModal';
import CrearEquipoModal  from '../CrearEquipoModal';
import SeccionCliente    from './SeccionCliente';
import ItemEquipoForm    from './ItemEquipoForm';
import TicketResumen     from './TicketResumen';

/**
 * ServicioForm — flujo unificado
 *
 * 1. Cliente — buscar/crear registrado O escribir nombre libre
 * 2. ItemEquipoForm — por cada equipo: S/N + modelo + ubicación + trabajo + repuestos + MO
 * 3. TicketResumen — items + descuento + leyenda + barra final
 */
export default function ServicioForm({ onSaved, servicioParaEditar = null, soloTecnico = false }) {
  const {
    db, setDb, clienteId, setClienteId,
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

  // Estado para cliente libre (sin registrar)
  const [nombreLibre, setNombreLibre]       = React.useState('');
  const [registrarCliente, setRegistrarCliente] = React.useState(false);
  const [datosExtra, setDatosExtra]         = React.useState({
    telefono: '', email: '', calle: '', numero: '',
    localidad: '', provincia: 'Buenos Aires', notas: ''
  });

  const isDark     = document.documentElement.classList.contains('dark');
  const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);

  // Si hay nombre libre pero no cliente registrado, usamos nombre libre en PDF y guardado
  const nombreFinal = clienteObj?.nombre || nombreLibre || 'Particular';

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: estaBloqueado ? (isDark ? '#1E293B' : '#F1F5F9') : isDark ? '#0F172A' : '#F8FAFC',
      border: state.isFocused ? '1px solid #3B82F6' : isDark ? '1px solid #334155' : '1px solid #E2E8F0',
      borderRadius: '12px', minHeight: '55px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
      '&:hover': { border: estaBloqueado ? 'none' : '1px solid #3B82F6' },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
      color: state.isSelected ? '#FFF' : isDark ? '#CBD5E1' : '#334155',
      padding: '12px 15px',
    }),
    menu:        base => ({ ...base, background: isDark ? '#0F172A' : '#FFF', border: isDark ? '1px solid #334155' : 'none' }),
    singleValue: base => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
    placeholder: base => ({ ...base, color: '#94A3B8' }),
  };

  const inputCls = "w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold";

  const dispararPDF = () => {
    const sedeObj = db.sedes?.find(s => s.id.toString() === (itemActual.sedeId || ticketItems[0]?.sedeId)?.toString());
    const { totalConDescuento } = calcularResumenGanancia();
    generarRemitoPDFPremium({
      esPresupuesto,
      cliente: clienteObj || { nombre: nombreFinal, telefono: datosExtra.telefono },
      sede: sedeObj || { nombreSede: 'Mostrador' },
      tecnico: 'Marcos', ticketItems, descuentoPorcentaje,
      totalFinal: totalConDescuento,
      fechaServicio, leyenda,
    });
  };

  const handleFinalizar = async (confirmar = false) => {
    // Registrar cliente libre si corresponde
    if (!clienteId && registrarCliente && nombreLibre.trim()) {
      try {
        const res = await api.post('/clientes', {
          clienteTipo: 'PARTICULAR',
          nombre:      nombreLibre.trim(),
          telefono:    datosExtra.telefono?.trim() || null,
          email:       datosExtra.email?.trim()    || null,
          condicionIva: 'CONSUMIDOR_FINAL',
          calle:       datosExtra.calle?.trim()    || 'Sin dirección',
          numero:      datosExtra.numero?.trim()   || '0',
          localidad:   datosExtra.localidad?.trim() || 'Sin localidad',
          provincia:   datosExtra.provincia        || 'Buenos Aires',
          notas:       datosExtra.notas?.trim()    || null,
        });
        toast.success(`👤 Cliente "${res.data.nombre}" registrado`);
        setDb(prev => ({ ...prev, clientes: [...prev.clientes, res.data] }));
        setClienteId(res.data.id.toString());
      } catch { toast.error('Error al registrar cliente'); }
    }

    const overrides = !clienteId && nombreLibre.trim()
      ? { clienteNombre: nombreLibre.trim(), sedeId: 1, sedeNombre: 'Mostrador' }
      : {};

    const result = await finalizar(confirmar, overrides);
    if (result && onSaved) onSaved();
  };

  // Mostrar sección de trabajo si hay cliente (registrado o nombre libre)
  const puedeCargarTrabajo = clienteId || nombreLibre.trim().length >= 2;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-4 pb-48 font-sans transition-colors">

      {estaBloqueado && (
        <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 text-center font-bold p-4 rounded-2xl mb-5">
          🔒 REGISTRO YA COBRADO (SOLO LECTURA)
        </div>
      )}

      {/* SWITCH TIPO */}
      {!estaBloqueado && !soloTecnico && (
        <div className="flex gap-3 mb-4">
          <button onClick={() => { setEsPresupuesto(true); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${esPresupuesto ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            🛠️ Servicio Técnico
          </button>
          <button onClick={() => { setEsPresupuesto(false); setTicketItems([]); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${!esPresupuesto ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            🛒 Venta / Insumos
          </button>
        </div>
      )}

      {/* FECHA */}
      {!estaBloqueado && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Fecha del servicio
            </label>
            <input type="date" value={fechaServicio}
              onChange={e => setFechaServicio(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
          {fechaServicio !== new Date().toISOString().split('T')[0] && (
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase">Carga histórica</p>
              <button onClick={() => setFechaServicio(new Date().toISOString().split('T')[0])}
                className="text-[9px] text-slate-400 hover:text-blue-500 font-bold mt-1">
                Usar hoy
              </button>
            </div>
          )}
        </div>
      )}

      {idEdicion && !estaBloqueado && (
        <div className="text-center font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg mb-4 text-xs uppercase">
          ✏️ Editando Presupuesto #{idEdicion}
        </div>
      )}

      {/* CARD CLIENTE */}
      <Card className="shadow-sm mb-4">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          Cliente
        </label>

        {/* Si no hay cliente registrado seleccionado, mostrar input libre + buscador */}
        {!clienteId && !estaBloqueado && !idEdicion ? (
          <div className="space-y-3">
            {/* Input nombre libre */}
            <div>
              <input type="text" value={nombreLibre}
                onChange={e => setNombreLibre(e.target.value)}
                placeholder="Nombre del cliente (requerido para guardar)..."
                className={inputCls}
              />
            </div>

            {/* Buscar en lista */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                O buscar cliente registrado
              </label>
              <SeccionCliente
                db={db} clienteId={clienteId} clienteObj={clienteObj}
                itemActual={itemActual} setItemActual={setItemActual}
                esPresupuesto={esPresupuesto} estaBloqueado={estaBloqueado}
                historialEquipo={null} selectStyles={selectStyles}
                onClienteSeleccionado={(id) => { onClienteSeleccionado(id); setNombreLibre(''); }}
                consultarAntecedentes={consultarAntecedentes}
                enviarWhatsAppMantenimiento={enviarWhatsAppMantenimiento}
                numeroSeriePrellenado={numeroSeriePrellenado}
                setNumeroSeriePrellenado={setNumeroSeriePrellenado}
                setModalEquipoAbierto={setModalEquipoAbierto}
                setNombreClientePrellenado={setNombreClientePrellenado}
                setModalClienteAbierto={setModalClienteAbierto}
                setNombreSedePrellenado={setNombreSedePrellenado}
                setModalSedeAbierto={setModalSedeAbierto}
                soloSelector
              />
            </div>

            {/* Toggle registrar */}
            {nombreLibre.trim().length >= 2 && (
              <div className={`p-4 rounded-2xl border-2 transition-all ${registrarCliente ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <button type="button" onClick={() => setRegistrarCliente(!registrarCliente)}
                  className="flex items-center justify-between w-full">
                  <div className="text-left">
                    <p className="font-black text-sm text-slate-900 dark:text-white">👤 Registrar como cliente</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Guardarlo para futuras operaciones</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative shrink-0 ml-3 ${registrarCliente ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${registrarCliente ? 'left-7' : 'left-1'}`}/>
                  </div>
                </button>
                {registrarCliente && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 grid grid-cols-2 gap-2">
                    <input placeholder="Teléfono" value={datosExtra.telefono}
                      onChange={e => setDatosExtra(p => ({...p, telefono: e.target.value}))}
                      className={inputCls + " col-span-2"} />
                    <input placeholder="Email" value={datosExtra.email}
                      onChange={e => setDatosExtra(p => ({...p, email: e.target.value}))}
                      className={inputCls + " col-span-2"} />
                    <input placeholder="Calle" value={datosExtra.calle}
                      onChange={e => setDatosExtra(p => ({...p, calle: e.target.value}))}
                      className={inputCls} />
                    <input placeholder="Número" value={datosExtra.numero}
                      onChange={e => setDatosExtra(p => ({...p, numero: e.target.value}))}
                      className={inputCls} />
                    <input placeholder="Localidad" value={datosExtra.localidad}
                      onChange={e => setDatosExtra(p => ({...p, localidad: e.target.value}))}
                      className={inputCls} />
                    <select value={datosExtra.provincia}
                      onChange={e => setDatosExtra(p => ({...p, provincia: e.target.value}))}
                      className={inputCls}>
                      {['Buenos Aires','CABA','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Neuquén'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Cliente ya seleccionado — mostrar info + botón limpiar */
          clienteId && !idEdicion ? (
            <div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 mb-3">
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white">{clienteObj?.nombre}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{clienteObj?.telefono} {clienteObj?.localidad && `· ${clienteObj.localidad}`}</p>
                </div>
                {!estaBloqueado && (
                  <button onClick={() => { setClienteId(null); setNombreLibre(''); }}
                    className="text-slate-400 hover:text-rose-500 text-lg transition-colors">✕</button>
                )}
              </div>
              {/* Sede + Equipo del inventario si tiene */}
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
                sinSelector
              />
            </div>
          ) : (
            /* Edición / bloqueado */
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
          )
        )}
      </Card>

      {/* CARD EQUIPO + TRABAJO */}
      {puedeCargarTrabajo && (
        <Card className="mt-4 shadow-sm">
          <ItemEquipoForm
            db={db}
            clienteId={clienteId}
            itemActual={itemActual} setItemActual={setItemActual}
            repuestoElegido={repuestoElegido} setRepuestoElegido={setRepuestoElegido}
            estaBloqueado={estaBloqueado} esPresupuesto={esPresupuesto}
            selectStyles={selectStyles}
            sumarRepuesto={sumarRepuesto}
            actualizarCantidad={actualizarCantidad}
            quitarRepuesto={quitarRepuesto}
            agregarAlTicket={agregarAlTicket}
            calcularGananciaRepuesto={calcularGananciaRepuesto}
            consultarAntecedentes={consultarAntecedentes}
            historialEquipo={historialEquipo}
            enviarWhatsAppMantenimiento={enviarWhatsAppMantenimiento}
            setNumeroSeriePrellenado={setNumeroSeriePrellenado}
            setModalEquipoAbierto={setModalEquipoAbierto}
            numeroEquipo={ticketItems.length + 1}
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
        onClienteCreado={async c => { setDb({ ...db, clientes: [...db.clientes, c] }); onClienteSeleccionado(c.id.toString()); setNombreLibre(''); setModalClienteAbierto(false); await refrescarDatos(); }}
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