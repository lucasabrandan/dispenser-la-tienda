import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { getTodayISO, formatDateISO } from '../utils/dateUtils';
import { toTitleCase } from '../utils/titleCase';

const DRAFT_KEY = 'servicio_borrador';

export function useServicioForm(servicioParaEditar = null, clienteInicialId = null, presupuestoOrigen = null, ordenOrigen = null) {
  const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
  const [configGlobal, setConfigGlobal] = useState(null);

  // Borrador: true si existe un draft guardado al montar el formulario (solo en creación)
  const [borradorDisponible, setBorradorDisponible] = useState(() => {
    if (servicioParaEditar) return false;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      return (d.ticketItems?.length > 0) || !!d.itemActual?.trabajo || !!d.itemActual?.equipoSerial;
    } catch { return false; }
  });
  // Evita que el effect de auto-save borre el draft antes de que el usuario lo recupere
  const autoSaveReady = useRef(false);
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
    trabajo: '', costoExtra: '', repuestosUsados: [],
    fotoAntes: null, fotoDespues: null,
  });

  const [editingIdx, setEditingIdx] = useState(null); // índice original al editar un item
  const [repuestoElegido, setRepuestoElegido] = useState(null);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState(null); // { id, nombre } — solo admin

  // Estado del PasoCliente — persistido acá para que no se pierda al cambiar de paso
  const [modoCliente, setModoCliente] = useState('registrado');
  const [nombreLibre, setNombreLibre] = useState('');
  const [telefonoLibre, setTelefonoLibre] = useState('');
  const [dirLibre, setDirLibre] = useState({ calle: '', numero: '', piso: '', depto: '', localidad: '' });
  const [fechaVisita, setFechaVisita] = useState(''); // fecha estimada de visita para auto-despacho
  const LEYENDA_DEFAULT = 'Garantía: 90 días sobre mano de obra · Repuestos según fabricante';
  const [leyenda, setLeyenda] = useState(LEYENDA_DEFAULT);
  const [fechaServicio, setFechaServicio] = useState(getTodayISO());
  const [duracionMinutos, setDuracionMinutos] = useState(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, s, e, r, cfg] = await Promise.all([
          api.get('/clientes?page=0&size=500'),
          api.get('/sedes?page=0&size=500'),
          api.get('/equipos?page=0&size=500'),
          api.get('/repuestos?page=0&size=500'),
          api.get('/configuracion').catch(() => ({ data: { manoDeObraBase: 72600, porcentajeImpuestos: 30, porcentajeIVA: 21 } })),
        ]);
        setDb({
          clientes:  c.data.content || c.data,
          sedes:     s.data.content || s.data,
          equipos:   e.data.content || e.data,
          repuestos: r.data.content || r.data
        });
        // Guardar config para calcular precioCliente default
        const conf = cfg.data;
        setConfigGlobal(conf);
        // Pre-llenar mano de obra con precio con IVA (moBase ya incluye IVA)
        if (!servicioParaEditar && !presupuestoOrigen && !ordenOrigen) {
          const moBase = Number(conf.manoDeObraBase) || 72600;
          setItemActual(prev => ({ ...prev, costoExtra: moBase }));
        }

        // Enriquece repuestos del backend con costo/porcentajeGanancia desde el catálogo local
        const repuestosDB = r.data.content || r.data;
        const enriquecerRepuestos = (repuestos) =>
          (repuestos || []).map(rep => {
            if (rep.costo > 0 || rep.porcentajeGanancia > 0) return rep;
            const catalogo = repuestosDB.find(x => x.id === rep.id);
            if (!catalogo) return rep;
            return {
              ...rep,
              costo:              parseFloat(catalogo.costo) || 0,
              porcentajeGanancia: parseFloat(catalogo.porcentajeGanancia) || 0,
            };
          });

        if (ordenOrigen) {
          setEsPresupuesto(false);
          if (ordenOrigen.descripcion) setLeyenda(ordenOrigen.descripcion);
          // Si la orden tiene presupuesto vinculado, pre-llenarlo como presupuestoOrigen
          if (ordenOrigen.presupuestoId) {
            try {
              const { data: p } = await api.get(`/servicios/${ordenOrigen.presupuestoId}`);
              setClienteId(p.clienteId?.toString() || null);
              setDescuentoPorcentaje(p.descuentoPorcentaje || 0);
              if (p.observaciones) setLeyenda(p.observaciones);
              setItemActual(prev => ({ ...prev, sedeId: p.sedeId, sedeNombre: p.sedeNombre }));
              setTicketItems(
                (p.items || []).map(it => ({
                  sedeId:            p.sedeId,
                  sedeNombre:        p.sedeNombre,
                  equipoSerial:      it.equipoSerial || 'MOSTRADOR',
                  modeloEquipo:      it.equipoModelo || null,
                  ubicacionEquipo:   it.equipoUbicacion || null,
                  trabajo:           it.trabajoRealizado || '',
                  costoExtra:        Math.max(0, Number(it.costoExtra) || 0),
                  totalCalculado:    Math.max(0, Number(it.costo)),
                  totalSinDescuento: Math.max(0, Number(it.costo)),
                  repuestosUsados:   enriquecerRepuestos(it.repuestosUsados),
                  resumenTexto:      it.trabajoRealizado || '',
                  fotoAntes:         null,
                  fotoDespues:       null,
                }))
              );
            } catch { toast.error('No se pudo cargar el presupuesto vinculado. Completá los datos manualmente.'); }
          }
        } else if (presupuestoOrigen) {
          // Pre-llenar desde presupuesto: el técnico confirma/modifica lo realmente hecho
          setEsPresupuesto(false); // El servicio resultante será REALIZADO
          setClienteId(presupuestoOrigen.clienteId?.toString() || null);
          setDescuentoPorcentaje(presupuestoOrigen.descuentoPorcentaje || 0);
          if (presupuestoOrigen.observaciones) setLeyenda(presupuestoOrigen.observaciones);
          setItemActual(prev => ({ ...prev, sedeId: presupuestoOrigen.sedeId, sedeNombre: presupuestoOrigen.sedeNombre }));
          setTicketItems(
            (presupuestoOrigen.items || []).map(it => ({
              sedeId:            presupuestoOrigen.sedeId,
              sedeNombre:        presupuestoOrigen.sedeNombre,
              equipoSerial:      it.equipoSerial || 'MOSTRADOR',
              modeloEquipo:      it.equipoModelo || null,
              ubicacionEquipo:   it.equipoUbicacion || null,
              trabajo:           it.trabajoRealizado || '',
              costoExtra:        Math.max(0, Number(it.costoExtra) || 0),
              totalCalculado:    Math.max(0, Number(it.costo)),
              totalSinDescuento: Math.max(0, Number(it.costo)),
              repuestosUsados:   enriquecerRepuestos(it.repuestosUsados),
              resumenTexto:      it.trabajoRealizado || '',
              fotoAntes:         null,
              fotoDespues:       null,
            }))
          );
        } else if (servicioParaEditar) {
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
              repuestosUsados:   enriquecerRepuestos(it.repuestosUsados),
              resumenTexto:      it.trabajoRealizado,
              fotoAntes:         it.fotoAntes   || null,
              fotoDespues:       it.fotoDespues || null,
            }))
          );
          setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
          if (servicioParaEditar.observaciones) setLeyenda(servicioParaEditar.observaciones);
          // Recuperar técnico y fecha del servicio original
          if (servicioParaEditar.usuarioId) {
            setTecnicoSeleccionado({ id: servicioParaEditar.usuarioId, nombre: servicioParaEditar.usuarioNombre || '' });
          }
          if (servicioParaEditar.fecha) {
            // fecha puede venir como "dd/MM/yyyy" o "yyyy-MM-dd"
            const f = servicioParaEditar.fecha;
            let fechaISO = f;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
              const [d, m, a] = f.split('/');
              fechaISO = `${a}-${m}-${d}`;
            }
            setFechaServicio(fechaISO);
            // Pre-llenar fecha de visita para que no la pida de nuevo
            if (servicioParaEditar.usuarioId) setFechaVisita(fechaISO);
          }
          if (servicioParaEditar.duracionMinutos) setDuracionMinutos(servicioParaEditar.duracionMinutos);
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

  // Auto-guardar borrador en localStorage cada vez que cambia el formulario.
  // Se salta el primer render (mount) para no borrar un draft existente con estado vacío.
  useEffect(() => {
    if (servicioParaEditar) return;
    if (borradorDisponible) return; // No pisar el draft mientras el banner está visible
    if (!autoSaveReady.current) { autoSaveReady.current = true; return; }

    const hayContenido = ticketItems.length > 0
      || itemActual.trabajo?.trim()
      || itemActual.equipoSerial?.trim()
      || itemActual.repuestosUsados?.length > 0;

    if (!hayContenido) { localStorage.removeItem(DRAFT_KEY); return; }

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ticketItems, itemActual, clienteId,
        fechaServicio, descuentoPorcentaje, leyenda,
        duracionMinutos, tecnicoSeleccionado,
        ts: Date.now(),
      }));
    } catch { /* localStorage lleno — ignorar */ }
  }, [ticketItems, itemActual, clienteId, fechaServicio, descuentoPorcentaje, leyenda, borradorDisponible]);

  const recuperarBorrador = () => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      if (d.ticketItems)             setTicketItems(d.ticketItems);
      if (d.itemActual)              setItemActual(d.itemActual);
      if (d.clienteId)               setClienteId(d.clienteId);
      if (d.fechaServicio)           setFechaServicio(d.fechaServicio);
      if (d.descuentoPorcentaje !== undefined) setDescuentoPorcentaje(d.descuentoPorcentaje);
      if (d.leyenda)                 setLeyenda(d.leyenda);
      if (d.duracionMinutos)         setDuracionMinutos(d.duracionMinutos);
      if (d.tecnicoSeleccionado)     setTecnicoSeleccionado(d.tecnicoSeleccionado);
      setBorradorDisponible(false);
      toast.success('✅ Borrador recuperado');
    } catch { toast.error('Error al recuperar el borrador'); }
  };

  const descartarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY);
    setBorradorDisponible(false);
  };

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

  // Si el cliente no tiene sedes, crea "Principal" con su dirección y la agrega al db local
  const crearSedePrincipalSiNoTiene = async (clienteIdStr) => {
    if (!clienteIdStr) return null;
    const sedesActuales = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteIdStr) || [];
    if (sedesActuales.length > 0) return sedesActuales[0];
    const clienteObj = db.clientes?.find(c => c.id?.toString() === clienteIdStr);
    if (!clienteObj) return null;
    try {
      const { data: nuevaSede } = await api.post('/sedes', {
        clienteId:  parseInt(clienteIdStr),
        nombreSede: 'Principal',
        calle:      clienteObj.calle     || null,
        numero:     clienteObj.numero    || null,
        piso:       clienteObj.piso      || null,
        depto:      clienteObj.depto     || null,
        localidad:  clienteObj.localidad || null,
        provincia:  clienteObj.provincia || null,
        direccion:  clienteObj.direccion || null,
      });
      setDb(prev => ({ ...prev, sedes: [...(prev.sedes || []), nuevaSede] }));
      return nuevaSede;
    } catch { return null; }
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
    setEditingIdx(idx);
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

  const agregarAlTicket = async (overrides) => {
    if (estaBloqueado) return;

    // Si se pasan overrides (ej: CargaRapidaSheet), mergear con itemActual
    const item = overrides ? { ...itemActual, ...overrides } : itemActual;

    const tieneSerial      = item.equipoSerial?.trim();
    const tieneDescripcion = item.trabajo?.trim();
    const tieneRepuestos   = item.repuestosUsados?.length > 0;
    const tieneMO          = (parseFloat(item.costoExtra) || 0) > 0;

    if (!tieneDescripcion && !tieneRepuestos && !tieneMO) {
      toast.error('Completá al menos la descripción del trabajo o agregá un repuesto');
      return;
    }

    // Guardar equipo nuevo en la BD silenciosamente si fue creado al vuelo
    if (item.esNuevoEquipo && tieneSerial) {
      const yaExiste = db.equipos?.some(e => e.numeroSerie === tieneSerial);
      if (!yaExiste) {
        // Resolver sedeId: elegida > única sede > auto-crear Principal con dirección del cliente > Mostrador
        let sedeIdEquipo = item.sedeId || null;
        if (!sedeIdEquipo) {
          const sedesCliente = clienteId ? db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId) : [];
          if (sedesCliente.length === 1) {
            sedeIdEquipo = sedesCliente[0].id;
          } else if (sedesCliente.length === 0 && clienteId) {
            const sedePrincipal = await crearSedePrincipalSiNoTiene(clienteId);
            sedeIdEquipo = sedePrincipal?.id || null;
          } else {
            const sedeMostrador = db.sedes?.find(s =>
              s.nombreSede?.toLowerCase().includes('mostrador') ||
              s.nombreSede?.toLowerCase().includes('particular')
            );
            sedeIdEquipo = sedeMostrador?.id || db.sedes?.[0]?.id || null;
          }
        }
        try {
          const res = await api.post('/equipos', {
            numeroSerie: tieneSerial,
            modelo:      item.modeloEquipo    || null,
            ubicacion:   item.ubicacionEquipo || null,
            sedeId:      sedeIdEquipo || null,
          });
          setDb(prev => ({ ...prev, equipos: [...(prev.equipos || []), res.data] }));
        } catch (e) {
          console.error('Error guardando equipo al vuelo:', e);
        }
      }
    }

    // Si el equipo ya existe y el usuario cambió modelo o ubicación, actualizar en la BD
    if (!item.esNuevoEquipo && tieneSerial) {
      const equipoDB = db.equipos?.find(e => e.numeroSerie === tieneSerial);
      if (equipoDB?.id) {
        const modeloOk  = item.modeloEquipo?.trim();
        const ubicOk    = item.ubicacionEquipo?.trim();
        const diferente = (modeloOk && modeloOk !== equipoDB.modelo) ||
                          (ubicOk   && ubicOk   !== equipoDB.ubicacion);
        if (diferente) {
          api.put(`/equipos/${equipoDB.id}`, {
            numeroSerie:   equipoDB.numeroSerie,
            modelo:        modeloOk  || equipoDB.modelo    || null,
            marca:         equipoDB.marca                  || null,
            sedeId:        equipoDB.sedeId,
            ubicacion:     ubicOk    || equipoDB.ubicacion || null,
            observaciones: equipoDB.observaciones          || null,
          }).then(() => {
            setDb(prev => ({
              ...prev,
              equipos: prev.equipos.map(e =>
                e.id === equipoDB.id
                  ? { ...e, modelo: modeloOk || e.modelo, ubicacion: ubicOk || e.ubicacion }
                  : e
              ),
            }));
          }).catch(() => {});
        }
      }
    }

    const extra  = Math.max(0, parseFloat(item.costoExtra) || 0);
    const totalR = item.repuestosUsados.reduce((a, b) => a + b.subtotal, 0);
    const nuevoRenglon = {
      ...item,
      equipoSerial:   tieneSerial || 'SIN-SN',
      costoExtra:     extra,
      totalCalculado: extra + totalR,
      resumenTexto:   tieneSerial
        ? [tieneDescripcion, extra > 0 ? `MO: $${extra}` : null].filter(Boolean).join(' | ')
        : `VENTA: ${item.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}`,
      esVisita:       item.esVisita || false,
    };
    if (editingIdx !== null) {
      setTicketItems(prev => {
        const copia = [...prev];
        copia.splice(editingIdx, 0, nuevoRenglon);
        return copia;
      });
      setEditingIdx(null);
    } else {
      setTicketItems(prev => [...prev, nuevoRenglon]);
    }
    // Pre-llenar con moBase (ya incluye IVA)
    const defaultMO = Number(configGlobal?.manoDeObraBase) || 72600;
    setItemActual(prev => ({
      ...prev,
      equipoSerial: '', trabajo: '', costoExtra: defaultMO,
      repuestosUsados: [], modeloEquipo: '', ubicacionEquipo: '',
      fotoAntes: null, fotoDespues: null, esNuevoEquipo: false,
    }));
    setHistorialEquipo(null);
    setRepuestoElegido(null);
    toast.success('✓ Equipo agregado al ticket');
  };

  // Sube una foto al backend y devuelve su filename, o null si no hay foto.
  // Acepta data URL (string 'data:...') — las fotos se guardan así en el estado
  // desde que FotoUpload convierte el File a data URL al seleccionarlo.
  // Usa fetch nativo (NO Axios): la instancia Axios tiene Content-Type: application/json
  // hardcodeado y en Axios 1.x no se sobreescribe aunque se pase FormData.
  const subirFoto = async (src) => {
    if (!src) return null;
    // Convertir data URL a Blob para poder subirla como multipart
    let blob;
    try {
      const r = await fetch(src);
      blob = await r.blob();
    } catch { return null; }

    const fd = new FormData();
    fd.append('file', blob, 'foto.jpg');
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/uploads`, {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { console.error('Error subiendo foto, status:', res.status); return null; }
      const data = await res.json();
      return data.filename || null;
    } catch (e) {
      console.error('Error subiendo foto:', e);
      return null;
    }
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
        // Cliente nuevo rápido — dirección obligatoria, siempre crea cliente + sede
        const dir = overrides.direccionLibre;
        try {
          const dirStr = [dir.calle, dir.numero].filter(Boolean).join(' ')
            + (dir.localidad ? `, ${dir.localidad}` : '');
          const { data: nuevoCliente } = await api.post('/clientes', {
            clienteTipo: 'PARTICULAR',
            nombre: toTitleCase(overrides.clienteNombre || 'Particular'),
            telefono: overrides.telefono || null,
            calle: toTitleCase(dir.calle),
            numero: dir.numero || '0',
            piso: dir.piso || null,
            depto: dir.depto || null,
            localidad: toTitleCase(dir.localidad),
            provincia: 'Buenos Aires',
            direccion: dirStr,
            condicionIva: 'CONSUMIDOR_FINAL',
          });
          const { data: nuevaSede } = await api.post('/sedes', {
            clienteId: nuevoCliente.id,
            nombreSede: 'Principal',
            calle: toTitleCase(dir.calle),
            numero: dir.numero || '0',
            piso: dir.piso || null,
            depto: dir.depto || null,
            localidad: toTitleCase(dir.localidad),
            provincia: 'Buenos Aires',
            direccion: dirStr,
          });
          setDb(prev => ({
            ...prev,
            clientes: [...(prev.clientes || []), nuevoCliente],
            sedes: [...(prev.sedes || []), nuevaSede],
          }));
          sedeIdFinal = nuevaSede.id;
          nombreSedeF = nuevaSede.nombreSede;
          overrides.clienteNombre = nuevoCliente.nombre;
        } catch (err) {
          console.error('Error auto-creando cliente/sede:', err);
          toast.error('No se pudo crear el cliente — revisá los datos');
          return false;
        }
      } else {
        // Cliente registrado → sede elegida > única sede > auto-crear Principal > Mostrador
        const sedesCliente = db.sedes?.filter(s => s.cliente?.id?.toString() === clienteId) || [];
        const sedeElegida  = itemActual.sedeId || ticketItems[0]?.sedeId;

        if (sedeElegida) {
          sedeIdFinal = sedeElegida;
        } else if (sedesCliente.length === 1) {
          sedeIdFinal = sedesCliente[0].id;
        } else if (sedesCliente.length === 0) {
          // Sin sedes: crear "Principal" con la dirección del cliente automáticamente
          const sedePrincipal = await crearSedePrincipalSiNoTiene(clienteId);
          sedeIdFinal = sedePrincipal?.id || sedeMostrador?.id || db.sedes?.[0]?.id;
        } else {
          sedeIdFinal = sedeMostrador?.id || db.sedes?.[0]?.id;
        }

        nombreSedeF = db.sedes?.find(s => s.id === sedeIdFinal)?.nombreSede
          || (sedeIdFinal ? 'Principal' : 'Mostrador');
      }

      if (!sedeIdFinal) {
        toast.error('No hay ninguna sede en la base de datos. Creá una sede primero.', { id: loading });
        return false;
      }

      const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR' && it.equipoSerial !== 'SIN-SN');
      const { totalConDescuento } = calcularResumenGanancia();
      const nombreCliente = overrides.clienteNombre || clienteObj?.nombre || 'Particular';

      // Técnico: usa el seleccionado por admin, o el usuario logueado
      const usuarioLogueado = (() => { try { return JSON.parse(localStorage.getItem('auth_usuario')); } catch { return null; } })();
      const baseLogueado = {
        id:     usuarioLogueado?.id,
        nombre: usuarioLogueado?.nombre || localStorage.getItem('tecnico_nombre') || 'Técnico',
      };
      // Garantizar que nombre nunca sea null/blank aunque el admin seleccionó un técnico sin nombre
      const tecnicoFinal = tecnicoSeleccionado?.id
        ? { id: tecnicoSeleccionado.id, nombre: tecnicoSeleccionado.nombre || baseLogueado.nombre }
        : baseLogueado;

      if (!tecnicoFinal.id) {
        toast.error('No se pudo identificar el técnico. Cerrá sesión y volvé a entrar.', { id: loading });
        return false;
      }

      // Subir fotos nuevas (data URL) al backend antes de construir el DTO.
      // Las fotos ya guardadas (filename string sin 'data:') no se vuelven a subir.
      const esNueva = s => typeof s === 'string' && s.startsWith('data:');
      let fotosConError = 0;
      const itemsConFotos = await Promise.all(ticketItems.map(async it => {
        const fotoAntesFilename   = await subirFoto(esNueva(it.fotoAntes)   ? it.fotoAntes   : null);
        const fotoDespuesFilename = await subirFoto(esNueva(it.fotoDespues) ? it.fotoDespues : null);
        if (esNueva(it.fotoAntes)   && !fotoAntesFilename)   fotosConError++;
        if (esNueva(it.fotoDespues) && !fotoDespuesFilename) fotosConError++;
        return { ...it, fotoAntesFilename, fotoDespuesFilename };
      }));
      if (fotosConError > 0) {
        toast.error(`⚠ ${fotosConError} foto${fotosConError > 1 ? 's' : ''} no se ${fotosConError > 1 ? 'pudieron' : 'pudo'} subir`, { duration: 5000 });
      }

      const servicioData = {
        sedeId:             parseInt(sedeIdFinal),
        usuarioId:          tecnicoFinal.id,
        fecha:              fechaServicio,
        servicioTipo:       tieneEquipo ? 'TECNICA' : 'VENTA',
        estado:             confirmarTrabajo ? 'REALIZADO' : (presupuestoOrigen ? 'REALIZADO' : 'PRESUPUESTO'),
        presupuestoOrigenId: presupuestoOrigen?.id || null,
        ordenId: ordenOrigen?.id || null,
        clienteNombre:      nombreCliente,
        sedeNombre:         nombreSedeF,
        descuentoPorcentaje,
        totalConDescuento,
        observaciones: leyenda,
        duracionMinutos: duracionMinutos || null,
        aceptaTerminos: aceptaTerminos || false,
        items: itemsConFotos.map(it => {
          const esFiltro = it.trabajo?.toUpperCase().includes('FILTRO') ||
            it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes('FILTRO'));
          return {
            equipoSerial:     it.equipoSerial || 'MOSTRADOR',
            tecnico:          tecnicoFinal.nombre,
            costo:            parseFloat(it.totalCalculado) || parseFloat(it.costoExtra) || 0,
            costoExtra:       parseFloat(it.costoExtra) || 0,
            metodoPago:       'EFECTIVO',
            trabajoRealizado: it.trabajo || it.resumenTexto || '',
            trabajoTipo:      it.esVisita ? 'VISITA' : (tieneEquipo ? (esFiltro ? 'CAMBIO_FILTRO' : 'REPARACION') : 'VENTA'),
            repuestosUsados:  it.repuestosUsados || [],
            garantiaHasta:    confirmarTrabajo && tieneEquipo
              ? formatDateISO(new Date(new Date().setMonth(new Date().getMonth() + (esFiltro ? 6 : 3))))
              : null,
            // Prioridad: filename de subida nueva > filename existente del backend
            // Las data URLs no se mandan al backend (ya se subieron arriba)
            fotoAntes:   it.fotoAntesFilename   || (!esNueva(it.fotoAntes)   ? it.fotoAntes   : null),
            fotoDespues: it.fotoDespuesFilename || (!esNueva(it.fotoDespues) ? it.fotoDespues : null),
          };
        })
      };

      let savedId;
      if (idEdicion) {
        await api.put(`/servicios/${idEdicion}`, servicioData);
        savedId = idEdicion;
      } else {
        const res = await api.post('/servicios', servicioData);
        savedId = res.data?.id;
      }

      toast.success(confirmarTrabajo ? '✅ ¡Confirmado!' : '💾 ¡Guardado!', { id: loading });
      localStorage.removeItem(DRAFT_KEY);

      // Capturar antes del reset para devolverlos al caller
      const resClienteId     = clienteId;
      const resClienteNombre = nombreCliente;
      const resTecnicoId     = tecnicoSeleccionado?.id || null;
      const resFechaVisita   = fechaVisita || fechaServicio || null;

      // Reset
      setTicketItems([]);
      setEditingIdx(null);
      setClienteId(null);
      setIdEdicion(null);
      setDescuentoPorcentaje(0);
      setLeyenda(LEYENDA_DEFAULT);
      setFechaServicio(getTodayISO());
      setFechaVisita('');
      setItemActual({ sedeId: '', sedeNombre: '', equipoSerial: '', trabajo: '', costoExtra: '', repuestosUsados: [] });
      return { ok: true, id: savedId, clienteId: resClienteId, clienteNombre: resClienteNombre, tecnicoId: resTecnicoId, fechaVisita: resFechaVisita };

    } catch (err) {
      console.error('Error al guardar servicio:', err.response?.data || err.message);
      const detalle = err.response?.data;
      const camposFallidos = detalle?.detalles
        ? Object.keys(detalle.detalles).filter(k => k !== 'path').join(', ')
        : null;
      const msg = camposFallidos
        ? `Campos inválidos: ${camposFallidos}`
        : (detalle?.mensaje || err.message || 'Error de servidor');
      toast.error(`❌ ${msg}`, { id: loading });
      return false;
    }
  };

  const refrescarDatos = async () => {
    try {
      const [c, s, e, r] = await Promise.all([
        api.get('/clientes?page=0&size=500'),
        api.get('/sedes?page=0&size=500'),
        api.get('/equipos?page=0&size=500'),
        api.get('/repuestos?page=0&size=500')
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
    tecnicoSeleccionado, setTecnicoSeleccionado,
    fechaVisita, setFechaVisita,
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
    duracionMinutos, setDuracionMinutos,
    aceptaTerminos, setAceptaTerminos,
    borradorDisponible,
    recuperarBorrador,
    descartarBorrador,
    configGlobal,
    modoCliente, setModoCliente,
    nombreLibre, setNombreLibre,
    telefonoLibre, setTelefonoLibre,
    dirLibre, setDirLibre,
  };
}