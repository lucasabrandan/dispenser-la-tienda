import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import CrearClienteModal from './CrearClienteModal';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';
 
/**
 * VentaForm - Flujo simplificado para VENTAS
 * - Seleccionar cliente
 * - Agregar productos
 * - Aplicar descuento
 * - Guardar/Confirmar
 */
export default function VentaForm({ onSaved }) {
  // ── Estado ──────────────────────────────────────
  const [clientes, setClientes] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [repuestoElegido, setRepuestoElegido] = useState(null);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreClientePrellenado, setNombreClientePrellenado] = useState('');
 
  const isDark = document.documentElement.classList.contains('dark');
 
  // ── Cargar datos ────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, r] = await Promise.all([
          api.get('/clientes?page=0&size=1000'),
          api.get('/repuestos?page=0&size=1000')
        ]);
        setClientes(c.data.content || c.data);
        setRepuestos(r.data.content || r.data);
      } catch (err) {
        console.error(err);
        toast.error('Error de conexión');
      }
    };
    cargar();
  }, []);
 
  // ── Estilos Select ──────────────────────────────
  const premiumStyles = {
    control: (base, state) => ({
      ...base,
      background: isDark ? '#0F172A' : '#F8FAFC',
      border: state.isFocused ? '1px solid #3B82F6' : isDark ? '1px solid #334155' : '1px solid #E2E8F0',
      borderRadius: '12px',
      minHeight: '55px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
      '&:hover': { border: '1px solid #3B82F6' },
      transition: 'all 0.2s ease'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFF'),
      color: state.isSelected ? '#FFF' : isDark ? '#CBD5E1' : '#334155',
      padding: '12px 15px',
      cursor: 'pointer'
    }),
    menu: base => ({ ...base, background: isDark ? '#0F172A' : '#FFF' }),
    singleValue: base => ({ ...base, color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: '700' }),
  };
 
  // ── Agregar producto ────────────────────────────
  const agregarProducto = () => {
    if (!repuestoElegido) return;
    const nuevoProducto = {
      id: repuestoElegido.id,
      nombre: repuestoElegido.nombre,
      sku: repuestoElegido.sku,
      precio: parseFloat(repuestoElegido.precio),
      cantidad: 1,
      subtotal: parseFloat(repuestoElegido.precio)
    };
    setProductos([...productos, nuevoProducto]);
    setRepuestoElegido(null);
  };
 
  // ── Actualizar cantidad ─────────────────────────
  const actualizarCantidad = (idx, valor) => {
    const nuevos = [...productos];
    const qty = Math.max(1, parseInt(valor) || 1);
    nuevos[idx].cantidad = qty;
    nuevos[idx].subtotal = qty * nuevos[idx].precio;
    setProductos(nuevos);
  };
 
  // ── Quitar producto ────────────────────────────
  const quitarProducto = (idx) => {
    const nuevos = [...productos];
    nuevos.splice(idx, 1);
    setProductos(nuevos);
  };
 
  // ── Cálculos ────────────────────────────────────
  const totalBruto = productos.reduce((a, b) => a + b.subtotal, 0);
  const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
  const totalFinal = totalBruto - descuentoMonto;
 
  // ── Guardar venta ───────────────────────────────
  const guardarVenta = async (confirmar = false) => {
    if (!clienteId || productos.length === 0) {
      toast.error('❌ Falta cliente o productos');
      return;
    }
 
    const loading = toast.loading(confirmar ? 'Confirmando...' : 'Guardando...');
    try {
      const clienteObj = clientes.find(c => c.id.toString() === clienteId);
      const servicioData = {
        sedeId: 1, // Mostrador por defecto
        usuarioId: 1,
        fecha: new Date().toISOString().split('T')[0],
        servicioTipo: 'VENTA',
        estado: confirmar ? 'REALIZADO' : 'PRESUPUESTO',
        clienteNombre: clienteObj?.nombre || 'Particular',
        sedeNombre: 'Mostrador',
        descuentoPorcentaje,
        totalConDescuento: totalFinal,
        items: [
          {
            equipoSerial: 'MOSTRADOR',
            tecnico: 'Mostrador',
            costo: totalFinal,
            costoExtra: 0,
            metodoPago: 'EFECTIVO',
            trabajoRealizado: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
            trabajoTipo: 'VENTA',
            repuestosUsados: productos,
            garantiaHasta: null
          }
        ]
      };
 
      await api.post('/servicios', servicioData);
      toast.success('✅ ¡Venta guardada!', { id: loading });
      setProductos([]);
      setClienteId(null);
      setDescuentoPorcentaje(0);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.mensaje || err.message}`, { id: loading });
    }
  };
 
  // ── Generar PDF ─────────────────────────────────
  const dispararPDF = () => {
    const clienteObj = clientes.find(c => c.id.toString() === clienteId);
    generarRemitoPDFPremium({
      esPresupuesto: false,
      cliente: clienteObj,
      sede: { nombreSede: 'Mostrador' },
      tecnico: 'Mostrador',
      ticketItems: [
        {
          equipoSerial: 'MOSTRADOR',
          trabajo: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`,
          repuestosUsados: productos,
          costoExtra: 0,
          totalCalculado: totalFinal,
          resumenTexto: `VENTA: ${productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}`
        }
      ],
      descuentoPorcentaje,
      totalFinal,
      fechaServicio: new Date().toISOString().split('T')[0]
    });
  };
 
  const clienteObj = clientes.find(c => c.id.toString() === clienteId);
 
  // ── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-48">
 
      <Card className="shadow-sm mb-4">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">🛒 VENTA / INSUMOS</h1>
        <p className="text-xs text-slate-400">Flujo simplificado para ventas</p>
      </Card>
 
      {/* CLIENTE */}
      <Card className="shadow-sm mb-4">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</label>
        <CreatableSelect
          styles={premiumStyles}
          options={clientes.map(c => ({ value: c.id.toString(), label: c.nombre }))}
          value={clienteObj ? { value: clienteObj.id.toString(), label: clienteObj.nombre } : null}
          onChange={s => {
            if (s?.__isNew__) {
              setNombreClientePrellenado(s.label);
              setModalClienteAbierto(true);
            } else {
              setClienteId(s?.value);
            }
          }}
          onCreateOption={inputValue => {
            setNombreClientePrellenado(inputValue);
            setModalClienteAbierto(true);
          }}
          placeholder="Buscar o crear cliente..."
        />
 
        {clienteObj && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl grid grid-cols-2 gap-2">
            {clienteObj.telefono && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Teléfono</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.telefono}</p>
              </div>
            )}
            {clienteObj.localidad && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Localidad</p>
                <p className="text-xs font-bold text-slate-700 dark:text-white">{clienteObj.localidad}</p>
              </div>
            )}
          </div>
        )}
      </Card>
 
      {clienteId && (
        <>
          {/* AGREGAR PRODUCTOS */}
          <Card className="shadow-sm mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Agregar Productos
            </label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  styles={premiumStyles}
                  options={repuestos.map(r => ({
                    ...r,
                    label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                    value: r.id
                  }))}
                  filterOption={(option, inputValue) => {
                    const val = inputValue.toLowerCase();
                    return option.data.nombre?.toLowerCase().includes(val) || option.data.sku?.toLowerCase().includes(val);
                  }}
                  formatOptionLabel={opt => (
                    <div className="flex justify-between items-center">
                      <div>
                        {opt.sku && <span className="text-[9px] font-black text-blue-400 mr-2">{opt.sku}</span>}
                        <span className="font-bold text-sm">{opt.nombre}</span>
                      </div>
                      <span className="text-emerald-500 font-black">${opt.precio}</span>
                    </div>
                  )}
                  onChange={setRepuestoElegido}
                  value={repuestoElegido}
                  placeholder="Buscar producto..."
                />
              </div>
              <button
                onClick={agregarProducto}
                className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black"
              >
                +
              </button>
            </div>
          </Card>
 
          {/* TABLA DE PRODUCTOS */}
          {productos.length > 0 && (
            <Card className="shadow-sm mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Productos Agregados
              </label>
              {productos.map((p, i) => (
                <div key={i} className="py-2 border-b border-slate-200 dark:border-slate-700 last:border-0 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</div>
                    <div className="text-[10px] text-slate-400">${p.precio} c/u</div>
                  </div>
                  <input
                    type="number"
                    value={p.cantidad}
                    min="1"
                    onChange={e => actualizarCantidad(i, e.target.value)}
                    className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black mr-3"
                  />
                  <div className="font-black text-sm w-20 text-right text-slate-900 dark:text-white">${p.subtotal.toLocaleString()}</div>
                  <button onClick={() => quitarProducto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                </div>
              ))}
            </Card>
          )}
 
          {/* DESCUENTO */}
          {productos.length > 0 && (
            <Card className="shadow-sm mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descuento (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={descuentoPorcentaje}
                  onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-24 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl"
                />
                <span className="font-black text-slate-400 text-xl">%</span>
                {descuentoPorcentaje > 0 && (
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Descuento</p>
                    <p className="text-lg font-black text-rose-500">- ${descuentoMonto.toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {[5, 10, 15, 20].map(p => (
                  <button
                    key={p}
                    onClick={() => setDescuentoPorcentaje(p)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${
                      descuentoPorcentaje === p ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
 
      {/* BARRA DE ACCIÓN FINAL */}
      {productos.length > 0 && (
        <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
          <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl">
            <div className="text-white">
              <div className="text-[9px] text-slate-400 font-black uppercase">Total Final {descuentoPorcentaje > 0 && <span className="text-rose-400">(-{descuentoPorcentaje}%)</span>}</div>
              <div className="text-3xl font-black">${totalFinal.toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={dispararPDF} className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center">📄</button>
              <button onClick={() => guardarVenta(false)} className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px]">GUARDAR</button>
              <button onClick={() => guardarVenta(true)} className="bg-emerald-500 text-white px-6 rounded-2xl font-black text-xs">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
 
      {/* MODAL CREAR CLIENTE */}
      <CrearClienteModal
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        onClienteCreado={async clienteNuevo => {
          setClientes([...clientes, clienteNuevo]);
          setClienteId(clienteNuevo.id.toString());
          setModalClienteAbierto(false);
        }}
        clienteNombrePrellenado={nombreClientePrellenado}
      />
    </div>
  );
}