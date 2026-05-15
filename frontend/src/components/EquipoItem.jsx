import React from 'react';

export default function EquipoItem({
    equipo,
    cliente,
    onEditar,
    onArchivar,
    onRestaurar,
    onEliminarDefinitivo,
    onVerHistorial,
}) {
    const isArchivado = equipo.activo === false;

    return (
        <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            isArchivado
                ? 'bg-[#F5F3F1]/50 dark:bg-[#1C1C1C]/50 border-black/[0.05] dark:border-white/[0.05] opacity-60'
                : 'bg-[#FFFFFF] dark:bg-[#1C1C1C] border-black/[0.07] dark:border-white/[0.07]'
        }`}>
            <div>
                <p className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none">
                    {equipo.marca} {equipo.modelo}
                    {isArchivado && <span className="ml-2 text-[8px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#A8A29E] px-2 py-0.5 rounded">ARCHIVADO</span>}
                </p>
                <p className="text-[8px] text-[#A8A29E] font-bold uppercase mt-1">S/N: {equipo.numeroSerie}</p>
            </div>
            <div className="flex items-center gap-1.5">
                {equipo.ubicacion && !isArchivado && (
                    <span className="text-[7px] font-black bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-[#D48800] dark:text-[#F0A500] px-2 py-0.5 rounded-md uppercase">
                        {equipo.ubicacion}
                    </span>
                )}

                {!isArchivado && (
                    <>
                        {onVerHistorial && (
                            <button onClick={() => onVerHistorial(equipo)}
                                className="p-1.5 bg-[#D48800]/10 dark:bg-[#F0A500]/10 rounded-lg active:scale-90 transition-all" title="Historial">
                                <span className="text-[10px]">📋</span>
                            </button>
                        )}
                        <button onClick={() => onEditar(equipo, cliente)}
                            className="p-1.5 bg-[#E8E5E0] dark:bg-[#2E2E2E] rounded-lg active:scale-90 transition-all" title="Editar">
                            <span className="text-[10px]">✏️</span>
                        </button>
                        <button onClick={() => onArchivar(equipo)}
                            className="p-1.5 bg-[#D48800]/10 dark:bg-[#F0A500]/10 rounded-lg active:scale-90 transition-all" title="Archivar">
                            <span className="text-[10px]">📦</span>
                        </button>
                    </>
                )}

                {isArchivado && (
                    <button onClick={() => onRestaurar(equipo)}
                        className="p-1.5 bg-[#16A34A]/10 rounded-lg active:scale-90 transition-all" title="Restaurar">
                        <span className="text-[10px]">↩️</span>
                    </button>
                )}

                <button onClick={() => onEliminarDefinitivo(equipo)}
                    className="p-1.5 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 rounded-lg active:scale-90 transition-all" title="Eliminar">
                    <span className="text-[10px]">🗑️</span>
                </button>
            </div>
        </div>
    );
}
