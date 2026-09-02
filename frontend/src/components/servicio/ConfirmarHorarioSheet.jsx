import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { DIAS_SEMANA, FRANJAS } from './SelectorVentanas';

// El técnico asignado a un servicio con fecha tentativa confirma acá el día
// y horario exacto, eligiendo solo entre lo que el admin habilitó
// (servicio.ventanasDisponibles). En vez de un date picker libre (donde
// tendría que adivinar cuál es "el próximo miércoles"), se ofrecen fechas
// concretas ya calculadas para cada día habilitado.

const NOMBRE_DIA_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// Próximas N ocurrencias de un día de semana dado (ej. próximos 4 miércoles),
// como { fecha: 'yyyy-MM-dd', label: 'Mié 10/9' } — siempre a partir de mañana,
// nunca hoy (fecha tentativa implica que todavía no se coordinó, no tiene
// sentido ofrecer "hoy mismo").
function proximasFechas(diaId, cantidad = 4) {
    const idxObjetivo = NOMBRE_DIA_JS.indexOf(diaId);
    if (idxObjetivo === -1) return [];
    const resultado = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() + 1);
    while (resultado.length < cantidad) {
        if (cursor.getDay() === idxObjetivo) {
            const yyyy = cursor.getFullYear();
            const mm = String(cursor.getMonth() + 1).padStart(2, '0');
            const dd = String(cursor.getDate()).padStart(2, '0');
            const label = cursor.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' })
                .replace('.', '');
            resultado.push({ fecha: `${yyyy}-${mm}-${dd}`, label });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return resultado;
}

export default function ConfirmarHorarioSheet({ servicio, onCerrar, onConfirmado }) {
    let ventanas = [];
    try {
        ventanas = servicio.ventanasDisponibles ? JSON.parse(servicio.ventanasDisponibles) : [];
    } catch { ventanas = []; }

    const [ventanaSel, setVentanaSel] = useState(null); // { dia, franja }
    const [fechaSel, setFechaSel] = useState(null);      // 'yyyy-MM-dd'
    const [hora, setHora] = useState('');
    const [guardando, setGuardando] = useState(false);

    const franjaInfo = ventanaSel ? FRANJAS.find(f => f.id === ventanaSel.franja) : null;
    const diaInfo = ventanaSel ? DIAS_SEMANA.find(d => d.id === ventanaSel.dia) : null;
    const [desdeHora, hastaHora] = ventanaSel ? ventanaSel.franja.split('-') : ['', ''];

    const elegirVentana = (v) => {
        setVentanaSel(v);
        setFechaSel(null);
        setHora(v.franja.split('-')[0]); // arranca en el inicio de la franja
    };

    const confirmar = async () => {
        if (!fechaSel || !hora) { toast.error('Elegí una fecha y un horario'); return; }
        setGuardando(true);
        try {
            await api.patch(`/servicios/${servicio.id}/confirmar-horario`, { fecha: fechaSel, hora });
            toast.success('Horario confirmado');
            onConfirmado();
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'No se pudo confirmar el horario');
        } finally {
            setGuardando(false);
        }
    };

    if (ventanas.length === 0) {
        return (
            <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
                <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto bg-chip" />
                    <p className="text-body font-bold text-ink text-center">
                        Este trabajo no tiene ninguna franja habilitada todavía — hablalo con quien lo asignó.
                    </p>
                    <button onClick={onCerrar} className="w-full py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
            <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto bg-chip" />
                <div>
                    <p className="text-label font-black text-muted uppercase tracking-widest mb-0.5">Confirmar horario</p>
                    <p className="text-body font-bold text-ink">{servicio.clienteNombre}</p>
                </div>

                {/* Paso 1: elegir día+franja habilitados */}
                <div>
                    <p className="text-label font-black text-muted uppercase tracking-wider mb-1.5">1. Día y franja habilitados</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ventanas.map((v, i) => {
                            const d = DIAS_SEMANA.find(x => x.id === v.dia);
                            const f = FRANJAS.find(x => x.id === v.franja);
                            const activo = ventanaSel && ventanaSel.dia === v.dia && ventanaSel.franja === v.franja;
                            return (
                                <button key={i} onClick={() => elegirVentana(v)}
                                    className={`h-9 px-3 rounded-xl text-label font-bold transition-all active:scale-95 ${
                                        activo ? 'bg-brand-red text-white' : 'bg-chip text-secondary'
                                    }`}>
                                    {d?.corto || v.dia} · {f?.rango || v.franja}hs
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Paso 2: elegir fecha concreta dentro del día elegido */}
                {ventanaSel && (
                    <div>
                        <p className="text-label font-black text-muted uppercase tracking-wider mb-1.5">
                            2. ¿Qué {diaInfo?.corto?.toLowerCase()}?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {proximasFechas(ventanaSel.dia).map(f => (
                                <button key={f.fecha} onClick={() => setFechaSel(f.fecha)}
                                    className={`h-9 px-3 rounded-xl text-label font-bold capitalize transition-all active:scale-95 ${
                                        fechaSel === f.fecha ? 'bg-brand-red text-white' : 'bg-chip text-secondary'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Paso 3: hora exacta dentro de la franja */}
                {ventanaSel && fechaSel && (
                    <div>
                        <p className="text-label font-black text-muted uppercase tracking-wider mb-1.5">
                            3. Hora exacta (entre {franjaInfo?.rango}hs)
                        </p>
                        <input type="time" value={hora} min={desdeHora} max={hastaHora}
                            onChange={e => setHora(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40" />
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button onClick={onCerrar}
                        className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95 transition-all">
                        Cancelar
                    </button>
                    <button onClick={confirmar} disabled={guardando || !fechaSel || !hora}
                        className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 transition-all disabled:opacity-40">
                        {guardando ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
