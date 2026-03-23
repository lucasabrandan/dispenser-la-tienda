import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';

// Caja
import DashboardCaja from './components/DashboardCaja';
// Operaciones
import ServicioManager     from './components/servicio/ServicioManager';
import ServicioList        from './components/servicio/ServicioList';
import VentaManager        from './components/venta/VentaManager';
import PresupuestosManager from './components/PresupuestosManager';

// Admin
import ClienteManager     from './components/cliente/ClienteManager';
import GestorProductos    from './components/productos/GestorProductos';
import RadarMantenimiento from './components/RadarMantenimiento';
import DashboardFinanzas  from './components/finanzas/DashboardFinanzas';

export default function App() {
    const [seccionActual, setSeccionActual] = useState('caja');

    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                return <DashboardCaja setVistaActual={setSeccionActual} />;
            case 'venta':
                return <VentaManager />;
            case 'servicio-tecnico':
                return <ServicioManager />;
            case 'historial':
                return <ServicioList />;
            case 'presupuestos':
                return <PresupuestosManager />;
            case 'clientes':
                return <ClienteManager />;
            case 'productos':
                return <GestorProductos />;
            case 'radar':
                return <RadarMantenimiento />;
            case 'finanzas':
                return <DashboardFinanzas />;
            default:
                return (
                    <div className="flex items-center justify-center h-64 text-slate-400 font-black text-sm uppercase tracking-widest">
                        Sección en construcción
                    </div>
                );
        }
    };

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{ duration: 3000, style: { fontSize: '1.1em', fontWeight: 'bold' } }}
            />
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                <div className="max-w-5xl mx-auto">
                    {renderSeccion()}
                </div>
            </Layout>
        </>
    );
}