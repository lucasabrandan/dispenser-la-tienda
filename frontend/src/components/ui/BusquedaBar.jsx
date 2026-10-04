import React, { useRef } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';

// Barra de búsqueda unificada — la usan Trabajos, Venta, Clientes, Productos,
// Presupuestos y Servicio Técnico, así se ven y actúan igual en todos lados.
//
// 3-oct-2026: antes, en el celular, el buscador quedaba escondido detrás de un
// botón-lupa que al tocarlo se ponía rojo y abría el campo al lado (o abajo,
// según la pantalla). Se veía distinto en cada lugar y el botón rojo quedaba
// colgado. Ahora el campo está SIEMPRE visible, en celular y en compu, ocupando
// el lugar que sobra en la fila; con ✕ para borrar lo escrito.
// (onExpandChange y accent quedan aceptados para no romper a quien los pasa.)
export default function BusquedaBar({ valor, onChange, placeholder = 'Buscar...' }) {
    const ref = useRef(null);
    return (
        <div className="relative flex-1 min-w-0">
            <LuSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
                ref={ref}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={valor}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { onChange(''); ref.current?.blur(); } }}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full h-9 pl-9 pr-9 rounded-xl text-body outline-none bg-card text-ink placeholder:text-muted border border-black/[0.08] dark:border-white/[0.08] focus:border-[#D13A28] dark:focus:border-[#E8422F] [&::-webkit-search-cancel-button]:hidden"
            />
            {valor && (
                <button type="button" onClick={() => { onChange(''); ref.current?.focus(); }} aria-label="Borrar búsqueda"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-muted active:bg-chip">
                    <LuX size={15} />
                </button>
            )}
        </div>
    );
}
