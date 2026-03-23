import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

/**
 * useVentaForm
 * Acepta sedeIdOverride para el modo Mostrador (Venta Rápida).
 */
export function useVentaForm(onSaved) {
    const [clientes,  setClientes]  = useState([]);
    const [repuestos, setRepuestos] = useState([]);
    const [clienteId, setClienteId] = useState(null);
    const [productos, setProductos] = useState([]);
    const [repuestoElegido, setRepuestoElegido] = useState(null);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
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
        setProductos(prev => [...prev, {
            id:       repuestoElegido.id,
            nombre:   repuestoElegido.nombre,
            sku:      repuestoElegido.sku,
            precio:   parseFloat(repuestoElegido.precio),
            cantidad: 1,
            subtotal: parseFloat(repuestoElegido.precio)
        }]);
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

    const totalBruto     = productos.reduce((a, b) => a + b.subtotal, 0);
    const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
    const totalFinal     = totalBruto - descuentoMonto;
    const clienteObj     = clientes.find(c => c.id.toString() === clienteId);

    // sedeIdOverride = sedeId del Mostrador cuando es Venta Rápida
    const guardarVenta = async (confirmar = false, sedeIdOverride = null) => {
        if (!clienteId || productos.length === 0) {
            toast.error('Falta cliente o productos');
            return;
        }

        const sedeIdFinal = sedeIdOverride || 1;
        const loading = toast.loading(confirmar ? 'Confirmando...' : 'Guardando...');

        try {
            await api.post('/servicios', {
                sedeId:       parseInt(sedeIdFinal),
                usuarioId:    1,
                fecha:        new Date().toISOString().split('T')[0],
                servicioTipo: 'VENTA',
                estado:       confirmar ? 'REALIZADO' : 'PRESUPUESTO',
                clienteNombre: clienteObj?.nombre || 'Mostrador',
                sedeNombre:   sedeIdOverride ? 'Mostrador' : 'Mostrador',
                descuentoPorcentaje,
                totalConDescuento: totalFinal,
                items: [{
                    equipoSerial:    'MOSTRADOR',
                    tecnico:         'Mostrador',
                    costo:           totalFinal,
                    costoExtra:      0,
                    metodoPago:      'EFECTIVO',
                    trabajoRealizado: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
                    trabajoTipo:     'VENTA',
                    repuestosUsados: productos,
                    garantiaHasta:   null
                }]
            });
            toast.success('✅ ¡Venta guardada!', { id: loading });
            setProductos([]);
            setClienteId(null);
            setDescuentoPorcentaje(0);
            if (onSaved) onSaved();
        } catch (err) {
            toast.error(`❌ ${err.response?.data?.mensaje || err.message}`, { id: loading });
        }
    };

    const dispararPDF = () => {
        generarRemitoPDFPremium({
            esPresupuesto: false,
            cliente:       clienteObj,
            sede:          { nombreSede: 'Mostrador' },
            tecnico:       'Mostrador',
            ticketItems: [{
                equipoSerial:    'MOSTRADOR',
                trabajo:         `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
                repuestosUsados: productos,
                costoExtra:      0,
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
        descuentoMonto, totalBruto, totalFinal,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        agregarProducto, actualizarCantidad, quitarProducto,
        guardarVenta, dispararPDF, onClienteNuevo,
    };
}