import React from 'react';
import EquipoItem from './EquipoItem';
import { abrirMaps, abrirWhatsApp } from './utils/clienteUtils';

export default function ClienteCard({ 
    cliente, 
    sedes, 
    equipos,
    isExpanded, 
    onToggleExpand,
    onEditCliente,
    onDeleteCliente,
    onEditEquipo,
    onArchivarEquipo,
    onRestaurarEquipo,
    onEliminarEquipoDefinitivo,
    onAddSede,
    onAddEquipo
}) {
    const sedesCli = sedes.filter(s => s.cliente?.id === cliente.id);
    const eqCli = equipos.filter(eq => sedesCli.map(s => s.id).includes(eq.sede?.id));
    
    // Separar equipos activos y archivados
    const equiposActivos = eqCli.filter(eq => eq.activo !== false);
    const equiposArchivados = eqCli.filter(eq => eq.activo === false);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
            
            {/* HEADER */}
            <div className="p-8 pb-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none mb-2">{cliente.nombre}</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => onToggleExpand()}
                                className={`text-[9px] font-black px-3 py-1 rounded-full border transition-all ${isExpanded ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600'}`}
                            >
                                💧 {eqCli.length} EQUIPOS {isExpanded ? '▲' : '▼'}
                            </button>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">👤</div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">📍 {cliente.calle} {cliente.numero} • {cliente.localidad}</p>
            </div>

            {/* CONTENIDO EXPANDIBLE */}
            {isExpanded && (
                <div className="px-8 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-5 mt-4">
                        {sedesCli.map(sede => (
                            <div key={sede.id} className="space-y-2">
                                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">🏠 {sede.nombreSede}</p>
                                
                                {/* Equipos Activos */}
                                <div className="grid gap-2 ml-4">
                                    {equiposActivos.filter(eq => eq.sede?.id === sede.id).map(eq => (
                                        <EquipoItem
                                            key={eq.id}
                                            equipo={eq}
                                            cliente={cliente}
                                            onEditar={onEditEquipo}
                                            onArchivar={onArchivarEquipo}
                                            onRestaurar={onRestaurarEquipo}
                                            onEliminarDefinitivo={onEliminarEquipoDefinitivo}
                                        />
                                    ))}
                                </div>

                                {/* Equipos Archivados */}
                                {equiposArchivados.filter(eq => eq.sede?.id === sede.id).length > 0 && (
                                    <div className="ml-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2">📦 Archivados</p>
                                        <div className="grid gap-2">
                                            {equiposArchivados.filter(eq => eq.sede?.id === sede.id).map(eq => (
                                                <EquipoItem
                                                    key={eq.id}
                                                    equipo={eq}
                                                    cliente={cliente}
                                                    onEditar={onEditEquipo}
                                                    onArchivar={onArchivarEquipo}
                                                    onRestaurar={onRestaurarEquipo}
                                                    onEliminarDefinitivo={onEliminarEquipoDefinitivo}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Botones de Acción */}
                    <div className="flex gap-2 mt-6">
                        <button 
                            onClick={() => onAddSede(cliente)} 
                            className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[9px] uppercase hover:bg-slate-300 transition-all"
                        >
                            + Sede
                        </button>
                        <button 
                            onClick={() => onAddEquipo(cliente)} 
                            className="flex-1 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl font-black text-[9px] uppercase hover:bg-blue-200 transition-all"
                        >
                            + Equipo
                        </button>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <div className="px-8 py-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex gap-2">
                    <button 
                        onClick={() => abrirMaps(cliente)} 
                        className="w-10 h-10 bg-slate-900 dark:bg-slate-700 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md"
                    >
                        📍
                    </button>
                    <button 
                        onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)} 
                        className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-md"
                    >
                        💬
                    </button>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onEditCliente(cliente)} 
                        className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                    >
                        ✏️
                    </button>
                    <button 
                        onClick={() => onDeleteCliente(cliente.id)} 
                        className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}