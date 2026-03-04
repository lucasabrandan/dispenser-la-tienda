import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RepuestoManager() {
    // --- ESTADOS ---
    const [repuestos, setRepuestos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    
    const [form, setForm] = useState({ 
        id: null, sku: '', nombre: '', descripcion: '', 
        costo: '', porcentajeGanancia: '', precio: '', 
        stock: '', imagen: '' 
    });

    // --- CARGA DE DATOS ---
    useEffect(() => { 
        cargarRepuestos(); 
    }, []);

    const cargarRepuestos = () => {
        api.get('/repuestos')
            .then(res => setRepuestos(Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error("❌ Error al conectar con el inventario"));
    };

    // --- LÓGICA FINANCIERA (Precio = Costo + Margen) ---
    const manejarCambiosFinancieros = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        const costo = parseFloat(nuevoForm.costo) || 0;
        const margen = parseFloat(nuevoForm.porcentajeGanancia) || 0;
        
        if (costo >= 0) {
            // Fórmula: Precio = Costo * (1 + Margen/100)
            const precioCalculado = costo + (costo * (margen / 100));
            nuevoForm.precio = precioCalculado.toFixed(2);
        }
        setForm(nuevoForm);
    };

    // --- MANEJO DE IMÁGENES (Base64 para PDF) ---
    const manejarFoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return toast.error("❌ Imagen muy pesada (Máx 2MB)");
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, imagen: reader.result });
            reader.readAsDataURL(file);
        }
    };

    // --- GUARDADO EN BASE DE DATOS ---
    const guardarRepuesto = async (e) => {
        if (e) e.preventDefault();
        if (!form.sku || !form.nombre) return toast.error("❌ SKU y Nombre son obligatorios");

        const loading = toast.loading("Sincronizando stock...");
        try {
            const payload = { 
                ...form, 
                costo: Number(form.costo), 
                porcentajeGanancia: Number(form.porcentajeGanancia), 
                precio: Number(form.precio), 
                stock: Number(form.stock) 
            };
            
            if (form.id) {
                await api.put(`/repuestos/${form.id}`, payload);
            } else {
                await api.post('/repuestos', payload);
            }
            
            toast.success("✅ Stock actualizado correctamente", { id: loading });
            setModalAbierto(false);
            setForm({ id: null, sku: '', nombre: '', costo: '', porcentajeGanancia: '', precio: '', stock: '', imagen: '' });
            cargarRepuestos();
        } catch (err) { 
            toast.error("❌ Error al guardar en el servidor", { id: loading }); 
        }
    };

    const eliminarRepuesto = async (id, nombre) => {
        if(window.confirm(`⚠️ ¿ELIMINAR "${nombre.toUpperCase()}" PERMANENTEMENTE?`)) {
            try {
                await api.delete(`/repuestos/${id}`);
                toast.success("🗑️ Producto eliminado");
                cargarRepuestos();
            } catch (err) { toast.error("❌ No se pudo eliminar"); }
        }
    };

    // --- GENERADOR DE CATÁLOGO PDF CON IMÁGENES ---
    const generarCatalogoPDF = () => {
        if (filtrados.length === 0) return toast.error("No hay productos para exportar");
        const doc = new jsPDF();
        
        // Encabezado Pro
        doc.setFillColor(52, 131, 250); // Azul ML
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("CATÁLOGO DE REPUESTOS", 14, 25);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()} | Total Items: ${filtrados.length}`, 14, 33);
        
        const tableColumn = ["Vista", "SKU", "Nombre del Repuesto", "Stock", "Precio Venta"];
        const tableRows = filtrados.map(r => [
            "", // Espacio para la miniatura
            r.sku, 
            r.nombre, 
            `${r.stock} un.`, 
            `$ ${Number(r.precio).toLocaleString()}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            styles: { fontSize: 10, valign: 'middle', cellPadding: 5 },
            headStyles: { fillColor: [33, 33, 33], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 20 }, // Columna de imagen
                4: { fontStyle: 'bold', halign: 'right' }
            },
            didDrawCell: (data) => {
                if (data.column.index === 0 && data.cell.section === 'body') {
                    const r = filtrados[data.row.index];
                    if (r.imagen) {
                        try {
                            doc.addImage(r.imagen, 'JPEG', data.cell.x + 2, data.cell.y + 2, 16, 16);
                        } catch (e) { console.error("Error cargando imagen al PDF"); }
                    }
                }
            }
        });

        doc.save(`Inventario_Lucas_Marcos_${new Date().getTime()}.pdf`);
    };

    // --- FILTRADO ---
    const filtrados = repuestos.filter(r => 
        (r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
         r.sku?.toLowerCase().includes(busqueda.toLowerCase()))
    );

    const valorTotalInventario = repuestos.reduce((acc, r) => acc + (Number(r.costo || 0) * Number(r.stock)), 0);
    const itemsBajoStock = repuestos.filter(r => Number(r.stock) <= 3).length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-32 font-sans transition-colors duration-300">
            
            {/* 📊 INDICADORES SUPERIORES */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500 shadow-sm transition-colors duration-300">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide m-0">Capital Invertido</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1 tracking-tight">$ {valorTotalInventario.toLocaleString()}</p>
                </div>
                <div className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 shadow-sm transition-colors duration-300 ${itemsBajoStock > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'}`}>
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide m-0">Stock Crítico</p>
                    <p className={`text-lg font-black mt-1 tracking-tight ${itemsBajoStock > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                        {itemsBajoStock} PROD.
                    </p>
                </div>
            </div>

            {/* 🔍 BUSCADOR Y AGREGAR */}
            <div className="flex gap-2 mb-5">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">🔍</span>
                    <input 
                        placeholder="Buscar por nombre o SKU..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full py-3.5 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[15px] font-semibold text-slate-900 dark:text-white outline-none shadow-sm focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                    />
                </div>
                <button 
                    onClick={() => { 
                        setForm({ id: null, sku: '', nombre: '', costo: '', porcentajeGanancia: '', precio: '', stock: '', imagen: '' });
                        setModalAbierto(true); 
                    }} 
                    className="bg-blue-600 hover:bg-blue-700 text-white w-14 rounded-xl flex justify-center items-center text-2xl font-bold shadow-md shadow-blue-500/30 transition-all active:scale-95"
                >
                    +
                </button>
            </div>

            {/* 📋 LISTADO DE PRODUCTOS */}
            <div className="grid gap-3">
                {filtrados.map(r => (
                    <div key={r.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors duration-300">
                        
                        {/* Miniatura Imagen */}
                        <div className="min-w-[70px] h-[70px] rounded-xl bg-slate-100 dark:bg-slate-700 flex justify-center items-center overflow-hidden border border-slate-200 dark:border-slate-600">
                            {r.imagen ? (
                                <img src={r.imagen} className="w-full h-full object-cover" alt="repuesto" />
                            ) : (
                                <span className="text-2xl opacity-50">📦</span>
                            )}
                        </div>

                        {/* Info Producto */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wide">{r.sku}</span>
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${Number(r.stock) <= 3 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                                    {r.stock} UNID.
                                </span>
                            </div>
                            <h4 className="m-0 mt-1 text-[15px] text-slate-900 dark:text-white font-extrabold leading-tight">{r.nombre}</h4>
                            
                            <div className="flex justify-between items-center mt-2">
                                <span className="font-black text-lg text-slate-900 dark:text-white">$ {Number(r.precio).toLocaleString()}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => { setForm(r); setModalAbierto(true); }} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">✏️</button>
                                    <button onClick={() => eliminarRepuesto(r.id, r.nombre)} className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-colors">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {filtrados.length === 0 && (
                    <div className="text-center p-10 text-slate-400 font-semibold">
                        No se encontraron repuestos.
                    </div>
                )}
            </div>

            {/* ⬆️ MODAL BOTTOM SHEET (ESTILO APP NATIVA) */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-[3000] transition-opacity">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
                        <h3 className="m-0 mb-5 text-lg font-black text-slate-900 dark:text-white">
                            {form.id ? '✏️ EDITAR PRODUCTO' : '📦 NUEVO INGRESO'}
                        </h3>
                        
                        <form onSubmit={guardarRepuesto} className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2 pb-2">
                            
                            {/* Subida de foto */}
                            <div className="flex gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 items-center">
                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex justify-center items-center overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
                                    {form.imagen ? <img src={form.imagen} className="w-full h-full object-cover" alt="preview" /> : <span className="text-2xl opacity-50">📸</span>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <label className="text-[10px] font-black text-slate-500 tracking-wide">FOTO DEL REPUESTO</label>
                                    <input type="file" accept="image/*" onChange={manejarFoto} className="text-xs mt-1 w-full text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-slate-500 tracking-wide uppercase">SKU</label>
                                    <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value.toUpperCase()})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 tracking-wide uppercase">Nombre</label>
                                    <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-blue-50/50 dark:bg-slate-700/30 p-3 rounded-2xl">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 tracking-wide uppercase">Costo $</label>
                                    <input type="number" value={form.costo} onChange={e => manejarCambiosFinancieros('costo', e.target.value)} className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 tracking-wide uppercase">Ganancia %</label>
                                    <input type="number" value={form.porcentajeGanancia} onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)} className="w-full mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-wide uppercase">Venta $</label>
                                    <input value={form.precio} readOnly className="w-full mt-1 p-3 bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-black text-blue-700 dark:text-blue-400 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 tracking-wide uppercase">Stock Actual</label>
                                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setModalAbierto(false)} className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-colors">CANCELAR</button>
                                <button type="submit" className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-blue-500/30 transition-all">GUARDAR CAMBIOS</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 📄 BOTÓN FLOTANTE PARA CATÁLOGO (CORREGIDO EL CHOQUE DE BARRAS) */}
            <button 
                onClick={generarCatalogoPDF}
                className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-slate-900 dark:bg-blue-600 text-white border-none text-2xl shadow-lg shadow-slate-900/30 dark:shadow-blue-600/30 flex justify-center items-center z-[100] active:scale-95 transition-transform"
            >
                📄
            </button>
        </div>
    );
}