import { useRef, useEffect, useState, useCallback } from 'react';

// Canvas para capturar firma a mano alzada
export default function FirmaPad({ value, onChange, label, height = 110 }) {
    const canvasRef = useRef(null);
    const drawing   = useRef(false);
    const [isEmpty, setIsEmpty] = useState(!value);

    // Carga imagen guardada al montar o cuando cambia `value` externamente
    useEffect(() => {
        if (!value) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setIsEmpty(false);
        };
        img.src = value;
    }, []);                 // solo al montar — no re-aplica si onChange actualiza value

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const src  = e.touches ? e.touches[0] : e;
        return {
            x: (src.clientX - rect.left) * (canvas.width  / rect.width),
            y: (src.clientY - rect.top)  * (canvas.height / rect.height),
        };
    };

    const startDraw = useCallback(e => {
        e.preventDefault();
        drawing.current = true;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const { x, y } = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, []);

    const draw = useCallback(e => {
        if (!drawing.current) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const { x, y } = getPos(e, canvas);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke();
        setIsEmpty(false);
    }, []);

    const stopDraw = useCallback(() => {
        if (!drawing.current) return;
        drawing.current = false;
        const canvas = canvasRef.current;
        onChange?.(canvas.toDataURL('image/png'));
    }, [onChange]);

    const limpiar = () => {
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onChange?.(null);
    };

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <span className="text-xs font-semibold text-ink">
                    {label}
                </span>
            )}
            <div className="relative border border-chip rounded-lg bg-white overflow-hidden"
                 style={{ height }}>
                <canvas
                    ref={canvasRef}
                    width={560}
                    height={height * 2}
                    className="w-full h-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                />
                {/* Línea guía */}
                <div className="absolute bottom-8 left-4 right-4 border-b border-dashed border-[#E8E5E0] pointer-events-none" />
                {isEmpty && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-muted pointer-events-none select-none">
                        Firmar aquí
                    </span>
                )}
            </div>
            <button
                type="button"
                onClick={limpiar}
                className="self-end text-[10px] text-muted hover:text-[#D13A28] transition-colors"
            >
                Limpiar
            </button>
        </div>
    );
}
