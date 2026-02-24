/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hot-bubblegum': '#FF6BA8',
        'electric-mint': '#4EFFC4',
        'lemon-pop': '#FFE66D',
        'grape-neon': '#B565FF',
        'cherry-punch': '#FF3D71',
        'arcade-orange': '#FF9F1C',
        'pixel-cyan': '#00D9FF',
        'lime-fizz': '#CAFFBF',
        'cream': '#FFF8F0',
        'charcoal': '#2D3142',
      },
      fontFamily: {
        display: ['Anybody', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'manga': '6px 6px 0px 0px rgba(0,0,0,0.15)',
        'manga-lg': '8px 8px 0px 0px rgba(0,0,0,0.2)',
        'neon-pink': '0 0 20px rgba(255, 107, 168, 0.6)',
        'neon-cyan': '0 0 20px rgba(78, 255, 196, 0.6)',
        'neon-purple': '0 0 20px rgba(181, 101, 255, 0.6)',
        'neon-yellow': '0 0 20px rgba(255, 230, 109, 0.7)',
        'btn-purple': '8px 8px 0px 0px #B565FF',
        'btn-pink': '8px 8px 0px 0px #FF6BA8',
        'btn-cyan': '8px 8px 0px 0px #00D9FF',
      },
      borderRadius: {
        'card': '20px',
        'pill': '50px',
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '6': '6px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'confetti-fall': 'confettiFall 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 168, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 107, 168, 0.8)' },
        },
        confettiFall: {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100px) rotate(360deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
