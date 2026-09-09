import React, { useState, useEffect } from 'react';
import { LuCopy, LuX, LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { uid } from './useMiEspacio';
import AgregarInput from './AgregarInput';

// Tablero de Mi Espacio (Lucas, 31-ago, items 2 y 5) -- extraido de MiEspacio.jsx
// (7-sep-2026) para poder embeberlo en mas de un lugar sin duplicar la logica:
// la pantalla completa (MiEspacio.jsx) y Mi Agenda del tecnico (MiAgenda.jsx).
//
// (8-sep-2026) A pedido de Lucas, el Trello dejo de vivir en el Panel del admin
// y en Mi Agenda del tecnico -- ahi ahora se muestra el checklist nuevo
// (MiEspacioChecklist.jsx). El tablero queda solo en la pantalla completa de
// Mi Espacio. De paso, este componente paso de manejar su propia carga/guardado
// a ser puramente presentacional: recibe espacio/actualizar/cargando como
// props (ver useMiEspacio.js) -- necesario porque en la pantalla de Mi Espacio
// convive con el checklist nuevo, y los dos necesitan compartir una sola
// fuente de verdad para no pisarse el guardado entre si.
//
// Todo se guarda como un solo blob JSON en Usuario.espacioJson (ver
// MiEspacioController en el backend) -- ya resuelto por usuario autenticado,
// asi que cada tecnico tiene su propio espacio, separado del admin y de los
// demas tecnicos, sin ningun cambio de modelo.
//
// (9-sep-2026) Drag-and-drop para mover tarjetas entre columnas (Lucas: "que
// me permita hacer un drag and drop"), ademas de los botones de flecha que
// ya existian. Se implemento con la API nativa de HTML5 (draggable +
// eventos onDrag*) para no sumar una libreria nueva -- funciona con mouse
// (desktop) pero NO con touch (celu), asi que en mobile las flechas siguen
// siendo el unico camino; se dejaron sin tocar a proposito por eso.

export default function MiEspacioBoard({ espacio, actualizar, cargando }) {
    const [boardActivoId, setBoardActivoId] = useState(null);
    const [renombrandoBoard, setRenombrandoBoard] = useState(null); // id del board en edición de nombre
    const [renombrandoCol, setRenombrandoCol] = useState(null);     // id de la columna en edición de nombre
    const [arrastrando, setArrastrando] = useState(null);           // { colId, tarjetaId } de la tarjeta que se está arrastrando
    const [colSobrevolada, setColSobrevolada] = useState(null);     // id de la columna bajo el cursor mientras se arrastra

    // Arranca en el primer board apenas el espacio termina de cargar (o si el
    // board activo dejo de existir, ej. despues de que otra pestaña lo borre).
    useEffect(() => {
        if (!espacio) return;
        if (!boardActivoId || !espacio.boards.some(b => b.id === boardActivoId)) {
            setBoardActivoId(espacio.boards[0]?.id ?? null);
        }
    }, [espacio, boardActivoId]);

    if (cargando || !espacio) {
        return (
            <p className="text-caption font-black text-muted animate-pulse uppercase tracking-widest py-6 text-center">
                Cargando...
            </p>
        );
    }

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
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : {
                ...b,
                columnas: b.columnas.map(c => c.id === colId
                    ? { ...c, tarjetas: [...c.tarjetas, { id: uid(), texto }] }
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

    const moverNotaAColumna = (origenColId, tarjetaId, destinoColId) => {
        if (origenColId === destinoColId) return;
        const columnas = boardActivo.columnas;
        const origen = columnas.find(c => c.id === origenColId);
        const tarjeta = origen?.tarjetas.find(t => t.id === tarjetaId);
        if (!tarjeta) return;
        const nuevasColumnas = columnas.map(c => {
            if (c.id === origenColId) return { ...c, tarjetas: c.tarjetas.filter(t => t.id !== tarjetaId) };
            if (c.id === destinoColId) return { ...c, tarjetas: [...c.tarjetas, tarjeta] };
            return c;
        });
        actualizar({
            ...espacio,
            boards: espacio.boards.map(b => b.id !== boardActivo.id ? b : { ...b, columnas: nuevasColumnas }),
        });
    };

    const moverNota = (colIdx, tarjetaId, direccion) => {
        const columnas = boardActivo.columnas;
        const destinoIdx = colIdx + direccion;
        if (destinoIdx < 0 || destinoIdx >= columnas.length) return;
        moverNotaAColumna(columnas[colIdx].id, tarjetaId, columnas[destinoIdx].id);
    };

    // Drag-and-drop (mouse, HTML5 nativo -- ver comentario de cabecera).
    const handleDragStart = (colId, tarjetaId) => {
        setArrastrando({ colId, tarjetaId });
    };

    const handleDragEnd = () => {
        setArrastrando(null);
        setColSobrevolada(null);
    };

    const handleDrop = (e, destinoColId) => {
        e.preventDefault();
        if (arrastrando) moverNotaAColumna(arrastrando.colId, arrastrando.tarjetaId, destinoColId);
        setArrastrando(null);
        setColSobrevolada(null);
    };

    return (
        <div>
            {/* Pestañas de tableros */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 mb-3">
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

            {/* Tablero kanban */}
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1">
                {boardActivo.columnas.map((col, colIdx) => (
                    <div key={col.id}
                        onDragOver={e => { e.preventDefault(); if (arrastrando) setColSobrevolada(col.id); }}
                        onDragLeave={() => setColSobrevolada(c => c === col.id ? null : c)}
                        onDrop={e => handleDrop(e, col.id)}
                        className={`flex-1 min-w-[220px] flex flex-col rounded-xl transition-colors ${
                            colSobrevolada === col.id ? 'bg-[#D13A28]/5 ring-2 ring-[#D13A28]/30' : ''
                        }`}>
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
                                    draggable
                                    onDragStart={() => handleDragStart(col.id, t.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-card border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-3 py-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                                        arrastrando?.tarjetaId === t.id ? 'opacity-40' : ''
                                    }`}>
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

                        <AgregarInput placeholder="+ nota" onAgregar={texto => agregarNota(col.id, texto)} />
                    </div>
                ))}
            </div>
        </div>
    );
}
