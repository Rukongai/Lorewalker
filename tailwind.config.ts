import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Health severity colors
        'health-error':   'var(--color-ctp-red)',
        'health-warning': 'var(--color-ctp-yellow)',
        'health-ok':      'var(--color-ctp-green)',
        'health-info':    'var(--color-ctp-blue)',

        // Graph edge colors
        'edge-active':  'var(--color-ctp-blue)',
        'edge-blocked': 'var(--color-ctp-overlay0)',
        'edge-cycle':   'var(--color-ctp-red)',

        // Entry type badge colors
        'entry-constant':  'var(--color-ctp-mauve)',
        'entry-keyword':   'var(--color-ctp-blue)',
        'entry-selective': 'var(--color-ctp-teal)',
        'entry-disabled':  'var(--color-ctp-overlay0)',
      },
    },
  },
  plugins: [],
}

export default config
