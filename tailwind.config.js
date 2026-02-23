/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          2: '#16213e',
          3: '#0f3460'
        },
        accent: {
          DEFAULT: '#e94560',
          hover: '#c73652'
        }
      }
    }
  },
  plugins: []
}
