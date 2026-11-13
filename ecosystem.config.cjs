module.exports = {
  apps: [{
    name: 'codex-router',
    script: 'dist/index.js',
    cwd: '/home/agentuser/Codex-Router/apps/api',
    env: { ANTIGRAVITY_UA: 'antigravity/cli/1.5.8', NODE_ENV: 'production' },
  }],
};
