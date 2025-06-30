import type { Meta, StoryObj } from '@storybook/react';
import { Navigation } from './Navigation';

// This would be a component extracted from App.tsx
const meta: Meta<typeof Navigation> = {
  title: 'Layout/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Navigation Component

Perfect alignment navigation component with "LIKE I SAID" logo aligned to "Search" heading.

## Key Features:
- **Perfect Alignment**: Logo aligns pixel-perfect with content below
- **Glass Morphism**: Modern backdrop blur effects
- **Responsive Design**: Adapts to different screen sizes
- **Professional Spacing**: Carefully calculated margins and padding

## Critical Measurements:
- Logo Left Margin: -119px (for perfect alignment)
- Logo Right Margin: 80px (space from center nav)
- Container Max Width: 89rem (screen-2xl)
- Right Section Padding: 40px left, 20px right

## Alignment Specs:
Both "LIKE I SAID" and "Search" start at exactly 24px from viewport edge.
        `,
      },
    },
  },
  argTypes: {
    currentTab: {
      control: { type: 'select' },
      options: ['dashboard', 'memories', 'relationships', 'ai'],
    },
    memoriesCount: {
      control: { type: 'number' },
    },
    wsConnected: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentTab: 'memories',
    memoriesCount: 114,
    wsConnected: true,
  },
};

export const Dashboard: Story = {
  args: {
    currentTab: 'dashboard',
    memoriesCount: 114,
    wsConnected: true,
  },
};

export const Disconnected: Story = {
  args: {
    currentTab: 'memories',
    memoriesCount: 0,
    wsConnected: false,
  },
};

export const LargeMemoryCount: Story = {
  args: {
    currentTab: 'memories',
    memoriesCount: 1543,
    wsConnected: true,
  },
};