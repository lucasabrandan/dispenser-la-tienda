import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { CONTENEDOR, PAGINA, PantallaHeader, Pestanas } from '../ui/Pantalla';
import BusquedaBar from '../ui/BusquedaBar';
import { TarjetaPedido } from './PortalEmpresa';
import PedidoDetalle from './PedidoDetalle';
import AgendarPedidoSheet from './AgendarPedidoSheet';

// Bandeja de pedidos de empresas (admin, 7-oct-2026). Acá llega lo que antes
// había que ir a mirar a Trello: se agenda con un toque y se conversa en el pedido.
const PARA_AGENDAR = ['NUEVO', 'NO_ATENDIDO', 'PAUSADO'];
const EN_CURSO = ['AGENDADO', 'EN_CAMINO', 'EN_CURSO'];

export default function PedidosEmpresaManager() {
    const [pedidos, setPedidos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('agendar');
    const [busqueda, setBusqueda] = useState('');
    const [abierto, setAbierto] = useState(null);
    const [agendar, setAgendar] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const r = await api.get('/pedidos-empresa');
            setPedidos(Array.isArray(r.data) ? r.data : []);
        } catch { /* */ } finally { setCargando(false); }
    }, []);

    const abrirId = useCallback(async (id) => {
        try { const r = await api.get(`/pedidos-empresa/${id}`); setAbierto(r.data); } catch { toast.error('No se encontró el pedido'); }
    }, []);

    useEffect(() => {
        cargar();
        api.get('/ordenes/tecnicos').then(r => setTecnicos(r.data || [])).catch(() => {});
        const id = setInterval(cargar, 30000);
        // Abierto desde una notificación (ver Layout.jsx)
        const pend = sessionStorage.getItem('abrirPedido');
        if (pend) { sessionStorage.removeItem('abrirPedido'); abrirId(pend); }
        const onAbrir = (e) => { try { sessionStorage.removeItem('abrirPedido'); } catch { /* */ } abrirId(e.detail); };
        window.addEventListener('abrir-pedido', onAbrir);
        return () => { clearInterval(id); window.removeEventListener('abrir-pedido', onAbrir); };
    }, [cargar, abrirId]);

    const filtrados = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        if (!t) return pedidos;
        return pedidos.filter(p => [p.clienteNombre, p.lugar, p.direccion, p.equipoSerie, p.motivo, p.detalle, `#${p.id}`]
            .filter(Boolean).join(' ').toLowerCase().includes(t));
    }, [pedidos, busqueda]);

    const grupos = useMemo(() => ({
        agendar: filtrados.filter(p => PARA_AGENDAR.includes(p.estado)).sort((a, b) => (b.urgente - a.urgente) || String(a.creadoEn).localeCompare(String(b.creadoEn))),
        curso: filtrados.filter(p => EN_CURSO.includes(p.estado)),
        hechos: filtrados.filter(p => p.estado === 'HECHO'),
        cancelados: filtrados.filter(p => p.estado === 'CANCELADO'),
    }), [filtrados]);
    const lista = grupos[tab] || [];

    return (
        <div className={PAGINA}>
            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Pedidos" subtitulo="Lo que cargan las empresas desde su portal"
                    busqueda={<BusquedaBar valor={busqueda} onChange={setBusqueda} placeholder="Empresa, dirección, N/S, #pedido…" />} />

                <Pestanas activo={tab} onChange={setTab} items={[
                    { id: 'agendar', label: 'Para agendar', count: grupos.agendar.length, color: grupos.agendar.length ? '#C9341F' : undefined },
                    { id: 'curso', label: 'Agendados', count: grupos.curso.length },
                    { id: 'hechos', label: 'Hechos', count: grupos.hechos.length },
                    { id: 'cancelados', label: 'Cancelados', count: grupos.cancelados.length },
                ]} />

                {cargando ? (
                    <p className="py-16 text-center text-muted text-body">Cargando…</p>
                ) : lista.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-body-lg font-black text-ink">{tab === 'agendar' ? 'No hay pedidos para agendar' : 'Nada por acá'}</p>
                        {tab === 'agendar' && pedidos.length === 0 && (
                            <p className="text-body text-muted max-w-md mx-auto">Creá un usuario de tipo “Empresa” en Usuarios y pasale el acceso: los pedidos que cargue aparecen acá y te llega el aviso.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-2.5 md:grid-cols-2">
                        {lista.map(p => <TarjetaPedido key={p.id} p={p} mostrarCliente onClick={() => setAbierto(p)} />)}
                    </div>
                )}
            </div>

            {abierto && <PedidoDetalle key={abierto.id} pedido={abierto} modo="admin" onCerrar={() => { setAbierto(null); cargar(); }} onCambio={cargar}
                onAgendar={(p) => setAgendar(p)} />}
            {agendar && <AgendarPedidoSheet pedido={agendar} tecnicos={tecnicos} onCerrar={() => setAgendar(null)}
                onAgendado={(p) => { setAgendar(null); setAbierto(null); setTab('curso'); cargar(); setAbierto(p); }} />}
        </div>
    );
}
