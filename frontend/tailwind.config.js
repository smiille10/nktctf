/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nkt: {
          bg: '#080d14',
          card: '#0d1520',
          border: '#1a2a3a',
          green: '#00ff88',
          cyan: '#00d4ff',
          red: '#ff4560',
          yellow: '#ffd700',
          text: '#c9d8e8',
          muted: '#4a6070',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Orbitron"', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(0,255,136,0.3)',
        'neon-lg': '0 0 40px rgba(0,255,136,0.2)',
        card: '0 4px 30px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'flicker': 'flicker 4s linear infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.7' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        }
      }
    },
  },
  plugins: [],
}