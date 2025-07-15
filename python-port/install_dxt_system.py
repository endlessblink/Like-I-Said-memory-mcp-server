#!/usr/bin/env python3
"""
Like-I-Said Python DXT Installation and Configuration System
Sets up the complete DXT build environment and creates production DXT files
"""

import os
import sys
import subprocess
import platform
from pathlib import Path
from datetime import datetime

class DXTInstaller:
    """Complete installation and setup system for DXT creation"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.python_exe = sys.executable
        self.platform_name = self.get_platform_name()
        
    def get_platform_name(self):
        """Get current platform name"""
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
        """Log installation progress"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def check_python_version(self):
        """Check Python version compatibility"""
        self.log("Checking Python version...")
        
        if sys.version_info < (3, 8):
            self.log(f"ERROR: Python 3.8+ required, found {sys.version}", "ERROR")
            return False
        
        self.log(f"Python {sys.version.split()[0]} - OK ✓")
        return True
    
    def install_dependencies(self):
        """Install required dependencies"""
        self.log("Installing Python dependencies...")
        
        # Install PyInstaller
        try:
            import PyInstaller
            self.log(f"PyInstaller {PyInstaller.__version__} already installed ✓")
        except ImportError:
            self.log("Installing PyInstaller...")
            subprocess.check_call([
                self.python_exe, "-m", "pip", "install", "pyinstaller>=6.0.0"
            ])
            self.log("PyInstaller installed ✓")
        
        # Install setuptools if needed
        try:
            import setuptools
            self.log(f"Setuptools {setuptools.__version__} available ✓")
        except ImportError:
            self.log("Installing setuptools...")
            subprocess.check_call([
                self.python_exe, "-m", "pip", "install", "setuptools>=65.0.0"
            ])
            self.log("Setuptools installed ✓")
        
        return True
    
    def verify_server_code(self):
        """Verify server.py is ready for packaging"""
        self.log("Verifying server code...")
        
        server_path = self.project_root / "server.py"
        if not server_path.exists():
            self.log("ERROR: server.py not found", "ERROR")
            return False
        
        # Test syntax
        try:
            with open(server_path, 'r', encoding='utf-8') as f:
                server_code = f.read()
            compile(server_code, str(server_path), 'exec')
            self.log("Server syntax validation passed ✓")
        except SyntaxError as e:
            self.log(f"ERROR: Server syntax error: {e}", "ERROR")
            return False
        
        # Test basic import
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("server", server_path)
            server_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(server_module)
            
            # Test server instantiation
            server = server_module.LikeISaidMCPServer()
            self.log("Server instantiation test passed ✓")
        except Exception as e:
            self.log(f"ERROR: Server import/instantiation failed: {e}", "ERROR")
            return False
        
        return True
    
    def setup_build_environment(self):
        """Set up the build environment"""
        self.log("Setting up build environment...")
        
        # Create necessary directories
        dirs_to_create = ['dist-dxt', 'build-temp']
        for dir_name in dirs_to_create:
            dir_path = self.project_root / dir_name
            dir_path.mkdir(exist_ok=True)
            self.log(f"Directory created: {dir_name}")
        
        # Verify build script exists
        build_script = self.project_root / "build_dxt.py"
        if not build_script.exists():
            self.log("ERROR: build_dxt.py not found", "ERROR")
            return False
        
        self.log("Build environment ready ✓")
        return True
    
    def run_tests(self):
        """Run the test suite"""
        self.log("Running DXT build tests...")
        
        test_script = self.project_root / "test_dxt_build.py"
        if not test_script.exists():
            self.log("WARNING: test_dxt_build.py not found, skipping tests", "WARN")
            return True
        
        try:
            result = subprocess.run([
                self.python_exe, str(test_script)
            ], capture_output=True, text=True, cwd=self.project_root)
            
            if result.returncode == 0:
                self.log("All tests passed ✓")
                return True
            else:
                self.log("Some tests failed:", "WARN")
                self.log(result.stdout, "WARN")
                return False
                
        except Exception as e:
            self.log(f"Test execution failed: {e}", "ERROR")
            return False
    
    def build_production_dxt(self):
        """Build the production DXT file"""
        self.log("Building production DXT...")
        
        build_script = self.project_root / "build_dxt.py"
        
        try:
            result = subprocess.run([
                self.python_exe, str(build_script)
            ], capture_output=True, text=True, cwd=self.project_root)
            
            if result.returncode == 0:
                # Extract DXT path from output
                output_lines = result.stdout.split('\n')
                success_line = [line for line in output_lines if 'SUCCESS:' in line]
                
                if success_line:
                    dxt_path = success_line[0].split('SUCCESS:')[-1].strip()
                    self.log(f"Production DXT built successfully: {dxt_path}")
                    return dxt_path
                else:
                    self.log("DXT built but path not found in output")
                    return True
            else:
                self.log("DXT build failed:", "ERROR")
                self.log(result.stderr, "ERROR")
                return False
                
        except Exception as e:
            self.log(f"DXT build execution failed: {e}", "ERROR")
            return False
    
    def create_build_info(self, dxt_path=None):
        """Create build information file"""
        build_info = {
            "build_date": datetime.now().isoformat(),
            "platform": self.platform_name,
            "python_version": sys.version,
            "python_executable": str(self.python_exe),
            "project_root": str(self.project_root),
            "dxt_file": str(dxt_path) if dxt_path else None,
            "tools_count": 23,
            "build_type": "pyinstaller-standalone"
        }
        
        info_file = self.project_root / "build-info.json"
        import json
        with open(info_file, 'w') as f:
            json.dump(build_info, f, indent=2)
        
        self.log(f"Build info saved: {info_file}")
    
    def install_complete_system(self, run_tests=True, build_dxt=True):
        """Complete installation and setup process"""
        self.log("=" * 60)
        self.log("LIKE-I-SAID PYTHON DXT INSTALLATION")
        self.log("=" * 60)
        self.log(f"Platform: {self.platform_name}")
        self.log(f"Python: {sys.version.split()[0]}")
        self.log(f"Working directory: {self.project_root}")
        self.log("")
        
        steps = [
            ("Python Version Check", self.check_python_version),
            ("Dependency Installation", self.install_dependencies),
            ("Server Code Verification", self.verify_server_code),
            ("Build Environment Setup", self.setup_build_environment),
        ]
        
        if run_tests:
            steps.append(("Test Suite Execution", self.run_tests))
        
        if build_dxt:
            steps.append(("Production DXT Build", self.build_production_dxt))
        
        # Execute all steps
        dxt_path = None
        for step_name, step_func in steps:
            self.log(f"Step: {step_name}")
            result = step_func()
            
            if result is False:
                self.log(f"FAILED: {step_name}", "ERROR")
                return False
            elif isinstance(result, str) and step_name == "Production DXT Build":
                dxt_path = result
            
            self.log(f"COMPLETED: {step_name} ✓")
            self.log("")
        
        # Create build info
        self.create_build_info(dxt_path)
        
        # Success summary
        self.log("=" * 60)
        self.log("INSTALLATION COMPLETE! 🎉")
        self.log("=" * 60)
        self.log("✅ All dependencies installed")
        self.log("✅ Server code verified")
        self.log("✅ Build environment ready")
        if run_tests:
            self.log("✅ Tests passed")
        if build_dxt and dxt_path:
            self.log(f"✅ Production DXT created: {Path(dxt_path).name}")
        self.log("")
        self.log("🚀 Ready to create Claude Desktop DXT packages!")
        self.log("📋 Use 'python build_dxt.py' to build DXT files")
        self.log("🧪 Use 'python test_dxt_build.py' to run tests")
        
        return True

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Install Like-I-Said Python DXT build system")
    parser.add_argument("--no-tests", action="store_true", help="Skip running tests")
    parser.add_argument("--no-build", action="store_true", help="Skip building production DXT")
    
    args = parser.parse_args()
    
    installer = DXTInstaller()
    
    try:
        success = installer.install_complete_system(
            run_tests=not args.no_tests,
            build_dxt=not args.no_build
        )
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n❌ Installation cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Installation failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())