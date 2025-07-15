# Like-I-Said Dashboard Configuration System

A complete configuration system for the Like-I-Said dashboard launcher with persistent settings, CLI configuration, and Windows compatibility.

## 🚀 Quick Start

### First-Time Setup
```bash
# Quick setup with defaults
node dashboard-launcher-configurable.cjs --setup

# Or interactive configuration
node dashboard-launcher-configurable.cjs --config
```

### Windows Users
```batch
# Easy menu interface
configure.bat

# Or PowerShell
.\configure.ps1
```

## 📁 Files Created

### Core System
- **`lib/dashboard-config.cjs`** - Main configuration class with validation and persistence
- **`dashboard-launcher-configurable.cjs`** - Enhanced Windows launcher with configuration integration
- **`configure-dashboard.cjs`** - Standalone configuration utility

### Windows Helpers
- **`configure.bat`** - Windows batch file with menu interface
- **`configure.ps1`** - PowerShell script with color output and error handling

### Documentation & Testing
- **`dashboard-config.example.json`** - Example configuration with comments
- **`docs/configuration-guide.md`** - Complete configuration guide
- **`test-config-system.cjs`** - Comprehensive test suite (15 tests, 100% pass rate)

## ⚙️ Configuration Options

```json
{
  "memoryDirectory": "./memories",        // Memory storage path
  "taskDirectory": "./tasks",            // Task storage path
  "autoOpenBrowser": true,               // Open browser automatically
  "preferredPort": 3001,                 // Starting port number
  "logLevel": "info",                    // debug/info/warn/error
  "showStartupBanner": true,             // Display startup messages
  "createDirectories": true,             // Auto-create missing directories
  "backupOnStartup": true,               // Create backups before start
  "version": "2.4.3"                     // Configuration schema version
}
```

## 🛠️ Usage Examples

### Command Line Interface
```bash
# Start dashboard with current configuration
node dashboard-launcher-configurable.cjs

# Configuration management
node dashboard-launcher-configurable.cjs --config    # Interactive wizard
node dashboard-launcher-configurable.cjs --setup     # Quick setup
node dashboard-launcher-configurable.cjs --show      # Display current config
node dashboard-launcher-configurable.cjs --reset     # Reset to defaults

# Standalone configuration utility
node configure-dashboard.cjs configure               # Interactive configuration
node configure-dashboard.cjs validate               # Validate setup
node configure-dashboard.cjs set preferredPort 3005 # Set specific value
node configure-dashboard.cjs get memoryDirectory    # Get specific value
```

### Windows Batch Interface
```batch
configure.bat          # Interactive menu
configure.bat config   # Run configuration wizard
configure.bat setup    # Quick setup
configure.bat start    # Start dashboard
configure.bat validate # Check configuration
```

### PowerShell Interface
```powershell
.\configure.ps1         # Interactive menu with colors
.\configure.ps1 config  # Configuration wizard
.\configure.ps1 setup   # Quick setup
.\configure.ps1 start   # Start dashboard
```

## 🔧 Key Features

### Persistent Settings
- Configuration saved to `dashboard-config.json`
- Automatic loading on startup
- Graceful handling of missing or corrupted files

### Path Validation
- ✅ **Ready**: Directory exists and is writable
- ⚠️ **Will Create**: Directory doesn't exist but can be created
- ❌ **Error**: Cannot access or create directory

### Windows Compatibility
- Proper file path handling for Windows systems
- Path normalization and validation
- Support for both relative and absolute paths

### Interactive Configuration
- Readline-based CLI wizard
- Input validation and error handling
- Default value suggestions and current value display

### Environment Integration
- Sets environment variables for dashboard server:
  - `PORT` - Dashboard port
  - `MEMORY_DIR` - Memory directory path
  - `TASK_DIR` - Task directory path
  - `LOG_LEVEL` - Logging level
  - `NODE_ENV` - Set to 'production'

