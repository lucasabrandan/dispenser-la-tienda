import React, { useRef, useState, useEffect } from 'react';

/**
 * FirmaModal — Canvas de firma digital para el cliente.
 * Soporta touch (celular/tablet) y mouse (escritorio).
 * Resuelve la Promise vía onConfirmar(dataUrl) o onOmitir().
 */
export default function FirmaModal({ onConfirmar, onOmitir }) {
    const canvasRef  = useRef(null);
    const dibujando  = useRef(false);
    const ultimoPto  = useRef(null);
    const [tieneFirma, setTieneFirma] = useState(false);

    // Inicializar canvas con fondo blanco
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle   = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
    }, []);

    const getPosicion = (e) => {
        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const src    = e.touches ? e.touches[0] : e;
        return {
            x: (src.clientX - rect.left) * scaleX,
            y: (src.clientY - rect.top)  * scaleY,
        };
    };

    const iniciar = (e) => {
        e.preventDefault();
        dibujando.current = true;
        ultimoPto.current = getPosicion(e);
    };

    const mover = (e) => {
        e.preventDefault();
        if (!dibujando.current) return;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const pos    = getPosicion(e);
        ctx.beginPath();
        ctx.moveTo(ultimoPto.current.x, ultimoPto.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ultimoPto.current = pos;
        setTieneFirma(true);
    };

    const detener = () => { dibujando.current = false; };

    const limpiar = () => {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTieneFirma(false);
    };

    const confirmar = () => onConfirmar(canvasRef.current.toDataURL('image/png'));

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0A]/95 backdrop-blur-sm">

            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2E2E2E]">
                <div>
                    <h2 className="text-[#F0EEE9] font-bold text-base">Firma del cliente</h2>
                    <p className="text-[#A8A29E] text-xs mt-0.5">
                        Firmar con el dedo en el recuadro blanco
                    </p>
                </div>
                <button
                    onClick={onOmitir}
                    className="text-[#A8A29E] text-sm font-semibold py-1.5 px-4 rounded-xl bg-[#2E2E2E] active:scale-95 transition-transform"
                >
                    Omitir
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center p-5">
                <canvas
                    ref={canvasRef}
                    width={540}
                    height={240}
                    className="w-full max-w-xl rounded-2xl shadow-2xl"
                    style={{ touchAction: 'none', cursor: 'crosshair' }}
                    onPointerDown={iniciar}
                    onPointerMove={mover}
                    onPointerUp={detener}
                    onPointerLeave={detener}
                />
            </div>

            {/* Acciones */}
            <div className="flex gap-3 px-5 py-4 border-t border-[#2E2E2E]">
                <button
                    onClick={limpiar}
                    className="flex-1 py-3.5 rounded-xl bg-[#2E2E2E] text-[#F0EEE9] font-bold text-sm active:scale-95 transition-transform"
                >
                    Limpiar
                </button>
                <button
                    onClick={confirmar}
                    disabled={!tieneFirma}
                    className="flex-[2] py-3.5 rounded-xl bg-[#D13A28] text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                >
                    Confirmar firma →
                </button>
            </div>
        </div>
    );
}
