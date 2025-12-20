/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        arctic: {
          900: 'hsl(var(--arctic-900))',
          800: 'hsl(var(--arctic-800))',
          700: 'hsl(var(--arctic-700))',
        },
        aurora: {
          excellent: 'hsl(var(--aurora-excellent))',
          good: 'hsl(var(--aurora-good))',
          moderate: 'hsl(var(--aurora-moderate))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-syne)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
