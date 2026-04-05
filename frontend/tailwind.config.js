/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00a3b1',
          light: '#00c9d3',
        },
        shell: '#e9ecef',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 40px rgba(15, 23, 42, 0.08)',
        soft: '0 2px 8px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
