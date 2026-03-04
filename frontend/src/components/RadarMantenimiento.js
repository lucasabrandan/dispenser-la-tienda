import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function RadarMantenimiento() {
    const [alertas, setAlertas] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        generarRadar();
    }, []);

    const generarRadar = async () => {
        try {
            // 🛑 SI QUERÉS USAR DATOS REALES, DESCOMENTÁ ESTO Y BORRÁ LOS DATOS FALSOS 🛑
            /*
            const [resClientes, resServicios] = await Promise.all([
                api.get('/clientes'),
                api.get('/servicios')
            ]);
            const clientes = resClientes.data || [];
            const servicios = resServicios.data || [];
            */

            // 🧪 INYECTAMOS DATOS FALSOS (SIMULADOR) 🧪
            // -----------------------------------------------------------

            const clientes = [
                { nombre: "Lucas Prueba", telefono: "1123456789" },
                { nombre: "Empresa Falsa S.A.", telefono: "1198765432" }
            ];

            const servicios = [
                {
                    estado: 'REALIZADO', fecha: '2024-10-15T10:00:00Z', clienteNombre: "Lucas Prueba", sedeNombre: "Casa Central",
                    items: [{ equipoSerial: "SN-VENCIDO-01", trabajoRealizado: "CAMBIO DE FILTRO", trabajoTipo: "CAMBIO_FILTRO" }]
                },
                {
                    estado: 'REALIZADO', fecha: '2025-08-20T10:00:00Z', clienteNombre: "Empresa Falsa S.A.", sedeNombre: "Oficina Planta Baja",
                    items: [{ equipoSerial: "SN-SUCIO-99", trabajoRealizado: "REPARACION MANGUERA", trabajoTipo: "REPARACION" }]
                },
                {
                    estado: 'REALIZADO', fecha: '2026-02-15T10:00:00Z', clienteNombre: "Lucas Prueba", sedeNombre: "Casa Central",
                    items: [{ equipoSerial: "SN-NUEVO-55", trabajoRealizado: "CAMBIO DE FILTRO", trabajoTipo: "CAMBIO_FILTRO" }]
                }
            ];
            
            const telefonosDict = {};
            clientes.forEach(c => { telefonosDict[c.nombre] = c.telefono; });

            const historialPorEquipo = {};

            servicios.forEach(srv => {
                if (srv.estado !== 'REALIZADO') return;

                srv.items?.forEach(it => {
                    const serial = it.equipoSerial;
                    if (!serial || serial === "MOSTRADOR") return;

                    if (!historialPorEquipo[serial]) {
                        historialPorEquipo[serial] = [];
                    }

                    historialPorEquipo[serial].push({
                        fechaObj: new Date(srv.fecha),
                        fechaStr: srv.fecha.split('T')[0],
                        cliente: srv.clienteNombre,
                        sede: srv.sedeNombre,
                        trabajo: it.trabajoRealizado,
                        esFiltro: it.trabajoRealizado?.toUpperCase().includes("FILTRO") || it.trabajoTipo === "CAMBIO_FILTRO"
                    });
                });
            });

            const hoy = new Date();
            const alertasGeneradas = [];

            Object.keys(historialPorEquipo).forEach(serial => {
                const historial = historialPorEquipo[serial].sort((a, b) => b.fechaObj - a.fechaObj);
                const ultimoServicio = historial[0];
                const ultimoFiltro = historial.find(h => h.esFiltro);

                const mesesDesdeUltimo = (hoy.getFullYear() - ultimoServicio.fechaObj.getFullYear()) * 12 + (hoy.getMonth() - ultimoServicio.fechaObj.getMonth());
                
                let mesesDesdeFiltro = 0;
                if (ultimoFiltro) {
                    mesesDesdeFiltro = (hoy.getFullYear() - ultimoFiltro.fechaObj.getFullYear()) * 12 + (hoy.getMonth() - ultimoFiltro.fechaObj.getMonth());
                } else {
                    mesesDesdeFiltro = mesesDesdeUltimo; 
                }

                let tipoAlerta = null;
                let mensajeBase = "";

                if (mesesDesdeFiltro >= 11) {
                    tipoAlerta = "FILTRO";
                    mensajeBase = `¡Hola! Pasó un año del último cambio de filtro de tu dispenser. ¿Coordinamos una visita para dejar el agua impecable de nuevo?`;
                } else if (mesesDesdeUltimo >= 5 && mesesDesdeUltimo < 11) {
                    tipoAlerta = "SANITIZACIÓN";
                    mensajeBase = `¡Hola! Ya pasaron 6 meses de la última revisión de tu dispenser. ¿Te parece si coordinamos una visita de sanitización de rutina?`;
                }

                if (tipoAlerta) {
                    alertasGeneradas.push({
                        serial,
                        cliente: ultimoServicio.cliente,
                        sede: ultimoServicio.sede,
                        fechaUltimo: ultimoFiltro && tipoAlerta === "FILTRO" ? ultimoFiltro.fechaStr : ultimoServicio.fechaStr,
                        telefono: telefonosDict[ultimoServicio.cliente],
                        tipoAlerta,
                        mensajeBase,
                        meses: tipoAlerta === "FILTRO" ? mesesDesdeFiltro : mesesDesdeUltimo
                    });
                }
            });

            setAlertas(alertasGeneradas.sort((a, b) => b.meses - a.meses));
            setCargando(false);

        } catch (error) {
            toast.error("Error al generar el Radar");
            setCargando(false);
        }
    };

    const enviarWA = (alerta) => {
        if (!alerta.telefono) return toast.error("Este cliente no tiene teléfono guardado");
        const tel = alerta.telefono.replace(/\D/g, '');
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(alerta.mensajeBase)}`, '_blank');
    };

    if (cargando) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-5 transition-colors duration-300">
            <div className="font-black text-slate-500 dark:text-slate-400 animate-pulse text-lg">
                📡 Escaneando base de datos...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors duration-300">
            
            {/* ENCABEZADO RADAR */}
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-3xl mb-6 shadow-lg shadow-slate-900/10 transition-colors duration-300">
                <h2 className="m-0 font-black text-2xl tracking-tight flex items-center gap-2">
                    🚨 Radar Activo
                </h2>
                <p className="m-0 mt-2 text-slate-300 text-sm font-medium">
                    Encontramos <b className="text-white bg-white/20 px-2 py-0.5 rounded-md">{alertas.length}</b> dispensers que necesitan atención este mes.
                </p>
            </div>

            {/* LISTA DE ALERTAS */}
            {alertas.length === 0 ? (
                <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-colors duration-300">
                    <h3 className="text-emerald-500 font-black text-xl m-0">¡Todo al día! ✅</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">No hay dispensers vencidos este mes.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {alertas.map((a, i) => (
                        <div key={i} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 border-l-8 transition-colors duration-300 ${
                            a.tipoAlerta === 'FILTRO' ? 'border-l-rose-500' : 'border-l-amber-500'
                        }`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    {/* ETIQUETA DE ALERTA */}
                                    <div className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase mb-3 ${
                                        a.tipoAlerta === 'FILTRO' 
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' 
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                        {a.tipoAlerta} ({a.meses} MESES)
                                    </div>
                                    <h3 className="m-0 text-[17px] font-black text-slate-900 dark:text-white tracking-tight">{a.cliente}</h3>
                                    <p className="m-0 mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        📍 {a.sede} | S/N: <b className="text-slate-700 dark:text-slate-300">{a.serial}</b>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Último Service</span><br/>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{a.fechaUltimo}</span>
                                </div>
                            </div>

                            <button onClick={() => enviarWA(a)} className="w-full mt-5 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-[15px] font-extrabold flex justify-center items-center gap-2 shadow-md shadow-green-500/20 transition-all transform active:scale-[0.98]">
                                <span className="text-xl">💬</span> Avisar por WhatsApp
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}