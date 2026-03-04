/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // ¡ESTA LÍNEA ES CLAVE!
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ml-yellow': '#FFF159',
        'ml-blue': '#3483FA',
        'ml-bg': '#EDEDED',
        'ml-card': '#FFFFFF',
        'ml-text-main': '#333333',
        'ml-text-sec': '#666666',
        'ml-border': '#DDDDDD',
        'ml-success': '#00A650',
        'ml-error': '#F23D4F',
      }
    },
  },
  plugins: [],
}