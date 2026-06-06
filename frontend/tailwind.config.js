/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        bg:      '#080c12',
        surface: '#0f1520',
        raised:  '#161e2e',
        gold:    '#F5A623',
        green:   '#3ecf8e',
      },
    },
  },
  plugins: [],
}
