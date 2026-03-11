import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import ProductoForm from './ProductoForm';
import { formatearPrecio } from '../utils/formatearPrecio';
import { generarPDFListaPrecios } from '../utils/generadorPDFListaPrecios';
import { construirUrlFoto } from '../utils/construirUrlFoto'; // ← IMPORTADO DEL UTIL, sin duplicar

/**
 * GestorProductos
 * Listado de productos con acordeón para mostrar/ocultar detalles de ganancias
 */
export default function GestorProductos() {
  const [productos, setProductos] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEdicion, setProductoEdicion] = useState(null);
  const [expandido, setExpandido] = useState({});

  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await api.get('/repuestos?page=0&size=1000');
      setProductos(res.data.content || res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar productos');
    }
  };

  // ==========================================
  // CREAR/EDITAR
  // ==========================================
  const abrirFormulario = (producto = null) => {
    setProductoEdicion(producto);
    setModalAbierto(true);
  };

  const handleProductoGuardado = async () => {
    await cargarProductos();
  };

  // ==========================================
  // ELIMINAR
  // ==========================================
  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;

    try {
      await api.delete(`/repuestos/${id}`);
      toast.success('Producto eliminado');
      await cargarProductos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  // ==========================================
  // TOGGLE ACORDEÓN
  // ==========================================
  const toggleExpandido = (id) => {
    setExpandido(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ==========================================
  // EXPORTAR LISTA DE PRECIOS
  // ==========================================
  const exportarListaPrecios = () => {
    if (productos.length === 0) {
      toast.error('No hay productos para exportar');
      return;
    }
    generarPDFListaPrecios(productos);
    toast.success('📥 PDF generado');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-20">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">📦 PRODUCTOS</h1>
            <p className="text-sm text-slate-400 mt-1">Gestiona precios y ganancias</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarListaPrecios}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-purple-700 transition-all active:scale-95"
            >
              📥 LISTA DE PRECIOS
            </button>
            <button
              onClick={() => abrirFormulario()}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
            >
              ➕ Nuevo Producto
            </button>
          </div>
        </div>

        {/* LISTADO */}
        <div className="space-y-3">
          {productos.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 text-sm">No hay productos. Crea uno para empezar.</p>
            </Card>
          ) : (
            productos.map(producto => {
              const estaExpandido = expandido[producto.id];
              const costo = parseFloat(producto.costo) || 0;
              const porcGanancia = parseFloat(producto.porcentajeGanancia) || 25;
              const porcMarkup = parseFloat(producto.porcentajeMarkup) || 15;

              const gananciaUnidad = (costo * porcGanancia) / 100;
              const precioBase = costo + gananciaUnidad;
              const precioLista = precioBase * (1 + porcMarkup / 100);

              return (
                <Card key={producto.id} className="overflow-hidden">
                  {/* FILA PRINCIPAL */}
                  <div className="p-4">
                    <div className="flex gap-4 items-center justify-between">

                      {/* FOTO + INFO */}
                      <div className="flex gap-4 items-center flex-1 min-w-0">
                        {producto.fotoUrl && (
                          <img
                            src={construirUrlFoto(producto.fotoUrl)}
                            alt={producto.nombre}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase">SKU: {producto.sku}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{producto.nombre}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Costo: ${formatearPrecio(costo)}</p>
                        </div>
                      </div>

                      {/* PRECIO LISTA */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Precio Lista</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          ${formatearPrecio(precioLista)}
                        </p>
                      </div>

                      {/* BOTONES */}
                      <div className="flex gap-2 flex-shrink-0 flex-col">
                        <button
                          onClick={() => toggleExpandido(producto.id)}
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-200 transition-all"
                        >
                          {estaExpandido ? '▲ Ocultar' : '▼ Ver detalles'}
                        </button>
                        <button
                          onClick={() => abrirFormulario(producto)}
                          className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-300 transition-all"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => eliminar(producto.id)}
                          className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-200 transition-all"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>

                    {/* ACORDEÓN */}
                    {estaExpandido && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl space-y-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white mb-3">📊 DETALLES DE GANANCIA</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Costo</p>
                              <p className="text-lg font-black text-slate-900 dark:text-white">${formatearPrecio(costo)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">% Ganancia Base</p>
                              <p className="text-lg font-black text-slate-900 dark:text-white">{porcGanancia.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Ganancia/Unidad</p>
                              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${formatearPrecio(gananciaUnidad)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Precio Base</p>
                              <p className="text-lg font-black text-blue-600 dark:text-blue-400">${formatearPrecio(precioBase)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">% Markup</p>
                              <p className="text-lg font-black text-slate-900 dark:text-white">{porcMarkup.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Precio Lista</p>
                              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${formatearPrecio(precioLista)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL CREAR/EDITAR */}
      <ProductoForm
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setProductoEdicion(null);
        }}
        onProductoGuardado={handleProductoGuardado}
        productoEdicion={productoEdicion}
      />
    </div>
  );
}
