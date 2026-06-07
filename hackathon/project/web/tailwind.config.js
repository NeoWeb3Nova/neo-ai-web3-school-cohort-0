/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0B0E11',
        'bg-surface': '#151A21',
        'bg-card': '#1C2128',
        'bg-hover': '#242B35',
        'bg-elevated': '#2A3340',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8B949E',
        'text-muted': '#5C6875',
        'border-default': '#2E3640',
        'border-hover': '#3D4754',
        'accent-green': '#00D26A',
        'accent-red': '#FF4D4D',
        'accent-orange': '#F59E0B',
        'accent-blue': '#3B82F6',
        'accent-purple': '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
