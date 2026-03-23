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
        const matchCliente = c.nombre?.toLowerCase().includes(term) || c.localidad?.toLowerCase().includes(term);
        const sedesId = sedes.filter(s => s.cliente?.id === c.id).map(s => s.id);
        const matchEquipo = equipos.some(eq => sedesId.includes(eq.sede?.id) && eq.numeroSerie?.toLowerCase().includes(term));
        return matchCliente || matchEquipo;
    });
};