/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Warm dark palette — leather notebook meets terminal
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          raised: 'rgb(var(--bg-raised) / <alpha-value>)',
          inset: 'rgb(var(--bg-inset) / <alpha-value>)',
        },
        ink: {
          primary: 'rgb(var(--ink-primary) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--ink-tertiary) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dim: 'rgb(var(--accent-dim) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        // Muscle group hues — muted, earthy
        muscle: {
          chest: 'rgb(var(--muscle-chest) / <alpha-value>)',
          back: 'rgb(var(--muscle-back) / <alpha-value>)',
          legs: 'rgb(var(--muscle-legs) / <alpha-value>)',
          shoulders: 'rgb(var(--muscle-shoulders) / <alpha-value>)',
          arms: 'rgb(var(--muscle-arms) / <alpha-value>)',
          core: 'rgb(var(--muscle-core) / <alpha-value>)',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};
