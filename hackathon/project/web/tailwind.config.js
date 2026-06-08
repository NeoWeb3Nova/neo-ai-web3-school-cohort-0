/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Impeccable design system — light mode defaults, dark via CSS variables
        'bg-primary': 'var(--color-bg)',
        'bg-surface': 'var(--color-paper)',
        'bg-card': 'var(--color-paper)',
        'bg-hover': 'var(--color-hover)',
        'bg-elevated': 'var(--color-elevated)',

        'text-primary': 'var(--color-text)',
        'text-secondary': 'var(--color-ash)',
        'text-muted': 'var(--color-muted)',

        'border-default': 'var(--color-rule)',
        'border-hover': 'var(--color-rule-hover)',

        'accent-gold': 'var(--color-kinpaku)',
        'accent-patina': 'var(--color-patina)',
        'accent-coral': 'var(--color-vermilion)',
        'accent-amber': 'var(--color-amber)',
        'accent-slate': 'var(--color-slate)',

        // Legacy aliases for page compatibility
        'accent-green': 'var(--color-patina)',
        'accent-red': 'var(--color-vermilion)',
        'accent-orange': 'var(--color-amber)',
        'accent-blue': 'var(--color-slate)',
        'accent-purple': '#9b8aad',
      },
      fontFamily: {
        sans: [
          '"Albert Sans"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Source Han Sans SC"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Alumni Sans Pinstripe"',
          '"Albert Sans"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Noto Sans SC"',
          '"SFMono-Regular"',
          '"Roboto Mono"',
          'Consolas',
          'monospace',
        ],
        wordmark: [
          '"Alumni Sans"',
          '"Alumni Sans Pinstripe"',
          '"Albert Sans"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          'Arial',
          'sans-serif',
        ],
      },
      spacing: {
        'im-xs': '8px',
        'im-sm': '16px',
        'im-md': '24px',
        'im-lg': '32px',
        'im-xl': '48px',
        'im-2xl': '80px',
        'im-3xl': '120px',
      },
      maxWidth: {
        'content': '900px',
        'page': '1400px',
      },
      borderRadius: {
        'im': '2px',
      },
      transitionTimingFunction: {
        'im': 'cubic-bezier(.2, .8, .2, 1)',
        'im-out': 'cubic-bezier(.16, 1, .3, 1)',
        'im-out-quint': 'cubic-bezier(.22, 1, .36, 1)',
      },
      fontSize: {
        'display': ['clamp(3.4rem, 6.5vw, 5.6rem)', { lineHeight: '1.02', letterSpacing: '-0.01em', fontWeight: '300' }],
        'headline': ['clamp(2.6rem, 4vw, 3.4rem)', { lineHeight: '1.04', fontWeight: '600' }],
        'title': ['1.18rem', { lineHeight: '1.35', fontWeight: '500' }],
        'body-im': ['1.02rem', { lineHeight: '1.8' }],
        'eyebrow': ['0.7rem', { lineHeight: '1.4', letterSpacing: '0.18em', fontWeight: '500' }],
        'wordmark': ['1.15rem', { lineHeight: '1', letterSpacing: '0.42em', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
}
