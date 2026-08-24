import React from 'react';
import FirmaPad from '../../ui/FirmaPad';

export default function PasoFirmas({
    firmaTecnico, setFirmaTecnico,
    editandoFirma, setEditandoFirma,
    firmaCliente, setFirmaCliente,
    incluirFirmas, setIncluirFirmas,
    guardarFirma, onBack, onNext,
}) {
    return (
        <>
            <button onClick={onBack}
                className="flex items-center gap-1 text-[12px] font-bold text-muted active:scale-95 mb-2">
                ← Volver
            </button>

            <button onClick={() => setIncluirFirmas(v => !v)}
                className="flex items-center gap-2 text-[11px] text-muted font-bold active:scale-95 transition-all">
                <span className={`w-8 h-4 rounded-full flex items-center transition-colors ${incluirFirmas ? 'bg-brand-red' : 'bg-chip'}`}>
                    <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${incluirFirmas ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
                Incluir firmas en el PDF
            </button>

            {incluirFirmas && (!editandoFirma ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-card">
                    <span className="text-[12px] font-bold text-[#16A34A]">✓ Firma del tecnico guardada</span>
                    <button onClick={() => setEditandoFirma(true)}
                        className="ml-auto text-[11px] font-bold text-muted">Cambiar</button>
                </div>
            ) : (
                <div className="space-y-2">
                    <FirmaPad label="Firma del tecnico" value={firmaTecnico} onChange={setFirmaTecnico} height={100} />
                    <div className="flex items-center gap-2">
                        <button onClick={guardarFirma} disabled={!firmaTecnico}
                            className="text-[11px] px-3 py-1.5 rounded-full bg-[#D13A28] text-white font-bold disabled:opacity-40 active:scale-95">
                            Guardar mi firma
                        </button>
                        <span className="text-[10px] text-muted">Se recordara para proximas veces</span>
                    </div>
                </div>
            ))}

            {incluirFirmas && (
                <FirmaPad label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente} height={160} />
            )}

            <button onClick={onNext}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-brand-red active:scale-[0.98] transition-all">
                Definir cobro →
            </button>
        </>
    );
}
