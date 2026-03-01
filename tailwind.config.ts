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
        'health-error': 'rgb(239 68 68)',       // red-500
        'health-warning': 'rgb(245 158 11)',    // amber-500
        'health-ok': 'rgb(34 197 94)',          // green-500
        'health-info': 'rgb(59 130 246)',       // blue-500

        // Graph edge colors
        'edge-active': 'rgb(99 102 241)',       // indigo-500
        'edge-blocked': 'rgb(107 114 128)',     // gray-500
        'edge-cycle': 'rgb(239 68 68)',         // red-500

        // Entry type badge colors
        'entry-constant': 'rgb(168 85 247)',    // purple-500
        'entry-keyword': 'rgb(59 130 246)',     // blue-500
        'entry-selective': 'rgb(20 184 166)',   // teal-500
        'entry-disabled': 'rgb(107 114 128)',   // gray-500
      },
    },
  },
  plugins: [],
}

export default config
