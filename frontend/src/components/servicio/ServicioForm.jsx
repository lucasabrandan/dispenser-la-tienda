import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useServicioForm } from '../../hooks/useServicioForm';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import CrearClienteModal from '../cliente/CrearClienteModal';
import CrearSedeModal    from '../CrearSedeModal';
import { StepHeader, buildSelectStyles } from './ServicioUI';
import PasoCliente  from './PasoCliente';
import PasoEquipos  from './PasoEquipos';
import PasoResumen  from './PasoResumen';

const TITULOS = [
    { titulo: 'Datos del cliente',     subtitulo: 'Fecha y quién trajo el equipo' },
    { titulo: 'Equipos y trabajo',     subtitulo: 'Describí qué hay que hacer' },
    { titulo: 'Resumen y cierre',      subtitulo: 'Descuento, rentabilidad y condiciones' },
];

export default function ServicioForm({ onSaved, servicioParaEditar = null, clienteInicialId = null }) {
    const hook = useServicioForm(servicioParaEditar, clienteInicialId);
    const {
        db, setDb, clienteId,
        ticketItems, idEdicion,
        itemActual, fechaServicio,
        descuentoPorcentaje, leyenda,
        modalClienteAbierto, setModalClienteAbierto,
        nombreClientePrellenado, setNombreClientePrellenado,
        modalSedeAbierto, setModalSedeAbierto,
        nombreSedePrellenado, setNombreSedePrellenado,
        finalizar, refrescarDatos, onClienteSeleccionado,
        calcularResumenGanancia, estaBloqueado,
        borradorDisponible, recuperarBorrador, descartarBorrador,
    } = hook;

    const [paso, setPaso]             = useState(0);
    const [nombreLibre, setNombreLibre] = useState('');
    hook._setNombreLibre = setNombreLibre;

    const isDark = document.documentElement.classList.contains('dark');
    const selectStyles = buildSelectStyles(isDark);
    const clienteObj   = db.clientes?.find(c => c.id?.toString() === clienteId);

    const dispararPDF = async () => {
        const sedeObj = db.sedes?.find(s => s.id === itemActual.sedeId);
        const { totalConDescuento } = calcularResumenGanancia();
        // Las fotos (File o filename) las resuelve cargarFoto dentro del generador
        try {
            await generarRemitoPDFPremium({
                esPresupuesto: true,
                cliente: clienteObj || { nombre: nombreLibre || 'Particular' },
                sede: sedeObj || { nombreSede: 'Mostrador' },
                tecnico: localStorage.getItem('tecnico_nombre') || 'Técnico', ticketItems, descuentoPorcentaje,
                totalFinal: totalConDescuento, fechaServicio, leyenda,
            });
        } catch (e) {
            console.error('Error generando PDF:', e);
            toast.error('Error al generar el PDF');
        }
    };

    // Para cliente nuevo solo mandamos el nombre — el hook resuelve la sede internamente
    const buildOverrides = () => !clienteId && nombreLibre.trim()
        ? { clienteNombre: nombreLibre.trim() }
        : {};

    const handleGuardar   = async () => { const r = await finalizar(false, buildOverrides()); if (r && onSaved) onSaved(); };
    const handleConfirmar = async () => { const r = await finalizar(true,  buildOverrides()); if (r && onSaved) onSaved(); };

    return (
        <div className="font-sans transition-colors bg-[#EDEAE6] dark:bg-[#141414]" style={{ minHeight: '100%' }}>

            {/* Banner de borrador — aparece si hay un trabajo sin guardar del día anterior */}
        {borradorDisponible && !servicioParaEditar && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-[#D48800]/10 border border-[#D48800]/30 flex items-center justify-between gap-3">
                <p className="text-[13px] font-bold text-[#D48800] dark:text-[#F0A500]">
                    💾 Tenés un trabajo sin guardar
                </p>
                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={descartarBorrador}
                        className="text-[11px] font-bold text-[#A8A29E] px-2 py-1">
                        Descartar
                    </button>
                    <button onClick={recuperarBorrador}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white bg-[#D48800] dark:bg-[#F0A500] active:scale-95">
                        Recuperar
                    </button>
                </div>
            </div>
        )}

        {estaBloqueado && (
                <div className="mx-5 mt-4 p-3 rounded-xl text-center font-bold text-[13px]"
                     style={{ background: 'var(--danger-bg)', color: 'var(--danger-tx)' }}>
                    🔒 Registro cobrado — solo lectura
                </div>
            )}

            <StepHeader paso={paso} total={3}
                titulo={TITULOS[paso].titulo}
                subtitulo={paso === 1 && ticketItems.length > 0
                    ? `${ticketItems.length} equipo${ticketItems.length > 1 ? 's' : ''} cargado${ticketItems.length > 1 ? 's' : ''}`
                    : TITULOS[paso].subtitulo}
            />

            {paso === 0 && <PasoCliente  hook={hook} onNext={() => setPaso(1)} selectStyles={selectStyles} />}
            {paso === 1 && <PasoEquipos  hook={hook} onNext={() => setPaso(2)} onBack={() => setPaso(0)} selectStyles={selectStyles} />}
            {paso === 2 && <PasoResumen  hook={hook} onBack={() => setPaso(1)} onGuardar={handleGuardar} onConfirmar={handleConfirmar} dispararPDF={dispararPDF} />}

            <CrearClienteModal isOpen={modalClienteAbierto} onClose={() => setModalClienteAbierto(false)}
                clienteNombrePrellenado={nombreClientePrellenado}
                onClienteCreado={async c => {
                    setDb({ ...db, clientes: [...db.clientes, c] });
                    onClienteSeleccionado(c.id.toString());
                    setModalClienteAbierto(false);
                    await refrescarDatos();
                }}
            />
            <CrearSedeModal isOpen={modalSedeAbierto} onClose={() => setModalSedeAbierto(false)}
                clienteId={clienteId} nombreSedePrellenado={nombreSedePrellenado}
                onSedeCreada={async s => {
                    setDb({ ...db, sedes: [...db.sedes, s] });
                    hook.setItemActual({ ...itemActual, sedeId: s.id, sedeNombre: s.nombreSede });
                    setModalSedeAbierto(false);
                    await refrescarDatos();
                }}
            />
        </div>
    );
}