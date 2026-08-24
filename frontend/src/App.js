import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';
import { MontosProvider } from './context/MontosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';

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
import UsuariosManager    from './components/usuarios/UsuariosManager';
import DespachoManager    from './components/ordenes/DespachoManager';
import MisOrdenes         from './components/ordenes/MisOrdenes';
import MiAgenda           from './components/ordenes/MiAgenda';
import MiSueldo           from './components/finanzas/MiSueldo';

function AppInterna() {
    const { autenticado, esAdmin, usuario } = useAuth();
    const [seccionActual, setSeccionActual] = useState(esAdmin ? 'caja' : 'mis-ordenes');
    const [clientePreload, setClientePreload] = useState(null);
    const [presupuestoOrigen, setPresupuestoOrigen] = useState(null);
    const [ordenOrigen, setOrdenOrigen] = useState(null);
    const [abrirCrear, setAbrirCrear] = useState(false);

    if (!autenticado) return <LoginPage />;

    const irASeccionConCliente = (seccion, cliente) => {
        setClientePreload(cliente);
        setSeccionActual(seccion);
    };

    const ejecutarPresupuesto = (presupuesto) => {
        setPresupuestoOrigen(presupuesto);
        setSeccionActual('servicio-tecnico');
    };

    const ejecutarOrden = (orden) => {
        setOrdenOrigen(orden);
        setSeccionActual('servicio-tecnico');
    };

    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                return <DashboardCaja setVistaActual={(seccion, opts) => {
                    if (opts?.crear) setAbrirCrear(true);
                    setSeccionActual(seccion);
                }} />;
            case 'venta':
                return <VentaManager clienteInicial={clientePreload} onClienteConsumido={() => setClientePreload(null)}
                    abrirCrearDirecto={abrirCrear} onCrearConsumido={() => setAbrirCrear(false)} />;
            case 'servicio-tecnico':
                return <ServicioManager
                    clienteInicial={clientePreload}
                    onClienteConsumido={() => setClientePreload(null)}
                    presupuestoOrigen={presupuestoOrigen}
                    onPresupuestoOrigenConsumido={() => setPresupuestoOrigen(null)}
                    ordenOrigen={ordenOrigen}
                    onOrdenOrigenConsumido={() => setOrdenOrigen(null)}
                    abrirCrearDirecto={abrirCrear}
                    onCrearConsumido={() => setAbrirCrear(false)}
                />;
            case 'historial':
                return <ServicioList />;
            case 'presupuestos':
                return <PresupuestosManager />;
            case 'clientes':
                return <ClienteManager
                    onNuevoServicio={(c) => irASeccionConCliente('servicio-tecnico', c)}
                    onNuevaVenta={(c) => irASeccionConCliente('venta', c)}
                />;
            case 'productos':
                return <GestorProductos />;
            case 'radar':
                return <RadarMantenimiento />;
            case 'finanzas':
                return <DashboardFinanzas />;
            case 'usuarios':
                return <UsuariosManager />;
            case 'despacho':
                return <DespachoManager />;
            case 'mis-ordenes':
                return <MisOrdenes tecnicoId={usuario?.id} onEjecutarOrden={ejecutarOrden} />;
            case 'mi-agenda':
                return <MiAgenda tecnicoId={usuario?.id} />;
            case 'mi-sueldo':
                return <MiSueldo />;
            default:
                return (
                    <div className="flex items-center justify-center h-64 text-muted font-black text-sm uppercase tracking-widest">
                        Sección en construcción
                    </div>
                );
        }
    };

    return (
        <MontosProvider>
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                {renderSeccion()}
            </Layout>
        </MontosProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: { fontSize: '1.1em', fontWeight: 'bold' }
                }}
            />
            <AppInterna />
        </AuthProvider>
    );
}