/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Using class strategy but we'll always apply the dark class
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#0F9297',
          50: '#e6f7f8',
          100: '#cceff0',
          200: '#99dfe2',
          300: '#66cfd3',
          400: '#33bfc5',
          500: '#0F9297',
          600: '#0d7e82',
          700: '#0a656a',
          800: '#084c51',
          900: '#053339',
        },
      },
    },
  },
  plugins: [],
}
