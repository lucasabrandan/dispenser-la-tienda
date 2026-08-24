/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        // Escala tipográfica fija (auditoría UX/UI, punto A2): en vez de
        // valores sueltos pixel a pixel, 4 tamaños con un rol claro cada uno.
        label: ['10px', { lineHeight: '1.3' }],     // etiquetas/eyebrows/metadatos chicos
        caption: ['11px', { lineHeight: '1.4' }],   // texto secundario, ayudas, notas
        body: ['13px', { lineHeight: '1.5' }],      // texto principal / resultados que se leen
        'body-lg': ['14px', { lineHeight: '1.5' }], // texto principal con énfasis
      },
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
