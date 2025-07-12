/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', "class"],
  theme: {
  	extend: {
      // Enhanced Responsive Breakpoints
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1792px',
        '4xl': '2048px',
      },
      
  		borderRadius: {
  			lg: 'var(--radius-lg)',
  			md: 'var(--radius-md)',
  			sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
  		},
      
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
  				DEFAULT: 'var(--primary-500)',
  				foreground: 'var(--primary-50)'
  			},
  			secondary: {
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
          700: 'var(--secondary-700)',
          800: 'var(--secondary-800)',
          900: 'var(--secondary-900)',
          950: 'var(--secondary-950)',
  				DEFAULT: 'var(--secondary-500)',
  				foreground: 'var(--secondary-50)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
        
        // Category Colors
        'category-personal': 'var(--category-personal)',
        'category-work': 'var(--category-work)',
        'category-code': 'var(--category-code)',
        'category-research': 'var(--category-research)',
        
        // Complexity Colors
        'complexity-l1': 'var(--complexity-l1)',
        'complexity-l2': 'var(--complexity-l2)',
        'complexity-l3': 'var(--complexity-l3)',
        'complexity-l4': 'var(--complexity-l4)',
        
        // Semantic Colors
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
        
        // Glass Effect Colors
        'glass-bg': 'var(--glass-bg)',
        'glass-border': 'var(--glass-border)',
        
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
      
      // Enhanced Spacing Scale
      spacing: {
        ...Object.fromEntries(
          Object.entries({
            0: 'var(--space-0)',
            px: 'var(--space-px)',
            0.5: 'var(--space-0\\.5)',
            1: 'var(--space-1)',
            1.5: 'var(--space-1\\.5)',
            2: 'var(--space-2)',
            2.5: 'var(--space-2\\.5)',
            3: 'var(--space-3)',
            3.5: 'var(--space-3\\.5)',
            4: 'var(--space-4)',
            5: 'var(--space-5)',
            6: 'var(--space-6)',
            7: 'var(--space-7)',
            8: 'var(--space-8)',
            9: 'var(--space-9)',
            10: 'var(--space-10)',
            11: 'var(--space-11)',
            12: 'var(--space-12)',
            14: 'var(--space-14)',
            16: 'var(--space-16)',
            20: 'var(--space-20)',
            24: 'var(--space-24)',
            28: 'var(--space-28)',
            32: 'var(--space-32)',
            36: 'var(--space-36)',
            40: 'var(--space-40)',
            44: 'var(--space-44)',
            48: 'var(--space-48)',
            52: 'var(--space-52)',
            56: 'var(--space-56)',
            60: 'var(--space-60)',
            64: 'var(--space-64)',
            72: 'var(--space-72)',
            80: 'var(--space-80)',
            96: 'var(--space-96)',
          })
        ),
      },
      
      // Enhanced Typography
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }], // Added missing 2xs
        xs: ['var(--text-xs-size)', { lineHeight: 'var(--text-xs-height)' }],
        sm: ['var(--text-sm-size)', { lineHeight: 'var(--text-sm-height)' }],
        base: ['var(--text-base-size)', { lineHeight: 'var(--text-base-height)' }],
        lg: ['var(--text-lg-size)', { lineHeight: 'var(--text-lg-height)' }],
        xl: ['var(--text-xl-size)', { lineHeight: 'var(--text-xl-height)' }],
        '2xl': ['var(--text-2xl-size)', { lineHeight: 'var(--text-2xl-height)' }],
        '3xl': ['var(--text-3xl-size)', { lineHeight: 'var(--text-3xl-height)' }],
        '4xl': ['var(--text-4xl-size)', { lineHeight: 'var(--text-4xl-height)' }],
        '5xl': ['var(--text-5xl-size)', { lineHeight: 'var(--text-5xl-height)' }],
        '6xl': ['var(--text-6xl-size)', { lineHeight: 'var(--text-6xl-height)' }],
        '7xl': ['var(--text-7xl-size)', { lineHeight: 'var(--text-7xl-height)' }],
        '8xl': ['var(--text-8xl-size)', { lineHeight: 'var(--text-8xl-height)' }],
        '9xl': ['var(--text-9xl-size)', { lineHeight: 'var(--text-9xl-height)' }],
      },
      
      // Enhanced Animation
      transitionDuration: {
        75: 'var(--duration-75)',
        100: 'var(--duration-100)',
        150: 'var(--duration-150)',
        200: 'var(--duration-200)',
        300: 'var(--duration-300)',
        500: 'var(--duration-500)',
        700: 'var(--duration-700)',
        1000: 'var(--duration-1000)',
      },
      
      transitionTimingFunction: {
        DEFAULT: 'var(--timing-in-out)',
        linear: 'var(--timing-linear)',
        in: 'var(--timing-in)',
        out: 'var(--timing-out)',
        'in-out': 'var(--timing-in-out)',
      },
      
      // Enhanced Shadow System
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        strong: 'var(--shadow-strong)',
      },
      
      // Background Gradients
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-card': 'var(--gradient-card)',
      },
      
      // Glass Effect Utilities
      backdropFilter: {
        glass: 'var(--glass-backdrop)',
      },
      
      // Component Heights
      height: {
        'nav': 'var(--nav-height)',
        'nav-mobile': 'var(--nav-height-mobile)',
      },
      
      minHeight: {
        'nav': 'var(--nav-height)',
        'nav-mobile': 'var(--nav-height-mobile)',
      },
      
      // Responsive Grid Templates
      gridTemplateColumns: {
        'responsive': 'repeat(auto-fit, minmax(280px, 1fr))',
        'responsive-sm': 'repeat(auto-fit, minmax(240px, 1fr))',
        'responsive-lg': 'repeat(auto-fit, minmax(320px, 1fr))',
      },
  	}
  },
  plugins: [],
}