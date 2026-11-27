/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#121D32',
          secondary: '#1D2E4D',
          muted: '#2D4164',
        },
        gold: {
          DEFAULT: '#C1A15C',
          soft: '#F5EFE0',
          dark: '#927437',
        },
        forest: {
          DEFAULT: '#294C43',
          soft: '#EBF2EF',
          hover: '#1F3B34',
        },
        paper: {
          DEFAULT: '#F7F6F2',
          warm: '#EFECE4',
          deep: '#E4DFD3',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F1EFE9',
          tertiary: '#E7E4DC',
        },
        sand: {
          DEFAULT: '#EFECE4',
          deep: '#DFD9C9',
          soft: '#F7F6F2',
        },
        ink: {
          DEFAULT: '#242C3A',
          muted: '#5A6475',
          subtle: '#7F899B',
        },
        line: {
          DEFAULT: '#E5E2D9',
          strong: '#D4CFC2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        editorial: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        cover: '0 8px 18px -6px rgba(18, 29, 50, 0.22), 0 3px 7px -2px rgba(18, 29, 50, 0.12), -3px 2px 5px rgba(18, 29, 50, 0.08)',
        'cover-hover': '0 18px 34px -10px rgba(18, 29, 50, 0.28), 0 7px 14px -4px rgba(18, 29, 50, 0.14), -4px 4px 10px rgba(18, 29, 50, 0.09)',
        'editorial-cover': '0 16px 30px -10px rgba(18, 29, 50, 0.24), 0 5px 12px -4px rgba(18, 29, 50, 0.10)',
        pill: '0 8px 24px -10px rgba(18, 29, 50, 0.10), 0 2px 6px -2px rgba(18, 29, 50, 0.04)',
        subtle: '0 1px 2px rgba(18, 29, 50, 0.04), 0 4px 14px rgba(18, 29, 50, 0.04)',
        popover: '0 12px 32px -6px rgba(18, 29, 50, 0.14), 0 4px 12px -4px rgba(18, 29, 50, 0.06)',
      },
      borderRadius: {
        book: '3px 11px 11px 3px',
      },
    },
  },
  plugins: [],
};
