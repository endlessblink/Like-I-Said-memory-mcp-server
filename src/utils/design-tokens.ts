// Design Tokens for Like-I-Said MCP Server v2
// Centralized design values for consistent theming

export const designTokens = {
  // Color Palette
  colors: {
    // Gray Scale
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712'
    },

    // Primary (Violet)
    violet: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95'
    },

    // Semantic Colors
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    },

    // Category Colors
    category: {
      personal: '#3B82F6',      // Blue
      work: '#10B981',          // Green
      code: '#8B5CF6',          // Purple
      research: '#F59E0B',      // Amber
      conversations: '#EF4444', // Red
      preferences: '#6B7280'    // Gray
    },

    // Component Colors
    component: {
      background: {
        primary: '#111827',     // gray-900
        secondary: '#1F2937',   // gray-800
        tertiary: '#374151',    // gray-700
        elevated: '#4B5563'     // gray-600
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#D1D5DB',   // gray-300
        tertiary: '#9CA3AF',    // gray-400
        disabled: '#6B7280'     // gray-500
      },
      border: {
        primary: '#374151',     // gray-700
        secondary: '#4B5563',   // gray-600
        focus: '#8B5CF6',       // violet-500
        error: '#EF4444',       // red-500
        success: '#10B981'      // green-500
      }
    }
  },

  // Typography
  typography: {
    fontFamily: {
      sans: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        '"Noto Sans"',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"'
      ],
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        '"SF Mono"',
        'Consolas',
        '"Liberation Mono"',
        'Menlo',
        'monospace'
      ]
    },

    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['18px', { lineHeight: '28px' }],
      xl: ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
      '3xl': ['30px', { lineHeight: '36px' }],
      '4xl': ['36px', { lineHeight: '40px' }]
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625
    }
  },

  // Spacing
  spacing: {
    px: '1px',
    0: '0px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px'
  },

  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  },

  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: '0 0 #0000'
  },

  // Transitions
  transitionDuration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms'
  },

  transitionTimingFunction: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  // Z-Index Scale
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50'
  },

  // Component-specific tokens
  components: {
    button: {
      height: {
        sm: '32px',
        md: '40px',
        lg: '48px'
      },
      padding: {
        sm: { x: '12px', y: '6px' },
        md: { x: '16px', y: '8px' },
        lg: { x: '20px', y: '10px' }
      },
      borderRadius: '6px',
      fontWeight: 500
    },

    card: {
      borderRadius: '8px',
      padding: '16px',
      borderWidth: '1px',
      backgroundColor: '#1F2937',
      borderColor: '#374151'
    },

    input: {
      height: '40px',
      padding: { x: '12px', y: '8px' },
      borderRadius: '6px',
      borderWidth: '1px',
      fontSize: '14px',
      backgroundColor: '#374151',
      borderColor: '#4B5563'
    },

    badge: {
      padding: { x: '8px', y: '2px' },
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500
    },

    modal: {
      maxWidth: '768px',
      borderRadius: '12px',
      padding: '24px',
      backgroundColor: '#1F2937',
      borderColor: '#374151'
    },

    tooltip: {
      padding: { x: '8px', y: '4px' },
      borderRadius: '4px',
      fontSize: '12px',
      backgroundColor: '#111827',
      maxWidth: '200px'
    }
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Grid
  grid: {
    columns: {
      1: 'repeat(1, minmax(0, 1fr))',
      2: 'repeat(2, minmax(0, 1fr))',
      3: 'repeat(3, minmax(0, 1fr))',
      4: 'repeat(4, minmax(0, 1fr))',
      5: 'repeat(5, minmax(0, 1fr))',
      6: 'repeat(6, minmax(0, 1fr))',
      12: 'repeat(12, minmax(0, 1fr))'
    },
    gap: {
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    }
  }
} as const

// Type definitions for design tokens
export type DesignTokens = typeof designTokens

export type ColorToken = keyof typeof designTokens.colors.gray
export type SpacingToken = keyof typeof designTokens.spacing
export type FontSizeToken = keyof typeof designTokens.typography.fontSize
export type CategoryColor = keyof typeof designTokens.colors.category

// Utility functions for working with design tokens
export const getColor = (path: string): string => {
  const parts = path.split('.')
  let current: any = designTokens.colors
  
  for (const part of parts) {
    current = current[part]
    if (!current) return '#000000'
  }
  
  return current
}

export const getSpacing = (token: SpacingToken): string => {
  return designTokens.spacing[token]
}

export const getFontSize = (token: FontSizeToken): [string, { lineHeight: string }] => {
  return designTokens.typography.fontSize[token]
}

export const getCategoryColor = (category: CategoryColor): string => {
  return designTokens.colors.category[category]
}

// CSS custom properties generator
export const generateCSSVariables = (): Record<string, string> => {
  const cssVars: Record<string, string> = {}
  
  // Generate color variables
  Object.entries(designTokens.colors.gray).forEach(([key, value]) => {
    cssVars[`--gray-${key}`] = value
  })
  
  Object.entries(designTokens.colors.violet).forEach(([key, value]) => {
    cssVars[`--violet-${key}`] = value
  })
  
  Object.entries(designTokens.colors.semantic).forEach(([key, value]) => {
    cssVars[`--${key}`] = value
  })
  
  Object.entries(designTokens.colors.category).forEach(([key, value]) => {
    cssVars[`--category-${key}`] = value
  })
  
  // Generate spacing variables
  Object.entries(designTokens.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value
  })
  
  return cssVars
}

// Theme configuration for component libraries
export const themeConfig = {
  extend: {
    colors: designTokens.colors,
    spacing: designTokens.spacing,
    fontSize: designTokens.typography.fontSize,
    fontFamily: designTokens.typography.fontFamily,
    borderRadius: designTokens.borderRadius,
    boxShadow: designTokens.boxShadow,
    transitionDuration: designTokens.transitionDuration,
    screens: designTokens.breakpoints
  }
}