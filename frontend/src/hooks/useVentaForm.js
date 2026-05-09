import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export function useVentaForm(onSaved, clienteInicialId = null) {
    const [clientes,  setClientes]  = useState([]);
    const [repuestos, setRepuestos] = useState([]);
    const [clienteId, setClienteId] = useState(clienteInicialId ? String(clienteInicialId) : null);
    const [productos, setProductos] = useState([]);
    const [repuestoElegido, setRepuestoElegido] = useState(null);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [costoEnvio, setCostoEnvio] = useState('');
    const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().split('T')[0]);
    const [leyenda, setLeyenda] = useState('');
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [nombreClientePrellenado, setNombreClientePrellenado] = useState('');

    // Estado del flujo de 3 pasos
    const [modoRapido, setModoRapido] = useState(false);
    const [registrarCliente, setRegistrarCliente] = useState(false);
    const [datosCliente, setDatosCliente] = useState({
        nombre: '', telefono: '', email: '',
        calle: '', numero: '', localidad: '', provincia: 'Buenos Aires', notas: ''
    });

    useEffect(() => {
        const cargar = async () => {
            try {
                const [c, r] = await Promise.all([
                    api.get('/clientes?page=0&size=500'),
                    api.get('/repuestos?page=0&size=500')
                ]);
                setClientes(c.data.content || c.data);
                setRepuestos(r.data.content || r.data);
            } catch {
                toast.error('Error de conexión');
            }
        };
        cargar();
    }, []);

    const handleDatosChange = (e) =>
        setDatosCliente(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Activar modo rápido (MOSTRADOR)
    const activarRapido = (mostradorCid) => {
        if (mostradorCid) { setClienteId(mostradorCid.toString()); setModoRapido(true); }
    };

    // Volver al modo con cliente
    const activarNormal = () => {
        setClienteId(null);
        setModoRapido(false);
        setRegistrarCliente(false);
        setDatosCliente({ nombre: '', telefono: '', email: '', calle: '', numero: '', localidad: '', provincia: 'Buenos Aires', notas: '' });
    };

    const agregarProducto = () => {
        if (!repuestoElegido) return;
        setProductos(prev => {
            const idx = prev.findIndex(p => p.id === repuestoElegido.id);
            if (idx > -1) {
                const nuevos = [...prev];
                nuevos[idx].cantidad += 1;
                nuevos[idx].subtotal  = nuevos[idx].cantidad * nuevos[idx].precio;
                return nuevos;
            }
            return [...prev, {
                id:       repuestoElegido.id,
                nombre:   repuestoElegido.nombre,
                sku:      repuestoElegido.sku,
                precio:   parseFloat(repuestoElegido.precio) || 0,
                cantidad: 1,
                subtotal: parseFloat(repuestoElegido.precio) || 0,
                fotoUrl:  repuestoElegido.fotoUrl || null,
            }];
        });
        setRepuestoElegido(null);
    };

    const actualizarCantidad = (idx, valor) => {
        setProductos(prev => {
            const nuevos = [...prev];
            const qty = Math.max(1, parseInt(valor) || 1);
            nuevos[idx] = { ...nuevos[idx], cantidad: qty, subtotal: qty * nuevos[idx].precio };
            return nuevos;
        });
    };

    const quitarProducto = (idx) => setProductos(prev => prev.filter((_, i) => i !== idx));

    // Estado del modal de creación rápida de repuesto
    const [modalRepuesto, setModalRepuesto]   = useState(false);
    const [nombreRepuesto, setNombreRepuesto] = useState('');

    // Al crear un repuesto desde el modal rápido, añadirlo a la lista y seleccionarlo
    const repuestoCreado = (repuesto) => {
        setRepuestos(prev => [...prev, repuesto]);
        setRepuestoElegido({ ...repuesto, label: `[${repuesto.sku}] ${repuesto.nombre}`, value: repuesto.id });
    };

    // Abrir el modal de creación desde CreatableSelect
    const abrirModalRepuesto = (nombre) => {
        setNombreRepuesto(nombre);
        setModalRepuesto(true);
    };

    const subtotalProductos = productos.reduce((a, b) => a + b.subtotal, 0);
    const envioNum          = parseFloat(costoEnvio) || 0;
    const totalBruto        = subtotalProductos + envioNum;
    const descuentoMonto    = (totalBruto * descuentoPorcentaje) / 100;
    const totalFinal        = totalBruto - descuentoMonto;
    const clienteObj        = clientes.find(c => c.id.toString() === clienteId);

    // Crea un cliente con datos mínimos antes de guardar la venta
    const crearClienteRapido = async () => {
        try {
            const res = await api.post('/clientes', {
                clienteTipo:  'PARTICULAR',
                nombre:       datosCliente.nombre.trim(),
                telefono:     datosCliente.telefono?.trim() || null,
                email:        datosCliente.email?.trim()    || null,
                condicionIva: 'CONSUMIDOR_FINAL',
                calle:        datosCliente.calle?.trim()    || 'Sin dirección',
                numero:       datosCliente.numero?.trim()   || '0',
                localidad:    datosCliente.localidad?.trim() || 'Sin localidad',
                provincia:    datosCliente.provincia?.trim() || 'Buenos Aires',
                direccion:    datosCliente.calle ? `${datosCliente.calle} ${datosCliente.numero}, ${datosCliente.localidad}` : null,
                notas:        datosCliente.notas?.trim() || null,
            });
            setClientes(prev => [...prev, res.data]);
            return res.data;
        } catch {
            toast.error('Error al registrar cliente');
            return null;
        }
    };

    const resetForm = () => {
        setProductos([]);
        setClienteId(null);
        setDescuentoPorcentaje(0);
        setCostoEnvio('');
        setLeyenda('');
        setModoRapido(false);
        setRegistrarCliente(false);
        setDatosCliente({ nombre: '', telefono: '', email: '', calle: '', numero: '', localidad: '', provincia: 'Buenos Aires', notas: '' });
    };

    // mostradorSid: ID de sede MOSTRADOR para ventas rápidas (de useMostrador)
    const guardarVenta = async (confirmar = false, mostradorSid = null) => {
        if (!clienteId || productos.length === 0) {
            toast.error('Falta cliente o productos');
            return;
        }

        const loading = toast.loading(confirmar ? 'Confirmando...' : 'Guardando...');

        try {
            let nombreFinal = modoRapido
                ? (datosCliente.nombre?.trim() || 'Mostrador')
                : (clienteObj?.nombre || 'Mostrador');

            // Si el usuario quiere registrar el cliente, crearlo antes de guardar
            if (modoRapido && registrarCliente && datosCliente?.nombre?.trim()) {
                const nuevoCliente = await crearClienteRapido();
                if (nuevoCliente) {
                    nombreFinal = nuevoCliente.nombre;
                    toast.success(`Cliente "${nuevoCliente.nombre}" registrado`, { duration: 2000 });
                }
            }

            await api.post('/servicios', {
                sedeId:            parseInt(mostradorSid || 1),
                usuarioId:         1,
                fecha:             fechaVenta,
                servicioTipo:      'VENTA',
                estado:            confirmar ? 'REALIZADO' : 'PRESUPUESTO',
                clienteNombre:     nombreFinal,
                sedeNombre:        'Mostrador',
                descuentoPorcentaje,
                observaciones:     leyenda || '',
                totalConDescuento: totalFinal,
                items: [{
                    equipoSerial:     'MOSTRADOR',
                    tecnico:          'Mostrador',
                    costo:            totalFinal,
                    costoExtra:       envioNum,
                    metodoPago:       'EFECTIVO',
                    trabajoRealizado: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}${envioNum > 0 ? ` | Envío: $${envioNum}` : ''}`,
                    trabajoTipo:      'VENTA',
                    repuestosUsados:  productos,
                    garantiaHasta:    null
                }]
            });

            toast.success('¡Venta guardada!', { id: loading });
            resetForm();
            if (onSaved) onSaved();
        } catch (err) {
            toast.error(`${err.response?.data?.mensaje || err.message}`, { id: loading });
        }
    };

    const dispararPDF = () => {
        const clienteFinal = modoRapido
            ? { nombre: datosCliente.nombre?.trim() || 'Mostrador', telefono: datosCliente.telefono, email: datosCliente.email }
            : (clienteObj || { nombre: 'Mostrador' });
        const tecnico = localStorage.getItem('tecnico_nombre') || 'Mostrador';
        generarRemitoPDFPremium({
            tipo:     'PRESUPUESTO_VENTA',
            cliente:  clienteFinal,
            sede:     { nombreSede: 'Mostrador' },
            tecnico,
            ticketItems: [{
                equipoSerial:    'MOSTRADOR',
                repuestosUsados: productos,
                costoExtra:      envioNum,
                totalCalculado:  totalFinal,
            }],
            descuentoPorcentaje,
            leyenda,
            totalFinal,
            fechaServicio: fechaVenta
        });
    };

    const onClienteNuevo = (clienteNuevo) => {
        setClientes(prev => [...prev, clienteNuevo]);
        setClienteId(clienteNuevo.id.toString());
        setModalClienteAbierto(false);
    };

    return {
        clientes, repuestos,
        clienteId, setClienteId,
        clienteObj,
        productos,
        repuestoElegido, setRepuestoElegido,
        descuentoPorcentaje, setDescuentoPorcentaje,
        costoEnvio, setCostoEnvio,
        leyenda, setLeyenda,
        fechaVenta, setFechaVenta,
        descuentoMonto, subtotalProductos, totalBruto, totalFinal, envioNum,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        modoRapido, registrarCliente, setRegistrarCliente,
        datosCliente, handleDatosChange,
        activarRapido, activarNormal,
        agregarProducto, actualizarCantidad, quitarProducto, setProductos,
        modalRepuesto, setModalRepuesto, nombreRepuesto, repuestoCreado, abrirModalRepuesto,
        guardarVenta, dispararPDF, onClienteNuevo,
    };
}
