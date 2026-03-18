import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useClienteData() {
    const [clientes, setClientes] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const [resCli, resSed, resEqu] = await Promise.all([
                api.get('/clientes?page=0&size=1000'),
                api.get('/sedes?page=0&size=1000'),
                api.get('/equipos?page=0&size=1000')
            ]);
            setClientes(resCli.data.content || resCli.data);
            setSedes(resSed.data.content || resSed.data);
            setEquipos(resEqu.data.content || resEqu.data);
        } catch (err) {
            toast.error("Error de conexión al cargar datos");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { 
        cargarDatos(); 
    }, []);

    return { clientes, sedes, equipos, cargando, cargarDatos };
}