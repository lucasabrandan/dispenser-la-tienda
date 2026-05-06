import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

// Comprime la foto a JPEG ≤ 800px para que no pese más de ~150KB.
// Idéntica estrategia que PasoEquipos: una sola llamada a createImageBitmap
// para minimizar el pico de memoria en Android.
async function comprimirFoto(file) {
    const MAX = file.size > 3_000_000 ? 700 : 900;
    const QUALITY = 0.78;

    if (typeof createImageBitmap !== 'undefined') {
        try {
            const bmp = await createImageBitmap(file, { resizeWidth: MAX, resizeQuality: 'medium' });
            const canvas = document.createElement('canvas');
            canvas.width  = bmp.width;
            canvas.height = bmp.height;
            canvas.getContext('2d').drawImage(bmp, 0, 0);
            bmp.close();
            return new Promise(resolve => {
                canvas.toBlob(
                    blob => resolve(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file),
                    'image/jpeg', QUALITY
                );
            });
        } catch { /* fallback abajo */ }
    }

    return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.naturalWidth || MAX, h = img.naturalHeight || MAX;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else       { w = Math.round(w * MAX / h); h = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                blob => resolve(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file),
                'image/jpeg', QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

/**
 * RepuestoModal
 * Bottom sheet para crear o editar un repuesto.
 * Toda la lógica de formulario vive aquí (es un modal simple, no necesita hook propio).
 */

const INITIAL_FORM = {
    id: null, sku: '', nombre: '', descripcion: '',
    costo: '', porcentajeGanancia: '', precio: '',
    stock: '', imagen: ''
};

export default function RepuestoModal({ isOpen, onClose, onGuardado, repuestoEdicion }) {
    const [form, setForm]         = useState(INITIAL_FORM);
    const [cargando, setCargando] = useState(false);
    // fotoFile: File a subir. imagen: data URL solo para preview.
    const [fotoFile, setFotoFile] = useState(null);

    // Poblar form al editar
    useEffect(() => {
        if (repuestoEdicion) {
            setForm({ ...repuestoEdicion });
        } else {
            setForm(INITIAL_FORM);
        }
        setFotoFile(null);
    }, [repuestoEdicion, isOpen]);

    // ── Lógica financiera ──────────────────────────────────────────────────────
    const manejarCambiosFinancieros = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        const costo  = parseFloat(nuevoForm.costo) || 0;
        const margen = parseFloat(nuevoForm.porcentajeGanancia) || 0;
        if (costo >= 0) {
            nuevoForm.precio = (costo + costo * (margen / 100)).toFixed(2);
        }
        setForm(nuevoForm);
    };

    // ── Imagen ─────────────────────────────────────────────────────────────────
    const manejarFoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Comprimir primero (resuelve fotos de cámara > 4MB en Android)
        const compressed = await comprimirFoto(file);
        setFotoFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => setForm(prev => ({ ...prev, imagen: reader.result }));
        reader.readAsDataURL(compressed);
    };

    // ── Guardar ────────────────────────────────────────────────────────────────
    // El backend requiere multipart/form-data — enviamos FormData siempre.
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sku || !form.nombre) {
            toast.error('SKU y Nombre son obligatorios');
            return;
        }

        const loading = toast.loading(form.id ? 'Actualizando...' : 'Creando...');
        setCargando(true);
        try {
            const fd = new FormData();
            fd.append('sku',    form.sku.trim().toUpperCase());
            fd.append('nombre', form.nombre.trim());
            if (form.descripcion)              fd.append('descripcion',        form.descripcion);
            if (form.costo !== '')             fd.append('costo',              parseFloat(form.costo) || 0);
            if (form.porcentajeGanancia !== '') fd.append('porcentajeGanancia', parseFloat(form.porcentajeGanancia) || 0);
            fd.append('precio', parseFloat(form.precio) || 0);
            fd.append('stock',  parseInt(form.stock)    || 0);
            if (fotoFile) fd.append('foto', fotoFile);

            const url    = form.id ? `/repuestos/${form.id}` : `/repuestos`;
            const method = form.id ? 'put' : 'post';
            await api[method](url, fd);

            toast.success('✅ Guardado', { id: loading });
            onGuardado();
            onClose();
        } catch (err) {
            const msg = err.response?.status === 409 ? 'Ya existe un repuesto con ese SKU' : 'Error al guardar';
            toast.error(msg, { id: loading });
        } finally {
            setCargando(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-[3000]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-5">
                    {form.id ? '✏️ Editar Producto' : '📦 Nuevo Ingreso'}
                </h3>

                <form onSubmit={handleSubmit} className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2 pb-2">

                    {/* FOTO */}
                    <div className="flex gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 items-center">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex justify-center items-center overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                            {form.imagen
                                ? <img src={form.imagen} className="w-full h-full object-cover" alt="preview" />
                                : <span className="text-2xl opacity-50">📸</span>
                            }
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                Foto del repuesto
                            </label>
                            <input
                                type="file" accept="image/*" onChange={manejarFoto}
                                className="text-xs mt-1 w-full text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                            />
                        </div>
                    </div>

                    {/* SKU + NOMBRE */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">SKU</label>
                            <input
                                value={form.sku}
                                onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                className={inputClass}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Nombre</label>
                            <input
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* FINANCIERO */}
                    <div className="grid grid-cols-3 gap-3 bg-blue-50/50 dark:bg-slate-700/30 p-3 rounded-2xl">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">Costo $</label>
                            <input
                                type="number" value={form.costo}
                                onChange={e => manejarCambiosFinancieros('costo', e.target.value)}
                                className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase">Ganancia %</label>
                            <input
                                type="number" value={form.porcentajeGanancia}
                                onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)}
                                className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Venta $</label>
                            <input
                                value={form.precio} readOnly
                                className="w-full mt-1 p-3 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-black text-blue-700 dark:text-blue-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* STOCK */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase">Stock actual</label>
                        <input
                            type="number" value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase">Descripción (opcional)</label>
                        <textarea
                            value={form.descripcion || ''}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            placeholder="Características, compatibilidad, observaciones..."
                            rows={2}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {/* BOTONES */}
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={cargando}
                            className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {cargando ? '⏳ Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}