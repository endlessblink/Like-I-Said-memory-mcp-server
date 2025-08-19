// Ollama configuration for WSL/Windows compatibility
const os = require('os');

function getOllamaHost() {
  // Check if we're in WSL
  const isWSL = process.platform === 'linux' && 
    (os.release().toLowerCase().includes('microsoft') || 
     os.release().toLowerCase().includes('wsl'));
  
  if (isWSL) {
    // Try Windows host first (requires Windows Ollama to be running)
    // WSL2 uses a dynamic IP, we need to get the Windows host IP
    try {
      const { execSync } = require('child_process');
      // Get Windows host IP from /etc/resolv.conf
      const resolv = execSync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'', { encoding: 'utf8' }).trim();
      if (resolv) {
        return `http://${resolv}:11434`;
      }
    } catch (e) {
      // Fallback to localhost if can't determine Windows IP
    }
  }
  
  // Default to localhost
  return 'http://localhost:11434';
}

module.exports = {
  getOllamaHost
};