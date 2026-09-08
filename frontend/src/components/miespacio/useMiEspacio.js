import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getMiEspacio, guardarMiEspacio } from '../../services/api';

// Hook compartido de Mi Espacio (Lucas, 8-sep-2026): antes MiEspacioBoard.jsx
// hacia su propio GET/PUT del blob completo (Usuario.espacioJson) en cada uno
// de sus 3 lugares de uso (Panel, Mi Agenda, pantalla Mi Espacio) -- funcionaba
// porque en cada pantalla vivia un solo widget. Al sumar el checklist (bloc de
// notas con tachar, separado del tablero kanban) SI conviven los dos widgets
// en la pantalla completa de Mi Espacio -- si cada uno guardara su propia copia
// del blob por separado, el ultimo en guardar pisaria el cambio reciente del
// otro. Este hook se llama UNA sola vez por pantalla (arriba, en el componente
// de pantalla) y se pasa como prop a los widgets que la necesiten; en las
// pantallas donde solo vive uno de los dos widgets, ese mismo componente de
// pantalla es quien llama al hook igual (ver DashboardCaja.jsx/MiAgenda.jsx).

let contadorId = 0;
export const uid = () => `${Date.now().toString(36)}-${(contadorId++).toString(36)}`;

const COLOR_PENDIENTE = '#D13A28';
const COLOR_HACIENDO  = '#D48800';
const COLOR_HECHO     = '#16A34A';

export const espacioInicial = () => ({
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
    checklist: [],
});

export function useMiEspacio() {
    const [espacio, setEspacio] = useState(null);
    const [cargando, setCargando] = useState(true);
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
                const base = (parsed && typeof parsed === 'object') ? parsed : {};
                setEspacio({
                    boards: Array.isArray(base.boards) && base.boards.length > 0 ? base.boards : espacioInicial().boards,
                    checklist: Array.isArray(base.checklist) ? base.checklist : [],
                });
            } catch {
                toast.error('No se pudo cargar Mi Espacio');
                setEspacio(espacioInicial());
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    // Persistencia: cada mutación actualiza el estado local al toque (UI
    // instantánea) y dispara un guardado en el backend con un pequeño debounce
    // para no encadenar requests cuando hay varios cambios seguidos.
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

    return { espacio, cargando, actualizar };
}
