import React from 'react';
import { LuPlus } from 'react-icons/lu';

// Piezas comunes de las pantallas principales (4-oct-2026, Lucas: "no hay
// coherencia entre pantallas, me gusta como se ve Trabajos"). Todas copian el
// look de Trabajos: título + búsqueda + botón rojo arriba, pestañas grandes,
// fila de herramientas con bordes, y el contenido en el mismo ancho.

// Contenedor: mismo ancho y aire en todas las pantallas
export const CONTENEDOR = 'max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-3 md:space-y-4';

// Encabezado: título (+ bajada) a la izquierda; búsqueda, extras y acción a la derecha
export function PantallaHeader({ titulo, subtitulo, busqueda, accion, children, subtituloEnCelular = false }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            {/* En celular el nombre de la pantalla ya está en la barra de arriba: no se repite */}
            <div className={subtituloEnCelular && subtitulo ? '' : 'hidden md:block'}>
                <h2 className="hidden md:block text-2xl md:text-3xl font-black uppercase tracking-tight text-ink">{titulo}</h2>
                {subtitulo && <p className={`text-muted ${subtituloEnCelular ? 'text-body font-bold md:font-normal md:text-caption' : 'text-caption'}`}>{subtitulo}</p>}
            </div>
            {(busqueda || accion || children) && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {busqueda && <div className="flex-1 md:w-80 flex">{busqueda}</div>}
                    {children}
                    {accion}
                </div>
            )}
        </div>
    );
}

// Botón rojo principal ("Nuevo", "Cierre de caja"…). En celular se esconde si hay FAB.
export function BotonPrimario({ onClick, children, icono: Ic = LuPlus, enCelular = false, className = '' }) {
    return (
        <button type="button" onClick={onClick}
            className={`${enCelular ? 'inline-flex' : 'hidden md:inline-flex'} h-11 px-4 shrink-0 rounded-xl items-center gap-1.5 bg-[#C9341F] text-white text-label font-black active:scale-95 ${className}`}>
            {Ic && <Ic size={16} />} {children}
        </button>
    );
}

// Botón de la fila de herramientas (Exportar, Archivados, Seleccionar…)
export function BotonHerramienta({ onClick, icono: Ic, children, activo = false, title, disabled = false, textoEnCelular = false }) {
    return (
        <button type="button" onClick={onClick} title={title || (typeof children === 'string' ? children : undefined)} disabled={disabled}
            aria-pressed={activo}
            className={`h-9 md:h-10 px-2.5 md:px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-label font-bold border disabled:opacity-40 active:scale-95 ${activo ? 'border-brand-red text-ink' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
            {Ic && <Ic size={14} />}
            {children && <span className={textoEnCelular ? '' : 'hidden sm:inline'}>{children}</span>}
        </button>
    );
}

// Fila de herramientas (scroll horizontal en celular)
export function Herramientas({ children }) {
    return <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">{children}</div>;
}

// Selector chico segmentado (Lista / Por técnico, Última visita / A-Z)
export function Segmentado({ opciones, valor, onChange }) {
    return (
        <div className="flex shrink-0 rounded-xl bg-panel p-1">
            {opciones.map(({ id, label, icono: Ic }) => (
                <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={valor === id}
                    className={`h-8 md:h-9 px-2.5 md:px-3 rounded-lg inline-flex items-center gap-1.5 text-label font-bold ${valor === id ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}>
                    {Ic && <Ic size={14} />}<span className={Ic ? 'hidden sm:inline' : ''}>{label}</span>
                </button>
            ))}
        </div>
    );
}

// Pestañas grandes, iguales a "Por hacer / En marcha / Por cobrar"
// items: [{ id, label, count?, color? }]
export function Pestanas({ items, activo, onChange }) {
    return (
        <div className="flex gap-1 p-1 rounded-2xl bg-chip overflow-x-auto">
            {items.map(t => {
                const on = t.id === activo;
                return (
                    <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={on}
                        className={`flex-1 min-w-[5.5rem] h-12 md:h-14 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${on ? 'bg-card shadow-sm' : ''}`}>
                        <span className={`text-body font-black whitespace-nowrap ${on ? 'text-ink' : 'text-secondary'}`}>
                            {t.label}{t.count != null && <span className="opacity-70"> {t.count}</span>}
                        </span>
                        <span className={`w-5 h-[3px] rounded-full ${t.color ? '' : on ? 'bg-brand-red' : 'bg-transparent'}`}
                            style={t.color ? { background: t.color } : undefined} />
                    </button>
                );
            })}
        </div>
    );
}
