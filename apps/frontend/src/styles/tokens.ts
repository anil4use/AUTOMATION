/**
 * AUTOMATION PLATFORM DESIGN TOKENS (TYPESCRIPT REFERENCE)
 * Reference mapping for all design values. Must match theme.css custom properties.
 */

export const tokens = {
  colors: {
    primary: 'var(--af-primary)',
    primaryHover: 'var(--af-primary-hover)',
    primarySubtle: 'var(--af-primary-subtle)',
    purple: 'var(--af-purple)',
    purpleSubtle: 'var(--af-purple-subtle)',
    emerald: 'var(--af-emerald)',
    emeraldSubtle: 'var(--af-emerald-subtle)',
    amber: 'var(--af-amber)',
    amberSubtle: 'var(--af-amber-subtle)',
    rose: 'var(--af-rose)',
    roseSubtle: 'var(--af-rose-subtle)',

    text: {
      primary: 'var(--af-text-primary)',
      secondary: 'var(--af-text-secondary)',
      muted: 'var(--af-text-muted)',
      inverse: 'var(--af-text-inverse)',
    },

    bg: {
      primary: 'var(--af-bg-primary)',
      secondary: 'var(--af-bg-secondary)',
      card: 'var(--af-bg-card)',
      cardHover: 'var(--af-bg-card-hover)',
      canvas: 'var(--af-bg-canvas)',
    },

    border: {
      default: 'var(--af-border)',
      hover: 'var(--af-border-hover)',
      purple: 'var(--af-border-purple)',
    },
  },

  radius: {
    sm: 'var(--af-radius-sm)',
    md: 'var(--af-radius-md)',
    lg: 'var(--af-radius-lg)',
    xl: 'var(--af-radius-xl)',
    full: 'var(--af-radius-full)',
  },

  shadows: {
    glow: 'var(--af-shadow-glow)',
    purpleGlow: 'var(--af-shadow-purple)',
  },

  gradients: {
    glow: 'var(--af-gradient-glow)',
    hero: 'var(--af-gradient-hero)',
  },

  layout: {
    navHeight: 'var(--af-nav-height)',
    sidebarWidth: 'var(--af-sidebar-width)',
  },
} as const;

export type DesignTokens = typeof tokens;
