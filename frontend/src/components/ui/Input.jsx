import React from 'react';

export default function Input({ label, error, className = '', ...props }) {
    return (
        <div className="mb-4 w-full">
            {label && (
                <label className="block text-[11px] font-black text-[#A8A29E] mb-2 uppercase tracking-wide">
                    {label}
                </label>
            )}
            <input
                {...props}
                className={`w-full p-3.5 rounded-xl text-[16px] outline-none transition-all duration-200
                    bg-[#C0BCB6] dark:bg-[#2E2E2E]
                    text-[#1C1917] dark:text-[#F0EEE9]
                    ${error
                        ? 'border-2 border-[#D13A28] dark:border-[#E8422F] focus:ring-2 focus:ring-[#D13A28]/30'
                        : 'border border-black/[0.07] dark:border-white/[0.07] focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]'
                    } ${className}`}
            />
        </div>
    );
}
