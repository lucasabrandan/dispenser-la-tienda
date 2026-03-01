import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ⚛️ Átomos unificados (Asegurate que existan en su carpeta ui)
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

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
                // Si es la celda de imagen y el repuesto tiene imagen
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
        <div style={{ background: '#EDEDED', minHeight: '100vh', padding: '15px', paddingBottom: '120px' }}>
            
            {/* 📊 INDICADORES SUPERIORES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <Card style={{ borderLeft: '5px solid #3483FA', padding: '15px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#666', margin: 0 }}>CAPITAL INVERTIDO</p>
                    <p style={{ fontSize: '18px', fontWeight: '900', color: '#111', margin: 0 }}>$ {valorTotalInventario.toLocaleString()}</p>
                </Card>
                <Card style={{ borderLeft: `5px solid ${itemsBajoStock > 0 ? '#F23D4F' : '#00A650'}`, padding: '15px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#666', margin: 0 }}>STOCK CRÍTICO</p>
                    <p style={{ fontSize: '18px', fontWeight: '900', color: itemsBajoStock > 0 ? '#F23D4F' : '#111', margin: 0 }}>{itemsBajoStock} PRODUCTOS</p>
                </Card>
            </div>

            {/* BUSCADOR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                   <Input 
                        placeholder="🔍 Buscar por nombre o SKU..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <Button onClick={() => { 
                    setForm({ id: null, sku: '', nombre: '', costo: '', porcentajeGanancia: '', precio: '', stock: '', imagen: '' });
                    setModalAbierto(true); 
                }} style={{ background: '#3483FA', width: '50px', fontSize: '24px' }}>+</Button>
            </div>

            {/* LISTADO DE PRODUCTOS */}
            <div style={{ display: 'grid', gap: '12px' }}>
                {filtrados.map(r => (
                    <div key={r.id} style={{ 
                        background: '#FFF', padding: '12px', borderRadius: '12px', 
                        display: 'flex', alignItems: 'center', gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #DDD'
                    }}>
                        {/* Miniatura Imagen */}
                        <div style={{ width: '70px', height: '70px', borderRadius: '8px', background: '#F5F5F5', overflow: 'hidden', border: '1px solid #EEE', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {r.imagen ? (
                                <img src={r.imagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="r" />
                            ) : (
                                <span style={{ fontSize: '30px' }}>📦</span>
                            )}
                        </div>

                        {/* Info Producto */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#3483FA' }}>{r.sku}</span>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: Number(r.stock) <= 3 ? '#F23D4F' : '#00A650' }}>{r.stock} UNID.</span>
                            </div>
                            <h4 style={{ margin: '2px 0', fontSize: '15px', color: '#111', fontWeight: 'bold' }}>{r.nombre}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontWeight: '900', fontSize: '18px', color: '#111' }}>$ {Number(r.precio).toLocaleString()}</span>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => { setForm(r); setModalAbierto(true); }} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#F5F5F5' }}>✏️</button>
                                    <button onClick={() => eliminarRepuesto(r.id, r.nombre)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#FFEBEB', color: '#F23D4F' }}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL BOTTOM SHEET (Mobile First) */}
            {modalAbierto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 3000 }}>
                    <div style={{ background: '#FFF', width: '100%', maxWidth: '500px', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '20px', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0 auto 15px' }} />
                        <h3 style={{ margin: '0 0 20px 0', color: '#111', fontWeight: '900' }}>{form.id ? 'EDITAR PRODUCTO' : 'NUEVO INGRESO'}</h3>
                        
                        <form onSubmit={guardarRepuesto}>
                            <div style={{ display: 'flex', gap: '15px', background: '#F9F9F9', padding: '10px', borderRadius: '12px', marginBottom: '15px', border: '1px dashed #CCC' }}>
                                <div style={{ width: '60px', height: '60px', background: '#FFF', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #DDD' }}>
                                    {form.imagen ? <img src={form.imagen} style={{width: '100%'}} alt="p" /> : '📸'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#666' }}>FOTO DEL REPUESTO</label>
                                    <input type="file" accept="image/*" onChange={manejarFoto} style={{ fontSize: '12px', marginTop: '5px' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                                <Input label="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value.toUpperCase()})} />
                                <Input label="NOMBRE" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#F5F5F5', padding: '10px', borderRadius: '12px', marginBottom: '15px' }}>
                                <Input label="COSTO $" type="number" value={form.costo} onChange={e => manejarCambiosFinancieros('costo', e.target.value)} />
                                <Input label="GANANCIA %" type="number" value={form.porcentajeGanancia} onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)} />
                                <Input label="VENTA $" value={form.precio} readOnly style={{ fontWeight: 'bold', color: '#3483FA' }} />
                            </div>

                            <Input label="STOCK ACTUAL" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <Button onClick={() => setModalAbierto(false)} style={{ flex: 1, background: '#666' }}>CANCELAR</Button>
                                <Button type="submit" style={{ flex: 2, background: '#3483FA' }}>GUARDAR CAMBIOS</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BOTÓN FLOTANTE PARA CATÁLOGO */}
            <button 
                onClick={generarCatalogoPDF}
                style={{ 
                    position: 'fixed', bottom: '90px', right: '20px', width: '60px', height: '60px', 
                    borderRadius: '50%', background: '#111', color: '#FFF', border: 'none', 
                    fontSize: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', zIndex: 100 
                }}
            >
                📄
            </button>
        </div>
    );
}