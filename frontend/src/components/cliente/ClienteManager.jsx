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

const POR_PAGINA = 18;

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
    const [confirmEliminarCliente, setConfirmEliminarCliente] = useState(null); // id del cliente a eliminar
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

    const handleEliminarCliente = (id) => setConfirmEliminarCliente(id);

    const confirmarEliminarCliente = async () => {
        const id = confirmEliminarCliente;
        setConfirmEliminarCliente(null);
        try {
            await api.delete(`/clientes/${id}`);
            toast.success('Eliminado');
            cargarDatos();
        } catch { toast.error('Error al eliminar'); }
    };

    return (
        <div className="min-h-screen pb-20 bg-[#F5F3F1] dark:bg-[#141414] transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-30 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">
                        Clientes
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input placeholder="Cliente, sede, teléfono, S/N..."
                                value={busqueda}
                                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] focus:border-[#D13A28] dark:focus:border-[#E8422F]" />
                        </div>
                        <button onClick={() => setModalOpen('nuevo')}
                            className="h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] shrink-0">
                            + Nuevo
                        </button>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                        {CHIPS.map(chip => (
                            <button key={chip.id ?? 'todos'}
                                onClick={() => { setFiltroChip(chip.id); setPagina(1); setExpandedId(null); }}
                                className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${
                                    filtroChip === chip.id
                                        ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                        : 'bg-white dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
                                }`}>
                                {chip.label}
                            </button>
                        ))}
                        <span className="ml-auto text-[10px] font-bold text-[#A8A29E] self-center shrink-0">
                            {filtrados.length} · pág {paginaActual}/{totalPaginas}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">

            {/* LISTA / GRID */}
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
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
            </div>{/* cierre max-w-6xl */}

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
                        return ids.includes(eq.sedeId);
                    })}
                    equipoParaEditar={selectedEquipo}
                    onRefresh={() => { cargarDatos(); setSelectedEquipo(null); }}
                    onClose={() => { setModalOpen(null); setSelectedEquipo(null); }} />
            )}

            {/* Modal confirmación eliminar cliente */}
            {confirmEliminarCliente && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-5">
                                <p className="text-[36px] mb-2">⚠️</p>
                                <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Eliminar cliente</h3>
                            </div>
                            <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] text-center mb-5 leading-snug">
                                Se eliminará el cliente y todo su historial. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminarCliente(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={confirmarEliminarCliente}
                                    className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
