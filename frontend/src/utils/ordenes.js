// Datos de una orden de visita armados desde un presupuesto (29-sep-2026).
// Antes había dos armados distintos: el Despachar de Presupuestos mandaba
// dirección, monto, teléfono y descripción, y el auto-despacho del asistente
// ("Visita — Cliente") mandaba solo el título → la orden llegaba al técnico
// sin dirección ni monto, y al editarla el admin veía todo vacío.
const totalPresupuesto = (p) =>
    (p?.items || []).reduce((a, i) => a + Number(i.costo || 0), 0);

export function datosOrdenDesdePresupuesto(presupuesto, { tecnicoId, fechaProgramada, horaEstimada = null, prioridad = 'NORMAL' }) {
    const p = presupuesto || {};
    const total = totalPresupuesto(p);
    // Horario a coordinar: la orden va al primer día que le sirve al cliente (no
    // "hoy"), sin hora, y las franjas quedan escritas en las instrucciones.
    const tentativa = !!p.fechaTentativa && parseVentanas(p.ventanasDisponibles).length > 0;
    const trabajo = (p.items || []).map(it => it.trabajoRealizado).filter(Boolean).join(' · ');
    const descripcion = tentativa
        ? [`Horario a coordinar. El cliente puede: ${resumenVentanas(p.ventanasDisponibles).join(' / ')}`, trabajo].filter(Boolean).join('\n')
        : trabajo;
    return {
        tecnicoId:       Number(tecnicoId),
        titulo:          `Visita · ${p.clienteNombre || 'Cliente'}`,
        descripcion:     descripcion || '',
        clienteId:       p.clienteId || null,
        clienteNombre:   p.clienteNombre || '',
        clienteTelefono: p.clienteTelefono || '',
        direccion:       p.sedeDireccion || p.sedeNombre || '',
        prioridad,
        fechaProgramada: (tentativa && proximaFechaVentanas(p.ventanasDisponibles)) || fechaProgramada,
        horaEstimada:    tentativa ? null : (horaEstimada || null),
        montoEstimado:   total || null,
        formaPago:       'EFECTIVO',
        presupuestoId:   p.id,
    };
}

// ── Horario "a coordinar" (fecha tentativa) ─────────────────────────────────
// ventanas = JSON [{dia:'MIERCOLES', franja:'12:00-14:00'}, …] que marcó el admin
// según lo que prefiere el cliente.
const DIA_CORTO = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb' };
const ORDEN_DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const NOMBRE_FRANJA = { '08:00-12:00': 'Mañana', '12:00-14:00': 'Mediodía', '14:00-18:00': 'Tarde', '18:00-20:00': 'Tarde-noche' };
const DIA_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export function parseVentanas(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    try { return JSON.parse(json) || []; } catch { return []; }
}

// "Mié y Jue · Mediodía (12 a 14)"; varias franjas → una línea por franja
export function resumenVentanas(json) {
    const vs = parseVentanas(json);
    const porFranja = {};
    vs.forEach(v => { (porFranja[v.franja] = porFranja[v.franja] || []).push(v.dia); });
    return Object.keys(porFranja).sort().map(f => {
        const ids = [...new Set(porFranja[f])].sort((a, b) => ORDEN_DIAS.indexOf(a) - ORDEN_DIAS.indexOf(b));
        // Días seguidos (3 o más) como rango: "Lun a Sáb" (10-oct-2026)
        const tramos = [];
        ids.forEach(d => {
            const ult = tramos.at(-1);
            if (ult && ORDEN_DIAS.indexOf(d) === ORDEN_DIAS.indexOf(ult.at(-1)) + 1) ult.push(d); else tramos.push([d]);
        });
        const dias = tramos.flatMap(t => t.length >= 3 ? [`${DIA_CORTO[t[0]]} a ${DIA_CORTO[t.at(-1)]}`] : t.map(d => DIA_CORTO[d] || d));
        const listaDias = dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias.at(-1)}` : dias[0];
        const [desde, hasta] = f.split('-').map(h => String(Number(h.split(':')[0])));
        return `${listaDias} · ${NOMBRE_FRANJA[f] || f} (${desde} a ${hasta} h)`;
    });
}

// Próxima fecha (desde mañana) que cae en alguno de los días habilitados
export function proximaFechaVentanas(json) {
    const dias = new Set(parseVentanas(json).map(v => v.dia));
    if (dias.size === 0) return null;
    const d = new Date();
    for (let i = 1; i <= 14; i++) {
        d.setDate(d.getDate() + 1);
        if (dias.has(DIA_JS[d.getDay()])) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    }
    return null;
}
