import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useServicioForm(servicioParaEditar = null, clienteInicialId = null) {
  const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
  const [clienteId, setClienteId] = useState(clienteInicialId ? String(clienteInicialId) : null);
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
    trabajo: '', costoExtra: 0, repuestosUsados: [],
    fotoAntes: null, fotoDespues: null,
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
          clientes:  c.data.content || c.data,
          sedes:     s.data.content || s.data,
          equipos:   e.data.content || e.data,
          repuestos: r.data.content || r.data
        });

        if (servicioParaEditar) {
          setEstaBloqueado(servicioParaEditar.estado !== 'PRESUPUESTO');
          setIdEdicion(servicioParaEditar.id);
          setEsPresupuesto(servicioParaEditar.servicioTipo === 'TECNICA');
          setDescuentoPorcentaje(servicioParaEditar.descuentoPorcentaje || 0);
          setTicketItems(
            servicioParaEditar.items.map(it => ({
              sedeId:            servicioParaEditar.sedeId,
              equipoSerial:      it.equipoSerial,
              modeloEquipo:      it.equipoModelo   || null,
              ubicacionEquipo:   it.equipoUbicacion || null,
              trabajo:           it.trabajoRealizado,
              costoExtra:        Math.max(0, Number(it.costoExtra) || 0),
              totalCalculado:    Math.max(0, Number(it.costo)),
              totalSinDescuento: Math.max(0, Number(it.costo)),
              repuestosUsados:   it.repuestosUsados || [],
              resumenTexto:      it.trabajoRealizado,
              fotoAntes:         it.fotoAntes   || null,
              fotoDespues:       it.fotoDespues || null,
            }))
          );
          setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
          // clienteId viene del backend ahora
          if (servicioParaEditar.clienteId) {
            setClienteId(servicioParaEditar.clienteId.toString());
          }
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

    const descuento         = (totalVenta * descuentoPorcentaje) / 100;
    const totalConDescuento = totalVenta - descuento;
    const gananciaBruta     = totalConDescuento - totalCosto;
    const margenFinal       = totalConDescuento > 0
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
    const nuevos         = [...itemActual.repuestosUsados];
    const qty            = Math.max(1, parseInt(valor) || 1);
    nuevos[idx].cantidad = qty;
    nuevos[idx].subtotal = qty * parseFloat(nuevos[idx].precio);
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
    const nueva = [...ticketItems];
    nueva.splice(idx, 1);
    setTicketItems(nueva);
  };

  const eliminarItem = idx => {
    if (estaBloqueado) return;
    const nueva = [...ticketItems];
    nueva.splice(idx, 1);
    setTicketItems(nueva);
  };

  const agregarAlTicket = () => {
    if (estaBloqueado) return;

    const tieneSerial    = itemActual.equipoSerial?.trim();
    const tieneDescripcion = itemActual.trabajo?.trim();
    const tieneRepuestos = itemActual.repuestosUsados?.length > 0;
    const tieneMO        = (parseFloat(itemActual.costoExtra) || 0) > 0;

    // Mínimo: descripción del trabajo O al menos un repuesto O mano de obra
    if (!tieneDescripcion && !tieneRepuestos && !tieneMO) {
      toast.error('Completá al menos la descripción del trabajo o agregá un repuesto');
      return;
    }

    const extra  = Math.max(0, parseFloat(itemActual.costoExtra) || 0);
    const totalR = itemActual.repuestosUsados.reduce((a, b) => a + b.subtotal, 0);
    const nuevoRenglon = {
      ...itemActual,
      equipoSerial:   tieneSerial || 'SIN-SN',
      costoExtra:     extra,
      totalCalculado: extra + totalR,
      resumenTexto:   tieneSerial
        ? `${tieneDescripcion || ''} | MO: $${extra}`
        : `VENTA: ${itemActual.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}`
    };
    setTicketItems(prev => [...prev, nuevoRenglon]);
    setItemActual(prev => ({
      ...prev,
      equipoSerial: '', trabajo: '', costoExtra: 0,
      repuestosUsados: [], modeloEquipo: '', ubicacionEquipo: '',
      fotoAntes: null, fotoDespues: null,
    }));
    setHistorialEquipo(null);
    setRepuestoElegido(null);
    toast.success('✓ Equipo agregado al ticket');
  };

  // Sube una foto al backend y devuelve su filename, o null si no hay foto
  const subirFoto = async (file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return r.data.filename || null;
    } catch { return null; }
  };

  const finalizar = async (confirmarTrabajo = false, overrides = {}) => {
    if (estaBloqueado || ticketItems.length === 0) return;

    const loading = toast.loading(confirmarTrabajo ? 'Confirmando...' : 'Guardando...');
    try {
      const clienteObj = db.clientes?.find(c => c.id?.toString() === clienteId);

      // ── Resolver sede ────────────────────────────────────────────────────
      // Para cliente NUEVO (sin registrar) → siempre Mostrador
      // Para cliente REGISTRADO → su sede seleccionada, o su única sede, o Mostrador
      const sedeMostrador = db.sedes?.find(s =>
        s.nombreSede?.toLowerCase().includes('mostrador') ||
        s.nombreSede?.toLowerCase().includes('particular')
      );

      let sedeIdFinal, nombreSedeF;

      if (!clienteId) {
        // Cliente nuevo → Mostrador obligatorio
        sedeIdFinal  = overrides.sedeId || sedeMostrador?.id || db.sedes?.[0]?.id;
        nombreSedeF  = overrides.sedeNombre || sedeMostrador?.nombreSede || 'Mostrador';
      } else {
        // Cliente registrado → sede elegida > única sede del cliente > Mostrador
        const sedesCliente = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId) || [];
        const sedeElegida  = itemActual.sedeId || ticketItems[0]?.sedeId;
        const sedePorDefecto = sedesCliente.length === 1 ? sedesCliente[0] : null;

        sedeIdFinal = sedeElegida
          || sedePorDefecto?.id
          || sedeMostrador?.id
          || db.sedes?.[0]?.id;

        nombreSedeF = db.sedes?.find(s => s.id === sedeIdFinal)?.nombreSede || 'Mostrador';
      }

      if (!sedeIdFinal) {
        toast.error('No hay ninguna sede en la base de datos. Creá una sede primero.', { id: loading });
        return false;
      }

      const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR' && it.equipoSerial !== 'SIN-SN');
      const { totalConDescuento } = calcularResumenGanancia();
      const nombreCliente = overrides.clienteNombre || clienteObj?.nombre || 'Particular';

      // Subir fotos al backend antes de construir el DTO
      const itemsConFotos = await Promise.all(ticketItems.map(async it => ({
        ...it,
        fotoAntesFilename:   await subirFoto(it.fotoAntes   instanceof File ? it.fotoAntes   : null),
        fotoDespuesFilename: await subirFoto(it.fotoDespues instanceof File ? it.fotoDespues : null),
      })));

      const servicioData = {
        sedeId:             parseInt(sedeIdFinal),
        usuarioId:          1,
        fecha:              fechaServicio,
        servicioTipo:       tieneEquipo ? 'TECNICA' : 'VENTA',
        estado:             confirmarTrabajo ? 'REALIZADO' : 'PRESUPUESTO',
        clienteNombre:      nombreCliente,
        sedeNombre:         nombreSedeF,
        descuentoPorcentaje,
        totalConDescuento,
        items: itemsConFotos.map(it => {
          const esFiltro = it.trabajo?.toUpperCase().includes('FILTRO') ||
            it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes('FILTRO'));
          return {
            equipoSerial:     it.equipoSerial || 'MOSTRADOR',
            tecnico:          'Marcos',
            costo:            parseFloat(it.totalCalculado) || parseFloat(it.costoExtra) || 0,
            costoExtra:       parseFloat(it.costoExtra) || 0,
            metodoPago:       'EFECTIVO',
            trabajoRealizado: it.trabajo || it.resumenTexto || '',
            trabajoTipo:      tieneEquipo ? (esFiltro ? 'CAMBIO_FILTRO' : 'REPARACION') : 'VENTA',
            repuestosUsados:  it.repuestosUsados || [],
            garantiaHasta:    confirmarTrabajo && tieneEquipo
              ? new Date(new Date().setMonth(new Date().getMonth() + (esFiltro ? 6 : 3))).toISOString().split('T')[0]
              : null,
            fotoAntes:        it.fotoAntesFilename   || null,
            fotoDespues:      it.fotoDespuesFilename || null,
          };
        })
      };

      if (idEdicion) {
        await api.put(`/servicios/${idEdicion}`, servicioData);
      } else {
        await api.post('/servicios', servicioData);
      }

      toast.success(confirmarTrabajo ? '✅ ¡Confirmado!' : '💾 ¡Guardado!', { id: loading });

      // Reset
      setTicketItems([]);
      setClienteId(null);
      setIdEdicion(null);
      setDescuentoPorcentaje(0);
      setLeyenda('');
      setFechaServicio(new Date().toISOString().split('T')[0]);
      setItemActual({ sedeId: '', sedeNombre: '', equipoSerial: '', trabajo: '', costoExtra: 0, repuestosUsados: [] });
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