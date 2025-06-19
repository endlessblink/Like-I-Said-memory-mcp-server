# Screenshots Documentation

This directory contains screenshots of the Like I Said MCP Server dashboard interface.

## Naming Convention

Screenshots use descriptive names following this pattern:
- `dashboard-[feature]-[view].png`
- `dialog-[dialog-name].png` 
- `interface-[section].png`

## Screenshot Guidelines

### Taking Screenshots
- Use consistent browser window size (1400x900 minimum)
- Ensure dark theme is active throughout
- Hide developer tools and browser UI
- Use clean sample data (no sensitive information)
- Ensure all text is legible

### Content Guidelines
- API keys should show masked dots (••••••••)
- Use representative but non-sensitive sample memories
- Show realistic memory counts (10-50 items)
- Demonstrate key features clearly

## Current Screenshots

*Screenshots will be added as they are created*

### Dashboard Views
- [ ] Main dashboard with memory cards
- [ ] Table view of memories  
- [ ] Advanced search filters panel
- [ ] Memory relationships graph

### Dialogs & Modals
- [ ] Add memory dialog
- [ ] Edit memory dialog
- [ ] LLM settings dialog
- [ ] Bulk operations dialog

### Features
- [ ] Memory categorization
- [ ] Project organization
- [ ] Tag management
- [ ] Search functionality

## Update Process

When updating screenshots:
1. Start the development server: `npm run dev:full`
2. Navigate to http://localhost:5173
3. Ensure dark theme and proper styling
4. Take screenshots with descriptive names
5. Update this README with new screenshot descriptions