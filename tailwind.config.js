/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#063126', // Dark green from sidebar/header
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#93D533', // Lime green highlight
          foreground: '#063126',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        background: '#f8fafc',
        foreground: '#0f172a',
        border: '#e2e8f0',
      }
    },
  },
  plugins: [],
}
