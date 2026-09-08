import React from 'react';
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

    const toggle = (id) => {
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
