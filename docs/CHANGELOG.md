# Changelog

All notable changes to Like-I-Said MCP Server v2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0-alpha.2] - 2025-08-15

### 🚀 Major Features Added
- **Fuzzy Search System** - Intelligent typo-tolerant search using Fuse.js
  - Multiple search modes: exact, memory, typo-tolerant
  - Configurable precision/recall for different scenarios  
  - Smart query preprocessing and relevance scoring
  - Handles typos like "serch" → "search" automatically
  - Enhanced search results with match type indicators

- **Universal Work Detector** - Automated pattern recognition for work activities
  - Real-time detection of problem-solving sequences
  - Automatic identification of implementation work
  - Configuration task pattern recognition
  - Research activity monitoring  
  - Workflow automation detection
  - Safe mode integration with activity logging

### 🔧 Technical Improvements
- **Enhanced Search Integration** - Fuzzy search integrated into `search_memories` MCP tool
- **Work Pattern Tracking** - Automatic memory creation based on detected work patterns
- **Multi-Mode Search** - Combines exact, expanded, semantic, and fuzzy search results
- **Performance Optimized** - Efficient fuzzy matching with configurable thresholds
- **ES Modules Support** - Updated Jest configuration for ES modules compatibility

### 🔧 Bug Fixes
- **MCP Server Stability** - Resolved timeout issues in tools/list responses
- **Test Configuration** - Fixed Jest ES modules support and import statements
- **File Organization** - Moved test files to proper directories structure

### 📚 Documentation
- **Windows Integration** - Added Windows-specific scripts and troubleshooting guides
- **Server Architecture** - Comprehensive architecture analysis documentation
- **Memory Quality Standards** - Detailed memory quality and standards documentation

### 🧪 Testing
- **Fuzzy Search Tests** - 100% pass rate for all fuzzy matching scenarios
- **Work Detector Tests** - Pattern recognition validation complete
- **Integration Tests** - End-to-end MCP server functionality verified

### ⚠️ Breaking Changes
- Version jump to 3.0.0-alpha due to major feature additions
- Enhanced search may return more results due to fuzzy matching
- Work detector creates automatic memories (can be controlled via safe mode)

## [2.6.8] - 2025-07-16

### Fixed
- **Removed ALL Path Validation** - Completely removed restrictive path validation
  - Removed validation that expected memory paths to start with current working directory
  - Removed project directory validation in listMemories()
  - Removed file path validation that was blocking valid operations
  - Trust the configured paths - fixes Maya's "invalid memory directory" error
  - Task creation with auto-linking now works correctly

## [2.6.7] - 2025-07-16

### Fixed
- **NPX Working Directory** - Fixed file creation issues by setting correct working directory
  - MCP server now runs with working directory set to parent of MEMORY_DIR
  - Solves Windows permission issues when NPX runs from cache directory
  - File operations now work correctly without elevated permissions
  - No special directories or workarounds needed

## [2.6.6] - 2025-07-16

### Fixed
- **Directory Creation in NPX Mode** - Fixed directory creation failures preventing memory saves
  - Added try-catch around directory creation to handle NPX permission issues
  - Ensures directory exists before attempting to write memory files
  - Gracefully handles directory detection issues in NPX environments
  - Memory creation now works even if initial directory creation fails

## [2.6.5] - 2025-07-16

### Fixed
- **Removed Hardcoded Path Check** - Fixed restrictive memory directory validation breaking NPX installations
  - The system was checking if memory paths started with a relative 'memories' directory
  - This check always failed in NPX mode where paths are absolute (e.g., C:\Users\User\like-i-said-mcp\memories)
  - Removed the restrictive validation that prevented memory and task creation
  - Now works correctly with both relative and absolute paths

## [2.6.4] - 2025-07-16

### Fixed
- **Critical NPX Installer Bug** - Fixed installer configuring Claude Desktop with non-existent local paths
  - Installer now properly detects NPX mode and configures Claude to use `npx` command
  - This fixes the "empty folder" issue where server files weren't being found
  - No more manual configuration needed!

## [2.6.3] - 2025-07-16

