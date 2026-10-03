import React from 'react';
import { LuWrench, LuCopy, LuPencil, LuShoppingCart } from 'react-icons/lu';
import ServicioForm from '../servicio/ServicioForm';
import VentaForm from '../venta/VentaForm';

// Modal único para crear / editar / duplicar un trabajo desde la pantalla Trabajos.
// modo: 'nuevo' | 'editar' | 'duplicar' | 'venta'. Reusa los mismos formularios
// de siempre (ServicioForm y VentaForm), no cambia ningún dato.
export default function TrabajoEditorModal({ modo, servicio = null, clienteInicialId = null, onCerrar, onGuardado }) {
    const esVenta = modo === 'venta' || servicio?.servicioTipo === 'VENTA';
    const titulo = {
        nuevo:    { Icon: LuWrench,       txt: 'Nuevo trabajo',     sub: 'Cargá el trabajo a realizar' },
        venta:    { Icon: LuShoppingCart, txt: 'Nueva venta',       sub: 'Productos para el cliente' },
        editar:   { Icon: LuPencil,       txt: 'Editar trabajo',    sub: servicio ? `#${servicio.id} · ${servicio.clienteNombre || ''}` : '' },
        duplicar: { Icon: LuCopy,         txt: 'Duplicar trabajo',  sub: 'Copia del anterior · ajustá y guardá' },
    }[modo] || {};
    const Icono = titulo.Icon || LuWrench;

    const guardado = () => { onGuardado && onGuardado(); onCerrar(); };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/55">
            <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-card">
                <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-20 bg-card">
                    <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                </div>
                <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-panel border-b border-black/[0.08]">
                    <div>
                        <h3 className="text-title font-black text-ink flex items-center gap-1.5"><Icono size={16} /> {titulo.txt}</h3>
                        {titulo.sub && <p className="text-caption text-muted mt-0.5">{titulo.sub}</p>}
                    </div>
                    <button onClick={onCerrar} aria-label="Cerrar"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">✕</button>
                </div>
                {esVenta ? (
                    <VentaForm onSaved={guardado} clienteInicialId={clienteInicialId}
                        ventaParaEditar={modo === 'editar' ? servicio : null} />
                ) : (
                    <ServicioForm onSaved={guardado} clienteInicialId={clienteInicialId}
                        servicioParaEditar={modo === 'nuevo' ? null : servicio}
                        esDuplicado={modo === 'duplicar'} />
                )}
            </div>
        </div>
    );
}
