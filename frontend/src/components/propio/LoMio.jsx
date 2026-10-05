import React, { useState } from 'react';
import { CONTENEDOR, PantallaHeader, Pestanas, PAGINA } from '../ui/Pantalla';
import MiAgenda from '../ordenes/MiAgenda';
import MisClientes from './MisClientes';
import MisDiasOcupados from './MisDiasOcupados';
import { useAuth } from '../../context/AuthContext';

// "Lo mío" (5-oct-2026): lo personal del técnico/socio. Agenda (calendario +
// notas propias) y su libreta de clientes privados.
const SECCIONES = [
    { id: 'agenda',   label: 'Agenda' },
    { id: 'clientes', label: 'Mis clientes' },
];

export default function LoMio() {
    const { usuario } = useAuth();
    const [sec, setSec] = useState('agenda');
    return (
        <div className={PAGINA}>
            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Lo mío" subtitulo="Tu agenda, tus días ocupados y tus clientes" />
                <Pestanas items={SECCIONES} activo={sec} onChange={setSec} />
                {sec === 'agenda' ? (
                    <>
                        <MisDiasOcupados />
                        <MiAgenda tecnicoId={usuario?.id} embebido />
                    </>
                ) : <MisClientes />}
            </div>
        </div>
    );
}
