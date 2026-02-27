import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ⚛️ Importamos tus Átomos
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

export default function RepuestoManager() {
    const [repuestos, setRepuestos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    
    const [form, setForm] = useState({ id: null, sku: '', nombre: '', descripcion: '', costo: '', porcentajeGanancia: '', precio: '', stock: '', imagen: '' });

    useEffect(() => { cargarRepuestos(); }, []);

    const cargarRepuestos = () => {
        api.get('/repuestos').then(res => setRepuestos(res.data)).catch(() => toast.error("Error al cargar inventario"));
    };

    const manejarCambiosFinancieros = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        const costo = parseFloat(nuevoForm.costo) || 0;
        const margen = parseFloat(nuevoForm.porcentajeGanancia) || 0;
        
        if (costo >= 0 && margen >= 0) {
            const precioCalculado = costo + (costo * (margen / 100));
            nuevoForm.precio = precioCalculado.toFixed(2);
        }
        setForm(nuevoForm);
    };

    const manejarFoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return toast.error("❌ La imagen es muy pesada. Max 2MB.");
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, imagen: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const guardarRepuesto = async (e) => {
        e.preventDefault();
        if (!form.sku || !form.nombre) return toast.error("❌ SKU y Nombre son obligatorios");

        try {
            const payload = { ...form, costo: Number(form.costo), porcentajeGanancia: Number(form.porcentajeGanancia), precio: Number(form.precio), stock: Number(form.stock) };
            if (form.id) {
                await api.put(`/repuestos/${form.id}`, payload);
                toast.success("✅ Actualizado");
            } else {
                await api.post('/repuestos', payload);
                toast.success("✅ Ingresado al stock");
            }
            setModalAbierto(false);
            cargarRepuestos();
        } catch (err) { toast.error("❌ Error al guardar."); }
    };

    const eliminarRepuesto = async (id, nombre) => {
        if(window.confirm(`⚠️ ¿Eliminar "${nombre}"?`)) {
            try {
                await api.delete(`/repuestos/${id}`);
                toast.success("🗑️ Eliminado");
                cargarRepuestos();
            } catch (err) { toast.error("❌ Error al eliminar"); }
        }
    };

    const filtrados = repuestos.filter(r => {
        const txt = busqueda.toLowerCase();
        return (r.nombre?.toLowerCase().includes(txt) || r.sku?.toLowerCase().includes(txt));
    });

    // 📄 GENERADOR DE CATÁLOGO PDF PROFESIONAL
    const generarCatalogoPDF = () => {
        if (filtrados.length === 0) return toast.error("No hay productos para exportar.");
        const doc = new jsPDF();
        const BRAND_RED = [229, 77, 66];
        
        doc.setFontSize(22);
        doc.setTextColor(...BRAND_RED);
        doc.text("Dispenser La Tienda", 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text("Catálogo Oficial de Repuestos", 14, 30);
        doc.text(`Actualizado: ${new Date().toLocaleDateString()}`, 14, 36);

        const tableColumn = ["Foto", "SKU", "Producto", "Descripción", "Precio Venta"];
        const tableRows = filtrados.map(r => [
            "", // Espacio para foto
            r.sku || "-",
            r.nombre,
            r.descripcion || "-",
            `$ ${Number(r.precio).toLocaleString('es-AR')}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: BRAND_RED, halign: 'center' },
            bodyStyles: { minCellHeight: 20, valign: 'middle' },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            didDrawCell: (data) => {
                if (data.column.index === 0 && data.cell.section === 'body') {
                    const r = filtrados[data.row.index];
                    if (r.imagen) {
                        try { doc.addImage(r.imagen, 'JPEG', data.cell.x + 5, data.cell.y + 2, 16, 16); } catch (e) {}
                    }
                }
            }
        });

        doc.save(`Catalogo_LaTienda.pdf`);
        toast.success("📄 Catálogo generado");
    };

    const valorTotalInventario = repuestos.reduce((acc, r) => acc + (Number(r.costo || 0) * Number(r.stock)), 0);
    const itemsBajoStock = repuestos.filter(r => Number(r.stock) <= 5).length;

    return (
        <div style={{ color: 'var(--text-primary)' }}>
            
            {/* 📊 INDICADORES SUPERIORES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                <Card style={{ borderLeft: '5px solid var(--status-info)' }}>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>STOCK TOTAL</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{repuestos.length} <small style={{fontSize: '0.4em', color: 'var(--text-secondary)'}}>ÍTEMS</small></div>
                </Card>
                <Card style={{ borderLeft: '5px solid var(--brand-yellow)' }}>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>CAPITAL INVERTIDO</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--brand-yellow)' }}>$ {valorTotalInventario.toLocaleString('es-AR')}</div>
                </Card>
                <Card style={{ borderLeft: `5px solid ${itemsBajoStock > 0 ? 'var(--brand-red)' : 'var(--border-color)'}` }}>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ALERTAS STOCK BAJO</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: itemsBajoStock > 0 ? 'var(--brand-red)' : 'inherit' }}>{itemsBajoStock}</div>
                </Card>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>🔧 Inventario de Repuestos</h2>
                <div style={{display: 'flex', gap: '10px'}}>
                    <Button variant="secondary" onClick={generarCatalogoPDF}>📄 EXPORTAR PDF</Button>
                    <Button variant="success" onClick={() => { setForm({ id: null, sku: '', nombre: '', descripcion: '', costo: '', porcentajeGanancia: '', precio: '', stock: '', imagen: '' }); setModalAbierto(true); }}>
                        + NUEVO REPUESTO
                    </Button>
                </div>
            </div>

            <Input 
                placeholder="🔍 Buscar por nombre o SKU..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
            />

            {/* 📋 TABLA DARK INTEGRADA */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Vista</th>
                            <th>SKU</th>
                            <th>Producto</th>
                            <th style={{ textAlign: 'center' }}>Stock</th>
                            <th style={{ textAlign: 'right' }}>Venta ($)</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', background: Number(r.stock) <= 5 ? 'rgba(229, 77, 66, 0.05)' : 'transparent' }}>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {r.imagen ? (
                                        <img src={r.imagen} alt={r.nombre} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                                    ) : <div style={{fontSize: '1.2em', opacity: 0.5}}>📦</div>}
                                </td>
                                <td style={{ color: 'var(--brand-yellow)', fontWeight: 'bold', fontFamily: 'monospace' }}>{r.sku}</td>
                                <td>
                                    <div style={{fontWeight: 'bold'}}>{r.nombre}</div>
                                    <div style={{fontSize: '0.8em', color: 'var(--text-secondary)'}}>{r.descripcion}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '0.85em',
                                        fontWeight: 'bold',
                                        background: Number(r.stock) <= 5 ? 'var(--brand-red)' : 'var(--bg-main)',
                                        color: Number(r.stock) <= 5 ? 'white' : 'var(--status-success)'
                                    }}>
                                        {r.stock} un.
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>$ {Number(r.precio).toLocaleString('es-AR')}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <Button variant="secondary" onClick={() => { setForm(r); setModalAbierto(true); }} style={{padding: '6px 10px', marginRight: '5px'}}>✏️</Button>
                                    <Button variant="danger" onClick={() => eliminarRepuesto(r.id, r.nombre)} style={{padding: '6px 10px'}}>🗑️</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* 🪟 MODAL DE EDICIÓN/INGRESO */}
            {modalAbierto && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '550px', borderTop: '5px solid var(--brand-red)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--brand-red)' }}>{form.id ? '✏️ EDITAR REPUESTO' : '🆕 NUEVO INGRESO'}</h3>
                        
                        <form onSubmit={guardarRepuesto} style={{ display: 'grid', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'var(--bg-main)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                <div style={{ width: '70px', height: '70px', background: 'var(--bg-card)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    {form.imagen ? <img src={form.imagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{fontSize: '2em'}}>📸</span>}
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '5px'}}>IMAGEN DEL PRODUCTO</label>
                                    <input type="file" accept="image/*" onChange={manejarFoto} style={{fontSize: '12px'}} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                                <Input label="SKU / CÓDIGO" value={form.sku} onChange={e => setForm({...form, sku: e.target.value.toUpperCase()})} placeholder="EJ: R-102" />
                                <Input label="NOMBRE DEL PRODUCTO" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="EJ: RESISTENCIA CALOR" />
                            </div>

                            <Input label="DESCRIPCIÓN BREVE" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', background: 'var(--bg-main)', padding: '15px', borderRadius: '12px' }}>
                                <Input label="COSTO ($)" type="number" value={form.costo} onChange={e => manejarCambiosFinancieros('costo', e.target.value)} />
                                <Input label="GANANCIA (%)" type="number" value={form.porcentajeGanancia} onChange={e => manejarCambiosFinancieros('porcentajeGanancia', e.target.value)} />
                                <Input label="VENTA ($)" value={form.precio} readOnly style={{background: 'var(--bg-card)', border: '1px solid var(--brand-yellow)', color: 'var(--brand-yellow)', fontWeight: 'bold'}} />
                            </div>

                            <div style={{display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: 'var(--status-success)', fontWeight: 'bold'}}>
                                Ganancia neta estimada: $ {(Number(form.precio) - Number(form.costo)).toFixed(2)} por unidad
                            </div>

                            <Input label="STOCK DISPONIBLE" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <Button variant="secondary" onClick={() => setModalAbierto(false)} style={{flex: 1}}>CANCELAR</Button>
                                <Button variant="primary" type="submit" style={{flex: 2}}>💾 GUARDAR CAMBIOS</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}