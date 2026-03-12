import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import ProductoForm from './ProductoForm';
import ProductoCard from './productos/Productocard';
import BarraAccionesProductos from './productos/Barraaccionesproducto';
import ModalPrecioMasivo from './productos/Modalpreciomasivo';
import { generarPDFListaPrecios } from '../utils/generadorPDFListaPrecios';

export default function GestorProductos() {
  // ── Estado ──────────────────────────────────────────────
  const [productos, setProductos]           = useState([]);
  const [modalAbierto, setModalAbierto]     = useState(false);
  const [productoEdicion, setProductoEdicion] = useState(null);
  const [expandido, setExpandido]           = useState({});
  const [busqueda, setBusqueda]             = useState('');
  const [seleccionados, setSeleccionados]   = useState(new Set());
  const [modoSeleccion, setModoSeleccion]   = useState(false);
  const [modalPrecio, setModalPrecio]       = useState(false);
  const [porcentajeMasivo, setPorcentajeMasivo] = useState('');
  const [tipoPorcentaje, setTipoPorcentaje] = useState('ganancia');

  useEffect(() => { cargarProductos(); }, []);

  // ── API ─────────────────────────────────────────────────
  const cargarProductos = async () => {
    try {
      const res = await api.get('/repuestos?page=0&size=1000');
      setProductos(res.data.content || res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar productos');
    }
  };

  // ── Filtrado ─────────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.toLowerCase().trim();
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  // ── Selección ────────────────────────────────────────────
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

  // ── Acciones masivas ─────────────────────────────────────
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
    generarPDFListaPrecios(productos.filter(p => seleccionados.has(p.id)));
    toast.success(`📥 PDF con ${seleccionados.size} producto(s)`);
  };

  const exportarTodos = () => {
    if (productos.length === 0) { toast.error('No hay productos'); return; }
    generarPDFListaPrecios(productos);
    toast.success('📥 PDF generado');
  };

  const aplicarPrecioMasivo = async () => {
    const valor = parseFloat(porcentajeMasivo);
    if (isNaN(valor) || valor < 0) { toast.error('Ingresá un porcentaje válido'); return; }
    if (seleccionados.size === 0) return;
    const t = toast.loading('Actualizando precios...');
    try {
      await Promise.all(
        productos.filter(p => seleccionados.has(p.id)).map(producto => {
          const fd = new FormData();
          fd.append('sku', producto.sku);
          fd.append('nombre', producto.nombre);
          fd.append('costo', producto.costo);
          const g = tipoPorcentaje === 'ganancia' ? valor : producto.porcentajeGanancia;
          const m = tipoPorcentaje === 'markup'   ? valor : producto.porcentajeMarkup;
          fd.append('porcentajeGanancia', g);
          fd.append('porcentajeMarkup', m);
          const base  = parseFloat(producto.costo) * (1 + g / 100);
          const lista = base * (1 + m / 100);
          fd.append('precioLista', lista);
          return api.put(`/repuestos/${producto.id}`, fd);
        })
      );
      toast.success('✅ Precios actualizados', { id: t });
      setModalPrecio(false);
      setPorcentajeMasivo('');
      cancelarSeleccion();
      await cargarProductos();
    } catch {
      toast.error('Error al actualizar precios', { id: t });
    }
  };

  // ── CRUD individual ──────────────────────────────────────
  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/repuestos/${id}`);
      toast.success('Producto eliminado');
      await cargarProductos();
    } catch { toast.error('Error al eliminar'); }
  };

  const toggleExpandido = (id) =>
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  const todosSeleccionados =
    seleccionados.size === productosFiltrados.length && productosFiltrados.length > 0;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto">

        <BarraAccionesProductos
          totalProductos={productos.length}
          modoSeleccion={modoSeleccion}
          seleccionados={seleccionados}
          todosSeleccionados={todosSeleccionados}
          busqueda={busqueda}
          productosFiltrados={productosFiltrados}
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
                {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos. Crea uno para empezar.'}
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
                onEditar={(p) => { setProductoEdicion(p); setModalAbierto(true); }}
                onEliminar={eliminar}
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL PRECIO MASIVO */}
      {modalPrecio && (
        <ModalPrecioMasivo
          cantidadSeleccionados={seleccionados.size}
          porcentajeMasivo={porcentajeMasivo}
          tipoPorcentaje={tipoPorcentaje}
          onPorcentajeChange={setPorcentajeMasivo}
          onTipoChange={setTipoPorcentaje}
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
    </div>
  );
}
