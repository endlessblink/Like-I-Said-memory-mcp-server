# Installation Demo Creation Guide

## Overview
Create visual demonstrations showing the DXT drag-and-drop installation process for Like-I-Said Memory Server v2.4.0.

## Demo Requirements

### Target Formats
1. **Animated GIF** (for README and documentation)
2. **MP4 Video** (for social media and detailed tutorials)
3. **Static Screenshots** (for step-by-step guides)

### Platforms to Demo
1. **Windows** - Claude Desktop on Windows 10/11
2. **macOS** - Claude Desktop on macOS
3. **Linux** - Claude Desktop on Ubuntu/Linux

## Demo Script

### 30-Second Installation Demo

**Scene 1: Download (5 seconds)**
- Show GitHub releases page
- Click download link for like-i-said-memory-v2.dxt
- File appears in downloads folder

**Scene 2: Claude Desktop Setup (10 seconds)**
- Open Claude Desktop
- Navigate to Settings → Extensions (or MCP Servers)
- Show empty extensions list

**Scene 3: Drag and Drop (10 seconds)**
- Show file explorer with downloaded DXT file
- Drag the DXT file to Claude Desktop extensions area
- Show "Installing..." progress
- Extension appears in list as "Like-I-Said Memory Server"

**Scene 4: Verification (5 seconds)**
- Start new chat in Claude Desktop
- Type "What MCP tools do you have?"
- Show response listing all 23 tools
- Highlight key tools like add_memory, create_task

### Extended Demo (2 minutes)

**Additional scenes for longer demo:**
- **Tool Usage**: Show actual memory storage and task creation
- **File System**: Show created directories and files
- **Cross-Session**: Restart Claude Desktop, verify persistence
- **Dashboard**: Optional - show web dashboard at localhost:3001

## Technical Setup

### Recording Tools
- **Windows**: OBS Studio, Bandicam, or Windows Game Bar
- **macOS**: QuickTime Player, OBS Studio, or ScreenFlow
- **Linux**: OBS Studio, SimpleScreenRecorder, or Kazam

### Recording Settings
- **Resolution**: 1920x1080 (1080p)
- **Frame Rate**: 30 FPS
- **Quality**: High (for conversion to GIF later)
- **Audio**: Optional narration track

### Post-Processing
1. **Video Editing**: Trim, add titles, highlight cursor
2. **GIF Conversion**: Use ffmpeg or online converters
3. **Optimization**: Compress for web delivery
4. **Annotations**: Add text overlays explaining steps

## Demo Assets Needed

### Files to Prepare
1. Fresh Claude Desktop installation
2. Downloaded like-i-said-memory-v2.dxt file
3. Clean desktop/file explorer
4. Test script for verification

### Visual Elements
- Cursor highlighting
- Step annotations
- Progress indicators
- Success confirmations

## GIF Creation Commands

### Using FFmpeg
```bash
# Convert video to GIF
ffmpeg -i installation-demo.mp4 -vf "fps=10,scale=800:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i installation-demo.mp4 -i palette.png -filter_complex "fps=10,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" installation-demo.gif

# Optimize GIF size
gifsicle -O3 --colors 256 installation-demo.gif -o installation-demo-optimized.gif
```

### Using Online Tools
- ezgif.com - video to GIF conversion
- cloudconvert.com - batch processing
- giphy.com - GIF optimization

## Screenshot Sequence

### Step-by-Step Screenshots
1. **step1-download.png** - GitHub releases page with download button
2. **step2-file-downloaded.png** - DXT file in downloads folder
3. **step3-claude-settings.png** - Claude Desktop settings/extensions
4. **step4-drag-drop.png** - Dragging DXT file to extensions
5. **step5-installing.png** - Installation progress indicator
6. **step6-installed.png** - Extension listed in Claude Desktop
7. **step7-verification.png** - Chat showing available MCP tools
8. **step8-success.png** - Full tool list displayed

## Platform-Specific Considerations

### Windows Demo
- Show Windows File Explorer
- Demonstrate Windows-style drag and drop
- Include taskbar and Windows UI elements
- Test on both Windows 10 and 11 if possible

### macOS Demo
- Show Finder interface
- Demonstrate macOS drag and drop behavior
- Include dock and macOS UI elements
- Show any security prompts if they appear

### Linux Demo
- Show file manager (Nautilus, Dolphin, etc.)
- Demonstrate Linux file operations
- Include typical Linux desktop environment
- Show any permission-related steps

## Quality Checklist

### Technical Quality
- [ ] Clear 1080p resolution
- [ ] Smooth cursor movement
- [ ] No lag or stuttering
- [ ] Proper audio sync (if narrated)
- [ ] Consistent lighting/contrast

### Content Quality
- [ ] All steps clearly visible
- [ ] No sensitive information shown
- [ ] Professional appearance
- [ ] Easy to follow progression
- [ ] Success clearly demonstrated

### Accessibility
- [ ] Clear visual indicators
- [ ] Text large enough to read
- [ ] High contrast elements
- [ ] Optional captions/subtitles
- [ ] Screen reader friendly descriptions

## Delivery Formats

### For GitHub/Documentation
- **installation-demo.gif** (optimized, <5MB)
- **installation-steps.png** (composite image)
- **README-demo.gif** (smaller version for README)

### For Social Media
- **installation-demo.mp4** (full quality)
- **instagram-square.mp4** (1:1 aspect ratio)
- **twitter-demo.gif** (Twitter-optimized)

### For Website
- **hero-demo.mp4** (autoplay, muted)
- **tutorial-full.mp4** (with narration)
- **mobile-demo.gif** (mobile-optimized)

## Distribution Plan

### Immediate Use
1. Add to main README.md
2. Include in DXT-INSTALLATION-README.md
3. Upload to GitHub release assets
4. Add to project documentation

### Marketing Use
1. Social media posts (Twitter, LinkedIn)
2. Blog post hero image/video
3. Community forum posts
4. Developer conference presentations

## Success Metrics

### Engagement Metrics
- View count on demo videos
- Download rate after viewing demo
- User feedback on installation ease
- Support ticket reduction

### Quality Metrics
- Installation success rate
- Time to successful installation
- User satisfaction scores
- Community adoption rate

---

**Note**: This demo will showcase the revolutionary simplicity of DXT installation - from 10+ minutes of technical setup to 30 seconds of drag-and-drop!