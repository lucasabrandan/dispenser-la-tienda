export const adaptiveSelectStyles = {
    control: (base, state) => ({
        ...base,
        backgroundColor: 'var(--bg-card)',
        borderColor: state.isFocused ? 'var(--ml-blue)' : 'var(--border-color)',
        borderRadius: '12px', // Coincide con nuestros inputs
        padding: '6px',
        minHeight: '55px',
        color: 'var(--text-primary)',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(52, 131, 250, 0.2)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        borderWidth: '1px',
    }),
    menu: (base) => ({ 
        ...base, 
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        zIndex: 50
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected 
            ? 'var(--ml-blue)' 
            : state.isFocused 
                ? 'rgba(52, 131, 250, 0.1)' 
                : 'transparent',
        color: state.isSelected ? '#FFFFFF' : 'var(--text-primary)',
        padding: '12px 15px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        active: {
            backgroundColor: 'var(--ml-blue)',
        }
    }),
    singleValue: (base) => ({ 
        ...base, 
        color: 'var(--text-primary)',
        fontWeight: '700' 
    }),
    placeholder: (base) => ({ 
        ...base, 
        color: 'var(--text-secondary)',
        fontSize: '14px',
        fontWeight: '500'
    }),
    input: (base) => ({ 
        ...base, 
        color: 'var(--text-primary)' 
    }),
    dropdownIndicator: (base) => ({
        ...base,
        color: 'var(--text-secondary)'
    }),
    indicatorSeparator: () => ({
        display: 'none'
    })
};