import React, { useState } from 'react';
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
        <div className="min-h-screen pb-28 bg-page">
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-chip">
                    {SECCIONES.map(s => (
                        <button key={s.id} onClick={() => setSec(s.id)}
                            className={`h-10 rounded-xl text-label font-black uppercase tracking-wide transition-all ${sec === s.id ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
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
