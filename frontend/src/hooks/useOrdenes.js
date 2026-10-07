import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { formatDateISO } from '../utils/dateUtils';
import { enviarOEncolar } from '../utils/pendientesOffline';

// Rango por defecto: lunes de esta semana hasta domingo
function rangoSemanaActual() {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0=dom, 1=lun...
    const diffLunes = (dia === 0 ? -6 : 1 - dia);
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { desde: formatDateISO(lunes), hasta: formatDateISO(domingo) };
}

// enabled=false: no dispara fetch (ni de ordenes ni de tecnicos) — lo usa
// ServicioManager.jsx para no pegarle a /ordenes cuando el usuario no es admin
// (los tecnicos no ven las tabs Pendientes/En camino/En sitio del hub).
export function useOrdenes({ tecnicoId = null, enabled = true } = {}) {
    const [ordenes, setOrdenes]       = useState([]);
    const [tecnicos, setTecnicos]     = useState([]);
    const [cargando, setCargando]     = useState(true);
    const { desde: desdeDefault, hasta: hastaDefault } = rangoSemanaActual();
    const [desde, setDesde]           = useState(tecnicoId ? '' : desdeDefault);
    const [hasta, setHasta]           = useState(tecnicoId ? '' : hastaDefault);
    const [modalCrear, setModalCrear] = useState(false);
    const [ordenEditar, setOrdenEditar] = useState(null);

    const cargarTecnicos = useCallback(async () => {
        try {
            const res = await api.get('/ordenes/tecnicos');
            setTecnicos(res.data);
        } catch (err) { console.warn('Ordenes: error cargando tecnicos', err); }
    }, []);

    const cargar = useCallback(async () => {
        if (!enabled) { setCargando(false); return; }
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
    }, [tecnicoId, desde, hasta, enabled]);

    useEffect(() => { cargar(); },          [cargar]);
    useEffect(() => { if (enabled) cargarTecnicos(); }, [cargarTecnicos, enabled]);

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
            const { estadoNuevo, ...datos } = form;
            await api.put(`/ordenes/${id}`, datos);
            if (estadoNuevo) {
                await api.patch(`/ordenes/${id}/estado`, { estado: estadoNuevo });
            }
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

    // Eliminar sin confirm ni recarga (para uso masivo)
    const eliminarDireto = (id) => api.delete(`/ordenes/${id}`);

    const avanzarEstado = async (id, estado, notasTecnico = '') => {
        const loading = toast.loading('Actualizando...');
        try {
            const r = await enviarOEncolar('patch', `/ordenes/${id}/estado`, { estado, notasTecnico }, `Visita #${id} → ${estado}`);
            if (r.encolado) {
                // Sin señal: se refleja ya en pantalla y se manda solo después
                setOrdenes(os => os.map(o => o.id === id ? { ...o, estado } : o));
                toast('Sin señal: quedó guardado, se manda solo', { id: loading, icon: '📶' });
                return;
            }
            toast.success('Estado actualizado', { id: loading });
            cargar();
        } catch (e) {
            // Mostrar el motivo real (ej. "Esta visita fue cancelada por el admin") y refrescar
            toast.error(e?.response?.data?.mensaje || 'Error al actualizar estado', { id: loading });
            cargar();
        }
    };

    const abrirEditar = (orden) => setOrdenEditar(orden);
    const cerrarModal = () => { setModalCrear(false); setOrdenEditar(null); };

    return {
        ordenes, tecnicos, cargando,
        desde, setDesde, hasta, setHasta,
        modalCrear, setModalCrear,
        ordenEditar, abrirEditar, cerrarModal,
        crear, actualizar, eliminar, eliminarDireto, avanzarEstado,
        recargar: cargar,
    };
}
