import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuCamera, LuX } from 'react-icons/lu';
import api from '../../services/api';
import { comprimirFoto } from '../../utils/comprimirFoto';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

// Fotos del problema en un pedido de empresa (8-oct-2026). Hasta 4. Se suben al
// elegirlas (comprimidas) y el pedido guarda solo el nombre de cada archivo.
export const MAX_FOTOS = 4;

export function CargarFotos({ fotos, onChange }) {
    const ref = useRef(null);
    const [subiendo, setSubiendo] = useState(0);

    const elegir = async (e) => {
        const files = Array.from(e.target.files || []).slice(0, MAX_FOTOS - fotos.length);
        e.target.value = '';
        if (!files.length) return;
        setSubiendo(files.length);
        const nuevas = [];
        for (const f of files) {
            try {
                const chica = await comprimirFoto(f);
                const fd = new FormData();
                fd.append('file', chica, 'foto.jpg');
                const r = await api.post('/empresa/fotos', fd);
                if (r.data?.filename) nuevas.push(r.data.filename);
            } catch (err) {
                toast.error(err?.response?.data?.mensaje || 'No se pudo subir una foto');
            } finally { setSubiendo(n => n - 1); }
        }
        onChange([...fotos, ...nuevas].slice(0, MAX_FOTOS));
    };

    return (
        <div className="flex flex-wrap gap-2">
            {fotos.map(f => (
                <div key={f} className="relative w-20 h-20 rounded-xl overflow-hidden bg-chip">
                    <img src={construirUrlFoto(f)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => onChange(fotos.filter(x => x !== f))} aria-label="Quitar foto"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><LuX size={13} /></button>
                </div>
            ))}
            {Array.from({ length: subiendo }).map((_, i) => <div key={`s${i}`} className="w-20 h-20 rounded-xl bg-chip animate-pulse" />)}
            {fotos.length + subiendo < MAX_FOTOS && (
                <button type="button" onClick={() => ref.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 text-muted flex flex-col items-center justify-center gap-1 active:scale-95">
                    <LuCamera size={20} /><span className="text-[11px] font-bold">Agregar</span>
                </button>
            )}
            <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={elegir} />
        </div>
    );
}

// Fotos ya guardadas (pedido, visita del técnico): tocar una la abre grande
export function VerFotos({ fotos, className = '' }) {
    const [grande, setGrande] = useState(null);
    if (!fotos?.length) return null;
    return (
        <>
            <div className={`flex flex-wrap gap-2 ${className}`}>
                {fotos.map(f => (
                    <button key={f} type="button" onClick={e => { e.stopPropagation(); setGrande(f); }} className="w-20 h-20 rounded-xl overflow-hidden bg-chip active:scale-95">
                        <img src={construirUrlFoto(f)} alt="Foto del problema" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                ))}
            </div>
            {grande && (
                <div className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4" onClick={e => { e.stopPropagation(); setGrande(null); }}>
                    <img src={construirUrlFoto(grande)} alt="Foto del problema" className="max-w-full max-h-full rounded-xl" />
                    <button type="button" aria-label="Cerrar" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><LuX size={20} /></button>
                </div>
            )}
        </>
    );
}
