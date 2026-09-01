import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { LuDownload, LuFolderOpen, LuCircleCheck, LuTriangleAlert, LuUpload } from 'react-icons/lu';

const LABEL = 'block text-label font-black text-muted uppercase tracking-widest mb-1.5';

const PLANTILLA = `fecha,cliente,equipo_modelo,equipo_serial,descripcion,monto,tecnico
15/01/2023,Juan García,Dispenser fría,,Cambio de filtro y sanitización,8500,Lucas
20/02/2023,María López,Dispenser caliente,SN-456,Reparación bomba y filtro,12000,Lucas
05/03/2023,Empresa SA,Dispenser fría,,Mantenimiento preventivo,6000,Lucas`;

function descargarPlantilla() {
    const blob = new Blob([PLANTILLA], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'plantilla-importacion-servicios.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function parsearCSVPreview(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    if (lineas.length < 2) return [];
    return lineas.slice(1, 6).map(l => {
        const cols = l.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        return {
            fecha:        cols[0] || '',
            cliente:      cols[1] || '',
            modelo:       cols[2] || '',
            serial:       cols[3] || '',
            descripcion:  cols[4] || '',
            monto:        cols[5] || '',
            tecnico:      cols[6] || '',
        };
    });
}

export default function ImportadorServiciosModal({ onCerrar, onImportado }) {
    const [tecnicos,   setTecnicos]   = useState([]);
    const [tecnicoId,  setTecnicoId]  = useState('');
    const [archivo,    setArchivo]    = useState(null);
    const [preview,    setPreview]    = useState([]);
    const [totalFilas, setTotalFilas] = useState(0);
    const [cargando,   setCargando]   = useState(false);
    const [resultado,  setResultado]  = useState(null);

    useEffect(() => {
        api.get('/ordenes/tecnicos').then(r => {
            setTecnicos(r.data || []);
            if (r.data?.length) setTecnicoId(r.data[0].id.toString());
        }).catch(() => {});
    }, []);

    const onArchivoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setArchivo(file);
        setResultado(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const texto = ev.target.result;
            const lineas = texto.split('\n').filter(l => l.trim());
            setTotalFilas(Math.max(0, lineas.length - 1));
            setPreview(parsearCSVPreview(texto));
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleImportar = async () => {
        if (!archivo)    { toast.error('Seleccioná un archivo CSV'); return; }
        if (!tecnicoId)  { toast.error('Seleccioná un técnico por defecto'); return; }
        setCargando(true);
        try {
            const fd = new FormData();
            fd.append('file', archivo);
            fd.append('tecnicoId', tecnicoId);
            const res = await api.post('/importacion/servicios', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResultado(res.data);
            if (res.data.importados > 0) {
                toast.success(`${res.data.importados} servicios importados`);
                onImportado?.();
            }
        } catch {
            toast.error('Error al importar');
        } finally {
            setCargando(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={!cargando ? onCerrar : undefined} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4">
                <div className="bg-card rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg max-h-[92vh] flex flex-col border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-chip sm:hidden" />

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0">
                        <div>
                            <h3 className="text-body-lg font-black text-ink uppercase">
                                Importar servicios históricos
                            </h3>
                            <p className="text-caption text-muted mt-0.5">
                                Cargá un CSV con tus reparaciones anteriores
                            </p>
                        </div>
                        <button onClick={onCerrar} disabled={cargando}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted bg-chip text-sm font-black active:scale-90 disabled:opacity-40">
                            ✕
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">

                        {/* Paso 1 — Plantilla */}
                        <div className="p-3 rounded-xl bg-panel border border-black/[0.05] dark:border-white/[0.05]">
                            <p className="text-label font-black text-muted uppercase tracking-wider mb-1">Paso 1 — Descargá la plantilla</p>
                            <p className="text-caption text-secondary mb-2 leading-snug">
                                Completala con tus datos en Google Sheets o Excel y guardala como CSV.
                            </p>
                            <button onClick={descargarPlantilla}
                                className="px-4 py-2 rounded-xl text-label font-black text-ink bg-chip active:scale-95 transition-all flex items-center justify-center gap-1.5">
                                <LuDownload size={14} /> Descargar plantilla CSV
                            </button>
                        </div>

                        {/* Paso 2 — Técnico default */}
                        <div>
                            <label className={LABEL}>Paso 2 — Técnico por defecto</label>
                            <p className="text-caption text-muted mb-1.5">Se usa si la columna "tecnico" del CSV está vacía o no coincide.</p>
                            <select
                                value={tecnicoId}
                                onChange={e => setTecnicoId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl text-body font-bold outline-none bg-chip text-ink border border-black/[0.07] dark:border-white/[0.07]">
                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>

                        {/* Paso 3 — Subir CSV */}
                        <div>
                            <label className={LABEL}>Paso 3 — Subí tu CSV</label>
                            <label className="flex flex-col items-center justify-center w-full py-6 rounded-xl border-2 border-dashed border-chip cursor-pointer hover:border-[#D13A28]/40 transition-all bg-[#EFEDEA]/50 dark:bg-[#1C1C1C]/50">
                                <LuFolderOpen size={24} className="mb-1" />
                                <span className="text-body font-black text-ink">
                                    {archivo ? archivo.name : 'Tocá para seleccionar archivo'}
                                </span>
                                {totalFilas > 0 && (
                                    <span className="text-caption text-muted mt-0.5">{totalFilas} fila{totalFilas !== 1 ? 's' : ''} detectada{totalFilas !== 1 ? 's' : ''}</span>
                                )}
                                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onArchivoChange} />
                            </label>
                        </div>

                        {/* Preview */}
                        {preview.length > 0 && !resultado && (
                            <div>
                                <p className="text-label font-black text-muted uppercase tracking-wider mb-2">
                                    Preview — primeras {preview.length} filas
                                </p>
                                <div className="rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                    <table className="w-full text-body">
                                        <thead>
                                            <tr className="bg-panel">
                                                {['Fecha','Cliente','Modelo','Serial','Monto','Técnico'].map(h => (
                                                    <th key={h} className="px-2 py-1.5 text-left font-black text-muted uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((r, i) => (
                                                <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-[#E8E4E0] dark:bg-[#1C1C1C]'}>
                                                    <td className="px-2 py-1.5 text-ink">{r.fecha}</td>
                                                    <td className="px-2 py-1.5 text-ink font-bold">{r.cliente}</td>
                                                    <td className="px-2 py-1.5 text-muted">{r.modelo}</td>
                                                    <td className="px-2 py-1.5 text-muted">{r.serial || '—'}</td>
                                                    <td className="px-2 py-1.5 text-ink">${r.monto}</td>
                                                    <td className="px-2 py-1.5 text-muted">{r.tecnico || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalFilas > 5 && (
                                    <p className="text-caption text-muted text-center mt-1">... y {totalFilas - 5} fila{totalFilas - 5 !== 1 ? 's' : ''} más</p>
                                )}
                            </div>
                        )}

                        {/* Resultado */}
                        {resultado && (
                            <div className={`p-4 rounded-2xl ${resultado.importados > 0 ? 'bg-[#D1FAE5] dark:bg-[#052E16]' : 'bg-[#FEE2E2] dark:bg-[#450A0A]'}`}>
                                <p className="text-body-lg font-black text-ink mb-1 flex items-center gap-1.5">
                                    {resultado.importados > 0 ? <LuCircleCheck size={16} /> : <LuTriangleAlert size={16} />} {resultado.importados} importados · {resultado.errores} errores
                                </p>
                                {resultado.detalleErrores?.length > 0 && (
                                    <div className="mt-2 space-y-0.5">
                                        {resultado.detalleErrores.map((e, i) => (
                                            <p key={i} className="text-caption text-red-600 dark:text-red-400">{e}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 px-6 py-4 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07]">
                        <button onClick={onCerrar} disabled={cargando}
                            className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-ink active:scale-95 disabled:opacity-40">
                            {resultado ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!resultado && (
                            <button onClick={handleImportar} disabled={cargando || !archivo}
                                className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                                {cargando ? 'Importando...' : (<><LuUpload size={14} /> Importar {totalFilas > 0 ? totalFilas + ' registros' : ''}</>)}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
