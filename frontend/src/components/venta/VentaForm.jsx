import React, { useState } from 'react';
import { useVentaForm }    from '../../hooks/useVentaForm';
import { useMostrador }    from '../../hooks/useMostrador';
import { StepHeader }      from '../servicio/ServicioUI';
import CrearClienteModal   from '../cliente/CrearClienteModal';
import PasoClienteVenta    from './PasoClienteVenta';
import PasoProductosVenta  from './PasoProductosVenta';
import PasoResumenVenta    from './PasoResumenVenta';

const TITULOS = [
    { titulo: 'Datos del cliente',  subtitulo: 'Fecha y tipo de venta' },
    { titulo: 'Productos',          subtitulo: 'Agregá lo que se llevó' },
    { titulo: 'Resumen',            subtitulo: 'Descuento y confirmación' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function VentaForm({ onSaved, clienteInicialId = null }) {
    const hook      = useVentaForm(onSaved, clienteInicialId);
    const mostrador = useMostrador();
    const [paso, setPaso] = useState(0);

    const subtituloPaso1 = hook.productos.length > 0
        ? `${hook.productos.length} producto${hook.productos.length > 1 ? 's' : ''} cargado${hook.productos.length > 1 ? 's' : ''}`
        : TITULOS[1].subtitulo;

    return (
        <div className="font-sans transition-colors bg-[#FFFFFF] dark:bg-[#141414] min-h-full">

            <StepHeader
                paso={paso}
                total={3}
                titulo={TITULOS[paso].titulo}
                subtitulo={paso === 1 ? subtituloPaso1 : TITULOS[paso].subtitulo}
            />

            {paso === 0 && (
                <PasoClienteVenta
                    hook={hook}
                    mostrador={mostrador}
                    onNext={() => setPaso(1)}
                />
            )}
            {paso === 1 && (
                <PasoProductosVenta
                    hook={hook}
                    onNext={() => setPaso(2)}
                    onBack={() => setPaso(0)}
                />
            )}
            {paso === 2 && (
                <PasoResumenVenta
                    hook={hook}
                    mostrador={mostrador}
                    onBack={() => setPaso(1)}
                />
            )}

            <CrearClienteModal
                isOpen={hook.modalClienteAbierto}
                onClose={() => hook.setModalClienteAbierto(false)}
                onClienteCreado={hook.onClienteNuevo}
                clienteNombrePrellenado={hook.nombreClientePrellenado}
            />
        </div>
    );
}
