# CLI Menu Upgrade Plan

## Current Issue
- Users see help screen instead of install menu
- Menu requires typing number + Enter (not intuitive)
- Confusing UX for Maya and other users

## Recommended Solution: Inquirer.js Expand Prompt

### Why Expand Prompt?
- Single keypress selection (no Enter required)
- Battle-tested library (45M weekly downloads)
- Works reliably across all platforms
- Minimal code changes needed

### Implementation Example

```javascript
import { expand } from '@inquirer/prompts';

async function showInstallMenu() {
  const answer = await expand({
    message: 'Choose installation option:',
    default: 'a', // Default to auto-setup
    choices: [
      {
        key: 'a',
        name: 'Auto-setup (Recommended)',
        value: 'auto'
      },
      {
        key: 'm',
        name: 'Manual setup',
        value: 'manual'
      },
      {
        key: 'c',
        name: 'Custom paths',
        value: 'custom'
      },
      {
        key: 'q',
        name: 'Quit',
        value: 'quit'
      }
    ]
  });

  return answer;
}
```

### User Experience
```
Choose installation option: (aHmcq)
› (a) Auto-setup (Recommended)
  (m) Manual setup
  (c) Custom paths
  (q) Quit
  (H) Help, list all options
```

User just presses 'a' - no Enter needed!

### Migration Steps
1. Add `@inquirer/prompts` as dependency
2. Replace current readline menu with expand prompt
3. Keep all existing logic intact
4. Test thoroughly before v2.6.6 release

### Benefits
- Immediate response to keypress
- Clear visual feedback
- Industry-standard UX pattern
- Minimal breaking changes
- Works in NPX environment

### Risks & Mitigation
- **Risk**: Dependency size increase
  - **Mitigation**: @inquirer/prompts is modular, only import what we need
- **Risk**: Breaking existing automation
  - **Mitigation**: Keep command-line arguments working (--auto flag)
- **Risk**: Terminal compatibility
  - **Mitigation**: Inquirer handles cross-platform issues

## Alternative: Keep It Simple
If we want to avoid new dependencies, we could:
1. Make the help screen clearer about running `install` command
2. Add better instructions when wrong input is entered
3. Show "Press 1 and Enter" instead of just listing options

## Recommendation
Use Inquirer's expand prompt for v2.6.6. It's the industry standard and will provide the UX users expect from modern CLI tools.