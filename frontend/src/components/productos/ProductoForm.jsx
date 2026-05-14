import React from 'react';
import { toast } from 'react-hot-toast';
import { useProductoForm } from '../../hooks/useProductoForm';
import { useMontos } from '../../context/MontosContext';
import api from '../../services/api';

const inputCls = (error) => `
    w-full p-3 mt-2 rounded-xl outline-none transition-all
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
    text-[#1C1917] dark:text-[#F0EEE9]
    ${error
        ? 'border-2 border-[#D13A28] dark:border-[#E8422F]'
        : 'border border-black/[0.07] dark:border-white/[0.07] focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]'
    }
`;

export default function ProductoForm({ isOpen, onClose, onProductoGuardado, productoEdicion = null }) {
    const {
        formData, errores, cargando,
        previewFoto, handleChange, handleFotoChange,
        validarTodo, resetear, calcularGanancias, setCargando,
    } = useProductoForm(productoEdicion);

    const { gananciaUnidad, precioBase, precioLista } = calcularGanancias();
    const { montosVisibles } = useMontos();
    const M = (val) => montosVisibles ? `$${parseFloat(val).toFixed(2)}` : '••••';

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!validarTodo()) { toast.error('Completa los campos obligatorios'); return; }

        setCargando(true);
        const loadingToast = toast.loading('Guardando producto...');
        try {
            const fd = new FormData();
            fd.append('sku',                formData.sku.trim());
            fd.append('nombre',             formData.nombre.trim());
            fd.append('descripcion',        formData.descripcion?.trim() || '');
            fd.append('costo',              parseFloat(formData.costo) || 0);
            fd.append('porcentajeGanancia', parseFloat(formData.porcentajeGanancia) || 0);
            fd.append('porcentajeMarkup',   parseFloat(formData.porcentajeMarkup) || 0);
            fd.append('precioLista',        parseFloat(precioLista) || 0);
            fd.append('stock',              parseInt(formData.stock) || 0);
            if (formData.foto) fd.append('foto', formData.foto);

            const url    = productoEdicion?.id ? `/repuestos/${productoEdicion.id}` : `/repuestos`;
            const method = productoEdicion?.id ? 'put' : 'post';
            const { data } = await api[method](url, fd);

            toast.success(`Producto "${formData.nombre}" guardado`, { id: loadingToast });
            if (onProductoGuardado) onProductoGuardado(data);
            resetear();
            onClose();
        } catch (err) {
            const status = err.response?.status;
            const msg = status === 409 ? 'Ya existe un repuesto con ese SKU' : 'Error al guardar producto';
            toast.error(msg, { id: loadingToast });
        } finally {
            setCargando(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] w-full max-w-3xl max-h-[95vh] overflow-y-auto border border-black/[0.07] dark:border-white/[0.07] shadow-2xl p-6">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <div>
                            <h2 className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-tighter">
                                {productoEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                            <p className="text-[10px] font-bold text-[#A8A29E] uppercase mt-1">Configurar precios y ganancias</p>
                        </div>
                        <button onClick={onClose} className="text-xl text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">✕</button>
                    </div>

                    <form onSubmit={handleGuardar} className="space-y-5">

                        {/* Foto */}
                        <div className="bg-[#D8D4CE] dark:bg-[#1C1C1C] p-4 rounded-2xl border border-dashed border-black/[0.10] dark:border-white/[0.10]">
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase">Foto del Producto</label>
                            <div className="mt-3 flex gap-4">
                                {previewFoto && (
                                    <img src={previewFoto} alt="preview"
                                        className="w-24 h-24 rounded-xl object-cover"
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <label className="flex-1 flex items-center justify-center border-2 border-dashed border-black/[0.10] dark:border-white/[0.10] rounded-xl p-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all">
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">📸</div>
                                        <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Click o arrastrá foto</p>
                                        <p className="text-[10px] text-[#A8A29E]">PNG, JPG, WebP (máx 5MB)</p>
                                    </div>
                                    <input type="file" onChange={handleFotoChange} accept="image/*" className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* SKU + Nombre */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-[#A8A29E] uppercase">SKU *</label>
                                <input type="text" name="sku" value={formData.sku} onChange={handleChange}
                                    placeholder="Ej: TC-001" className={inputCls(errores.sku)} />
                                {errores.sku && <p className="text-[10px] text-[#D13A28] dark:text-[#E8422F] mt-1">{errores.sku}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-[#A8A29E] uppercase">Nombre *</label>
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                                    placeholder="Ej: Termostato 85°" className={inputCls(errores.nombre)} />
                                {errores.nombre && <p className="text-[10px] text-[#D13A28] dark:text-[#E8422F] mt-1">{errores.nombre}</p>}
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase">Descripción (opcional)</label>
                            <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange}
                                placeholder="Ej: Termostato para dispensers con control de temperatura..."
                                className={`${inputCls(false)} min-h-[80px] resize-none`}
                            />
                        </div>

                        {/* Costo */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase">Costo de Compra ($) *</label>
                            <input type="number" name="costo" value={formData.costo} onChange={handleChange}
                                min="0" step="0.01" placeholder="100" className={inputCls(errores.costo)} />
                            {errores.costo && <p className="text-[10px] text-[#D13A28] dark:text-[#E8422F] mt-1">{errores.costo}</p>}
                        </div>

                        {/* Márgenes */}
                        <div className="bg-[#D48800]/5 dark:bg-[#F0A500]/5 p-4 rounded-2xl border border-[#D48800]/20 dark:border-[#F0A500]/20 space-y-4">
                            <h3 className="font-black text-[12px] text-[#1C1917] dark:text-[#F0EEE9] uppercase">Configurar Precios</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-[#A8A29E] uppercase">% Ganancia Base</label>
                                    <input type="number" name="porcentajeGanancia" value={formData.porcentajeGanancia}
                                        onChange={handleChange} min="0" step="0.5"
                                        className={`${inputCls(false)} border-[#D48800]/30 dark:border-[#F0A500]/30 focus:border-[#D48800] dark:focus:border-[#F0A500]`}
                                    />
                                    <p className="text-[10px] text-[#D48800] dark:text-[#F0A500] mt-1 font-bold">Ganancia inicial</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-[#A8A29E] uppercase">% Markup</label>
                                    <input type="number" name="porcentajeMarkup" value={formData.porcentajeMarkup}
                                        onChange={handleChange} min="0" step="0.5"
                                        className={`${inputCls(false)} border-[#D48800]/30 dark:border-[#F0A500]/30 focus:border-[#D48800] dark:focus:border-[#F0A500]`}
                                    />
                                    <p className="text-[10px] text-[#D48800] dark:text-[#F0A500] mt-1 font-bold">Para descuentos posteriores</p>
                                </div>
                            </div>

                            {/* Resumen de precios */}
                            <div className="bg-[#EDEAE6] dark:bg-[#242424] p-4 rounded-xl space-y-2 border border-black/[0.07] dark:border-white/[0.07]">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-[#A8A29E]">Ganancia/u:</span>
                                    <span className="font-black text-[#D48800] dark:text-[#F0A500]">{M(gananciaUnidad)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-[#A8A29E]">Precio Base:</span>
                                    <span className="font-black text-[#D48800] dark:text-[#F0A500]">{M(precioBase)}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-2 border-t border-black/[0.07] dark:border-white/[0.07]">
                                    <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">Precio Lista:</span>
                                    <span className="font-black text-[#D48800] dark:text-[#F0A500]">{M(precioLista)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stock */}
                        <div>
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase">Stock actual (unidades)</label>
                            <input type="number" name="stock" value={formData.stock || 0} onChange={handleChange}
                                min="0" step="1" placeholder="0" className={inputCls(false)} />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                            <button type="button" onClick={onClose} disabled={cargando}
                                className="flex-1 py-3 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95 disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={cargando}
                                className="flex-1 py-3 bg-[#D13A28] dark:bg-[#E8422F] text-white rounded-xl font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                                {cargando ? 'Guardando...' : productoEdicion ? 'Actualizar' : 'Guardar Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
