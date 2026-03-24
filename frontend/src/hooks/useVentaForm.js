import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

export function useVentaForm(onSaved) {
    const [clientes,  setClientes]  = useState([]);
    const [repuestos, setRepuestos] = useState([]);
    const [clienteId, setClienteId] = useState(null);
    const [productos, setProductos] = useState([]);
    const [repuestoElegido, setRepuestoElegido] = useState(null);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [costoEnvio, setCostoEnvio] = useState(0);
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [nombreClientePrellenado, setNombreClientePrellenado] = useState('');

    useEffect(() => {
        const cargar = async () => {
            try {
                const [c, r] = await Promise.all([
                    api.get('/clientes?page=0&size=1000'),
                    api.get('/repuestos?page=0&size=1000')
                ]);
                setClientes(c.data.content || c.data);
                setRepuestos(r.data.content || r.data);
            } catch {
                toast.error('Error de conexión');
            }
        };
        cargar();
    }, []);

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
                precio:   parseFloat(repuestoElegido.precio),
                cantidad: 1,
                subtotal: parseFloat(repuestoElegido.precio)
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

    const subtotalProductos = productos.reduce((a, b) => a + b.subtotal, 0);
    const envioNum          = parseFloat(costoEnvio) || 0;
    const totalBruto        = subtotalProductos + envioNum;
    const descuentoMonto    = (totalBruto * descuentoPorcentaje) / 100;
    const totalFinal        = totalBruto - descuentoMonto;
    const clienteObj        = clientes.find(c => c.id.toString() === clienteId);

    /**
     * crearClienteRapido
     * Crea un cliente con datos mínimos y retorna su ID.
     */
    const crearClienteRapido = async (datosCliente) => {
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
        } catch (err) {
            toast.error('Error al registrar cliente');
            return null;
        }
    };

    /**
     * guardarVenta
     * Si registrarCliente=true y datosCliente tiene nombre,
     * primero crea el cliente en BD y lo asocia a la venta.
     */
    const guardarVenta = async (
        confirmar        = false,
        sedeIdOverride   = null,
        nombreOverride   = null,
        telefonoOverride = null,
        registrarCliente = false,
        datosCliente     = null
    ) => {
        if (!clienteId || productos.length === 0) {
            toast.error('Falta cliente o productos');
            return;
        }

        const loading = toast.loading(confirmar ? 'Confirmando...' : 'Guardando...');

        try {
            let sedeIdFinal = sedeIdOverride || 1;
            let nombreFinal = nombreOverride?.trim() || clienteObj?.nombre || 'Mostrador';
            let sedeNombreFinal = sedeIdOverride ? 'Mostrador' : 'Mostrador';

            // Si quiere registrar el cliente, crearlo primero
            if (registrarCliente && datosCliente?.nombre?.trim()) {
                const nuevoCliente = await crearClienteRapido(datosCliente);
                if (nuevoCliente) {
                    nombreFinal = nuevoCliente.nombre;
                    toast.success(`👤 Cliente "${nuevoCliente.nombre}" registrado`, { duration: 2000 });
                }
            }

            await api.post('/servicios', {
                sedeId:       parseInt(sedeIdFinal),
                usuarioId:    1,
                fecha:        new Date().toISOString().split('T')[0],
                servicioTipo: 'VENTA',
                estado:       confirmar ? 'REALIZADO' : 'PRESUPUESTO',
                clienteNombre: nombreFinal,
                sedeNombre:   sedeNombreFinal,
                descuentoPorcentaje,
                totalConDescuento: totalFinal,
                items: [{
                    equipoSerial:    'MOSTRADOR',
                    tecnico:         'Mostrador',
                    costo:           totalFinal,
                    costoExtra:      envioNum,
                    metodoPago:      'EFECTIVO',
                    trabajoRealizado: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}${envioNum > 0 ? ` | Envío: $${envioNum}` : ''}`,
                    trabajoTipo:     'VENTA',
                    repuestosUsados: productos,
                    garantiaHasta:   null
                }]
            });

            toast.success('✅ ¡Venta guardada!', { id: loading });
            setProductos([]);
            setClienteId(null);
            setDescuentoPorcentaje(0);
            setCostoEnvio(0);
            if (onSaved) onSaved();
        } catch (err) {
            toast.error(`❌ ${err.response?.data?.mensaje || err.message}`, { id: loading });
        }
    };

    const dispararPDF = (nombreOverride = null) => {
        const nombreFinal = nombreOverride?.trim() || clienteObj?.nombre || 'Mostrador';
        generarRemitoPDFPremium({
            esPresupuesto: false,
            cliente:  { nombre: nombreFinal },
            sede:     { nombreSede: 'Mostrador' },
            tecnico:  'Mostrador',
            ticketItems: [{
                equipoSerial:    'MOSTRADOR',
                trabajo:         `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
                repuestosUsados: productos,
                costoExtra:      envioNum,
                totalCalculado:  totalFinal,
                resumenTexto:    `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`
            }],
            descuentoPorcentaje,
            totalFinal,
            fechaServicio: new Date().toISOString().split('T')[0]
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
        descuentoMonto, subtotalProductos, totalBruto, totalFinal, envioNum,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        agregarProducto, actualizarCantidad, quitarProducto,
        guardarVenta, dispararPDF, onClienteNuevo,
    };
}