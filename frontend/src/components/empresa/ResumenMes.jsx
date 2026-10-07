import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuChevronLeft, LuChevronRight, LuFileDown, LuSheet, LuMapPin } from 'react-icons/lu';
import api from '../../services/api';

// Resumen del mes (Portal Empresa, 7-oct-2026): cada equipo atendido en el mes,
// sin precios — para que la empresa actualice su base y controle el total de
// máquinas. Descarga en PDF y Excel.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const moverMes = (m, n) => { const [a, mm] = m.split('-').map(Number); const d = new Date(a, mm - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const nombreMes = (m) => { const [a, mm] = m.split('-').map(Number); return `${MESES[mm - 1]} ${a}`; };
const fmt = (iso) => { if (!iso) return ''; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const reps = (r) => (r || []).map(x => `${x.cantidad || 1} × ${x.nombre}`).join(', ');

export default function ResumenMes({ empresa }) {
    const [mes, setMes] = useState(mesActual());
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        setCargando(true);
        try { const r = await api.get('/empresa/resumen', { params: { mes } }); setData(r.data); }
        catch { toast.error('No se pudo cargar el resumen'); } finally { setCargando(false); }
    }, [mes]);
    useEffect(() => { cargar(); }, [cargar]);

    const porLugar = useMemo(() => {
        const m = new Map();
        (data?.items || []).forEach(it => { const k = it.lugar || it.direccion || '—'; if (!m.has(k)) m.set(k, []); m.get(k).push(it); });
        return [...m.entries()];
    }, [data]);

    const filas = () => (data?.items || []).map(it => ({
        Fecha: fmt(it.fecha), 'N/S': it.serie || '', Lugar: it.lugar || '', Dirección: it.direccion || '',
        'Trabajo realizado': it.trabajo || '', Repuestos: reps(it.repuestos), Técnico: it.tecnico || '',
        'Garantía hasta': fmt(it.garantiaHasta),
    }));

    const excel = async () => {
        if (!data?.items?.length) return;
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(filas());
        ws['!cols'] = [{ wch: 11 }, { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 12 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, nombreMes(mes).slice(0, 31));
        XLSX.writeFile(wb, `Resumen-${empresa || 'empresa'}-${mes}.xlsx`.replace(/\s+/g, '-'));
    };

    const pdf = async () => {
        if (!data?.items?.length) return;
        const t = toast.loading('Armando el PDF…');
        try {
            const [{ default: jsPDF }, { default: autoTable }, { dibujarHeaderCompacto, dibujarFooter }, { HEADER_H, M, C }] = await Promise.all([
                import('jspdf'), import('jspdf-autotable'), import('../../utils/pdf/layout'), import('../../utils/pdf/theme'),
            ]);
            const doc = new jsPDF({ orientation: 'landscape' });
            dibujarHeaderCompacto(doc, { tipoLabel: `Resumen de servicio técnico · ${nombreMes(mes)}`, fecha: new Date().toLocaleDateString('es-AR'), nroDoc: empresa || null });
            let y = HEADER_H.compact + 8;
            doc.setFontSize(9); doc.setTextColor(...C.dark);
            doc.text(`Equipos atendidos: ${data.equiposAtendidos}   ·   Equipos distintos: ${data.equiposDistintos}   ·   Visitas: ${data.visitas}   ·   Lugares: ${data.lugares}`, M, y);
            autoTable(doc, {
                startY: y + 4,
                head: [['Fecha', 'N/S', 'Lugar', 'Trabajo realizado', 'Repuestos', 'Técnico']],
                body: (data.items || []).map(it => [fmt(it.fecha), it.serie || '', [it.lugar, it.direccion].filter(Boolean).join(' · '), it.trabajo || '', reps(it.repuestos), it.tecnico || '']),
                styles: { fontSize: 7.5, cellPadding: 1.8, valign: 'top' },
                headStyles: { fillColor: C.navy, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: C.grayZebra },
                columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 26 }, 2: { cellWidth: 55 }, 4: { cellWidth: 48 }, 5: { cellWidth: 20 } },
                margin: { left: M, right: M, bottom: 22 },
                didDrawPage: () => {},
            });
            const total = doc.getNumberOfPages();
            for (let p = 1; p <= total; p++) { doc.setPage(p); dibujarFooter(doc, { pagina: p, totalPaginas: total, textoCentral: 'Resumen generado desde el portal de Dispenser La Tienda' }); }
            doc.save(`Resumen-${empresa || 'empresa'}-${mes}.pdf`.replace(/\s+/g, '-'));
            toast.success('PDF descargado', { id: t });
        } catch { toast.error('No se pudo armar el PDF', { id: t }); }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-chip">
                    <button type="button" onClick={() => setMes(m => moverMes(m, -1))} aria-label="Mes anterior" className="w-10 h-10 flex items-center justify-center text-secondary"><LuChevronLeft size={18} /></button>
                    <span className="px-1 min-w-[6.5rem] text-center text-body font-black text-ink capitalize">{nombreMes(mes)}</span>
                    <button type="button" onClick={() => setMes(m => moverMes(m, 1))} disabled={mes >= mesActual()} aria-label="Mes siguiente" className="w-10 h-10 flex items-center justify-center text-secondary disabled:opacity-30"><LuChevronRight size={18} /></button>
                </div>
                <div className="ml-auto flex gap-1.5">
                    <button type="button" onClick={pdf} disabled={!data?.items?.length} className="h-10 px-3 rounded-xl bg-chip text-secondary text-label font-black inline-flex items-center gap-1.5 disabled:opacity-40"><LuFileDown size={15} /> PDF</button>
                    <button type="button" onClick={excel} disabled={!data?.items?.length} className="h-10 px-3 rounded-xl bg-chip text-secondary text-label font-black inline-flex items-center gap-1.5 disabled:opacity-40"><LuSheet size={15} /> Excel</button>
                </div>
            </div>

            {cargando && !data ? <p className="py-16 text-center text-muted text-body">Cargando…</p> : (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        {[['Equipos atendidos', data?.equiposAtendidos], ['Visitas', data?.visitas], ['Lugares', data?.lugares]].map(([l, v]) => (
                            <div key={l} className="p-3.5 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]">
                                <p className="text-[11px] font-black uppercase tracking-wider text-muted">{l}</p>
                                <p className="text-2xl font-black text-ink">{v ?? 0}</p>
                            </div>
                        ))}
                    </div>
                    {!data?.items?.length ? (
                        <p className="py-12 text-center text-body text-muted">No hubo trabajos en {nombreMes(mes)}.</p>
                    ) : porLugar.map(([lugar, items]) => (
                        <div key={lugar} className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
                            <p className="px-4 pt-3 pb-2 flex items-center gap-1.5 text-label font-black text-ink"><LuMapPin size={14} className="text-brand-red" />{lugar}<span className="text-muted font-bold">· {items.length}</span></p>
                            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {items.map((it, i) => (
                                    <div key={i} className="px-4 py-2.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-body font-black text-ink">{it.serie ? `N/S ${it.serie}` : 'Equipo'}</span>
                                            <span className="ml-auto text-caption text-muted shrink-0">{fmt(it.fecha)}{it.tecnico ? ` · ${it.tecnico}` : ''}</span>
                                        </div>
                                        <p className="text-label text-secondary">{it.trabajo || 'Sin detalle'}</p>
                                        {it.repuestos?.length > 0 && <p className="text-caption text-muted">Repuestos: {reps(it.repuestos)}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
