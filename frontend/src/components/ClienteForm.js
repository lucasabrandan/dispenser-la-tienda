import React from 'react';
import Input from './ui/Input';
import CrearClienteModal from './CrearClienteModal';

export default function ClienteForm({ form, setForm, errors, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-end z-[2000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-[3.5rem] p-10 shadow-2xl animate-slide-up h-[90vh] overflow-y-auto">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 text-center uppercase tracking-tighter leading-none">
                    {form.id ? '✏️ Editar Cliente' : '👤 Nuevo Cliente'}
                </h3>

                <form onSubmit={onSubmit} className="grid gap-4">
                    {/* NOMBRE / RAZÓN SOCIAL */}
                    <Input 
                        label="Razón Social / Nombre" 
                        value={form.nombre} 
                        error={errors.nombre} 
                        onChange={e => setForm({...form, nombre: e.target.value})} 
                    />
                    
                    {/* 📍 BLOQUE DIRECCIÓN DETALLADA */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] space-y-4 border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">📍 Ubicación para Logística</p>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Input label="Calle" value={form.calle} onChange={e => setForm({...form, calle: e.target.value})} />
                            </div>
                            <Input label="Número" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Piso" value={form.piso} placeholder="Ej: 4" onChange={e => setForm({...form, piso: e.target.value})} />
                            <Input label="Depto" value={form.depto} placeholder="Ej: B" onChange={e => setForm({...form, depto: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Localidad" value={form.localidad} onChange={e => setForm({...form, localidad: e.target.value})} />
                            <Input label="Provincia" value={form.provincia} onChange={e => setForm({...form, provincia: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">WhatsApp</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">+54 9</span>
                                <input 
                                    value={form.telefono} 
                                    onChange={e => setForm({...form, telefono: e.target.value})}
                                    className="w-full py-4 pl-16 pr-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border-none font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="11 1234 5678"
                                />
                            </div>
                        </div>
                        <Input label="CUIT / DNI" value={form.cuilDni} onChange={e => setForm({...form, cuilDni: e.target.value})} />
                    </div>

                    {/* 🏛️ SPINNER CONDICIÓN FISCAL ARCA */}
                    <div className="col-span-full">
                        <label className="text-[10px] font-black text-blue-500 uppercase mb-2 block ml-1 tracking-widest">🏛️ Condición Fiscal (ARCA 2026)</label>
                        <div className="relative">
                            <select
                                value={form.condicionIva || ''}
                                onChange={e => setForm({...form, condicionIva: e.target.value})}
                                className="w-full p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white outline-none appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Seleccionar categoría...</option>
                                <option value="MONOTRIBUTO">Monotributista</option>
                                <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                                <option value="EXENTO">Exento</option>
                                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                                <option value="NOT_SPECIFIED">No especificado / Otros</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-black text-[10px]">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* 📝 NOTAS INTERNAS */}
                    <div className="col-span-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Notas / Observaciones</label>
                        <textarea
                            value={form.notas || ''}
                            onChange={e => setForm({...form, notas: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white outline-none min-h-[80px] focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Ej: Portón azul, horario de 9 a 18hs..."
                        />
                    </div>

                    {/* ACCIONES */}
                    <div className="flex gap-4 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-2xl font-black text-xs uppercase transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all"
                        >
                            {form.id ? 'Guardar Cambios' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}