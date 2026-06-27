import type { Config } from 'tailwindcss'

export function aspectPreset(): Partial<Config> {
  return {
    darkMode: 'class',
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: { '2xl': '1400px' },
      },
      extend: {
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
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))',
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
          success: {
            DEFAULT: 'hsl(var(--success))',
            foreground: 'hsl(var(--success-foreground))',
          },
          warning: {
            DEFAULT: 'hsl(var(--warning))',
            foreground: 'hsl(var(--warning-foreground))',
          },
          caution: {
            DEFAULT: 'hsl(var(--caution))',
            foreground: 'hsl(var(--caution-foreground))',
          },
          info: {
            DEFAULT: 'hsl(var(--info))',
            foreground: 'hsl(var(--info-foreground))',
          },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        fontSize: {
          caption: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
          body: ['14px', { lineHeight: '22px' }],
          ui: ['13px', { lineHeight: '18px' }],
          h4: ['15px', { lineHeight: '22px', fontWeight: '600' }],
          h3: ['17px', { lineHeight: '26px', fontWeight: '600' }],
          h2: ['20px', { lineHeight: '28px', fontWeight: '700' }],
          h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
          stat: ['18px', { lineHeight: '1', fontWeight: '800' }],
        },
        fontFamily: {
          sans: ['Inter', 'Noto Sans SC', 'PingFang SC', 'system-ui', '-apple-system', 'sans-serif'],
          mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        },
        boxShadow: {
          soft: '0 1px 3px hsl(var(--foreground) / 0.04), 0 1px 2px hsl(var(--foreground) / 0.02)',
          lifted: '0 4px 16px hsl(var(--foreground) / 0.06), 0 1px 3px hsl(var(--foreground) / 0.04)',
          elevated: '0 12px 40px hsl(var(--foreground) / 0.08), 0 2px 8px hsl(var(--foreground) / 0.04)',
        },
        keyframes: {
          'accordion-down': {
            from: { height: '0' },
            to: { height: 'var(--radix-accordion-content-height)' },
          },
          'accordion-up': {
            from: { height: 'var(--radix-accordion-content-height)' },
            to: { height: '0' },
          },
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out',
        },
      },
    },
  }
}