### Backup System
- Optional automatic backups before startup
- Timestamp-based backup naming
- Stored in `./data-backups/` directory

## 📋 Validation System

The configuration system includes comprehensive validation:

```bash
# Check configuration status
node configure-dashboard.cjs validate
```

Example output:
```
Configuration File:
✓ Found at: /path/to/dashboard-config.json

Directory Validation:

Memory Directory:
  Path: ./memories
  Status: ✓ Ready to use

Task Directory:
  Path: ./tasks
  Status: ⚠ Will be created when needed

Port Configuration:
✓ Preferred port 3001 is valid

Overall Status:
✓ Configuration is valid and ready to use
```

## 🔄 Integration with Existing Code

### Backwards Compatibility
- Works with existing `dashboard-launcher-windows.cjs`
- Default values match previous hardcoded settings
- Graceful fallback if configuration file is missing

### Environment Variables
The enhanced launcher sets these environment variables for the dashboard server:
- `PORT` - Server port number
- `MEMORY_DIR` - Memory directory path
- `TASK_DIR` - Task directory path
- `LOG_LEVEL` - Logging verbosity level

### Server Integration
The dashboard server can access these settings via `process.env`:
```javascript
const port = process.env.PORT || 3001;
const memoryDir = process.env.MEMORY_DIR || './memories';
const taskDir = process.env.TASK_DIR || './tasks';
const logLevel = process.env.LOG_LEVEL || 'info';
```

## 🧪 Testing

The system includes a comprehensive test suite:

```bash
node test-config-system.cjs
```

**Test Results**: 15/15 tests passing (100% success rate)

Tests cover:
- Basic configuration operations
- Directory validation and creation
- Path handling and validation
- Configuration persistence
- Windows compatibility
- Invalid input handling

## 🚨 Troubleshooting

### Configuration Not Loading
```bash
# Check if config file exists and is valid
node configure-dashboard.cjs validate

# Reset to defaults if corrupted
node configure-dashboard.cjs reset
```

### Directory Permission Issues
```bash
# Check directory status
node configure-dashboard.cjs validate

# Enable auto-creation
node configure-dashboard.cjs set createDirectories true

# Choose different directory
node configure-dashboard.cjs set memoryDirectory "C:\MyData\memories"
```

### Port Conflicts
```bash
# Check current port
node configure-dashboard.cjs get preferredPort

# Change to different port
node configure-dashboard.cjs set preferredPort 3005
```

## 📚 Advanced Configuration

### Scripted Setup
```bash
#!/bin/bash
# Automated configuration for deployment
node configure-dashboard.cjs set memoryDirectory "/var/lib/like-i-said/memories"
node configure-dashboard.cjs set taskDirectory "/var/lib/like-i-said/tasks"
node configure-dashboard.cjs set autoOpenBrowser false
node configure-dashboard.cjs set preferredPort 8080
node configure-dashboard.cjs set logLevel warn
```

### User-Specific Directories
```bash
# Windows user-specific setup
node configure-dashboard.cjs set memoryDirectory "%USERPROFILE%\Documents\LikeISaid\memories"
node configure-dashboard.cjs set taskDirectory "%USERPROFILE%\Documents\LikeISaid\tasks"

# Linux/Mac user-specific setup
node configure-dashboard.cjs set memoryDirectory "$HOME/.local/share/like-i-said/memories"
node configure-dashboard.cjs set taskDirectory "$HOME/.local/share/like-i-said/tasks"
```

## 💡 Tips

1. **First-time users**: Run `--setup` for quick default configuration
2. **Advanced users**: Use `--config` for full customization
3. **Shared computers**: Disable auto-open browser and use user-specific directories
4. **Production**: Set appropriate log level and disable startup banner
5. **Development**: Enable debug logging and keep startup banner

This configuration system provides a complete, user-friendly solution for managing Like-I-Said dashboard settings while maintaining full compatibility with the existing codebase.