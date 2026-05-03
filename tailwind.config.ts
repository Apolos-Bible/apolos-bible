import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary:  'var(--bg-tertiary)',
        },
        surface: 'var(--surface)',
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border: {
          subtle: 'var(--border-subtle)',
        },
        accent: 'var(--accent)',
        fav:    'var(--fav)',
        highlight: {
          yellow: '#e5c07b33',
          blue: '#61afef33',
          green: '#98c37933',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        reading: ['Lora', 'Georgia', 'ui-serif', 'serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '16px'],
        base: ['13px', '20px'],
        md: ['14px', '20px'],
        lg: ['15px', '22px'],
      },
      width: {
        sidebar: '240px',
        panel: '420px',
      },
      maxWidth: {
        verse: '680px',
      },
    },
  },
  plugins: [],
}

export default config
