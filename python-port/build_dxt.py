#!/usr/bin/env python3
"""
Like-I-Said v2 Python MCP Server - DXT Creation System
Creates professional DXT packages for Claude Desktop with PyInstaller
"""

import os
import sys
import shutil
import zipfile
import json
import subprocess
import platform
from pathlib import Path
from datetime import datetime

class DXTBuilder:
    """Professional DXT builder for Python MCP servers"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.dist_dir = self.project_root / "dist-dxt"
        self.build_dir = self.project_root / "build-temp"
        self.version = "3.0.0"
        self.platform_name = self.get_platform_name()
        
    def get_platform_name(self):
        """Get platform-specific name for DXT"""
        system = platform.system().lower()
        arch = platform.machine().lower()
        
        if system == "windows":
            return "windows-x64" if "64" in arch else "windows-x86"
        elif system == "darwin":
            return "macos-universal"
        elif system == "linux":
            return "linux-x64" if "64" in arch else "linux-x86"
        else:
            return f"{system}-{arch}"
    
    def log(self, message, level="INFO"):
        """Log build progress"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def check_dependencies(self):
        """Check if required dependencies are available"""
        self.log("Checking build dependencies...")
        
        # Check Python version
        if sys.version_info < (3, 8):
            raise Exception("Python 3.8+ required for building")
        
        # Check PyInstaller
        try:
            import PyInstaller
            self.log(f"PyInstaller version: {PyInstaller.__version__}")
        except ImportError:
            self.log("Installing PyInstaller...", "WARN")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        
        # Check server.py exists
        server_path = self.project_root / "server.py"
        if not server_path.exists():
            raise FileNotFoundError("server.py not found in project root")
        
        self.log("All dependencies OK ✓")
    
    def create_pyinstaller_spec(self):
        """Create PyInstaller spec file for the MCP server"""
        spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

# Project paths
project_root = Path("{self.project_root}")

