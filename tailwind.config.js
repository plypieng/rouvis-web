/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-zen-kaku)', 'ui-sans-serif', 'sans-serif'],
        heading: ['var(--font-shippori)', 'var(--font-zen-kaku)', 'serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        brand: {
          seedling: 'hsl(var(--brand-seedling))',
          waterline: 'hsl(var(--brand-waterline))',
        },
        risk: {
          safe: 'hsl(var(--state-success))',
          watch: 'hsl(var(--risk-watch))',
          warning: 'hsl(var(--risk-warning))',
          critical: 'hsl(var(--risk-critical))',
        },
        earth: {
          50: '#fcf9f3',
          100: '#f5eee2',
          200: '#eadbc4',
          300: '#dcc2a1',
          400: '#caa17a',
          500: '#b98359',
          600: '#9e6849',
          700: '#82523d',
          800: '#6d4536',
          900: '#5c3b31',
        },
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: 'var(--radius)',
        xl: '1.1rem',
        '2xl': '1.4rem',
        '3xl': '1.8rem',
      },
      boxShadow: {
        shell: '0 8px 24px -18px rgba(15, 23, 42, 0.42)',
        lift1: '0 6px 20px -16px rgba(15, 23, 42, 0.45)',
        lift2: '0 20px 35px -20px rgba(15, 23, 42, 0.55)',
        glass: '0 10px 30px -22px rgba(15, 23, 42, 0.55)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        fadeIn: 'fadeIn 0.28s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        slideIn: 'slideIn 0.22s ease-out',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
