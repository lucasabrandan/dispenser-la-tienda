import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api', // <-- Clave: localhost
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getServicios = () => api.get('/servicios');
export const getSedes = () => api.get('/sedes');
export const getEquipos = () => api.get('/equipos');
export const getRepuestos = () => api.get('/repuestos'); 
export const crearServicio = (data) => api.post('/servicios', data);

export default api;