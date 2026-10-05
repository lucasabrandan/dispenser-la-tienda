import React, { useState, useMemo, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useClienteData } from '../../hooks/useClienteData';
import { useEquipoActions } from '../../hooks/useEquipoActions';
import { filtrarClientesPorBusqueda } from '../../utils/clienteUtils';
import { toTitleCase } from '../../utils/titleCase';
import { LuTriangleAlert } from 'react-icons/lu';
import BusquedaBar from '../ui/BusquedaBar';
import { CONTENEDOR, PantallaHeader, BotonPrimario, Segmentado, PAGINA, BotonFlotante } from '../ui/Pantalla';
import ClienteCard        from './ClienteCard';
import ClienteRow         from './ClienteRow';
import ClienteForm        from './ClienteForm';
import CrearClienteModal  from './CrearClienteModal';
import SedeModal          from '../SedeModal';
import EquipoModal        from '../EquipoModal';
import Paginacion         from '../ui/Paginacion';
import { POR_PAGINA } from '../../utils/paginacion';



export default function ClienteManager({ onNuevoServicio, onNuevaVenta, abrirCrearDirecto = false, onCrearConsumido }) {
    const { clientes, sedes, equipos, servicios, cargarDatos } = useClienteData();
    const { handleArchivar, handleRestaurar, handleEliminarDefinitivo } = useEquipoActions(cargarDatos);

    const [busqueda, setBusqueda]               = useState('');
    const [pagina, setPagina]                   = useState(1);
    const [modalOpen, setModalOpen]             = useState(null);
    // "+ Cliente" desde el Panel: abre directo el alta
    useEffect(() => {
        if (abrirCrearDirecto) { setModalOpen('nuevo'); onCrearConsumido && onCrearConsumido(); }
    }, [abrirCrearDirecto, onCrearConsumido]);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedEquipo, setSelectedEquipo]   = useState(null);
    const [expandedId, setExpandedId]           = useState(null);
    const [confirmEliminarCliente, setConfirmEliminarCliente] = useState(null);
    const [form, setForm] = useState({
        id: null, nombre: '', calle: '', numero: '', piso: '', depto: '',
        localidad: '', provincia: 'Buenos Aires', telefono: '', cuilDni: '',
        notas: '', condicionIva: 'CONSUMIDOR_FINAL', clienteTipo: 'PARTICULAR'
    });

    // Orden: por última visita (lo más reciente arriba) o alfabético
    const [orden, setOrden] = useState('visita');
    const ultimaVisita = useMemo(() => {
        const m = {};
        servicios.forEach(s => {
            const id = s.clienteId || s.cliente?.id;
            if (id && s.fecha && (!m[id] || s.fecha > m[id])) m[id] = s.fecha;
        });
        return m;
    }, [servicios]);
    const filtrados      = filtrarClientesPorBusqueda(clientes, sedes, equipos, busqueda)
        .sort((a, b) => orden === 'visita'
            ? String(ultimaVisita[b.id] || '').localeCompare(String(ultimaVisita[a.id] || '')) || (a.nombre || '').localeCompare(b.nombre || '', 'es')
            : (a.nombre || '').localeCompare(b.nombre || '', 'es'));
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
        <div className={PAGINA}>

            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Clientes" subtitulo="Clientes, sedes y equipos"
                    busqueda={<BusquedaBar valor={busqueda} onChange={v => { setBusqueda(v); setPagina(1); }} placeholder="Cliente, sede, teléfono, S/N…" />}
                    accion={<BotonPrimario onClick={() => setModalOpen('nuevo')}>Nuevo</BotonPrimario>} />

                <div className="flex items-center justify-between gap-2">
                    <Segmentado opciones={[{ id: 'visita', label: 'Última visita' }, { id: 'az', label: 'A-Z' }]}
                        valor={orden} onChange={id => { setOrden(id); setPagina(1); }} />
                    <span className="text-caption text-muted">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</span>
                </div>


            {/* Mobile (< md): stack de tarjetas -- Opción B del rediseño */}
            <div className="md:hidden space-y-2">
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

            {/* Desktop (>= md): lista densa de filas -- Opción C del rediseño
                (Lucas, 7-sep-2026: mobile opción B + desktop opción C) */}
            <div className="hidden md:block bg-card rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden">
                <div className="flex items-center gap-3 px-3 pt-2.5 pb-2 border-b border-black/[0.07] dark:border-white/[0.07] text-label font-bold uppercase tracking-wide text-muted">
                    <span className="w-6 shrink-0" />
                    <span className="flex-[1.6]">Cliente</span>
                    <span className="flex-[0.4] text-center shrink-0">Tipo</span>
                    <span className="flex-[1.4]">Estado</span>
                    <span className="w-6 shrink-0" />
                </div>
                {clientesPagina.map(cliente => (
                    <ClienteRow
                        key={cliente.id} cliente={cliente} sedes={sedes} equipos={equipos} servicios={servicios}
                        onToggleExpand={() => setExpandedId(cliente.id)}
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
                        <div className="fixed inset-x-0 bottom-0 z-[41] max-h-[calc(var(--vh,1vh)*85)] overflow-y-auto rounded-t-3xl bg-card shadow-2xl md:inset-auto md:top-1/2 md:left-[calc(50%+var(--modal-sb,0px)/2)] md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[calc(var(--vh,1vh)*80)] md:rounded-3xl">
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

            {filtrados.length === 0 && (
                <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 space-y-4">
                    <p className="text-body text-muted">{busqueda ? 'Ningún cliente coincide con la búsqueda' : 'Todavía no hay clientes'}</p>
                    <button onClick={() => setModalOpen('nuevo')}
                        className="h-11 px-5 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95">+ Nuevo cliente</button>
                </div>
            )}

            <Paginacion pagina={paginaActual} totalPaginas={totalPaginas}
                irA={irA} next={() => irA(paginaActual + 1)} prev={() => irA(paginaActual - 1)} />
            </div>{/* cierre max-w-6xl */}

            {/* FAB "+" (celular) — mismo lugar que en Trabajos, Venta y Productos */}
            <BotonFlotante onClick={() => setModalOpen('nuevo')} label="Nuevo cliente" />

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
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
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
