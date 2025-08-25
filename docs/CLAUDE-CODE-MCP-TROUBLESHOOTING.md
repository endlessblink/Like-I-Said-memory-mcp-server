# Claude Code MCP Troubleshooting Guide

## 🚨 **API Error 500 - Complete Solution**

### **Root Cause:**
Claude Code Desktop with WSL2 and multiple projects creates **massive MCP server process leaks** leading to resource exhaustion and API Error 500.

### **Why This Happens:**
1. **Global MCP Installation**: User-scope MCP servers get registered globally
2. **Multiple Projects**: Each project spawns its own set of MCP processes
3. **No Cleanup**: Claude Code doesn't properly terminate MCP processes when switching projects
4. **Process Accumulation**: Can reach 50-100+ processes, causing system instability

---

## ⚡ **Immediate Fix (Emergency)**

```bash
# 1. Kill all MCP processes
ps aux | grep -E "(context7-mcp|mcp-server-sequential-thinking|mcp-server-playwright|server-markdown)" | grep -v grep | awk '{print $2}' | xargs -r kill -TERM

# 2. Force kill if needed
sleep 3 && ps aux | grep -E "(context7-mcp|mcp-server-sequential-thinking|mcp-server-playwright|server-markdown)" | grep -v grep | awk '{print $2}' | xargs -r kill -KILL

# 3. Clean database files
find /mnt/d -name "tasks-v3.db*" -delete 2>/dev/null

# 4. Restart Claude Code completely
```

---

## 🛠️ **Automated Solution Tools**

### **1. Health Monitor**
```bash
# Check system health
node /mnt/d/APPSNospaces/like-i-said-mcp/scripts/mcp-health-monitor.js status

# Clean up excessive processes
node /mnt/d/APPSNospaces/like-i-said-mcp/scripts/mcp-health-monitor.js cleanup

# Continuous monitoring
node /mnt/d/APPSNospaces/like-i-said-mcp/scripts/mcp-health-monitor.js monitor
```

### **2. Claude Code MCP Manager**
```bash
# Interactive menu
/mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh

# Quick health check
/mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh health

# Emergency cleanup
/mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh cleanup
```

---

## 🔧 **Prevention Strategies**

### **1. Project Isolation**

**Create project-specific MCP configs instead of global ones:**

```json
// .claude/mcp.json (per project)
{
  "mcpServers": {
    "project-specific-name": {
      "command": "node",
      "args": ["/absolute/path/to/project/server-markdown.js"],
      "env": {
        "MCP_QUIET": "true",
        "MCP_FAST_START": "true",
        "MCP_MODE": "true",
        "PROJECT_ISOLATION": "true"
      }
    }
  }
}
```

### **2. Resource Limits**

**Set process limits in your MCP server:**

```javascript
// In server-markdown.js
process.env.UV_THREADPOOL_SIZE = '4';
process.env.NODE_MAX_OLD_SPACE_SIZE = '2048';

// Add process cleanup
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
```

### **3. Database Management**

**Regular cleanup of database files:**

```bash
# Add to project startup script
if [[ -f "data/tasks-v3.db.backup" && -f "data/tasks-v3.db" ]]; then
    # Only keep database if backup exists
    find data -name "tasks-v3.db*" -mtime +7 -delete
fi
```

---

## 📊 **Monitoring Commands**

### **Process Monitoring**
```bash
# Count MCP processes
ps aux | grep -E "(mcp|server-markdown)" | grep -v grep | wc -l

# Show process details
ps aux | grep -E "(mcp|server-markdown)" | grep -v grep

# Check memory usage
ps aux --sort=-%mem | grep -E "(mcp|server-markdown)" | head -10
```

### **Port Monitoring**
```bash
# Check MCP-related ports
lsof -i | grep -E "(node|mcp)"

# Check for port conflicts
netstat -tuln | grep -E "(808[0-9]|300[0-9])"
```

---

## 🚦 **Health Thresholds**

| Process Type | Normal | Warning | Critical |
|--------------|---------|----------|----------|
| context7-mcp | 1-3 | 4-5 | 6+ |
| sequential-thinking | 1-3 | 4-5 | 6+ |
| playwright | 1-3 | 4-5 | 6+ |
| server-markdown | 1 | 2 | 3+ |
| **Total** | **4-10** | **11-15** | **16+** |

