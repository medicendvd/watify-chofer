/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mint/teal brillante — color principal de la app
        water: {
          50:  '#e0fdf7',
          100: '#b3f5e8',
          200: '#80edd9',
          300: '#58FFF5',
          400: '#10ffe0',
          500: '#00E5B9',
          600: '#00CCA6',
          700: '#00B891',
          800: '#009178',
          900: '#006B59',
        },
        // Azul royal profundo — headers de tarjetas y bloques de contraste
        royal: '#1a2fa8',
      }
    },
  },
  plugins: [],
}
