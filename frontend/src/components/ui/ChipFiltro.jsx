import React from 'react';
import { LuCalendar } from 'react-icons/lu';

// Chip que despliega un panel de filtros (Lucas, 7-sep-2026: unifica el
// "Filtros" de Servicio Técnico -- antes un botón cuadrado con un ícono de
// engranaje, sin decir qué había elegido --, el de Venta -- antes un link de
// texto suelto en el medio del contenido, no en el header --, y el de
// Presupuestos -- el único que ya mostraba el período elegido en el propio
// chip, ej. "Este mes ▾". Se toma esa tercera variante como base porque es la
// que más dice de un vistazo, y se usa también para "Orden" en Productos.
//
// className, si se pasa, REEMPLAZA el utility de display (por defecto "flex")
// en vez de sumarse -- así un caller puede esconder el chip en mobile
// (ej. "hidden md:flex") sin que quede compitiendo con el "flex" de acá.
export default function ChipFiltro({ label, icono: Icono = LuCalendar, activo, onClick, className }) {
    const display = className || 'flex';
    return (
        <button onClick={onClick}
            className={`${display} h-9 px-2.5 rounded-lg items-center gap-1 shrink-0 active:scale-95 shadow-sm border text-label font-bold whitespace-nowrap ${
                activo ? 'bg-brand-red text-white border-transparent' : 'bg-card text-secondary border-black/[0.05] dark:border-white/[0.05]'
            }`}>
            <Icono size={12} /> {label} {activo ? '▴' : '▾'}
        </button>
    );
}
