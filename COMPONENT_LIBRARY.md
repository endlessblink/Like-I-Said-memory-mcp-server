# Component Library Documentation

A comprehensive guide to all UI components in the Like-I-Said MCP Server v2 dashboard.

## Table of Contents

- [Base Components](#base-components)
- [Memory Components](#memory-components)
- [Visualization Components](#visualization-components)
- [Form Components](#form-components)
- [Layout Components](#layout-components)
- [Utility Components](#utility-components)

## Base Components

### Button

**Purpose**: Primary interactive element for user actions.

**Variants**:
- `default`: Primary violet button
- `outline`: Outlined button with transparent background
- `ghost`: Minimal button with no background
- `destructive`: Red button for dangerous actions

**Sizes**:
- `sm`: 32px height
- `md`: 40px height (default)
- `lg`: 48px height

**Props**:
```tsx
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
}
```

**Examples**:
```tsx
<Button>Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button size="sm" disabled>Small Disabled</Button>
<Button loading>Processing...</Button>
```

### Card

**Purpose**: Container for grouping related content.

**Structure**:
- `Card`: Main container
- `CardHeader`: Header section with title and actions
- `CardContent`: Main content area
- `CardFooter`: Footer section (optional)

**Props**:
```tsx
interface CardProps {
  className?: string
  children: React.ReactNode
}
```

**Examples**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Memory Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Memory content goes here...</p>
  </CardContent>
</Card>
```

### Badge

**Purpose**: Display small pieces of information like tags and categories.

**Variants**:
- `default`: Violet background
- `secondary`: Gray background
- `outline`: Transparent with border
- `destructive`: Red background

**Props**:
```tsx
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
  children: React.ReactNode
}
```

**Examples**:
```tsx
<Badge>Default</Badge>
<Badge variant="secondary">#tag</Badge>
<Badge variant="outline">Category</Badge>
```

### Input

**Purpose**: Text input for forms and search.

**Types**:
- `text`: Default text input
- `email`: Email validation
- `password`: Password masking
- `search`: Search styling
- `number`: Numeric input

**Props**:
```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'search' | 'number'
  placeholder?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  error?: boolean
}
```

### Textarea

**Purpose**: Multi-line text input for longer content.

**Props**:
```tsx
interface TextareaProps {
  placeholder?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  disabled?: boolean
}
```

### Select

**Purpose**: Dropdown selection from multiple options.

**Structure**:
- `Select`: Main component
- `SelectTrigger`: Clickable trigger
- `SelectValue`: Display selected value
- `SelectContent`: Dropdown content
- `SelectItem`: Individual option

**Examples**:
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select category..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="personal">Personal</SelectItem>
    <SelectItem value="work">Work</SelectItem>
  </SelectContent>
</Select>
```

## Memory Components

### MemoryCard

**Purpose**: Display individual memory items with actions.

**Features**:
- Title extraction and display
- Category and tag visualization
- Action buttons (edit, delete, view)
- Hover states and interactions
- Responsive layout

**Props**:
```tsx
interface MemoryCardProps {
  memory: Memory
  onClick?: (memory: Memory) => void
  onEdit?: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  extractSummary?: (content: string, memory?: Memory) => string
  compact?: boolean
  selected?: boolean
}
```

**Usage**:
```tsx
<MemoryCard
  memory={memory}
  onClick={handleMemoryClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
  compact={false}
/>
```

### MemoryTreeView

**Purpose**: Hierarchical view of memories with relationships.

**Features**:
- Project-based grouping
- Parent-child relationships
- Tag-based connections
- Expandable/collapsible nodes
- Connection indicators

**Props**:
```tsx
interface MemoryTreeViewProps {
  memories: Memory[]
  onMemoryClick?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
}
```

### MemoryNetworkGraph

**Purpose**: Interactive network visualization of memory connections.

**Features**:
- Force-directed layout
- Multiple connection types (direct, tag, content, temporal)
- Interactive nodes and edges
- Zoom and pan controls
- Category filtering

**Props**:
```tsx
interface MemoryNetworkGraphProps {
  memories: Memory[]
  onMemorySelect?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
}
```

### MemoryClusterView

**Purpose**: Group memories by similarity and patterns.

**Features**:
- Multiple clustering algorithms
- Visual cluster representation
- Expandable cluster details
- Strength indicators
- Grid and list view modes

**Props**:
```tsx
interface MemoryClusterViewProps {
  memories: Memory[]
  onMemoryClick?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  extractSummary?: (content: string, memory?: Memory) => string
}
```

## Visualization Components

### MemoryVisualizationDashboard

**Purpose**: Comprehensive visualization dashboard combining all memory views.

**Features**:
- Tabbed interface
- Metrics overview
- Category distribution
- Export capabilities
- Filter controls

**Props**:
```tsx
interface MemoryVisualizationDashboardProps {
  memories: Memory[]
  onMemorySelect?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  extractSummary?: (content: string, memory?: Memory) => string
}
```

### StatisticsDashboard

**Purpose**: Display analytics and metrics about memory collection.

**Features**:
- Memory count statistics
- Category distribution charts
- Usage trends
- Connection metrics

### LoadingStates

**Purpose**: Consistent loading indicators across the application.

**Components**:
- `PageLoadingSpinner`: Full page loading
- `RefreshSpinner`: Refresh indicators
- `ButtonSpinner`: Button loading states
- `MemoryCardSkeleton`: Card loading placeholder
- `TableRowSkeleton`: Table loading placeholder

**Examples**:
```tsx
<PageLoadingSpinner message="Loading memories..." />
<RefreshSpinner size="sm" />
<ButtonSpinner />
<MemoryCardSkeleton count={3} />
```

## Form Components

### AdvancedSearch

**Purpose**: Complex search interface with filters and logical operators.

**Features**:
- Text search with autocomplete
- Multiple filter types
- Logical operators (AND, OR, NOT)
- Filter presets
- Active filter display

**Props**:
```tsx
interface AdvancedSearchProps {
  query: string
  filters: AdvancedFilters
  onQueryChange: (query: string) => void
  onFiltersChange: (filters: AdvancedFilters) => void
  availableTags: string[]
  availableProjects: string[]
}
```

### MemoryCreationWizard

**Purpose**: Step-by-step memory creation with templates and smart suggestions.

**Features**:
- Multi-step wizard interface
- Template selection
- Smart content analysis
- Auto-categorization
- Progress indicators

**Props**:
```tsx
interface MemoryCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateMemory: (content: string, metadata: MemoryMetadata) => Promise<void>
  availableProjects: string[]
  availableTags: string[]
}
```

### QuickCapture

**Purpose**: Fast memory and task creation with minimal friction.

**Features**:
- Floating action button
- Quick text input
- Auto-tagging from hashtags
- Mode switching (memory/task)
- Full editor option

**Props**:
```tsx
interface QuickCaptureProps {
  onCreateMemory: (content: string, tags: string[], category?: string, project?: string) => Promise<void>
  onCreateTask: (title: string, description: string, category: string, priority: string, project?: string, tags?: string[]) => Promise<void>
  availableProjects: string[]
}
```

## Layout Components

### Navigation

**Purpose**: Main application navigation with responsive design.

**Features**:
- Logo and branding
- Navigation menu
- User actions
- Mobile menu
- Keyboard shortcuts help

### Tabs

**Purpose**: Content organization in tabbed interface.

**Structure**:
- `Tabs`: Container component
- `TabsList`: Tab navigation
- `TabsTrigger`: Individual tab
- `TabsContent`: Tab content area

### Dialog/Modal

**Purpose**: Overlay content for forms and detailed views.

**Structure**:
- `Dialog`: Main component
- `DialogTrigger`: Trigger element
- `DialogContent`: Modal content
- `DialogHeader`: Modal header
- `DialogTitle`: Modal title
- `DialogDescription`: Modal description

## Utility Components

### Tooltip

**Purpose**: Contextual information on hover.

**Props**:
```tsx
interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}
```

### Progress

**Purpose**: Visual progress indicator.

**Props**:
```tsx
interface ProgressProps {
  value: number // 0-100
  className?: string
  showValue?: boolean
}
```

### Separator

**Purpose**: Visual divider between content sections.

### ScrollArea

**Purpose**: Custom scrollable area with styled scrollbars.

### Toast/Notification

**Purpose**: Temporary messages and feedback.

**Types**:
- `success`: Green success message
- `error`: Red error message
- `warning`: Yellow warning message
- `info`: Blue information message

## Error Boundaries

### GlobalErrorBoundary

**Purpose**: Catch and handle JavaScript errors gracefully.

**Features**:
- Error reporting
- Recovery suggestions
- Bug report generation
- Retry mechanisms

### GraphErrorBoundary

**Purpose**: Specific error handling for graph visualizations.

## Theme Components

### ThemeProvider

**Purpose**: Global theme context and management.

### ThemeSelector

**Purpose**: User interface for theme selection.

## Best Practices

### Component Usage

1. **Composition over Configuration**
   ```tsx
   // Good: Composable
   <Card>
     <CardHeader>
       <CardTitle>Title</CardTitle>
     </CardHeader>
     <CardContent>Content</CardContent>
   </Card>
   
   // Avoid: Monolithic
   <Card title="Title" content="Content" />
   ```

2. **Consistent Prop Naming**
   ```tsx
   // Good: Consistent
   onMemoryClick, onMemorySelect, onMemoryEdit
   
   // Avoid: Inconsistent
   onMemoryClick, selectMemory, editHandler
   ```

3. **Accessibility First**
   ```tsx
   // Good: Accessible
   <Button aria-label="Delete memory" onClick={handleDelete}>
     <Trash2 className="h-4 w-4" />
   </Button>
   
   // Avoid: No accessibility
   <div onClick={handleDelete}>×</div>
   ```

### Styling Guidelines

1. **Use Design Tokens**
   ```tsx
   // Good: Design tokens
   className="bg-gray-800 border-gray-600"
   
   // Avoid: Arbitrary values
   className="bg-[#1F2937] border-[#4B5563]"
   ```

2. **Responsive Design**
   ```tsx
   // Good: Mobile-first responsive
   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
   
   // Avoid: Fixed layouts
   className="grid grid-cols-3"
   ```

3. **State-based Styling**
   ```tsx
   // Good: Clear state indication
   className={`p-4 rounded-lg ${selected ? 'bg-violet-950 border-violet-500' : 'bg-gray-800 border-gray-600'}`}
   ```

### Performance Considerations

1. **Memoization for Expensive Components**
   ```tsx
   const MemoizedMemoryCard = React.memo(MemoryCard)
   ```

2. **Virtual Scrolling for Large Lists**
   ```tsx
   // Use react-window or similar for 100+ items
   ```

3. **Lazy Loading for Heavy Components**
   ```tsx
   const MemoryNetworkGraph = React.lazy(() => import('./MemoryNetworkGraph'))
   ```

This component library ensures consistency, accessibility, and maintainability across the entire Like-I-Said MCP Server v2 dashboard. All components follow the established design system and can be viewed and tested in Storybook.