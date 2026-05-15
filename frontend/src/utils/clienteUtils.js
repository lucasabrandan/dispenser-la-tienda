import { toast } from 'react-hot-toast';

export const abrirWhatsApp = (telefono, nombre) => {
    if (!telefono) return toast.error("Sin teléfono");
    let num = telefono.replace(/\D/g, '');
    if (!num.startsWith('54')) num = '549' + num;
    window.open(`https://wa.me/${num}?text=Hola%20${nombre}`, '_blank');
};

export const abrirMaps = (c) => {
    const destino = `${c.calle} ${c.numero}, ${c.localidad}, Argentina`.trim();
    if (!c.calle) return toast.error("Dirección incompleta");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`, '_blank');
};

export const filtrarClientesPorBusqueda = (clientes, sedes, equipos, busqueda) => {
    return clientes.filter(c => {
        const term = busqueda.toLowerCase();
        // Cliente: nombre, localidad, teléfono, dirección
        const matchCliente = c.nombre?.toLowerCase().includes(term)
            || c.localidad?.toLowerCase().includes(term)
            || c.telefono?.toLowerCase().includes(term)
            || c.calle?.toLowerCase().includes(term);
        // Sedes del cliente
        const sedesCli = sedes.filter(s => s.clienteId === c.id);
        const matchSede = sedesCli.some(s => s.nombreSede?.toLowerCase().includes(term)
            || s.direccion?.toLowerCase().includes(term));
        // Equipos del cliente
        const sedesId = sedesCli.map(s => s.id);
        const matchEquipo = equipos.some(eq => sedesId.includes(eq.sedeId) && eq.numeroSerie?.toLowerCase().includes(term));
        return matchCliente || matchSede || matchEquipo;
    });
};

// Aplica el filtro de chip rápido sobre la lista ya filtrada por texto
export const aplicarFiltroChip = (clientes, sedes, equipos, servicios, chip) => {
    if (!chip) return clientes;
    const hoy = new Date();
    return clientes.filter(c => {
        if (chip === 'empresa') return c.clienteTipo === 'EMPRESA';

        if (chip === 'sin-servicio') {
            const serviciosCli = servicios.filter(s => s.clienteId === c.id);
            if (serviciosCli.length === 0) return true;
            const ultimo = [...serviciosCli].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
            const dias = Math.floor((hoy - new Date(ultimo.fecha)) / (1000 * 60 * 60 * 24));
            return dias > 90;
        }

        if (chip === 'con-archivados') {
            const sedesIds = sedes.filter(s => s.clienteId === c.id).map(s => s.id);
            return equipos.some(eq => sedesIds.includes(eq.sedeId) && eq.activo === false);
        }

        return true;
    });
};

// Días transcurridos desde la última fecha de servicio del cliente
export const diasSinServicio = (servicios, clienteId) => {
    const serviciosCli = servicios.filter(s => s.clienteId === clienteId);
    if (serviciosCli.length === 0) return null;
    const ultimo = [...serviciosCli].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    return Math.floor((new Date() - new Date(ultimo.fecha)) / (1000 * 60 * 60 * 24));
};