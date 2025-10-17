/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores dominicanos oficiales
        'dominican-blue': '#002D62',
        'dominican-red': '#CE1126',
        'dominican-white': '#FFFFFF',
        // Variaciones para mejor UX
        'dominican-blue-light': '#004085',
        'dominican-blue-dark': '#001A3A',
        'dominican-red-light': '#E8253A',
        'dominican-red-dark': '#A50E1E',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}