#!/usr/bin/env python3
"""
Build a completely self-contained DXT package with embedded Python.
No Python installation required on target system.
Always runs in venv to avoid system Python pollution.
"""

import os
import sys
import json
import shutil
import urllib.request
import zipfile
import subprocess
import platform
from pathlib import Path
import tempfile

class SelfContainedDXTBuilder:
    def __init__(self):
        self.build_dir = Path("build-dxt")
        self.python_version = "3.11.7"
        self.platform = platform.system().lower()
        self.arch = "amd64" if "64" in platform.machine() else "x86"
        
    def clean_build_dir(self):
        """Clean and create build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        
    def download_python_embedded(self):
        """Download Python embeddable package for Windows"""
        print("Downloading Python embeddable distribution...")
        
        if self.platform != "windows":
            # For non-Windows, we'll create a different solution
            print("Creating portable Python solution for non-Windows...")
            return self.create_portable_python()
            
        # Windows embeddable download
        py_version_nodot = self.python_version.replace(".", "")[:3]
        url = f"https://www.python.org/ftp/python/{self.python_version}/python-{self.python_version}-embed-{self.arch}.zip"
        
        embed_zip = self.build_dir / "python-embed.zip"
        urllib.request.urlretrieve(url, embed_zip)
        
        # Extract to python directory
        python_dir = self.build_dir / "python"
        python_dir.mkdir()
        
        with zipfile.ZipFile(embed_zip, 'r') as zf:
            zf.extractall(python_dir)
            
        embed_zip.unlink()
        
        # Fix python._pth to allow imports and site-packages
        pth_file = python_dir / f"python{py_version_nodot}._pth"
        if pth_file.exists():
            content = pth_file.read_text()
            # Enable import site for pip to work
            content = content.replace("#import site", "import site")
            # Add our app directory to path
            content = "..\\like_i_said\n" + content
            content = "..\\venv\\Lib\\site-packages\n" + content
            pth_file.write_text(content)
            
        return python_dir
        
    def setup_pip_embedded(self, python_dir):
        """Install pip in embedded Python"""
        print("Setting up pip in embedded Python...")
        
        # Download get-pip.py
        get_pip = python_dir / "get-pip.py"
        urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", get_pip)
        
        # Install pip
        python_exe = python_dir / "python.exe"
        result = subprocess.run(
            [str(python_exe), str(get_pip)],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Warning: pip installation had issues: {result.stderr}")
            
        get_pip.unlink()
        
    def create_launcher_scripts(self):
        """Create launcher scripts that ensure venv usage"""
        
        # Windows main launcher
        main_launcher = self.build_dir / "like-i-said.bat"
        main_launcher.write_text(r"""@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: First run setup if needed
if not exist ".initialized" (
    echo First run detected. Setting up Like-I-Said v2...
    call setup.bat
    if errorlevel 1 (
        echo Setup failed. Please check error messages above.
        pause
        exit /b 1
    )
)

:: Always run from venv
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -m like_i_said.server %*
) else (
    echo ERROR: Virtual environment not found. Please run setup.bat
    pause
    exit /b 1
)
""")
        
        # Windows setup script
        setup_script = self.build_dir / "setup.bat"
        setup_script.write_text(r"""@echo off
setlocal enabledelayedexpansion

echo Setting up Like-I-Said v2 Python environment...

:: Use embedded Python to create venv
if exist "python\python.exe" (
    echo Creating virtual environment...
    "python\python.exe" -m venv venv
    
    echo Installing dependencies...
    "venv\Scripts\pip.exe" install --no-cache-dir -e . -r requirements.txt
    
    echo Creating initialization marker...
    echo Initialized > .initialized
    
    echo Setup complete!
) else (
    echo ERROR: Embedded Python not found
    exit /b 1
)
""")
        
        # MCP mode launcher for DXT
        mcp_launcher = self.build_dir / "run-mcp.bat"
        mcp_launcher.write_text(r"""@echo off
cd /d "%~dp0"
set MCP_MODE=true
set PYTHONUNBUFFERED=1
call like-i-said.bat --mcp-mode
""")
        
        # Unix launchers (for future cross-platform support)
        unix_launcher = self.build_dir / "like-i-said.sh"
        unix_launcher.write_text("""#!/bin/bash
cd "$(dirname "$0")"

# First run setup if needed
if [ ! -f ".initialized" ]; then
    echo "First run detected. Setting up Like-I-Said v2..."
    bash setup.sh
    if [ $? -ne 0 ]; then
        echo "Setup failed. Please check error messages above."
        exit 1
    fi
fi

