import React from 'react';

export default function EquipoItem({ 
    equipo, 
    cliente, 
    onEditar, 
    onArchivar, 
    onRestaurar, 
    onEliminarDefinitivo 
}) {
    const isArchivado = equipo.activo === false;

    return (
        <div className={`p-3 rounded-xl border flex items-center justify-between group/item transition-all ${
            isArchivado 
                ? 'bg-slate-100/50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 opacity-60' 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-400'
        }`}>
            <div>
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none">
                    {equipo.marca} {equipo.modelo}
                    {isArchivado && <span className="ml-2 text-[8px] bg-gray-300 dark:bg-gray-600 px-2 py-0.5 rounded">ARCHIVADO</span>}
                </p>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">S/N: {equipo.numeroSerie}</p>
            </div>
            <div className="flex items-center gap-2">
                {equipo.ubicacion && !isArchivado && (
                    <span className="text-[7px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-md uppercase border border-blue-100 dark:border-blue-800">
                        {equipo.ubicacion}
                    </span>
                )}
                
                {!isArchivado && (
                    <>
                        <button 
                            onClick={() => onEditar(equipo, cliente)}
                            className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Editar equipo"
                        >
                            <span className="text-[10px]">✏️</span>
                        </button>
                        <button 
                            onClick={() => onArchivar(equipo)}
                            className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                            title="Archivar (preserva historial)"
                        >
                            <span className="text-[10px]">📦</span>
                        </button>
                    </>
                )}
                
                {isArchivado && (
                    <button 
                        onClick={() => onRestaurar(equipo)}
                        className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Restaurar equipo"
                    >
                        <span className="text-[10px]">↩️</span>
                    </button>
                )}
                
                <button 
                    onClick={() => onEliminarDefinitivo(equipo)}
                    className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    title={isArchivado ? "Eliminar definitivamente" : "Eliminar definitivamente (borra historial)"}
                >
                    <span className="text-[10px]">🗑️</span>
                </button>
            </div>
        </div>
    );
}