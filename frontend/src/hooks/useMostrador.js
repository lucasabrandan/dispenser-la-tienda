import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * useMostrador
 * Garantiza que el cliente "MOSTRADOR" y su sede existen en el sistema.
 * Si no existen, los crea automáticamente en el primer uso.
 *
 * Retorna: { clienteId, sedeId, listo }
 * donde clienteId y sedeId son los IDs reales del backend.
 */

// Cache en memoria para no hacer el request en cada render
let _cache = null;

export function useMostrador() {
    const [clienteId, setClienteId] = useState(_cache?.clienteId || null);
    const [sedeId,    setSedeId]    = useState(_cache?.sedeId    || null);
    const [listo,     setListo]     = useState(!!_cache);

    useEffect(() => {
        if (_cache) return; // ya lo tenemos
        inicializar();
    }, []);

    const inicializar = async () => {
        try {
            // 1. Buscar si ya existe el cliente MOSTRADOR
            const res  = await api.get('/clientes?page=0&size=500');
            const data = res.data.content || res.data || [];
            let cliente = data.find(c =>
                c.nombre?.toUpperCase() === 'MOSTRADOR' ||
                c.nombre?.toUpperCase() === 'VENTA MOSTRADOR'
            );

            // 2. Si no existe, crearlo
            if (!cliente) {
                const resCreate = await api.post('/clientes', {
                    clienteTipo:  'PARTICULAR',
                    nombre:       'MOSTRADOR',
                    condicionIva: 'CONSUMIDOR_FINAL',
                    calle:        'Sin dirección',
                    numero:       '0',
                    localidad:    'Mostrador',
                    provincia:    'Buenos Aires',
                    notas:        'Cliente automático para ventas rápidas y presupuestos sin cliente registrado'
                });
                cliente = resCreate.data;
            }

            // 3. Buscar sede del cliente MOSTRADOR
            const resSedes = await api.get('/sedes?page=0&size=500');
            const sedes    = resSedes.data.content || resSedes.data || [];
            let sede = sedes.find(s => s.cliente?.id === cliente.id);

            // 4. Si no tiene sede, crearla
            if (!sede) {
                const resSedeCreate = await api.post('/sedes', {
                    clienteId:  cliente.id,
                    nombreSede: 'Mostrador',
                    calle:      'Sin dirección',
                    numero:     '0',
                    localidad:  'Mostrador',
                    provincia:  'Buenos Aires',
                    direccion:  'Mostrador'
                });
                sede = resSedeCreate.data;
            }

            // 5. Guardar en cache y en estado
            _cache = { clienteId: cliente.id, sedeId: sede.id };
            setClienteId(cliente.id);
            setSedeId(sede.id);
            setListo(true);

        } catch (err) {
            console.error('Error inicializando Mostrador:', err);
            // Fallback a IDs hardcodeados si el backend falla
            _cache = { clienteId: null, sedeId: null };
            setListo(true);
        }
    };

    return { clienteId, sedeId, listo };
}