module.exports = {
  apps: [
    {
      name: 'uniact',
      script: 'npm',
      args: 'start',
      cwd: '/opt/uniact',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_PATH: '/var/lib/uniact/uniact.db'
      },
      error_file: '/var/log/uniact/error.log',
      out_file: '/var/log/uniact/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: false,
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: '192.168.1.100',
      ref: 'origin/main',
      repo: 'git@github.com:drake2095/uniact.git',
      path: '/opt/uniact',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
}
