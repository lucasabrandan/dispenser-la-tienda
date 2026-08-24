import React from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

const FOTO_KEYS = ['fotoUrl', 'fotoUrl2', 'fotoUrl3'];

export default function FotosUploader({ form, fotoPreviews, onFotoChange }) {
    return (
        <div className="bg-[#F5F3F1] dark:bg-[#1C1C1C] p-3 rounded-2xl border border-dashed border-chip">
            <label className="text-[10px] font-black uppercase tracking-wide text-muted mb-2 block">
                Fotos del producto (hasta 3)
            </label>
            <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(i => {
                    const preview = fotoPreviews[i]
                        || (form[FOTO_KEYS[i]] ? construirUrlFoto(form[FOTO_KEYS[i]]) : '');
                    return (
                        <div key={i} className="relative">
                            <label className="cursor-pointer block">
                                <div className="w-full aspect-square bg-card rounded-xl flex justify-center items-center overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                    {preview
                                        ? <img src={preview} className="w-full h-full object-cover" alt={`foto ${i+1}`} />
                                        : <span className="text-2xl opacity-30">{i === 0 ? '📸' : '+'}</span>
                                    }
                                </div>
                                <input type="file" accept="image/*" onChange={e => onFotoChange(e, i)} className="hidden" />
                            </label>
                            <span className="absolute top-1 left-1 text-[8px] font-black bg-black/40 text-white px-1 rounded">
                                {i === 0 ? 'Principal' : `Extra ${i}`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
