/** @type {import('tailwindcss').Config} */
// Same theme the page used to declare inline for cdn.tailwindcss.com, moved
// here so the CSS is compiled once at build instead of by a JIT compiler
// shipped to every visitor. Class names and output are unchanged.
module.exports = {
  // Scans the built output, so run build:pages before build:css (npm run
  // build does both, in that order).
  content: ['./*.html', './*/index.html', '!./node_modules/**'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
