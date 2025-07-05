/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // ← Dice dónde buscar clases
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}