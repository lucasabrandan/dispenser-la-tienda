import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { comprimirFoto } from '../../utils/comprimirFoto';
import FotosUploader from './FotosUploader';
import SeccionesPrecios from './SeccionesPrecios';

const INITIAL_FORM = {
    id: null, sku: '', nombre: '', descripcion: '',
    costo: '', porcentajeGanancia: '', porcentajeMarkup: '', precio: '',
    costoBlanco: '', porcentajeImpuestos: '0',
    precioFacturado: '', precioNetoCliente: '',
    precioCantidad: '', cantidadMinima: '',
    porcentajeCuotas3: '', porcentajeCuotas6: '',
    stock: '', fotoUrl: '', fotoUrl2: '', fotoUrl3: '',
    costosReales: [
        { nombre: 'IIBB (Buenos Aires)', porcentaje: '3.5', activo: true },
        { nombre: 'Comisión tarjeta', porcentaje: '3.5', activo: false },
    ],
};

function calcularPrecios(f) {
    const costo  = parseFloat(f.costo) || 0;
    const margen = parseFloat(f.porcentajeGanancia) || 0;
    const markup = parseFloat(f.porcentajeMarkup) || 0;
    const imp    = parseFloat(f.porcentajeImpuestos) || 0;

    // Efectivo: costo + tu ganancia + un markup opcional (ej. recargo por tarjeta/cuotas).
    const precioBase  = costo > 0 ? costo * (1 + margen / 100) : 0;
    const precioNegro = precioBase > 0 ? precioBase * (1 + markup / 100) : 0;

    // Costo blanco es solo informativo (costo + 21% IVA) — ya NO participa del cálculo
    // del precio facturado, para no aplicar la ganancia dos veces.
    const costoB = costo > 0 ? costo * 1.21 : 0;

    // Facturado: partimos del precio efectivo (que ya tiene tu ganancia adentro) y lo
    // "engordamos" lo justo para que, después de que el Impuestos% (IVA+IIBB+cheques)
    // se coma su parte, te siga quedando en el bolsillo la MISMA ganancia que en efectivo.
    // No se vuelve a aplicar el margen — solo se compensa el costo extra de facturar.
    const netoCliente = precioNegro > 0 && imp < 100 ? precioNegro / (1 - imp / 100) : 0;
    const precioFact  = netoCliente > 0 ? netoCliente * 1.21 : 0;

    return {
        precio:            precioNegro > 0 ? precioNegro.toFixed(2) : '',
        costoBlanco:       costoB > 0 ? costoB.toFixed(2) : '',
        precioFacturado:   precioFact > 0 ? precioFact.toFixed(2) : '',
        precioNetoCliente: netoCliente > 0 ? netoCliente.toFixed(2) : '',
    };
}

