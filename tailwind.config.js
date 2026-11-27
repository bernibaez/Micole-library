/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#101D35',
          secondary: '#1C3152',
          muted: '#2A4063',
        },
        gold: {
          DEFAULT: '#C5A15B',
          soft: '#F7F1E3',
          dark: '#967638',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F4F6F9',
          tertiary: '#EAEEF4',
        },
        sand: {
          DEFAULT: '#EFECE3',
          deep: '#E0DAC7',
          soft: '#F7F5EE',
        },
        ink: {
          DEFAULT: '#343B49',
          muted: '#636D7E',
          subtle: '#8A94A6',
        },
        line: {
          DEFAULT: '#E6E9EF',
          strong: '#D3D9E3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        editorial: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        cover: '0 8px 20px -6px rgba(16, 29, 53, 0.22), 0 3px 8px -2px rgba(16, 29, 53, 0.12), -3px 2px 6px rgba(16, 29, 53, 0.08)',
        'cover-hover': '0 22px 38px -10px rgba(16, 29, 53, 0.30), 0 8px 16px -4px rgba(16, 29, 53, 0.14), -4px 4px 10px rgba(16, 29, 53, 0.10)',
        'editorial-cover': '0 20px 36px -10px rgba(16, 29, 53, 0.28), 0 6px 14px -4px rgba(16, 29, 53, 0.12)',
        pill: '0 10px 28px -10px rgba(16, 29, 53, 0.12), 0 2px 8px -2px rgba(16, 29, 53, 0.05)',
        subtle: '0 1px 2px rgba(16, 29, 53, 0.04), 0 4px 12px rgba(16, 29, 53, 0.04)',
        popover: '0 10px 30px -5px rgba(16, 29, 53, 0.12), 0 4px 12px -4px rgba(16, 29, 53, 0.06)',
      },
      borderRadius: {
        book: '3px 11px 11px 3px',
      },
    },
  },
  plugins: [],
};
