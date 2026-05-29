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