a = Analysis(
    ['server.py'],
    pathex=[str(project_root)],
    binaries=[],
    datas=[
        # Include Python libraries if they exist
        (str(project_root / "lib"), "lib"),
        (str(project_root / "schemas"), "schemas"),
        # Include data files
        (str(project_root / "requirements.txt"), "."),
    ],
    hiddenimports=[
        'asyncio',
        'json',
        'pathlib',
        'datetime',
        'uuid',
        'hashlib',
        'traceback',
        'io',
        'typing',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'PIL',
        'numpy',
        'scipy',
        'pandas',
        'jupyter',
        'notebook',
        'IPython',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='like-i-said-mcp-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
        
        spec_path = self.project_root / "like-i-said-server.spec"
        with open(spec_path, 'w') as f:
            f.write(spec_content)
        
        self.log(f"Created PyInstaller spec: {spec_path}")
        return spec_path
    
    def build_executable(self):
        """Build standalone executable with PyInstaller"""
        self.log("Building standalone executable...")
        
        # Clean previous builds
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        if (self.project_root / "dist").exists():
            shutil.rmtree(self.project_root / "dist")
        
        # Create spec file
        spec_path = self.create_pyinstaller_spec()
        
        # Build with PyInstaller
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--clean",
            "--noconfirm",
            "--onefile",
            "--console",
            str(spec_path)
        ]
        
        self.log(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            self.log(f"PyInstaller failed: {result.stderr}", "ERROR")
            raise Exception("PyInstaller build failed")
        
        # Find the executable
        dist_path = self.project_root / "dist"
        exe_name = "like-i-said-mcp-server.exe" if platform.system() == "Windows" else "like-i-said-mcp-server"
        exe_path = dist_path / exe_name
        
        if not exe_path.exists():
            raise FileNotFoundError(f"Built executable not found: {exe_path}")
        
        self.log(f"Executable built successfully: {exe_path}")
        return exe_path
    
    def create_manifest(self):
        """Create DXT manifest with all 23 tools"""
        
        # All 23 tools from the original implementation
        tools = [
            {"name": "add_memory", "description": "Store information with auto-categorization and linking"},
            {"name": "get_memory", "description": "Retrieve specific memory by ID"},
            {"name": "list_memories", "description": "List memories with filtering and metadata"},
            {"name": "search_memories", "description": "Full-text semantic and keyword search"},
            {"name": "delete_memory", "description": "Remove specific memory permanently"},
            {"name": "test_tool", "description": "Verify MCP connection is working"},
            {"name": "generate_dropoff", "description": "Generate session handoff documents"},
            {"name": "create_task", "description": "Create tasks with auto-memory linking"},
            {"name": "update_task", "description": "Update task status and relationships"},
            {"name": "list_tasks", "description": "List tasks with comprehensive filtering"},
            {"name": "get_task_context", "description": "Get full task context with connections"},
            {"name": "delete_task", "description": "Delete tasks and all subtasks"},
            {"name": "enhance_memory_metadata", "description": "Generate optimized titles and summaries"},
            {"name": "batch_enhance_memories", "description": "Batch process memory enhancements"},
            {"name": "smart_status_update", "description": "Natural language task status updates"},
            {"name": "get_task_status_analytics", "description": "Comprehensive productivity analytics"},
            {"name": "validate_task_workflow", "description": "Intelligent workflow validation"},
            {"name": "get_automation_suggestions", "description": "AI-powered automation suggestions"},
            {"name": "batch_enhance_memories_ollama", "description": "Batch enhance with local AI"},
            {"name": "batch_enhance_tasks_ollama", "description": "Batch enhance tasks with local AI"},
            {"name": "check_ollama_status", "description": "Check local AI server status"},
            {"name": "enhance_memory_ollama", "description": "Enhance with local AI (Ollama)"},
            {"name": "deduplicate_memories", "description": "Clean up duplicate memory files"}
        ]
        
        # Platform-specific executable name
        exe_name = "like-i-said-mcp-server.exe" if platform.system() == "Windows" else "like-i-said-mcp-server"
        
        manifest = {
            "dxt_version": "0.1",
            "name": "like-i-said-memory-v2-python",
            "display_name": "Like-I-Said Memory Python Server",
            "version": self.version,
            "description": "Python MCP Server with 23 powerful memory and task management tools",
            "author": {
                "name": "EndlessBlink",
                "email": "support@like-i-said.dev"
            },
            "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
            "license": "MIT",
            "server": {
                "type": "executable",
                "entry_point": f"server/{exe_name}",
                "mcp_config": {
                    "command": f"${{__dirname}}/server/{exe_name}",
                    "args": [],
                    "env": {
                        "PYTHONUNBUFFERED": "1",
                        "PYTHONIOENCODING": "utf-8"
                    }
                }
            },
            "tools": tools,
            "user_config": {
                "memory_directory": {
                    "type": "directory",
                    "title": "Memory Directory",
                    "default": "~/Documents/claude-memories",
                    "description": "Directory for storing memory files",
                    "required": False
                },
                "task_directory": {
                    "type": "directory",
                    "title": "Task Directory", 
                    "default": "~/Documents/claude-tasks",
                    "description": "Directory for storing task files",
                    "required": False
                },
                "default_project": {
                    "type": "string",
                    "title": "Default Project",
                    "default": "my-project",
                    "description": "Default project name for memories and tasks",
                    "required": False
                },
                "enable_auto_linking": {
                    "type": "boolean",
                    "title": "Auto-Link Items",
                    "default": True,
                    "description": "Automatically link related memories and tasks",
                    "required": False
                },
                "max_search_results": {
                    "type": "number",
                    "title": "Max Search Results",
                    "default": 25,
                    "description": "Maximum number of search results to return",
                    "required": False
                },
                "enable_ollama": {
                    "type": "boolean",
                    "title": "Enable Ollama",
                    "default": False,
                    "description": "Enable local AI enhancements with Ollama",
                    "required": False
                },
                "ollama_model": {
                    "type": "string",
                    "title": "Ollama Model",
                    "default": "llama3.1:8b",
                    "description": "Ollama model to use for enhancements",
                    "required": False
                }
            },
            "requirements": {
                "python": ">=3.8.0",
                "platforms": ["win32", "darwin", "linux"]
            },
            "metadata": {
                "build_date": datetime.now().isoformat(),
                "build_platform": self.platform_name,
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "build_type": "pyinstaller-standalone"
            }
        }
        
        return manifest
    
    def create_readme(self):
        """Create README for the DXT package"""
        readme_content = f"""# Like-I-Said Memory Python Server v{self.version}

## Overview
Python implementation of Like-I-Said MCP Server with all 23 memory and task management tools.

## Features
- **23 Powerful Tools**: Complete memory and task management suite
- **Standalone Executable**: No Python installation required
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **AI Enhancement**: Optional Ollama integration for local AI
- **Auto-Linking**: Intelligent memory-task connections
- **Session Handoffs**: Generate context-rich session transfers

## Installation
1. Install this DXT in Claude Desktop
2. Configure your preferences during installation
3. Start using all 23 tools immediately

## Tools Available

### Memory Tools
- add_memory - Store information with auto-categorization
- get_memory - Retrieve specific memory by ID
- list_memories - List memories with filtering
- search_memories - Full-text and semantic search
- delete_memory - Remove memories permanently

### Task Tools  
- create_task - Create tasks with auto-memory linking
- update_task - Update task status and relationships
- list_tasks - List tasks with comprehensive filtering
- get_task_context - Get full task context with connections
- delete_task - Delete tasks and subtasks

### Enhancement Tools
- enhance_memory_metadata - Generate optimized titles and summaries
- batch_enhance_memories - Batch process memory enhancements
- smart_status_update - Natural language task status updates
- get_task_status_analytics - Comprehensive productivity analytics

### AI Integration Tools
- batch_enhance_memories_ollama - Batch enhance with local AI
- batch_enhance_tasks_ollama - Batch enhance tasks with local AI
- enhance_memory_ollama - Enhance with local AI (Ollama)
- check_ollama_status - Check local AI server status

### Utility Tools
- test_tool - Verify MCP connection
- generate_dropoff - Generate session handoff documents
- validate_task_workflow - Intelligent workflow validation
- get_automation_suggestions - AI-powered automation suggestions
- deduplicate_memories - Clean up duplicate memory files

## Configuration
All settings can be configured through Claude Desktop's DXT preferences:
- Memory and task directories
- Default project name
- Auto-linking behavior
- Search result limits
- Ollama AI integration

## Support
For issues and documentation: https://github.com/endlessblink/Like-I-Said-memory-mcp-server

Built on {datetime.now().strftime('%Y-%m-%d')} for {self.platform_name}
"""
        return readme_content
    
    def package_dxt(self, exe_path):
        """Package everything into a DXT file"""
        self.log("Packaging DXT file...")
        
        # Create temporary DXT structure
        dxt_temp = self.build_dir / "dxt-package"
        dxt_temp.mkdir(parents=True, exist_ok=True)
        
        # Create server directory
        server_dir = dxt_temp / "server"
        server_dir.mkdir(exist_ok=True)
        
        # Copy executable
        exe_name = exe_path.name
        target_exe = server_dir / exe_name
        shutil.copy2(exe_path, target_exe)
        
        # Make executable on Unix systems
        if platform.system() != "Windows":
            os.chmod(target_exe, 0o755)
        
        # Create manifest
        manifest = self.create_manifest()
        manifest_path = dxt_temp / "manifest.json"
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        # Create README
        readme_path = dxt_temp / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(self.create_readme())
        
        # Create DXT file
        dxt_filename = f"like-i-said-python-v{self.version}-{self.platform_name}.dxt"
        dxt_path = self.dist_dir / dxt_filename
        
        # Ensure dist directory exists
        self.dist_dir.mkdir(exist_ok=True)
        
        # Package into ZIP with .dxt extension
        with zipfile.ZipFile(dxt_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as dxt:
            # Add all files from temp directory
            for file_path in dxt_temp.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(dxt_temp)
                    dxt.write(file_path, arcname)
        
        # Get file size
        file_size = dxt_path.stat().st_size / (1024 * 1024)
        
        self.log(f"DXT created successfully: {dxt_path}")
        self.log(f"Size: {file_size:.2f} MB")
        
        return dxt_path
    
    def test_dxt(self, dxt_path):
        """Test the created DXT file"""
        self.log("Testing DXT file structure...")
        
        try:
            with zipfile.ZipFile(dxt_path, 'r') as dxt:
                files = dxt.namelist()
                
                # Check required files
                required_files = ['manifest.json', 'README.md']
                for req_file in required_files:
                    if req_file not in files:
                        raise Exception(f"Missing required file: {req_file}")
                
                # Check manifest structure
                manifest_data = dxt.read('manifest.json')
                manifest = json.loads(manifest_data.decode('utf-8'))
                
                # Validate manifest
                required_keys = ['name', 'version', 'server', 'tools']
                for key in required_keys:
                    if key not in manifest:
                        raise Exception(f"Missing manifest key: {key}")
                
                # Check tools count
                if len(manifest['tools']) != 23:
                    raise Exception(f"Expected 23 tools, found {len(manifest['tools'])}")
                
                # Check executable exists
                exe_files = [f for f in files if f.startswith('server/') and 'like-i-said-mcp-server' in f]
                if not exe_files:
                    raise Exception("Executable not found in server/ directory")
                
                self.log("DXT structure validation passed ✓")
                
        except Exception as e:
            self.log(f"DXT validation failed: {e}", "ERROR")
            raise
    
    def cleanup(self):
        """Clean up temporary files"""
        self.log("Cleaning up temporary files...")
        
        # Remove temp directories
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        
        # Remove PyInstaller artifacts
        for item in ['build', 'dist', '__pycache__', '*.spec']:
            path = self.project_root / item
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
        
        # Clean spec files
        for spec_file in self.project_root.glob("*.spec"):
            spec_file.unlink()
    
    def build(self, clean=True):
        """Main build process"""
        self.log(f"Starting DXT build for platform: {self.platform_name}")
        self.log(f"Python version: {sys.version}")
        
        try:
            # Pre-build checks
            self.check_dependencies()
            
            # Build executable
            exe_path = self.build_executable()
            
            # Package DXT
            dxt_path = self.package_dxt(exe_path)
            
            # Test DXT
            self.test_dxt(dxt_path)
            
            # Success summary
            self.log("=" * 60)
            self.log("DXT BUILD SUCCESSFUL! 🎉")
            self.log("=" * 60)
            self.log(f"📦 DXT File: {dxt_path}")
            self.log(f"🎯 Platform: {self.platform_name}")
            self.log(f"🔧 Tools: 23 complete")
            self.log(f"🐍 Python: {sys.version.split()[0]}")
            self.log("✅ Ready for Claude Desktop installation")
            
            return dxt_path
            
        except Exception as e:
            self.log(f"Build failed: {e}", "ERROR")
            raise
        finally:
            if clean:
                self.cleanup()

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Build Like-I-Said Python MCP Server DXT")
    parser.add_argument("--no-clean", action="store_true", help="Don't clean up temporary files")
    parser.add_argument("--version", help="Override version number")
    
    args = parser.parse_args()
    
    builder = DXTBuilder()
    
    if args.version:
        builder.version = args.version
    
    try:
        dxt_path = builder.build(clean=not args.no_clean)
        print(f"\n🎯 SUCCESS: {dxt_path}")
        return 0
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())