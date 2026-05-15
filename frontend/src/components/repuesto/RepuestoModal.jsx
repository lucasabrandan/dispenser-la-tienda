import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

// Comprime la foto a JPEG ≤ 800px para que no pese mas de ~150KB.
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

const INITIAL_FORM = {
    id: null, sku: '', nombre: '', descripcion: '',
    costo: '', porcentajeGanancia: '', precio: '',
    costoBlanco: '', porcentajeImpuestos: '30',
    precioFacturado: '', precioNetoCliente: '',
    precioCantidad: '', cantidadMinima: '',
    porcentajeCuotas3: '', porcentajeCuotas6: '',
    stock: '', imagen: ''
};

// Calcula todos los precios derivados
function calcularPrecios(f) {
    const costo  = parseFloat(f.costo) || 0;
    const margen = parseFloat(f.porcentajeGanancia) || 0;
    const imp    = parseFloat(f.porcentajeImpuestos) || 0;

    // Negro: costo + ganancia
    const precioNegro = costo > 0 ? costo * (1 + margen / 100) : 0;

    // Blanco: costo × 1.21 (auto si no fue editado manualmente)
    const costoB = parseFloat(f.costoBlanco) || (costo > 0 ? costo * 1.21 : 0);

    // Facturado: costoBlanco + ganancia + impuestos
    const precioFact = costoB > 0 ? costoB * (1 + margen / 100) * (1 + imp / 100) : 0;

    // Neto cliente: lo que le decis (sin IVA), que × 1.21 = precioFacturado
    const netoCliente = precioFact > 0 ? precioFact / 1.21 : 0;

    return {
        precio:            precioNegro > 0 ? precioNegro.toFixed(2) : '',
        costoBlanco:       costoB > 0 ? costoB.toFixed(2) : f.costoBlanco,
        precioFacturado:   precioFact > 0 ? precioFact.toFixed(2) : '',
        precioNetoCliente: netoCliente > 0 ? netoCliente.toFixed(2) : '',
    };
}

