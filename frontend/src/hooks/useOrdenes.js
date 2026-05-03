import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useOrdenes({ tecnicoId = null } = {}) {
    const [ordenes, setOrdenes]       = useState([]);
    const [tecnicos, setTecnicos]     = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [desde, setDesde]           = useState('');
    const [hasta, setHasta]           = useState('');
    const [modalCrear, setModalCrear] = useState(false);
    const [ordenEditar, setOrdenEditar] = useState(null);

    const cargarTecnicos = useCallback(async () => {
        try {
            const res = await api.get('/ordenes/tecnicos');
            setTecnicos(res.data);
        } catch { /* silenciar */ }
    }, []);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            let res;
            if (tecnicoId) {
                res = await api.get(`/ordenes/mias/${tecnicoId}`);
            } else {
                const params = {};
                if (desde) params.desde = desde;
                if (hasta) params.hasta = hasta;
                res = await api.get('/ordenes', { params });
            }
            setOrdenes(res.data);
        } catch {
            toast.error('Error al cargar órdenes');
        } finally {
            setCargando(false);
        }
    }, [tecnicoId, desde, hasta]);

    useEffect(() => { cargar(); },          [cargar]);
    useEffect(() => { cargarTecnicos(); },  [cargarTecnicos]);

    const crear = async (form) => {
        const loading = toast.loading('Guardando...');
        try {
            await api.post('/ordenes', form);
            toast.success('Orden creada', { id: loading });
            setModalCrear(false);
            cargar();
        } catch { toast.error('Error al crear orden', { id: loading }); }
    };

    const actualizar = async (id, form) => {
        const loading = toast.loading('Guardando...');
        try {
            await api.put(`/ordenes/${id}`, form);
            toast.success('Orden actualizada', { id: loading });
            setOrdenEditar(null);
            cargar();
        } catch { toast.error('Error al actualizar', { id: loading }); }
    };

    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar esta orden?')) return;
        try {
            await api.delete(`/ordenes/${id}`);
            toast.success('Orden eliminada');
            cargar();
        } catch { toast.error('Error al eliminar'); }
    };

    const avanzarEstado = async (id, estado, notasTecnico = '') => {
        const loading = toast.loading('Actualizando...');
        try {
            await api.patch(`/ordenes/${id}/estado`, { estado, notasTecnico });
            toast.success('Estado actualizado', { id: loading });
            cargar();
        } catch { toast.error('Error al actualizar estado', { id: loading }); }
    };

    const abrirEditar = (orden) => setOrdenEditar(orden);
    const cerrarModal = () => { setModalCrear(false); setOrdenEditar(null); };

    return {
        ordenes, tecnicos, cargando,
        desde, setDesde, hasta, setHasta,
        modalCrear, setModalCrear,
        ordenEditar, abrirEditar, cerrarModal,
        crear, actualizar, eliminar, avanzarEstado,
        recargar: cargar,
    };
}
