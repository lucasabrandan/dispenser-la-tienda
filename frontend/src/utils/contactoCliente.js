// Contacto con el cliente a través del admin (5-oct-2026). El técnico pide con
// un motivo; el admin le escribe al cliente desde su WhatsApp con el mensaje armado.
export const MOTIVOS_CONTACTO = ['Voy en camino', 'Me demoro', 'Llegué y no hay nadie', 'No me atiende', 'Otro'];

export const TITULO_CONTACTO = 'Contactar al cliente';

export function mensajeParaCliente(motivoTexto, { clienteNombre, tecnicoNombre }) {
    const quien = (tecnicoNombre || 'el técnico').split(' ')[0];
    const hola = `Hola${clienteNombre ? ` ${clienteNombre}` : ''}, te escribimos de Dispenser La Tienda.`;
    const m = String(motivoTexto || '');
    if (m.startsWith('Voy en camino')) return `${hola} ${quien} ya está en camino para la visita.`;
    if (m.startsWith('Me demoro')) return `${hola} ${quien} viene un poco demorado, llega en breve. Disculpá la demora.`;
    if (m.startsWith('Llegué y no hay nadie')) return `${hola} ${quien} ya está en el lugar y no encuentra a nadie. ¿Nos avisás si lo pueden atender?`;
    if (m.startsWith('No me atiende')) return `${hola} ${quien} está intentando comunicarse por la visita de hoy. ¿Nos confirmás si lo pueden atender?`;
    return `${hola} Te contactamos por la visita de hoy.`;
}

export function linkWhatsApp(telefono, texto) {
    let num = String(telefono || '').replace(/\D/g, '');
    if (!num) return null;
    if (num.startsWith('0')) num = num.slice(1);
    if (!num.startsWith('54')) num = '549' + num;
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
