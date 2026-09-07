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

// Ruta con varias paradas (Google Maps las va a mostrar en el orden dado y
// deja elegir el modo de viaje ahí mismo — sirve tanto para comparar cuál es
// mejor camino a un solo lugar como para armar una recorrida con varias
// paradas). Usado por Presupuestos (admin) y Mis Órdenes (técnico).
export function buildGoogleMapsRouteUrl(direcciones) {
    const validas = (direcciones || []).filter(d => d && d !== 'Sin dirección' && d !== 'Mostrador');
    if (validas.length === 0) return null;
    const encoded = validas.map(d => encodeURIComponent(d));
    return `https://www.google.com/maps/dir/${encoded.join('/')}`;
}

// Fecha corta (dd/mm/aa) usada por ClienteCard y ClienteRow -- una sola
// implementación para que no queden dos formatos de fecha distintos.
export function formatFecha(fecha) {
    if (!fecha) return null;
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Datos derivados de un cliente que ClienteCard (mobile) y ClienteRow
// (desktop, 7-sep-2026) necesitan por igual -- centralizado acá para que
// las dos vistas no puedan desincronizarse calculando cada una lo suyo.
export function resumenCliente(cliente, sedes, equipos, servicios = []) {
    const serviciosCli = [...servicios.filter(s => (s.clienteId || s.cliente?.id) === cliente.id)]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || (b.id || 0) - (a.id || 0));
    const ultimoServicio = serviciosCli[0] || null;
    const diasSinAtender = ultimoServicio
        ? Math.floor((new Date() - new Date(ultimoServicio.fecha)) / (1000 * 60 * 60 * 24))
        : null;
    const alertaSinServicio = diasSinAtender !== null && diasSinAtender > 90;
    const esEmpresa = (cliente.clienteTipo || cliente.tipo) === 'EMPRESA';
    const tieneTecnica = serviciosCli.some(s => s.servicioTipo === 'TECNICA');
    const tieneVenta   = serviciosCli.some(s => s.servicioTipo === 'VENTA');
    const iniciales = cliente.nombre?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    return { serviciosCli, ultimoServicio, diasSinAtender, alertaSinServicio, esEmpresa, tieneTecnica, tieneVenta, iniciales };
}

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