---

## 🔍 **Diagnostic Steps**

### **1. Identify the Problem**
```bash
# Check if API Error 500 is MCP-related
curl -s localhost:3001/api/health 2>/dev/null || echo "MCP server down"

# Count total MCP processes
ps aux | grep -E "(mcp|server-markdown)" | grep -v grep | wc -l
```

### **2. Analyze Process Tree**
```bash
# Show process hierarchy
pstree -p | grep -E "(mcp|server|node)"

# Check process start times
ps -eo pid,ppid,cmd,etime | grep -E "(mcp|server-markdown)"
```

### **3. Resource Analysis**
```bash
# Check system load
uptime

# Check memory usage
free -h

# Check disk I/O
iostat -x 1 3
```

---

## 🔄 **Recovery Procedures**

### **Level 1: Soft Recovery**
```bash
# Restart only Like-I-Said MCP
pkill -f "server-markdown.js"
cd /mnt/d/APPSNospaces/like-i-said-mcp
node server-markdown.js &
```

### **Level 2: Process Cleanup**
```bash
# Clean up excessive processes
/mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh cleanup
```

### **Level 3: Full Reset**
```bash
# Nuclear option - cleans everything
/mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh reset
```

### **Level 4: System Restart**
```bash
# If all else fails
sudo systemctl restart docker  # if using Docker
# Then restart Claude Code
```

---

## ⚙️ **Optimization Settings**

### **Claude Code Configuration**
```json
// ~/.config/claude-code/settings.json
{
  "mcp": {
    "processTimeout": 30000,
    "maxProcesses": 10,
    "cleanupInterval": 300000
  }
}
```

### **Environment Variables**
```bash
# Add to ~/.bashrc or ~/.zshrc
export MCP_QUIET=true
export MCP_FAST_START=true
export MCP_MAX_PROCESSES=10
export UV_THREADPOOL_SIZE=4
```

---

## 🎯 **Best Practices**

### **✅ DO**
- Use project-specific MCP configurations
- Monitor process counts regularly
- Clean up database files periodically
- Use resource limits in production
- Implement proper process cleanup
- Test with multiple projects before deployment

### **❌ DON'T**
- Install MCP servers globally for multiple projects
- Leave multiple Claude Code sessions open simultaneously
- Ignore process count warnings
- Skip database cleanup
- Use unlimited resource allocation
- Mix development and production MCP configs

---

## 🆘 **Emergency Contacts & Logs**

### **Log Locations**
- Health Monitor: `/tmp/mcp-health-monitor.log`
- MCP Manager: `/tmp/claude-code-mcp-manager.log`
- Project Logs: `/tmp/mcp-server-{project-name}.log`

### **Quick Diagnostics**
```bash
# Generate diagnostic report
{
  echo "=== MCP DIAGNOSTIC REPORT ==="
  echo "Date: $(date)"
  echo "System: $(uname -a)"
  echo ""
  echo "=== PROCESS COUNT ==="
  ps aux | grep -E "(mcp|server-markdown)" | grep -v grep | wc -l
  echo ""
  echo "=== PROCESS LIST ==="
  ps aux | grep -E "(mcp|server-markdown)" | grep -v grep
  echo ""
  echo "=== MEMORY USAGE ==="
  free -h
  echo ""
  echo "=== DISK USAGE ==="
  df -h | grep -E "(mnt|home)"
} > /tmp/mcp-diagnostic-$(date +%Y%m%d-%H%M%S).log
```

---

## 🔮 **Future Prevention**

### **Automated Monitoring Setup**
```bash
# Add to crontab (crontab -e)
# Check every 5 minutes
*/5 * * * * /mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh health >> /tmp/mcp-cron.log 2>&1

# Cleanup every hour
0 * * * * /mnt/d/APPSNospaces/like-i-said-mcp/scripts/claude-code-mcp-manager.sh cleanup >> /tmp/mcp-cron.log 2>&1
```

### **Project Template**
Create a standard project template that includes:
- Project-specific MCP configuration
- Health monitoring scripts
- Cleanup procedures
- Resource limits
- Proper error handling

---

**This guide should prevent API Error 500 from ever happening again across all your projects!** 🎉