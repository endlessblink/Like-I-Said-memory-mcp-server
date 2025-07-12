import type { Meta, StoryObj } from '@storybook/react';
import { AdvancedEditor } from './AdvancedEditor';
import { useState } from 'react';

const meta: Meta<typeof AdvancedEditor> = {
  title: 'Components/AdvancedEditor',
  component: AdvancedEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Advanced Editor Component

A powerful Monaco-based editor with multiple view modes, auto-save, and language detection.

## Features:
- **Monaco Editor Integration**: Full-featured code editor
- **Multiple View Modes**: Edit, Preview, Split-view
- **Auto-save**: Configurable auto-save with visual feedback
- **Language Detection**: Automatic syntax highlighting
- **Real-time Stats**: Line count, character count, word count
- **Save Status**: Visual indicators for unsaved changes

## Language Support:
- Markdown (default)
- JavaScript/TypeScript
- Python
- JSON/YAML
- CSS/HTML
- SQL/Shell
- Auto-detection based on content patterns
        `,
      },
    },
  },
  argTypes: {
    language: {
      control: { type: 'select' },
      options: ['markdown', 'javascript', 'typescript', 'python', 'json', 'yaml', 'css', 'html'],
    },
    height: {
      control: { type: 'text' },
    },
    autoSave: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive stories
const EditorWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <AdvancedEditor
      {...args}
      value={value}
      onChange={setValue}
      onSave={(content) => {
        console.log('Saved:', content);
        alert('Content saved! Check console for details.');
      }}
    />
  );
};

export const Default: Story = {
  render: EditorWrapper,
  args: {
    value: '# Welcome to Advanced Editor\n\nStart typing your content here...\n\n## Features\n- Monaco editor integration\n- Multiple view modes\n- Auto-save functionality\n- Language detection',
    placeholder: 'Start typing...',
    height: '400px',
    autoSave: false,
  },
};

export const JavaScriptCode: Story = {
  render: EditorWrapper,
  args: {
    value: `// JavaScript Example
function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}

const cart = [
  { name: 'Apple', price: 1.20, quantity: 3 },
  { name: 'Banana', price: 0.80, quantity: 6 }
];

console.log('Total:', calculateTotal(cart));`,
    language: 'javascript',
    height: '350px',
    autoSave: true,
  },
};

export const MarkdownDocument: Story = {
  render: EditorWrapper,
  args: {
    value: `# Project Documentation

## Overview
This is a comprehensive guide to using the advanced editor component.

### Key Features
1. **Rich Text Editing** - Full Monaco editor support
2. **Live Preview** - See rendered output in real-time
3. **Auto-save** - Never lose your work
4. **Multi-language** - Support for various programming languages

### Code Examples

\`\`\`javascript
const example = {
  language: 'javascript',
  features: ['syntax highlighting', 'autocomplete', 'error detection']
};
\`\`\`

### Installation
\`\`\`bash
npm install @monaco-editor/react
\`\`\`

> **Note**: This editor automatically detects the language based on content patterns.`,
    height: '500px',
    autoSave: true,
  },
};

export const PythonCode: Story = {
  render: EditorWrapper,
  args: {
    value: `# Python Example
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    
    return sequence

# Generate first 10 Fibonacci numbers
result = fibonacci(10)
print(f"First 10 Fibonacci numbers: {result}")

# Class example
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result`,
    language: 'python',
    height: '450px',
    autoSave: false,
  },
};

export const JSONData: Story = {
  render: EditorWrapper,
  args: {
    value: `{
  "name": "Advanced Editor Component",
  "version": "1.0.0",
  "description": "A powerful Monaco-based editor with multiple features",
  "features": {
    "editing": {
      "modes": ["edit", "preview", "split"],
      "autoSave": true,
      "languageDetection": true
    },
    "supported_languages": [
      "markdown",
      "javascript",
      "typescript",
      "python",
      "json",
      "yaml",
      "css",
      "html",
      "sql",
      "shell"
    ],
    "statistics": {
      "lines": true,
      "characters": true,
      "words": true
    }
  },
  "configuration": {
    "theme": "vs-dark",
    "fontSize": 14,
    "lineHeight": 1.6,
    "wordWrap": true,
    "minimap": false
  }
}`,
    language: 'json',
    height: '400px',
    autoSave: true,
  },
};

export const WithAutoSave: Story = {
  render: EditorWrapper,
  args: {
    value: `# Auto-save Demo

This editor has auto-save enabled. Try typing and watch the save status indicators.

Changes are automatically saved after 2 seconds of inactivity.

## Status Indicators:
- Yellow dot = Unsaved changes
- Green checkmark = Content saved
- Timestamp = Last save time

Start typing to see the auto-save in action...`,
    height: '350px',
    autoSave: true,
  },
};

export const CompactEditor: Story = {
  render: EditorWrapper,
  args: {
    value: 'Quick note or code snippet...',
    height: '200px',
    autoSave: false,
  },
};

export const LargeEditor: Story = {
  render: EditorWrapper,
  args: {
    value: `# Large Editor View

This is a larger editor instance suitable for editing longer documents or complex code files.

## Extended Content Area

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Code Section

\`\`\`typescript
interface EditorConfig {
  height: string;
  autoSave: boolean;
  language: string;
  theme: 'vs-dark' | 'vs-light';
}

class AdvancedEditorManager {
  private config: EditorConfig;
  
  constructor(config: EditorConfig) {
    this.config = config;
  }
  
  public initialize(): void {
    // Editor initialization logic
    console.log('Editor initialized with config:', this.config);
  }
}
\`\`\`

### More Content

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    height: '600px',
    autoSave: true,
  },
};