### Fixed
- **Removed Debug Logging** - Removed console.error debug statements that could interfere with JSON-RPC protocol
  - Debug messages now only appear when DEBUG_MCP environment variable is set
  - This should fix issues where the server wouldn't connect after v2.6.2 update

## [2.6.2] - 2025-07-15

### Fixed
- **Windows Path Handling** - Fixed memory creation issue on Windows when using custom paths
  - Improved path normalization for Windows path comparisons
  - Added debug logging to help diagnose path-related issues
  - Fixed case-sensitive path comparison on Windows
- **Enhanced Error Logging** - Added detailed error messages for saveMemory failures

### Changed
- Path traversal security check now properly handles Windows paths with different cases
- Better error reporting when memory save operations fail

## [2.4.0] - 2024-07-13

### 🎉 Major Release: Zero-Dependency Installation!

This release introduces DXT (Desktop Extensions) packaging, making installation as simple as drag-and-drop - no Node.js or technical knowledge required!

### Added
- **DXT Package Support** - One-click installation for Claude Desktop
  - Zero dependencies - no Node.js required
  - 30-second installation process
  - Automatic configuration
  - All 23 tools included and pre-configured
- **Enhanced Tool Suite** - Expanded from 6 to 23 tools
  - Smart status updates with natural language processing
  - Task analytics and productivity tracking
  - Workflow validation and automation suggestions
  - Ollama integration for local AI processing
  - Memory deduplication utilities
- **Improved Documentation**
  - Comprehensive DXT installation guide
  - Visual installation instructions
  - Troubleshooting guide for common issues
  - Comparison table: DXT vs Manual installation

### Changed
- Primary installation method is now DXT (drag-and-drop)
- Manual NPX installation moved to secondary option
- Updated README with dual installation paths
- Optimized package size for faster downloads

### Technical Details
- DXT package size: 1.13 MB (includes all dependencies)
- Compatible with Claude Desktop on Windows, macOS, and Linux
- Maintains backward compatibility with manual installation
- All existing features and tools preserved

### Migration Guide
Existing users can continue using their current installation. To switch to DXT:
1. Uninstall the manual version from Claude Desktop settings
2. Download and install the DXT package
3. Your existing memories and tasks will be preserved

---

## [2.3.7] - 2024-07-11

### Added
- Task management system with 5 dedicated tools
- Memory-task auto-linking based on content similarity
- Enhanced metadata with titles and summaries
- Batch enhancement capabilities
- Natural language task updates

### Changed
- Improved memory search algorithm
- Better error handling and recovery
- Enhanced dashboard UI with real-time updates

### Fixed
- WebSocket connection stability
- Memory persistence across restarts
- Cross-platform path handling

---

## [2.3.0] - 2024-07-01

### Added
- Modern React dashboard with real-time updates
- Advanced search with filters and operators
- Memory categorization system
- Project-based organization
- Analytics and statistics dashboard

### Changed
- Migrated from JSON to Markdown storage
- Improved performance with lazy loading
- Enhanced UI with card-based layout

---

## [2.2.0] - 2024-06-15

### Added
- Cross-platform support (Windows, macOS, Linux)
- WSL integration for Windows users
- One-command installation via NPX
- Automatic client configuration

### Changed
- Simplified installation process
- Improved error messages
- Better documentation

---

## [2.1.0] - 2024-06-01

### Added
- Initial MCP server implementation
- 6 core memory management tools
- Basic search functionality
- File-based storage system

### Technical Stack
- Node.js with ES modules
- MCP SDK for protocol implementation
- React + TypeScript for dashboard
- Vite for build tooling

---

## Future Roadmap

### Planned Features
- [ ] Cloud sync capabilities
- [ ] Team collaboration features
- [ ] Advanced AI-powered insights
- [ ] Mobile companion app
- [ ] Browser extension
- [ ] Export/import functionality
- [ ] Backup automation

### Under Consideration
- GraphQL API
- Plugin system
- Custom themes
- Voice input support
- Multi-language support

---

For more details on each release, see the [GitHub Releases](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases) page.