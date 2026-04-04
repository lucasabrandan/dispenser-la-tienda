import React, { useState, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useClienteData } from '../../hooks/useClienteData';
import { useEquipoActions } from '../../hooks/useEquipoActions';
import { filtrarClientesPorBusqueda, aplicarFiltroChip } from '../../utils/clienteUtils';
import ClienteCard        from './ClienteCard';
import ClienteForm        from './ClienteForm';
import CrearClienteModal  from './CrearClienteModal';
import SedeModal          from '../SedeModal';
import EquipoModal        from '../EquipoModal';
import Paginacion         from '../ui/Paginacion';

const POR_PAGINA = 10;

const CHIPS = [
    { id: null,             label: 'Todos' },
    { id: 'sin-servicio',  label: '⚠️ +90d sin servicio' },
    { id: 'empresa',       label: '🏢 Empresa' },
    { id: 'con-archivados', label: '📦 Con archivados' },
];

export default function ClienteManager({ onNuevoServicio, onNuevaVenta }) {
    const { clientes, sedes, equipos, servicios, cargarDatos } = useClienteData();
    const { handleArchivar, handleRestaurar, handleEliminarDefinitivo } = useEquipoActions(cargarDatos);

    const [busqueda, setBusqueda]               = useState('');
    const [pagina, setPagina]                   = useState(1);
    const [modalOpen, setModalOpen]             = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedEquipo, setSelectedEquipo]   = useState(null);
    const [expandedId, setExpandedId]           = useState(null);
    const [filtroChip, setFiltroChip]           = useState(null);
    const [form, setForm] = useState({
        id: null, nombre: '', calle: '', numero: '', piso: '', depto: '',
        localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '',
        notas: '', condicionIva: 'CONSUMIDOR_FINAL', clienteTipo: 'PARTICULAR'
    });

    const filtrados      = aplicarFiltroChip(
        filtrarClientesPorBusqueda(clientes, sedes, equipos, busqueda),
        sedes, equipos, servicios, filtroChip
    );
    const totalPaginas   = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const paginaActual   = Math.min(pagina, totalPaginas);
    const clientesPagina = useMemo(() =>
        filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
        [filtrados, paginaActual]
    );

    const irA = (n) => setPagina(Math.max(1, Math.min(n, totalPaginas)));

    const handleGuardarCliente = async (e) => {
        e.preventDefault();
        const loading = toast.loading('Guardando...');
        try {
            await api.put(`/clientes/${form.id}`, {
                ...form,
                clienteTipo:  form.clienteTipo  || 'PARTICULAR',
                condicionIva: form.condicionIva || 'CONSUMIDOR_FINAL',
                calle:    form.calle?.trim()    || 'Sin dirección',
                numero:   form.numero?.trim()   || '0',
                localidad: form.localidad?.trim() || 'Sin localidad',
                provincia: form.provincia?.trim() || 'Buenos Aires',
            });
            toast.success('Cliente actualizado', { id: loading });
            setModalOpen(null);
            cargarDatos();
        } catch (err) {
            toast.error(err.response?.data?.mensaje || 'Error al guardar', { id: loading });
        }
    };

    const handleEliminarCliente = async (id) => {
        if (!window.confirm('¿Eliminar cliente y todo su historial?')) return;
        try {
            await api.delete(`/clientes/${id}`);
            toast.success('Eliminado');
            cargarDatos();
        } catch { toast.error('Error al eliminar'); }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-20 bg-[#C8C4BE] dark:bg-[#141414] min-h-screen transition-colors">

            {/* BUSCADOR sticky */}
            <div className="sticky top-0 z-30 py-5 bg-[#C8C4BE]/90 dark:bg-[#141414]/90 backdrop-blur-xl -mx-4 px-4 border-b border-black/[0.07] dark:border-white/[0.07] mb-6">
                <div className="relative max-w-3xl mx-auto">
                    <input
                        placeholder="Buscar por cliente, ciudad o S/N..."
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                        className="
                            w-full py-3.5 pl-11 pr-5
                            bg-[#EDEAE6] dark:bg-[#242424]
                            rounded-2xl border border-black/[0.07] dark:border-white/[0.07]
                            outline-none focus:border-[#D13A28] dark:focus:border-[#E8422F]
                            focus:ring-2 focus:ring-[#D13A28]/20
                            font-bold text-[13px] text-[#1C1917] dark:text-[#F0EEE9]
                            placeholder-[#A8A29E] transition-all
                        "
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E]">🔍</span>
                </div>
                {/* Chips filtro rápido */}
                <div className="flex gap-2 overflow-x-auto mt-3 pb-0.5 no-scrollbar">
                    {CHIPS.map(chip => (
                        <button
                            key={chip.id ?? 'todos'}
                            onClick={() => { setFiltroChip(chip.id); setPagina(1); }}
                            className={`shrink-0 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 ${
                                filtroChip === chip.id
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                    : 'bg-[#EDEAE6] dark:bg-[#242424] text-[#57534E] dark:text-[#A8A29E]'
                            }`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
                <p className="text-center text-[10px] font-black text-[#A8A29E] uppercase mt-2.5">
                    {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''} · pág {paginaActual}/{totalPaginas}
                </p>
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-4xl font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-tighter leading-none">
                        Directorio
                    </h2>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.3em] mt-1">
                        Gestión de Flota
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen('nuevo')}
                    className="bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                >
                    + Nuevo
                </button>
            </div>

            <Paginacion pagina={paginaActual} totalPaginas={totalPaginas}
                irA={irA} next={() => irA(paginaActual + 1)} prev={() => irA(paginaActual - 1)} />

            {/* LISTA / GRID */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {clientesPagina.map(cliente => (
                    <ClienteCard
                        key={cliente.id} cliente={cliente} sedes={sedes} equipos={equipos} servicios={servicios}
                        isExpanded={expandedId === cliente.id}
                        onToggleExpand={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                        onEditCliente={(c) => { setForm({ ...c, id: c.id }); setModalOpen('editar'); }}
                        onDeleteCliente={handleEliminarCliente}
                        onEditEquipo={(eq, c) => { setSelectedEquipo(eq); setSelectedCliente(c); setModalOpen('equipo'); }}
                        onArchivarEquipo={handleArchivar}
                        onRestaurarEquipo={handleRestaurar}
                        onEliminarEquipoDefinitivo={handleEliminarDefinitivo}
                        onAddSede={(c) => { setSelectedCliente(c); setModalOpen('sede'); }}
                        onAddEquipo={(c) => { setSelectedCliente(c); setSelectedEquipo(null); setModalOpen('equipo'); }}
                        onNuevoServicio={onNuevoServicio}
                        onNuevaVenta={onNuevaVenta}
                    />
                ))}
            </div>

            <Paginacion pagina={paginaActual} totalPaginas={totalPaginas}
                irA={irA} next={() => irA(paginaActual + 1)} prev={() => irA(paginaActual - 1)} />

            {/* MODALES */}
            <CrearClienteModal isOpen={modalOpen === 'nuevo'} onClose={() => setModalOpen(null)}
                onClienteCreado={() => { setModalOpen(null); cargarDatos(); }} />

            {modalOpen === 'editar' && (
                <ClienteForm form={form} setForm={setForm} errors={{}}
                    onSubmit={handleGuardarCliente} onClose={() => setModalOpen(null)} />
            )}

            {modalOpen === 'sede' && selectedCliente && (
                <SedeModal cliente={selectedCliente}
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)}
                    onRefresh={cargarDatos} onClose={() => setModalOpen(null)} />
            )}

            {modalOpen === 'equipo' && selectedCliente && (
                <EquipoModal cliente={selectedCliente}
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)}
                    equipos={equipos.filter(eq => {
                        const ids = sedes.filter(s => s.cliente?.id === selectedCliente.id).map(s => s.id);
                        return ids.includes(eq.sede?.id);
                    })}
                    equipoParaEditar={selectedEquipo}
                    onRefresh={() => { cargarDatos(); setSelectedEquipo(null); }}
                    onClose={() => { setModalOpen(null); setSelectedEquipo(null); }} />
            )}
        </div>
    );
}
