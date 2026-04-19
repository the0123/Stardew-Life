import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        farm: {
          green: '#5c8a3c',
          dark: '#2d5016',
          brown: '#8b6914',
          gold: '#f5c842',
          soil: '#6b4f2a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
