/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Civic royal-blue palette with a warm saffron accent.
        gov: {
          50:  '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd2ff',
          300: '#93b4ff',
          400: '#6389f5',
          500: '#4267d9',
          600: '#314fb8',
          700: '#263d91',
          800: '#1f3275',
          900: '#19285d',
          950: '#111c42',
        },
        earth: {
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
