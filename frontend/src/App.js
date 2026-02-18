import React, { useEffect, useState } from 'react';
import { getServicios } from './services/api';

function App() {
const [servicios, setServicios] = useState([]);

useEffect(() => {
getServicios()
.then(response => setServicios(response.data))
.catch(error => console.error("Error:", error));
}, []);

return (
<div style={{ padding: '20px' }}>
<h1>Panel de Gestión - Dispenser La Tienda 💧</h1>
<ul>
{servicios.map(s => (
<li key={s.id}>{s.clienteNombre} - {s.tipo}</li>
))}
</ul>
{servicios.length === 0 && <p>Conectando con el servidor...</p>}
</div>
);
}

export default App;