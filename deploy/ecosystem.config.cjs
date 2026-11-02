// pm2 process of the site on the shared VPS. See DEPLOIEMENT.md.
const ROOT = '/var/www/oa-evenementiel'

module.exports = {
  apps: [{
    name: 'oa-evenementiel',
    cwd: `${ROOT}/current`,
    script: 'server.js',
    node_args: `--env-file=${ROOT}/shared/.env`,
    exec_mode: 'fork',
    max_memory_restart: '600M',
    env: { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', PORT: '3140', HOSTNAME: '127.0.0.1', TZ: 'Europe/Paris' },
  }],
}
