import axios from 'axios';

const api = axios.create({
baseURL: 'http://localhost:8080/api'
});

// Esta función es la que llamará a tu controlador de Java
export const getServicios = () => api.get('/servicios');

export default api;