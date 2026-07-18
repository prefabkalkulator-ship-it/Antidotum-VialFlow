/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0C',
        surface: '#1A1A1C',
        primary: {
          light: '#FA8BFF',
          DEFAULT: '#F472B6',
          dark: '#DB2777',
        },
        text: '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Comfortaa"', '"ITC Avant Garde"', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1.5rem',  // 24px
        '2xl': '2rem',   // 32px
        'flask': '24px', // custom for Kolba/Flask shapes
      }
    },
  },
  plugins: [],
}
