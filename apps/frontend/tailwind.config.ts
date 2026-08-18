import type { Config } from 'tailwindcss';
import { tokens } from './src/styles/tokens';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: tokens.colors.bg.primary,
        bgSecondary: tokens.colors.bg.secondary,
        bgCard: tokens.colors.bg.card,
        bgCanvas: tokens.colors.bg.canvas,
        borderColor: tokens.colors.border.default,
        borderHover: tokens.colors.border.hover,
        textPrimary: tokens.colors.text.primary,
        textSecondary: tokens.colors.text.secondary,
        textMuted: tokens.colors.text.muted,
        accentPurple: tokens.colors.purple,
        accentIndigo: tokens.colors.primary,
        accentEmerald: tokens.colors.emerald,
        accentAmber: tokens.colors.amber,
        accentRose: tokens.colors.rose,
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        xl: tokens.radius.xl,
      },
      boxShadow: {
        glow: tokens.shadows.glow,
        purpleGlow: tokens.shadows.purpleGlow,
      },
      backgroundImage: {
        'gradient-glow': tokens.gradients.glow,
        'radial-hero': tokens.gradients.hero,
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
