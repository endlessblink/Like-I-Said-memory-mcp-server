# Like-I-Said Design System

A comprehensive design system for the Like-I-Said MCP Server v2 dashboard, built with React, TypeScript, and Tailwind CSS.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Components](#components)
- [Icons](#icons)
- [Patterns](#patterns)
- [Theming](#theming)
- [Accessibility](#accessibility)
- [Usage Guidelines](#usage-guidelines)

## Overview

The Like-I-Said design system provides a consistent visual language and component library for building intuitive memory management interfaces. It emphasizes:

- **Dark-first design** optimized for extended use
- **Semantic color system** with meaningful associations
- **Consistent spacing** based on 4px grid
- **Accessibility compliance** with WCAG 2.1 AA standards
- **Responsive design** for all screen sizes

## Design Principles

### 1. Clarity & Focus
- Clear visual hierarchy with consistent contrast ratios
- Minimal cognitive load through progressive disclosure
- Focus states and clear interactive affordances

### 2. Consistency
- Unified component behavior across all interfaces
- Consistent spacing, typography, and color usage
- Predictable interaction patterns

### 3. Efficiency
- Keyboard-first navigation with shortcuts
- Quick actions and bulk operations
- Smart defaults and auto-complete features

### 4. Accessibility
- High contrast ratios (4.5:1 minimum)
- Screen reader compatibility
- Keyboard navigation support
- Focus management

## Color System

### Base Colors

```css
/* Gray Scale */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
--gray-950: #030712;

/* Primary (Violet) */
--violet-50: #F5F3FF;
--violet-100: #EDE9FE;
--violet-200: #DDD6FE;
--violet-300: #C4B5FD;
--violet-400: #A78BFA;
--violet-500: #8B5CF6;
--violet-600: #7C3AED;
--violet-700: #6D28D9;
--violet-800: #5B21B6;
--violet-900: #4C1D95;

/* Semantic Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### Category Colors

Each memory category has a distinct color for easy identification:

```css
--category-personal: #3B82F6;   /* Blue */
--category-work: #10B981;       /* Green */
--category-code: #8B5CF6;       /* Purple */
--category-research: #F59E0B;   /* Amber */
--category-conversations: #EF4444; /* Red */
--category-preferences: #6B7280;   /* Gray */
```

### Usage Guidelines

- **Background**: Use gray-900 for main backgrounds, gray-800 for cards
- **Text**: Use white for primary text, gray-400 for secondary text
- **Interactive**: Use violet-600 for primary actions, violet-500 for hover states
- **Categories**: Use semantic category colors for badges and indicators

## Typography

### Font Stack

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", 
             sans-serif, "Apple Color Emoji", "Segoe UI Emoji", 
             "Segoe UI Symbol", "Noto Color Emoji";
```

### Type Scale

| Size | CSS Class | Use Case |
|------|-----------|----------|
| 32px | `text-3xl` | Page titles |
| 24px | `text-2xl` | Section headers |
| 20px | `text-xl` | Card titles |
| 18px | `text-lg` | Large body text |
| 16px | `text-base` | Body text |
| 14px | `text-sm` | Captions, labels |
| 12px | `text-xs` | Metadata, fine print |

### Font Weights

- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Labels, navigation items
- **Semibold (600)**: Card titles, important text
- **Bold (700)**: Page headers, emphasis

## Spacing

Based on a 4px grid system:

| Value | Class | Usage |
|-------|-------|-------|
| 4px | `1` | Icon padding, fine adjustments |
| 8px | `2` | Small gaps between related elements |
| 12px | `3` | Medium gaps, button padding |
| 16px | `4` | Standard spacing, card padding |
| 20px | `5` | Large gaps between sections |
| 24px | `6` | Section padding |
| 32px | `8` | Page margins, major sections |
| 48px | `12` | Large page sections |

## Components

### Buttons

#### Primary Button
```tsx
<Button className="bg-violet-600 hover:bg-violet-700 text-white">
  Primary Action
</Button>
```

#### Secondary Button
```tsx
<Button variant="outline" className="border-gray-600 text-gray-300">
  Secondary Action
</Button>
```

#### Sizes
- `size="sm"`: 32px height, 12px padding
- `size="md"`: 40px height, 16px padding (default)
- `size="lg"`: 48px height, 20px padding

### Cards

#### Basic Card
```tsx
<Card className="bg-gray-800 border-gray-600">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

#### Memory Card
Specialized card for displaying memory items with:
- Category indicator
- Tag display
- Action buttons
- Hover states

### Badges

#### Category Badge
```tsx
<Badge variant="outline" className="bg-blue-950 border-blue-400 text-blue-300">
  Personal
</Badge>
```

#### Tag Badge
```tsx
<Badge variant="secondary" className="bg-gray-700 text-gray-300">
  #important
</Badge>
```

### Form Controls

#### Input Field
```tsx
<Input 
  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
  placeholder="Enter text..."
/>
```

#### Select Dropdown
```tsx
<Select>
  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
    <SelectValue placeholder="Select option..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Navigation

#### Tab Navigation
```tsx
<Tabs defaultValue="tab1">
  <TabsList className="bg-gray-800">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
</Tabs>
```

### Loading States

#### Spinner
```tsx
<div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
```

#### Skeleton
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
</div>
```

## Icons

Using Lucide React icons for consistency:

### Common Icons
- **Actions**: Plus, Edit, Trash2, Save, Download
- **Navigation**: ChevronRight, ChevronDown, ArrowLeft, ArrowRight
- **Status**: CheckCircle, AlertCircle, Clock, Eye
- **Content**: FileText, Image, Code, Hash, Tag
- **System**: Settings, Search, Filter, Refresh

### Icon Sizes
- **Small**: 16px (`h-4 w-4`) - Inline with text
- **Medium**: 20px (`h-5 w-5`) - Buttons, navigation
- **Large**: 24px (`h-6 w-6`) - Headers, emphasis

## Patterns

### Information Architecture

#### Page Layout
```
Header (64px)
├── Title + Actions
└── Breadcrumb/Navigation

Main Content
├── Filters/Controls (if needed)
├── Content Area
└── Pagination (if needed)

Footer (if needed)
```

#### Card Layout
```
Card Header
├── Icon + Title
└── Actions (menu/buttons)

Card Content
├── Primary content
├── Metadata
└── Tags/badges

Card Footer (optional)
└── Actions/links
```

### Interaction Patterns

#### Hover States
- **Cards**: Subtle background change (`hover:bg-gray-700/50`)
- **Buttons**: Color intensification
- **Interactive text**: Underline or color change

#### Focus States
- **Keyboard focus**: Violet ring (`focus:ring-2 focus:ring-violet-500`)
- **High contrast**: Clear visual indication
- **Tab order**: Logical navigation flow

#### Loading States
- **Button loading**: Spinner + disabled state
- **Content loading**: Skeleton placeholders
- **Progressive loading**: Show content as it loads

### Error States

#### Field Errors
```tsx
<Input className="border-red-500 focus:ring-red-500" />
<p className="text-red-400 text-sm mt-1">Error message</p>
```

#### Page Errors
```tsx
<Card className="border-red-500/20 bg-red-950/10">
  <CardContent className="text-center py-8">
    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-red-400">Error Title</h3>
    <p className="text-gray-300">Error description</p>
  </CardContent>
</Card>
```

## Theming

### CSS Custom Properties

The design system uses CSS custom properties for themeable values:

```css
:root {
  /* Background colors */
  --background: #111827;
  --card: #1F2937;
  --card-border: #374151;
  
  /* Text colors */
  --foreground: #FFFFFF;
  --muted-foreground: #9CA3AF;
  
  /* Primary colors */
  --primary: #8B5CF6;
  --primary-foreground: #FFFFFF;
  
  /* Semantic colors */
  --destructive: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;
}
```

### Theme Variants

#### Dark Theme (Default)
- Optimized for low-light environments
- High contrast for readability
- Reduced eye strain

#### Light Theme (Future)
- Optional light theme for user preference
- Maintains same semantic color meanings
- Adjusted contrast ratios

## Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- **Normal text**: 4.5:1 contrast ratio minimum
- **Large text**: 3:1 contrast ratio minimum
- **Interactive elements**: Clear focus indicators

### Keyboard Navigation

- **Tab order**: Logical navigation flow
- **Focus management**: Clear visual focus indicators
- **Shortcuts**: Global keyboard shortcuts for common actions
- **Skip links**: Navigation shortcuts for screen readers

### Screen Reader Support

- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA labels**: Descriptive labels for interactive elements
- **Live regions**: Dynamic content announcements
- **Alt text**: Descriptive text for images and icons

### Motion & Animation

- **Reduced motion**: Respects `prefers-reduced-motion`
- **Subtle animations**: Enhance UX without being distracting
- **Loading indicators**: Clear progress feedback

## Usage Guidelines

### Do's

✅ **Use semantic HTML elements**
```tsx
<main>, <section>, <article>, <nav>, <header>, <footer>
```

✅ **Follow spacing patterns**
```tsx
<div className="space-y-4"> {/* Consistent vertical spacing */}
  <Card />
  <Card />
</div>
```

✅ **Use semantic colors**
```tsx
<Badge className="bg-green-950 border-green-400 text-green-300">
  Success
</Badge>
```

✅ **Provide loading states**
```tsx
{isLoading ? <Spinner /> : <Content />}
```

### Don'ts

❌ **Don't use arbitrary spacing**
```tsx
<div style={{ margin: '13px' }}> {/* Use spacing scale */}
```

❌ **Don't break color patterns**
```tsx
<Button className="bg-pink-500"> {/* Use semantic colors */}
```

❌ **Don't skip accessibility**
```tsx
<div onClick={handler}> {/* Use button element */}
```

❌ **Don't override component styles arbitrarily**
```tsx
<Button style={{ fontSize: '18px' }}> {/* Use size prop */}
```

### Component Composition

#### Building Complex Components
```tsx
function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <Card className="bg-gray-800 border-gray-600 hover:bg-gray-700/50">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon category={memory.category} />
          <CardTitle className="text-white">{memory.title}</CardTitle>
        </div>
        <MemoryActions memory={memory} />
      </CardHeader>
      <CardContent>
        <p className="text-gray-300 mb-3">{memory.summary}</p>
        <TagList tags={memory.tags} />
      </CardContent>
    </Card>
  )
}
```

#### Responsive Design
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards automatically adjust to screen size */}
</div>
```

## Development Guidelines

### File Organization
```
src/
├── components/
│   ├── ui/           # Base UI components
│   ├── memory/       # Memory-specific components  
│   └── layout/       # Layout components
├── styles/
│   ├── globals.css   # Global styles
│   └── components.css # Component styles
└── utils/
    └── design-tokens.ts # Design tokens
```

### Naming Conventions
- **Components**: PascalCase (`MemoryCard`)
- **Props**: camelCase (`onMemorySelect`)
- **CSS classes**: kebab-case with BEM where needed
- **Files**: PascalCase for components, camelCase for utilities

### Testing Components
```tsx
// Test component rendering
test('renders memory card with title', () => {
  render(<MemoryCard memory={mockMemory} />)
  expect(screen.getByText(mockMemory.title)).toBeInTheDocument()
})

// Test accessibility
test('has proper ARIA labels', () => {
  render(<MemoryCard memory={mockMemory} />)
  expect(screen.getByRole('article')).toHaveAccessibleName()
})
```

## Storybook Integration

Components are documented in Storybook with:
- **Default states**: Standard component appearance
- **Variant states**: Different props and configurations
- **Interactive examples**: Live component playground
- **Accessibility testing**: Built-in a11y checks

```bash
npm run storybook  # Start Storybook development server
```

## Contributing

### Adding New Components

1. **Create component** in appropriate directory
2. **Follow naming conventions** and patterns
3. **Add TypeScript types** for all props
4. **Include accessibility attributes**
5. **Add Storybook story** with examples
6. **Write tests** for functionality and accessibility
7. **Update documentation** if needed

### Modifying Existing Components

1. **Check existing usage** before breaking changes
2. **Maintain backward compatibility** when possible
3. **Update Storybook stories** to reflect changes
4. **Update tests** for new functionality
5. **Document breaking changes** in changelog

---

This design system ensures consistency, accessibility, and maintainability across the Like-I-Said MCP Server v2 dashboard. For questions or contributions, please refer to the project's contribution guidelines.