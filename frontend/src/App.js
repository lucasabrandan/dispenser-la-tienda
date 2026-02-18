import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import api from './services/api';

// Importamos los 3 componentes
import SedeForm from './components/SedeForm';
import EquipoForm from './components/EquipoForm'; // <--- El nuevo
import ServicioForm from './components/ServicioForm';
import ServicioList from './components/ServicioList';

function App() {
    const [servicios, setServicios] = useState([]);
    
    // Esta llave hace que los componentes se actualicen cuando creas algo nuevo
    const [refreshKey, setRefreshKey] = useState(0);

    const cargarLista = () => {
        api.get('/servicios')
            .then((res) => setServicios(res.data))
            .catch((err) => console.error("Error cargando lista:", err));
    };

    useEffect(() => {
        cargarLista();
    }, []);

    // Función para recargar todo
    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        cargarLista();
    };

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <Toaster position="top-right" />
            
            <h1 style={{textAlign: 'center'}}>Panel de Gestión - Dispenser 💧</h1>

            {/* PASO 1: CREAR SEDE */}
            <SedeForm onCreated={handleRefresh} />

            {/* PASO 2: CREAR EQUIPO (Ahora podés cargar máquinas) */}
            <EquipoForm onCreated={handleRefresh} />

            <hr style={{ margin: '30px 0', border: '0', borderTop: '2px dashed #ccc' }} />

            <h2 style={{color: '#444'}}>Registrar Servicio Técnico</h2>
            {/* PASO 3: REGISTRAR SERVICIO */}
            {/* La 'key' obliga a este form a recargar la lista de equipos cuando creas uno nuevo */}
            <ServicioForm 
                key={refreshKey} 
                onSaved={handleRefresh} 
            />

            <hr style={{ margin: '30px 0' }} />

            <h3>Historial de Servicios</h3>
            <ServicioList servicios={servicios} />
        </div>
    );
}

export default App;