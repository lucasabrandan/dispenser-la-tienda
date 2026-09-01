import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { LuCopy, LuX, LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { getMiEspacio, guardarMiEspacio } from '../../services/api';

// Mi Espacio (Lucas, 31-ago, items 2 y 5): un lugar propio del admin para notas
// que no son del negocio de dispensers — tableros kanban, duplicables, con
// columnas de nombre editable. Todo se guarda como un solo blob JSON en
// Usuario.espacioJson (ver MiEspacioController en el backend).
//
// Alcance de esta primera versión (a propósito, para no inflar el pedido original):
// se puede duplicar un tablero pero no borrarlo, y las columnas de cada tablero
// son fijas (Pendiente/Haciendo/Hecho) — se pueden renombrar pero no agregar/quitar.

let contadorId = 0;
const uid = () => `${Date.now().toString(36)}-${(contadorId++).toString(36)}`;

const COLOR_PENDIENTE = '#D13A28';
const COLOR_HACIENDO  = '#D48800';
const COLOR_HECHO     = '#16A34A';

const espacioInicial = () => ({
    boards: [
        {
            id: uid(),
            nombre: 'Notas',
            columnas: [
                { id: uid(), nombre: 'Pendiente', color: COLOR_PENDIENTE, tarjetas: [] },
                { id: uid(), nombre: 'Haciendo',  color: COLOR_HACIENDO,  tarjetas: [] },
                { id: uid(), nombre: 'Hecho',     color: COLOR_HECHO,     tarjetas: [] },
            ],
        },
    ],
});

export default function MiEspacio() {
    const [espacio, setEspacio] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [boardActivoId, setBoardActivoId] = useState(null);
    const [renombrandoBoard, setRenombrandoBoard] = useState(null); // id del board en edición de nombre
    const [renombrandoCol, setRenombrandoCol] = useState(null);     // id de la columna en edición de nombre
    const guardarTimeout = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await getMiEspacio();
                const crudo = res.data?.espacioJson;
                let parsed = null;
                if (crudo) {
                    try { parsed = JSON.parse(crudo); } catch { parsed = null; }
                }
                const inicial = (parsed && Array.isArray(parsed.boards) && parsed.boards.length > 0)
                    ? parsed
                    : espacioInicial();
                setEspacio(inicial);
                setBoardActivoId(inicial.boards[0].id);
            } catch {
                toast.error('No se pudo cargar Mi Espacio');
                const inicial = espacioInicial();
                setEspacio(inicial);
                setBoardActivoId(inicial.boards[0].id);
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    // Persistencia: cada mutación actualiza el estado local al toque (UI instantánea)
    // y dispara un guardado en el backend con un pequeño debounce para no encadenar
    // requests cuando hay varios cambios seguidos.
    const actualizar = (nuevoEspacio) => {
        setEspacio(nuevoEspacio);
        clearTimeout(guardarTimeout.current);
        guardarTimeout.current = setTimeout(async () => {
            try {
                await guardarMiEspacio(JSON.stringify(nuevoEspacio));
            } catch {
                toast.error('No se pudo guardar el cambio en Mi Espacio');
            }
        }, 500);
    };

    if (cargando) return (
        <div className="min-h-screen bg-page flex items-center justify-center p-5 transition-colors">
            <p className="font-black text-muted animate-pulse uppercase text-sm tracking-widest">
                Cargando Mi Espacio...
            </p>
        </div>
    );

    const boardActivo = espacio.boards.find(b => b.id === boardActivoId) || espacio.boards[0];

    const renombrarBoard = (boardId, nombre) => {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) { setRenombrandoBoard(null); return; }
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id === boardId ? { ...b, nombre: nombreLimpio } : b),
        });
        setRenombrandoBoard(null);
    };

    const duplicarBoardActual = () => {
        const copia = {
            id: uid(),
            nombre: `${boardActivo.nombre} (copia)`,
            columnas: boardActivo.columnas.map(c => ({
                id: uid(),
                nombre: c.nombre,
                color: c.color,
                tarjetas: c.tarjetas.map(t => ({ id: uid(), texto: t.texto })),
            })),
        };
        actualizar({ ...espacio, boards: [...espacio.boards, copia] });
        setBoardActivoId(copia.id);
        setRenombrandoBoard(copia.id); // el nombre generado queda editable al toque, sin prompt()
    };

    const renombrarColumna = (colId, nombre) => {
        const nombreLimpio = nombre.trim();
        setRenombrandoCol(null);
        if (!nombreLimpio) return;
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : {
                ...b,
                columnas: b.columnas.map(c => c.id === colId ? { ...c, nombre: nombreLimpio } : c),
            }),
        });
    };

    const agregarNota = (colId, texto) => {
        const textoLimpio = texto.trim();
        if (!textoLimpio) return;
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : {
                ...b,
                columnas: b.columnas.map(c => c.id === colId
                    ? { ...c, tarjetas: [...c.tarjetas, { id: uid(), texto: textoLimpio }] }
                    : c),
            }),
        });
    };

    const borrarNota = (colId, tarjetaId) => {
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : {
                ...b,
                columnas: b.columnas.map(c => c.id === colId
                    ? { ...c, tarjetas: c.tarjetas.filter(t => t.id !== tarjetaId) }
                    : c),
            }),
        });
    };

    const moverNota = (colIdx, tarjetaId, direccion) => {
        const columnas = boardActivo.columnas;
        const destinoIdx = colIdx + direccion;
        if (destinoIdx < 0 || destinoIdx >= columnas.length) return;
        const origen = columnas[colIdx];
        const tarjeta = origen.tarjetas.find(t => t.id === tarjetaId);
        if (!tarjeta) return;
        const nuevasColumnas = columnas.map((c, i) => {
            if (i === colIdx) return { ...c, tarjetas: c.tarjetas.filter(t => t.id !== tarjetaId) };
            if (i === destinoIdx) return { ...c, tarjetas: [...c.tarjetas, tarjeta] };
            return c;
        });
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : { ...b, columnas: nuevasColumnas }),
        });
    };

    return (
        <div className="min-h-screen bg-page pb-28 transition-colors">

            {/* Header sticky con pestañas de tableros */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-3">
                    <div className="flex items-center gap-2">
                        <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Mi Espacio</h2>
                        <span className="text-caption font-bold text-muted md:ml-2">Notas propias, solo para vos</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {espacio.boards.map(b => (
                            <button key={b.id}
                                onClick={() => {
                                    if (b.id === boardActivoId) { setRenombrandoBoard(b.id); return; }
                                    setBoardActivoId(b.id);
                                }}
                                title={b.id === boardActivoId ? 'Tocá de nuevo para renombrar este tablero' : b.nombre}
                                className={`shrink-0 px-3.5 py-1.5 rounded-full text-caption font-black whitespace-nowrap transition-colors ${
                                    b.id === boardActivoId ? 'bg-brand-red text-white' : 'bg-chip text-secondary'
                                }`}>
                                {renombrandoBoard === b.id ? (
                                    <input autoFocus defaultValue={b.nombre}
                                        onClick={e => e.stopPropagation()}
                                        onBlur={e => renombrarBoard(b.id, e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') e.target.blur();
                                            if (e.key === 'Escape') setRenombrandoBoard(null);
                                        }}
                                        className="bg-transparent outline-none border-b border-white/70 w-24 text-white placeholder:text-white/70" />
                                ) : b.nombre}
                            </button>
                        ))}
                        <button onClick={duplicarBoardActual} title="Duplicar tablero actual"
                            className="shrink-0 px-3.5 py-1.5 rounded-full text-caption font-black whitespace-nowrap border border-dashed border-black/20 dark:border-white/20 text-muted flex items-center gap-1.5">
                            <LuCopy size={12} /> Duplicar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tablero kanban */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4">
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4">
                    {boardActivo.columnas.map((col, colIdx) => (
                        <div key={col.id} className="flex-1 min-w-[220px] flex flex-col">
                            <div className="flex items-center gap-2 mb-2.5 px-0.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                                {renombrandoCol === col.id ? (
                                    <input autoFocus defaultValue={col.nombre}
                                        onBlur={e => renombrarColumna(col.id, e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') e.target.blur();
                                            if (e.key === 'Escape') setRenombrandoCol(null);
                                        }}
                                        className="text-label font-black uppercase tracking-wide bg-transparent outline-none border-b border-brand-red text-muted flex-1 min-w-0" />
                                ) : (
                                    <span onClick={() => setRenombrandoCol(col.id)}
                                        title="Tocá para renombrar esta columna"
                                        className="text-label font-black uppercase tracking-wide text-muted truncate cursor-text hover:border-b hover:border-dashed hover:border-muted">
                                        {col.nombre}
                                    </span>
                                )}
                                <span className="ml-auto shrink-0 text-label font-black text-muted bg-chip rounded-md px-1.5 py-0.5">
                                    {col.tarjetas.length}
                                </span>
                            </div>

                            <div className="space-y-2 mb-2">
                                {col.tarjetas.map(t => (
                                    <div key={t.id}
                                        className="bg-card border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-3 py-2.5 shadow-sm">
                                        <p className="text-body text-ink break-words">{t.texto}</p>
                                        <div className="flex items-center justify-end gap-1 mt-2">
                                            {colIdx > 0 && (
                                                <button onClick={() => moverNota(colIdx, t.id, -1)}
                                                    title={`Mover a "${boardActivo.columnas[colIdx - 1].nombre}"`}
                                                    className="w-6 h-6 rounded-md bg-chip text-muted flex items-center justify-center active:scale-90">
                                                    <LuArrowLeft size={11} />
                                                </button>
                                            )}
                                            {colIdx < boardActivo.columnas.length - 1 && (
                                                <button onClick={() => moverNota(colIdx, t.id, 1)}
                                                    title={`Mover a "${boardActivo.columnas[colIdx + 1].nombre}"`}
                                                    className="w-6 h-6 rounded-md bg-chip text-muted flex items-center justify-center active:scale-90">
                                                    <LuArrowRight size={11} />
                                                </button>
                                            )}
                                            <button onClick={() => borrarNota(col.id, t.id)} title="Borrar nota"
                                                className="w-6 h-6 rounded-md bg-chip text-muted flex items-center justify-center active:scale-90">
                                                <LuX size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <input placeholder="+ nota"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        agregarNota(col.id, e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="w-full text-body font-medium text-ink bg-card border border-dashed border-black/15 dark:border-white/15 rounded-xl px-3 py-2 outline-none focus:border-brand-red focus:border-solid placeholder:text-muted mt-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