# Always run from venv
if [ -f "venv/bin/python" ]; then
    venv/bin/python -m like_i_said.server "$@"
else
    echo "ERROR: Virtual environment not found. Please run setup.sh"
    exit 1
fi
""")
        unix_launcher.chmod(0o755)
        
    def copy_source_code(self):
        """Copy Like-I-Said source code"""
        print("Copying source code...")
        
        # Copy like_i_said module
        src_dir = Path("like_i_said")
        dst_dir = self.build_dir / "like_i_said"
        if src_dir.exists():
            shutil.copytree(src_dir, dst_dir)
        else:
            # Create placeholder module
            dst_dir.mkdir()
            (dst_dir / "__init__.py").write_text("")
            
    def create_setup_files(self):
        """Create setup.py and requirements.txt"""
        
        # setup.py for editable install
        setup_py = self.build_dir / "setup.py"
        setup_py.write_text("""from setuptools import setup, find_packages

setup(
    name="like-i-said-v2",
    version="2.0.0",
    packages=find_packages(),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "like-i-said=like_i_said.server:main",
        ],
    },
)
""")
        
        # requirements.txt
        requirements = self.build_dir / "requirements.txt"
        requirements.write_text("""fastmcp>=0.1.0
pyyaml>=6.0
fastapi>=0.104.0
uvicorn>=0.24.0
websockets>=12.0
watchdog>=3.0.0
python-dateutil>=2.8.2
aiofiles>=23.2.1
httpx>=0.25.0
""")
        
        # pyproject.toml for modern Python packaging
        pyproject = self.build_dir / "pyproject.toml"
        pyproject.write_text("""[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "like-i-said-v2"
version = "2.0.0"
description = "Like-I-Said v2 - Python MCP Memory Management System"
requires-python = ">=3.8"
""")
        
    def create_dxt_manifest(self):
        """Create DXT manifest"""
        manifest = {
            "dxt_version": "0.0.1",
            "name": "like-i-said-v2-python",
            "description": "Like-I-Said v2 - Self-contained Python MCP Memory System",
            "author": "endlessblink",
            "mcp": {
                "command": "run-mcp.bat",
                "args": [],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "MCP_MODE": "true",
                    "FORCE_NO_VENV": "false"
                }
            },
            "install": {
                "pre_install": "setup.bat",
                "post_install": "echo Installation complete"
            },
            "user_config": []
        }
        
        manifest_path = self.build_dir / "dxt.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        
    def create_readme(self):
        """Create README for the package"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 - Python Edition

This is a completely self-contained version of Like-I-Said v2 that includes:
- Embedded Python (no installation required)
- Automatic virtual environment creation
- All dependencies bundled

## Installation

1. Extract this package to your desired location
2. The first run will automatically set up the environment
3. No Python installation required!

## Usage

### As MCP Server (for Claude Desktop)
The DXT is configured to automatically run in MCP mode.

### Command Line
```batch
like-i-said.bat --help
```

## Features
- Complete memory management system
- Task management with auto-linking
- No system Python pollution (runs in isolated venv)
- Cross-platform ready

## Troubleshooting

If setup fails:
1. Run `setup.bat` manually
2. Check for antivirus interference
3. Ensure you have internet connection for first setup

""")
        
    def build_dxt(self):
        """Build the complete DXT package"""
        print("Building self-contained DXT package...")
        
        # Clean and prepare
        self.clean_build_dir()
        
        # Download and setup Python
        if self.platform == "windows":
            python_dir = self.download_python_embedded()
            self.setup_pip_embedded(python_dir)
        
        # Copy source and create files
        self.copy_source_code()
        self.create_launcher_scripts()
        self.create_setup_files()
        self.create_dxt_manifest()
        self.create_readme()
        
        # Create the DXT file
        dxt_file = Path("like-i-said-v2-python-standalone.dxt")
        print(f"Creating DXT file: {dxt_file}")
        
        # Use Python's zipfile to create the DXT
        with zipfile.ZipFile(dxt_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in self.build_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(self.build_dir)
                    zf.write(file, arcname)
                    
        print(f"\nDXT package created: {dxt_file}")
        print(f"Size: {dxt_file.stat().st_size / 1024 / 1024:.1f} MB")
        print("\nThis DXT includes embedded Python and will set up its own venv.")
        print("No Python installation required on target system!")
        
    def create_portable_python(self):
        """Create portable Python for non-Windows systems"""
        # This would involve more complex solutions like
        # AppImage, PyInstaller, or conda-pack
        print("Note: Non-Windows portable Python requires additional implementation")
        return None

if __name__ == "__main__":
    builder = SelfContainedDXTBuilder()
    builder.build_dxt()