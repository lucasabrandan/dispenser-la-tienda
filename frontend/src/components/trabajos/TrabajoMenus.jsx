import React from 'react';
import { LuPencil, LuCopy, LuFileText, LuPause, LuPlay, LuArchive, LuTrash2, LuWrench, LuShoppingCart, LuLayers, LuCalendarPlus, LuRotateCcw, LuEye } from 'react-icons/lu';
import ActionSheet from '../ui/ActionSheet';

// Botón de una fila de menú (mismo estilo en los dos sheets)
function Opcion({ Icon, label, sub, onClick, peligro = false }) {
    return (
        <button type="button" onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left active:bg-chip transition-colors ${peligro ? 'text-[#D13A28] dark:text-[#F87171]' : 'text-ink'}`}>
            <Icon size={18} className="shrink-0" />
            <span className="min-w-0">
                <span className="block text-body font-bold">{label}</span>
                {sub && <span className="block text-caption text-muted">{sub}</span>}
            </span>
        </button>
    );
}

// "+ Nuevo": qué querés cargar
export function NuevoSheet({ open, onClose, onElegir }) {
    const elegir = (q) => { onClose(); onElegir(q); };
    return (
        <ActionSheet open={open} onClose={onClose}>
            <p className="px-4 pt-1 pb-2 text-label font-black uppercase tracking-widest text-muted">Nuevo</p>
            <Opcion Icon={LuWrench} label="Trabajo / presupuesto" sub="Service, reparación o instalación" onClick={() => elegir('nuevo')} />
            <Opcion Icon={LuShoppingCart} label="Venta" sub="Productos sin visita técnica" onClick={() => elegir('venta')} />
            <Opcion Icon={LuLayers} label="Cotizar por volumen" sub="Muchos equipos, precio por cantidad" onClick={() => elegir('volumen')} />
            <Opcion Icon={LuCalendarPlus} label="Visita sin presupuesto" sub="Agendar a un técnico directo" onClick={() => elegir('visita')} />
        </ActionSheet>
    );
}

// ⋯ de cada trabajo. Solo muestra lo que tiene sentido según la etapa.
export function TrabajoMenu({ fila, onClose, on }) {
    const s = fila?.servicio;
    const abierto = !!fila;
    if (!abierto) return null;
    const run = (fn) => () => { onClose(); fn(); };
    const esArchivado = s?.estado === 'ARCHIVADO';
    const editable = s && ['PRESUPUESTO', 'APROBADO', 'EN_PROGRESO'].includes(s.estado);
    return (
        <ActionSheet open={abierto} onClose={onClose}>
            <p className="px-4 pt-1 pb-2 text-label font-black uppercase tracking-widest text-muted truncate">{fila.cliente}</p>
            {s && <Opcion Icon={LuEye} label="Ver detalle" onClick={run(() => on.detalle(s))} />}
            {editable && <Opcion Icon={LuPencil} label="Editar" onClick={run(() => on.editar(s))} />}
            {s && !esArchivado && <Opcion Icon={LuCopy} label="Duplicar" sub="Mismo cliente y equipos, nuevo presupuesto" onClick={run(() => on.duplicar(s))} />}
            {s && <Opcion Icon={LuFileText} label="PDF" onClick={run(() => on.pdf(s))} />}
            {editable && (s.enEspera
                ? <Opcion Icon={LuPlay} label="Retomar" sub="Vuelve a Presupuesto para asignar" onClick={run(() => on.espera(s, false))} />
                : <Opcion Icon={LuPause} label="Poner en espera" sub="El cliente todavía no confirmó" onClick={run(() => on.espera(s, true))} />)}
            {s && !esArchivado && <Opcion Icon={LuArchive} label="Archivar" onClick={run(() => on.archivar(s))} />}
            {esArchivado && <Opcion Icon={LuRotateCcw} label="Recuperar" sub="Vuelve como presupuesto" onClick={run(() => on.recuperar(s))} />}
            {fila.orden && !s && <Opcion Icon={LuPencil} label="Editar visita" onClick={run(() => on.editarOrden(fila.orden))} />}
            {s && <Opcion Icon={LuTrash2} label="Eliminar" sub="No se puede deshacer" peligro onClick={run(() => on.eliminar(s))} />}
        </ActionSheet>
    );
}
