module.exports = {
  apps: [{
    name: 'like-i-said-mcp-server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: process.cwd()
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    merge_logs: true,
    time: true
  }, {
    name: 'like-i-said-dashboard',
    script: 'dashboard-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/dashboard-combined.log',
    out_file: './logs/dashboard-out.log',
    error_file: './logs/dashboard-error.log',
    merge_logs: true,
    time: true
  }]
};