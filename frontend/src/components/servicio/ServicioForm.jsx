import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fotoUrlABase64 } from '../../utils/construirUrlFoto';
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
    } = hook;

    const [paso, setPaso]             = useState(0);
    const [nombreLibre, setNombreLibre] = useState('');
    hook._setNombreLibre = setNombreLibre;

    const isDark = document.documentElement.classList.contains('dark');
    const selectStyles = buildSelectStyles(isDark);
    const clienteObj   = db.clientes?.find(c => c.id?.toString() === clienteId);

    // Convierte un File a base64 data URL
    const fileToBase64 = (file) => new Promise((resolve) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result);
        reader.onerror = ()  => resolve(null);
        reader.readAsDataURL(file);
    });

    const dispararPDF = async () => {
        const sedeObj = db.sedes?.find(s => s.id === itemActual.sedeId);
        const { totalConDescuento } = calcularResumenGanancia();

        // DEBUG — ver qué hay en ticketItems antes de convertir
        console.log('[PDF] ticketItems:', ticketItems.map(it => ({
            serial: it.equipoSerial,
            fotoAntes: it.fotoAntes,
            fotoAntesType: it.fotoAntes ? (it.fotoAntes instanceof File ? 'File' : typeof it.fotoAntes) : 'null',
            fotoDespues: it.fotoDespues,
            fotoDespuesType: it.fotoDespues ? (it.fotoDespues instanceof File ? 'File' : typeof it.fotoDespues) : 'null',
        })));

        // Convertir fotos a base64: File (nueva) o string filename (editando)
        const resolverFoto = async (foto) => {
            if (!foto) return null;
            if (foto instanceof File) {
                const b64 = await fileToBase64(foto);
                console.log('[PDF] fileToBase64 result length:', b64?.length, 'starts:', b64?.substring(0, 30));
                return b64;
            }
            const b64 = await fotoUrlABase64(foto);
            console.log('[PDF] fotoUrlABase64 result length:', b64?.length, 'starts:', b64?.substring(0, 30));
            return b64;
        };
        const itemsConFotos = await Promise.all(
            ticketItems.map(async it => ({
                ...it,
                fotoAntesB64:   await resolverFoto(it.fotoAntes),
                fotoDespuesB64: await resolverFoto(it.fotoDespues),
            }))
        );

        console.log('[PDF] itemsConFotos[0]?.fotoAntesB64 length:', itemsConFotos[0]?.fotoAntesB64?.length);

        try {
            await generarRemitoPDFPremium({
                esPresupuesto: true,
                cliente: clienteObj || { nombre: nombreLibre || 'Particular' },
                sede: sedeObj || { nombreSede: 'Mostrador' },
                tecnico: 'Marcos', ticketItems: itemsConFotos, descuentoPorcentaje,
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