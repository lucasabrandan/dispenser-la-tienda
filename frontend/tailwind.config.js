/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          red: 'var(--color-brand-red)',
          green: 'var(--color-brand-green)',
          amber: 'var(--color-brand-amber)',
        },
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        secondary: 'var(--color-text-secondary)',
        page: 'var(--color-bg-page)',
        card: 'var(--color-bg-card)',
        chip: 'var(--color-chip-bg)',
        panel: 'var(--color-panel-bg)',
        warning: { bg: 'var(--warning-bg)', tx: 'var(--warning-tx)' },
        success: { bg: 'var(--success-bg)', tx: 'var(--success-tx)' },
        danger:  { bg: 'var(--danger-bg)',  tx: 'var(--danger-tx)'  },
        info:    { bg: 'var(--info-bg)',    tx: 'var(--info-tx)'    },
      }
    },
  },
  plugins: [],
}