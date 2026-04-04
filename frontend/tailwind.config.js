/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  safelist: [
    'ds-input',
    'ds-toggle',
    'ds-toggle active',
    'ds-card-full',
    'ds-raised-full',
    'ds-text-1',
    'ds-text-2',
    'ds-text-3',
    'ds-brand',
    'ds-gold',
    'ds-btn-brand',
    'ds-btn-ghost',
    'badge',
    'badge-success',
    'badge-warning',
    'badge-danger',
    'badge-info',
    'badge-neutral',
    'toggle-title',
    'toggle-hint',
    'active',
  ],
  theme: {
    extend: {
      colors: {
        'ml-yellow': '#FFF159',
        'ml-blue':   '#3483FA',
        'ml-bg':     '#EDEDED',
        'ml-card':   '#FFFFFF',
      }
    },
  },
  plugins: [],
}