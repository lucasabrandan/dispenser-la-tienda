import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import ProductoForm from './ProductoForm';
import ProductoCard from './Productocard';
import BarraAccionesProductos from './Barraaccionesproducto';
import ModalPrecioMasivo from './Modalpreciomasivo';
import { generarPDFListaPrecios } from '../../utils/generadorPDFListaPrecios';
import RepuestoManager from '../repuesto/RepuestoManager';

// ── Modal drag-and-drop para reordenar antes de exportar PDF ─────────────────
function ModalOrdenPDF({ productos, onConfirmar, onCerrar }) {
    const [orden, setOrden]           = useState(productos);
    const [descEfectivo, setDescEfectivo] = useState('10');
    const dragIdx = React.useRef(null);

    const onDragStart = (i) => { dragIdx.current = i; };
    const onDragOver  = (e, i) => {
        e.preventDefault();
        if (dragIdx.current === i) return;
        const arr = [...orden];
        const [item] = arr.splice(dragIdx.current, 1);
        arr.splice(i, 0, item);
        dragIdx.current = i;
        setOrden(arr);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4">
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md shadow-2xl flex flex-col max-h-[85vh]">
                    <div className="px-6 pt-5 pb-3 shrink-0">
                        <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Exportar lista de precios</h3>
                        <p className="text-[11px] text-[#A8A29E] mt-1">Arrastrá para cambiar el orden</p>
                    </div>

                    {/* Descuento efectivo */}
                    <div className="px-6 pb-3 shrink-0">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">Descuento pago en efectivo</p>
                                <p className="text-[10px] text-[#A8A29E] mt-0.5">Aparece junto al precio lista en el PDF</p>
                            </div>
                            <div className="relative w-20">
                                <input
                                    type="number" min="0" max="50"
                                    value={descEfectivo}
                                    onChange={e => setDescEfectivo(e.target.value)}
                                    className="w-full pr-7 pl-3 py-2 rounded-xl text-[13px] font-black text-center outline-none bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.07]"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] font-black text-sm pointer-events-none">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-y-auto px-6 pb-2 space-y-2 flex-1">
                        {orden.map((p, i) => (
                            <div key={p.id} draggable
                                onDragStart={() => onDragStart(i)}
                                onDragOver={(e) => onDragOver(e, i)}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#EFEDEA] dark:bg-[#2E2E2E] cursor-grab active:cursor-grabbing select-none">
                                <span className="text-[#A8A29E] text-[14px] font-black w-5 text-center">{i + 1}</span>
                                <span className="text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1 truncate">{p.nombre}</span>
                                <span className="text-[10px] text-[#A8A29E]">⠿⠿</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 px-6 py-4 shrink-0">
                        <button onClick={onCerrar} className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">Cancelar</button>
                        <button onClick={() => onConfirmar(orden, Number(descEfectivo) || 0)} className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F]">📄 Generar PDF</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function GestorProductos() {
    const [tab, setTab] = useState('productos'); // 'productos' | 'equipos'
    const [productos, setProductos]             = useState([]);
    const [modalAbierto, setModalAbierto]       = useState(false);
    const [productoEdicion, setProductoEdicion] = useState(null);
    const [expandido, setExpandido]             = useState({});
    const [busqueda, setBusqueda]               = useState('');
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [modalPrecio, setModalPrecio]         = useState(false);
    const [gananciamasiva, setGananciaMasiva]   = useState('');
    const [markupMasivo, setMarkupMasivo]       = useState('');
    const [modalOrden, setModalOrden]           = useState(null); // lista de productos a reordenar
    const [ordenProducto, setOrdenProducto]     = useState('nombre_asc');

    useEffect(() => { cargarProductos(); }, []);

    // ── API ────────────────────────────────────────────────────────────────────
    const cargarProductos = async () => {
        try {
            const res = await api.get('/repuestos?page=0&size=500');
            setProductos(res.data.content || res.data);
        } catch {
            toast.error('Error al cargar productos');
        }
    };

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const productosFiltrados = useMemo(() => {
        let lista = !busqueda.trim()
            ? [...productos]
            : productos.filter(p => {
                const q = busqueda.toLowerCase().trim();
                return p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
            });

        lista.sort((a, b) => {
            switch (ordenProducto) {
                case 'nombre_desc': return (b.nombre || '').localeCompare(a.nombre || '');
                case 'precio_desc': return (parseFloat(b.precioLista) || 0) - (parseFloat(a.precioLista) || 0);
                case 'precio_asc':  return (parseFloat(a.precioLista) || 0) - (parseFloat(b.precioLista) || 0);
                case 'sku_asc':     return (a.sku || '').localeCompare(b.sku || '');
                default:            return (a.nombre || '').localeCompare(b.nombre || ''); // nombre_asc
            }
        });

        return lista;
    }, [productos, busqueda, ordenProducto]);

    // ── Selección ──────────────────────────────────────────────────────────────
    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const seleccionarTodos = () => {
        setSeleccionados(
            seleccionados.size === productosFiltrados.length
                ? new Set()
                : new Set(productosFiltrados.map(p => p.id))
        );
    };

    const cancelarSeleccion = () => {
        setModoSeleccion(false);
        setSeleccionados(new Set());
    };

    // ── Acciones masivas ───────────────────────────────────────────────────────
    const eliminarSeleccionados = async () => {
        if (seleccionados.size === 0) return;
        if (!window.confirm(`¿Eliminar ${seleccionados.size} producto(s)?`)) return;
        const t = toast.loading('Eliminando...');
        try {
            await Promise.all([...seleccionados].map(id => api.delete(`/repuestos/${id}`)));
            toast.success(`✅ ${seleccionados.size} producto(s) eliminados`, { id: t });
            cancelarSeleccion();
            await cargarProductos();
        } catch {
            toast.error('Error al eliminar', { id: t });
        }
    };

    const exportarSeleccionados = () => {
        if (seleccionados.size === 0) return;
        setModalOrden(productosFiltrados.filter(p => seleccionados.has(p.id)));
    };

    const exportarTodos = () => {
        if (productosFiltrados.length === 0) { toast.error('No hay productos'); return; }
        setModalOrden([...productosFiltrados]);
    };

    const confirmarExportPDF = (ordenados, descEfectivo = 0) => {
        generarPDFListaPrecios(ordenados, descEfectivo);
        toast.success(`📥 PDF generado con ${ordenados.length} producto(s)`);
        setModalOrden(null);
    };

    const aplicarPrecioMasivo = async () => {
        const gVal = gananciamasiva !== '' ? parseFloat(gananciamasiva) : null;
        const mVal = markupMasivo   !== '' ? parseFloat(markupMasivo)   : null;
        if (gVal !== null && (isNaN(gVal) || gVal < 0)) { toast.error('Ganancia inválida'); return; }
        if (mVal !== null && (isNaN(mVal) || mVal < 0)) { toast.error('Markup inválido');   return; }
        if (gVal === null && mVal === null) { toast.error('Ingresá al menos un valor'); return; }
        if (seleccionados.size === 0) return;
        const t = toast.loading('Actualizando precios...');
        try {
            await Promise.all(
                productos.filter(p => seleccionados.has(p.id)).map(producto => {
                    const costoNum = parseFloat(producto.costo) || 0;
                    const g = gVal !== null ? gVal : (parseFloat(producto.porcentajeGanancia) || 0);
                    const m = mVal !== null ? mVal : (parseFloat(producto.porcentajeMarkup)   || 0);
                    const base  = costoNum * (1 + g / 100);
                    const lista = base * (1 + m / 100);
                    const fd = new FormData();
                    fd.append('sku',               producto.sku);
                    fd.append('nombre',            producto.nombre);
                    fd.append('descripcion',       producto.descripcion || '');
                    fd.append('costo',             costoNum);
                    fd.append('stock',             producto.stock ?? 0);
                    fd.append('porcentajeGanancia', g);
                    fd.append('porcentajeMarkup',   m);
                    fd.append('precioLista',        isNaN(lista) ? 0 : lista);
                    return api.put(`/repuestos/${producto.id}`, fd);
                })
            );
            toast.success('✅ Precios actualizados', { id: t });
            setModalPrecio(false);
            setGananciaMasiva('');
            setMarkupMasivo('');
            cancelarSeleccion();
            await cargarProductos();
        } catch {
            toast.error('Error al actualizar precios', { id: t });
        }
    };

    // ── CRUD individual ────────────────────────────────────────────────────────
    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar este producto?')) return;
        try {
            await api.delete(`/repuestos/${id}`);
            toast.success('Producto eliminado');
            await cargarProductos();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const toggleExpandido = (id) =>
        setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

    const todosSeleccionados =
        seleccionados.size === productosFiltrados.length && productosFiltrados.length > 0;

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] p-3 md:p-6 pb-24 transition-colors">
            <div className="max-w-6xl mx-auto">

                {/* TABS */}
                <div className="flex gap-2 mb-5">
                    {['productos', 'equipos'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                tab === t
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white shadow-md shadow-[#D13A28]/30'
                                    : 'bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                            }`}>
                            {t === 'productos' ? '🛒 Productos' : '⚙️ Equipos'}
                        </button>
                    ))}
                </div>

                {tab === 'equipos' ? (
                    <RepuestoManager />
                ) : (<>

                <BarraAccionesProductos
                    totalProductos={productos.length}
                    modoSeleccion={modoSeleccion}
                    seleccionados={seleccionados}
                    todosSeleccionados={todosSeleccionados}
                    busqueda={busqueda}
                    productosFiltrados={productosFiltrados}
                    ordenProducto={ordenProducto}
                    onOrdenChange={setOrdenProducto}
                    onExportarTodos={exportarTodos}
                    onNuevo={() => { setProductoEdicion(null); setModalAbierto(true); }}
                    onActivarSeleccion={() => setModoSeleccion(true)}
                    onCancelarSeleccion={cancelarSeleccion}
                    onSeleccionarTodos={seleccionarTodos}
                    onExportarSeleccionados={exportarSeleccionados}
                    onAbrirModalPrecio={() => setModalPrecio(true)}
                    onEliminarSeleccionados={eliminarSeleccionados}
                    onBusquedaChange={setBusqueda}
                />

                {/* LISTADO */}
                <div className="space-y-2.5">
                    {productosFiltrados.length === 0 ? (
                        <Card className="text-center py-12">
                            <p className="text-slate-400 text-sm">
                                {busqueda
                                    ? `Sin resultados para "${busqueda}"`
                                    : 'No hay productos. Creá uno para empezar.'}
                            </p>
                        </Card>
                    ) : (
                        productosFiltrados.map(producto => (
                            <ProductoCard
                                key={producto.id}
                                producto={producto}
                                estaExpandido={!!expandido[producto.id]}
                                estaSeleccionado={seleccionados.has(producto.id)}
                                modoSeleccion={modoSeleccion}
                                onToggleExpandido={toggleExpandido}
                                onToggleSeleccion={toggleSeleccion}
                                onEditar={p => { setProductoEdicion(p); setModalAbierto(true); }}
                                onEliminar={eliminar}
                            />
                        ))
                    )}
                </div>
            </>)}
            </div>

            {/* MODAL PRECIO MASIVO */}
            {modalPrecio && (
                <ModalPrecioMasivo
                    cantidadSeleccionados={seleccionados.size}
                    ganancia={gananciamasiva}
                    markup={markupMasivo}
                    onGananciaChange={setGananciaMasiva}
                    onMarkupChange={setMarkupMasivo}
                    onAplicar={aplicarPrecioMasivo}
                    onCerrar={() => setModalPrecio(false)}
                />
            )}

            {/* MODAL CREAR/EDITAR */}
            <ProductoForm
                isOpen={modalAbierto}
                onClose={() => { setModalAbierto(false); setProductoEdicion(null); }}
                onProductoGuardado={cargarProductos}
                productoEdicion={productoEdicion}
            />

            {/* MODAL ORDEN PDF */}
            {modalOrden && (
                <ModalOrdenPDF
                    productos={modalOrden}
                    onConfirmar={confirmarExportPDF}
                    onCerrar={() => setModalOrden(null)}
                />
            )}
        </div>
    );
}