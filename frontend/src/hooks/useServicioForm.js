import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useServicioForm(servicioParaEditar = null) {
  const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
  const [clienteId, setClienteId] = useState(null);
  const [esPresupuesto, setEsPresupuesto] = useState(true);
  const [ticketItems, setTicketItems] = useState([]);
  const [idEdicion, setIdEdicion] = useState(null);
  const [estaBloqueado, setEstaBloqueado] = useState(false);
  const [historialEquipo, setHistorialEquipo] = useState(null);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreClientePrellenado, setNombreClientePrellenado] = useState('');
  const [modalSedeAbierto, setModalSedeAbierto] = useState(false);
  const [nombreSedePrellenado, setNombreSedePrellenado] = useState('');

  const [itemActual, setItemActual] = useState({
    sedeId: '', sedeNombre: '', equipoSerial: '',
    trabajo: '', costoExtra: 0, repuestosUsados: []
  });

  const [repuestoElegido, setRepuestoElegido] = useState(null);
  const [leyenda, setLeyenda] = useState('');
  const [fechaServicio, setFechaServicio] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, s, e, r] = await Promise.all([
          api.get('/clientes?page=0&size=1000'),
          api.get('/sedes?page=0&size=1000'),
          api.get('/equipos?page=0&size=1000'),
          api.get('/repuestos?page=0&size=1000')
        ]);
        setDb({
          clientes: c.data.content || c.data,
          sedes:    s.data.content || s.data,
          equipos:  e.data.content || e.data,
          repuestos: r.data.content || r.data
        });

        if (servicioParaEditar) {
          setEstaBloqueado(servicioParaEditar.estado !== 'PRESUPUESTO');
          setIdEdicion(servicioParaEditar.id);
          setClienteId(servicioParaEditar.clienteId?.toString());
          setEsPresupuesto(servicioParaEditar.servicioTipo === 'TECNICA');
          setDescuentoPorcentaje(servicioParaEditar.descuentoPorcentaje || 0);
          setTicketItems(
            servicioParaEditar.items.map(it => ({
              sedeId:          servicioParaEditar.sedeId,
              equipoSerial:    it.equipoSerial,
              trabajo:         it.trabajoRealizado,
              costoExtra:      Math.max(0, it.costoExtra || 0),
              totalCalculado:  Math.max(0, it.costo),
              totalSinDescuento: Math.max(0, it.costo),
              repuestosUsados: it.repuestosUsados || [],
              resumenTexto:    it.trabajoRealizado
            }))
          );
          setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
        }
      } catch {
        toast.error('Error de conexión');
      }
    };
    cargar();
  }, [servicioParaEditar]);

  const onClienteSeleccionado = (id) => {
    setClienteId(id);
    const sedesDelCliente = db.sedes.filter(s => s.cliente?.id?.toString() === id);
    if (sedesDelCliente.length === 1) {
      const sede = sedesDelCliente[0];
      setItemActual(prev => ({ ...prev, sedeId: sede.id, sedeNombre: sede.nombreSede }));
    } else {
      setItemActual(prev => ({ ...prev, sedeId: '', sedeNombre: '' }));
    }
  };

  const calcularGananciaRepuesto = (repuesto, cantidad) => {
    const precioVenta = parseFloat(repuesto.precio) || 0;
    const costo       = parseFloat(repuesto.costo)  || 0;
    const qty         = parseFloat(cantidad)         || 1;
    const subtotal    = precioVenta * qty;

    if (costo > 0) {
      const costoTotal = costo * qty;
      const ganancia   = subtotal - costoTotal;
      const margen     = subtotal > 0 ? ((ganancia / subtotal) * 100).toFixed(1) : 0;
      return { subtotal, costoTotal, ganancia, margen };
    }

    const pct = parseFloat(repuesto.porcentajeGanancia) || 0;
    if (pct > 0) {
      const costoImplicito = subtotal / (1 + pct / 100);
      const ganancia = subtotal - costoImplicito;
      return { subtotal, costoTotal: costoImplicito, ganancia, margen: pct.toFixed(1) };
    }

    return { subtotal, costoTotal: 0, ganancia: 0, margen: 0 };
  };

  const calcularResumenGanancia = () => {
    let totalVenta = 0;
    let totalCosto = 0;

    ticketItems.forEach(item => {
      item.repuestosUsados.forEach(r => {
        const g = calcularGananciaRepuesto(r, r.cantidad);
        totalVenta += g.subtotal;
        totalCosto += g.costoTotal;
      });
      totalVenta += parseFloat(item.costoExtra) || 0;
    });

    const descuento        = (totalVenta * descuentoPorcentaje) / 100;
    const totalConDescuento = totalVenta - descuento;
    const gananciaBruta    = totalConDescuento - totalCosto;
    const margenFinal      = totalConDescuento > 0
      ? ((gananciaBruta / totalConDescuento) * 100).toFixed(1) : 0;

    return { totalVenta, totalCosto, descuento, totalConDescuento, gananciaBruta, margenFinal };
  };

  const consultarAntecedentes = async serial => {
    if (!serial || serial === 'MOSTRADOR') { setHistorialEquipo(null); return; }
    try {
      const res = await api.get(`/servicios?equipoSerial=${serial}`);
      if (res.data?.length > 0) {
        const ultimo = res.data[0];
        setHistorialEquipo(ultimo);
        const itemGarantia = ultimo.items?.find(i => i.equipoSerial === serial && i.garantiaHasta);
        if (itemGarantia && new Date(itemGarantia.garantiaHasta) > new Date()) {
          toast.success(`🛡️ GARANTÍA HASTA: ${itemGarantia.garantiaHasta}`, { duration: 6000 });
        }
      } else {
        setHistorialEquipo(null);
      }
    } catch { console.error('Error antecedentes'); }
  };

  const enviarWhatsAppMantenimiento = () => {
    const cliente = db.clientes.find(c => c.id.toString() === clienteId);
    if (!cliente?.telefono) return toast.error('Sin teléfono');
    const tel = cliente.telefono.replace(/\D/g, '');
    const msg = `Hola ${cliente.nombre}, revisando el historial del dispenser S/N ${itemActual.equipoSerial}, notamos que ya le toca su mantenimiento...`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sumarRepuesto = () => {
    if (estaBloqueado || !repuestoElegido) return;
    const nuevos = [...itemActual.repuestosUsados];
    const idx    = nuevos.findIndex(r => r.id === repuestoElegido.id);
    if (idx > -1) {
      nuevos[idx].cantidad += 1;
      nuevos[idx].subtotal  = nuevos[idx].cantidad * parseFloat(nuevos[idx].precio);
    } else {
      nuevos.push({
        id:                 repuestoElegido.id,
        nombre:             repuestoElegido.nombre,
        sku:                repuestoElegido.sku,
        precio:             parseFloat(repuestoElegido.precio),
        costo:              parseFloat(repuestoElegido.costo) || 0,
        porcentajeGanancia: parseFloat(repuestoElegido.porcentajeGanancia) || 0,
        cantidad:           1,
        subtotal:           parseFloat(repuestoElegido.precio)
      });
    }
    setItemActual({ ...itemActual, repuestosUsados: nuevos });
    setRepuestoElegido(null);
  };

  const actualizarCantidad = (idx, valor) => {
    const nuevos    = [...itemActual.repuestosUsados];
    const qty       = Math.max(1, parseInt(valor) || 1);
    nuevos[idx].cantidad = qty;
    nuevos[idx].subtotal  = qty * parseFloat(nuevos[idx].precio);
    setItemActual({ ...itemActual, repuestosUsados: nuevos });
  };

  const quitarRepuesto = idx => {
    if (estaBloqueado) return;
    const nuevos = [...itemActual.repuestosUsados];
    nuevos.splice(idx, 1);
    setItemActual({ ...itemActual, repuestosUsados: nuevos });
  };

  const editarItem = idx => {
    if (estaBloqueado) return;
    setItemActual(ticketItems[idx]);
    const nuevaLista = [...ticketItems];
    nuevaLista.splice(idx, 1);
    setTicketItems(nuevaLista);
  };

  const eliminarItem = idx => {
    if (estaBloqueado) return;
    const nuevaLista = [...ticketItems];
    nuevaLista.splice(idx, 1);
    setTicketItems(nuevaLista);
  };

  const agregarAlTicket = () => {
    if (estaBloqueado) return;
    const extra  = Math.max(0, parseFloat(itemActual.costoExtra) || 0);
    const totalR = itemActual.repuestosUsados.reduce((a, b) => a + b.subtotal, 0);
    const nuevoRenglon = {
      ...itemActual,
      costoExtra:     extra,
      totalCalculado: extra + totalR,
      resumenTexto:   itemActual.equipoSerial && itemActual.equipoSerial !== 'MOSTRADOR'
        ? `${itemActual.trabajo} | MO: $${extra}`
        : `VENTA: ${itemActual.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}`
    };
    setTicketItems([...ticketItems, nuevoRenglon]);
    setItemActual({ ...itemActual, equipoSerial: '', trabajo: '', costoExtra: 0, repuestosUsados: [] });
    setHistorialEquipo(null);
  };

  /**
   * finalizar
   * @param confirmarTrabajo boolean
   * @param overrides { clienteNombre?, sedeId?, sedeNombre? }
   *   Usado por el modo rápido para inyectar nombre libre + sede Mostrador
   */
  const finalizar = async (confirmarTrabajo = false, overrides = {}) => {
    if (estaBloqueado || ticketItems.length === 0) return;

    const loading = toast.loading(confirmarTrabajo ? 'Confirmando...' : 'Guardando...');
    try {
      const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);

      // Si viene override de sedeId (modo rápido) lo usamos, sino el del item
      const sedeIdReal = overrides.sedeId || itemActual.sedeId || ticketItems[0]?.sedeId;
      const nombreCliente = overrides.clienteNombre || clienteObj?.nombre || 'Particular';
      const nombreSede    = overrides.sedeNombre
        || db.sedes?.find(s => s.id === sedeIdReal)?.nombreSede
        || 'Mostrador';

      if (!sedeIdReal) {
        toast.error('❌ Falta seleccionar una sede', { id: loading });
        return false;
      }

      const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');
      const { totalConDescuento } = calcularResumenGanancia();

      const servicioData = {
        sedeId:       parseInt(sedeIdReal),
        usuarioId:    1,
        fecha:        fechaServicio,
        servicioTipo: tieneEquipo ? 'TECNICA' : 'VENTA',
        estado:       confirmarTrabajo ? 'REALIZADO' : 'PRESUPUESTO',
        clienteNombre: nombreCliente,
        sedeNombre:   nombreSede,
        descuentoPorcentaje,
        totalConDescuento,
        items: ticketItems.map(it => {
          const esFiltro = it.trabajo?.toUpperCase().includes('FILTRO') ||
            it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes('FILTRO'));
          return {
            equipoSerial:    it.equipoSerial || 'MOSTRADOR',
            tecnico:         'Marcos',
            costo:           parseFloat(it.totalCalculado),
            costoExtra:      parseFloat(it.costoExtra) || 0,
            metodoPago:      'EFECTIVO',
            trabajoRealizado: it.resumenTexto,
            trabajoTipo:     tieneEquipo ? (esFiltro ? 'CAMBIO_FILTRO' : 'REPARACION') : 'VENTA',
            repuestosUsados: it.repuestosUsados || [],
            garantiaHasta:   confirmarTrabajo && tieneEquipo
              ? new Date(new Date().setMonth(new Date().getMonth() + (esFiltro ? 6 : 3))).toISOString().split('T')[0]
              : null
          };
        })
      };

      if (idEdicion) {
        await api.put(`/servicios/${idEdicion}`, servicioData);
      } else {
        await api.post('/servicios', servicioData);
      }

      toast.success('✅ ¡Guardado!', { id: loading });
      setTicketItems([]);
      setClienteId(null);
      setIdEdicion(null);
      setDescuentoPorcentaje(0);
      setLeyenda('');
      setFechaServicio(new Date().toISOString().split('T')[0]);
      return true;
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.mensaje || err.message || 'Error de servidor'}`, { id: loading });
      return false;
    }
  };

  const refrescarDatos = async () => {
    try {
      const [c, s, e, r] = await Promise.all([
        api.get('/clientes?page=0&size=1000'),
        api.get('/sedes?page=0&size=1000'),
        api.get('/equipos?page=0&size=1000'),
        api.get('/repuestos?page=0&size=1000')
      ]);
      setDb({
        clientes:  c.data.content || c.data,
        sedes:     s.data.content || s.data,
        equipos:   e.data.content || e.data,
        repuestos: r.data.content || r.data
      });
    } catch { console.error('Error refrescando datos'); }
  };

  return {
    db, setDb,
    clienteId, setClienteId,
    esPresupuesto, setEsPresupuesto,
    ticketItems, setTicketItems,
    idEdicion, setIdEdicion,
    estaBloqueado, setEstaBloqueado,
    historialEquipo, setHistorialEquipo,
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
    calcularResumenGanancia,
    leyenda, setLeyenda,
    fechaServicio, setFechaServicio,
  };
}