export default function RepuestoModal({ isOpen, onClose, onGuardado, repuestoEdicion }) {
    const [form, setForm]         = useState(INITIAL_FORM);
    const [cargando, setCargando] = useState(false);
    const [fotoFiles, setFotoFiles] = useState([null, null, null]);
    const [fotoPreviews, setFotoPreviews] = useState(['', '', '']);
    const [seccionAbierta, setSeccionAbierta] = useState('basico');

    useEffect(() => {
        if (repuestoEdicion) {
            let costosReales = INITIAL_FORM.costosReales;
            if (repuestoEdicion.costosRealesJson) {
                try {
                    const parseado = JSON.parse(repuestoEdicion.costosRealesJson);
                    if (Array.isArray(parseado) && parseado.length > 0) costosReales = parseado;
                } catch (e) { /* JSON invalido, se usa el default */ }
            }
            setForm({ ...INITIAL_FORM, ...repuestoEdicion, porcentajeImpuestos: repuestoEdicion.porcentajeImpuestos ?? '0', costosReales });
        } else {
            setForm(INITIAL_FORM);
        }
        setFotoFiles([null, null, null]);
        setFotoPreviews(['', '', '']);
        setSeccionAbierta('basico');
    }, [repuestoEdicion, isOpen]);

    const sanitizarNumero = (valor) => {
        let limpio = valor.replace(',', '.').replace(/[^0-9.]/g, '');
        const partes = limpio.split('.');
        if (partes.length > 2) limpio = partes[0] + '.' + partes.slice(1).join('');
        return limpio;
    };

    const cambiarFinanciero = (campo, valor) => {
        const valorLimpio = sanitizarNumero(valor);
        const nuevoForm = { ...form, [campo]: valorLimpio };
        const precios = calcularPrecios(nuevoForm);
        // No pisar el campo que el usuario esta tipeando con .toFixed(2)
        delete precios[campo];
        setForm({ ...nuevoForm, ...precios });
    };

    // Costos reales (IIBB, tarjeta, etc.) que bajan tu ganancia pero NO se le cobran al
    // cliente — son informativos, no afectan el precio. No se guardan con el producto.
    const cambiarCostoReal = (idx, campo, valor) => {
        const nuevos = form.costosReales.map((c, i) =>
            i === idx ? { ...c, [campo]: campo === 'porcentaje' ? sanitizarNumero(valor) : valor } : c
        );
        setForm({ ...form, costosReales: nuevos });
    };
    const toggleCostoReal = (idx) => {
        const nuevos = form.costosReales.map((c, i) => i === idx ? { ...c, activo: !c.activo } : c);
        setForm({ ...form, costosReales: nuevos });
    };
    const agregarCostoReal = () => {
        setForm({ ...form, costosReales: [...form.costosReales, { nombre: '', porcentaje: '', activo: true }] });
    };
    const quitarCostoReal = (idx) => {
        setForm({ ...form, costosReales: form.costosReales.filter((_, i) => i !== idx) });
    };

    const manejarFoto = async (e, index = 0) => {
        const file = e.target.files[0];
        if (!file) return;
        const compressed = await comprimirFoto(file);
        setFotoFiles(prev => { const n = [...prev]; n[index] = compressed; return n; });
        const reader = new FileReader();
        reader.onloadend = () => {
            setFotoPreviews(prev => { const n = [...prev]; n[index] = reader.result; return n; });
        };
        reader.readAsDataURL(compressed);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sku || !form.nombre) { toast.error('SKU y Nombre son obligatorios'); return; }
        const loading = toast.loading(form.id ? 'Actualizando...' : 'Creando...');
        setCargando(true);
        try {
            const fd = new FormData();
            fd.append('sku', form.sku.trim().toUpperCase());
            fd.append('nombre', form.nombre.trim());
            if (form.descripcion) fd.append('descripcion', form.descripcion);
            if (form.costo !== '') fd.append('costo', parseFloat(form.costo) || 0);
            if (form.porcentajeGanancia !== '') fd.append('porcentajeGanancia', parseFloat(form.porcentajeGanancia) || 0);
            if (form.porcentajeMarkup !== '') fd.append('porcentajeMarkup', parseFloat(form.porcentajeMarkup) || 0);
            fd.append('precio', parseFloat(form.precio) || 0);
            fd.append('stock', parseInt(form.stock) || 0);
            if (form.costoBlanco !== '') fd.append('costoBlanco', parseFloat(form.costoBlanco) || 0);
            if (form.porcentajeImpuestos !== '') fd.append('porcentajeImpuestos', parseFloat(form.porcentajeImpuestos) || 0);
            if (form.precioFacturado !== '') fd.append('precioFacturado', parseFloat(form.precioFacturado) || 0);
            if (form.precioNetoCliente !== '') fd.append('precioNetoCliente', parseFloat(form.precioNetoCliente) || 0);
            if (form.precioCantidad !== '') fd.append('precioCantidad', parseFloat(form.precioCantidad) || 0);
            if (form.cantidadMinima !== '') fd.append('cantidadMinima', parseInt(form.cantidadMinima) || 0);
            if (form.porcentajeCuotas3 !== '') fd.append('porcentajeCuotas3', parseFloat(form.porcentajeCuotas3) || 0);
            if (form.porcentajeCuotas6 !== '') fd.append('porcentajeCuotas6', parseFloat(form.porcentajeCuotas6) || 0);
            fd.append('costosRealesJson', JSON.stringify(form.costosReales || []));
            if (fotoFiles[0]) fd.append('foto', fotoFiles[0]);
            if (fotoFiles[1]) fd.append('foto2', fotoFiles[1]);
            if (fotoFiles[2]) fd.append('foto3', fotoFiles[2]);
            const url = form.id ? `/repuestos/${form.id}` : `/repuestos`;
            const method = form.id ? 'put' : 'post';
            await api[method](url, fd);
            toast.success('Guardado', { id: loading });
            onGuardado();
            onClose();
        } catch (err) {
            const msg = err.response?.status === 409 ? 'Ya existe un repuesto con ese SKU' : 'Error al guardar';
            toast.error(msg, { id: loading });
        } finally { setCargando(false); }
    };

    if (!isOpen) return null;

    const inputBase = "w-full mt-1 p-3 rounded-xl text-sm font-bold outline-none transition-all border bg-[#E8E5E0] dark:bg-[#2E2E2E] border-black/[0.07] dark:border-white/[0.07] text-[#1C1917] dark:text-[#F0EEE9] focus:ring-2 focus:ring-[#D13A28]/20";
    const labelBase = "text-[10px] font-black uppercase tracking-wide";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-[3000]">
            <div className="bg-[#FFFFFF] dark:bg-[#242424] w-full max-w-lg rounded-t-3xl p-6 shadow-2xl">
                <div className="w-12 h-1.5 bg-[#E8E5E0] dark:bg-[#2E2E2E] rounded-full mx-auto mb-5" />
                <h3 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] mb-5">
                    {form.id ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>

                <form onSubmit={handleSubmit} className="grid gap-3 max-h-[75vh] overflow-y-auto pr-1 pb-2">
                    <FotosUploader form={form} fotoPreviews={fotoPreviews} onFotoChange={manejarFoto} />

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>SKU</label>
                            <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} className={inputBase} />
                        </div>
                        <div className="col-span-2">
                            <label className={`${labelBase} text-[#A8A29E]`}>Nombre</label>
                            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputBase} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>Stock actual</label>
                            <input type="text" inputMode="numeric" value={form.stock}
                                onChange={e => setForm({ ...form, stock: e.target.value.replace(/[^0-9]/g, '') })} className={inputBase} />
                        </div>
                        <div>
                            <label className={`${labelBase} text-[#A8A29E]`}>Descripcion</label>
                            <input value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                placeholder="Opcional" className={inputBase} />
                        </div>
                    </div>

                    <SeccionesPrecios
                        form={form} seccionAbierta={seccionAbierta} setSeccionAbierta={setSeccionAbierta}
                        cambiarFinanciero={cambiarFinanciero} sanitizarNumero={sanitizarNumero} setForm={setForm}
                        cambiarCostoReal={cambiarCostoReal} toggleCostoReal={toggleCostoReal}
                        agregarCostoReal={agregarCostoReal} quitarCostoReal={quitarCostoReal}
                    />

                    <div className="flex gap-3 mt-1">
                        <button type="button" onClick={onClose} disabled={cargando}
                            className="flex-1 py-3.5 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl font-extrabold text-sm disabled:opacity-50 active:scale-95 transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={cargando}
                            className="flex-[2] py-3.5 bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90 text-white rounded-xl font-extrabold text-sm shadow-md shadow-[#D13A28]/30 disabled:opacity-50 active:scale-95 transition-all">
                            {cargando ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
