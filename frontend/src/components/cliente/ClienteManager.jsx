import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useClienteData } from '../../hooks/useClienteData';
import { useEquipoActions } from '../../hooks/useEquipoActions';
import { filtrarClientesPorBusqueda } from '../../utils/clienteUtils';
import ClienteCard from './ClienteCard';
import ClienteForm from './ClienteForm';
import SedeModal from '../SedeModal';
import EquipoModal from '../EquipoModal';

export default function ClienteManager() {
    const { clientes, sedes, equipos, cargarDatos } = useClienteData();
    const { handleArchivar, handleRestaurar, handleEliminarDefinitivo } = useEquipoActions(cargarDatos);

    const [busqueda, setBusqueda]         = useState('');
    const [modalOpen, setModalOpen]       = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedEquipo, setSelectedEquipo]   = useState(null);
    const [expandedId, setExpandedId]     = useState(null);
    const [form, setForm] = useState({
        id: null, nombre: '', calle: '', numero: '', piso: '', depto: '',
        localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '',
        notas: '', condicionIva: ''
    });

    const filtrados = filtrarClientesPorBusqueda(clientes, sedes, equipos, busqueda);

    // ── Handlers cliente ──────────────────────────────────────────────────────
    const handleGuardarCliente = async (e) => {
        e.preventDefault();
        const loading = toast.loading('Guardando...');
        try {
            const payload = { ...form, clienteTipo: 'PARTICULAR' };
            if (form.id) await api.put(`/clientes/${form.id}`, payload);
            else         await api.post('/clientes', payload);
            toast.success('✅ Guardado', { id: loading });
            setModalOpen(null);
            cargarDatos();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al guardar', { id: loading });
        }
    };

    const handleEliminarCliente = async (id) => {
        if (!window.confirm('¿Eliminar cliente y todo su historial?')) return;
        try {
            await api.delete(`/clientes/${id}`);
            toast.success('Eliminado');
            cargarDatos();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const handleEditarCliente = (cliente) => {
        setForm({ ...cliente, id: cliente.id });
        setModalOpen('cliente');
    };

    const handleNuevoCliente = () => {
        setForm({
            id: null, nombre: '', calle: '', numero: '', piso: '', depto: '',
            localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '',
            notas: '', condicionIva: ''
        });
        setModalOpen('cliente');
    };

    // ── Handlers equipo / sede ────────────────────────────────────────────────
    const handleEditarEquipo = (equipo, cliente) => {
        setSelectedEquipo(equipo);
        setSelectedCliente(cliente);
        setModalOpen('equipo');
    };

    const handleAgregarSede = (cliente) => {
        setSelectedCliente(cliente);
        setModalOpen('sede');
    };

    const handleAgregarEquipo = (cliente) => {
        setSelectedCliente(cliente);
        setSelectedEquipo(null);
        setModalOpen('equipo');
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-20">

            {/* BUSCADOR */}
            <div className="sticky top-0 z-30 py-6 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl -mx-4 px-4 border-b border-slate-200 dark:border-slate-800 mb-8">
                <div className="relative max-w-3xl mx-auto">
                    <input
                        placeholder="Buscar por cliente, ciudad o S/N..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full py-4 pl-12 pr-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                </div>
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Directorio</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Gestión de Flota</p>
                </div>
                <button
                    onClick={handleNuevoCliente}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    + Nuevo
                </button>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtrados.map(cliente => (
                    <ClienteCard
                        key={cliente.id}
                        cliente={cliente}
                        sedes={sedes}
                        equipos={equipos}
                        isExpanded={expandedId === cliente.id}
                        onToggleExpand={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                        onEditCliente={handleEditarCliente}
                        onDeleteCliente={handleEliminarCliente}
                        onEditEquipo={handleEditarEquipo}
                        onArchivarEquipo={handleArchivar}
                        onRestaurarEquipo={handleRestaurar}
                        onEliminarEquipoDefinitivo={handleEliminarDefinitivo}
                        onAddSede={handleAgregarSede}
                        onAddEquipo={handleAgregarEquipo}
                    />
                ))}
            </div>

            {/* MODALES */}
            {modalOpen === 'cliente' && (
                <ClienteForm
                    form={form}
                    setForm={setForm}
                    errors={{}}
                    onSubmit={handleGuardarCliente}
                    onClose={() => setModalOpen(null)}
                />
            )}

            {modalOpen === 'sede' && selectedCliente && (
                <SedeModal
                    cliente={selectedCliente}
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)}
                    onRefresh={cargarDatos}
                    onClose={() => setModalOpen(null)}
                />
            )}

            {modalOpen === 'equipo' && selectedCliente && (
                <EquipoModal
                    cliente={selectedCliente}
                    sedes={sedes.filter(s => s.cliente?.id === selectedCliente.id)}
                    equipos={equipos.filter(eq => {
                        const ids = sedes
                            .filter(s => s.cliente?.id === selectedCliente.id)
                            .map(s => s.id);
                        return ids.includes(eq.sede?.id);
                    })}
                    equipoParaEditar={selectedEquipo}
                    onRefresh={() => { cargarDatos(); setSelectedEquipo(null); }}
                    onClose={() => { setModalOpen(null); setSelectedEquipo(null); }}
                />
            )}
        </div>
    );
}