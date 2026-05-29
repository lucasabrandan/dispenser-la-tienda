import React, { useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

async function comprimirFoto(file) {
    try {
        return await imageCompression(file, {
            maxSizeMB: 0.3, maxWidthOrHeight: 900,
            useWebWorker: false, fileType: 'image/jpeg',
        });
    } catch { return file; }
}

function fileADataUrl(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror  = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

export default function FotoUpload({ label, foto, onChange }) {
    const refCamara  = useRef(null);
    const refGaleria = useRef(null);

    const preview = !foto ? null
        : foto.startsWith('data:') ? foto
        : construirUrlFoto(foto);

    const handleFile = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const compressed = await comprimirFoto(file);
        const dataUrl    = await fileADataUrl(compressed);
        if (dataUrl) onChange(dataUrl);
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="relative rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-[#E8E5E0] dark:bg-[#2E2E2E] aspect-[3/4] flex items-center justify-center">
                {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-2">
                        <p className="text-2xl mb-1">📷</p>
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase">{label}</p>
                    </div>
                )}
                <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-black uppercase text-white ${preview ? 'bg-black/50' : 'bg-[#D13A28]/80 dark:bg-[#E8422F]/80'}`}>
                    {preview ? `✓ ${label}` : `+ ${label}`}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => refCamara.current?.click()}
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
                    📷 Cámara
                </button>
                <button type="button" onClick={() => refGaleria.current?.click()}
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase text-[#1C1917] dark:text-[#F0EEE9] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95 transition-all">
                    🖼️ Galería
                </button>
            </div>
            <input ref={refCamara}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input ref={refGaleria} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    );
}
