import React, { useState, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useClienteData } from '../../hooks/useClienteData';
import { useEquipoActions } from '../../hooks/useEquipoActions';
import { filtrarClientesPorBusqueda } from '../../utils/clienteUtils';
import { toTitleCase } from '../../utils/titleCase';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
import ClienteCard        from './ClienteCard';
import ClienteForm        from './ClienteForm';
import CrearClienteModal  from './CrearClienteModal';
import SedeModal          from '../SedeModal';
import EquipoModal        from '../EquipoModal';
import Paginacion         from '../ui/Paginacion';

const POR_PAGINA = 18;


export default function ClienteManager({ onNuevoServicio, onNuevaVenta }) {
    const { clientes, sedes, equipos, servicios, cargarDatos } = useClienteData();
    const { handleArchivar, handleRestaurar, handleEliminarDefinitivo } = useEquipoActions(cargarDatos);

    const [busqueda, setBusqueda]               = useState('');
    const [pagina, setPagina]                   = useState(1);
    const [modalOpen, setModalOpen]             = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedEquipo, setSelectedEquipo]   = useState(null);
    const [expandedId, setExpandedId]           = useState(null);
    const [confirmEliminarCliente, setConfirmEliminarCliente] = useState(null);
    const [form, setForm] = useState({
        id: null, nombre: '', calle: '', numero: '', piso: '', depto: '',
        localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '',
        notas: '', condicionIva: 'CONSUMIDOR_FINAL', clienteTipo: 'PARTICULAR'
    });

    const filtrados      = filtrarClientesPorBusqueda(clientes, sedes, equipos, busqueda)
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
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
                nombre:   toTitleCase(form.nombre),
                clienteTipo:  form.clienteTipo  || 'PARTICULAR',
                condicionIva: form.condicionIva || 'CONSUMIDOR_FINAL',
                calle:    toTitleCase(form.calle) || 'Sin dirección',
                numero:   form.numero?.trim()   || '0',
                localidad: toTitleCase(form.localidad) || 'Sin localidad',
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
        <div className="min-h-screen pb-20 bg-page transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-30 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">
                        Clientes
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input placeholder="Cliente, sede, teléfono, S/N..."
                                value={busqueda}
                                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-card text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] focus:border-[#D13A28] dark:focus:border-[#E8422F]" />
                        </div>
                        <button onClick={() => setModalOpen('nuevo')}
                            className="h-9 px-4 rounded-lg font-bold text-label text-white uppercase transition-all active:scale-95 bg-brand-red shrink-0">
                            + Nuevo
                        </button>
                    </div>
                    <span className="text-label font-bold text-muted">
                        {filtrados.length} clientes · A-Z
                    </span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">

            {/* Lista mobile (1 col) / Grid desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {clientesPagina.map(cliente => (
                    <ClienteCard
                        key={cliente.id} cliente={cliente} sedes={sedes} equipos={equipos} servicios={servicios}
                        isExpanded={false}
                        onToggleExpand={() => setExpandedId(cliente.id)}
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

            {/* Panel overlay del cliente expandido */}
            {expandedId && (() => {
                const cliente = clientes.find(c => c.id === expandedId);
                if (!cliente) return null;
                return (
                    <>
                        <div className="fixed inset-0 bg-black/50 z-[40]" onClick={() => setExpandedId(null)} />
                        <div className="fixed inset-x-0 bottom-0 z-[41] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] md:rounded-3xl">
                            <div className="sticky top-0 z-10 bg-card px-5 pt-4 pb-3 border-b border-black/[0.07] dark:border-white/[0.07]">
                                <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-chip md:hidden" />
                                <div className="flex items-center justify-between">
                                    <h3 className="text-title font-black text-ink">{cliente.nombre}</h3>
                                    <button onClick={() => setExpandedId(null)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">✕</button>
                                </div>
                            </div>
                            <div className="p-5">
                                <ClienteCard
                                    cliente={cliente} sedes={sedes} equipos={equipos} servicios={servicios}
                                    isExpanded={true}
                                    onToggleExpand={() => setExpandedId(null)}
                                    onEditCliente={(c) => { setExpandedId(null); setForm({ ...c, id: c.id }); setModalOpen('editar'); }}
                                    onDeleteCliente={(id) => { setExpandedId(null); handleEliminarCliente(id); }}
                                    onEditEquipo={(eq, c) => { setExpandedId(null); setSelectedEquipo(eq); setSelectedCliente(c); setModalOpen('equipo'); }}
                                    onArchivarEquipo={handleArchivar}
                                    onRestaurarEquipo={handleRestaurar}
                                    onEliminarEquipoDefinitivo={handleEliminarDefinitivo}
                                    onAddSede={(c) => { setExpandedId(null); setSelectedCliente(c); setModalOpen('sede'); }}
                                    onAddEquipo={(c) => { setExpandedId(null); setSelectedCliente(c); setSelectedEquipo(null); setModalOpen('equipo'); }}
                                    onNuevoServicio={onNuevoServicio}
                                    onNuevaVenta={onNuevaVenta}
                                    enModal={true}
                                />
                            </div>
                        </div>
                    </>
                );
            })()}

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
                        <div className="bg-card rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-5">
                                <p className="mb-2 flex justify-center"><LuTriangleAlert size={32} /></p>
                                <h3 className="text-title font-black text-ink uppercase">Eliminar cliente</h3>
                            </div>
                            <p className="text-caption text-secondary text-center mb-5 leading-snug">
                                Se eliminará el cliente y todo su historial. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminarCliente(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={confirmarEliminarCliente}
                                    className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95">
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
