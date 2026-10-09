import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuDownload } from 'react-icons/lu';
import api from '../../services/api';

// "Descargar todo" (9-oct-2026): un Excel con todos los equipos de la empresa y
// todas las visitas hechas, para que actualicen su planilla de una sola vez. Sin precios.
const fmt = (iso) => { if (!iso) return ''; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const reps = (r) => (r || []).map(x => `${x.cantidad || 1} × ${x.nombre}`).join(', ');
const proximo = (e) => !e.vence ? '' : e.tipo === 'FILTRO' ? 'Cambio de filtro' : 'Sanitización';
const ESTADO = { AL_DIA: 'Al día', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', SIN_DATOS: 'Sin datos' };

export default function DescargarTodo({ empresa }) {
    const [bajando, setBajando] = useState(false);
    const bajar = async () => {
        setBajando(true);
        try {
            const [{ data }, XLSX] = await Promise.all([api.get('/empresa/exportar'), import('xlsx')]);
            const equipos = (data?.equipos || []).map(e => ({
                'N/S': e.serie || '', Lugar: e.sede || '', Dirección: e.direccion || '', Marca: e.marca || '', Modelo: e.modelo || '',
                Ubicación: e.ubicacion || '', 'Última visita': fmt(e.ultimaVisita), 'Próximo service': proximo(e),
                Vence: fmt(e.vence), Estado: ESTADO[e.estado] || e.estado || '',
            }));
            const visitas = (data?.visitas || []).map(v => ({
                Fecha: fmt(v.fecha), 'N/S': v.serie || '', Lugar: v.lugar || '', Dirección: v.direccion || '',
                'Trabajo realizado': v.trabajo || '', Repuestos: reps(v.repuestos), Técnico: v.tecnico || '',
                'Garantía hasta': fmt(v.garantiaHasta),
            }));
            if (!equipos.length && !visitas.length) { toast('Todavía no hay nada para descargar'); return; }
            const wb = XLSX.utils.book_new();
            const h1 = XLSX.utils.json_to_sheet(equipos.length ? equipos : [{ 'N/S': '' }]);
            h1['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 11 }, { wch: 11 }];
            const h2 = XLSX.utils.json_to_sheet(visitas.length ? visitas : [{ Fecha: '' }]);
            h2['!cols'] = [{ wch: 11 }, { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 12 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, h1, 'Equipos');
            XLSX.utils.book_append_sheet(wb, h2, 'Historial');
            const hoy = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Equipos-${empresa || 'empresa'}-${hoy}.xlsx`.replace(/\s+/g, '-'));
        } catch { toast.error('No se pudo descargar'); }
        finally { setBajando(false); }
    };
    return (
        <button type="button" onClick={bajar} disabled={bajando}
            className="h-10 px-3.5 rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-label font-black text-secondary inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50">
            <LuDownload size={15} /> {bajando ? 'Bajando…' : 'Descargar todo'}
        </button>
    );
}