export default function RepuestoModal({ isOpen, onClose, onGuardado, repuestoEdicion }) {
    const [form, setForm]         = useState(INITIAL_FORM);
    const [cargando, setCargando] = useState(false);
    const [fotoFiles, setFotoFiles] = useState([null, null, null]); // foto, foto2, foto3
    const [fotoPreviews, setFotoPreviews] = useState(['', '', '']);
    const [seccionAbierta, setSeccionAbierta] = useState('basico');
    const [costoBlancoManual, setCostoBlancoManual] = useState(false);

    useEffect(() => {
        if (repuestoEdicion) {
            setForm({
                ...INITIAL_FORM,
                ...repuestoEdicion,
                porcentajeImpuestos: repuestoEdicion.porcentajeImpuestos ?? '30',
            });
            setCostoBlancoManual(!!repuestoEdicion.costoBlanco);
        } else {
            setForm(INITIAL_FORM);
            setCostoBlancoManual(false);
        }
        setFotoFiles([null, null, null]);
        setFotoPreviews(['', '', '']);
        setSeccionAbierta('basico');
    }, [repuestoEdicion, isOpen]);

    // Cambio en campos financieros: recalcula precios
    const cambiarFinanciero = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };

        // Si cambia costoBlanco manualmente, marcarlo
        if (campo === 'costoBlanco') {
            setCostoBlancoManual(valor !== '');
        }

        // Si cambia el costo negro y costoBlanco NO fue editado manualmente, auto-calcular
        if (campo === 'costo' && !costoBlancoManual) {
            const c = parseFloat(valor) || 0;
            nuevoForm.costoBlanco = c > 0 ? (c * 1.21).toFixed(2) : '';
        }

        const precios = calcularPrecios(nuevoForm);
        // No pisar costoBlanco si fue editado manualmente
        if (costoBlancoManual && campo !== 'costoBlanco' && campo !== 'costo') {
            delete precios.costoBlanco;
        }
        setForm({ ...nuevoForm, ...precios });
    };

    // Imagen (index: 0=principal, 1=foto2, 2=foto3)
    const manejarFoto = async (e, index = 0) => {
        const file = e.target.files[0];
        if (!file) return;
        const compressed = await comprimirFoto(file);
        setFotoFiles(prev => { const n = [...prev]; n[index] = compressed; return n; });
        const reader = new FileReader();
        reader.onloadend = () => {
            if (index === 0) {
                setForm(prev => ({ ...prev, imagen: reader.result }));
            } else {
                setFotoPreviews(prev => { const n = [...prev]; n[index] = reader.result; return n; });
            }
        };
        reader.readAsDataURL(compressed);
    };

    // Guardar
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
            if (form.descripcion)              fd.append('descripcion', form.descripcion);
            if (form.costo !== '')             fd.append('costo', parseFloat(form.costo) || 0);
            if (form.porcentajeGanancia !== '') fd.append('porcentajeGanancia', parseFloat(form.porcentajeGanancia) || 0);
            fd.append('precio', parseFloat(form.precio) || 0);
            fd.append('stock',  parseInt(form.stock) || 0);

            // Campos facturado
            if (form.costoBlanco !== '')        fd.append('costoBlanco', parseFloat(form.costoBlanco) || 0);
            if (form.porcentajeImpuestos !== '') fd.append('porcentajeImpuestos', parseFloat(form.porcentajeImpuestos) || 0);
            if (form.precioFacturado !== '')     fd.append('precioFacturado', parseFloat(form.precioFacturado) || 0);
            if (form.precioNetoCliente !== '')   fd.append('precioNetoCliente', parseFloat(form.precioNetoCliente) || 0);

            // Cantidad y cuotas
            if (form.precioCantidad !== '')      fd.append('precioCantidad', parseFloat(form.precioCantidad) || 0);
            if (form.cantidadMinima !== '')      fd.append('cantidadMinima', parseInt(form.cantidadMinima) || 0);
            if (form.porcentajeCuotas3 !== '')   fd.append('porcentajeCuotas3', parseFloat(form.porcentajeCuotas3) || 0);
            if (form.porcentajeCuotas6 !== '')   fd.append('porcentajeCuotas6', parseFloat(form.porcentajeCuotas6) || 0);

            if (fotoFiles[0]) fd.append('foto', fotoFiles[0]);
            if (fotoFiles[1]) fd.append('foto2', fotoFiles[1]);
            if (fotoFiles[2]) fd.append('foto3', fotoFiles[2]);

            const url    = form.id ? `/repuestos/${form.id}` : `/repuestos`;
            const method = form.id ? 'put' : 'post';
            await api[method](url, fd);

            toast.success('Guardado', { id: loading });
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

    const inputBase = "w-full mt-1 p-3 rounded-xl text-sm font-bold outline-none transition-all border bg-[#E8E5E0] dark:bg-[#2E2E2E] border-black/[0.07] dark:border-white/[0.07] text-[#1C1917] dark:text-[#F0EEE9] focus:ring-2 focus:ring-[#D13A28]/20";
    const readonlyBase = "w-full mt-1 p-3 rounded-xl text-sm font-black outline-none border";
    const labelBase = "text-[10px] font-black uppercase tracking-wide";

    const fmt = (v) => {
        const n = parseFloat(v);
        return n > 0 ? `$ ${Math.round(n).toLocaleString('es-AR')}` : '—';
    };

    const precioNegro = parseFloat(form.precio) || 0;
    const costoN      = parseFloat(form.costo) || 0;
    const precioFact  = parseFloat(form.precioFacturado) || 0;
    const netoCliente = parseFloat(form.precioNetoCliente) || 0;
    const precioCant  = parseFloat(form.precioCantidad) || 0;

    // Cuotas sobre precio facturado
    const precioCuotas3 = precioFact > 0 && form.porcentajeCuotas3 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas3) || 0) / 100) : 0;
    const precioCuotas6 = precioFact > 0 && form.porcentajeCuotas6 !== ''
        ? precioFact * (1 + (parseFloat(form.porcentajeCuotas6) || 0) / 100) : 0;

    // Seccion colapsable
    const Seccion = ({ id, titulo, icono, children, color = 'blue' }) => {
        const abierta = seccionAbierta === id;
        const colores = {
            green:  'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30',
            blue:   'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30',
            amber:  'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30',
            purple: 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/50 dark:border-purple-800/30',
        };
        return (
            <div className={`rounded-2xl border overflow-hidden transition-all ${abierta ? colores[color] : 'bg-[#F5F3F1] dark:bg-[#1C1C1C] border-black/[0.05] dark:border-white/[0.05]'}`}>
                <button
                    type="button"
                    onClick={() => setSeccionAbierta(abierta ? '' : id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                >
                    <span className="text-xs font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-wide">
                        {icono} {titulo}
                    </span>
                    <span className={`text-xs text-[#A8A29E] transition-transform ${abierta ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>
                {abierta && <div className="px-3 pb-3">{children}</div>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-[3000]">
            <div className="bg-[#FFFFFF] dark:bg-[#242424] w-full max-w-lg rounded-t-3xl p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-[#E8E5E0] dark:bg-[#2E2E2E] rounded-full mx-auto mb-5" />

                <h3 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] mb-5">
                    {form.id ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>

                <form onSubmit={handleSubmit} className="grid gap-3 max-h-[75vh] overflow-y-auto pr-1 pb-2">

                    {/* FOTOS (3 slots) */}
                    <div className="bg-[#F5F3F1] dark:bg-[#1C1C1C] p-3 rounded-2xl border border-dashed border-[#E8E5E0] dark:border-[#2E2E2E]">
                        <label className={`${labelBase} text-[#A8A29E] mb-2 block`}>Fotos del producto (hasta 3)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2].map(i => {
                                const fotoKeys = ['imagen', 'fotoUrl2', 'fotoUrl3'];
                                const preview = i === 0
                                    ? form.imagen
                                    : (fotoPreviews[i] || (form[fotoKeys[i]] ? construirUrlFoto(form[fotoKeys[i]]) : ''));
                                return (
                                    <div key={i} className="relative">
                                        <label className="cursor-pointer block">
                                            <div className="w-full aspect-square bg-[#FFFFFF] dark:bg-[#242424] rounded-xl flex justify-center items-center overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                                {preview
                                                    ? <img src={preview} className="w-full h-full object-cover" alt={`foto ${i+1}`} />
                                                    : <span className="text-2xl opacity-30">{i === 0 ? '📸' : '+'}</span>
                                                }
                                            </div>
                                            <input
                                                type="file" accept="image/*"
                                                onChange={e => manejarFoto(e, i)}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="absolute top-1 left-1 text-[8px] font-black bg-black/40 text-white px-1 rounded">
                                            {i === 0 ? 'Principal' : `Extra ${i}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SKU + NOMBRE */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>SKU</label>
                            <input
                                value={form.sku}
                                onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                className={inputBase}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className={`${labelBase} text-[#A8A29E]`}>Nombre</label>
                            <input
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className={inputBase}
                            />
                        </div>
                    </div>

                    {/* STOCK + DESCRIPCION */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>Stock actual</label>
                            <input
                                type="number" value={form.stock}
                                onChange={e => setForm({ ...form, stock: e.target.value })}
                                className={inputBase}
                            />
                        </div>
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>Descripcion</label>
                            <input
                                value={form.descripcion || ''}
                                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                placeholder="Opcional"
                                className={inputBase}
                            />
                        </div>
                    </div>

                    {/* ═══ SECCION: PRECIO EN NEGRO ═══ */}
                    <Seccion id="basico" titulo="Precio Efectivo (negro)" icono="💵" color="green">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Costo $</label>
                                <input
                                    type="number" step="0.01" value={form.costo}
                                    onChange={e => cambiarFinanciero('costo', e.target.value)}
                                    className={inputBase}
                                />
                            </div>
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Ganancia %</label>
                                <input
                                    type="number" step="0.5" value={form.porcentajeGanancia}
                                    onChange={e => cambiarFinanciero('porcentajeGanancia', e.target.value)}
                                    className={inputBase}
                                />
                            </div>
                            <div>
                                <label className={`${labelBase} text-emerald-600 dark:text-emerald-400`}>Efectivo $</label>
                                <div className={`${readonlyBase} bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400`}>
                                    {fmt(form.precio)}
                                </div>
                            </div>
                        </div>
                        {precioNegro > 0 && costoN > 0 && (
                            <div className="mt-2 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-xl p-2">
                                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                    Ganancia: $ {Math.round(precioNegro - costoN).toLocaleString('es-AR')} por unidad
                                </p>
                            </div>
                        )}
                    </Seccion>

                    {/* ═══ SECCION: PRECIO FACTURADO ═══ */}
                    <Seccion id="facturado" titulo="Precio Facturado (blanco)" icono="🧾" color="blue">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Costo blanco $</label>
                                <input
                                    type="number" step="0.01" value={form.costoBlanco}
                                    onChange={e => cambiarFinanciero('costoBlanco', e.target.value)}
                                    placeholder={costoN > 0 ? `Auto: ${(costoN * 1.21).toFixed(0)}` : 'Costo + IVA'}
                                    className={inputBase}
                                />
                                <p className="text-[9px] text-[#A8A29E] font-bold mt-0.5">
                                    Costo {fmt(form.costo)} + 21% IVA
                                </p>
                            </div>
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Impuestos %</label>
                                <input
                                    type="number" step="0.5" value={form.porcentajeImpuestos}
                                    onChange={e => cambiarFinanciero('porcentajeImpuestos', e.target.value)}
                                    placeholder="30"
                                    className={inputBase}
                                />
                                <p className="text-[9px] text-[#A8A29E] font-bold mt-0.5">
                                    IVA + IIBB + cheques
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`${labelBase} text-blue-600 dark:text-blue-400`}>Precio final $</label>
                                <div className={`${readonlyBase} bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400`}>
                                    {fmt(form.precioFacturado)}
                                </div>
                            </div>
                            <div>
                                <label className={`${labelBase} text-blue-600 dark:text-blue-400`}>Le decis al cliente</label>
                                <div className={`${readonlyBase} bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400`}>
                                    {netoCliente > 0 ? `${fmt(form.precioNetoCliente)} + IVA` : '—'}
                                </div>
                            </div>
                        </div>

                        {precioFact > 0 && (
                            <div className="mt-2 bg-blue-100/30 dark:bg-blue-900/10 rounded-xl p-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                                    {fmt(form.precioNetoCliente)} + 21% IVA = {fmt(form.precioFacturado)}
                                </p>
                                <p className="text-[10px] text-[#A8A29E] font-bold">
                                    Tu ganancia real: $ {Math.round(precioFact / (1 + (parseFloat(form.porcentajeImpuestos) || 30) / 100) - (parseFloat(form.costoBlanco) || 0)).toLocaleString('es-AR')} por unidad
                                </p>
                            </div>
                        )}
                    </Seccion>

                    {/* ═══ SECCION: PRECIO POR CANTIDAD ═══ */}
                    <Seccion id="cantidad" titulo="Precio por Cantidad" icono="📦" color="amber">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Desde (unid.)</label>
                                <input
                                    type="number" min="2" value={form.cantidadMinima}
                                    onChange={e => setForm({ ...form, cantidadMinima: e.target.value })}
                                    placeholder="Ej: 5"
                                    className={inputBase}
                                />
                            </div>
                            <div>
                                <label className={`${labelBase} text-amber-600 dark:text-amber-400`}>Precio unit. $</label>
                                <input
                                    type="number" step="0.01" value={form.precioCantidad}
                                    onChange={e => setForm({ ...form, precioCantidad: e.target.value })}
                                    placeholder="Precio especial"
                                    className={inputBase}
                                />
                            </div>
                        </div>
                        {precioCant > 0 && costoN > 0 && (
                            <div className="mt-2 bg-amber-100/30 dark:bg-amber-900/10 rounded-xl p-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                    Ganancia minima: $ {Math.round(precioCant - costoN).toLocaleString('es-AR')} por unidad
                                </p>
                                {precioNegro > 0 && (
                                    <p className="text-[10px] text-[#A8A29E] font-bold">
                                        Descuento: {Math.round((1 - precioCant / precioNegro) * 100)}% vs precio efectivo
                                    </p>
                                )}
                            </div>
                        )}
                    </Seccion>

                    {/* ═══ SECCION: CUOTAS ═══ */}
                    <Seccion id="cuotas" titulo="Cuotas / MercadoLibre" icono="💳" color="purple">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Recargo 3 cuotas %</label>
                                <input
                                    type="number" step="0.5" value={form.porcentajeCuotas3}
                                    onChange={e => setForm({ ...form, porcentajeCuotas3: e.target.value })}
                                    placeholder="Ej: 15"
                                    className={inputBase}
                                />
                                {precioCuotas3 > 0 && (
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                                        3x $ {Math.round(precioCuotas3 / 3).toLocaleString('es-AR')} = {fmt(precioCuotas3)}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={`${labelBase} text-[#A8A29E]`}>Recargo 6 cuotas %</label>
                                <input
                                    type="number" step="0.5" value={form.porcentajeCuotas6}
                                    onChange={e => setForm({ ...form, porcentajeCuotas6: e.target.value })}
                                    placeholder="Ej: 30"
                                    className={inputBase}
                                />
                                {precioCuotas6 > 0 && (
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                                        6x $ {Math.round(precioCuotas6 / 6).toLocaleString('es-AR')} = {fmt(precioCuotas6)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-[#A8A29E] font-bold mt-2">
                            Se calcula sobre el precio facturado. Deja vacio lo que no uses.
                        </p>
                    </Seccion>

                    {/* RESUMEN RAPIDO */}
                    {(precioNegro > 0 || precioFact > 0) && (
                        <div className="bg-[#1C1917] dark:bg-[#F0EEE9]/10 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-2">Resumen de precios</p>
                            <div className="grid grid-cols-2 gap-2">
                                {precioNegro > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">Efectivo</p>
                                        <p className="text-base font-black text-emerald-400">
                                            {fmt(form.precio)}
                                        </p>
                                        <p className="text-[9px] text-emerald-400/60">
                                            Ganas {fmt(precioNegro - costoN)}
                                        </p>
                                    </div>
                                )}
                                {netoCliente > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">Al cliente</p>
                                        <p className="text-base font-black text-blue-400">
                                            {fmt(form.precioNetoCliente)}
                                        </p>
                                        <p className="text-[9px] text-blue-400/60">
                                            + IVA = {fmt(form.precioFacturado)}
                                        </p>
                                    </div>
                                )}
                                {precioCant > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">x Cantidad</p>
                                        <p className="text-base font-black text-amber-400">
                                            {fmt(form.precioCantidad)}
                                        </p>
                                        <p className="text-[9px] text-amber-400/60">
                                            Ganas min {fmt(precioCant - costoN)}
                                        </p>
                                    </div>
                                )}
                                {precioCuotas3 > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">3 cuotas</p>
                                        <p className="text-base font-black text-purple-400">
                                            3x {fmt(precioCuotas3 / 3)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BOTONES */}
                    <div className="flex gap-3 mt-1">
                        <button
                            type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 py-3.5 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl font-extrabold text-sm disabled:opacity-50 active:scale-95 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={cargando}
                            className="flex-[2] py-3.5 bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90 text-white rounded-xl font-extrabold text-sm shadow-md shadow-[#D13A28]/30 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {cargando ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
