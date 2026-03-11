import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

/**
 * useServicioForm - Custom Hook
 * Centraliza toda la lógica del formulario de servicio
 * 
 * RETORNA:
 * - Estados
 * - Funciones de lógica
 * - Datos cargados
 */

export function useServicioForm(servicioParaEditar = null) {
  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [db, setDb] = useState({ clientes: [], sedes: [], equipos: [], repuestos: [] });
  const [clienteId, setClienteId] = useState(null);
  const [esPresupuesto, setEsPresupuesto] = useState(true);
  const [ticketItems, setTicketItems] = useState([]);
  const [idEdicion, setIdEdicion] = useState(null);
  const [estaBloqueado, setEstaBloqueado] = useState(false);
  const [historialEquipo, setHistorialEquipo] = useState(null);

  // Estados para modales
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreClientePrellenado, setNombreClientePrellenado] = useState('');
  const [modalSedeAbierto, setModalSedeAbierto] = useState(false);
  const [nombreSedePrellenado, setNombreSedePrellenado] = useState('');

  // Estado del item actual
  const [itemActual, setItemActual] = useState({
    sedeId: '',
    sedeNombre: '',
    equipoSerial: '',
    trabajo: '',
    costoExtra: 0,
    repuestosUsados: []
  });

  const [repuestoElegido, setRepuestoElegido] = useState(null);

  // ==========================================
  // CARGAR DATOS AL MONTAR
  // ==========================================
  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, s, e, r] = await Promise.all([
          api.get('/clientes?page=0&size=1000'),
          api.get('/sedes?page=0&size=1000'),
          api.get('/equipos?page=0&size=1000'),
          api.get('/repuestos?page=0&size=1000')
        ]);

        const clientes = c.data.content || c.data;
        const sedes = s.data.content || s.data;
        const equipos = e.data.content || e.data;
        const repuestos = r.data.content || r.data;

        setDb({ clientes, sedes, equipos, repuestos });

        // Si estamos editando, cargar datos
        if (servicioParaEditar) {
          if (servicioParaEditar.estado !== 'PRESUPUESTO') {
            setEstaBloqueado(true);
          } else {
            setEstaBloqueado(false);
          }
          setIdEdicion(servicioParaEditar.id);
          setClienteId(servicioParaEditar.clienteId?.toString());
          setEsPresupuesto(servicioParaEditar.servicioTipo === 'TECNICA');
          setTicketItems(
            servicioParaEditar.items.map(it => ({
              sedeId: servicioParaEditar.sedeId,
              equipoSerial: it.equipoSerial,
              trabajo: it.trabajoRealizado,
              costoExtra: Math.max(0, it.costoExtra || 0),
              totalCalculado: Math.max(0, it.costo),
              repuestosUsados: it.repuestosUsados || [],
              resumenTexto: it.trabajoRealizado
            }))
          );
          setItemActual(prev => ({ ...prev, sedeId: servicioParaEditar.sedeId }));
        }
      } catch (err) {
        console.error(err);
        toast.error('Error de conexión');
      }
    };
    cargar();
  }, [servicioParaEditar]);

  // ==========================================
  // FUNCIONES DE LÓGICA
  // ==========================================

  const consultarAntecedentes = async serial => {
    if (!serial || serial === 'MOSTRADOR') {
      setHistorialEquipo(null);
      return;
    }
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
    } catch (e) {
      console.error('Error antecedentes');
    }
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
    const idx = nuevos.findIndex(r => r.id === repuestoElegido.id);
    if (idx > -1) {
      nuevos[idx].cantidad += 1;
      nuevos[idx].subtotal = nuevos[idx].cantidad * nuevos[idx].precio;
    } else {
      nuevos.push({ ...repuestoElegido, cantidad: 1, subtotal: repuestoElegido.precio });
    }
    setItemActual({ ...itemActual, repuestosUsados: nuevos });
    setRepuestoElegido(null);
  };

  const actualizarCantidad = (idx, valor) => {
    const nuevos = [...itemActual.repuestosUsados];
    const qty = Math.max(1, parseInt(valor) || 1);
    nuevos[idx].cantidad = qty;
    nuevos[idx].subtotal = qty * nuevos[idx].precio;
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
    const itemParaEditar = ticketItems[idx];
    setItemActual(itemParaEditar);
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
    if (esPresupuesto && !itemActual.equipoSerial) return toast.error('❌ Falta S/N');
    const extra = Math.max(0, parseFloat(itemActual.costoExtra) || 0);
    const totalR = itemActual.repuestosUsados.reduce((a, b) => a + b.subtotal, 0);
    const nuevoRenglon = {
      ...itemActual,
      costoExtra: extra,
      totalCalculado: extra + totalR,
      resumenTexto:
        itemActual.equipoSerial && itemActual.equipoSerial !== 'MOSTRADOR'
          ? `${itemActual.trabajo} | MO: $${extra}`
          : `VENTA: ${itemActual.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}`
    };
    setTicketItems([...ticketItems, nuevoRenglon]);
    setItemActual({ ...itemActual, equipoSerial: '', trabajo: '', costoExtra: 0, repuestosUsados: [] });
    setHistorialEquipo(null);
  };

  const finalizar = async (confirmarTrabajo = false) => {
    if (estaBloqueado || ticketItems.length === 0) return;
    const loading = toast.loading(confirmarTrabajo ? 'Confirmando...' : 'Guardando...');
    
    try {
      console.log('📤 Iniciando guardado...');
      
      const clienteObj = db.clientes?.find(c => c.id.toString() === clienteId);
      const sedeIdReal = itemActual.sedeId || ticketItems[0]?.sedeId;
      const tieneEquipo = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== 'MOSTRADOR');

      const servicioData = {
        sedeId: parseInt(sedeIdReal),
        usuarioId: 1,
        fecha: new Date().toISOString().split('T')[0],
        servicioTipo: tieneEquipo ? 'TECNICA' : 'VENTA',
        estado: confirmarTrabajo ? 'REALIZADO' : 'PRESUPUESTO',
        clienteNombre: clienteObj?.nombre || 'Particular',
        sedeNombre: db.sedes?.find(s => s.id === sedeIdReal)?.nombreSede || 'Mostrador',
        items: ticketItems.map(it => {
          const esFiltro =
            it.trabajo?.toUpperCase().includes('FILTRO') ||
            it.repuestosUsados?.some(r => r.nombre.toUpperCase().includes('FILTRO'));
          return {
            equipoSerial: it.equipoSerial || 'MOSTRADOR',
            tecnico: 'Marcos',
            costo: parseFloat(it.totalCalculado),
            costoExtra: parseFloat(it.costoExtra) || 0,
            metodoPago: 'EFECTIVO',
            trabajoRealizado: it.resumenTexto,
            trabajoTipo: tieneEquipo ? (esFiltro ? 'CAMBIO_FILTRO' : 'REPARACION') : 'VENTA',
            repuestosUsados: it.repuestosUsados || [],
            garantiaHasta:
              confirmarTrabajo && tieneEquipo
                ? new Date(new Date().setMonth(new Date().getMonth() + (esFiltro ? 6 : 3)))
                    .toISOString()
                    .split('T')[0]
                : null
          };
        })
      };

      console.log('📊 Datos a enviar:', servicioData);

      let respuesta;
      if (idEdicion) {
        console.log(`🔄 Actualizando servicio ${idEdicion}...`);
        respuesta = await api.put(`/servicios/${idEdicion}`, servicioData);
        console.log('✅ Respuesta PUT:', respuesta.data);
      } else {
        console.log('➕ Creando nuevo servicio...');
        respuesta = await api.post('/servicios', servicioData);
        console.log('✅ Respuesta POST:', respuesta.data);
      }

      console.log('🎉 Guardado exitoso!');
      toast.success('✅ ¡Guardado!', { id: loading });
      setTicketItems([]);
      setClienteId(null);
      setIdEdicion(null);
      return true;
      
    } catch (err) {
      console.error('❌ Error completo:', err);
      console.error('📨 Respuesta del servidor:', err.response?.data);
      console.error('⚠️ Mensaje:', err.message);
      
      toast.error(`❌ ${err.response?.data?.mensaje || err.message || 'Error de servidor'}`, { id: loading });
      return false;
    }
  };

  // ==========================================
  // REFRESCAR DATOS (para cuando crean algo)
  // ==========================================
  const refrescarDatos = async () => {
    try {
      const [c, s, e, r] = await Promise.all([
        api.get('/clientes?page=0&size=1000'),
        api.get('/sedes?page=0&size=1000'),
        api.get('/equipos?page=0&size=1000'),
        api.get('/repuestos?page=0&size=1000')
      ]);

      const clientes = c.data.content || c.data;
      const sedes = s.data.content || s.data;
      const equipos = e.data.content || e.data;
      const repuestos = r.data.content || r.data;

      setDb({ clientes, sedes, equipos, repuestos });
    } catch (err) {
      console.error('Error refrescando datos');
    }
  };

  // ==========================================
  // RETORNAR TODOS LOS ESTADOS Y FUNCIONES
  // ==========================================
  return {
    // Datos
    db,
    setDb,
    clienteId,
    setClienteId,
    esPresupuesto,
    setEsPresupuesto,
    ticketItems,
    setTicketItems,
    idEdicion,
    setIdEdicion,
    estaBloqueado,
    setEstaBloqueado,
    historialEquipo,
    setHistorialEquipo,
    itemActual,
    setItemActual,
    repuestoElegido,
    setRepuestoElegido,
    
    // Modales
    modalClienteAbierto,
    setModalClienteAbierto,
    nombreClientePrellenado,
    setNombreClientePrellenado,
    modalSedeAbierto,
    setModalSedeAbierto,
    nombreSedePrellenado,
    setNombreSedePrellenado,
    
    // Funciones
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
  };
}