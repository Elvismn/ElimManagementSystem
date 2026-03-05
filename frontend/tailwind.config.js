/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          dark: '#0f172a',
          darker: '#0a0f1c',
          blue: '#1e40af',
          purple: '#7c3aed',
          gradient: {
            start: '#1e40af',
            end: '#7c3aed'
          }
        }
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'app-background': 'radial-gradient(circle at 15% 50%, rgba(30, 64, 175, 0.1) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 50%), linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      },
      backdropBlur: {
        'glass': '16px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'premium': '0 20px 40px -10px rgba(0, 0, 0, 0.1), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)'
      }
    },
  },
  plugins: [],
}