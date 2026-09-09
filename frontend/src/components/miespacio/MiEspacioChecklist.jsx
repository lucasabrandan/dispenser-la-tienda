import React from 'react';
import { toast } from 'react-hot-toast';
import { LuX } from 'react-icons/lu';
import { uid } from './useMiEspacio';
import AgregarInput from './AgregarInput';

// Bloc de notas con checklist (Lucas, 8-sep-2026): pedido explicito de separar
// esto del tablero Trello -- una lista simple para ir "tachando" tareas
// realizadas, sin columnas ni tarjetas moviles. Vive en el mismo blob de Mi
// Espacio que el tablero (campo "checklist", junto a "boards"), asi que es
// exactamente el mismo dato tanto en el Panel/Mi Agenda (donde se muestra
// solo) como en la pantalla completa de Mi Espacio (donde convive con el
// Trello) -- tachar un item en un lado lo deja tachado en el otro porque no
// hay dos copias, es el mismo registro.
//
// Recibe espacio/actualizar/cargando como props siempre (ver useMiEspacio.js)
// -- quien lo embebe decide si llama al hook el mismo (Panel, Mi Agenda) o si
// lo comparte con el tablero (pantalla Mi Espacio).
//
// (9-sep-2026, Lucas: "que al tildarlas pasen automaticamente al Trello")
// Tachar un item ya no lo deja tachado en la lista -- lo saca de la lista y
// lo suma como tarjeta nueva en la columna "Hecho" del primer tablero (el
// mismo espacio.boards[0] que usa MiEspacioBoard.jsx). Esto funciona aunque
// el tablero no este visible en esta pantalla (Panel/Mi Agenda) porque el
// checklist y el tablero viven en el mismo blob -- basta con actualizar
// espacio.boards ademas de espacio.checklist en el mismo actualizar().
export default function MiEspacioChecklist({ espacio, actualizar, cargando }) {
    if (cargando || !espacio) {
        return (
            <p className="text-caption font-black text-muted animate-pulse uppercase tracking-widest py-6 text-center">
                Cargando...
            </p>
        );
    }

    const checklist = espacio.checklist || [];

    const agregar = (texto) => {
        actualizar({ ...espacio, checklist: [...checklist, { id: uid(), texto, hecho: false }] });
    };

    // Busca la columna "Hecho" del primer tablero por nombre (case-insensitive,
    // por si alguien la renombro con mayusculas/espacios distintos); si no la
    // encuentra (columnas renombradas del todo), usa la ultima columna del
    // tablero como destino -- en un Kanban Pendiente/Haciendo/Hecho esa
    // siempre es la de "terminado".
    const marcarHechaYPasarATrello = (item) => {
        const boards = espacio.boards || [];
        const board = boards[0];
        let nuevosBoards = boards;
        if (board && board.columnas?.length > 0) {
            const colDestino = board.columnas.find(c => c.nombre.trim().toLowerCase() === 'hecho')
                || board.columnas[board.columnas.length - 1];
            nuevosBoards = boards.map(b => b.id !== board.id ? b : {
                ...b,
                columnas: b.columnas.map(c => c.id !== colDestino.id ? c : {
                    ...c,
                    tarjetas: [...c.tarjetas, { id: uid(), texto: item.texto }],
                }),
            });
        }
        actualizar({
            ...espacio,
            boards: nuevosBoards,
            checklist: checklist.filter(it => it.id !== item.id),
        });
        toast.success(board ? `"${item.texto}" pasó al Trello` : 'Tarea completada');
    };

    const toggle = (id) => {
        const item = checklist.find(it => it.id === id);
        if (!item) return;
        if (!item.hecho) {
            marcarHechaYPasarATrello(item);
            return;
        }
        // No debería alcanzarse en el uso normal -- el item ya sale del
        // checklist apenas se tacha (ver arriba). Se deja por robustez.
        actualizar({
            ...espacio,
            checklist: checklist.map(it => it.id === id ? { ...it, hecho: !it.hecho } : it),
        });
    };

    const borrar = (id) => {
        actualizar({ ...espacio, checklist: checklist.filter(it => it.id !== id) });
    };

    return (
        <div>
            {checklist.length > 0 && (
                <div className="space-y-1.5 mb-2">
                    {checklist.map(it => (
                        <div key={it.id}
                            className="flex items-center gap-2 bg-card border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-3 py-2">
                            <button onClick={() => toggle(it.id)}
                                title="Tachar"
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 active:scale-90 transition-all ${
                                    it.hecho
                                        ? 'bg-brand-green border-brand-green text-white'
                                        : 'border-muted text-transparent'
                                }`}>
                                {it.hecho && <span className="text-label">✓</span>}
                            </button>
                            <p className={`flex-1 min-w-0 text-body break-words ${it.hecho ? 'line-through text-muted' : 'text-ink'}`}>
                                {it.texto}
                            </p>
                            <button onClick={() => borrar(it.id)} title="Borrar"
                                className="shrink-0 w-6 h-6 rounded-md bg-chip text-muted flex items-center justify-center active:scale-90">
                                <LuX size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <AgregarInput placeholder="+ tarea" onAgregar={agregar} />
        </div>
    );
}
