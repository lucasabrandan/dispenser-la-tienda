import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useClienteData() {
    const [clientes, setClientes]   = useState([]);
    const [sedes, setSedes]         = useState([]);
    const [equipos, setEquipos]     = useState([]);
    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando]   = useState(true);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const [resCli, resSed, resEqu, resSvc] = await Promise.all([
                api.get('/clientes?page=0&size=500'),
                api.get('/sedes?page=0&size=500'),
                api.get('/equipos?page=0&size=500'),
                api.get('/servicios?page=0&size=500&sort=fechaServicio,desc'),
            ]);
            setClientes(resCli.data.content || resCli.data);
            setSedes(resSed.data.content    || resSed.data);
            setEquipos(resEqu.data.content  || resEqu.data);
            setServicios(resSvc.data.content || resSvc.data);
        } catch (err) {
            toast.error("Error de conexión al cargar datos");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    return { clientes, sedes, equipos, servicios, cargando, cargarDatos };
}
