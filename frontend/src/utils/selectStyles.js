export const darkSelectStyles = {
    control: (base) => ({
        ...base,
        backgroundColor: 'var(--bg-main)',
        borderColor: 'var(--border-color)',
        borderRadius: 'var(--border-radius-btn)',
        padding: '2px',
        color: 'white'
    }),
    menu: (base) => ({ ...base, backgroundColor: 'var(--bg-card)' }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? 'var(--brand-red)' : 'var(--bg-card)',
        color: 'white',
        cursor: 'pointer'
    }),
    singleValue: (base) => ({ ...base, color: 'white' }),
    placeholder: (base) => ({ ...base, color: 'var(--text-secondary)' }),
    input: (base) => ({ ...base, color: 'white' }),
};