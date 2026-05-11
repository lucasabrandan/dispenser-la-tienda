import React from 'react';
import { useMontos } from '../../context/MontosContext';

// ── Monto ocultable ───────────────────────────────────────────────────────────
export function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return (
        <span className={className}>
            ${typeof valor === 'number' ? valor.toLocaleString() : valor}
        </span>
    );
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
export function StepBar({ paso, total }) {
    return (
        <div className="flex gap-1.5 mb-4">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                        background: i <= paso ? '#D13A28' : '#C0BCB6',
                        opacity: i < paso ? 0.45 : 1,
                    }}
                />
            ))}
        </div>
    );
}

// ── Header de paso ────────────────────────────────────────────────────────────
export function StepHeader({ paso, total, titulo, subtitulo }) {
    return (
        <div className="px-5 pt-5 pb-4">
            <StepBar paso={paso} total={total} />
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">
                Paso {paso + 1} de {total}
            </p>
            <h3 className="text-[18px] font-black leading-tight text-[#1C1917] dark:text-[#F0EEE9]">
                {titulo}
            </h3>
            {subtitulo && (
                <p className="text-[12px] mt-0.5 text-[#A8A29E]">{subtitulo}</p>
            )}
        </div>
    );
}

// ── Label de sección ──────────────────────────────────────────────────────────
export function Label({ children }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#A8A29E]">
            {children}
        </p>
    );
}

// ── Botón primario (siguiente) ────────────────────────────────────────────────
export function NextBtn({ onClick, children, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-40 bg-[#D13A28] dark:bg-[#E8422F]"
        >
            {children} →
        </button>
    );
}

// ── Botón secundario (volver) ─────────────────────────────────────────────────
export function BackBtn({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]"
        >
            ← Volver
        </button>
    );
}

// ── Card del sistema ──────────────────────────────────────────────────────────
export function DSCard({ children, className = '' }) {
    return (
        <div className={`rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] ${className}`}>
            {children}
        </div>
    );
}

// ── Input del sistema ─────────────────────────────────────────────────────────
export function DSInput({ label, className = '', ...props }) {
    return (
        <div>
            {label && <Label>{label}</Label>}
            <input
                {...props}
                className={`
                    w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
                    bg-[#C0BCB6] dark:bg-[#2E2E2E]
                    text-[#1C1917] dark:text-[#F0EEE9]
                    border border-black/10 dark:border-white/10
                    placeholder-[#A8A29E]
                    focus:border-[#D13A28] dark:focus:border-[#E8422F]
                    focus:ring-2 focus:ring-[#D13A28]/20
                    transition-all
                    ${className}
                `}
            />
        </div>
    );
}

// ── Textarea del sistema ──────────────────────────────────────────────────────
export function DSTextarea({ label, className = '', ...props }) {
    return (
        <div>
            {label && <Label>{label}</Label>}
            <textarea
                {...props}
                className={`
                    w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none resize-none
                    bg-[#C0BCB6] dark:bg-[#2E2E2E]
                    text-[#1C1917] dark:text-[#F0EEE9]
                    border border-black/10 dark:border-white/10
                    placeholder-[#A8A29E]
                    focus:border-[#D13A28] dark:focus:border-[#E8422F]
                    focus:ring-2 focus:ring-[#D13A28]/20
                    transition-all
                    ${className}
                `}
            />
        </div>
    );
}

// ── Select styles para react-select ──────────────────────────────────────────
export function buildSelectStyles(isDark) {
    return {
        control: (base, state) => ({
            ...base,
            background:  isDark ? '#2E2E2E' : '#C0BCB6',
            border:      state.isFocused
                ? `1.5px solid ${isDark ? '#E8422F' : '#D13A28'}`
                : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            minHeight:    '44px',
            boxShadow:    state.isFocused ? `0 0 0 3px rgba(209,58,40,0.15)` : 'none',
            '&:hover':    { borderColor: isDark ? '#E8422F' : '#D13A28' },
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
                ? (isDark ? '#E8422F' : '#D13A28')
                : state.isFocused
                    ? (isDark ? '#3A3A3A' : '#D8D4CE')
                    : (isDark ? '#2E2E2E' : '#C0BCB6'),
            color:       state.isSelected ? '#fff' : isDark ? '#F0EEE9' : '#1C1917',
            padding:     '6px 12px',
            fontSize:    '13px',
            fontWeight:  '500',
        }),
        menu:        b => ({
            ...b,
            background:   isDark ? '#2E2E2E' : '#C0BCB6',
            borderRadius: '12px',
            border:       isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.2)',
        }),
        menuList:    b => ({ ...b, maxHeight: '220px', overflowY: 'auto' }),
        menuPortal:  b => ({ ...b, zIndex: 9999 }),
        singleValue: b => ({ ...b, color: isDark ? '#F0EEE9' : '#1C1917', fontWeight: '600', fontSize: '13px' }),
        placeholder: b => ({ ...b, color: '#A8A29E', fontSize: '13px' }),
        input:       b => ({ ...b, color: isDark ? '#F0EEE9' : '#1C1917' }),
        clearIndicator:    b => ({ ...b, color: '#A8A29E', '&:hover': { color: '#D13A28' } }),
        dropdownIndicator: b => ({ ...b, color: '#A8A29E' }),
    };
}