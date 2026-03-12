import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
 
/**
 * DashboardInicio - Dashboard principal para el admin
 * - Métricas del día
 * - Accesos rápidos
 * - Alertas
 * - Últimos registros
 */
export default function DashboardInicio({ onNavigateTo }) {
  const [metricas, setMetricas] = useState({
    ventasHoy: 0,
    serviciosHoy: 0,
    presupuestosPendientes: 0,
    totalVentasHoy: 0,
    ultimosRegistros: [],
    alertas: []
  });
  const [cargando, setCargando] = useState(false);
 
  // ── Cargar métricas ─────────────────────────────────
  const cargarMetricas = async () => {
    setCargando(true);
    try {
      const res = await api.get('/servicios?page=0&size=1000');
      const servicios = res.data.content || res.data;
 
      // Hoy en fecha
      const hoy = new Date().toISOString().split('T')[0];
      const serviciosHoy = servicios.filter(s => s.fecha === hoy);
 
      // Separar por tipo y estado
      const ventas = serviciosHoy.filter(s => s.servicioTipo === 'VENTA');
      const serviciosTec = serviciosHoy.filter(s => s.servicioTipo === 'TECNICA');
      const pendientes = servicios.filter(s => s.estado === 'PRESUPUESTO');
      
      // Calcular total de ventas hoy (sumando items: costo + costoExtra - descuento)
      const totalVentasHoy = ventas.reduce((acc, v) => {
        const itemTotal = (v.items || []).reduce((itemAcc, item) => {
          return itemAcc + (item.costo + item.costoExtra - item.descuento);
        }, 0);
        return acc + itemTotal;
      }, 0);
 
      // Últimos 5 registros
      const ultimos = servicios.slice(0, 5);
 
      // Alertas: presupuestos sin confirmar
      const alertas = [
        {
          tipo: 'Presupuestos sin confirmar',
          count: pendientes.length,
          urgencia: pendientes.length > 3 ? 'alta' : 'normal'
        }
      ];
 
      // Garantías próximas a vencer (próximos 7 días)
      const hoy_date = new Date();
      const proximos7 = new Date(hoy_date.getTime() + 7 * 24 * 60 * 60 * 1000);
      const garantiasProximas = servicios.filter(s => {
        const items = s.items || [];
        return items.some(item => {
          if (!item.garantiaHasta) return false;
          const fechaGarantia = new Date(item.garantiaHasta);
          return fechaGarantia >= hoy_date && fechaGarantia <= proximos7;
        });
      });
 
      if (garantiasProximas.length > 0) {
        alertas.push({
          tipo: 'Garantías próximas a vencer',
          count: garantiasProximas.length,
          urgencia: 'media'
        });
      }
 
      setMetricas({
        ventasHoy: ventas.length,
        serviciosHoy: serviciosTec.length,
        presupuestosPendientes: pendientes.length,
        totalVentasHoy,
        ultimosRegistros: ultimos,
        alertas
      });
 
      setCargando(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar métricas');
      setCargando(false);
    }
  };
 
  // ── Cargar al montar ────────────────────────────────
  useEffect(() => {
    cargarMetricas();
  }, []);
 
  // ── Componente MetricaCard ──────────────────────────
  const MetricaCard = ({ label, valor, color, icono }) => (
    <div className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{valor}</p>
        </div>
        <div className="text-4xl opacity-20">{icono}</div>
      </div>
    </div>
  );
 
  // ── Componente BotónGrande ─────────────────────────
  const BotónGrande = ({ icono, label, descripcion, onClick, color }) => (
    <button
      onClick={onClick}
      className={`p-6 rounded-2xl border-2 border-${color}-200 dark:border-${color}-800 bg-${color}-50 dark:bg-${color}-900/20 hover:bg-${color}-100 dark:hover:bg-${color}-900/40 transition-all active:scale-95 text-left`}
    >
      <div className="text-4xl mb-2">{icono}</div>
      <div className="text-base font-black text-slate-900 dark:text-white">{label}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{descripcion}</div>
    </button>
  );
 
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-24">
      <div className="max-w-6xl mx-auto">
 
        {/* HEADER CON BOTÓN ACTUALIZAR */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">📊 Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Bienvenido, Admin</p>
          </div>
          <button
            onClick={cargarMetricas}
            disabled={cargando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={`text-lg ${cargando ? 'animate-spin' : ''}`}>🔄</span>
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
 
        {/* MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricaCard label="Ventas Hoy" valor={metricas.ventasHoy} color="green" icono="🛒" />
          <MetricaCard label="Servicios Hoy" valor={metricas.serviciosHoy} color="blue" icono="🔧" />
          <MetricaCard label="Presupuestos Pendientes" valor={metricas.presupuestosPendientes} color="yellow" icono="✏️" />
        </div>
 
        {/* TOTAL VENTAS HOY */}
        {metricas.totalVentasHoy > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide">Total Ventas Hoy</p>
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">${metricas.totalVentasHoy.toLocaleString()}</p>
              </div>
              <div className="text-6xl opacity-30">💰</div>
            </div>
          </Card>
        )}
 
        {/* ACCIONES RÁPIDAS - BOTONES GRANDES */}
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">🎯 Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <BotónGrande
            icono="🛒"
            label="VENTA / INSUMOS"
            descripcion="Registrar una nueva venta"
            color="green"
            onClick={() => onNavigateTo('venta')}
          />
          <BotónGrande
            icono="🔧"
            label="SERVICIO TÉCNICO"
            descripcion="Registrar un servicio"
            color="blue"
            onClick={() => onNavigateTo('servicio-tecnico')}
          />
          <BotónGrande
            icono="✏️"
            label="PRESUPUESTOS PENDIENTES"
            descripcion={`${metricas.presupuestosPendientes} para confirmar`}
            color="yellow"
            onClick={() => onNavigateTo('presupuestos-pendientes')}
          />
          <BotónGrande
            icono="📋"
            label="HISTORIAL"
            descripcion="Ver todos los registros"
            color="slate"
            onClick={() => onNavigateTo('historial')}
          />
        </div>
 
        {/* ALERTAS */}
        {metricas.alertas.length > 0 && (
          <>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">⚠️ Alertas</h2>
            <Card className="mb-6 border-l-4 border-yellow-500">
              <div className="space-y-3">
                {metricas.alertas.map((alerta, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{alerta.tipo}</p>
                      <p className="text-xs text-slate-400">
                        {alerta.urgencia === 'alta' && '🔴 URGENTE'}
                        {alerta.urgencia === 'media' && '🟡 IMPORTANTE'}
                        {alerta.urgencia === 'normal' && '🔵 NORMAL'}
                      </p>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{alerta.count}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
 
        {/* ÚLTIMOS REGISTROS */}
        {metricas.ultimosRegistros.length > 0 && (
          <>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">📝 Últimos Registros</h2>
            <Card>
              <div className="space-y-3">
                {metricas.ultimosRegistros.map((reg, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black px-2 py-1 rounded ${
                          reg.servicioTipo === 'VENTA'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {reg.servicioTipo === 'VENTA' ? 'VENTA' : 'SERVICIO'}
                        </span>
                        <span className={`text-xs font-black px-2 py-1 rounded ${
                          reg.estado === 'PRESUPUESTO'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {reg.estado === 'PRESUPUESTO' ? 'PENDIENTE' : 'REALIZADO'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{reg.clienteNombre}</p>
                      <p className="text-xs text-slate-400">{reg.fecha}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        ${(() => {
                          const itemTotal = (reg.items || []).reduce((acc, item) => 
                            acc + (item.costo + item.costoExtra - item.descuento), 0
                          );
                          return itemTotal.toLocaleString();
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}