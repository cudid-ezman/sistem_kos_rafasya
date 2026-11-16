/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          light: '#E6F7F5',
          dark: '#0F766E',
        },
        surface: '#F9FAFB',
      },
    },
  },
  plugins: [],
}